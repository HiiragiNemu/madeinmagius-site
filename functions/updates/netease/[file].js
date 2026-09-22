const REPO = 'HiiragiNemu/netease-cloudmusic-delisted-exporter';
const EXPECTED_PACKAGE = 'io.github.hiiraginemu.ncmexporter';
const EXPECTED_SIGNER =
  '4f8bdaa6ce7940d73a4ac0cc4337a81479ffed8a2f576f2e7c4bffbe5ce85481';
const PUBLIC_APK_URL =
  'https://madeinmagius-site.pages.dev/downloads/netease/android-full';

const FALLBACK = Object.freeze({
  schema: 'madeinmagius-android-update/v1',
  packageName: EXPECTED_PACKAGE,
  version: '2.5.2',
  versionCode: 252,
  minSdk: 26,
  apk_url:
    'https://madeinmagius-site.pages.dev/downloads/pinned/netease/2.5.2',
  size: 908807,
  sha256:
    'b1fc5296a065866a4e1b047dd975459e2a7c35148aee8755ef887443c7b32324',
  releaseNotes:
    'v2.5.2：应用更新与文件访问。若最新正式 Release 校验不完整，本端点继续返回此已验证版本。',
});

function githubHeaders(token, accept = 'application/vnd.github+json') {
  return {
    Accept: accept,
    Authorization: `Bearer ${token}`,
    'User-Agent': 'MadeInMagius-NetEase-Update/1',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function jsonResponse(value, source, status = 200) {
  return new Response(JSON.stringify(value, null, 2) + '\n', {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=60, s-maxage=60',
      'x-content-type-options': 'nosniff',
      'x-update-source': source,
    },
  });
}

function parseVersion(value) {
  const match = String(value || '').match(/^(?:v)?(\d+)\.(\d+)\.(\d+)$/);
  return match ? match.slice(1).map(Number) : null;
}

function newerThan(candidate, baseline) {
  const a = parseVersion(candidate);
  const b = parseVersion(baseline);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}

async function githubJson(url, token) {
  const response = await fetch(url, { headers: githubHeaders(token) });
  if (!response.ok) throw new Error(`GitHub lookup failed: ${response.status}`);
  return response.json();
}

async function githubAssetText(asset, token) {
  const first = await fetch(asset.url, {
    headers: githubHeaders(token, 'application/octet-stream'),
    redirect: 'manual',
  });
  let response = first;
  if (first.status >= 300 && first.status < 400) {
    const location = first.headers.get('location');
    if (!location) throw new Error('manifest redirect missing location');
    response = await fetch(location, { redirect: 'follow' });
  }
  if (!response.ok) throw new Error(`manifest fetch failed: ${response.status}`);
  const text = await response.text();
  if (text.length > 128 * 1024) throw new Error('manifest too large');
  return text;
}

function normalizeSha256(value) {
  const match = String(value || '').trim().match(/^(?:sha256:)?([0-9a-fA-F]{64})$/);
  return match ? match[1].toLowerCase() : null;
}

function validatedUpdate(release, manifest) {
  if (!release || !manifest || typeof manifest !== 'object') {
    throw new Error('release manifest missing');
  }
  if (manifest.schema !== 'netease-playlist-exporter-release/v3') {
    throw new Error('unsupported release manifest schema');
  }
  if (!newerThan(manifest.version, FALLBACK.version)) {
    throw new Error('release is not newer than fallback');
  }
  if (release.tag_name !== `v${manifest.version}` || manifest.tag !== release.tag_name) {
    throw new Error('release tag/version mismatch');
  }

  const android = manifest.android;
  if (!android || android.packageName !== EXPECTED_PACKAGE) {
    throw new Error('package mismatch');
  }
  const versionCode = Number(android.versionCode);
  if (!Number.isSafeInteger(versionCode) || versionCode <= FALLBACK.versionCode) {
    throw new Error('invalid versionCode');
  }
  if (normalizeSha256(android.signerSha256) !== EXPECTED_SIGNER) {
    throw new Error('signer mismatch');
  }
  if (manifest.components?.android !== manifest.version) {
    throw new Error('Android component/version mismatch');
  }

  const apkAsset = (release.assets || []).find(asset =>
    new RegExp(`^NeteasePlaylistExporter-v${manifest.version.replace(/\\./g, '\\\\.')}\\-android-full\\.apk$`, 'i')
      .test(asset.name)
  );
  const manifestApk = Array.isArray(manifest.assets)
    ? manifest.assets.find(asset => asset?.name === apkAsset?.name)
    : null;
  if (!apkAsset || !manifestApk) {
    throw new Error('APK asset mismatch');
  }

  const size = Number(manifestApk.bytes);
  if (!Number.isSafeInteger(size) || size <= 0 || size !== Number(apkAsset.size)) {
    throw new Error('APK size mismatch');
  }
  const manifestSha = normalizeSha256(manifestApk.sha256);
  const githubSha = normalizeSha256(apkAsset.digest);
  if (!manifestSha || (githubSha && githubSha !== manifestSha)) {
    throw new Error('APK digest mismatch');
  }

  const notes = String(release.body || '').trim();
  return {
    schema: 'madeinmagius-android-update/v1',
    packageName: EXPECTED_PACKAGE,
    version: manifest.version,
    versionCode,
    minSdk: 26,
    apk_url: PUBLIC_APK_URL,
    size,
    sha256: manifestSha,
    releaseNotes: notes.slice(0, 6000) ||
      `网易云完整曲名导出器 v${manifest.version} 正式更新。`,
  };
}

export async function onRequestGet(context) {
  if (String(context.params?.file || '') !== 'android.json') {
    return new Response('Not found.\n', { status: 404 });
  }
  const token = context.env.GITHUB_RELEASES_TOKEN;
  if (!token) return jsonResponse(FALLBACK, 'verified-fallback');

  try {
    const release = await githubJson(
      `https://api.github.com/repos/${REPO}/releases/latest`,
      token,
    );

    if (!newerThan(release.tag_name, FALLBACK.version)) {
      return jsonResponse(FALLBACK, 'verified-fallback');
    }

    const manifestAsset = (release.assets || []).find(
      asset => asset.name === 'RELEASE_MANIFEST.json',
    );
    if (!manifestAsset) throw new Error('RELEASE_MANIFEST.json missing');

    const manifest = JSON.parse(await githubAssetText(manifestAsset, token));
    return jsonResponse(validatedUpdate(release, manifest), 'verified-latest-release');
  } catch {
    return jsonResponse(FALLBACK, 'verified-fallback');
  }
}

export { FALLBACK, validatedUpdate };
