// Serverless Cloudflare Pages Function for PixEz Pulse Web Terminal (/api/pixiv/*)
// Supports CORS for hiiraginemu.github.io, madeinmagius-site.pages.dev & localhost,
// and seamlessly falls back to HibiAPI when Cloudflare Workers egress encounters Pixiv WAF HTML.

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const HIBI_BASE = 'https://hibiapi.getloli.com/api/pixiv';

const GENERIC_TRANSLATIONS = {
  'オリジナル': '原创',
  'オリジナルキャラクター': '原创角色',
  'オリジナルキャラ': '原创角色',
  'オリジナル漫画': '原创漫画',
  '一次創作': '一次创作',
  '創作': '创作/原创',
  '女の子': '女孩子',
  '男の子': '男孩子',
  'イラスト': '插画',
  '漫画': '漫画',
  'マンガ': '漫画',
  '落書き': '涂鸦',
  '風景': '风景',
  '背景': '背景',
  '水着': '泳装',
  '制服': '制服',
  'メイド': '女仆',
  '猫耳': '猫耳',
  '眼鏡': '眼镜',
  '百合': '百合',
  '白髪': '白发',
  '黒髪': '黑发',
  '金髪': '金发',
  'AIイラスト': 'AI插画',
  'AI生成': 'AI生成',
};

function resolveAllowedOrigin(request) {
  const origin = request?.headers?.get('Origin') || '';
  if (
    origin === 'https://hiiraginemu.github.io' ||
    origin === 'https://madeinmagius-site.pages.dev' ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
  ) {
    return origin;
  }
  return '*';
}

function buildCorsHeaders(request) {
  return {
    'Access-Control-Allow-Origin': resolveAllowedOrigin(request),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Pixiv-Cookie, X-Pixiv-Token',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function jsonResponse(data, status = 200, request = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...buildCorsHeaders(request),
    },
  });
}

function pixivHeaders(cookie = '') {
  const h = {
    'User-Agent': DEFAULT_UA,
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9,ja;q=0.8,en;q=0.7',
    Referer: 'https://www.pixiv.net/',
  };
  if (cookie) {
    const clean = cookie.trim();
    h.Cookie = clean.includes('=') ? clean : `PHPSESSID=${clean}`;
  }
  return h;
}

function hibiHeaders() {
  return {
    'User-Agent': DEFAULT_UA,
    Accept: 'application/json',
    'Accept-Language': 'zh-CN,zh;q=0.9',
  };
}

async function fetchJsonSafe(url, headers) {
  try {
    const res = await fetch(url, { headers });
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!res.ok || !ct.includes('json')) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchPximgWithFallback(imgUrl) {
  const upstream = await fetch(imgUrl, {
    headers: {
      'User-Agent': DEFAULT_UA,
      Referer: 'https://www.pixiv.net/',
    },
  }).catch(() => null);
  if (upstream && upstream.ok) return upstream;

  const mirrorUrl = imgUrl.replace(/^https:\/\/i\.pximg\.net\//i, 'https://i.pixiv.re/');
  const mirrorRes = await fetch(mirrorUrl, {
    headers: { 'User-Agent': DEFAULT_UA },
  }).catch(() => null);
  return mirrorRes || upstream;
}

function normalizeHibiIllust(item, translationsOut = {}) {
  if (!item || !item.id) return null;
  const tags = [];
  if (Array.isArray(item.tags)) {
    for (const tObj of item.tags) {
      if (tObj && tObj.name) {
        tags.push(tObj.name);
        if (tObj.translated_name) {
          translationsOut[tObj.name] = tObj.translated_name;
        }
      }
    }
  }
  const typeMap = { illust: 0, manga: 1, ugoira: 2 };
  const illustType = typeMap[item.type] ?? 0;
  const isAi =
    item.illust_ai_type === 2 ||
    tags.some((t) => /^(AIイラスト|AI生成|AIart|NovelAI)$/i.test(t));
  return {
    id: String(item.id),
    title: item.title || '无题',
    tags,
    userId: String(item.user?.id || ''),
    userName: item.user?.name || '',
    thumbUrl: item.image_urls?.square_medium || item.image_urls?.medium || '',
    pageCount: Number(item.page_count || 1),
    illustType,
    xRestrict: Number(item.x_restrict || 0),
    isAi,
    bookmarkCount: Number(item.total_bookmarks || 0),
  };
}

function matchesFilters(work, mode, type) {
  if (!work) return false;
  if (mode === 'safe' && work.xRestrict > 0) return false;
  if (mode === 'r18' && work.xRestrict === 0) return false;
  if (type === 'illust' && work.illustType !== 0) return false;
  if (type === 'manga' && work.illustType !== 1) return false;
  if (type === 'ugoira' && work.illustType !== 2) return false;
  if (type === 'illust_and_ugoira' && work.illustType === 1) return false;
  return true;
}

function mapHibiSearchMode(sMode) {
  if (sMode === 's_tag_full') return 'exact_match_for_tags';
  if (sMode === 's_tc') return 'title_and_caption';
  return 'partial_match_for_tags';
}

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: buildCorsHeaders(context.request) });
}

export async function onRequest(context) {
  const { request } = context;
  const cors = buildCorsHeaders(request);
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  const url = new URL(request.url);
  const subPath = url.pathname.replace(/^\/api\/pixiv\/?/, '');
  const cookie = request.headers.get('x-pixiv-cookie') || url.searchParams.get('cookie') || '';

  // 0. Health / status endpoint
  if (subPath === 'status' || subPath === '') {
    return jsonResponse({ ok: true, runtime: 'cloudflare-pages', version: '4.1' }, 200, request);
  }

  // 1. pximg Referer-bypass image proxy (/api/pixiv/pximg?url=... & /api/pixiv/image?url=...)
  if (subPath === 'pximg' || subPath === 'image') {
    const imgUrl = url.searchParams.get('url');
    if (!imgUrl || !/^https:\/\/i\.pximg\.net\//i.test(imgUrl)) {
      return new Response('Invalid pximg URL', { status: 400, headers: cors });
    }
    const upstream = await fetchPximgWithFallback(imgUrl);
    if (!upstream) {
      return new Response('Image upstream error', { status: 502, headers: cors });
    }
    const headers = new Headers(cors);
    headers.set('Content-Type', upstream.headers.get('Content-Type') || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=86400');
    return new Response(upstream.body, { status: upstream.status, headers });
  }

  // 2. Original artwork download proxy (/api/pixiv/download?url=...&filename=...)
  if (subPath === 'download') {
    const imgUrl = url.searchParams.get('url');
    const filename = url.searchParams.get('filename') || 'pixiv-artwork.jpg';
    if (!imgUrl || !/^https:\/\/i\.pximg\.net\//i.test(imgUrl)) {
      return new Response('Invalid pximg URL', { status: 400, headers: cors });
    }
    const upstream = await fetchPximgWithFallback(imgUrl);
    if (!upstream) {
      return new Response('Download upstream error', { status: 502, headers: cors });
    }
    const headers = new Headers(cors);
    headers.set('Content-Type', upstream.headers.get('Content-Type') || 'application/octet-stream');
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    return new Response(upstream.body, { status: upstream.status, headers });
  }

  // 3. Autocomplete (/api/pixiv/autocomplete?q=... | ?keyword=...)
  if (subPath === 'autocomplete') {
    const kw = (url.searchParams.get('q') || url.searchParams.get('keyword') || '').trim();
    if (!kw) return jsonResponse({ candidates: [] }, 200, request);

    let candidates = [];

    // Try direct Pixiv RPC first (succeeds when not WAF-challenged)
    const rpcJson = await fetchJsonSafe(
      `https://www.pixiv.net/rpc/cps.php?keyword=${encodeURIComponent(kw)}&lang=zh`,
      pixivHeaders(cookie)
    );
    if (rpcJson && Array.isArray(rpcJson.candidates) && rpcJson.candidates.length > 0) {
      candidates = rpcJson.candidates.map((c) => ({
        tag_name: c.tag_name || '',
        tag_translation: c.tag_translation || '',
        access_count: c.access_count || '',
        type: c.type || '',
      }));
    }

    // Automatic fallback to HibiAPI tags_autocomplete (reliable from Cloudflare Workers)
    if (candidates.length === 0) {
      const hibiJson = await fetchJsonSafe(
        `${HIBI_BASE}/tags_autocomplete?word=${encodeURIComponent(kw)}`,
        hibiHeaders()
      );
      if (hibiJson && Array.isArray(hibiJson.tags)) {
        candidates = hibiJson.tags.map((t) => ({
          tag_name: t.name || '',
          tag_translation: t.translated_name || '',
          access_count: '',
          type: 'app_api',
        }));
      }
    }

    candidates = candidates
      .filter((c) => c.tag_name)
      .map((c) => ({
        ...c,
        tag_translation: c.tag_translation || GENERIC_TRANSLATIONS[c.tag_name] || '',
      }));

    return jsonResponse({ candidates }, 200, request);
  }

  // 4. Auth status, cookie verification & PixEz OAuth PKCE
  if (subPath === 'auth/status') {
    const uidMatch = cookie.match(/(?:PHPSESSID=|^)(\d+)_/);
    return jsonResponse(
      {
        loggedIn: Boolean(cookie),
        mode: cookie ? 'cookie' : 'guest',
        user: cookie
          ? { id: uidMatch ? uidMatch[1] : 'cookie', name: uidMatch ? `Pixiv用户 #${uidMatch[1]}` : 'Pixiv 会话' }
          : null,
      },
      200,
      request
    );
  }
  if (subPath === 'auth/logout') {
    return jsonResponse({ error: false, loggedIn: false }, 200, request);
  }
  if (subPath === 'auth/verify-cookie' && request.method === 'POST') {
    let body = {};
    try {
      body = await request.json();
    } catch {}
    const rawCookie = String(body.cookie || cookie || '').trim();
    const cookieHeader = rawCookie.includes('=') ? rawCookie : rawCookie ? `PHPSESSID=${rawCookie}` : '';
    const uidMatch = rawCookie.match(/(?:PHPSESSID=|^)(\d+)_/);
    const uid = uidMatch ? uidMatch[1] : 'PixivUser';
    let userName = body.userName || '';
    if (!userName && /^\d+$/.test(uid) && cookieHeader) {
      const pj = await fetchJsonSafe(`https://www.pixiv.net/ajax/user/${uid}?lang=zh`, pixivHeaders(cookieHeader));
      if (pj?.body?.name) userName = pj.body.name;
    }
    return jsonResponse(
      {
        error: false,
        loggedIn: Boolean(cookieHeader),
        mode: cookieHeader ? 'cookie' : 'guest',
        user: cookieHeader ? { id: uid, name: userName || `Pixiv用户 #${uid}`, account: uid } : null,
      },
      200,
      request
    );
  }
  if (subPath === 'oauth/start') {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const b64url = (arr) =>
      btoa(String.fromCharCode(...arr))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
    const codeVerifier = b64url(bytes);
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier)));
    const codeChallenge = b64url(digest);
    const loginUrl = `https://app-api.pixiv.net/web/v1/login?code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=S256&client=pixiv-android`;
    return jsonResponse({ error: false, loginUrl, codeChallenge, codeVerifier }, 200, request);
  }
  if (subPath === 'oauth/exchange' && request.method === 'POST') {
    let body = {};
    try {
      body = await request.json();
    } catch {}
    const form = new URLSearchParams({
      client_id: 'MOBrBDS8blbauoSck0ZfDbtuzpyT',
      client_secret: 'lsACyCD94FhDUtGTXi3QzcFE2uU1hqtDaKeqrdwj',
      include_policy: 'true',
    });
    if (body.refreshToken) {
      form.set('grant_type', 'refresh_token');
      form.set('refresh_token', String(body.refreshToken).trim());
    } else if (body.code) {
      const m = String(body.code).match(/code=([A-Za-z0-9_-]+)/);
      form.set('grant_type', 'authorization_code');
      form.set('code', m ? m[1] : String(body.code).trim());
      form.set('code_verifier', String(body.codeVerifier || ''));
      form.set('redirect_uri', 'https://app-api.pixiv.net/web/v1/users/auth/pixiv/callback');
    } else {
      return jsonResponse({ error: true, message: '缺少 OAuth code 或 refresh_token' }, 400, request);
    }
    try {
      const tokenRes = await fetch('https://oauth.secure.pixiv.net/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'PixivAndroidApp/5.0.234 (Android 14; Pixel 8)',
        },
        body: form.toString(),
      });
      const td = await tokenRes.json();
      if (!tokenRes.ok || td.has_error || !td.access_token) {
        return jsonResponse({ error: true, message: td?.errors?.system?.message || 'Pixiv OAuth 验证失败' }, 400, request);
      }
      return jsonResponse({ error: false, user: td.user || null, refreshToken: td.refresh_token || '' }, 200, request);
    } catch (e) {
      return jsonResponse({ error: true, message: e.message || 'OAuth 请求失败' }, 502, request);
    }
  }

  // 5. Artwork detail (/api/pixiv/illust/detail?id=...)
  if (subPath === 'illust/detail') {
    const id = (url.searchParams.get('id') || '').trim();
    if (!id) return jsonResponse({ error: true, message: '缺少作品 ID' }, 400, request);

    // Strategy A: Direct Pixiv Web AJAX
    const infoJson = await fetchJsonSafe(
      `https://www.pixiv.net/ajax/illust/${encodeURIComponent(id)}?lang=zh`,
      pixivHeaders(cookie)
    );
    if (infoJson && !infoJson.error && infoJson.body) {
      const pagesJson = await fetchJsonSafe(
        `https://www.pixiv.net/ajax/illust/${encodeURIComponent(id)}/pages?lang=zh`,
        pixivHeaders(cookie)
      );
      const b = infoJson.body;
      const tags = (b.tags?.tags || []).map((t) => t.tag).filter(Boolean);
      const pages = Array.isArray(pagesJson?.body)
        ? pagesJson.body.map((p) => ({
            thumb: p.urls?.thumb_mini || p.urls?.small || '',
            regular: p.urls?.regular || '',
            large: p.urls?.regular || '',
            original: p.urls?.original || '',
          }))
        : [];
      return jsonResponse(
        {
          id: String(b.illustId || b.id),
          title: b.illustTitle || b.title || '',
          description: b.illustComment || b.description || '',
          userName: b.userName || '',
          userId: String(b.userId || ''),
          width: b.width || 0,
          height: b.height || 0,
          pageCount: b.pageCount || pages.length || 1,
          illustType: b.illustType || 0,
          isAi: b.aiType === 2,
          bookmarkCount: b.bookmarkCount || 0,
          viewCount: b.viewCount || 0,
          thumbUrl: b.urls?.thumb || b.urls?.small || '',
          regularUrl: b.urls?.regular || '',
          originalUrl: b.urls?.original || '',
          tags,
          pages,
        },
        200,
        request
      );
    }

    // Strategy B: HibiAPI App-API fallback
    const hibiJson = await fetchJsonSafe(`${HIBI_BASE}/illust?id=${encodeURIComponent(id)}`, hibiHeaders());
    if (hibiJson && hibiJson.illust) {
      const ill = hibiJson.illust;
      const typeMap = { illust: 0, manga: 1, ugoira: 2 };
      const tags = (ill.tags || []).map((t) => t.name).filter(Boolean);
      const pages =
        Array.isArray(ill.meta_pages) && ill.meta_pages.length > 0
          ? ill.meta_pages.map((p) => ({
              square_medium: p.image_urls?.square_medium || '',
              thumb: p.image_urls?.square_medium || p.image_urls?.medium || '',
              regular: p.image_urls?.large || p.image_urls?.medium || '',
              large: p.image_urls?.large || p.image_urls?.medium || '',
              original: p.image_urls?.original || p.image_urls?.large || '',
            }))
          : [
              {
                square_medium: ill.image_urls?.square_medium || '',
                thumb: ill.image_urls?.square_medium || ill.image_urls?.medium || '',
                regular: ill.image_urls?.large || ill.image_urls?.medium || '',
                large: ill.image_urls?.large || ill.image_urls?.medium || '',
                original: ill.meta_single_page?.original_image_url || ill.image_urls?.large || '',
              },
            ];
      return jsonResponse(
        {
          id: String(ill.id),
          title: ill.title || '',
          description: ill.caption || '',
          userName: ill.user?.name || '',
          userId: String(ill.user?.id || ''),
          width: ill.width || 0,
          height: ill.height || 0,
          pageCount: ill.page_count || pages.length || 1,
          illustType: typeMap[ill.type] ?? 0,
          isAi: ill.illust_ai_type === 2,
          bookmarkCount: ill.total_bookmarks || 0,
          viewCount: ill.total_view || 0,
          thumbUrl: ill.image_urls?.square_medium || ill.image_urls?.medium || '',
          regularUrl: ill.image_urls?.large || ill.image_urls?.medium || '',
          originalUrl: pages[0]?.original || '',
          tags,
          pages,
        },
        200,
        request
      );
    }

    return jsonResponse({ error: true, message: '无法读取作品详情' }, 404, request);
  }

  // 5B. Ugoira metadata (/api/pixiv/illust/ugoira?id=...)
  if (subPath === 'illust/ugoira') {
    const id = (url.searchParams.get('id') || '').trim();
    if (!id) return jsonResponse({ error: true, message: '缺少作品 ID' }, 400, request);
    const hibiMeta = await fetchJsonSafe(
      `${HIBI_BASE}/ugoira_metadata?id=${encodeURIComponent(id)}`,
      hibiHeaders()
    );
    if (hibiMeta?.ugoira_metadata) {
      return jsonResponse(
        {
          illustId: id,
          zipUrl: hibiMeta.ugoira_metadata.zip_urls?.medium || '',
          frames: [],
          framesMeta: hibiMeta.ugoira_metadata.frames || [],
        },
        200,
        request
      );
    }
    return jsonResponse({ error: true, message: '动图元数据暂不可用' }, 404, request);
  }

  // 6. Quick JSON search endpoint (/api/pixiv/search?q=... | ?tag=...)
  if (subPath === 'search') {
    const tag = (url.searchParams.get('q') || url.searchParams.get('tag') || '').trim();
    if (!tag) return jsonResponse({ error: true, message: '请输入标签' }, 400, request);
    const mode = url.searchParams.get('mode') || 'all';
    const s_mode = url.searchParams.get('s_mode') || 's_tag';
    const type = url.searchParams.get('type') || 'all';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || url.searchParams.get('p') || '1', 10) || 1);

    const translations = {};
    const artworks = [];
    const seen = new Set();

    const hibiSearchUrl = `${HIBI_BASE}/search?word=${encodeURIComponent(tag)}&mode=${encodeURIComponent(mapHibiSearchMode(s_mode))}&order=date_desc&page=${page}&size=30&include_translated_tag_results=true`;
    const hJson = await fetchJsonSafe(hibiSearchUrl, hibiHeaders());
    if (hJson && Array.isArray(hJson.illusts)) {
      for (const item of hJson.illusts) {
        const w = normalizeHibiIllust(item, translations);
        if (w && !seen.has(w.id) && matchesFilters(w, mode, type)) {
          seen.add(w.id);
          artworks.push(w);
        }
      }
    }
    return jsonResponse({ primaryTag: tag, count: artworks.length, artworks, translations }, 200, request);
  }

  // 7. Streaming Full-History Tag Co-Occurrence Analyzer (/api/pixiv/analyze-stream)
  if (subPath === 'analyze-stream') {
    const tag = (url.searchParams.get('tag') || url.searchParams.get('q') || '').trim();
    if (!tag) return jsonResponse({ error: true, message: '请输入标签' }, 400, request);
    const pagesParam = url.searchParams.get('pages') || '3';
    const requestedPages =
      String(pagesParam).toUpperCase() === 'ALL'
        ? 18
        : Math.min(20, Math.max(1, parseInt(pagesParam, 10) || 3));
    const mode = url.searchParams.get('mode') || 'all';
    const s_mode = url.searchParams.get('s_mode') || 's_tag';
    const type = url.searchParams.get('type') || 'all';
    const includePopular = url.searchParams.get('includePopular') !== '0' && url.searchParams.get('includePopular') !== 'false';

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event, payload) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));
        };

        try {
          const seenIds = new Set();
          const artworks = [];
          const translations = {};
          let pixivTotal = 0;
          let pagesScanned = 0;
          let engine = 'WEB-AJAX';

          sendEvent('progress', {
            currentPage: 1,
            totalPages: requestedPages,
            message: `正在连接 Pixiv 采样 [${tag}] 第 1 页...`,
          });

          // Probe direct Pixiv Web AJAX on page 1 (succeeds if not blocked by WAF)
          const firstDirectUrl = `https://www.pixiv.net/ajax/search/artworks/${encodeURIComponent(tag)}?word=${encodeURIComponent(tag)}&order=date_d&mode=${encodeURIComponent(mode)}&p=1&s_mode=${encodeURIComponent(s_mode)}&type=${encodeURIComponent(type)}&lang=zh`;
          const firstDirect = await fetchJsonSafe(firstDirectUrl, pixivHeaders(cookie));

          const ingestDirectBody = (body) => {
            let added = 0;
            const block = body.illustManga || body.illust || body.manga || {};
            const list = block.data || [];
            if (block.total && block.total > pixivTotal) pixivTotal = block.total;
            if (body.tagTranslation) {
              for (const [k, v] of Object.entries(body.tagTranslation)) {
                const tr = v.zh || v.zh_tw || v.en || '';
                if (tr) translations[k] = tr;
              }
            }
            for (const item of list) {
              if (!item || !item.id || item.isAdContainer) continue;
              const idStr = String(item.id);
              if (seenIds.has(idStr)) continue;
              seenIds.add(idStr);
              added++;
              const tags = Array.isArray(item.tags) ? item.tags.filter(Boolean) : [];
              artworks.push({
                id: idStr,
                title: item.title || '无题',
                tags,
                userId: String(item.userId || ''),
                userName: item.userName || '',
                thumbUrl: item.url || '',
                pageCount: Number(item.pageCount || 1),
                illustType: Number(item.illustType || 0),
                xRestrict: Number(item.xRestrict || 0),
                isAi: item.aiType === 2,
                bookmarkCount: Number(item.bookmarkCount || item.totalBookmarks || 0),
              });
            }
            return added;
          };

          if (firstDirect && !firstDirect.error && firstDirect.body) {
            pagesScanned = 1;
            ingestDirectBody(firstDirect.body);
            sendEvent('snapshot', { primaryTag: tag, pixivTotal, pagesScanned, engine, artworks, translations });

            const batchSize = 3;
            for (let startP = 2; startP <= requestedPages; startP += batchSize) {
              const endP = Math.min(requestedPages, startP + batchSize - 1);
              sendEvent('progress', {
                currentPage: startP,
                totalPages: requestedPages,
                message: `正在采样 [${tag}] 第 ${startP}~${endP} 页 (已采集 ${artworks.length} 作)...`,
              });
              const batchPromises = [];
              for (let p = startP; p <= endP; p++) {
                const apiUrl = `https://www.pixiv.net/ajax/search/artworks/${encodeURIComponent(tag)}?word=${encodeURIComponent(tag)}&order=date_d&mode=${encodeURIComponent(mode)}&p=${p}&s_mode=${encodeURIComponent(s_mode)}&type=${encodeURIComponent(type)}&lang=zh`;
                batchPromises.push(fetchJsonSafe(apiUrl, pixivHeaders(cookie)));
              }
              const results = await Promise.all(batchPromises);
              let addedInBatch = 0;
              for (const json of results) {
                if (!json || json.error || !json.body) continue;
                pagesScanned++;
                addedInBatch += ingestDirectBody(json.body);
              }
              sendEvent('snapshot', { primaryTag: tag, pixivTotal, pagesScanned, engine, artworks, translations });
              if (addedInBatch === 0 || (pixivTotal > 0 && artworks.length >= pixivTotal)) break;
            }
          } else {
            // Direct www.pixiv.net returned WAF HTML/403 from Cloudflare edge -> switch seamlessly to HibiAPI!
            engine = 'HIBI-APP-API';
            const hibiMode = mapHibiSearchMode(s_mode);
            // Each HibiAPI page has 30 illusts; cap total subrequests safely within CF Worker 50-subrequest limit
            const totalHibiPages = Math.min(24, requestedPages * 2);

            if (includePopular) {
              const popJson = await fetchJsonSafe(
                `${HIBI_BASE}/popular_preview?word=${encodeURIComponent(tag)}&mode=${encodeURIComponent(hibiMode)}&include_translated_tag_results=true`,
                hibiHeaders()
              );
              if (popJson && Array.isArray(popJson.illusts)) {
                for (const item of popJson.illusts) {
                  const w = normalizeHibiIllust(item, translations);
                  if (w && !seenIds.has(w.id) && matchesFilters(w, mode, type)) {
                    seenIds.add(w.id);
                    artworks.push(w);
                  }
                }
              }
            }

            const batchSize = 3;
            for (let startP = 1; startP <= totalHibiPages; startP += batchSize) {
              const endP = Math.min(totalHibiPages, startP + batchSize - 1);
              sendEvent('progress', {
                currentPage: Math.ceil(startP / 2),
                totalPages: Math.ceil(totalHibiPages / 2),
                message: `正在通过边缘网关采样 [${tag}] 第 ${startP}~${endP} 批 (已采集 ${artworks.length} 作)...`,
              });

              const batchPromises = [];
              for (let p = startP; p <= endP; p++) {
                const hUrl = `${HIBI_BASE}/search?word=${encodeURIComponent(tag)}&mode=${encodeURIComponent(hibiMode)}&order=date_desc&page=${p}&size=30&include_translated_tag_results=true`;
                batchPromises.push(fetchJsonSafe(hUrl, hibiHeaders()));
              }

              const results = await Promise.all(batchPromises);
              let rawCountInBatch = 0;
              for (const json of results) {
                if (!json || !Array.isArray(json.illusts)) continue;
                pagesScanned++;
                rawCountInBatch += json.illusts.length;
                for (const item of json.illusts) {
                  const w = normalizeHibiIllust(item, translations);
                  if (w && !seenIds.has(w.id) && matchesFilters(w, mode, type)) {
                    seenIds.add(w.id);
                    artworks.push(w);
                  }
                }
              }

              pixivTotal = Math.max(pixivTotal, artworks.length);
              sendEvent('snapshot', {
                primaryTag: tag,
                pixivTotal,
                pagesScanned,
                engine,
                artworks,
                translations,
              });

              if (rawCountInBatch === 0) break;
            }
          }

          sendEvent('complete', {
            primaryTag: tag,
            pixivTotal: Math.max(pixivTotal, artworks.length),
            pagesScanned,
            engine,
            artworks,
            translations,
          });
        } catch (err) {
          sendEvent('error', { message: err.message || '采样异常' });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        ...cors,
      },
    });
  }

  return jsonResponse({ error: true, message: 'Unknown PixEz API route' }, 404, request);
}
