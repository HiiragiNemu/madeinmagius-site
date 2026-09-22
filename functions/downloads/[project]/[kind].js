const BILIBILI_PINNED_USERSCRIPT = {
  name: 'bilibili-follower-snapshot-v0.2.11.user.js',
  size: 139359,
  digest: 'sha256:831c82dcfc86b3eac0127dad2485bb48825159201bbf189882e476bf89345eb2',
  content_type: 'application/javascript; charset=utf-8',
  github_blob_url: 'https://api.github.com/repos/HiiragiNemu/Bilibili-Follower-Snapshot/git/blobs/4e3866b7fdef21e8e8814757685d8f065e74462c',
};

const NETEASE_LEGACY = {
  'android-full': {
    name: '网易云已下架音乐完整名字导出器_v2.5.1_完整版.apk',
    size: 897805,
    digest: 'sha256:9309450db4918cdb2e5d2e04ffa85b35597d77b191a8d1aea3c8d9e94fe393c1',
    content_type: 'application/vnd.android.package-archive',
    legacy_url: 'https://madeinmagius-site.pages.dev/downloads/legacy/netease/v2.5.1/%E7%BD%91%E6%98%93%E4%BA%91%E5%B7%B2%E4%B8%8B%E6%9E%B6%E9%9F%B3%E4%B9%90%E5%AE%8C%E6%95%B4%E5%90%8D%E5%AD%97%E5%AF%BC%E5%87%BA%E5%99%A8_v2.5.1_%E5%AE%8C%E6%95%B4%E7%89%88.apk',
  },
  windows: {
    name: 'NeteasePlaylistExporter-v2.5.1-windows-x64.zip',
    size: 18331073,
    digest: 'sha256:2cca372d639cb0a1d3fb0d53ef7188246d44e3ce2eeaa2e06e86fc7e366daa73',
    content_type: 'application/zip',
    legacy_url: 'https://madeinmagius-site.pages.dev/downloads/legacy/netease/v2.5.1/NeteasePlaylistExporter-v2.5.1-windows-x64.zip',
  },
  python: {
    name: 'NeteasePlaylistExporter-v2.5.1-python.zip',
    size: 1218343,
    digest: 'sha256:9a4670a02e2fbbd200e6f5764f302dcd83518616d11a92c9c33186bde5e01d38',
    content_type: 'application/zip',
    legacy_url: 'https://madeinmagius-site.pages.dev/downloads/legacy/netease/v2.5.1/NeteasePlaylistExporter-v2.5.1-python.zip',
  },
  wheel: {
    name: 'netease_cloudmusic_delisted_exporter-2.5.1-py3-none-any.whl',
    size: 54861,
    digest: 'sha256:4223c69aa8cfee4d5aff50489f4260de4834de2861ab8be0b489e71a1dac2e1e',
    content_type: 'application/zip',
    legacy_url: 'https://madeinmagius-site.pages.dev/downloads/legacy/netease/v2.5.1/netease_cloudmusic_delisted_exporter-2.5.1-py3-none-any.whl',
  },
  manifest: {
    name: 'RELEASE_MANIFEST.json',
    size: 1888,
    digest: 'sha256:b9c98cacee24afce2fdaa146d7ba8ba48211bd96b41a75f499281bfb15577378',
    content_type: 'application/json',
    legacy_url: 'https://madeinmagius-site.pages.dev/downloads/legacy/netease/v2.5.1/RELEASE_MANIFEST.json',
  },
  sums: {
    name: 'SHA256SUMS.txt',
    size: 1144,
    digest: null,
    content_type: 'text/plain; charset=utf-8',
    legacy_url: 'https://madeinmagius-site.pages.dev/downloads/legacy/netease/v2.5.1/SHA256SUMS.txt',
  },
  cert: {
    name: 'ncm-exporter-upload-cert.pem',
    size: 1896,
    digest: 'sha256:b014ef0614bf874c90583c9fd81aca4c08941ca8ab187e6469e93a73df239e56',
    content_type: 'application/x-pem-file',
    legacy_url: 'https://madeinmagius-site.pages.dev/downloads/legacy/netease/v2.5.1/ncm-exporter-upload-cert.pem',
  },
  signature: {
    name: 'SIGNATURE-VERIFICATION.txt',
    size: 7436,
    digest: 'sha256:18efa13ec3d76425617e4df5f3d5da4a12d57dfa853312b73f7d557495a2bc9b',
    content_type: 'text/plain; charset=utf-8',
    legacy_url: 'https://madeinmagius-site.pages.dev/downloads/legacy/netease/v2.5.1/SIGNATURE-VERIFICATION.txt',
  },
};

const PROJECTS = {
  bilibili: {
    repo: 'HiiragiNemu/Bilibili-Follower-Snapshot',
    mode: 'latest',
    pinned: {
      userscript: BILIBILI_PINNED_USERSCRIPT,
    },
    kinds: {
      android: /\.apk$/i,
      userscript: /\.user\.js$/i,
    },
  },
  netease: {
    repo: 'HiiragiNemu/netease-cloudmusic-delisted-exporter',
    mode: 'latest',
    minimumVersion: '2.5.1',
    legacy: NETEASE_LEGACY,
    kinds: {
      'android-full': /(?:完整版|NeteasePlaylistExporter-v[0-9.]+-android-full)\.apk$/i,
      windows: /windows-x64\.zip$/i,
      python: /-python\.zip$/i,
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
    legacy: {
      'jp-xapk': {
        name: 'com.aniplex.magia.exedra.jp-3.18.0.xapk',
        size: 923195400,
        digest: 'sha256:43cd6eca5a8af7e8bf017fd922e4b0a9260e63933051f5eff3ae21c89a89a514',
        content_type: 'application/xapk-package-archive',
        legacy_url: 'https://d.apkpure.net/b/XAPK/com.aniplex.magia.exedra.jp?version=latest',
        redirect_to_origin: true,
      },
    },
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

async function getAsset(config, kind, token) {
  const matcher = config.kinds[kind];
  if (config.pinned?.[kind]) return config.pinned[kind];

  if (config.mode === 'scan') {
    const releases = await githubJson(
      `https://api.github.com/repos/${config.repo}/releases?per_page=30`,
      token,
    );
    for (const release of releases) {
      const found = (release.assets || []).find(candidate => matcher.test(candidate.name));
      if (found) return found;
    }
    const fallback = config.legacy?.[kind];
    if (fallback) return fallback;
    throw new Error(`asset not found: ${kind}`);
  }

  const release = await githubJson(
    `https://api.github.com/repos/${config.repo}/releases/latest`,
    token,
  );

  if (config.minimumVersion && !atLeast(release.tag_name, config.minimumVersion)) {
    const fallback = config.legacy?.[kind];
    if (fallback) return fallback;
  }

  const asset = (release.assets || []).find(candidate => matcher.test(candidate.name));
  if (asset) return asset;

  const fallback = config.legacy?.[kind];
  if (fallback) return fallback;

  throw new Error(`asset not found: ${kind}`);
}

function parseSingleRange(range, size) {
  if (!range) return null;
  const match = String(range).match(/^bytes=(\d+)-(\d*)$/);
  if (!match) return { invalid: true };
  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd)
      || start < 0 || start >= size || requestedEnd < start) {
    return { invalid: true };
  }
  return { start, end: Math.min(requestedEnd, size - 1) };
}

async function getPinnedSource(asset, token, range) {
  const response = await fetch(asset.github_blob_url, {
    headers: githubHeaders(token, 'application/vnd.github.raw+json'),
  });
  if (!response.ok) return response;
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== asset.size) {
    return new Response('Pinned source size mismatch.\n', { status: 502 });
  }
  const parsed = parseSingleRange(range, bytes.byteLength);
  if (parsed?.invalid) {
    return new Response(null, {
      status: 416,
      headers: { 'content-range': `bytes */${bytes.byteLength}` },
    });
  }
  if (parsed) {
    const body = bytes.slice(parsed.start, parsed.end + 1);
    return new Response(body, {
      status: 206,
      headers: {
        'content-range': `bytes ${parsed.start}-${parsed.end}/${bytes.byteLength}`,
        'content-length': String(body.byteLength),
        'accept-ranges': 'bytes',
      },
    });
  }
  return new Response(bytes, {
    status: 200,
    headers: {
      'content-length': String(bytes.byteLength),
      'accept-ranges': 'bytes',
    },
  });
}

async function getBinary(asset, token, range) {
  if (asset.github_blob_url) {
    return getPinnedSource(asset, token, range);
  }

  if (asset.legacy_url) {
    const headers = range ? { Range: range } : undefined;
    return fetch(asset.legacy_url, { headers, redirect: 'follow' });
  }

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

async function handle(context, headOnly = false, pinnedAsset = null) {
  const token = context.env.GITHUB_RELEASES_TOKEN;
  if (!token) return error('Release mirror is not configured yet.', 503);

  const project = String(context.params.project || '');
  const kind = String(context.params.kind || '');
  const config = PROJECTS[project];
  if (!pinnedAsset && (!config || !config.kinds[kind])) return error('Unknown release route.', 404);

  try {
    const asset = pinnedAsset || await getAsset(config, kind, token);
    // This public fallback accepts browser downloads but rejects Worker proxying.
    // GitHub-hosted assets still use the normal authenticated streaming path.
    if (asset.redirect_to_origin) {
      return new Response(null, {
        status: 302,
        headers: {
          location: asset.legacy_url,
          'cache-control': 'no-store',
          'x-content-type-options': 'nosniff',
        },
      });
    }
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

export function servePinnedAsset(context, asset, headOnly = false) {
  if (!asset) return error("Unknown archived asset.", 404);
  return handle(context, headOnly, asset);
}
