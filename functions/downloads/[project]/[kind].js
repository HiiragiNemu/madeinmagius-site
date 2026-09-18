const PROJECTS = {
  bilibili: {
    repo: 'HiiragiNemu/Bilibili-Follower-Snapshot',
    mode: 'latest',
    kinds: {
      android: /\.apk$/i,
      userscript: /\.user\.js$/i,
      source: /source\.zip$/i,
    },
  },
  netease: {
    repo: 'HiiragiNemu/netease-cloudmusic-delisted-exporter',
    mode: 'latest',
    kinds: {
      windows: /windows-x64\.zip$/i,
      python: /-python\.zip$/i,
    },
  },
  exedra: {
    repo: 'HiiragiNemu/MagiaExedraTWTools',
    mode: 'scan',
    kinds: {
      'tw-xapk': /^tw\.sonet\.magiaexedra-.*\.xapk$/i,
      'jp-xapk': /^com\.aniplex\.magia\.exedra\.jp-.*\.xapk$/i,
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

async function githubJson(url, token) {
  const response = await fetch(url, { headers: githubHeaders(token) });
  if (!response.ok) throw new Error(`GitHub lookup failed: ${response.status}`);
  return response.json();
}

async function getAsset(config, kind, token) {
  const matcher = config.kinds[kind];
  if (config.mode === 'scan') {
    const releases = await githubJson(
      `https://api.github.com/repos/${config.repo}/releases?per_page=30`,
      token,
    );
    for (const release of releases) {
      const found = (release.assets || []).find(candidate => matcher.test(candidate.name));
      if (found) return found;
    }
    throw new Error(`asset not found: ${kind}`);
  }

  const release = await githubJson(
    `https://api.github.com/repos/${config.repo}/releases/latest`,
    token,
  );
  const asset = (release.assets || []).find(candidate => matcher.test(candidate.name));
  if (!asset) throw new Error(`asset not found: ${kind}`);
  return asset;
}

async function getBinary(asset, token, range) {
  const apiHeaders = githubHeaders(token, 'application/octet-stream');
  if (range) apiHeaders.Range = range;
  const assetResponse = await fetch(asset.url, {
    headers: apiHeaders,
    redirect: 'manual',
  });

  if (assetResponse.status >= 300 && assetResponse.status < 400) {
    const location = assetResponse.headers.get('location');
    if (!location) throw new Error('asset redirect missing location');
    const headers = range ? { Range: range } : undefined;
    return fetch(location, { headers });
  }
  return assetResponse;
}

function copyHeader(target, source, name) {
  const value = source.headers.get(name);
  if (value) target.set(name, value);
}

async function handle(context, headOnly = false) {
  const token = context.env.GITHUB_RELEASES_TOKEN;
  if (!token) return error('Release mirror is not configured yet.', 503);

  const project = String(context.params.project || '');
  const kind = String(context.params.kind || '');
  const config = PROJECTS[project];
  if (!config || !config.kinds[kind]) return error('Unknown release route.', 404);

  try {
    const asset = await getAsset(config, kind, token);
    const range = context.request?.headers?.get('range') || null;
    const binaryResponse = headOnly ? null : await getBinary(asset, token, range);

    if (binaryResponse && !(binaryResponse.ok || binaryResponse.status === 206)) {
      if (binaryResponse.status === 416) return error('Requested range is not satisfiable.', 416);
      throw new Error(`asset fetch failed: ${binaryResponse.status}`);
    }

    const responseHeaders = new Headers();
    responseHeaders.set(
      'content-type',
      asset.content_type || binaryResponse?.headers.get('content-type') || 'application/octet-stream',
    );
    responseHeaders.set(
      'content-disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(asset.name)}`,
    );
    responseHeaders.set('cache-control', 'public, max-age=300, s-maxage=300');
    responseHeaders.set('x-content-type-options', 'nosniff');
    responseHeaders.set('accept-ranges', binaryResponse?.headers.get('accept-ranges') || 'bytes');
    if (asset.digest) {
      responseHeaders.set('x-release-digest', asset.digest);
      responseHeaders.set('etag', `"${asset.digest}"`);
    }

    if (binaryResponse?.status === 206) {
      copyHeader(responseHeaders, binaryResponse, 'content-range');
      copyHeader(responseHeaders, binaryResponse, 'content-length');
    } else if (asset.size) {
      responseHeaders.set('content-length', String(asset.size));
    }

    return new Response(headOnly ? null : binaryResponse.body, {
      status: binaryResponse?.status || 200,
      headers: responseHeaders,
    });
  } catch (cause) {
    return error(cause instanceof Error ? cause.message : 'Release mirror error.', 502);
  }
}

export function onRequestGet(context) {
  return handle(context, false);
}

export function onRequestHead(context) {
  return handle(context, true);
}
