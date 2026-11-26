// Serverless Cloudflare Pages Function for PixEz Pulse Web Terminal (/api/pixiv/*)
// v4.3: Multi-Site (Pixiv + Danbooru + Sankaku + Safebooru + Yande.re + Konachan + Zerochan + Rule34),
// Pre-flight /tag-info total count, Multi-chunk pagination past 750 works, and live /danbooru/enrich.

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const BOORU_UA = 'PixEzPulse/4.5 (MultiBooruTagAnalyzer; MadeInMagius)';
const ZEROCHAN_UA = 'PixEzPulse - MadeInMagius';
const HIBI_BASE = 'https://hibiapi.getloli.com/api/pixiv';
const PIXIV_WEB_ORIGINS = ['https://www.pixiv.net', 'https://pixiv.js.org'];
const PIXIVIZ_APP_API = 'https://pixiviz-api-rn.pwp.link/v1';

const ALLOWED_IMAGE_HOST_RE =
  /^https:\/\/(i\.pximg\.net|s\.pximg\.net|cdn\.donmai\.us|v\.sankakucomplex\.com|s\.sankakucomplex\.com|cs\.sankakucomplex\.com|safebooru\.org|files\.yande\.re|assets\.yande\.re|konachan\.com|konachan\.net|s[0-9]*\.zerochan\.net|static\.zerochan\.net|api-cdn\.rule34\.xxx|us\.rule34\.xxx|wimg\.rule34\.xxx)\//i;

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
    'Access-Control-Allow-Headers': 'Content-Type, X-Pixiv-Cookie, X-Pixiv-Token, X-R34-Key, X-R34-Uid',
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

function refererForImageUrl(url) {
  if (/pximg\.net/i.test(url)) return 'https://www.pixiv.net/';
  if (/donmai\.us/i.test(url)) return 'https://danbooru.donmai.us/';
  if (/sankakucomplex\.com/i.test(url)) return 'https://beta.sankakucomplex.com/';
  if (/zerochan\.net/i.test(url)) return 'https://www.zerochan.net/';
  if (/yande\.re/i.test(url)) return 'https://yande.re/';
  if (/konachan\.(com|net)/i.test(url)) return 'https://konachan.com/';
  if (/safebooru\.org/i.test(url)) return 'https://safebooru.org/';
  if (/rule34\.xxx/i.test(url)) return 'https://rule34.xxx/';
  return '';
}

async function fetchJsonSafe(url, headers = {}, timeoutMs = 5500) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal });
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!res.ok) return null;
    if (ct.includes('json')) return await res.json();
    const txt = await res.text();
    try {
      return JSON.parse(txt);
    } catch {
      return null;
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchTextSafe(url, headers = {}, timeoutMs = 5500) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } catch {
    return { ok: false, status: 0, text: '' };
  } finally {
    clearTimeout(timer);
  }
}

// Race official www.pixiv.net and live PixivNow mirror (pixiv.js.org) in parallel.
// Returns { origin, data } for the first valid non-error Pixiv Web AJAX JSON response.
async function fetchPixivWebAjaxRace(pathAndQuery, cookie = '', preferredOrigin = '', timeoutMs = 5500) {
  if (preferredOrigin) {
    const headers = preferredOrigin.includes('www.pixiv.net')
      ? pixivHeaders(cookie)
      : { 'User-Agent': DEFAULT_UA, Accept: 'application/json', 'Accept-Language': 'zh-CN,zh;q=0.9,ja;q=0.8' };
    const data = await fetchJsonSafe(`${preferredOrigin}${pathAndQuery}`, headers, timeoutMs);
    if (data && !data.error && (data.body || Array.isArray(data.candidates))) {
      return { origin: preferredOrigin, data };
    }
  }
  const origins = preferredOrigin
    ? PIXIV_WEB_ORIGINS.filter((o) => o !== preferredOrigin)
    : PIXIV_WEB_ORIGINS;
  const racers = origins.map(async (origin) => {
    const headers = origin.includes('www.pixiv.net')
      ? pixivHeaders(cookie)
      : { 'User-Agent': DEFAULT_UA, Accept: 'application/json', 'Accept-Language': 'zh-CN,zh;q=0.9,ja;q=0.8' };
    const data = await fetchJsonSafe(`${origin}${pathAndQuery}`, headers, timeoutMs);
    if (data && !data.error && (data.body || Array.isArray(data.candidates))) {
      return { origin, data };
    }
    throw new Error(`upstream ${origin} invalid`);
  });
  try {
    return await Promise.any(racers);
  } catch {
    return null;
  }
}

// Pixiv path segment: '/' inside tags (Fate/GrandOrder) must be double-encoded or mirrors 404.
function pixivPathTag(tag) {
  return encodeURIComponent(tag).replace(/%2F/gi, '%252F');
}

async function fetchAppApiFallbackSearch({ word, mode = 'partial_match_for_tags', order = 'date_desc', page = 1 }) {
  // Prefer HibiAPI (its account returns R-18 + AI with search_ai_type=0); Pixiviz relay has neither, so it is only a last resort.
  const pixivizPromise = fetchJsonSafe(
    `${PIXIVIZ_APP_API}/illust/search?word=${encodeURIComponent(word)}&page=${page}`,
    { 'User-Agent': DEFAULT_UA, Accept: 'application/json', Referer: 'https://pixiviz.pwp.app/' },
    4500
  );
  const hibi = await fetchJsonSafe(
    `${HIBI_BASE}/search?word=${encodeURIComponent(word)}&mode=${encodeURIComponent(mode)}&order=${encodeURIComponent(order)}&search_ai_type=0&page=${page}&size=30&include_translated_tag_results=true`,
    hibiHeaders(),
    8000
  );
  if (hibi && Array.isArray(hibi.illusts) && hibi.illusts.length > 0) return { engine: 'HIBI-APP-API', data: hibi };
  const pv = await pixivizPromise;
  if (pv && Array.isArray(pv.illusts) && pv.illusts.length > 0) return { engine: 'PIXIVIZ-RELAY', data: pv };
  return null;
}

async function fetchAppApiFallbackSearchLegacyRace({ word, mode = 'partial_match_for_tags', order = 'date_desc', page = 1 }) {
  // Race fast Pixiviz relay + HibiAPI (both with tight 4.5s timeout so Workers never stall!)
  const racers = [
    fetchJsonSafe(
      `${PIXIVIZ_APP_API}/illust/search?word=${encodeURIComponent(word)}&page=${page}`,
      { 'User-Agent': DEFAULT_UA, Accept: 'application/json', Referer: 'https://pixiviz.pwp.app/' },
      4500
    ).then((d) => {
      if (d && Array.isArray(d.illusts) && d.illusts.length > 0) return { engine: 'PIXIVIZ-RELAY', data: d };
      throw new Error('pixiviz empty');
    }),
    fetchJsonSafe(
      `${HIBI_BASE}/search?word=${encodeURIComponent(word)}&mode=${encodeURIComponent(mode)}&order=${encodeURIComponent(order)}&search_ai_type=0&page=${page}&size=30&include_translated_tag_results=true`,
      hibiHeaders(),
      4200
    ).then((d) => {
      if (d && Array.isArray(d.illusts) && d.illusts.length > 0) return { engine: 'HIBI-APP-API', data: d };
      throw new Error('hibi empty');
    }),
  ];
  try {
    return await Promise.any(racers);
  } catch {
    return null;
  }
}

async function fetchImageWithFallback(imgUrl) {
  const h = { 'User-Agent': DEFAULT_UA };
  const ref = refererForImageUrl(imgUrl);
  if (ref) h.Referer = ref;
  const upstream = await fetch(imgUrl, { headers: h }).catch(() => null);
  if (upstream && upstream.ok) return upstream;

  if (/^https:\/\/i\.pximg\.net\//i.test(imgUrl)) {
    const mirrorUrl = imgUrl.replace(/^https:\/\/i\.pximg\.net\//i, 'https://i.pixiv.re/');
    const mirrorRes = await fetch(mirrorUrl, { headers: { 'User-Agent': DEFAULT_UA } }).catch(() => null);
    if (mirrorRes && mirrorRes.ok) return mirrorRes;
  }
  return upstream;
}

function mapBooruCatCode(code) {
  const n = Number(code);
  if (n === 4) return 'character';
  if (n === 3) return 'series_ip';
  if (n === 1 || n === 5 || n === 8 || n === 9) return 'meta_general';
  return 'attribute_xp';
}

function mapRatingToXRestrict(rating) {
  const r = String(rating || '').toLowerCase();
  if (r === 'e' || r === 'explicit') return 1;
  return 0;
}

function matchesBooruAgeMode(xRestrict, rating, mode) {
  const r = String(rating || '').toLowerCase();
  if (mode === 'safe') return xRestrict === 0 && r !== 'e' && r !== 'explicit' && r !== 'q' && r !== 'questionable';
  if (mode === 'r18') return xRestrict > 0 || r === 'e' || r === 'explicit';
  return true;
}

function parseZerochanJson(rawText) {
  if (!rawText) return null;
  let cleaned = rawText.trim();
  if (cleaned.startsWith('{ {')) cleaned = cleaned.slice(2).trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const idx = cleaned.indexOf('{"items"');
    if (idx >= 0) {
      try {
        return JSON.parse(cleaned.slice(idx));
      } catch {}
    }
    return null;
  }
}

function parseSourceUrlInput(source, rawInput) {
  const trimmed = String(rawInput || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      const q = u.searchParams.get('tags') || u.searchParams.get('q') || u.searchParams.get('search[name_matches]');
      if (q) return q.trim();
      if (/zerochan\.net/i.test(u.hostname)) {
        const seg = u.pathname.replace(/^\/+|\/+$/g, '').split('/')[0];
        if (seg) return decodeURIComponent(seg.replace(/\+/g, ' '));
      }
      if (/danbooru\.donmai\.us/i.test(u.hostname) && u.pathname.startsWith('/artists')) {
        const nameParam = u.searchParams.get('search[any_name_matches]') || u.searchParams.get('search[name_matches]');
        if (nameParam) return nameParam.trim();
      }
    } catch {}
  }
  return trimmed;
}

async function resolveNonAsciiToBooruTag(rawTag) {
  const t = String(rawTag || '').trim();
  if (!t || /^[\x00-\x7F]+$/.test(t)) {
    return { tag: t.replace(/\s+/g, '_'), original: t, resolvedFromCjk: false };
  }
  const items = await fetchJsonSafe(
    `https://danbooru.donmai.us/wiki_pages.json?search[other_names_match]=${encodeURIComponent(t)}&limit=5&only=title,other_names,tag[name,category,post_count]`,
    { 'User-Agent': BOORU_UA, Accept: 'application/json' }
  );
  if (Array.isArray(items) && items.length > 0) {
    const sorted = items
      .filter((x) => x && x.title)
      .sort((a, b) => Number(b.tag?.post_count || 0) - Number(a.tag?.post_count || 0));
    if (sorted[0]?.title) {
      return { tag: sorted[0].title, original: t, resolvedFromCjk: true };
    }
  }
  return { tag: t, original: t, resolvedFromCjk: false };
}

async function batchEnrichWithDanbooru(tagsList) {
  const cleanTags = [];
  for (const raw of Array.isArray(tagsList) ? tagsList : []) {
    const t = String(raw || '').trim();
    if (!t || /\d+users入り$/i.test(t) || /\s/.test(t)) continue;
    if (!cleanTags.includes(t)) cleanTags.push(t);
  }
  const toQuery = cleanTags.slice(0, 60);
  const out = {};
  const CHUNK = 20;
  for (let i = 0; i < toQuery.length; i += CHUNK) {
    const chunk = toQuery.slice(i, i + CHUNK);
    const params = new URLSearchParams({
      'search[other_names_include_any]': chunk.join(' '),
      limit: '100',
      only: 'title,other_names,tag[name,category,post_count]',
    });
    const items = await fetchJsonSafe(`https://danbooru.donmai.us/wiki_pages.json?${params.toString()}`, {
      'User-Agent': BOORU_UA,
      Accept: 'application/json',
    });
    if (!Array.isArray(items)) continue;
    for (const pixTag of chunk) {
      const lowerPix = pixTag.toLowerCase();
      let best = null;
      for (const item of items) {
        const others = Array.isArray(item.other_names) ? item.other_names : [];
        const matchOther = others.some((n) => String(n).toLowerCase() === lowerPix);
        const matchTitle = String(item.title || '').toLowerCase() === lowerPix;
        if (matchOther || matchTitle) {
          const pc = Number(item.tag?.post_count || 0);
          if (!best || pc > best.postCount) {
            best = {
              danbooruTag: item.title || item.tag?.name || '',
              category: mapBooruCatCode(item.tag?.category ?? 0),
              postCount: pc,
            };
          }
        }
      }
      if (best && best.danbooruTag) {
        out[pixTag] = best;
      }
    }
  }
  return out;
}

async function fetchBooruAutocomplete(source, kw) {
  const bh = { 'User-Agent': BOORU_UA, Accept: 'application/json' };
  if (source === 'danbooru') {
    const out = [];
    if (/[^\x00-\x7F]/.test(kw)) {
      const [wiki, artists] = await Promise.all([
        fetchJsonSafe(
          `https://danbooru.donmai.us/wiki_pages.json?search[other_names_match]=${encodeURIComponent(kw + '*')}&limit=8&only=title,other_names,tag[name,category,post_count]`,
          bh
        ),
        fetchJsonSafe(
          `https://danbooru.donmai.us/artists.json?search[any_name_matches]=${encodeURIComponent(kw + '*')}&limit=5`,
          bh
        ),
      ]);
      if (Array.isArray(wiki)) {
        for (const w of wiki) {
          if (!w?.title) continue;
          const alias = Array.isArray(w.other_names) ? w.other_names.find((n) => /[^\x00-\x7F]/.test(n)) || '' : '';
          out.push({
            tag_name: w.title,
            tag_translation: alias || w.title.replace(/_/g, ' '),
            access_count: Number(w.tag?.post_count || 0),
            category: mapBooruCatCode(w.tag?.category ?? 0),
            type: 'danbooru_wiki',
          });
        }
      }
      if (Array.isArray(artists)) {
        for (const a of artists) {
          if (!a?.name || out.some((x) => x.tag_name === a.name)) continue;
          out.push({
            tag_name: a.name,
            tag_translation: `画师: ${(a.other_names || []).slice(0, 2).join(' / ') || a.name}`,
            access_count: 0,
            category: 'meta_general',
            type: 'danbooru_artist',
          });
        }
      }
      if (out.length > 0) return out.slice(0, 12);
    }
    const list = await fetchJsonSafe(
      `https://danbooru.donmai.us/autocomplete.json?search[query]=${encodeURIComponent(kw)}&search[type]=tag_query&limit=12`,
      bh
    );
    if (!Array.isArray(list)) return [];
    return list
      .filter((x) => x && x.value)
      .map((x) => ({
        tag_name: x.value,
        tag_translation: x.antecedent ? `${x.label} (${x.antecedent})` : x.label || '',
        access_count: Number(x.post_count || 0),
        category: mapBooruCatCode(x.category ?? 0),
        type: 'danbooru',
      }));
  }
  if (source === 'sankaku') {
    const list = await fetchJsonSafe(
      `https://sankakuapi.com/tags/autosuggestCreating?tag=${encodeURIComponent(kw)}`,
      { 'User-Agent': BOORU_UA, Accept: 'application/vnd.sankaku.api+json;v=2' }
    );
    if (!Array.isArray(list)) return [];
    return list
      .slice(0, 12)
      .map((t) => ({
        tag_name: t.tagName || t.name || '',
        tag_translation: t.name_ja || t.name_en || '',
        access_count: Number(t.post_count || t.count || 0),
        category: mapBooruCatCode(t.type ?? 0),
        type: 'sankaku',
      }))
      .filter((c) => c.tag_name);
  }
  if (source === 'safebooru') {
    const list = await fetchJsonSafe(`https://safebooru.org/autocomplete.php?q=${encodeURIComponent(kw)}`, bh);
    if (!Array.isArray(list)) return [];
    return list
      .slice(0, 12)
      .map((item) => {
        const m = String(item.label || '').match(/\((\d+)\)\s*$/);
        return { tag_name: item.value || '', tag_translation: '', access_count: m ? Number(m[1]) : 0, type: 'safebooru' };
      })
      .filter((c) => c.tag_name);
  }
  if (source === 'yandere' || source === 'konachan') {
    const host = source === 'yandere' ? 'yande.re' : 'konachan.com';
    const list = await fetchJsonSafe(`https://${host}/tag.json?name=${encodeURIComponent(kw)}&order=count&limit=12`, bh);
    if (!Array.isArray(list)) return [];
    return list
      .map((t) => ({
        tag_name: t.name || '',
        tag_translation: '',
        access_count: Number(t.count || 0),
        category: mapBooruCatCode(t.type ?? 0),
        type: source,
      }))
      .filter((c) => c.tag_name);
  }
  if (source === 'rule34') {
    const list = await fetchJsonSafe(`https://ac.rule34.xxx/autocomplete.php?q=${encodeURIComponent(kw)}`, bh);
    if (!Array.isArray(list)) return [];
    return list
      .slice(0, 12)
      .map((item) => {
        const m = String(item.label || '').match(/\((\d+)\)\s*$/);
        return {
          tag_name: item.value || '',
          tag_translation: item.type || '',
          access_count: m ? Number(m[1]) : 0,
          type: 'rule34',
        };
      })
      .filter((c) => c.tag_name);
  }
  if (source === 'zerochan') {
    const list = await fetchJsonSafe(
      `https://danbooru.donmai.us/autocomplete.json?search[query]=${encodeURIComponent(kw)}&search[type]=tag_query&limit=10`,
      bh
    );
    if (!Array.isArray(list)) return [];
    return list
      .map((x) => ({
        tag_name: (x.label || x.value || '').replace(/_/g, ' '),
        tag_translation: x.value || '',
        access_count: Number(x.post_count || 0),
        type: 'zerochan',
      }))
      .filter((c) => c.tag_name);
  }
  return [];
}

async function fetchBooruTagInfo({ source, tag: rawTag, mode = 'all', r34Key = '', r34Uid = '' }) {
  const cleaned = parseSourceUrlInput(source, rawTag);
  if (!cleaned) return { error: true, message: '请输入标签' };
  const bh = { 'User-Agent': BOORU_UA, Accept: 'application/json' };

  if (source === 'danbooru') {
    const resolved = await resolveNonAsciiToBooruTag(cleaned);
    let queryTag = resolved.tag;
    if (mode === 'safe' && !/rating:/i.test(queryTag)) queryTag += ' rating:g';
    else if (mode === 'r18' && !/rating:/i.test(queryTag)) queryTag += ' rating:e';
    const d = await fetchJsonSafe(`https://danbooru.donmai.us/counts/posts.json?tags=${encodeURIComponent(queryTag)}`, bh);
    const totalPosts = Number(d?.counts?.posts || 0);
    return {
      error: false,
      source: 'danbooru',
      resolvedTag: resolved.tag,
      resolvedFromCjk: resolved.resolvedFromCjk,
      totalPosts,
      pageSize: 100,
      estimatedPages: totalPosts > 0 ? Math.ceil(totalPosts / 100) : 0,
      apiCeilingWorks: 100000,
      note: resolved.resolvedFromCjk
        ? `已通过 Danbooru Wiki 自动将 [${cleaned}] 映射为 [${resolved.tag}]；全站共 ${totalPosts.toLocaleString()} 件作品（每页 100 件，官方原生角色/作品/属性/画师分类）`
        : `Danbooru 全站共 ${totalPosts.toLocaleString()} 件作品（每页 100 件，官方原生角色/作品/属性/画师分类）`,
    };
  }
  if (source === 'sankaku') {
    const resolved = await resolveNonAsciiToBooruTag(cleaned);
    const list = await fetchJsonSafe(
      `https://sankakuapi.com/tags/autosuggestCreating?tag=${encodeURIComponent(resolved.tag)}`,
      { 'User-Agent': BOORU_UA, Accept: 'application/vnd.sankaku.api+json;v=2' }
    );
    let totalPosts = 0;
    if (Array.isArray(list)) {
      const exact = list.find((x) => String(x.tagName || x.name || '').toLowerCase() === resolved.tag.toLowerCase()) || list[0];
      totalPosts = Number(exact?.post_count || exact?.count || 0);
    }
    return {
      error: false,
      source: 'sankaku',
      resolvedTag: resolved.tag,
      resolvedFromCjk: resolved.resolvedFromCjk,
      totalPosts,
      pageSize: 40,
      estimatedPages: totalPosts > 0 ? Math.ceil(totalPosts / 40) : 0,
      apiCeilingWorks: 20000,
      note: `Sankaku Complex 全站约 ${totalPosts.toLocaleString()} 件作品（每页 40 件，原生双语分类与 Keyset 深度翻页）`,
    };
  }
  if (source === 'safebooru') {
    const resolved = await resolveNonAsciiToBooruTag(cleaned);
    const r = await fetchTextSafe(
      `https://safebooru.org/index.php?page=dapi&s=post&q=index&limit=1&tags=${encodeURIComponent(resolved.tag)}`,
      { 'User-Agent': BOORU_UA }
    );
    const m = r.text.match(/count="(\d+)"/i);
    const totalPosts = m ? Number(m[1]) : 0;
    return {
      error: false,
      source: 'safebooru',
      resolvedTag: resolved.tag,
      resolvedFromCjk: resolved.resolvedFromCjk,
      totalPosts,
      pageSize: 100,
      estimatedPages: totalPosts > 0 ? Math.ceil(totalPosts / 100) : 0,
      apiCeilingWorks: 20000,
      note: `Safebooru 全站共 ${totalPosts.toLocaleString()} 件全年龄作品（每页 100 件）`,
    };
  }
  if (source === 'yandere' || source === 'konachan') {
    const host = source === 'yandere' ? 'yande.re' : 'konachan.com';
    const label = source === 'yandere' ? 'Yande.re' : 'Konachan';
    const resolved = await resolveNonAsciiToBooruTag(cleaned);
    const r = await fetchTextSafe(`https://${host}/post/index.xml?tags=${encodeURIComponent(resolved.tag)}&limit=1`, {
      'User-Agent': BOORU_UA,
    });
    const m = r.text.match(/count="(\d+)"/i);
    const totalPosts = m ? Number(m[1]) : 0;
    return {
      error: false,
      source,
      resolvedTag: resolved.tag,
      resolvedFromCjk: resolved.resolvedFromCjk,
      totalPosts,
      pageSize: 100,
      estimatedPages: totalPosts > 0 ? Math.ceil(totalPosts / 100) : 0,
      apiCeilingWorks: 50000,
      note: `${label} 全站共 ${totalPosts.toLocaleString()} 件作品（每页 100 件）`,
    };
  }
  if (source === 'zerochan') {
    const zTag = cleaned.replace(/_/g, ' ');
    const r = await fetchTextSafe(`https://www.zerochan.net/${encodeURIComponent(zTag)}?json&l=1&p=1`, {
      'User-Agent': ZEROCHAN_UA,
    });
    const parsed = parseZerochanJson(r.text);
    const hasItems = Boolean(parsed && Array.isArray(parsed.items) && parsed.items.length > 0);
    return {
      error: false,
      source: 'zerochan',
      resolvedTag: zTag,
      totalPosts: 0,
      pageSize: 50,
      estimatedPages: 0,
      apiCeilingWorks: 5000,
      note: hasItems
        ? `Zerochan 已连接 [${zTag}]（接口不返回总件数，将按每页 50 件持续翻页直到末页）`
        : `Zerochan 暂未找到 [${zTag}] 的条目，建议输入英文规范名（如 Original）`,
    };
  }
  if (source === 'rule34') {
    const resolved = await resolveNonAsciiToBooruTag(cleaned);
    if (!r34Key || !r34Uid) {
      return {
        error: true,
        source: 'rule34',
        resolvedTag: resolved.tag,
        needsAuth: true,
        message: 'Rule34 官方 API 现已要求免费 api_key 与 user_id（请在「账号」弹窗高级设置中填入）。',
      };
    }
    const r = await fetchTextSafe(
      `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&limit=1&tags=${encodeURIComponent(resolved.tag)}&api_key=${encodeURIComponent(r34Key)}&user_id=${encodeURIComponent(r34Uid)}`,
      { 'User-Agent': BOORU_UA }
    );
    const m = r.text.match(/count="(\d+)"/i);
    const totalPosts = m ? Number(m[1]) : 0;
    return {
      error: false,
      source: 'rule34',
      resolvedTag: resolved.tag,
      totalPosts,
      pageSize: 100,
      estimatedPages: totalPosts > 0 ? Math.ceil(totalPosts / 100) : 0,
      apiCeilingWorks: 20000,
      note: `Rule34 全站共 ${totalPosts.toLocaleString()} 件作品（每页 100 件）`,
    };
  }
  return { error: true, message: `未知数据源: ${source}` };
}

async function fetchBooruChunk({ source, tag: rawTag, startPage = 1, chunkPages = 10, cursor = '', mode = 'all', order = 'date_d', r34Key = '', r34Uid = '', onProgress }) {
  const cleaned = parseSourceUrlInput(source, rawTag);
  const resolved = source === 'zerochan' ? { tag: cleaned.replace(/_/g, ' '), resolvedFromCjk: false } : await resolveNonAsciiToBooruTag(cleaned);
  const queryTag = resolved.tag;
  const bh = { 'User-Agent': BOORU_UA, Accept: 'application/json' };

  const artworks = [];
  const seenIds = new Set();
  const nativeTagCategories = {};
  const translations = {};
  let totalPosts = 0;
  let pagesScanned = 0;
  let hasMore = false;
  let nextPage = startPage;
  let nextCursor = '';

  if (source === 'danbooru') {
    let apiTags = queryTag;
    if (mode === 'safe' && !/rating:/i.test(apiTags)) apiTags += ' rating:g';
    else if (mode === 'r18' && !/rating:/i.test(apiTags)) apiTags += ' rating:e';
    const countTags = apiTags;
    if (order === 'popular_d' && !/order:/i.test(apiTags)) apiTags += ' order:favcount';
    else if (order === 'date' && !/order:/i.test(apiTags)) apiTags += ' order:id_asc';

    if (startPage === 1) {
      const cnt = await fetchJsonSafe(`https://danbooru.donmai.us/counts/posts.json?tags=${encodeURIComponent(countTags)}`, bh);
      totalPosts = Number(cnt?.counts?.posts || 0);
    }

    const batchSize = 3;
    let reachedEnd = false;
    for (let offset = 0; offset < chunkPages && !reachedEnd; offset += batchSize) {
      const batch = [];
      for (let k = 0; k < batchSize && offset + k < chunkPages; k++) batch.push(startPage + offset + k);
      onProgress?.({ currentPage: batch[0], sampledInChunk: artworks.length, totalPosts });
      const results = await Promise.all(
        batch.map((p) =>
          fetchJsonSafe(`https://danbooru.donmai.us/posts.json?tags=${encodeURIComponent(apiTags)}&limit=100&page=${p}`, bh).then((data) => ({ p, data }))
        )
      );
      for (const { p, data } of results) {
        if (!Array.isArray(data) || data.length === 0) {
          reachedEnd = true;
          continue;
        }
        pagesScanned++;
        nextPage = Math.max(nextPage, p + 1);
        for (const item of data) {
          if (!item || !item.id) continue;
          const id = String(item.id);
          if (seenIds.has(id)) continue;
          seenIds.add(id);
          const charTags = String(item.tag_string_character || '').split(/\s+/).filter(Boolean);
          const copyTags = String(item.tag_string_copyright || '').split(/\s+/).filter(Boolean);
          const genTags = String(item.tag_string_general || '').split(/\s+/).filter(Boolean);
          const artistTags = String(item.tag_string_artist || '').split(/\s+/).filter(Boolean);
          const metaTags = String(item.tag_string_meta || '').split(/\s+/).filter(Boolean);
          for (const t of charTags) nativeTagCategories[t] = 'character';
          for (const t of copyTags) nativeTagCategories[t] = 'series_ip';
          for (const t of genTags) if (!nativeTagCategories[t]) nativeTagCategories[t] = 'attribute_xp';
          for (const t of artistTags) nativeTagCategories[t] = 'meta_general';
          for (const t of metaTags) nativeTagCategories[t] = 'meta_general';
          const allTags = [...new Set([...charTags, ...copyTags, ...genTags, ...artistTags, ...metaTags])];
          const thumb = item.preview_file_url || item.large_file_url || item.file_url || '';
          artworks.push({
            id: `db_${id}`,
            externalId: id,
            source: 'danbooru',
            externalUrl: `https://danbooru.donmai.us/posts/${id}`,
            title: charTags[0] ? charTags[0].replace(/_/g, ' ') : `Danbooru #${id}`,
            tags: allTags,
            userId: artistTags[0] || String(item.uploader_id || ''),
            userName: artistTags.join(', ') || `Uploader #${item.uploader_id || ''}`,
            thumbUrl: thumb,
            regularUrl: item.large_file_url || item.file_url || thumb,
            originalUrl: item.file_url || item.large_file_url || thumb,
            pageCount: 1,
            illustType: item.file_ext === 'mp4' || item.file_ext === 'webm' ? 2 : 0,
            xRestrict: mapRatingToXRestrict(item.rating),
            isAi: allTags.some((t) => /^ai[-_]?generated$/i.test(t)),
            bookmarkCount: Number(item.fav_count || item.score || 0),
          });
        }
        if (data.length < 95) reachedEnd = true;
      }
    }
    hasMore = !reachedEnd && nextPage <= 1000 && (totalPosts === 0 || (nextPage - 1) * 100 < totalPosts);
  } else if (source === 'sankaku') {
    let skTags = queryTag;
    if (order === 'popular_d' && !/order:/i.test(skTags)) skTags += ' order:popular';
    else if (order === 'date' && !/order:/i.test(skTags)) skTags += ' order:id_asc';
    let cur = cursor;
    let reachedEnd = false;
    for (let i = 0; i < chunkPages && !reachedEnd; i++) {
      const pNum = startPage + i;
      onProgress?.({ currentPage: pNum, sampledInChunk: artworks.length, totalPosts });
      const apiUrl = cur
        ? `https://sankakuapi.com/posts/keyset?tags=${encodeURIComponent(skTags)}&limit=40&next=${encodeURIComponent(cur)}`
        : `https://sankakuapi.com/posts/keyset?tags=${encodeURIComponent(skTags)}&limit=40`;
      const data = await fetchJsonSafe(apiUrl, { 'User-Agent': BOORU_UA, Accept: 'application/vnd.sankaku.api+json;v=2' });
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : null;
      if (!list || list.length === 0) {
        reachedEnd = true;
        break;
      }
      pagesScanned++;
      nextPage = pNum + 1;
      cur = data?.meta?.next || '';
      nextCursor = cur;
      for (const item of list) {
        if (!item || !item.id) continue;
        const id = String(item.id);
        if (seenIds.has(id)) continue;
        const xRestrict = mapRatingToXRestrict(item.rating);
        if (!matchesBooruAgeMode(xRestrict, item.rating, mode)) continue;
        seenIds.add(id);
        const tags = [];
        let artistName = item.author?.name || '';
        if (Array.isArray(item.tags)) {
          for (const tObj of item.tags) {
            const tName = tObj?.tagName || tObj?.name || '';
            if (!tName) continue;
            tags.push(tName);
            nativeTagCategories[tName] = mapBooruCatCode(tObj.type ?? 0);
            if (tObj.name_ja && tObj.name_ja !== tName) translations[tName] = tObj.name_ja;
            else if (tObj.name_en && tObj.name_en !== tName) translations[tName] = tObj.name_en;
            if (Number(tObj.type) === 1 && !artistName) artistName = tObj.name_en || tName;
          }
        }
        artworks.push({
          id: `sk_${id}`,
          externalId: id,
          source: 'sankaku',
          externalUrl: `https://beta.sankakucomplex.com/post/show/${id}`,
          title: `Sankaku #${id}`,
          tags,
          userId: String(item.author?.id || ''),
          userName: artistName || 'Sankaku',
          thumbUrl: item.preview_url || item.sample_url || '',
          regularUrl: item.sample_url || item.file_url || item.preview_url || '',
          originalUrl: item.file_url || item.sample_url || '',
          pageCount: 1,
          illustType: String(item.file_type || '').startsWith('video/') ? 2 : 0,
          xRestrict,
          isAi: Boolean(item.has_ai_derivatives) || tags.some((t) => /ai_generated|novelai|stable_diffusion/i.test(t)),
          bookmarkCount: Number(item.fav_count || item.total_score || 0),
        });
      }
      if (!cur) reachedEnd = true;
    }
    hasMore = !reachedEnd && Boolean(nextCursor);
  } else if (source === 'safebooru' || source === 'rule34') {
    if (source === 'rule34' && (!r34Key || !r34Uid)) {
      throw new Error('Rule34 需要提供免费的 api_key 与 user_id');
    }
    const base = source === 'safebooru' ? 'https://safebooru.org' : 'https://api.rule34.xxx';
    const authQ = source === 'rule34' ? `&api_key=${encodeURIComponent(r34Key)}&user_id=${encodeURIComponent(r34Uid)}` : '';
    let gelTags = queryTag;
    if (order === 'popular_d' && !/sort:/i.test(gelTags)) gelTags += ' sort:score:desc';
    else if (order === 'date' && !/sort:/i.test(gelTags)) gelTags += ' sort:id:asc';
    if (startPage === 1) {
      const cntRes = await fetchTextSafe(`${base}/index.php?page=dapi&s=post&q=index&limit=1&tags=${encodeURIComponent(queryTag)}${authQ}`, { 'User-Agent': BOORU_UA });
      const m = cntRes.text.match(/count="(\d+)"/i);
      if (m) totalPosts = Number(m[1]);
    }
    const batchSize = 3;
    let reachedEnd = false;
    for (let offset = 0; offset < chunkPages && !reachedEnd; offset += batchSize) {
      const batch = [];
      for (let k = 0; k < batchSize && offset + k < chunkPages; k++) batch.push(startPage + offset + k);
      onProgress?.({ currentPage: batch[0], sampledInChunk: artworks.length, totalPosts });
      const results = await Promise.all(
        batch.map((p) =>
          fetchJsonSafe(`${base}/index.php?page=dapi&s=post&q=index&json=1&limit=100&pid=${p - 1}&tags=${encodeURIComponent(gelTags)}${authQ}`, bh).then((data) => ({ p, data }))
        )
      );
      for (const { p, data } of results) {
        if (!Array.isArray(data) || data.length === 0) {
          reachedEnd = true;
          continue;
        }
        pagesScanned++;
        nextPage = Math.max(nextPage, p + 1);
        for (const item of data) {
          const id = String(item.id || '');
          if (!id || seenIds.has(id)) continue;
          const xRestrict = source === 'rule34' ? 1 : mapRatingToXRestrict(item.rating);
          if (!matchesBooruAgeMode(xRestrict, item.rating, mode)) continue;
          seenIds.add(id);
          const tags = String(item.tags || '').split(/\s+/).filter(Boolean);
          artworks.push({
            id: `${source}_${id}`,
            externalId: id,
            source,
            externalUrl:
              source === 'safebooru'
                ? `https://safebooru.org/index.php?page=post&s=view&id=${id}`
                : `https://rule34.xxx/index.php?page=post&s=view&id=${id}`,
            title: `${source === 'safebooru' ? 'Safebooru' : 'Rule34'} #${id}`,
            tags,
            userId: String(item.owner || ''),
            userName: String(item.owner || source),
            thumbUrl: item.preview_url || item.sample_url || item.file_url || '',
            regularUrl: item.sample_url || item.file_url || item.preview_url || '',
            originalUrl: item.file_url || item.sample_url || '',
            pageCount: 1,
            illustType: /\.(mp4|webm|gif)$/i.test(item.file_url || '') ? 2 : 0,
            xRestrict,
            isAi: tags.some((t) => /ai_generated|novelai|stable_diffusion/i.test(t)),
            bookmarkCount: Number(item.score || 0),
          });
        }
        if (data.length < 95) reachedEnd = true;
      }
    }
    hasMore = !reachedEnd && (totalPosts === 0 || (nextPage - 1) * 100 < totalPosts);
  } else if (source === 'yandere' || source === 'konachan') {
    const host = source === 'yandere' ? 'yande.re' : 'konachan.com';
    const label = source === 'yandere' ? 'Yande.re' : 'Konachan';
    let moeTags = queryTag;
    if (order === 'popular_d' && !/order:/i.test(moeTags)) moeTags += ' order:score';
    else if (order === 'date' && !/order:/i.test(moeTags)) moeTags += ' order:id';
    if (startPage === 1) {
      const cntRes = await fetchTextSafe(`https://${host}/post/index.xml?tags=${encodeURIComponent(queryTag)}&limit=1`, { 'User-Agent': BOORU_UA });
      const m = cntRes.text.match(/count="(\d+)"/i);
      if (m) totalPosts = Number(m[1]);
    }
    const batchSize = 3;
    let reachedEnd = false;
    for (let offset = 0; offset < chunkPages && !reachedEnd; offset += batchSize) {
      const batch = [];
      for (let k = 0; k < batchSize && offset + k < chunkPages; k++) batch.push(startPage + offset + k);
      onProgress?.({ currentPage: batch[0], sampledInChunk: artworks.length, totalPosts });
      const results = await Promise.all(
        batch.map((p) =>
          fetchJsonSafe(`https://${host}/post.json?tags=${encodeURIComponent(moeTags)}&limit=100&page=${p}`, bh).then((data) => ({ p, data }))
        )
      );
      for (const { p, data } of results) {
        if (!Array.isArray(data) || data.length === 0) {
          reachedEnd = true;
          continue;
        }
        pagesScanned++;
        nextPage = Math.max(nextPage, p + 1);
        for (const item of data) {
          const id = String(item.id || '');
          if (!id || seenIds.has(id)) continue;
          const xRestrict = mapRatingToXRestrict(item.rating);
          if (!matchesBooruAgeMode(xRestrict, item.rating, mode)) continue;
          seenIds.add(id);
          const tags = String(item.tags || '').split(/\s+/).filter(Boolean);
          artworks.push({
            id: `${source}_${id}`,
            externalId: id,
            source,
            externalUrl: `https://${host}/post/show/${id}`,
            title: `${label} #${id}`,
            tags,
            userId: String(item.creator_id || ''),
            userName: String(item.author || label),
            thumbUrl: item.preview_url || item.sample_url || '',
            regularUrl: item.sample_url || item.file_url || item.preview_url || '',
            originalUrl: item.file_url || item.sample_url || '',
            pageCount: 1,
            illustType: 0,
            xRestrict,
            isAi: tags.some((t) => /ai_generated|novelai/i.test(t)),
            bookmarkCount: Number(item.score || 0),
          });
        }
        if (data.length < 95) reachedEnd = true;
      }
    }
    hasMore = !reachedEnd && (totalPosts === 0 || (nextPage - 1) * 100 < totalPosts);
  } else if (source === 'zerochan') {
    let reachedEnd = false;
    for (let i = 0; i < chunkPages && !reachedEnd; i++) {
      const pNum = startPage + i;
      onProgress?.({ currentPage: pNum, sampledInChunk: artworks.length, totalPosts });
      const zSort = order === 'popular_d' ? 'fav' : 'id';
      const res = await fetchTextSafe(`https://www.zerochan.net/${encodeURIComponent(queryTag)}?json&l=50&p=${pNum}&s=${zSort}`, {
        'User-Agent': ZEROCHAN_UA,
      });
      const parsed = parseZerochanJson(res.text);
      const items = Array.isArray(parsed?.items) ? parsed.items : [];
      if (items.length === 0) {
        reachedEnd = true;
        break;
      }
      pagesScanned++;
      nextPage = pNum + 1;
      for (const item of items) {
        const id = String(item.id || '');
        if (!id || seenIds.has(id)) continue;
        seenIds.add(id);
        const tags = Array.isArray(item.tags) ? item.tags.filter(Boolean) : [];
        if (item.tag && !tags.includes(item.tag)) tags.unshift(item.tag);
        artworks.push({
          id: `zc_${id}`,
          externalId: id,
          source: 'zerochan',
          externalUrl: `https://www.zerochan.net/${id}`,
          title: item.tag ? `${item.tag} (#${id})` : `Zerochan #${id}`,
          tags,
          userId: '',
          userName: item.tag || 'Zerochan',
          thumbUrl: item.thumbnail || '',
          regularUrl: item.thumbnail ? item.thumbnail.replace(/\/240\//, '/600/') : '',
          originalUrl: item.thumbnail ? item.thumbnail.replace(/\/240\//, '/full/') : '',
          pageCount: 1,
          illustType: 0,
          xRestrict: 0,
          isAi: tags.some((t) => /ai.?generated/i.test(t)),
          bookmarkCount: 0,
        });
      }
      if (items.length < 40) reachedEnd = true;
    }
    hasMore = !reachedEnd && nextPage <= 100;
  }

  return {
    source,
    primaryTag: queryTag,
    resolvedFromCjk: resolved.resolvedFromCjk,
    totalPosts,
    pagesScanned,
    nextPage,
    nextCursor,
    hasMore,
    artworks,
    nativeTagCategories,
    translations,
  };
}

function normalizeHibiIllust(item, translationsOut = {}) {
  if (!item || !item.id) return null;
  const tags = [];
  if (Array.isArray(item.tags)) {
    for (const tObj of item.tags) {
      if (tObj && tObj.name) {
        tags.push(tObj.name);
        if (tObj.translated_name) translationsOut[tObj.name] = tObj.translated_name;
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
    source: 'pixiv',
    title: item.title || '无题',
    tags,
    userId: String(item.user?.id || ''),
    userName: item.user?.name || '',
    thumbUrl: item.image_urls?.square_medium || item.image_urls?.medium || '',
    createDate: item.create_date || '',
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
  const r34Key = request.headers.get('x-r34-key') || url.searchParams.get('r34Key') || '';
  const r34Uid = request.headers.get('x-r34-uid') || url.searchParams.get('r34Uid') || '';

  // 0. Health / status endpoint
  if (subPath === 'upstream-check') {
    const probe = async (u, init) => {
      try {
        const r = await fetch(u, { ...init, signal: AbortSignal.timeout(8000) });
        const t = await r.text();
        let json = false;
        try { JSON.parse(t); json = true; } catch {}
        return { status: r.status, json };
      } catch (e) {
        return { status: 0, error: e.name };
      }
    };
    const [oauth, appApi, mirror] = await Promise.all([
      probe('https://oauth.secure.pixiv.net/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'PixivAndroidApp/5.0.234 (Android 14; Pixel 8)' },
        body: 'grant_type=refresh_token&refresh_token=probe&client_id=MOBrBDS8blbauoSck0ZfDbtuzpyT',
      }),
      probe('https://app-api.pixiv.net/v1/search/illust?word=test', { headers: { 'User-Agent': 'PixivAndroidApp/5.0.234 (Android 14; Pixel 8)' } }),
      probe('https://pixiv.js.org/ajax/search/artworks/test?word=test&p=1', { headers: { 'User-Agent': DEFAULT_UA } }),
    ]);
    return jsonResponse({ oauth, appApi, mirror }, 200, request);
  }
  if (subPath === 'status' || subPath === '') {
    return jsonResponse({ ok: true, runtime: 'cloudflare-pages', version: '4.12' }, 200, request);
  }

  // 0B. Danbooru semantic taxonomy batch enrichment (/api/pixiv/danbooru/enrich)
  if (subPath === 'danbooru/enrich' && request.method === 'POST') {
    let body = {};
    try {
      body = await request.json();
    } catch {}
    const tags = Array.isArray(body.tags) ? body.tags : [];
    const danbooruMap = await batchEnrichWithDanbooru(tags);
    return jsonResponse({ error: false, danbooruMap }, 200, request);
  }

  // 0C. Pre-flight Tag Info & Total Works Count (/api/pixiv/tag-info)
  if (subPath === 'tag-info') {
    const source = String(url.searchParams.get('source') || 'pixiv').toLowerCase();
    const tag = (url.searchParams.get('tag') || url.searchParams.get('q') || '').trim();
    const mode = url.searchParams.get('mode') || 'all';
    const s_mode = url.searchParams.get('s_mode') || 's_tag';
    const type = url.searchParams.get('type') || 'all';
    if (!tag) return jsonResponse({ error: true, message: '请输入标签' }, 400, request);

    if (source !== 'pixiv') {
      const info = await fetchBooruTagInfo({ source, tag, mode, r34Key, r34Uid });
      return jsonResponse(info, info.error ? 400 : 200, request);
    }

    const hasOAuthToken = Boolean((request.headers.get('x-pixiv-token') || '').trim());
    // Probe HibiAPI (R-18 capable relay) in parallel with the exact-total Web AJAX lookup
    const hibiProbePromise = mode === 'safe'
      ? Promise.resolve(null)
      : fetchJsonSafe(
          `${HIBI_BASE}/search?word=${encodeURIComponent(tag)}&mode=${encodeURIComponent(mapHibiSearchMode(s_mode))}&order=date_desc&search_ai_type=0&page=1&size=30&include_translated_tag_results=true`,
          hibiHeaders(),
          8000
        );

    // Pixiv Strategy 1: Race Direct Pixiv Web AJAX & live PixivNow mirror (pixiv.js.org) for exact total count (+ ai_type=1 pure-human baseline in parallel!)
    const ajaxPath = `/ajax/search/artworks/${pixivPathTag(tag)}?word=${encodeURIComponent(tag)}&order=date_d&mode=${encodeURIComponent(mode)}&p=1&s_mode=${encodeURIComponent(s_mode)}&type=${encodeURIComponent(type)}&ai_type=0&lang=zh`;
    const ajaxHumanPath = `/ajax/search/artworks/${pixivPathTag(tag)}?word=${encodeURIComponent(tag)}&order=date_d&mode=${encodeURIComponent(mode)}&p=1&s_mode=${encodeURIComponent(s_mode)}&type=${encodeURIComponent(type)}&ai_type=1&lang=zh`;
    const [webRace, webHumanRace, hibiProbe] = await Promise.all([
      fetchPixivWebAjaxRace(ajaxPath, cookie, '', 9500),
      fetchPixivWebAjaxRace(ajaxHumanPath, cookie, '', 6500).catch(() => null),
      hibiProbePromise,
    ]);
    const hibiUp = Boolean(hibiProbe && Array.isArray(hibiProbe.illusts) && hibiProbe.illusts.length > 0);
    if (mode === 'r18' && !hibiUp && !hasOAuthToken) {
      return jsonResponse(
        {
          error: true,
          source: 'pixiv',
          resolvedTag: tag,
          message: 'HibiAPI（提供 R-18 数据的上游）暂时无响应，且 Pixiv 不向游客返回 R-18 作品。请稍后重试，或使用 APK 版 / 电脑本地版 (localhost:3456) 登录采集 R-18。',
        },
        200,
        request
      );
    }
    const guestR18Note = hasOAuthToken
      ? '已登录官方 App API（含 R-18/AI · 日期分段）'
      : mode === 'safe'
      ? '仅全年龄（支持日期分段）'
      : hibiUp
      ? '访客 HibiAPI 含 R-18/AI（安装油猴 v4.1.1 登录可直连全量日期分段与真实含 R-18 总数）'
      : 'HibiAPI 暂不可用，当前仅全年龄（R-18 为 0）';
    if (webRace && webRace.data && !webRace.data.error && webRace.data.body) {
      const block = webRace.data.body.illustManga || webRace.data.body.illust || webRace.data.body.manga || {};
      const totalPosts = Number(block.total || 0);
      const hBlock = webHumanRace?.data?.body?.illustManga || webHumanRace?.data?.body?.illust || webHumanRace?.data?.body?.manga || {};
      const totalHuman = Number(hBlock.total || 0);
      const humanSuffix = totalHuman > 0 && totalHuman <= totalPosts ? `，纯手绘 ${totalHuman.toLocaleString()}` : '';
      const estimatedPages = totalPosts > 0 ? Math.ceil(totalPosts / 60) : 0;
      const engineName = webRace.origin.includes('pixiv.js.org') ? 'WEB-AJAX-MIRROR' : 'WEB-AJAX';
      const totalLabel =
        mode === 'safe'
          ? `Pixiv 全年龄 ${totalPosts.toLocaleString()} 作（含AI${humanSuffix} · 约 ${estimatedPages.toLocaleString()} 页，60作/页）`
          : cookie
          ? `Pixiv 全站 ${totalPosts.toLocaleString()} 作（含R-18与AI${humanSuffix} · 约 ${estimatedPages.toLocaleString()} 页，60作/页）`
          : `Pixiv 全年龄基准 ${totalPosts.toLocaleString()} 作（含AI${humanSuffix}；含R-18实际全量更高）`;
      return jsonResponse(
        {
          error: false,
          source: 'pixiv',
          engine: engineName,
          resolvedTag: tag,
          totalPosts,
          totalHuman,
          totalIsSafeBaseline: mode !== 'safe' && !cookie,
          pageSize: 60,
          estimatedPages,
          apiCeilingWorks: 60000,
          apiCeilingPages: 1000,
          note: `${totalLabel} · ${guestR18Note}`,
          guestNoR18: !hasOAuthToken && !hibiUp,
          includesR18: hasOAuthToken || hibiUp,
        },
        200,
        request
      );
    }

    // Pixiv Strategy 2: HibiAPI (R-18 capable) first, then Pixiviz relay (never use rpc/cps.php access_count, which is pageviews, not works!)
    const hibiMode = mapHibiSearchMode(s_mode);
    const appFallback = hibiUp
      ? { engine: 'HIBI-APP-API', data: hibiProbe }
      : await fetchAppApiFallbackSearch({ word: tag, mode: hibiMode, order: 'date_desc', page: 1 });
    if (!appFallback) {
      return jsonResponse(
        {
          error: true,
          upstreamDown: true,
          source: 'pixiv',
          resolvedTag: tag,
          message: '云端 Pixiv 上游节点响应超时，请稍后重试，或点击「账号」登录 Pixiv（直连官方 App API）/ 切换 Danbooru 等图站。',
        },
        503,
        request
      );
    }
    const firstCount = Array.isArray(appFallback.data?.illusts) ? appFallback.data.illusts.length : 0;
    const hasMoreThanOnePage = firstCount >= 28;
    const estimatedPages = hasMoreThanOnePage ? 166 : firstCount > 0 ? 1 : 0;
    return jsonResponse(
      {
        error: false,
        source: 'pixiv',
        engine: appFallback.engine,
        resolvedTag: tag,
        totalPosts: 0,
        totalIsApproximate: hasMoreThanOnePage,
        pageSize: 30,
        estimatedPages,
        apiCeilingWorks: 5000,
        apiCeilingPages: 166,
        note: hasMoreThanOnePage
          ? `云端边缘网关（${appFallback.engine}）已连接 [${tag}]，将自动多批次持续翻页采样（支持本地 1GB 分段缓存）`
          : `已探测 [${tag}] 首批共 ${firstCount} 件作品`,
      },
      200,
      request
    );
  }

  // 1. Multi-Site Image Proxy (/api/pixiv/pximg?url=... & /api/pixiv/image?url=...)
  if (subPath === 'pximg' || subPath === 'image') {
    const imgUrl = url.searchParams.get('url');
    if (!imgUrl || !ALLOWED_IMAGE_HOST_RE.test(imgUrl)) {
      return new Response('Invalid image URL', { status: 400, headers: cors });
    }
    const upstream = await fetchImageWithFallback(imgUrl);
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
    const filename = url.searchParams.get('filename') || 'artwork.jpg';
    if (!imgUrl || !ALLOWED_IMAGE_HOST_RE.test(imgUrl)) {
      return new Response('Invalid image URL', { status: 400, headers: cors });
    }
    const upstream = await fetchImageWithFallback(imgUrl);
    if (!upstream) {
      return new Response('Download upstream error', { status: 502, headers: cors });
    }
    const headers = new Headers(cors);
    headers.set('Content-Type', upstream.headers.get('Content-Type') || 'application/octet-stream');
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    return new Response(upstream.body, { status: upstream.status, headers });
  }

  // 3. Multi-Site Autocomplete (/api/pixiv/autocomplete?source=...&q=...)
  if (subPath === 'autocomplete') {
    const source = String(url.searchParams.get('source') || 'pixiv').toLowerCase();
    const kw = (url.searchParams.get('q') || url.searchParams.get('keyword') || '').trim();
    if (!kw) return jsonResponse({ candidates: [] }, 200, request);
    if (source !== 'pixiv') {
      const candidates = await fetchBooruAutocomplete(source, kw);
      return jsonResponse({ candidates }, 200, request);
    }

    let candidates = [];
    const rpcRace = await fetchPixivWebAjaxRace(
      `/rpc/cps.php?keyword=${encodeURIComponent(kw)}&lang=zh`,
      cookie,
      '',
      4500
    );
    const rpcJson = rpcRace?.data;
    if (rpcJson && Array.isArray(rpcJson.candidates) && rpcJson.candidates.length > 0) {
      candidates = rpcJson.candidates.map((c) => ({
        tag_name: c.tag_name || '',
        tag_translation: c.tag_translation || '',
        access_count: c.access_count || '',
        type: c.type || '',
      }));
    }
    if (candidates.length === 0) {
      const hibiJson = await fetchJsonSafe(
        `${HIBI_BASE}/tags_autocomplete?word=${encodeURIComponent(kw)}`,
        hibiHeaders(),
        3500
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
    let userAccount = uid;
    let profileImageUrl = '';
    let isPremium = false;
    if (/^\d+$/.test(uid) && cookieHeader) {
      const pj = await fetchJsonSafe(`https://www.pixiv.net/ajax/user/${uid}?lang=zh`, pixivHeaders(cookieHeader));
      if (pj?.body) {
        if (!userName && pj.body.name) userName = pj.body.name;
        if (pj.body.account) userAccount = pj.body.account;
        profileImageUrl = pj.body.imageBig || pj.body.image || '';
        isPremium = Boolean(pj.body.premium);
      }
    }
    return jsonResponse(
      {
        error: false,
        loggedIn: Boolean(cookieHeader),
        mode: cookieHeader ? 'cookie' : 'guest',
        user: cookieHeader
          ? {
              id: uid,
              name: userName || `Pixiv用户 #${uid}`,
              account: userAccount,
              profileImageUrl,
              isPremium,
              r18Verified: true,
            }
          : null,
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
      const rawTokenText = await tokenRes.text();
      let td = null;
      try {
        td = JSON.parse(rawTokenText);
      } catch {
        td = null;
      }
      if (!td) {
        return jsonResponse(
          {
            error: true,
            edgeBlocked: true,
            upstreamStatus: tokenRes.status,
            message: `Pixiv OAuth 服务器拒绝了 Cloudflare 云端节点的请求 (HTTP ${tokenRes.status})。网页云端版暂无法完成登录换取令牌；请改用 APK 版登录，或在电脑运行本地版 (localhost:3456) 登录。游客模式仍可正常采集全年龄作品。`,
          },
          502,
          request
        );
      }
      const resp = td?.response || td;
      if (!tokenRes.ok || td?.has_error || !resp?.access_token) {
        return jsonResponse({ error: true, message: td?.errors?.system?.message || 'Pixiv OAuth 验证失败' }, 400, request);
      }
      const u = resp.user || {};
      const normalizedUser = {
        id: String(u.id || ''),
        name: u.name || 'Pixiv User',
        account: u.account || '',
        isPremium: Boolean(u.is_premium),
        xRestrict: Number(u.x_restrict ?? 2),
        r18Verified: Number(u.x_restrict ?? 2) > 0,
        profileImageUrl:
          u.profile_image_urls?.px_170x170 ||
          u.profile_image_urls?.px_50x50 ||
          u.profile_image_urls?.medium ||
          '',
      };
      return jsonResponse(
        {
          error: false,
          user: normalizedUser,
          accessToken: resp.access_token || '',
          refreshToken: resp.refresh_token || '',
        },
        200,
        request
      );
    } catch (e) {
      return jsonResponse({ error: true, message: e.message || 'OAuth 请求失败' }, 502, request);
    }
  }

  // 5. Artwork detail (/api/pixiv/illust/detail?id=...)
  if (subPath === 'illust/detail') {
    const id = (url.searchParams.get('id') || '').trim();
    if (!id) return jsonResponse({ error: true, message: '缺少作品 ID' }, 400, request);

    const detailRace = await fetchPixivWebAjaxRace(
      `/ajax/illust/${encodeURIComponent(id)}?lang=zh`,
      cookie,
      '',
      5500
    );
    const infoJson = detailRace?.data;
    if (infoJson && !infoJson.error && infoJson.body) {
      const pagesRace = await fetchPixivWebAjaxRace(
        `/ajax/illust/${encodeURIComponent(id)}/pages?lang=zh`,
        cookie,
        detailRace.origin,
        5000
      );
      const pagesJson = pagesRace?.data;
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
    const hibiMeta = await fetchJsonSafe(`${HIBI_BASE}/ugoira_metadata?id=${encodeURIComponent(id)}`, hibiHeaders());
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

  // 6. Quick JSON search endpoint
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

    const appRes = await fetchAppApiFallbackSearch({
      word: tag,
      mode: mapHibiSearchMode(s_mode),
      order: 'date_desc',
      page,
    });
    const hJson = appRes?.data;
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

  // 7. Streaming Chunked Multi-Site Co-Occurrence Analyzer (/api/pixiv/analyze-stream)
  if (subPath === 'analyze-stream') {
    const source = String(url.searchParams.get('source') || 'pixiv').toLowerCase();
    const tag = (url.searchParams.get('tag') || url.searchParams.get('q') || '').trim();
    if (!tag) return jsonResponse({ error: true, message: '请输入标签' }, 400, request);
    const pagesParam = url.searchParams.get('pages') || '3';
    const isAll = String(pagesParam).toUpperCase() === 'ALL';
    const startPage = Math.max(1, parseInt(url.searchParams.get('startPage') || '1', 10) || 1);
    const chunkPagesParam = parseInt(url.searchParams.get('chunkPages') || '0', 10) || 0;
    const cursor = url.searchParams.get('cursor') || '';
    const endDate = (url.searchParams.get('endDate') || '').trim();
    const startDate = (url.searchParams.get('startDate') || '').trim();
    const accessToken = (request.headers.get('x-pixiv-token') || '').trim();
    const mode = url.searchParams.get('mode') || 'all';
    const order = url.searchParams.get('order') || 'date_d';
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
          // Non-Pixiv Multi-Site Booru Chunked Stream
          if (source !== 'pixiv') {
            const targetChunk = chunkPagesParam > 0
              ? Math.min(12, chunkPagesParam)
              : isAll
              ? 10
              : Math.min(10, Math.max(1, (parseInt(pagesParam, 10) || 3) - startPage + 1));

            const chunk = await fetchBooruChunk({
              source,
              tag,
              startPage,
              chunkPages: targetChunk,
              cursor,
              mode,
              order,
              r34Key,
              r34Uid,
              onProgress: (prog) => {
                sendEvent('progress', {
                  currentPage: prog.currentPage,
                  totalPages: isAll ? (prog.totalPosts > 0 ? Math.ceil(prog.totalPosts / 100) : prog.currentPage + 5) : parseInt(pagesParam, 10) || targetChunk,
                  totalMatches: prog.totalPosts,
                  message: `[${source.toUpperCase()}] 正在采样 [${tag}] 第 ${prog.currentPage} 页 (本批 ${prog.sampledInChunk} 作)...`,
                });
              },
            });

            sendEvent('complete', {
              source,
              primaryTag: chunk.primaryTag,
              resolvedFromCjk: chunk.resolvedFromCjk,
              pixivTotal: chunk.totalPosts,
              pagesScanned: chunk.pagesScanned,
              engine: `${source.toUpperCase()}-API`,
              hasMore: chunk.hasMore,
              nextPage: chunk.nextPage,
              nextCursor: chunk.nextCursor,
              artworks: chunk.artworks,
              nativeTagCategories: chunk.nativeTagCategories,
              translations: chunk.translations,
            });
            return;
          }

          // Pixiv Multi-Chunk Streaming (WEB-AJAX or HIBI-APP-API continuation past 750 works, with search_ai_type=0!)
          const seenIds = new Set();
          const artworks = [];
          const translations = {};
          let pixivTotal = 0;
          let pagesScanned = 0;
          let engine = 'WEB-AJAX';
          let hasMore = false;
          let nextPage = startPage;
          const webOrder = order === 'date' ? 'date' : 'date_d';
          const hibiOrder = order === 'date' ? 'date_asc' : 'date_desc';
          const isPopOrder = order === 'popular_d';
          let queryTagForFetch = tag;
          let effSMode = s_mode;

          sendEvent('progress', {
            currentPage: startPage,
            totalPages: isAll ? startPage + 20 : Math.max(startPage, parseInt(pagesParam, 10) || 3),
            message: `正在连接 Pixiv 采样 [${tag}] 第 ${startPage} 页...`,
          });

          // Strategy 0 (BEST when logged in via PixEz OAuth): Official Pixiv App API with search_ai_type=0 + end_date segmentation!
          if (accessToken) {
            engine = 'PIXIV-OAUTH-APP-API';
            const appTarget = mapHibiSearchMode(s_mode);
            const appSort = order === 'date' ? 'date_asc' : 'date_desc';
            const maxSteps = chunkPagesParam > 0 ? Math.min(20, chunkPagesParam) : 20;
            const totalWantedSteps = isAll ? 166 : Math.min(166, (parseInt(pagesParam, 10) || 3) * 2);
            const endStep = Math.min(totalWantedSteps, startPage + maxSteps - 1);
            let reachedEnd = false;
            for (let step = startPage; step <= endStep && !reachedEnd; step++) {
              const offset = (step - 1) * 30;
              const qs = new URLSearchParams({
                word: tag,
                search_target: appTarget,
                sort: appSort,
                search_ai_type: '0',
                filter: 'for_android',
                include_translated_tag_results: 'true',
                merge_plain_keyword_results: 'true',
                offset: String(offset),
              });
              if (endDate) qs.set('end_date', endDate);
              if (startDate) qs.set('start_date', startDate);
              sendEvent('progress', {
                currentPage: step,
                totalPages: totalWantedSteps,
                message: `PixEz OAuth 采样 [${tag}]${endDate ? ` (截止 ${endDate})` : ''} 第 ${step} 批 (本段 ${artworks.length} 作)...`,
              });
              const appJson = await fetchJsonSafe(`https://app-api.pixiv.net/v1/search/illust?${qs.toString()}`, {
                Authorization: `Bearer ${accessToken}`,
                'User-Agent': 'PixivAndroidApp/5.0.234 (Android 14; Pixel 8)',
                'Accept-Language': 'zh-CN,zh;q=0.9',
              });
              if (!appJson || !Array.isArray(appJson.illusts) || appJson.illusts.length === 0) {
                reachedEnd = true;
                break;
              }
              pagesScanned++;
              nextPage = step + 1;
              for (const item of appJson.illusts) {
                const w = normalizeHibiIllust(item, translations);
                if (w && !seenIds.has(w.id) && matchesFilters(w, mode, type)) {
                  seenIds.add(w.id);
                  artworks.push(w);
                }
              }
              if (step % 3 === 0) {
                sendEvent('snapshot', { source: 'pixiv', primaryTag: tag, pixivTotal, pagesScanned, engine, artworks, translations });
              }
              if (!appJson.next_url || offset >= 4920) {
                reachedEnd = true;
              }
            }
            let oldestDate = '';
            for (const w of artworks) {
              if (w.createDate && (!oldestDate || w.createDate < oldestDate)) oldestDate = w.createDate;
            }
            const hitOffsetCeiling = nextPage > 164;
            hasMore = !reachedEnd && nextPage <= totalWantedSteps;
            sendEvent('complete', {
              source: 'pixiv',
              primaryTag: tag,
              pixivTotal,
              pagesScanned,
              engine,
              hasMore,
              hitOffsetCeiling,
              oldestDate: oldestDate ? oldestDate.slice(0, 10) : '',
              nextPage,
              artworks,
              translations,
            });
            return;
          }

          const dateSuffix = `${startDate ? `&scd=${encodeURIComponent(startDate)}` : ''}${endDate ? `&ecd=${encodeURIComponent(endDate)}` : ''}`;

          // Strategy 0B: HibiAPI App API relay — its server account has R-18 enabled,
          // so R-18 + AI (search_ai_type=0) works are included for all & r18 modes.
          // Handles Pixiv Rate Limit (HTTP 403/429 or JSON {"error":{"message":"Rate Limit"}}) cleanly via cooldown & resume
          // without EVER silently switching engines mid-crawl!
          if (mode !== 'safe' && !endDate && !startDate) {
            const hibiTarget = mapHibiSearchMode(s_mode);
            const hibiSort = order === 'date' ? 'date_asc' : 'date_desc';
            const aiFilterParam = url.searchParams.get('aiFilter') === '1' ? '1' : '0';
            const baseTagForHibi =
              mode === 'r18' && !/\br-?18\b/i.test(tag) ? `${tag} R-18` : tag;
            const hibiWord = isPopOrder
              ? `${baseTagForHibi} (10000users入り OR 5000users入り OR 1000users入り OR 500users入り)`
              : baseTagForHibi;
            const hibiUrl = (word, page) =>
              `${HIBI_BASE}/search?word=${encodeURIComponent(word)}&mode=${encodeURIComponent(hibiTarget)}&order=${hibiSort}&search_ai_type=${aiFilterParam}&page=${page}&size=30&include_translated_tag_results=true`;
            const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));
            const hibiFetchOnce = async (word, page) => {
              const ctrl = new AbortController();
              const tm = setTimeout(() => ctrl.abort(), 9000);
              try {
                const res = await fetch(hibiUrl(word, page), { headers: hibiHeaders(), signal: ctrl.signal });
                const txt = await res.text();
                let d = null;
                try { d = JSON.parse(txt); } catch {}
                if (res.status === 429 || res.status === 403) {
                  return { ok: false, rateLimited: true, status: res.status };
                }
                const errMsg = String(d?.error?.message || d?.error?.user_message || '');
                if (/rate.?limit/i.test(errMsg)) {
                  return { ok: false, rateLimited: true, status: res.status };
                }
                if (res.ok && d && Array.isArray(d.illusts)) {
                  return { ok: true, data: d };
                }
                return { ok: false, rateLimited: false, status: res.status };
              } catch {
                return { ok: false, rateLimited: false, status: 0 };
              } finally {
                clearTimeout(tm);
              }
            };
            const hibiFetch = async (word, page) => {
              let r = await hibiFetchOnce(word, page);
              if (!r.ok) {
                await sleepMs(r.rateLimited ? 2200 : 900);
                r = await hibiFetchOnce(word, page);
              }
              return r;
            };
            let effHibiWord = hibiWord;
            let firstRes = await hibiFetch(effHibiWord, startPage);
            if (isPopOrder && (!firstRes.ok || firstRes.data.illusts.length < 10)) {
              effHibiWord = baseTagForHibi;
              firstRes = await hibiFetch(effHibiWord, startPage);
            }
            // CRITICAL CONTAMINATION GUARD:
            // When mode !== 'safe' (all / r18), NEVER silently fall through into WEB-AJAX-MIRROR (0% R-18)!
            // Mixing 0%-R18 safe-only pages into an all-mode crawl destroys R-18% (e.g. collapsing 40% -> 12.8%).
            if (!firstRes.ok) {
              sendEvent('complete', {
                source: 'pixiv',
                primaryTag: tag,
                pixivTotal,
                pagesScanned: 0,
                engine: 'HIBI-APP-API',
                hasMore: true,
                rateLimited: true,
                retryAfterMs: firstRes.rateLimited ? 5000 : 3000,
                hitOffsetCeiling: false,
                includesR18: true,
                oldestDate: '',
                nextPage: startPage,
                artworks: [],
                translations,
              });
              return;
            }
            if (firstRes.ok) {
              const firstHibi = firstRes.data;
              engine = 'HIBI-APP-API';
              const maxSteps = chunkPagesParam > 0 ? Math.min(16, chunkPagesParam) : 16;
              const totalWantedSteps = isAll ? 167 : Math.min(167, (parseInt(pagesParam, 10) || 3) * 2);
              const endStep = Math.min(totalWantedSteps, startPage + maxSteps - 1);
              const ingestHibi = (json) => {
                let raw = 0;
                for (const item of json.illusts) {
                  const w = normalizeHibiIllust(item, translations);
                  if (!w || seenIds.has(w.id)) continue;
                  seenIds.add(w.id);
                  raw++;
                  if (matchesFilters(w, mode, type)) artworks.push(w);
                }
                return raw;
              };
              ingestHibi(firstHibi);
              pagesScanned = 1;
              nextPage = startPage + 1;
              let reachedEnd = !firstHibi.next_url || firstHibi.illusts.length === 0;
              let failedAt = 0;
              let hitRateLimit = false;
              sendEvent('snapshot', { source: 'pixiv', primaryTag: tag, pixivTotal, pagesScanned, engine, artworks, translations });
              const batch = 3;
              for (let pStart = startPage + 1; pStart <= endStep && !reachedEnd && !failedAt; pStart += batch) {
                const pEnd = Math.min(endStep, pStart + batch - 1);
                sendEvent('progress', {
                  currentPage: pStart,
                  totalPages: totalWantedSteps,
                  message: `HibiAPI 采样 [${tag}] (含 R-18 / AI) 第 ${pStart}~${pEnd} 批 (本段 ${artworks.length} 作)...`,
                });
                const ps = [];
                for (let p = pStart; p <= pEnd; p++) ps.push(hibiFetch(effHibiWord, p));
                const results = await Promise.all(ps);
                let rawInBatch = 0;
                for (let idx = 0; idx < results.length; idx++) {
                  const resObj = results[idx];
                  if (!resObj.ok) {
                    if (!failedAt) failedAt = pStart + idx;
                    if (resObj.rateLimited) hitRateLimit = true;
                    continue;
                  }
                  if (failedAt) continue;
                  const json = resObj.data;
                  pagesScanned++;
                  nextPage = Math.max(nextPage, pStart + idx + 1);
                  rawInBatch += ingestHibi(json);
                  if (!json.next_url || json.illusts.length === 0) reachedEnd = true;
                }
                sendEvent('snapshot', { source: 'pixiv', primaryTag: tag, pixivTotal, pagesScanned, engine, artworks, translations });
                if (failedAt) {
                  nextPage = failedAt;
                  break;
                }
                if (rawInBatch === 0) reachedEnd = true;
              }
              let oldestDate = '';
              for (const w of artworks) {
                if (w.createDate && (!oldestDate || w.createDate < oldestDate)) oldestDate = w.createDate;
              }
              hasMore = Boolean(failedAt) || (!reachedEnd && nextPage <= totalWantedSteps);
              sendEvent('complete', {
                source: 'pixiv',
                primaryTag: tag,
                pixivTotal,
                pagesScanned,
                engine,
                hasMore,
                rateLimited: hitRateLimit || Boolean(failedAt),
                retryAfterMs: hitRateLimit ? 5000 : 2500,
                hitOffsetCeiling: !failedAt && nextPage > 165,
                includesR18: true,
                oldestDate: oldestDate ? oldestDate.slice(0, 10) : '',
                nextPage,
                artworks,
                translations,
              });
              return;
            }
          }

          if (mode === 'r18') {
            sendEvent('error', {
              message: 'HibiAPI（提供 R-18 数据的上游）暂时无响应，且 Pixiv 不向游客返回 R-18 作品。请稍后重试，或使用 APK 版 / 电脑本地版 (localhost:3456) 登录采集 R-18。',
            });
            return;
          }
          const firstDirectPath = `/ajax/search/artworks/${pixivPathTag(tag)}?word=${encodeURIComponent(tag)}&order=${encodeURIComponent(webOrder)}&mode=${encodeURIComponent(mode)}&p=${startPage}&s_mode=${encodeURIComponent(s_mode)}&type=${encodeURIComponent(type)}&ai_type=0&lang=zh${dateSuffix}`;
          let directRace = await fetchPixivWebAjaxRace(firstDirectPath, cookie, '', 9500);
          if (!directRace && (endDate || startDate)) {
            // Retry Web AJAX once when date-segmented (never fall back to date-unaware relays on ecd/scd!)
            directRace = await fetchPixivWebAjaxRace(firstDirectPath, cookie, '', 9500);
          }
          const firstDirect = directRace?.data;
          const activeWebOrigin = directRace?.origin || '';
          if (activeWebOrigin.includes('pixiv.js.org')) engine = 'WEB-AJAX-MIRROR';

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
              const xr = Number(item.xRestrict || 0);
              if (mode === 'r18' && xr === 0) continue;
              if (mode === 'safe' && xr > 0) continue;
              const tags = Array.isArray(item.tags) ? item.tags.filter(Boolean) : [];
              artworks.push({
                id: idStr,
                source: 'pixiv',
                title: item.title || '无题',
                tags,
                userId: String(item.userId || ''),
                userName: item.userName || '',
                thumbUrl: item.url || '',
                createDate: item.createDate || '',
                pageCount: Number(item.pageCount || 1),
                illustType: Number(item.illustType || 0),
                xRestrict: Number(item.xRestrict || 0),
                isAi: item.aiType === 2 || tags.some((t) => /^(AIイラスト|AI生成|AIart|NovelAI)$/i.test(t)),
                bookmarkCount: Number(item.bookmarkCount || item.totalBookmarks || 0),
              });
            }
            return added;
          };

          let hitOffsetCeiling = false;
          if (firstDirect && !firstDirect.error && firstDirect.body) {
            // Guest / mirror Web AJAX repeats page 10 for every p > 10 (verified), so cap guests at 10 pages per date segment.
            const pageCap = cookie && activeWebOrigin.includes('www.pixiv.net') ? 1000 : 10;
            const maxChunkPages = chunkPagesParam > 0 ? Math.min(12, chunkPagesParam) : 12;
            const endTargetPage = Math.min(
              pageCap,
              isAll ? startPage + maxChunkPages - 1 : Math.min(parseInt(pagesParam, 10) || 3, startPage + maxChunkPages - 1)
            );

            if (isPopOrder) {
              const popWord = `${tag} (10000users入り OR 5000users入り OR 1000users入り OR 500users入り)`;
              const popRace = await fetchPixivWebAjaxRace(
                `/ajax/search/artworks/${pixivPathTag(popWord)}?word=${encodeURIComponent(popWord)}&order=date_d&mode=${encodeURIComponent(mode)}&p=${startPage}&s_mode=s_tag&type=${encodeURIComponent(type)}&ai_type=0&lang=zh${dateSuffix}`,
                cookie,
                activeWebOrigin,
                8000
              );
              const popFirst = popRace?.data;
              if (popFirst && !popFirst.error && popFirst.body && (popFirst.body.illustManga?.data || []).length > 0) {
                queryTagForFetch = popWord;
                effSMode = 's_tag';
                pagesScanned = 1;
                ingestDirectBody(popFirst.body);
              } else {
                pagesScanned = 1;
                ingestDirectBody(firstDirect.body);
              }
            } else {
              pagesScanned = 1;
              ingestDirectBody(firstDirect.body);
            }
            nextPage = startPage + 1;
            sendEvent('snapshot', { source: 'pixiv', primaryTag: tag, pixivTotal, pagesScanned, engine, artworks, translations });

            let reachedEnd = seenIds.size === 0;
            let stalled = false;
            let failedAtPage = 0;
            const batchSize = 2;
            for (let pStart = startPage + 1; pStart <= endTargetPage && !reachedEnd && !failedAtPage; pStart += batchSize) {
              const pEnd = Math.min(endTargetPage, pStart + batchSize - 1);
              sendEvent('progress', {
                currentPage: pStart,
                totalPages: isAll && pixivTotal > 0 ? Math.min(1000, Math.ceil(pixivTotal / 60)) : endTargetPage,
                totalMatches: pixivTotal,
                message: `正在采样 [${tag}]${endDate ? ` [截止 ${endDate}]` : ''}${startDate ? ` [起始 ${startDate}]` : ''} 第 ${pStart}~${pEnd} 页 (本批 ${artworks.length} 作)...`,
              });
              const fetchBatch = () => {
                const ps = [];
                for (let p = pStart; p <= pEnd; p++) {
                  const apiPath = `/ajax/search/artworks/${pixivPathTag(queryTagForFetch)}?word=${encodeURIComponent(queryTagForFetch)}&order=${encodeURIComponent(webOrder)}&mode=${encodeURIComponent(mode)}&p=${p}&s_mode=${encodeURIComponent(effSMode)}&type=${encodeURIComponent(type)}&ai_type=0&lang=zh${dateSuffix}`;
                  ps.push(fetchPixivWebAjaxRace(apiPath, cookie, activeWebOrigin, 8000).then((r) => r?.data || null));
                }
                return Promise.all(ps);
              };
              let results = await fetchBatch();
              if (results.every((json) => !json || json.error || !json.body)) {
                results = await fetchBatch(); // one retry on transient upstream failure
              }
              let addedInBatch = 0;
              let okPages = 0;
              for (let idx = 0; idx < results.length; idx++) {
                const json = results[idx];
                if (!json || json.error || !json.body) {
                  if (!failedAtPage) failedAtPage = pStart + idx;
                  continue;
                }
                okPages++;
                pagesScanned++;
                nextPage = Math.max(nextPage, pStart + idx + 1);
                addedInBatch += ingestDirectBody(json.body);
              }
              sendEvent('snapshot', { source: 'pixiv', primaryTag: tag, pixivTotal, pagesScanned, engine, artworks, translations });
              if (failedAtPage) {
                // Resume exactly at the first failed page on the next client chunk instead of treating failure as end-of-tag
                nextPage = failedAtPage;
                break;
              }
              if (okPages > 0 && addedInBatch === 0) {
                stalled = true;
                reachedEnd = true;
              } else if (pixivTotal > 0 && (nextPage - 1) * 60 >= pixivTotal) {
                reachedEnd = true;
              }
            }
            const maxWantedPage = isAll ? 1000 : parseInt(pagesParam, 10) || 3;
            const moreInWindow = pixivTotal === 0 || (nextPage - 1) * 60 < pixivTotal;
            hasMore = Boolean(failedAtPage) || (!reachedEnd && nextPage <= Math.min(pageCap, maxWantedPage) && moreInWindow);
            hitOffsetCeiling = !failedAtPage && seenIds.size > 0 && moreInWindow && (stalled || nextPage > pageCap);
          } else if (endDate || startDate) {
            // Date-segmented request timed out cleanly — stop without falling back to date-unaware relay
            hasMore = false;
          } else {
            // Fast App-API Relay fallback (races Pixiviz + HibiAPI with strict 4.5s timeouts!)
            engine = 'APP-API-RELAY';
            const hibiMode = mapHibiSearchMode(s_mode);
            const maxHibiChunk = chunkPagesParam > 0 ? Math.min(20, chunkPagesParam) : 20;
            const totalWantedHibiPages = isAll ? 168 : Math.min(168, (parseInt(pagesParam, 10) || 3) * 2);
            const endHibiPage = Math.min(totalWantedHibiPages, startPage + maxHibiChunk - 1);

            let hibiWord = tag;
            let hibiEffMode = hibiMode;
            if (isPopOrder) {
              const popQ = `${tag} (10000users入り OR 5000users入り OR 1000users入り OR 500users入り)`;
              const probe = await fetchAppApiFallbackSearch({
                word: popQ,
                mode: 'partial_match_for_tags',
                order: 'date_desc',
                page: 1,
              });
              if (probe?.data && Array.isArray(probe.data.illusts) && probe.data.illusts.length >= 10) {
                hibiWord = popQ;
                hibiEffMode = 'partial_match_for_tags';
              }
            }

            let reachedEnd = false;
            const batchSize = 3;
            for (let pStart = startPage; pStart <= endHibiPage && !reachedEnd; pStart += batchSize) {
              const pEnd = Math.min(endHibiPage, pStart + batchSize - 1);
              sendEvent('progress', {
                currentPage: pStart,
                totalPages: totalWantedHibiPages,
                message: `边缘网关采样 [${tag}] 第 ${pStart}~${pEnd} 批 (本段 ${artworks.length} 作)...`,
              });

              const batchPromises = [];
              for (let p = pStart; p <= pEnd; p++) {
                batchPromises.push(
                  fetchAppApiFallbackSearch({
                    word: hibiWord,
                    mode: hibiEffMode,
                    order: hibiOrder,
                    page: p,
                  })
                );
              }
              const results = await Promise.all(batchPromises);
              let rawCountInBatch = 0;
              let hadShortPage = false;
              for (let idx = 0; idx < results.length; idx++) {
                const resObj = results[idx];
                const json = resObj?.data;
                if (resObj?.engine) engine = resObj.engine;
                if (!json || !Array.isArray(json.illusts)) {
                  hadShortPage = true;
                  continue;
                }
                pagesScanned++;
                nextPage = Math.max(nextPage, pStart + idx + 1);
                rawCountInBatch += json.illusts.length;
                if (json.illusts.length < 25) hadShortPage = true;
                for (const item of json.illusts) {
                  const w = normalizeHibiIllust(item, translations);
                  if (w && !seenIds.has(w.id) && matchesFilters(w, mode, type)) {
                    seenIds.add(w.id);
                    artworks.push(w);
                  }
                }
              }

              sendEvent('snapshot', {
                source: 'pixiv',
                primaryTag: tag,
                pixivTotal,
                pagesScanned,
                engine,
                artworks,
                translations,
              });

              if (rawCountInBatch === 0 || hadShortPage) {
                reachedEnd = true;
              }
            }
            hasMore = !reachedEnd && nextPage <= totalWantedHibiPages;
          }

          let oldestDate = '';
          for (const w of artworks) {
            if (w.createDate && (!oldestDate || w.createDate < oldestDate)) oldestDate = w.createDate;
          }
          sendEvent('complete', {
            source: 'pixiv',
            primaryTag: tag,
            pixivTotal,
            pagesScanned,
            engine,
            hasMore,
            hitOffsetCeiling,
            oldestDate: oldestDate ? oldestDate.slice(0, 10) : '',
            nextPage,
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
