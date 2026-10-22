const METADATA_ROOT = 'https://magireco-personal-release.pages.dev/';
const REPO_API = 'https://api.github.com/repos/HiiragiNemu/ProgettoMagius-1';
const RELEASE_ROOT = 'https://github.com/HiiragiNemu/ProgettoMagius-1/releases/download/latest/';
// One product, one release line. Upstream aliases may carry the same APK, but
// the website selects only current; the fixed 1.1.11 bridge is not a fallback.
const METADATA_NAME = 'magireco-current-legacy-client.version.json';
// The identical current/latest sidecars sign only this GitHub canonical URL.
// It is NOT the relay's same-named fixed 1.1.11 bridge.
const APK_NAME = 'magireco-latest-legacy-client.apk';

function validClient(client) {
  const version = /^1\.2\.(\d+)$/.exec(client?.version || '');
  return client && version && Number.isSafeInteger(Number(version[1])) && Number(version[1]) >= 5 &&
    Number.isSafeInteger(client.version_code) && client.version_code > 1713000864 &&
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
  if (!validClient(current) || current.apk !== APK_NAME || current.apk_url !== RELEASE_ROOT + APK_NAME) return null;
  // Signed sidecars also duplicate identity at the top level. Reject disagreement;
  // this is consistency checking, not the client's cryptographic signature verifier.
  if (current.signed_update !== undefined) {
    try {
      const payload = JSON.parse(current.signed_update.payload);
      if (['version', 'size', 'sha256', 'version_code'].some(key => payload[key] !== current[key]) ||
          !Array.isArray(payload.apk_urls) || payload.apk_urls.length !== 1 || payload.apk_urls[0] !== current.apk_url) return null;
    } catch { return null; }
  }
  // Only this sidecar promotes a release. Manual archives are not current.
  return matchAsset(release, current, APK_NAME);
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
  const [client, release] = await Promise.all([
    fetchJson(METADATA_ROOT + METADATA_NAME, publicHeaders).catch(() => null),
    fetchJson(REPO_API + '/releases/tags/latest', {
      Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + token,
      'User-Agent': 'MadeInMagius-Site/2.0', 'X-GitHub-Api-Version': '2022-11-28',
      'Cache-Control': 'no-cache',
    }),
  ]);
  if (!release || release.draft || release.prerelease) {
    throw new Error('The release is synchronizing. Please refresh shortly.');
  }
  const apk = currentAsset(release, client);
  if (!apk) throw new Error('The release is synchronizing. Please refresh shortly.');
  // Pin the upstream asset ID for this request, not the mutable "latest" URL.
  // A replaced asset yields an error rather than silently sending another APK.
  return {
    version: client.version,
    size: client.size,
    sha256: client.sha256,
    source: 'current',
    updated: client.updated || apk.updated_at || null,
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
