// MadeInMagius PixEz Pulse Android In-App Update Manifest Endpoint
// Serves GET /updates/pixiv/latest.json (keeps HiiragiNemu/pixez-pulse PRIVATE via GITHUB_RELEASES_TOKEN)

const REPO = 'HiiragiNemu/pixez-pulse';
const EXPECTED_PACKAGE = 'com.hiiraginemu.pixezpulse';
const PUBLIC_APK_URL = 'https://madeinmagius-site.pages.dev/downloads/pixiv/android';

const FALLBACK = Object.freeze({
  schema: 'madeinmagius-android-update/v1',
  packageName: EXPECTED_PACKAGE,
  version: '2.1.6',
  versionCode: 10010260,
  minSdk: 23,
  apk_url: PUBLIC_APK_URL,
  size: 55361712,
  sha256: 'e01a88b3f3c62af556a9882ae0465851fd96b33b2c4659767bc05acaf4e15d11',
  releaseNotes:
    'PixEz Pulse v2.1.6：点击联想候选词、历史记录、看图器标签或键盘回车仅填入标签，仅点击「开始采样」后才开始探测与抓取，并新增联想内存缓存与 320ms 防抖；完整包含万图画廊真分页（36/60/120作每页+跳页）与采集中防抖锁定、切页后台持续采集不中断、进度条与全年龄基准计数修复及 Plan A 全站公共词表。',
});

function githubHeaders(token, accept = 'application/vnd.github+json') {
  return {
    Accept: accept,
    Authorization: `Bearer ${token}`,
    'User-Agent': 'MadeInMagius-PixEzPulse-Update/1',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function jsonResponse(value, source, status = 200) {
  return new Response(JSON.stringify(value, null, 2) + '\n', {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=60, s-maxage=60',
      'access-control-allow-origin': '*',
      'x-content-type-options': 'nosniff',
      'x-update-source': source,
    },
  });
}

function normalizeSha256(value) {
  const m = String(value || '').trim().match(/^(?:sha256:)?([0-9a-fA-F]{64})$/);
  return m ? m[1].toLowerCase() : null;
}

async function fetchGithubAssetJson(asset, token) {
  const first = await fetch(asset.url, {
    headers: githubHeaders(token, 'application/octet-stream'),
    redirect: 'manual',
  });
  let res = first;
  if (first.status >= 300 && first.status < 400) {
    const loc = first.headers.get('location');
    if (!loc) throw new Error('redirect missing location');
    res = await fetch(loc, { redirect: 'follow' });
  }
  if (!res.ok) throw new Error(`asset fetch failed: ${res.status}`);
  return res.json();
}

export async function onRequestGet(context) {
  const file = String(context.params?.file || '').toLowerCase();
  if (file !== 'latest.json' && file !== 'android.json') {
    return jsonResponse({ error: 'Not found' }, 'not-found', 404);
  }

  const token = context.env?.GITHUB_RELEASES_TOKEN || context.env?.GITHUB_TOKEN || '';
  if (!token) {
    return jsonResponse(FALLBACK, 'fallback-no-token', 200);
  }

  try {
    const relRes = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: githubHeaders(token),
    });
    if (!relRes.ok) return jsonResponse(FALLBACK, 'fallback-release-error', 200);
    const release = await relRes.json();
    const assets = Array.isArray(release.assets) ? release.assets : [];
    const apkAsset = assets.find((a) => /\.apk$/i.test(a.name || ''));
    const manifestAsset = assets.find((a) => /pixez-pulse-manifest\.json$/i.test(a.name || ''));

    if (!apkAsset) return jsonResponse(FALLBACK, 'fallback-no-apk', 200);

    let manifest = {};
    if (manifestAsset) {
      try {
        manifest = await fetchGithubAssetJson(manifestAsset, token);
      } catch (_) {}
    }

    const versionCode = Number(manifest.versionCode || FALLBACK.versionCode);
    const version = String(manifest.version || FALLBACK.version);
    const sha256 = normalizeSha256(manifest.sha256 || apkAsset.digest) || FALLBACK.sha256;
    const size = Number(apkAsset.size || manifest.size || FALLBACK.size);
    const releaseNotes = String(manifest.releaseNotes || release.name || FALLBACK.releaseNotes);

    return jsonResponse(
      {
        schema: 'madeinmagius-android-update/v1',
        packageName: EXPECTED_PACKAGE,
        version,
        versionCode,
        minSdk: Number(manifest.minSdk || 23),
        apk_url: PUBLIC_APK_URL,
        size,
        sha256,
        publishedAt: apkAsset.updated_at || release.published_at || null,
        releaseNotes,
      },
      'github-release',
      200
    );
  } catch (_) {
    return jsonResponse(FALLBACK, 'fallback-exception', 200);
  }
}
