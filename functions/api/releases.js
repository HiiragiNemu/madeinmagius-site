const PROJECTS = {
  bilibili: {
    repo: 'HiiragiNemu/Bilibili-Follower-Snapshot',
    mode: 'latest',
    assets: {
      android: /\.apk$/i,
      userscript: /\.user\.js$/i,
      sourceZip: /source\.zip$/i,
    },
  },
  netease: {
    repo: 'HiiragiNemu/netease-cloudmusic-delisted-exporter',
    mode: 'latest',
    assets: {
      windows: /windows-x64\.zip$/i,
      python: /-python\.zip$/i,
    },
  },
  exedra: {
    repo: 'HiiragiNemu/MagiaExedraTWTools',
    mode: 'scan',
    assets: {
      twXapk: /^tw\.sonet\.magiaexedra-.*\.xapk$/i,
      jpXapk: /^com\.aniplex\.magia\.exedra\.jp-.*\.xapk$/i,
      tools: /^MagiaExedraTWJPTools-v.*\.zip$/i,
    },
  },
};

function githubHeaders(token, accept = 'application/vnd.github+json') {
  return {
    Accept: accept,
    Authorization: `Bearer ${token}`,
    'User-Agent': 'MadeInMagius-Site/2.0',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function githubJson(url, token) {
  const response = await fetch(url, { headers: githubHeaders(token) });
  if (!response.ok) throw new Error(`GitHub request failed: ${response.status}`);
  return response.json();
}

function assetShape(asset, project, key) {
  if (!asset) return null;
  return {
    id: asset.id,
    name: asset.name,
    size: asset.size,
    digest: asset.digest || null,
    content_type: asset.content_type || 'application/octet-stream',
    download: `./downloads/${project}/${key}`,
  };
}

async function latestProject(key, config, token) {
  const release = await githubJson(
    `https://api.github.com/repos/${config.repo}/releases/latest`,
    token,
  );
  const assets = Object.fromEntries(
    Object.entries(config.assets).map(([assetKey, matcher]) => {
      const found = (release.assets || []).find(candidate => matcher.test(candidate.name));
      return [assetKey, assetShape(found, key, assetKey)];
    }),
  );
  if (key === 'bilibili') {
    assets.consoleScript = {
      name: 'bilibili-follower-snapshot-console.js',
      size: null,
      digest: null,
      content_type: 'text/javascript; charset=utf-8',
      download: './downloads/bilibili-follower-snapshot-console.js',
    };
    assets.consoleText = {
      name: 'bilibili-follower-snapshot-console.txt',
      size: null,
      digest: null,
      content_type: 'text/plain; charset=utf-8',
      download: './downloads/bilibili-follower-snapshot-console.txt',
    };
  }
  return {
    tag: release.tag_name,
    name: release.name,
    published_at: release.published_at,
    release_url: release.html_url,
    assets,
  };
}

async function scannedProject(key, config, token) {
  const releases = await githubJson(
    `https://api.github.com/repos/${config.repo}/releases?per_page=30`,
    token,
  );
  const found = {};
  const sourceTags = {};
  for (const release of releases) {
    for (const [assetKey, matcher] of Object.entries(config.assets)) {
      if (found[assetKey]) continue;
      const asset = (release.assets || []).find(candidate => matcher.test(candidate.name));
      if (!asset) continue;
      found[assetKey] = assetShape(asset, key, assetKey);
      sourceTags[assetKey] = release.tag_name;
    }
  }
  return {
    tag: 'multi-release',
    name: 'Magia Exedra TW / JP',
    published_at: releases[0]?.published_at || null,
    release_url: `https://github.com/${config.repo}/releases`,
    source_tags: sourceTags,
    assets: Object.fromEntries(
      Object.keys(config.assets).map(assetKey => [assetKey, found[assetKey] || null]),
    ),
  };
}

function responseJson(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': status === 200 ? 'public, max-age=60, s-maxage=60' : 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

export async function onRequestGet(context) {
  const token = context.env.GITHUB_RELEASES_TOKEN;
  if (!token) {
    return responseJson({
      source: 'cloudflare-unconfigured',
      error: 'GITHUB_RELEASES_TOKEN is not configured',
    }, 503);
  }

  try {
    const entries = await Promise.all(
      Object.entries(PROJECTS).map(async ([key, config]) => [
        key,
        config.mode === 'scan'
          ? await scannedProject(key, config, token)
          : await latestProject(key, config, token),
      ]),
    );

    return responseJson({
      schema: 'magiuslink-live-releases/v2',
      source: 'cloudflare-live',
      generated_at: new Date().toISOString(),
      projects: Object.fromEntries(entries),
    });
  } catch (error) {
    return responseJson({
      source: 'cloudflare-error',
      error: error instanceof Error ? error.message : 'unknown release sync error',
    }, 502);
  }
}
