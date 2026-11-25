// MadeInMagius PixEz Pulse Android In-App Update Manifest Endpoint
// Serves GET /updates/pixiv/latest.json (keeps HiiragiNemu/pixez-pulse PRIVATE via GITHUB_RELEASES_TOKEN)

const REPO = 'HiiragiNemu/pixez-pulse';
const EXPECTED_PACKAGE = 'com.hiiraginemu.pixezpulse';
const PUBLIC_APK_URL = 'https://madeinmagius-site.pages.dev/downloads/pixiv/android';

const FALLBACK = Object.freeze({
  schema: 'madeinmagius-android-update/v1',
  packageName: EXPECTED_PACKAGE,
  version: '2.1.0',
  versionCode: 10010200,
  minSdk: 23,
  apk_url: PUBLIC_APK_URL,
  size: 54292295,
  sha256: 'b7230024466f5bf79717d84b264ed910d69fd66a3c7c4f304df0b5c7821791c0',
  releaseNotes:
    'PixEz Pulse v2.1.0：新增应用内检查更新与一键安装、登录后原生 App API 完整 R-18/AI 采样、日期窗口分段突破上限、本机 1GB 分段缓存、8 站点采集、精度优先分类与原生搜索页共现整合。',
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
