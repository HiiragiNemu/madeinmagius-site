const PROJECTS = {
  bilibili: {
    repo: 'HiiragiNemu/Bilibili-Follower-Snapshot',
    assets: {
      android: /\.apk$/i,
      userscript: /\.user\.js$/i,
    },
  },
  netease: {
    repo: 'HiiragiNemu/netease-cloudmusic-delisted-exporter',
    assets: {
      windows: /windows-x64\.zip$/i,
      python: /-python\.zip$/i,
    },
  },
};

function githubHeaders(token, accept = 'application/vnd.github+json') {
  return {
    Accept: accept,
    Authorization: `Bearer ${token}`,
    'User-Agent': 'MadeInMagius-Site/1.0',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function latestRelease(repo, token) {
  const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: githubHeaders(token),
  });
  if (!response.ok) throw new Error(`GitHub ${repo}: ${response.status}`);
  return response.json();
}

function pickAssets(release, config) {
  return Object.fromEntries(Object.entries(config.assets).map(([key, matcher]) => {
    const asset = (release.assets || []).find(candidate => matcher.test(candidate.name));
    if (!asset) return [key, null];
    return [key, {
      id: asset.id,
      name: asset.name,
      size: asset.size,
      digest: asset.digest || null,
      content_type: asset.content_type || 'application/octet-stream',
      download: `./downloads/${config.slug || ''}${config.slug ? '/' : ''}${key}`,
    }];
  }));
}

function responseJson(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': status === 200 ? 'public, max-age=60' : 'no-store',
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
    const entries = await Promise.all(Object.entries(PROJECTS).map(async ([key, config]) => {
      const release = await latestRelease(config.repo, token);
      const withSlug = { ...config, slug: key };
      return [key, {
        tag: release.tag_name,
        name: release.name,
        published_at: release.published_at,
        release_url: release.html_url,
        assets: pickAssets(release, withSlug),
      }];
    }));

    return responseJson({
      schema: 'madeinmagius-live-releases/v1',
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
