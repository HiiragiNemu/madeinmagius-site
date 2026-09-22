const REPO = 'HiiragiNemu/Bilibili-Follower-Snapshot';
const EXPECTED_PACKAGE = 'io.github.hiiraginemu.bilibilifollowersnapshot.companion';
const EXPECTED_SIGNER =
  '3372dbf9263c6a8a29bf76ed13c78570a58b10945f39ff7b6a9a613ef3c9bab8';
const PUBLIC_APK_URL =
  'https://madeinmagius-site.pages.dev/downloads/bilibili/android';

const FALLBACK = Object.freeze({
  schema: 'madeinmagius-android-update/v1',
  packageName: EXPECTED_PACKAGE,
  version: '0.1.10',
  versionCode: 11,
  minSdk: 29,
  apk_url:
    'https://madeinmagius-site.pages.dev/downloads/pinned/bilibili/0.1.10',
  size: 2495161,
  sha256:
    '89999ea9941128f53d9dcec7ebeaf23d5c981c59e974445042e90933f06956fd',
  releaseNotes:
    'v0.1.10：应用更新与文件访问入口、签名校验与可选共享存储访问。若最新正式 Release 校验不完整，本端点会继续返回此已验证版本。',
});

function githubHeaders(token, accept = 'application/vnd.github+json') {
  return {
    Accept: accept,
    Authorization: `Bearer ${token}`,
    'User-Agent': 'MadeInMagius-Bilibili-Update/1',
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
  if (!response.ok) {
    throw new Error(`manifest fetch failed: ${response.status}`);
  }
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
  if (manifest.schema !== 'bilibili-follower-snapshot-release/v1') {
    throw new Error('unsupported release manifest schema');
  }
  if (manifest.packageName !== EXPECTED_PACKAGE) {
    throw new Error('package mismatch');
  }
  if (!newerThan(manifest.version, FALLBACK.version)) {
    throw new Error('release is not newer than fallback');
  }
  if (release.tag_name !== `v${manifest.version}`) {
    throw new Error('release tag/version mismatch');
  }

  const versionCode = Number(manifest.versionCode);
  const minSdk = Number(manifest.minSdk);
  if (!Number.isSafeInteger(versionCode) || versionCode <= FALLBACK.versionCode) {
    throw new Error('invalid versionCode');
  }
  if (!Number.isSafeInteger(minSdk) || minSdk < 29 || minSdk > 36) {
    throw new Error('invalid minSdk');
  }

  const signer = normalizeSha256(manifest.signerSha256);
  if (signer !== EXPECTED_SIGNER) {
    throw new Error('signer mismatch');
  }

  const apkAsset = (release.assets || []).find(asset =>
    /^Bilibili-Follower-Snapshot-Companion-v[0-9.]+\.apk$/i.test(asset.name)
  );
  const manifestApk = manifest.assets?.android;
  if (!apkAsset || !manifestApk || manifestApk.name !== apkAsset.name) {
    throw new Error('APK asset mismatch');
  }

  const size = Number(manifestApk.size);
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
    minSdk,
    apk_url: PUBLIC_APK_URL,
    size,
    sha256: manifestSha,
    releaseNotes: notes.slice(0, 6000) ||
      `B站粉丝快照伴侣 v${manifest.version} 正式更新。`,
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
    const update = validatedUpdate(release, manifest);
    return jsonResponse(update, 'verified-latest-release');
  } catch {
    return jsonResponse(FALLBACK, 'verified-fallback');
  }
}

export { FALLBACK, validatedUpdate };
