const METADATA_ROOT = 'https://magireco-personal-release.pages.dev/';
const REPO_API = 'https://api.github.com/repos/HiiragiNemu/ProgettoMagius-1';
const RELEASE_ROOT = 'https://github.com/HiiragiNemu/ProgettoMagius-1/releases/download/latest/';
// One product, one release line. Upstream aliases may carry the same APK, but
// the website selects only current; the fixed 1.1.11 bridge is not a fallback.
const METADATA_NAME = 'magireco-current-legacy-client.version.json';
// The identical current/latest sidecars sign only this GitHub canonical URL.
// It is NOT the relay's same-named fixed 1.1.11 bridge.
const APK_NAME = 'magireco-latest-legacy-client.apk';

// Public update key pinned by the existing APK; no private key or runtime override.
const UPDATE_KEY = { kty:'RSA', e:'AQAB', n:"zeaF1ZAWqvujjt3Jl_3PZPaGmU7iADdYqT-W425LNbqTcbprtcMC792qFCo-1VngMKr4wtSNPQI7kZSht6pW500okFfytoyqQ6wkx5MuAkoyUeCI4PjbRRbG2anvYyxJXi5hpDy5gtUeO_kseKm7ZOMAmBzBeE7oIogNEXWPHDfCU6G0UbN9GMqKrcvdJ6yibGWTBYlpPp2E8qhcdnR9SmGgbQvZ_g_XRnWoe8-wF0bKsBrtug-WGIY3oPuEly1pcsCnw_iExEltM51C6gWnUvrYWqGEykC-qAbLHAxHOzXbrd3glm96d6qhioKMSmxUZGvAod2OsCK-BCBcIBHo_v7F1U0vBoslmx497uD1byPVgD8cB-ETLzj29CMg5EivSR0ISXBLuN9FdvHXqmLr-6q4pa0fmQXDuRGQ1RdG2DUyvw6Xt8VO68WH6ysjaDvjAvLzFk96-yjj4FfjW_VKXB9a8NsvllD6SGg-Cu-AweeajaNHqD22cCEAd2PglB6X" };
const DISCOVERY_MIGRATION = {
  "schema": 2,
  "mode": "true-1.2-single-apk",
  "from": {
    "version": "1.3.4",
    "version_code": 1713000858,
    "size": 462325970,
    "sha256": "e2fb1e34f87e95ac5cb5a20f9f60e7e9fd745510805d644d8cd3bcb1aa0e70f9",
    "source_commit": "4a1d01f4599927a889a015dc217f79e7fb0c75d8"
  },
  "to_line": "1.2",
  "minimum_version": "1.2.7",
  "minimum_code": 1713000869,
  "old_1_3_manual_install_once": false,
  "legacy_discovery": {
    "version": "1.3.127",
    "display_version": "1.2.7"
  }
};

function sameJson(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const ak = Object.keys(a).sort(), bk = Object.keys(b).sort();
  return ak.length === bk.length && ak.every((key, i) => key === bk[i] && sameJson(a[key], b[key]));
}

async function verifiedDiscoveryPayload(envelope) {
  if (!envelope || !sameJson(Object.keys(envelope).sort(), ['key_id','payload','schema','signature']) ||
      envelope.schema !== 1 || envelope.key_id !== 'release-manifest-v1' ||
      typeof envelope.payload !== 'string' || typeof envelope.signature !== 'string' ||
      !/^[a-f0-9]{768}$/.test(envelope.signature)) throw new Error('Invalid discovery envelope');
  const raw = new TextEncoder().encode(envelope.payload);
  if (raw.byteLength > 65536) throw new Error('Discovery payload is too large');
  const key = await crypto.subtle.importKey('jwk', UPDATE_KEY,
    { name:'RSASSA-PKCS1-v1_5', hash:'SHA-256' }, false, ['verify']);
  const signature = Uint8Array.from(envelope.signature.match(/../g), byte => parseInt(byte, 16));
  const message = new TextEncoder().encode('MAGIACN-APK-UPDATE-V1\n' + envelope.payload);
  if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, message)) throw new Error('Invalid publisher signature');
  const payload = JSON.parse(envelope.payload);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid discovery payload');
  return payload;
}

async function releaseVersion(client, payload) {
  const discoveryFields = ['display_version', 'compatibility_discovery'];
  const hasDiscovery = discoveryFields.some(field => Object.hasOwn(client, field) || (payload && Object.hasOwn(payload, field)));
  if (!hasDiscovery) return client.version;
  const signed = await verifiedDiscoveryPayload(client.signed_update);
  for (const field of ['display_version','compatibility_discovery','single_line_migration']) {
    if (!sameJson(client[field], signed[field])) throw new Error('Unsigned discovery field: ' + field);
  }
  const mapping = signed.compatibility_discovery;
  if (signed.version !== '1.3.127' || signed.display_version !== '1.2.7' ||
      !mapping || Array.isArray(mapping) || mapping.schema !== 1 ||
      mapping.discovery_version !== '1.3.127' || mapping.installed_public_version !== '1.2.7' ||
      !Number.isSafeInteger(signed.version_code) || signed.version_code <= 1713000868 || signed.version_code > 2147483647 ||
      mapping.installed_version_code !== signed.version_code || mapping.same_published_apk !== true || mapping.separate_client_release !== false ||
      !sameJson(signed.single_line_migration, DISCOVERY_MIGRATION) ||
      !Array.isArray(signed.release_notes) || typeof signed.release_notes[0] !== 'string' ||
      !signed.release_notes[0].startsWith('实际安装版本：1.2.7') || !Array.from(signed.release_notes[0]).slice(0,160).join('').includes('1.3.127')) {
    throw new Error('Invalid explicit single-APK discovery mapping');
  }
  // release_version is the signed discovery identity, never a display override.
  for (const value of [signed.release_version, client.release_version]) {
    if (value !== undefined && value !== signed.version) throw new Error('Invalid release identity');
  }
  if (Object.hasOwn(client, 'release_version') && !Object.hasOwn(signed, 'release_version')) throw new Error('Unsigned release identity');
  for (const field of ['publisher','channel','package_name','source_commit','legacy_cert_sha256','release_cert_sha256','corresponding_source','apk_urls']) {
    if (!sameJson(client[field], signed[field])) throw new Error('Unsigned publisher identity: ' + field);
  }
  if (signed.publisher !== 'MadeInMagius' || signed.channel !== 'personal-1.1' ||
      signed.package_name !== 'io.kamihama.totentanz' || !/^[a-f0-9]{40}$/.test(signed.source_commit || '') ||
      signed.legacy_cert_sha256 !== 'a40da80a59d170caa950cf15c18c454d47a39b26989d8b640ecd745ba71bf5dc' ||
      signed.release_cert_sha256 !== '73b6fa55f2792a437fcc186cce529d1288b231ae43acfb0137068cd12b381705' ||
      signed.size > 1073741824 ||
      ['legacy_compatibility','upgrade_bridge'].some(field => Object.hasOwn(client, field) || Object.hasOwn(signed, field)) ||
      signed.corresponding_source?.asset !== 'magireco-legacy-client-1.2.7-corresponding-source.zip' ||
      !/^[a-f0-9]{64}$/.test(signed.corresponding_source.sha256 || '') ||
      !Number.isSafeInteger(signed.corresponding_source.size) || signed.corresponding_source.size <= 0) throw new Error('Invalid publisher identity');
  return signed.display_version;
}

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

async function currentAsset(release, current) {
  if (!current || current.apk !== APK_NAME || current.apk_url !== RELEASE_ROOT + APK_NAME) return null;
  try {
    let payload = null;
    if (current.signed_update !== undefined) {
      payload = JSON.parse(current.signed_update.payload);
      if (!payload || ['version', 'size', 'sha256', 'version_code'].some(key => payload[key] !== current[key]) ||
          !Array.isArray(payload.apk_urls) || payload.apk_urls.length !== 1 || payload.apk_urls[0] !== current.apk_url) return null;
    }
    // Verify discovery signatures and mapping before normalization; never rewrite signed bytes.
    // Existing ordinary 1.2.x metadata keeps its previous consistency-check behavior.
    const version = await releaseVersion(current, payload);
    const normalized = { ...current, version };
    const asset = matchAsset(release, normalized, APK_NAME);
    if (version !== current.version) {
      const source = current.corresponding_source;
      const archives = release.assets?.filter(item => item.name === source.asset) || [];
      if (archives.length !== 1 || archives[0].state !== 'uploaded' || archives[0].size !== source.size ||
          archives[0].digest !== 'sha256:' + source.sha256) return null;
    }
    return asset ? { asset, version } : null;
  } catch { return null; }
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
  const selected = await currentAsset(release, client);
  if (!selected) throw new Error('The release is synchronizing. Please refresh shortly.');
  const { asset: apk, version } = selected;
  // Pin the upstream asset ID for this request, not the mutable "latest" URL.
  // A replaced asset yields an error rather than silently sending another APK.
  return {
    version,
    size: client.size,
    sha256: client.sha256,
    source: 'current',
    updated: client.updated || apk.updated_at || null,
    download: './downloads/magireco/android?sha256=' + client.sha256,
    asset: {
      id: apk.id,
      name: 'magireco-cn-' + version + '.apk',
      size: client.size,
      digest: 'sha256:' + client.sha256,
      content_type: 'application/vnd.android.package-archive',
      url: REPO_API + '/releases/assets/' + apk.id,
    },
  };
}
