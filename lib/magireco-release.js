const CONFIG_URL = 'https://magireco-personal-release.pages.dev/legacy/config.json';
const CURRENT_URL = 'https://magireco-personal-release.pages.dev/magireco-latest-legacy-client.version.json';
const APK_URL = 'https://github.com/HiiragiNemu/ProgettoMagius-1/releases/download/latest/magireco-latest-legacy-client.apk';
const REPO_API = 'https://api.github.com/repos/HiiragiNemu/ProgettoMagius-1';
const APK_NAME = 'magireco-latest-legacy-client.apk';
const BRIDGE_URL = 'https://magireco-personal-release.pages.dev/magireco-latest-legacy-client.apk';
const RELEASE_ROOT = 'https://github.com/HiiragiNemu/ProgettoMagius-1/releases/download/latest/';

function validClient(client) {
  return client && /^\d+\.\d+\.\d+$/.test(client.version || '') &&
    /^[a-f0-9]{64}$/.test(client.sha256 || '') && Number.isSafeInteger(client.size) && client.size > 0;
}

function matchAsset(release, client, name) {
  if (!validClient(client) || !Array.isArray(release.assets)) return null;
  const assets = release.assets.filter(asset => asset?.name === name);
  if (assets.length !== 1) return null;
  const apk = assets[0];
  return Number.isSafeInteger(apk.id) && apk.id > 0 && apk.state === 'uploaded' &&
    apk.size === client.size && apk.digest === 'sha256:' + client.sha256 ? apk : null;
}

function currentAsset(release, current) {
  if (!validClient(current) || current.apk !== APK_NAME ||
      !(current.apk_url === APK_URL || (current.version === '1.1.11' && current.apk_url === BRIDGE_URL))) return null;
  // Signed sidecars also duplicate identity at the top level. Reject disagreement;
  // this is consistency checking, not the client's cryptographic signature verifier.
  if (current.signed_update !== undefined) {
    try {
      const payload = JSON.parse(current.signed_update.payload);
      if (['version', 'size', 'sha256', 'version_code'].some(key => payload[key] !== current[key]) ||
          !Array.isArray(payload.apk_urls) || !payload.apk_urls.includes(current.apk_url)) return null;
    } catch { return null; }
  }
  // Only this sidecar promotes current. An uploaded manual archive is not current.
  return matchAsset(release, current, APK_NAME);
}

function bridgeAsset(release, client) {
  const name = 'magireco-legacy-client-1.1.11.apk';
  if (!validClient(client) || client.version !== '1.1.11' ||
      ![BRIDGE_URL, RELEASE_ROOT + name, APK_URL].includes(client.apk_url)) return null;
  // Even a historical config with the GitHub latest URL binds to this archive,
  // never to a possibly newer mutable APK.
  return matchAsset(release, client, name);
}

async function fetchJson(url, headers) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    if (!response.ok) throw new Error('Release source temporarily unavailable.');
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function readMagirecoRelease(env) {
  const token = env?.GITHUB_RELEASES_TOKEN;
  if (!token) throw new Error('Release mirror is not configured.');
  const publicHeaders = { Accept: 'application/json', 'Cache-Control': 'no-cache', 'User-Agent': 'MadeInMagius-Site/2.0' };
  // Independent sources: a bridge outage must not hide a matching current.
  const [current, config, release] = await Promise.all([
    fetchJson(CURRENT_URL, publicHeaders).catch(() => null),
    fetchJson(CONFIG_URL, publicHeaders).catch(() => null),
    fetchJson(REPO_API + '/releases/tags/latest', {
      Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + token,
      'User-Agent': 'MadeInMagius-Site/2.0', 'X-GitHub-Api-Version': '2022-11-28',
      'Cache-Control': 'no-cache',
    }),
  ]);
  if (!release || release.draft || release.prerelease) {
    throw new Error('The release is synchronizing. Please refresh shortly.');
  }
  let apk = currentAsset(release, current), client = current, source = 'current';
  if (!apk) {
    client = config?.client;
    apk = bridgeAsset(release, client);
    source = 'legacy-bridge';
  }
  if (!apk) throw new Error('The release is synchronizing. Please refresh shortly.');
  // Pin the upstream asset ID for this request, not the mutable "latest" URL.
  // A replaced asset yields an error rather than silently sending another APK.
  return {
    version: client.version,
    size: client.size,
    sha256: client.sha256,
    source,
    updated: (source === 'current' ? current.updated || apk.updated_at : config.updated) || null,
    download: './downloads/magireco/android?sha256=' + client.sha256,
    asset: {
      id: apk.id,
      name: 'magireco-cn-' + client.version + '.apk',
      size: client.size,
      digest: 'sha256:' + client.sha256,
      content_type: 'application/vnd.android.package-archive',
      url: REPO_API + '/releases/assets/' + apk.id,
    },
  };
}
