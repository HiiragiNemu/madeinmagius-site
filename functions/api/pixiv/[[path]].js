// Serverless Cloudflare Pages Function for PixEz Pulse Web Terminal (/api/pixiv/*)
const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Pixiv-Cookie',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...CORS_HEADERS,
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
  if (cookie) h.Cookie = cookie;
  return h;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequest(context) {
  const { request } = context;
  if (request.method === 'OPTIONS') return onRequestOptions();

  const url = new URL(request.url);
  const subPath = url.pathname.replace(/^\/api\/pixiv\/?/, '');
  const cookie = request.headers.get('x-pixiv-cookie') || url.searchParams.get('cookie') || '';

  // 1. pximg Referer-bypass image proxy (/api/pixiv/pximg?url=...)
  if (subPath === 'pximg') {
    const imgUrl = url.searchParams.get('url');
    if (!imgUrl || !/^https:\/\/i\.pximg\.net\//i.test(imgUrl)) {
      return new Response('Invalid pximg URL', { status: 400, headers: CORS_HEADERS });
    }
    const upstream = await fetch(imgUrl, {
      headers: {
        'User-Agent': DEFAULT_UA,
        Referer: 'https://www.pixiv.net/',
      },
    });
    const headers = new Headers(CORS_HEADERS);
    headers.set('Content-Type', upstream.headers.get('Content-Type') || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=86400');
    return new Response(upstream.body, { status: upstream.status, headers });
  }

  // 2. Original artwork download proxy (/api/pixiv/download?url=...&filename=...)
  if (subPath === 'download') {
    const imgUrl = url.searchParams.get('url');
    const filename = url.searchParams.get('filename') || 'pixiv-artwork.jpg';
    if (!imgUrl || !/^https:\/\/i\.pximg\.net\//i.test(imgUrl)) {
      return new Response('Invalid pximg URL', { status: 400, headers: CORS_HEADERS });
    }
    const upstream = await fetch(imgUrl, {
      headers: {
        'User-Agent': DEFAULT_UA,
        Referer: 'https://www.pixiv.net/',
      },
    });
    const headers = new Headers(CORS_HEADERS);
    headers.set('Content-Type', upstream.headers.get('Content-Type') || 'application/octet-stream');
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    return new Response(upstream.body, { status: upstream.status, headers });
  }

  // 3. Autocomplete (/api/pixiv/autocomplete?keyword=...)
  if (subPath === 'autocomplete') {
    const kw = (url.searchParams.get('keyword') || '').trim();
    if (!kw) return jsonResponse({ candidates: [] });
    try {
      const r = await fetch(
        `https://www.pixiv.net/rpc/cps.php?keyword=${encodeURIComponent(kw)}&lang=zh`,
        { headers: pixivHeaders(cookie) }
      );
      const d = await r.json();
      return jsonResponse({ candidates: d.candidates || [] });
    } catch {
      return jsonResponse({ candidates: [] });
    }
  }

  // 4. Auth status & cookie verification
  if (subPath === 'auth/status') {
    return jsonResponse({
      loggedIn: Boolean(cookie),
      mode: cookie ? 'cookie' : 'guest',
      user: cookie ? { name: 'Pixiv 会话' } : null,
    });
  }
  if (subPath === 'auth/verify-cookie') {
    return jsonResponse({ ok: true, message: 'Cookie 已保存就绪' });
  }

  // 5. Artwork detail (/api/pixiv/illust/detail?id=...)
  if (subPath === 'illust/detail') {
    const id = url.searchParams.get('id');
    if (!id) return jsonResponse({ error: true, message: '缺少作品 ID' }, 400);
    try {
      const [infoRes, pagesRes] = await Promise.all([
        fetch(`https://www.pixiv.net/ajax/illust/${encodeURIComponent(id)}?lang=zh`, {
          headers: pixivHeaders(cookie),
        }),
        fetch(`https://www.pixiv.net/ajax/illust/${encodeURIComponent(id)}/pages?lang=zh`, {
          headers: pixivHeaders(cookie),
        }),
      ]);
      const infoJson = await infoRes.json();
      const pagesJson = await pagesRes.json();
      if (infoJson.error || !infoJson.body) {
        return jsonResponse({ error: true, message: infoJson.message || '无法读取作品详情' }, 404);
      }
      const b = infoJson.body;
      const tags = (b.tags?.tags || []).map((t) => t.tag).filter(Boolean);
      const pages = Array.isArray(pagesJson.body)
        ? pagesJson.body.map((p) => ({
            thumb: p.urls?.thumb_mini || p.urls?.small || '',
            regular: p.urls?.regular || '',
            large: p.urls?.regular || '',
            original: p.urls?.original || '',
          }))
        : [];
      return jsonResponse({
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
      });
    } catch (e) {
      return jsonResponse({ error: true, message: e.message }, 500);
    }
  }

  // 6. Streaming Full-History Tag Co-Occurrence Analyzer (/api/pixiv/analyze-stream)
  if (subPath === 'analyze-stream') {
    const tag = (url.searchParams.get('tag') || '').trim();
    if (!tag) return jsonResponse({ error: true, message: '请输入标签' }, 400);
    const pagesParam = url.searchParams.get('pages') || '3';
    const maxPages =
      String(pagesParam).toUpperCase() === 'ALL'
        ? 60
        : Math.min(60, Math.max(1, parseInt(pagesParam, 10) || 3));
    const mode = url.searchParams.get('mode') || 'all';
    const s_mode = url.searchParams.get('s_mode') || 's_tag';
    const type = url.searchParams.get('type') || 'all';

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

          const batchSize = 3;
          for (let startP = 1; startP <= maxPages; startP += batchSize) {
            const endP = Math.min(maxPages, startP + batchSize - 1);
            sendEvent('progress', {
              currentPage: startP,
              totalPages: maxPages,
              message: `正在采样 [${tag}] 第 ${startP}~${endP} 页 (已采集 ${artworks.length} 作)...`,
            });

            const batchPromises = [];
            for (let p = startP; p <= endP; p++) {
              const apiUrl = `https://www.pixiv.net/ajax/search/artworks/${encodeURIComponent(tag)}?word=${encodeURIComponent(tag)}&order=date_d&mode=${mode}&p=${p}&s_mode=${s_mode}&type=${type}&lang=zh`;
              batchPromises.push(
                fetch(apiUrl, { headers: pixivHeaders(cookie) })
                  .then((r) => r.json())
                  .catch(() => null)
              );
            }

            const results = await Promise.all(batchPromises);
            let addedInBatch = 0;

            for (const json of results) {
              if (!json || json.error || !json.body) continue;
              pagesScanned++;
              const body = json.body;
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
                addedInBatch++;

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
            }

            sendEvent('snapshot', {
              primaryTag: tag,
              pixivTotal,
              pagesScanned,
              artworks,
              translations,
            });

            if (addedInBatch === 0 || (pixivTotal > 0 && artworks.length >= pixivTotal)) {
              break;
            }
          }

          sendEvent('complete', {
            primaryTag: tag,
            pixivTotal,
            pagesScanned,
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
        ...CORS_HEADERS,
      },
    });
  }

  return jsonResponse({ error: true, message: 'Unknown PixEz API route' }, 404);
}
