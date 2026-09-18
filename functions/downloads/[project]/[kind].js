const PROJECTS = {
  bilibili: {
    repo: 'HiiragiNemu/Bilibili-Follower-Snapshot',
    kinds: {
      android: /\.apk$/i,
      userscript: /\.user\.js$/i,
    },
  },
  netease: {
    repo: 'HiiragiNemu/netease-cloudmusic-delisted-exporter',
    kinds: {
      windows: /windows-x64\.zip$/i,
      python: /-python\.zip$/i,
    },
  },
};

function headers(token, accept = 'application/vnd.github+json') {
  return {
    Accept: accept,
    Authorization: `Bearer ${token}`,
    'User-Agent': 'MadeInMagius-Site/1.0',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function error(message, status) {
  return new Response(message + '\n', {
    status,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

async function getAsset(config, kind, token) {
  const releaseResponse = await fetch(
    `https://api.github.com/repos/${config.repo}/releases/latest`,
    { headers: headers(token) },
  );
  if (!releaseResponse.ok) throw new Error(`release lookup failed: ${releaseResponse.status}`);
  const release = await releaseResponse.json();
  const matcher = config.kinds[kind];
  const asset = (release.assets || []).find(candidate => matcher.test(candidate.name));
  if (!asset) throw new Error(`asset not found: ${kind}`);
  return asset;
}

export async function onRequestGet(context) {
  const token = context.env.GITHUB_RELEASES_TOKEN;
  if (!token) return error('Release mirror is not configured yet.', 503);

  const project = String(context.params.project || '');
  const kind = String(context.params.kind || '');
  const config = PROJECTS[project];
  if (!config || !config.kinds[kind]) return error('Unknown release route.', 404);

  try {
    const asset = await getAsset(config, kind, token);
    const assetResponse = await fetch(asset.url, {
      headers: headers(token, 'application/octet-stream'),
      redirect: 'manual',
    });

    let binaryResponse = assetResponse;
    if (assetResponse.status >= 300 && assetResponse.status < 400) {
      const location = assetResponse.headers.get('location');
      if (!location) throw new Error('asset redirect missing location');
      binaryResponse = await fetch(location);
    }
    if (!binaryResponse.ok) throw new Error(`asset fetch failed: ${binaryResponse.status}`);

    const responseHeaders = new Headers();
    responseHeaders.set('content-type', asset.content_type || binaryResponse.headers.get('content-type') || 'application/octet-stream');
    responseHeaders.set('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(asset.name)}`);
    responseHeaders.set('cache-control', 'public, max-age=300');
    responseHeaders.set('x-content-type-options', 'nosniff');
    if (asset.size) responseHeaders.set('content-length', String(asset.size));
    if (asset.digest) responseHeaders.set('x-release-digest', asset.digest);

    return new Response(binaryResponse.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (cause) {
    return error(cause instanceof Error ? cause.message : 'Release mirror error.', 502);
  }
}
