const NETEASE_LEGACY_251 = {
  tag: 'v2.5.1',
  name: '网易云已下架音乐完整名字导出器 v2.5.1',
  published_at: null,
  release_url: 'https://bilibili-follower-snapshot.pages.dev/netease/',
  assets: {
    androidFull: {
      name: '网易云已下架音乐完整名字导出器_v2.5.1_完整版.apk',
      size: 897805,
      digest: 'sha256:9309450db4918cdb2e5d2e04ffa85b35597d77b191a8d1aea3c8d9e94fe393c1',
      content_type: 'application/vnd.android.package-archive',
      download: './downloads/netease/android-full',
    },
    androidStore: {
      name: '网易云已下架音乐完整名字导出器_v2.5.1_商店版.apk',
      size: 896943,
      digest: 'sha256:8371437808c723441e81b1eb373f0f35ff296e6bcef79250c1e2f6e84efa6558',
      content_type: 'application/vnd.android.package-archive',
      download: './downloads/netease/android-store',
    },
    androidAab: {
      name: '网易云已下架音乐完整名字导出器_v2.5.1_GooglePlay.aab',
      size: 873418,
      digest: 'sha256:631a30b4facecf6720ad5ea9851904d4c2374e0e15fd9819beae999cacc864e5',
      content_type: 'application/octet-stream',
      download: './downloads/netease/android-aab',
    },
    windows: {
      name: 'NeteasePlaylistExporter-v2.5.1-windows-x64.zip',
      size: 18331073,
      digest: 'sha256:2cca372d639cb0a1d3fb0d53ef7188246d44e3ce2eeaa2e06e86fc7e366daa73',
      content_type: 'application/zip',
      download: './downloads/netease/windows',
    },
    python: {
      name: 'NeteasePlaylistExporter-v2.5.1-python.zip',
      size: 1218343,
      digest: 'sha256:9a4670a02e2fbbd200e6f5764f302dcd83518616d11a92c9c33186bde5e01d38',
      content_type: 'application/zip',
      download: './downloads/netease/python',
    },
    source: {
      name: 'NeteasePlaylistExporter-v2.5.1-source.tar.gz',
      size: 1154458,
      digest: 'sha256:48e278561b9f780ea99dc01bc08e5b0770d363b39660366283b25b3878a00b2d',
      content_type: 'application/gzip',
      download: './downloads/netease/source',
    },
    wheel: {
      name: 'netease_cloudmusic_delisted_exporter-2.5.1-py3-none-any.whl',
      size: 54861,
      digest: 'sha256:4223c69aa8cfee4d5aff50489f4260de4834de2861ab8be0b489e71a1dac2e1e',
      content_type: 'application/zip',
      download: './downloads/netease/wheel',
    },
    manifest: {
      name: 'RELEASE_MANIFEST.json',
      size: 1888,
      digest: 'sha256:b9c98cacee24afce2fdaa146d7ba8ba48211bd96b41a75f499281bfb15577378',
      content_type: 'application/json',
      download: './downloads/netease/manifest',
    },
    sums: {
      name: 'SHA256SUMS.txt',
      size: 1144,
      digest: null,
      content_type: 'text/plain; charset=utf-8',
      download: './downloads/netease/sums',
    },
    cert: {
      name: 'ncm-exporter-upload-cert.pem',
      size: 1896,
      digest: 'sha256:b014ef0614bf874c90583c9fd81aca4c08941ca8ab187e6469e93a73df239e56',
      content_type: 'application/x-pem-file',
      download: './downloads/netease/cert',
    },
    signature: {
      name: 'SIGNATURE-VERIFICATION.txt',
      size: 7436,
      digest: 'sha256:18efa13ec3d76425617e4df5f3d5da4a12d57dfa853312b73f7d557495a2bc9b',
      content_type: 'text/plain; charset=utf-8',
      download: './downloads/netease/signature',
    },
  },
};

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
    minimumVersion: '2.5.1',
    fallback: NETEASE_LEGACY_251,
    routes: {
      androidFull: 'android-full',
      androidStore: 'android-store',
      androidAab: 'android-aab',
      windows: 'windows',
      python: 'python',
      source: 'source',
      wheel: 'wheel',
      manifest: 'manifest',
      sums: 'sums',
      cert: 'cert',
      signature: 'signature',
    },
    assets: {
      androidFull: /完整版\.apk$/i,
      androidStore: /商店版\.apk$/i,
      androidAab: /GooglePlay\.aab$/i,
      windows: /windows-x64\.zip$/i,
      python: /-python\.zip$/i,
      source: /source\.tar\.gz$/i,
      wheel: /\.whl$/i,
      manifest: /^RELEASE_MANIFEST\.json$/i,
      sums: /^SHA256SUMS\.txt$/i,
      cert: /upload-cert\.pem$/i,
      signature: /^SIGNATURE-VERIFICATION\.txt$/i,
    },
  },
  exedra: {
    repo: 'HiiragiNemu/MagiaExedraTWTools',
    mode: 'scan',
    fallbackAssets: {
      jpXapk: {
        name: 'com.aniplex.magia.exedra.jp-3.18.0.xapk',
        size: 923195400,
        digest: 'sha256:43cd6eca5a8af7e8bf017fd922e4b0a9260e63933051f5eff3ae21c89a89a514',
        content_type: 'application/xapk-package-archive',
        download: './downloads/exedra/jp-xapk',
      },
    },
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

function parseVersion(tag) {
  const match = String(tag || '').match(/(\d+)\.(\d+)\.(\d+)/);
  return match ? match.slice(1).map(Number) : [0, 0, 0];
}

function atLeast(tag, minimum) {
  const a = parseVersion(tag);
  const b = parseVersion(minimum);
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return true;
}

function assetShape(asset, project, key, route = key) {
  if (!asset) return null;
  return {
    id: asset.id,
    name: asset.name,
    size: asset.size,
    digest: asset.digest || null,
    content_type: asset.content_type || 'application/octet-stream',
    download: `./downloads/${project}/${route}`,
  };
}

async function latestProject(key, config, token) {
  const release = await githubJson(
    `https://api.github.com/repos/${config.repo}/releases/latest`,
    token,
  );

  if (config.minimumVersion && !atLeast(release.tag_name, config.minimumVersion)) {
    return { ...config.fallback, source: 'legacy-public-fallback' };
  }

  const assets = Object.fromEntries(
    Object.entries(config.assets).map(([assetKey, matcher]) => {
      const found = (release.assets || []).find(candidate => matcher.test(candidate.name));
      return [assetKey, assetShape(found, key, assetKey, config.routes?.[assetKey] || assetKey)];
    }),
  );

  if (key === 'bilibili') {
    if (assets.sourceZip) assets.sourceZip.download = './downloads/bilibili/source';
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
      Object.keys(config.assets).map(assetKey => [
        assetKey,
        found[assetKey] || config.fallbackAssets?.[assetKey] || null,
      ]),
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
      schema: 'magiuslink-live-releases/v3',
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
