const CONFIG_URL = 'https://magireco-personal-release.pages.dev/legacy/config.json';
const APK_URL = 'https://github.com/HiiragiNemu/ProgettoMagius-1/releases/download/latest/magireco-latest-legacy-client.apk';
const REPO_API = 'https://api.github.com/repos/HiiragiNemu/ProgettoMagius-1';
const APK_NAME = 'magireco-latest-legacy-client.apk';
const BRIDGE_URL = 'https://magireco-personal-release.pages.dev/magireco-latest-legacy-client.apk';
const RELEASE_ROOT = 'https://github.com/HiiragiNemu/ProgettoMagius-1/releases/download/latest/';

function releaseAssetName(client) {
  if (!client || !/^\d+\.\d+\.\d+$/.test(client.version || '')) return null;
  if (client.apk_url === APK_URL) return APK_NAME;
  // This legacy entry is permanently 1.1.11, never the future mutable latest.
  if (client.apk_url === BRIDGE_URL) {
    return client.version === '1.1.11' ? 'magireco-legacy-client-1.1.11.apk' : null;
  }
  const versioned = 'magireco-legacy-client-' + client.version + '.apk';
  return client.apk_url === RELEASE_ROOT + versioned ? versioned : null;
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
  // The producer updates this client gate only after publishing the APK.
  // Do not use the Android manifest's unchanged 3.1.9 as the client version.
  const [config, release] = await Promise.all([
    fetchJson(CONFIG_URL, { Accept: 'application/json', 'Cache-Control': 'no-cache', 'User-Agent': 'MadeInMagius-Site/2.0' }),
    fetchJson(REPO_API + '/releases/tags/latest', {
      Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + token,
      'User-Agent': 'MadeInMagius-Site/2.0', 'X-GitHub-Api-Version': '2022-11-28',
      'Cache-Control': 'no-cache',
    }),
  ]);
  const client = config.client;
  const assetName = releaseAssetName(client);
  const apk = (release.assets || []).find(asset => asset.name === assetName);
  if (release.draft || release.prerelease || !client || !/^\d+\.\d+\.\d+$/.test(client.version || '') ||
      !/^[a-f0-9]{64}$/.test(client.sha256 || '') || !Number.isSafeInteger(client.size) || client.size <= 0 ||
      !assetName || !apk || !Number.isSafeInteger(apk.id) || apk.id <= 0 ||
      apk.state !== 'uploaded' || apk.size !== client.size || apk.digest !== 'sha256:' + client.sha256) {
    throw new Error('The release is synchronizing. Please refresh shortly.');
  }
  // Pin the upstream asset ID for this request, not the mutable "latest" URL.
  // A replaced asset yields an error rather than silently sending another APK.
  return {
    version: client.version,
    size: client.size,
    sha256: client.sha256,
    updated: config.updated || null,
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
