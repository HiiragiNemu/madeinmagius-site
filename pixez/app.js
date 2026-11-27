/* ============================================================================
 * PIXEZ PULSE v3.5 — Frontend Controller
 * - Default Theme: PAPER 档案 (data-theme="paper", data-pixel-font="false")
 * - Authentic Optics: data-crt-fx="true" & data-lofi-fx="true" ON by default
 *   over all UI panels/tables/text, while all artwork images stay 100% isolated
 *   at z-index: 80 above the optical layers.
 * - Ultra-compact zero-clip 6-column table with mobile/split-screen 3rd-tag
 *   folding so rightmost action buttons (看图 | +必含 | 搜Tag | +收集) are
 *   always 100% visible even in a 620px-800px split-screen pane.
 * ============================================================================ */

(function () {
  'use strict';

  const CATEGORY_META = {
    all: { label: '全部有效标签', short: '全部', colorVar: '--t-accent' },
    character: { label: '角色 / 人物', short: '角色', colorVar: '--t-cat-chr' },
    attribute_xp: { label: '服装 / 属性', short: '属性', colorVar: '--t-cat-atr' },
    series_ip: { label: '作品 / IP', short: '作品', colorVar: '--t-cat-ip' },
    meta_general: { label: '元标签 / 形式', short: '元标签', colorVar: '--t-cat-meta' },
    ai_meta: { label: 'AI 生成', short: 'AI', colorVar: '--t-cat-meta' },
    bookmark_milestone: { label: '收藏梯队', short: '收藏', colorVar: '--t-cat-bmk' }
  };

  const CATEGORY_CYCLE = ['character', 'attribute_xp', 'series_ip', 'meta_general'];

  const VISUAL_STORAGE_KEY = 'pixez_visual_v41';
  const RECENT_HISTORY_KEY = 'pixez_recent_searches_v1';
  const REMOTE_API_FALLBACK = 'https://madeinmagius-site.pages.dev/api/pixiv';
  const SOURCE_META = {
    pixiv: {
      label: 'Pixiv',
      placeholder: '输入 Pixiv 标签，或粘贴完整 Pixiv 标签页 / 搜索页链接...',
      linkLabel: 'Pixiv ↗',
      searchUrl: (q) => `https://www.pixiv.net/search?q=${encodeURIComponent(q)}&s_mode=tag&type=artwork`,
      pageSize: 60
    },
    danbooru: {
      label: 'Danbooru',
      placeholder: '输入 Danbooru 标签或画师名（支持中日文自动映射，支持 posts/artists 链接）...',
      linkLabel: 'Danbooru ↗',
      searchUrl: (q) => `https://danbooru.donmai.us/posts?tags=${encodeURIComponent(q)}`,
      pageSize: 100
    },
    sankaku: {
      label: 'Sankaku',
      placeholder: '输入 Sankaku Complex 标签（支持中日文自动映射与官方双语分类）...',
      linkLabel: 'Sankaku ↗',
      searchUrl: (q) => `https://beta.sankakucomplex.com/?tags=${encodeURIComponent(q)}`,
      pageSize: 40
    },
    safebooru: {
      label: 'Safebooru',
      placeholder: '输入 Safebooru 标签（全年龄图站，支持中日文自动映射）...',
      linkLabel: 'Safebooru ↗',
      searchUrl: (q) => `https://safebooru.org/index.php?page=post&s=list&tags=${encodeURIComponent(q)}`,
      pageSize: 100
    },
    yandere: {
      label: 'Yande.re',
      placeholder: '输入 Yande.re 标签（支持中日文自动映射）...',
      linkLabel: 'Yande.re ↗',
      searchUrl: (q) => `https://yande.re/post?tags=${encodeURIComponent(q)}`,
      pageSize: 100
    },
    konachan: {
      label: 'Konachan',
      placeholder: '输入 Konachan 标签（支持中日文自动映射）...',
      linkLabel: 'Konachan ↗',
      searchUrl: (q) => `https://konachan.com/post?tags=${encodeURIComponent(q)}`,
      pageSize: 100
    },
    zerochan: {
      label: 'Zerochan',
      placeholder: '输入 Zerochan 英文/罗马音规范标签（如 Original）或粘贴 Zerochan 链接...',
      linkLabel: 'Zerochan ↗',
      searchUrl: (q) => `https://www.zerochan.net/${encodeURIComponent(q)}`,
      pageSize: 50
    },
    rule34: {
      label: 'Rule34',
      placeholder: '输入 Rule34 标签（需在「账号」高级设置中填入免费 api_key 与 user_id）...',
      linkLabel: 'Rule34 ↗',
      searchUrl: (q) => `https://rule34.xxx/index.php?page=post&s=list&tags=${encodeURIComponent(q)}`,
      pageSize: 100
    }
  };
  const THEME_LABELS = {
    light: '明亮',
    paper: '纸张',
    green: '护眼',
    dark: '夜间',
    frost: '冷辉'
  };
  const VISUAL_DEFAULTS = {
    light: { curvature: false, scanlines: true, noise: true, pixelFont: false, registration: true, glassDamage: false },
    paper: { curvature: false, scanlines: true, noise: true, pixelFont: false, registration: true, glassDamage: false },
    green: { curvature: false, scanlines: true, noise: true, pixelFont: false, registration: true, glassDamage: false },
    dark:  { curvature: true,  scanlines: true, noise: true, pixelFont: false, registration: true, glassDamage: false },
    frost: { curvature: false, scanlines: false, noise: true, pixelFont: false, registration: false, glassDamage: false }
  };

  const IS_IOS = (() => {
    const ua = navigator.userAgent || '';
    return /AppleWebKit/.test(ua) && (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
  })();

  function loadVisualState() {
    const effects = {};
    for (const k of Object.keys(VISUAL_DEFAULTS)) effects[k] = { ...VISUAL_DEFAULTS[k] };
    let theme = 'paper';
    let phosphor = 'green';
    let themeBarMode = 'floating';
    const nightPixelFonts = { green: false, amber: true };
    try {
      const saved = JSON.parse(localStorage.getItem(VISUAL_STORAGE_KEY) || '{}');
      if (saved && VISUAL_DEFAULTS[saved.theme]) theme = saved.theme;
      if (saved && (saved.phosphor === 'amber' || saved.phosphor === 'green')) phosphor = saved.phosphor;
      if (saved && (saved.themeBarMode === 'top' || saved.themeBarMode === 'floating')) themeBarMode = saved.themeBarMode;
      if (saved && saved.nightPixelFonts && typeof saved.nightPixelFonts === 'object') {
        if (typeof saved.nightPixelFonts.green === 'boolean') nightPixelFonts.green = saved.nightPixelFonts.green;
        if (typeof saved.nightPixelFonts.amber === 'boolean') nightPixelFonts.amber = saved.nightPixelFonts.amber;
      }
      if (saved && saved.effects) {
        for (const k of Object.keys(VISUAL_DEFAULTS)) {
          if (saved.effects[k] && typeof saved.effects[k] === 'object') {
            effects[k] = { ...effects[k], ...saved.effects[k] };
          }
        }
      }
      effects.dark.pixelFont = nightPixelFonts[phosphor];
    } catch (_) {}
    return { theme, phosphor, nightPixelFonts, themeBarMode, effects };
  }

  const initialVisual = loadVisualState();

  const state = {
    theme: initialVisual.theme,
    nightPhosphor: initialVisual.phosphor,
    nightPixelFonts: initialVisual.nightPixelFonts,
    themeBarMode: initialVisual.themeBarMode,
    visualEffects: initialVisual.effects,
    cookie: localStorage.getItem('pixez_cookie') || '',
    accessToken: localStorage.getItem('pixez_access_token_v4') || '',
    refreshToken: localStorage.getItem('pixez_refresh_token_v4') || '',
    cacheLimitMb: (() => {
      const raw = localStorage.getItem('pixez_cache_limit_mb');
      if (raw === null || raw === '') return 1024;
      const n = parseInt(raw, 10);
      if (!Number.isFinite(n)) return 1024;
      if (n <= 0) return 0; // 0 = unlimited (constrained only by browser IndexedDB quota)
      return Math.max(64, Math.min(65536, n));
    })(),
    source: SOURCE_META[localStorage.getItem('pixez_source_v43')] ? localStorage.getItem('pixez_source_v43') : 'pixiv',
    r34Key: localStorage.getItem('pixez_r34_key') || '',
    r34Uid: localStorage.getItem('pixez_r34_uid') || '',
    bridgeDetected: false,
    bridgeVersion: '',
    bridgeFetchAvailable: false,
    chromeBridgeProfile: null,
    bridgeAutoSyncBlocked: (() => {
      try { return sessionStorage.getItem('pixez_manual_logout_v4') === '1'; } catch (_) { return false; }
    })(),
    authStatus: { loggedIn: false, user: null, mode: 'guest' },
    recentSearches: (() => {
      try {
        const arr = JSON.parse(localStorage.getItem(RECENT_HISTORY_KEY) || '[]');
        if (!Array.isArray(arr)) return [];
        return arr
          .map((x) => {
            if (typeof x === 'string' && x.trim()) return { tag: x.trim(), source: 'pixiv' };
            if (x && typeof x.tag === 'string' && x.tag.trim()) {
              return { tag: x.tag.trim(), source: SOURCE_META[x.source] ? x.source : 'pixiv' };
            }
            return null;
          })
          .filter(Boolean)
          .slice(0, 12);
      } catch (_) {
        return [];
      }
    })(),

    rawDataset: null,
    activeCategoryScope: 'all',
    tableDisplayLimit: 160,
    inspectorTag: '',
    inspectorLimit: 36,
    pendingPreflight: null,
    interruptedCrawl: null,
    lockedSubTags: new Set(),
    basket: new Set(JSON.parse(localStorage.getItem('pixez_basket') || '[]')),
    userCategoryOverrides: JSON.parse(localStorage.getItem('pixez_cat_overrides') || '{}'),
    categoryCorrectionLog: (() => {
      try {
        const raw = JSON.parse(localStorage.getItem('pixez_cat_correction_log_v1') || '{}') || {};
        // Backfill legacy userCategoryOverrides entries that existed before v4.19
        const legacy = JSON.parse(localStorage.getItem('pixez_cat_overrides') || '{}') || {};
        for (const [k, toCat] of Object.entries(legacy)) {
          if (!raw[k] && toCat) raw[k] = { tag: k, from: '', to: toCat, updatedAt: '' };
        }
        return raw;
      } catch (_) {
        return {};
      }
    })(),
    communityTagOverrides: (() => {
      try {
        return JSON.parse(localStorage.getItem('pixez_community_tag_overrides_v1') || '{}') || {};
      } catch (_) {
        return {};
      }
    })(),
    communityOverridesMeta: { count: 0, updatedAt: '', source: 'cache', canPublish: false },
    userCategoryLists: JSON.parse(localStorage.getItem('pixez_cat_lists') || '{"character":[],"attribute_xp":[],"series_ip":[],"meta_general":[]}'),
    danbooruCache: (() => {
      try {
        return JSON.parse(localStorage.getItem('pixez_danbooru_wiki_cache_v1') || '{}') || {};
      } catch (_) {
        return {};
      }
    })(),
    pixivTransCache: (() => {
      try {
        return JSON.parse(localStorage.getItem('pixez_pixiv_trans_cache_v1') || '{}') || {};
      } catch (_) {
        return {};
      }
    })(),

    computedCoTags: [],
    filteredArtworks: [],
    activeStreamAbort: null,

    viewer: {
      illust: null,
      pageIndex: 0,
      useOriginal: false,
      ugoiraTimer: null
    },

    graph: {
      nodes: [],
      edges: [],
      avatarImgCache: new Map(),
      zoom: 1,
      panX: 0,
      panY: 0,
      draggingNode: null,
      isPanning: false,
      startX: 0,
      startY: 0,
      selectedNode: null
    }
  };

  const $ = (id) => document.getElementById(id);
  let opticalRefs = null;
  let opticalScrollUpdater = null;

  function persistVisualState() {
    try {
      localStorage.setItem(VISUAL_STORAGE_KEY, JSON.stringify({
        theme: state.theme,
        phosphor: state.nightPhosphor,
        nightPixelFonts: state.nightPixelFonts,
        themeBarMode: state.themeBarMode,
        effects: state.visualEffects
      }));
    } catch (_) {}
  }

  function currentFx() {
    if (!state.visualEffects[state.theme]) {
      state.visualEffects[state.theme] = { ...(VISUAL_DEFAULTS[state.theme] || VISUAL_DEFAULTS.paper) };
    }
    return state.visualEffects[state.theme];
  }

  function showToast(msg, duration = 2800) {
    const container = $('toastContainer');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'toast';
    div.textContent = msg;
    container.appendChild(div);
    setTimeout(() => {
      div.style.opacity = '0';
      setTimeout(() => div.remove(), 220);
    }, duration);
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  let API_BASE = (() => {
    const h = window.location.hostname;
    const proto = window.location.protocol;
    if (h === 'localhost' || h === '127.0.0.1') return '';
    if (proto === 'file:' || h.endsWith('.github.io')) return REMOTE_API_FALLBACK;
    return '/api/pixiv';
  })();

  function apiUrl(p) {
    if (!API_BASE) return p;
    const suffix = p.replace(/^\/api\/pixiv/, '').replace(/^\/api/, '');
    return API_BASE + suffix;
  }

  async function apiFetch(p, init) {
    const res = await fetch(apiUrl(p), init);
    if (res.status === 404 && API_BASE === '/api/pixiv') {
      API_BASE = REMOTE_API_FALLBACK;
      return fetch(apiUrl(p), init);
    }
    return res;
  }

  function proxyImg(url) {
    if (!url) return '';
    return apiUrl(`/api/pixiv/image?url=${encodeURIComponent(url)}`);
  }

  function directFallbackImg(url) {
    if (!url) return '';
    const s = String(url);
    if (/^https:\/\/i\.pximg\.net\//i.test(s)) {
      return s.replace(/^https:\/\/i\.pximg\.net\//i, 'https://i.pixiv.re/');
    }
    return s;
  }

  function downloadImgUrl(url, filename) {
    if (!url || !/^https?:\/\//i.test(String(url).trim())) return '';
    return apiUrl(`/api/pixiv/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename || 'pixiv-artwork.jpg')}`);
  }

  function sanitizeMediaExt(url, fallbackExt = 'jpg') {
    try {
      const cleanPath = String(url || '').split('?')[0].split('#')[0];
      const m = cleanPath.match(/\.([a-z0-9]{2,5})$/i);
      if (m && /^(jpe?g|png|webp|gif|bmp|avif|zip|mp4|webm)$/i.test(m[1])) {
        return m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
      }
    } catch (_) {}
    return fallbackExt;
  }

  function clearViewerDownloadButton(btn, label) {
    if (!btn) return;
    btn.removeAttribute('href');
    btn.removeAttribute('download');
    delete btn.dataset.dlUrl;
    delete btn.dataset.dlName;
    btn.setAttribute('aria-disabled', 'true');
    btn.classList.add('is-disabled');
    if (label) btn.textContent = label;
  }

  function setViewerDownloadButton(btn, rawUrl, filename, label) {
    if (!btn) return;
    const cleanUrl = String(rawUrl || '').trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      clearViewerDownloadButton(btn, label || btn.textContent);
      return;
    }
    const safeName = String(filename || 'artwork.jpg').replace(/[\\/:*?"<>|\r\n]+/g, '_');
    const proxyHref = downloadImgUrl(cleanUrl, safeName);
    btn.dataset.dlUrl = cleanUrl;
    btn.dataset.dlName = safeName;
    btn.href = proxyHref;
    btn.setAttribute('download', safeName);
    btn.removeAttribute('aria-disabled');
    btn.classList.remove('is-disabled');
    if (label) btn.textContent = label;
  }

  async function triggerSafeMediaDownload(btn, evt) {
    if (evt) evt.preventDefault();
    if (!btn) return;
    const rawUrl = String(btn.dataset.dlUrl || '').trim();
    const baseName = String(btn.dataset.dlName || 'artwork.jpg').trim();
    if (!/^https?:\/\//i.test(rawUrl)) {
      showToast('原图地址仍在解析或暂不可用，请稍候或点击「打开原网页」');
      return;
    }
    if (btn.dataset.downloading === '1') return;
    const origText = btn.textContent;
    btn.dataset.downloading = '1';
    btn.textContent = '正在下载...';

    const validateAndExtractBlob = async (res) => {
      if (!res || !res.ok) return null;
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (
        ct.includes('text/html') ||
        ct.includes('application/xhtml') ||
        ct.includes('text/plain') ||
        ct.includes('application/json')
      ) {
        return null;
      }
      const blob = await res.blob();
      if (!blob || blob.size < 64) return null;
      try {
        const headBuf = await blob.slice(0, 64).arrayBuffer();
        const headText = new TextDecoder('utf-8', { fatal: false }).decode(headBuf).trimStart().toLowerCase();
        if (
          headText.startsWith('<!doctype') ||
          headText.startsWith('<html') ||
          headText.startsWith('<head') ||
          headText.startsWith('<?xml') ||
          headText.startsWith('{"error"')
        ) {
          return null;
        }
      } catch (_) {}
      return { blob, ct: ct || (blob.type || '').toLowerCase() };
    };

    try {
      const proxyHref = downloadImgUrl(rawUrl, baseName);
      let media = null;
      if (proxyHref) {
        try {
          const res = await fetch(proxyHref, {
            headers: { Accept: 'image/avif,image/webp,image/apng,image/*,application/zip,*/*;q=0.8' }
          });
          media = await validateAndExtractBlob(res);
        } catch (_) {}
      }
      if (!media) {
        const fbUrl = directFallbackImg(rawUrl);
        if (fbUrl && /^https?:\/\//i.test(fbUrl)) {
          try {
            const fbRes = await fetch(fbUrl, {
              headers: { Accept: 'image/avif,image/webp,image/apng,image/*,application/zip,*/*;q=0.8' }
            });
            media = await validateAndExtractBlob(fbRes);
          } catch (_) {}
        }
      }
      if (!media) {
        showToast('下载失败：上游未返回有效图片文件，请点「打开原网页」或长按预览图保存');
        return;
      }
      let finalName = baseName;
      const ctExt =
        media.ct.includes('png') ? 'png' :
        media.ct.includes('webp') ? 'webp' :
        media.ct.includes('gif') ? 'gif' :
        media.ct.includes('avif') ? 'avif' :
        media.ct.includes('zip') ? 'zip' :
        media.ct.includes('jpeg') || media.ct.includes('jpg') ? 'jpg' : '';
      if (ctExt && !/\.(jpe?g|png|webp|gif|bmp|avif|zip|mp4|webm)$/i.test(finalName)) {
        finalName = `${finalName.replace(/\.+$/, '')}.${ctExt}`;
      }
      const objUrl = URL.createObjectURL(media.blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = finalName;
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objUrl), 20000);
      showToast(`已开始保存: ${finalName}`);
    } catch (err) {
      showToast(`原图下载失败: ${err.message || '网络异常'}`);
    } finally {
      delete btn.dataset.downloading;
      btn.textContent = origText;
    }
  }

  // =========================================================================
  // 1. EXACT READER / CALL V14 OPTICAL ENGINE & FLOATING THEME BAR
  // =========================================================================
  function placeThemeBar() {
    const widget = $('themeSwitcher');
    const slot = $('themeBarTopSlot');
    const displayRoot = $('callDisplayRoot');
    if (!widget || !slot || !displayRoot) return;
    if (state.themeBarMode === 'floating') {
      if (widget.parentElement !== displayRoot) {
        displayRoot.appendChild(widget);
      }
      try {
        const saved = JSON.parse(localStorage.getItem('pixez_pos_theme_v40') || 'null');
        if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
          const maxX = Math.max(6, displayRoot.clientWidth - widget.offsetWidth - 6);
          const maxY = Math.max(6, displayRoot.clientHeight - widget.offsetHeight - 6);
          widget.classList.add('is-positioned');
          widget.style.left = `${Math.max(6, Math.min(maxX, saved.x))}px`;
          widget.style.top = `${Math.max(6, Math.min(maxY, saved.y))}px`;
        }
      } catch (_) {}
    } else {
      widget.classList.remove('is-positioned');
      ['left', 'top', 'right', 'bottom', 'transform'].forEach((p) => widget.style.removeProperty(p));
      if (widget.parentElement !== slot) {
        slot.appendChild(widget);
      }
    }
  }

  function applyVisualSettings() {
    const root = document.documentElement;
    const displayRoot = $('callDisplayRoot');
    const fx = currentFx();
    const curvatureActive = !IS_IOS && Boolean(fx.curvature);

    root.dataset.callTheme = state.theme;
    root.dataset.callPhosphor = state.nightPhosphor;
    root.dataset.callThemeBarMode = state.themeBarMode;
    root.dataset.callIos = String(IS_IOS);
    root.dataset.callIosFlat = String(IS_IOS);
    root.dataset.callCrtEngine = IS_IOS ? 'native-flat' : 'static-svg';
    root.dataset.callFxCurvature = String(curvatureActive);
    root.dataset.callFxScanlines = String(Boolean(fx.scanlines));
    root.dataset.callFxNoise = String(Boolean(fx.noise));
    root.dataset.callFxPixelFont = String(Boolean(fx.pixelFont));
    root.dataset.callFxRegistration = String(Boolean(fx.registration));
    root.dataset.callFxGlassDamage = String(Boolean(fx.glassDamage));
    root.dataset.callOpticsActive = String(curvatureActive);
    root.dataset.callReaderOptics = 'v14';
    root.style.colorScheme = (state.theme === 'dark' || state.theme === 'frost') ? 'dark' : 'light';

    if (displayRoot && window.CallReaderOpticsV14) {
      if (!opticalRefs) {
        opticalRefs = IS_IOS
          ? window.CallReaderOpticsV14.mountMaterials(displayRoot)
          : window.CallReaderOpticsV14.mount(displayRoot);
      }
      opticalRefs.sync();
    }
    if (window.CallGlass) {
      window.CallGlass.sync(state.theme === 'frost' && Boolean(fx.glassDamage));
    }

    placeThemeBar();

    document.querySelectorAll('#themeSwitcher [data-call-theme-option]').forEach((btn) => {
      const isActive = btn.dataset.callThemeOption === state.theme;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    if ($('fxCurrentThemeLabel')) {
      const label = state.theme === 'dark'
        ? `夜间 (${state.nightPhosphor === 'amber' ? '橙磷光' : '绿磷光'})`
        : (THEME_LABELS[state.theme] || '纸张');
      $('fxCurrentThemeLabel').textContent = label;
    }

    if ($('fxPhosphorFieldset')) $('fxPhosphorFieldset').hidden = state.theme !== 'dark';
    if ($('fxGlassDamageRow')) $('fxGlassDamageRow').hidden = state.theme !== 'frost';

    document.querySelectorAll('[data-phosphor-choice]').forEach((btn) => {
      btn.setAttribute('aria-pressed', btn.dataset.phosphorChoice === state.nightPhosphor ? 'true' : 'false');
    });

    document.querySelectorAll('[data-themebar-mode]').forEach((btn) => {
      btn.setAttribute('aria-pressed', btn.dataset.themebarMode === state.themeBarMode ? 'true' : 'false');
    });

    if ($('toggleCurvatureCheck')) {
      $('toggleCurvatureCheck').checked = curvatureActive;
      $('toggleCurvatureCheck').disabled = IS_IOS;
    }
    if ($('togglePixelFontCheck')) $('togglePixelFontCheck').checked = Boolean(fx.pixelFont);
    if ($('toggleCrtFxCheck')) $('toggleCrtFxCheck').checked = Boolean(fx.scanlines);
    if ($('toggleNoiseFxCheck')) $('toggleNoiseFxCheck').checked = Boolean(fx.noise);
    if ($('toggleLofiFxCheck')) $('toggleLofiFxCheck').checked = Boolean(fx.registration);
    if ($('toggleGlassDamageCheck')) $('toggleGlassDamageCheck').checked = Boolean(fx.glassDamage);
    if (opticalScrollUpdater) opticalScrollUpdater();
  }

  let themeSwitchToken = 0;

  function setTheme(themeName) {
    if (!VISUAL_DEFAULTS[themeName]) return;
    const token = ++themeSwitchToken;
    const commit = () => {
      if (token !== themeSwitchToken) return;
      const scrollRoot = $('callDisplayScroll');
      const prevScrollTop = scrollRoot ? scrollRoot.scrollTop : 0;
      state.theme = themeName;
      persistVisualState();
      applyVisualSettings();
      if (scrollRoot && scrollRoot.scrollTop !== prevScrollTop) {
        scrollRoot.scrollTop = prevScrollTop;
      }
      if (!$('networkView').classList.contains('hidden')) {
        renderNetworkGraph();
      }
    };
    const wantFrostGlass = themeName === 'frost' && Boolean((state.visualEffects.frost || VISUAL_DEFAULTS.frost).glassDamage);
    if (wantFrostGlass && window.CallGlass && typeof window.CallGlass.isPrepared === 'function' && !window.CallGlass.isPrepared()) {
      window.CallGlass.prepare().then(commit, commit);
      return;
    }
    commit();
  }

  function setPhosphor(phosphor) {
    state.nightPhosphor = phosphor === 'amber' ? 'amber' : 'green';
    state.theme = 'dark';
    currentFx().pixelFont = Boolean(state.nightPixelFonts[state.nightPhosphor]);
    persistVisualState();
    applyVisualSettings();
    if (!$('networkView').classList.contains('hidden')) {
      renderNetworkGraph();
    }
  }

  function setThemeBarMode(mode) {
    state.themeBarMode = mode === 'floating' ? 'floating' : 'top';
    persistVisualState();
    applyVisualSettings();
  }

  function resetCurrentThemeDefaults() {
    state.visualEffects[state.theme] = { ...(VISUAL_DEFAULTS[state.theme] || VISUAL_DEFAULTS.paper) };
    if (state.theme === 'dark') {
      const defPx = state.nightPhosphor === 'amber';
      state.visualEffects.dark.pixelFont = defPx;
      state.nightPixelFonts[state.nightPhosphor] = defPx;
    }
    persistVisualState();
    applyVisualSettings();
    showToast('已恢复当前主题默认画面与字体效果');
  }

  function initOpticalScrollbar() {
    const scrollRoot = $('callDisplayScroll');
    const bar = $('callOpticalScroll');
    const thumb = $('callOpticalScrollThumb');
    if (!scrollRoot || !bar || !thumb) return;

    function sync() {
      const sh = scrollRoot.scrollHeight;
      const ch = scrollRoot.clientHeight;
      if (sh <= ch + 2) {
        bar.style.display = 'none';
        return;
      }
      bar.style.display = 'block';
      const trackH = bar.clientHeight || ch;
      const thumbH = Math.max(36, Math.round((ch / sh) * trackH));
      const maxTop = Math.max(1, trackH - thumbH);
      const ratio = scrollRoot.scrollTop / Math.max(1, sh - ch);
      thumb.style.height = `${thumbH}px`;
      thumb.style.transform = `translateY(${Math.round(ratio * maxTop)}px)`;
    }

    opticalScrollUpdater = sync;
    scrollRoot.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(sync);
      ro.observe(scrollRoot);
    }
    window.addEventListener('resize', sync, { passive: true });

    let dragStart = null;
    bar.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const rect = bar.getBoundingClientRect();
      const sh = scrollRoot.scrollHeight;
      const ch = scrollRoot.clientHeight;
      const maxScroll = Math.max(1, sh - ch);
      if (e.target === thumb) {
        dragStart = { y: e.clientY, top: scrollRoot.scrollTop };
      } else {
        const ratio = Math.max(0, Math.min(1, (e.clientY - rect.top) / Math.max(1, rect.height)));
        scrollRoot.scrollTop = ratio * maxScroll;
        dragStart = { y: e.clientY, top: scrollRoot.scrollTop };
      }
      bar.setPointerCapture?.(e.pointerId);
    });
    bar.addEventListener('pointermove', (e) => {
      if (!dragStart) return;
      const rect = bar.getBoundingClientRect();
      const sh = scrollRoot.scrollHeight;
      const ch = scrollRoot.clientHeight;
      const maxScroll = Math.max(1, sh - ch);
      const delta = e.clientY - dragStart.y;
      scrollRoot.scrollTop = Math.max(0, Math.min(maxScroll, dragStart.top + (delta / Math.max(1, rect.height)) * sh));
    });
    bar.addEventListener('pointerup', () => { dragStart = null; });
    bar.addEventListener('pointercancel', () => { dragStart = null; });
    requestAnimationFrame(sync);
  }

  // =========================================================================
  // 2. MULTI-SITE URL & TAG PARSER
  // =========================================================================
  function parseUserQueryInput(raw) {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return { tag: '', source: null, mode: null, sMode: null, type: null };

    if (/^https?:\/\/(www\.)?pixiv\.net\//i.test(trimmed) || trimmed.startsWith('pixiv.net/')) {
      try {
        const urlStr = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
        const u = new URL(urlStr);

        const tagMatch = u.pathname.match(/\/tags\/([^/?#]+)/i);
        if (tagMatch && tagMatch[1]) {
          const decodedTag = decodeURIComponent(tagMatch[1]).trim();
          let mode = null;
          if (u.searchParams.get('mode') === 'r18') mode = 'r18';
          else if (u.searchParams.get('mode') === 'safe') mode = 'safe';
          return { tag: decodedTag, source: 'pixiv', mode, sMode: null, type: null };
        }

        if (u.pathname.startsWith('/search')) {
          const q = (u.searchParams.get('q') || u.searchParams.get('word') || '').trim();
          const sModeParam = u.searchParams.get('s_mode');
          let sMode = null;
          if (sModeParam === 'tag_full' || sModeParam === 's_tag_full') sMode = 's_tag_full';
          else if (sModeParam === 'tag' || sModeParam === 's_tag') sMode = 's_tag';
          else if (sModeParam === 'tc' || sModeParam === 's_tc') sMode = 's_tc';

          let mode = null;
          if (u.searchParams.get('mode') === 'r18' || u.searchParams.get('r18') === '1') mode = 'r18';
          else if (u.searchParams.get('mode') === 'safe') mode = 'safe';

          return { tag: q || trimmed, source: 'pixiv', mode, sMode, type: null };
        }
      } catch (_) {}
    }

    if (/^https?:\/\//i.test(trimmed)) {
      try {
        const u = new URL(trimmed);
        const h = u.hostname.toLowerCase();
        if (h.includes('danbooru.donmai.us')) {
          const q = u.searchParams.get('tags') || u.searchParams.get('search[any_name_matches]') || u.searchParams.get('search[name_matches]') || '';
          return { tag: q.trim() || trimmed, source: 'danbooru', mode: null, sMode: null, type: null };
        }
        if (h.includes('sankakucomplex.com')) {
          const q = u.searchParams.get('tags') || '';
          return { tag: q.trim() || trimmed, source: 'sankaku', mode: null, sMode: null, type: null };
        }
        if (h.includes('safebooru.org')) {
          const q = u.searchParams.get('tags') || '';
          return { tag: q.trim() || trimmed, source: 'safebooru', mode: null, sMode: null, type: null };
        }
        if (h.includes('yande.re')) {
          const q = u.searchParams.get('tags') || '';
          return { tag: q.trim() || trimmed, source: 'yandere', mode: null, sMode: null, type: null };
        }
        if (h.includes('konachan.')) {
          const q = u.searchParams.get('tags') || '';
          return { tag: q.trim() || trimmed, source: 'konachan', mode: null, sMode: null, type: null };
        }
        if (h.includes('zerochan.net')) {
          const seg = u.pathname.replace(/^\/+|\/+$/g, '').split('/')[0] || '';
          return { tag: decodeURIComponent(seg.replace(/\+/g, ' ')) || trimmed, source: 'zerochan', mode: null, sMode: null, type: null };
        }
        if (h.includes('rule34.xxx')) {
          const q = u.searchParams.get('tags') || '';
          return { tag: q.trim() || trimmed, source: 'rule34', mode: null, sMode: null, type: null };
        }
      } catch (_) {}
    }

    return { tag: trimmed, source: null, mode: null, sMode: null, type: null };
  }

  // =========================================================================
  // 3. SEMANTIC CATEGORY CLASSIFIER (Native Booru + Danbooru Ontology + Positive Heuristics)
  // =========================================================================
  const SERIES_SET = new Set([
    '東方project', '東方', 'touhou', 'vocaloid', 'ボーカロイド', 'ボカロ', 'プロセカ',
    'fate/grandorder', 'fate/staynight', 'fate/zero', 'fgo', 'fate',
    'ブルーアーカイブ', 'ブルアカ', 'bluearchive', '블루아카이브', '원신', '명일방주', '原神', 'genshinimpact', 'genshin',
    'コイカツ', 'コイカツ!', 'koikatsu',
    'アークナイツ', '明日方舟', 'arknights', 'アズールレーン', 'アズレン', 'azurlane',
    '艦これ', '艦隊これくしょん', 'ウマ娘', 'ウマ娘プリティーダービー',
    'ホロライブ', 'hololive', 'にじさんじ', 'ぶいすぽっ!',
    'アイドルマスター', '学マス', '学園アイドルマスター', 'シャニマス', 'デレマス', 'ミリシタ',
    'ラブライブ!', 'ラブライブ', '崩壊:スターレイル', '崩壊スターレイル', 'スターレイル', '崩壊3rd',
    'ゼンレスゾーンゼロ', 'ゼンゼロ', 'zzz', '鳴潮', 'wutheringwaves',
    '勝利の女神:nikke', 'nikke', 'ポケモン', 'ポケットモンスター', 'pokemon',
    'プリキュア', '名探偵プリキュア!', '名探偵プリキュア', 'たんプリ', 'たんプリ!', 'たんぷり',
    '魔法少女まどか☆マギカ', 'まどマギ', 'マギアレコード', 'マギレコ', 'マギアレコード魔法少女まどか☆マギカ外伝', '魔法少女まどか☆マギカ外伝', 'ワルプルギスの廻天', 'まどドラ', 'マギアエクセドラ', 'magiaexedra',
    'チェンソーマン', '呪術廻戦', '鬼滅の刃', 'ぼっち・ざ・ろっく!', 'ぼざろ',
    'リコリス・リコイル', 'リコリコ', '推しの子', 'ダンダダン', 'ガンダム', 'エヴァンゲリオン',
    'グランブルーファンタジー', 'グラブル', 'プリコネr', 'ヘブバン', 'limbuscompany',
    'ぐだぐだぷにぷにウォーズ!'
  ]);

  const ATTR_SET = new Set([
    '白タイツ', '黒タイツ', '黒スト', '白スト', 'タイツ', 'ストッキング', 'ニーソ', 'ニーソックス', 'オーバーニー', 'ガーターベルト',
    '水着', 'ビキニ', 'スク水', '競泳水着', '制服', 'セーラー服', 'ブレザー', 'メイド', 'メイド服', 'バニーガール', 'バニー',
    'チャイナドレス', '体操服', 'ブルマ', '巫女', 'シスター', 'ナース', '私服', 'ドレス', 'ウェディングドレス',
    '着物', '浴衣', 'パーカー', '水手服', '眼鏡', 'メガネ', 'サングラス', '眼帯', 'ケモミミ', '猫耳', 'ネコミミ', '狐耳', 'ウサ耳', '獣耳',
    '角', '翼', '尻尾', 'ヘイロー', 'ツインテール', 'ポニーテール', 'ショートヘア', 'ロングヘア', 'ボブカット', '三つ編み',
    '白髪', '銀髪', '金髪', '黒髪', 'ピンク髪', '青髪', '赤髪', 'オッドアイ', '赤目', '青目', 'ジト目',
    '巨乳', '爆乳', '貧乳', 'ちっぱい', '微乳', 'ロリ', 'loli', '幼女', 'お姉さん', '少女', '美少女', '女の子', '男の子', '男の娘',
    '足裏', '素足', '裸足', '足指', '脚', '美脚', '太もも', 'ふともも', '魅惑のふともも', '絶対領域',
    'おっぱい', '魅惑の谷間', '谷間', 'お尻', '尻', '尻神様', '腋', 'へそ', 'お腹', '腹筋', '背中', 'うなじ',
    '百合', 'gl', 'bl', 'キス', 'ハグ', '手繋ぎ', '泣き顔', '笑顔', '赤面', '照れ', 'ドヤ顔', 'ハート目',
    '触手', '拘束', '緊縛', '催眠', '洗脳', '悪堕ち', '闇堕ち',
    '全裸', '半裸', '裸', '下脱ぎ', '上脱ぎ', '中出し', 'ふたなり', 'futanari', 'ntr', '寝取られ', 'くぱぁ', 'ぶっかけ',
    'パイズリ', 'フェラ', '手コキ', '足コキ', '潮吹き', '母乳', '妊娠', '妊婦', '女体化', 'tsf', 'パンチラ', '胸チラ',
    '変身', '変身前後', 'アイス', 'アイスがすき', 'ポッキーゲーム', '黒キュア', '白キュア',
    '第一再臨', '第二再臨', '第三再臨', '最終再臨', '霊衣',
    'フォーリナー', 'セイバー', 'アーチャー', 'ランサー', 'ライダー', 'キャスター', 'アサシン', 'バーサーカー',
    'ルーラー', 'アヴェンジャー', 'アルターエゴ', 'ムーンキャンサー', 'プリテンダー', 'ビースト',
    '1girl', '2girls', 'solo', 'nude', 'completely_naked', 'big_breasts', 'small_breasts', 'creampie', 'bondage', 'cuckold'
  ]);

  const META_SET = new Set([
    'r-18', 'r18', 'r-18g', 'nsfw', 'sfw',
    'オリジナル', 'オリジナルキャラクター', 'オリジナルキャラ', 'oc', 'original', 'originalcharacter',
    '創作', '一次創作', '二次創作', '版権', '漫画', 'マンガ', '4コマ', '4コマ漫画', 'comic', 'manga',
    'イラスト', '落書き', 'らくがき', '練習', '絵', 'illustration', 'art', 'drawing', 'sketch', 'fanart', 'animestyle', 'digitalart',
    'ドット絵', 'pixelart', 'デフォルメ', 'sd', 'ちびキャラ', 'live2d', '3dcg', 'mmd',
    'gif', 'ugoira', 'うごイラ', '動畫', '動画', 'animation',
    '模写', '原画', 'デジタル', 'アナログ', '厚塗り', '水彩', '線画', 'モノクロ', 'monochrome', 'greyscale',
    '風景', '背景', 'skeb', 'commission', 'リクエスト', '立ち絵',
    'アニメ', 'ゲーム', '誕生日', '生誕祭', '誕生祭', '周年', '記念', 'ポッキーの日', 'ワンドロ', '企画', 'お題箱', 'ネタバレ',
    'highres', 'absurdres', 'commentary', 'commentary_request', 'translated', 'translation_request', 'bad_id', 'bad_pixiv_id'
  ]);

  const AI_SET = new Set([
    'ai生成', 'aiイラスト', 'ai-generated', 'ai_generated', 'aiart', 'ai作品', 'ai', 'novelai', 'stablediffusion', 'stable_diffusion'
  ]);

  const NON_CHAR_WORDS = new Set([
    '女の子', '男の子', '落書き', '立ち絵', '後ろ姿', '横顔', '寝顔', '笑顔', '泣き顔',
    '水着姿', '制服姿', '下着姿', '素足', '裸足', '片目隠れ', '腹チラ', 'パンチラ', '胸チラ',
    '腋見せ', '振り返り', '上目遣い', '見返り', 'お姉さん', 'お姫様抱っこ', 'お団子ヘア',
    '三つ編み', '二の腕', '食い込み', '寝そべり', '寝取られ', '悪堕ち', '闇堕ち', '女体化',
    '着衣巨乳', '競泳水着', '体操服', '巫女服', 'メイド服', 'セーラー服', 'チャイナ服',
    '厚塗り', '線画', '水彩画', '鉛筆画', '背景画', '概念礼装', '二次創作', '一次創作',
    '誕生日', '生誕祭', '記念日', 'お題箱', '無断転載禁止', 'デジタル', 'アナログ', 'ナルトス',
    '下脱ぎ', '上脱ぎ', '中出し', '舌出し', '潮吹き', '変身前後', '模写', '原画', '動畫', '動画', 'うごイラ',
    'ポッキーの日', 'ポッキーゲーム', 'ぶっかけ', 'くぱぁ', '緊縛', '全裸', '半裸', 'ふたなり',
    '第一再臨', '第二再臨', '第三再臨', '最終再臨', '黒キュア', '白キュア', 'アイス'
  ]);

  const CLASS_OR_NON_CHAR_BASE_RE = /^(フォーリナー|セイバー|アーチャー|ランサー|ライダー|キャスター|アサシン|バーサーカー|ルーラー|アヴェンジャー|アルターエゴ|ムーンキャンサー|プリテンダー|ビースト|水着|制服|メイド|衣装|霊衣|概念礼装|ネタバレ|漫画|イラスト|落書き)$/i;

  const GENERIC_EN_FIRST_WORD = new Set([
    'original', 'completely', 'ice', 'stage', 'black', 'white', 'blue', 'red', 'green', 'pink', 'dark', 'light',
    'school', 'swim', 'high', 'long', 'short', 'big', 'small', 'open', 'closed', 'first', 'second', 'third',
    'final', 'happy', 'sad', 'new', 'old', 'full', 'half', 'mini', 'super', 'ultra', 'digital', 'anime'
  ]);

  const NON_CHAR_ROOT_RE =
    /(エロ|無様|責め|堕ち|姦|射精|顔射|口内|中出|手コキ|足コキ|パイズリ|フェラ|アナル|バイブ|電マ|プレイ|セックス|オナニー|イキ|ハメ|種付|寝取|敗北|事後|凌辱|調教|拘束|緊縛|催眠|洗脳|露出|放尿|失禁|脱糞|絶頂|痙攣|妊娠|妊婦|出産|母乳|搾乳|触手|苗床|産卵|丸呑|ふたなり|女体化|性転|男の娘|女装|全裸|半裸|下脱|上脱|下着|水着|制服|衣装|メイド|バニー|タイツ|ストッキング|ニーソ|ビキニ|ドレス|パンツ|ブラ|巨乳|爆乳|貧乳|ちっぱい|おっぱい|ふともも|太もも|絶対領域|パンチラ|胸チラ|腹チラ|腋|足裏|素足|裸足|差分|漫画|小説|落書|らくがき|練習|模写|原画|背景|風景|素材|講座|企画|生誕|誕生|記念|周年|公式|二次|一次|創作|オリジナル|百合|変身|擬人|再臨|霊衣|概念礼装|ネタバレ|ワンドロ|ガチャ|セット|ポーズ|アヘ顔|トロ顔|イキ顔|笑顔|泣き顔|寝顔|横顔|後ろ姿|立ち絵|振り返り|寝そべり|見返り|しゃがみ|お姉さん|女の子|男の子|美少女|幼女|ロリ|熟女|人妻|ギャル|メスガキ|ヤンデレ|ツンデレ|陰毛|パイパン|褐肌|日焼け|黒髪|白髪|金髪|銀髪|赤目|青目|ジト目|ハート目|獣耳|猫耳|狐耳|犬耳|尻尾|動画|動畫|うごイラ)/i;

  function persistDanbooruCache() {
    try {
      const entries = Object.entries(state.danbooruCache);
      const trimmed = entries.length > 4000 ? Object.fromEntries(entries.slice(-4000)) : state.danbooruCache;
      localStorage.setItem('pixez_danbooru_wiki_cache_v1', JSON.stringify(trimmed));
    } catch (_) {}
  }

  // Japanese verb / adjective / auxiliary okurigana endings that are NEVER character given names
  // Japanese verb / adjective / auxiliary okurigana endings that are NEVER character given names
  // Prevents false-positive `character` hits on `[Kanji]+[Hiragana]` verb/adjective predicate tags!
  const JP_PREDICATE_SUFFIX_RE =
    /(がる|がって|がった|しい|しく|わいい|めたい|たかい|らかい|やすい|にくい|づらい|ない|なく|たい|たく|れる|せる|てる|でる|ける|げる|べる|める|ねる|いる|ある|する|くる|すぎる|すぎ|っぽい|ぽい|そう|った|んだ|って|んで|ながら|ばかり|られる|させる|ている|ていく|てくる|てみる|ちゃう|じゃう|もの|こと|ため|よう|みたい|らしい|です|ます|ません|でした|あげ|さげ|だし|ぬき|こみ|つけ|かけ|ずらし|めくり|まくり|みせ|かくし|しばり|つり|ぜめ|おち|ぬれ|みだれ|あふれ)$/;

  function classifyTagClient(tag, translation = '', serverCategory = null, ignorePersonalOverrides = false) {
    const clean = String(tag || '').trim();
    if (!clean) return 'meta_general';
    const lower = clean.toLowerCase();

    if (!ignorePersonalOverrides) {
      if (state.userCategoryOverrides[clean]) return state.userCategoryOverrides[clean];
      for (const cat of CATEGORY_CYCLE) {
        if (Array.isArray(state.userCategoryLists[cat]) && state.userCategoryLists[cat].includes(clean)) {
          return cat;
        }
      }
    }

    // Community curated overrides (Plan A: synced from /api/tag-overrides, sits below personal local overrides!)
    const commEntry = state.communityTagOverrides?.[clean];
    const commCat = typeof commEntry === 'string' ? commEntry : commEntry?.to;
    if (commCat && ['character', 'attribute_xp', 'series_ip', 'meta_general', 'bookmark_milestone', 'ai_meta'].includes(commCat)) {
      return commCat;
    }

    if (/^\d+users入り$/i.test(clean) || /users入り$/i.test(clean)) return 'bookmark_milestone';
    if (AI_SET.has(lower) || /^ai[生成イラスト]/i.test(clean)) return 'ai_meta';

    // Authoritative native category from Danbooru / Sankaku / Yande.re / Konachan
    const nativeCat = state.rawDataset?.nativeTagCategories?.[clean];
    if (nativeCat && ['character', 'attribute_xp', 'series_ip', 'meta_general', 'bookmark_milestone', 'ai_meta'].includes(nativeCat)) {
      return nativeCat;
    }

    // Authoritative Danbooru Ontology enrichment cache
    const dbEntry = state.danbooruCache[clean] || (state.rawDataset?.danbooruMap && state.rawDataset.danbooruMap[clean]);
    if (dbEntry && dbEntry.category) return dbEntry.category;

    if (META_SET.has(lower) || /(生誕祭|誕生祭|記念日|の日|ワンドロ)\d*$/i.test(clean)) {
      return 'meta_general';
    }

    if (
      SERIES_SET.has(lower) ||
      /(プリキュア[!♪♡♥]?|ぷりきゅあ[!♪]?|東方|艦これ|ホロライブ|ウマ娘|FGO|スターレイル|ゾーンゼロ|アークナイツ|アズールレーン|アイドルマスター|ラブライブ[!]*|ブルーアーカイブ|ブルアカ|Project|アーカイブ|シリーズ|コイカツ[!！]?|ウォーズ[!！]?)$/i.test(clean) ||
      /^[ァ-ヴぁ-ん]{2,3}(プリ|ぷり)[!！]?$/.test(clean)
    ) {
      return 'series_ip';
    }

    if (ATTR_SET.has(lower) || NON_CHAR_WORDS.has(lower)) return 'attribute_xp';
    if (NON_CHAR_ROOT_RE.test(clean) && !/^キュア/.test(clean)) return 'attribute_xp';
    if (
      /(タイツ|ストッキング|ニーソ|水着|ビキニ|制服|メイド|バニー|ドレス|服|着|耳|髪|目|眼|乳|胸|尻|足|脚|もも|腋|腹|へそ|顔|涙|笑|娘|少女|ロリ|姉|百合|キス|メガネ|眼鏡|リボン|帽|脱ぎ|出し|再臨|緊縛|拘束|ゲーム|ブローチ|化|系|風|版|集|録|記|伝|編|章|話|巻|祭|日|戦|プレイ|エロ)$/.test(clean) &&
      !/^キュア/.test(clean)
    ) {
      return 'attribute_xp';
    }

    if (serverCategory && ['character', 'attribute_xp', 'series_ip', 'meta_general', 'bookmark_milestone', 'ai_meta'].includes(serverCategory)) {
      return serverCategory;
    }

    // Precision-First Positive-Evidence-ONLY Character Heuristics (NO loose Kanji+Katakana rule!)
    if (/^(キュア|仮面ライダー|ウルトラマン)[ァ-ヴー・]+/.test(clean)) return 'character';

    const parenMatch = clean.match(/^([^()（）]{2,15})[(（]([^()（）]{1,18})[)）]$/);
    if (parenMatch) {
      const baseName = parenMatch[1].trim();
      if (
        !CLASS_OR_NON_CHAR_BASE_RE.test(baseName) &&
        !ATTR_SET.has(baseName.toLowerCase()) &&
        !META_SET.has(baseName.toLowerCase()) &&
        !NON_CHAR_ROOT_RE.test(baseName)
      ) {
        return 'character';
      }
      return 'attribute_xp';
    }

    if (/^[ァ-ヴー]{2,10}・[ァ-ヴー]{2,10}$/.test(clean) && !NON_CHAR_WORDS.has(lower) && !NON_CHAR_ROOT_RE.test(clean)) {
      return 'character';
    }

    const tr = String(translation || state.rawDataset?.translations?.[clean] || state.rawDataset?.tagTranslations?.[clean] || '').trim();
    if (tr) {
      if (/^Cure\s+[A-Z]/i.test(tr) || /^[A-Z][a-z]{2,}\/[A-Z][a-z]{2,}$/.test(tr)) {
        return 'character';
      }
      const twoCap = tr.match(/^([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})$/);
      if (twoCap && !GENERIC_EN_FIRST_WORD.has(twoCap[1].toLowerCase()) && !GENERIC_EN_FIRST_WORD.has(twoCap[2].toLowerCase())) {
        return 'character';
      }
    }

    if (
      !NON_CHAR_WORDS.has(lower) &&
      !NON_CHAR_ROOT_RE.test(clean) &&
      !JP_PREDICATE_SUFFIX_RE.test(clean) &&
      /^[一-龥々ヶノ]{1,3}[ぁ-んー]{2,5}$/.test(clean)
    ) {
      return 'character';
    }

    return 'attribute_xp';
  }

  function persistCategoryCorrections() {
    try {
      localStorage.setItem('pixez_cat_overrides', JSON.stringify(state.userCategoryOverrides));
      localStorage.setItem('pixez_cat_correction_log_v1', JSON.stringify(state.categoryCorrectionLog));
    } catch (_) {}
    refreshCorrectionBadge();
  }

  function refreshCorrectionBadge() {
    const cnt = Object.keys(state.categoryCorrectionLog || {}).length;
    const badge = $('rulesCorrectionBadge');
    if (badge) {
      badge.textContent = String(cnt);
      badge.classList.toggle('hidden', cnt === 0);
    }
    const cntEl = $('correctionLogCount');
    if (cntEl) cntEl.textContent = String(cnt);
  }

  function formatShortTime(iso) {
    if (!iso) return '本地记录';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '本地记录';
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${mm}-${dd} ${hh}:${mi}`;
  }

  function revertSingleTagCorrection(tag) {
    if (!tag) return;
    delete state.userCategoryOverrides[tag];
    delete state.categoryCorrectionLog[tag];
    for (const cat of CATEGORY_CYCLE) {
      if (Array.isArray(state.userCategoryLists[cat])) {
        state.userCategoryLists[cat] = state.userCategoryLists[cat].filter((x) => x !== tag);
      }
    }
    localStorage.setItem('pixez_cat_lists', JSON.stringify(state.userCategoryLists));
    persistCategoryCorrections();
    renderCorrectionLogList();
    showToast(`已还原 [${tag}] 为系统自动分类`);
    recomputeAndRender();
  }

  function renderCorrectionLogList() {
    refreshCorrectionBadge();
    const badge = $('communityOverridesBadge');
    if (badge) {
      const m = state.communityOverridesMeta || {};
      const cnt = Object.keys(state.communityTagOverrides || {}).length;
      badge.textContent = `全站公共词表: ${cnt} 条${m.source === 'github-live' ? ' (在线同步)' : ''}`;
    }
    const box = $('correctionLogList');
    if (!box) return;
    const entries = Object.values(state.categoryCorrectionLog || {})
      .filter((e) => e && e.tag && e.to)
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    if (!entries.length) {
      box.innerHTML = `<div class="empty-placeholder">暂无本地分类纠错记录。点击共现排行中任意标签的分类徽标进行改类后，系统会自动记录「原分类 → 现分类」并永久保存在本地。</div>`;
      return;
    }
    box.innerHTML = entries
      .map((e) => {
        const fromCat = e.from || classifyTagClient(e.tag, '', null, true);
        const fromMeta = CATEGORY_META[fromCat] || { short: fromCat || '默认', badgeClass: 'badge-meta' };
        const toMeta = CATEGORY_META[e.to] || { short: e.to, badgeClass: 'badge-meta' };
        return `
          <div class="correction-log-row">
            <div class="correction-log-row__main">
              <span class="correction-log-row__tag">${escapeHtml(e.tag)}</span>
              <span class="cat-badge ${fromMeta.badgeClass}">${escapeHtml(fromMeta.short)}</span>
              <span class="correction-log-row__arrow">→</span>
              <span class="cat-badge ${toMeta.badgeClass}">${escapeHtml(toMeta.short)}</span>
              <span class="correction-log-row__time">${escapeHtml(formatShortTime(e.updatedAt))}</span>
            </div>
            <button class="t-btn t-btn--sm" type="button" data-revert-tag="${escapeHtml(e.tag)}" title="还原为默认自动分类">还原</button>
          </div>
        `;
      })
      .join('');
    box.querySelectorAll('[data-revert-tag]').forEach((btn) => {
      btn.addEventListener('click', () => revertSingleTagCorrection(btn.dataset.revertTag));
    });
  }

  function getTagOverridesEndpoint() {
    // Same-origin /api/tag-overrides on Cloudflare Pages & localhost:3456 proxy;
    // direct CF Pages API origin when opened from GitHub Pages (never under /api/pixiv!).
    const host = window.location.hostname || '';
    if (host === 'localhost' || host === '127.0.0.1' || host === 'madeinmagius-site.pages.dev') {
      return '/api/tag-overrides';
    }
    return 'https://madeinmagius-site.pages.dev/api/tag-overrides';
  }

  async function syncCommunityTagOverrides(showFeedback = false) {
    try {
      const r = await fetch(getTagOverridesEndpoint(), { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      if (d && d.overrides && typeof d.overrides === 'object') {
        state.communityTagOverrides = d.overrides;
        state.communityOverridesMeta = {
          count: Number(d.count || Object.keys(d.overrides).length),
          updatedAt: d.updatedAt || '',
          source: d.source || 'remote',
          canPublish: Boolean(d.canPublish)
        };
        try {
          localStorage.setItem('pixez_community_tag_overrides_v1', JSON.stringify(d.overrides));
        } catch (_) {}
        renderCorrectionLogList();
        if (state.rawDataset) recomputeAndRender();
        if (showFeedback) {
          showToast(`已同步全站公共纠错词表 (${Object.keys(d.overrides).length} 条)`);
        }
      }
    } catch (e) {
      if (showFeedback) showToast(`同步全站公共词表失败: ${e.message}`);
    }
  }

  function cycleTagCategory(tag) {
    const autoCat = classifyTagClient(tag, '', null, true);
    const current = classifyTagClient(tag);
    const idx = CATEGORY_CYCLE.indexOf(current);
    const nextCat = CATEGORY_CYCLE[(idx + 1) % CATEGORY_CYCLE.length];
    const prevLog = state.categoryCorrectionLog[tag];
    const origFrom = prevLog?.from || autoCat;
    if (nextCat === origFrom) {
      delete state.userCategoryOverrides[tag];
      delete state.categoryCorrectionLog[tag];
      persistCategoryCorrections();
      showToast(`已将 [${tag}] 还原为默认分类: ${CATEGORY_META[nextCat].label}`);
    } else {
      state.userCategoryOverrides[tag] = nextCat;
      state.categoryCorrectionLog[tag] = {
        tag,
        from: origFrom,
        to: nextCat,
        updatedAt: new Date().toISOString()
      };
      persistCategoryCorrections();
      showToast(`已纠错 [${tag}]: ${CATEGORY_META[origFrom].short} → ${CATEGORY_META[nextCat].short} (已本地永久记录)`);
    }
    recomputeAndRender();
  }

  // =========================================================================
  // 4. CO-OCCURRENCE RECOMPUTATION & PINNED LOCKED TAGS
  // =========================================================================
  function recomputeAndRender() {
    if (!state.rawDataset) return;

    const ds = state.rawDataset;
    const allWorks = ds.artworks || [];
    const primaryTag = ds.primaryTag || ds.meta?.queryTag || '';
    const normPrimary = primaryTag.toLowerCase();

    const excludeAiWorks = $('excludeAiWorksCheck').checked;
    const hideBookmarkTags = $('hideBookmarkTagCheck').checked;
    const hideAiTags = $('hideAiTagCheck').checked;
    const excludeR18Works = Boolean($('excludeR18WorksCheck')?.checked);
    const hideR18Tags = Boolean($('hideR18TagCheck')?.checked);
    const hideMetaTags = $('hideMetaTagCheck').checked;
    const minCount = Math.max(1, parseInt($('minCountInput').value, 10) || 1);
    const isR18TagName = (t) => /^r-?18g?$/i.test(String(t || '').trim());
    const isR18Artwork = (w) =>
      Number(w?.xRestrict || 0) > 0 || (Array.isArray(w?.tags) && w.tags.some(isR18TagName));

    const activeWorks = allWorks.filter((w) => {
      if (excludeAiWorks && w.isAi) return false;
      if (excludeR18Works && isR18Artwork(w)) return false;
      if (state.lockedSubTags.size > 0) {
        const wTags = new Set(w.tags || []);
        for (const reqTag of state.lockedSubTags) {
          if (!wTags.has(reqTag)) return false;
        }
      }
      return true;
    });

    state.filteredArtworks = activeWorks;
    const totalWorks = activeWorks.length;

    const tagStatsMap = new Map();
    const pairMap = new Map();
    const transLookup = ds.translations || ds.tagTranslations || {};

    for (const w of activeWorks) {
      const uniqueTags = Array.from(new Set(w.tags || []));
      for (let i = 0; i < uniqueTags.length; i++) {
        const t = uniqueTags[i];
        if (!t || t.toLowerCase() === normPrimary) continue;

        let entry = tagStatsMap.get(t);
        if (!entry) {
          entry = {
            tag: t,
            translation: transLookup[t] || state.pixivTransCache[t] || '',
            count: 0,
            artists: new Set(),
            bookmarkSum: 0,
            thirdMap: new Map()
          };
          tagStatsMap.set(t, entry);
        }
        entry.count++;
        if (w.userId) entry.artists.add(String(w.userId));
        entry.bookmarkSum += Number(w.bookmarkCount ?? w.totalBookmarks ?? 0);

        for (let j = 0; j < uniqueTags.length; j++) {
          if (i === j) continue;
          const t2 = uniqueTags[j];
          if (!t2 || t2.toLowerCase() === normPrimary) continue;
          entry.thirdMap.set(t2, (entry.thirdMap.get(t2) || 0) + 1);

          if (i < j) {
            const pairKey = t < t2 ? `${t}|||${t2}` : `${t2}|||${t}`;
            pairMap.set(pairKey, (pairMap.get(pairKey) || 0) + 1);
          }
        }
      }
    }

    const categoryCounts = {
      all: 0,
      character: 0,
      attribute_xp: 0,
      series_ip: 0,
      meta_general: 0,
      bookmark_milestone: 0
    };

    const fullList = [];
    for (const [, item] of tagStatsMap.entries()) {
      const isLocked = state.lockedSubTags.has(item.tag);
      if (!isLocked && item.count < minCount) continue;

      const cat = classifyTagClient(item.tag, item.translation);
      if (!isLocked) {
        if (hideBookmarkTags && cat === 'bookmark_milestone') continue;
        if (hideAiTags && cat === 'ai_meta') continue;
        if (hideR18Tags && isR18TagName(item.tag)) continue;
        if (hideMetaTags && (cat === 'meta_general' || cat === 'ai_meta')) continue;
      }

      const dbInfo = state.danbooruCache[item.tag] || (ds.danbooruMap && ds.danbooruMap[item.tag]) || null;

      const thirdTags = Array.from(item.thirdMap.entries())
        .filter(([t3]) => {
          if (state.lockedSubTags.has(t3)) return false;
          const c3 = classifyTagClient(t3);
          if (hideBookmarkTags && c3 === 'bookmark_milestone') return false;
          if (hideAiTags && c3 === 'ai_meta') return false;
          if (hideR18Tags && isR18TagName(t3)) return false;
          return true;
        })
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([t3, c3]) => ({ tag: t3, count: c3 }));

      const rowObj = {
        tag: item.tag,
        translation: item.translation || (dbInfo && dbInfo.danbooruTag ? dbInfo.danbooruTag.replace(/_/g, ' ') : ''),
        danbooruTag: dbInfo ? dbInfo.danbooruTag : null,
        category: cat,
        isPinnedLocked: isLocked,
        count: item.count,
        percentage: totalWorks > 0 ? Number(((item.count / totalWorks) * 100).toFixed(1)) : 0,
        uniqueArtists: item.artists.size,
        avgBookmarks: item.count > 0 ? Math.round(item.bookmarkSum / item.count) : 0,
        thirdTags
      };

      fullList.push(rowObj);
      categoryCounts.all++;
      if (categoryCounts[cat] !== undefined) categoryCounts[cat]++;
      else if (cat === 'ai_meta') categoryCounts.meta_general++;
    }

    $('catCountAll').textContent = categoryCounts.all;
    $('catCountCharacter').textContent = categoryCounts.character;
    $('catCountAttribute').textContent = categoryCounts.attribute_xp;
    $('catCountSeries').textContent = categoryCounts.series_ip;
    $('catCountMeta').textContent = categoryCounts.meta_general;
    $('catCountBookmark').textContent = categoryCounts.bookmark_milestone;

    let scopedList = fullList;
    if (state.activeCategoryScope !== 'all') {
      scopedList = fullList.filter((r) => {
        if (r.isPinnedLocked) return true;
        if (state.activeCategoryScope === 'meta_general') {
          return r.category === 'meta_general' || r.category === 'ai_meta';
        }
        return r.category === state.activeCategoryScope;
      });
    }

    const sortMode = $('tableSortSelect').value;
    scopedList.sort((a, b) => {
      if (a.isPinnedLocked !== b.isPinnedLocked) return a.isPinnedLocked ? -1 : 1;
      if (sortMode === 'count_asc') return a.count - b.count;
      if (sortMode === 'artists_desc') return b.uniqueArtists - a.uniqueArtists || b.count - a.count;
      if (sortMode === 'avg_bmk_desc') return b.avgBookmarks - a.avgBookmarks || b.count - a.count;
      return b.count - a.count || b.uniqueArtists - a.uniqueArtists;
    });

    state.computedCoTags = scopedList;
    state.pairMatrix = pairMap;

    renderSubFiltersBar();
    renderTelemetry(activeWorks, fullList, scopedList);
    renderBarChart(scopedList);
    renderTable(scopedList);
    if (!$('artworksView').classList.contains('hidden')) {
      renderGallery();
    }
    if (!$('networkView').classList.contains('hidden')) {
      renderNetworkGraph();
    }
  }

  // =========================================================================
  // 5. RENDERING: STICKY BAR, TELEMETRY, TABLE, BAR CHART, GALLERY
  // =========================================================================
  function renderSubFiltersBar() {
    const bar = $('activeSubFiltersBar');
    const list = $('subFiltersList');
    if (state.lockedSubTags.size === 0) {
      bar.classList.add('hidden');
      list.innerHTML = '';
      return;
    }

    bar.classList.remove('hidden');
    const primary = state.rawDataset ? (state.rawDataset.primaryTag || state.rawDataset.meta?.queryTag || '') : '';
    const chips = [
      `<span class="subfilter-chip subfilter-chip--anchor">主: ${escapeHtml(primary)}</span>`
    ];
    for (const t of state.lockedSubTags) {
      chips.push(`
        <span class="subfilter-chip" data-unlock-tag="${escapeHtml(t)}" title="点击取消此必含筛选">
          + ${escapeHtml(t)} <button type="button">×</button>
        </span>
      `);
    }
    list.innerHTML = chips.join('');

    list.querySelectorAll('[data-unlock-tag]').forEach((el) => {
      el.addEventListener('click', () => {
        state.lockedSubTags.delete(el.dataset.unlockTag);
        showToast(`已取消必含筛选: [${el.dataset.unlockTag}]`);
        recomputeAndRender();
      });
    });
  }

  function renderTelemetry(activeWorks, fullList, scopedList) {
    const ds = state.rawDataset;
    if (!ds) return;

    const primaryTag = ds.primaryTag || ds.meta?.queryTag || '';
    const srcMeta = SOURCE_META[ds.source || state.source] || SOURCE_META.pixiv;
    const totalMatches = Number(ds.pixivTotal ?? ds.meta?.totalMatches ?? 0);
    const pagesScanned = ds.pagesScanned ?? ds.meta?.pagesFetched ?? 1;

    const lockedArr = Array.from(state.lockedSubTags);
    const titleStr = lockedArr.length > 0 ? `${primaryTag} + ${lockedArr.join('+')}` : primaryTag;
    $('statPrimaryTag').textContent = `[${srcMeta.label}] ${titleStr}`;
    const bd = ds.totalBreakdown || null;
    if (totalMatches > 0) {
      if (bd && bd.includesR18) {
        const parts = [`含R-18/AI ${totalMatches.toLocaleString()}`];
        if (bd.totalSafe > 0 && bd.totalSafe < totalMatches) parts.push(`全年龄 ${bd.totalSafe.toLocaleString()}`);
        if (bd.totalHuman > 0 && bd.totalHuman < totalMatches) parts.push(`纯手绘 ${bd.totalHuman.toLocaleString()}`);
        $('statTotalMatched').textContent = `(${parts.join(' · ')})`;
      } else if (bd && bd.isSafeBaselineOnly) {
        const humanPart = bd.totalHuman > 0 && bd.totalHuman < totalMatches ? `·纯手绘 ${bd.totalHuman.toLocaleString()}` : '';
        $('statTotalMatched').textContent = `(全年龄基准 ${totalMatches.toLocaleString()}${humanPart} · 含R-18更高)`;
      } else {
        $('statTotalMatched').textContent = `(全站 ${totalMatches.toLocaleString()})`;
      }
    } else if (ds.hasMore) {
      $('statTotalMatched').textContent = `(全站 ${activeWorks.length.toLocaleString()}+ 续翻中)`;
    } else {
      $('statTotalMatched').textContent = `(已采 ${activeWorks.length.toLocaleString()})`;
    }

    const uniqueArtists = new Set(activeWorks.map((w) => w.userId).filter(Boolean)).size;
    $('statSampledCount').textContent = `${activeWorks.length.toLocaleString()} 作`;
    $('statUniqueArtists').textContent = `(${uniqueArtists}画师/${pagesScanned}页)`;

    const totalTagsInWorks = activeWorks.reduce((acc, w) => acc + (w.tags ? w.tags.length : 0), 0);
    const avgTags = activeWorks.length > 0 ? (totalTagsInWorks / activeWorks.length).toFixed(1) : '0.0';
    $('statUniqueCoTags').textContent = `${fullList.length} 个`;
    $('statAvgTagsPerWork').textContent = `(可见${scopedList.length}·均${avgTags})`;

    const topUnlocked = scopedList.find((r) => !r.isPinnedLocked) || scopedList[0];
    if (topUnlocked) {
      const tr = topUnlocked.translation ? ` (${topUnlocked.translation})` : '';
      $('statTopCoTag').textContent = `${topUnlocked.tag}${tr}`;
      $('statTopCoRate').textContent = `${topUnlocked.count}次 (${topUnlocked.percentage}%)`;
    } else {
      $('statTopCoTag').textContent = '—';
      $('statTopCoRate').textContent = '—';
    }

    const allPool = ds.artworks || [];
    const poolAiCount = allPool.filter((w) => w.isAi).length;
    const excludeAi = $('excludeAiWorksCheck')?.checked;
    const aiWorksCount = activeWorks.filter((w) => w.isAi).length;
    const origCount = activeWorks.length - aiWorksCount;
    const origRate = activeWorks.length > 0 ? ((origCount / activeWorks.length) * 100).toFixed(1) : '100.0';
    $('statOriginalRate').textContent = `${origRate}%`;
    $('statAiBreakdown').textContent = excludeAi && poolAiCount > 0
      ? `(已剔AI ${poolAiCount})`
      : `(AI ${aiWorksCount})`;

    const isR18Work = (w) => Number(w.xRestrict || 0) > 0 || (Array.isArray(w.tags) && w.tags.some((t) => /^r-?18g?$/i.test(String(t))));
    const excludeR18 = Boolean($('excludeR18WorksCheck')?.checked);
    const poolR18Count = allPool.filter(isR18Work).length;
    const r18WorksCount = activeWorks.filter(isR18Work).length;
    const r18Pct = activeWorks.length > 0 ? ((r18WorksCount / activeWorks.length) * 100).toFixed(1) : '0.0';
    const humanPool = activeWorks.filter((w) => !w.isAi);
    const humanR18Count = humanPool.filter(isR18Work).length;
    const humanR18Pct = humanPool.length > 0 ? ((humanR18Count / humanPool.length) * 100).toFixed(1) : '0.0';
    if ($('statR18Rate')) $('statR18Rate').textContent = `${r18Pct}% (${r18WorksCount}作)`;
    if ($('statR18HumanSub')) {
      $('statR18HumanSub').textContent = excludeR18 && poolR18Count > 0
        ? `(已剔R-18 ${poolR18Count})`
        : `手绘${humanR18Pct}%`;
    }

    let minDateStr = '';
    let maxDateStr = '';
    for (const w of activeWorks) {
      const ymd = String(w.createDate || '').slice(0, 10);
      if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) continue;
      if (!minDateStr || ymd < minDateStr) minDateStr = ymd;
      if (!maxDateStr || ymd > maxDateStr) maxDateStr = ymd;
    }
    if ($('statDateSpan')) {
      $('statDateSpan').textContent = minDateStr && maxDateStr
        ? (minDateStr === maxDateStr ? minDateStr : `${minDateStr} ~ ${maxDateStr}`)
        : '—';
    }

    $('galleryTotalBadge').textContent = activeWorks.length;
  }

  function renderBarChart(scopedList) {
    const container = $('barChartContainer');
    const catMeta = CATEGORY_META[state.activeCategoryScope] || CATEGORY_META.all;
    $('activeCategoryLabel').textContent = catMeta.label;

    const top18 = scopedList.filter((r) => !r.isPinnedLocked).slice(0, 18);
    if (top18.length === 0) {
      container.innerHTML = `<div class="empty-placeholder">当前分类下暂无满足条件的共现标签</div>`;
      return;
    }

    const maxCount = top18[0].count || 1;
    container.innerHTML = top18
      .map((item, idx) => {
        const rankNum = idx + 1;
        const rankClass = rankNum <= 3 ? `rank-${rankNum}` : '';
        const widthPct = Math.max(4, Math.round((item.count / maxCount) * 100));
        const cVar = (CATEGORY_META[item.category] || CATEGORY_META.all).colorVar;

        return `
          <div class="chart-bar-row" data-inspect-tag="${escapeHtml(item.tag)}" title="点击查看 [${escapeHtml(item.tag)}] 的作品详情">
            <span class="chart-rank ${rankClass}">${String(rankNum).padStart(2, '0')}</span>
            <div class="chart-tag-info">
              <span class="chart-tag-name">${escapeHtml(item.tag)}</span>
              ${item.translation ? `<span class="chart-tag-trans">${escapeHtml(item.translation)}</span>` : ''}
            </div>
            <div class="chart-track">
              <div class="chart-fill" style="width:${widthPct}%; background:var(${cVar});"></div>
            </div>
            <div class="chart-stat-val">
              ${item.count}次<small>${item.percentage}%</small>
            </div>
          </div>
        `;
      })
      .join('');

    container.querySelectorAll('[data-inspect-tag]').forEach((row) => {
      row.addEventListener('click', () => openInspectorModal(row.dataset.inspectTag));
    });
  }

  // Compact Hepburn Kana -> Romaji converter for Japanese tags missing Pixiv/Danbooru translations
  const KANA_DIGRAPHS = {
    きゃ:'kya',きゅ:'kyu',きょ:'kyo',しゃ:'sha',しゅ:'shu',しょ:'sho',ちゃ:'cha',ちゅ:'chu',ちょ:'cho',
    にゃ:'nya',にゅ:'nyu',にょ:'nyo',ひゃ:'hya',ひゅ:'hyu',ひょ:'hyo',みゃ:'mya',みゅ:'myu',みょ:'myo',
    りゃ:'rya',りゅ:'ryu',りょ:'ryo',ぎゃ:'gya',ぎゅ:'gyu',ぎょ:'gyo',じゃ:'ja',じゅ:'ju',じょ:'jo',
    びゃ:'bya',びゅ:'byu',びょ:'byo',ぴゃ:'pya',ぴゅ:'pyu',ぴょ:'pyo',
    ふぁ:'fa',ふぃ:'fi',ふぇ:'fe',ふぉ:'fo',てぃ:'ti',でぃ:'di',うぃ:'wi',うぇ:'we',うぉ:'wo',
    ゔぁ:'va',ゔぃ:'vi',ゔぇ:'ve',ゔぉ:'vo',しぇ:'she',ちぇ:'che',じぇ:'je',つぁ:'tsa',つぇ:'tse',つぉ:'tso'
  };
  const KANA_SINGLE = {
    あ:'a',い:'i',う:'u',え:'e',お:'o',か:'ka',き:'ki',く:'ku',け:'ke',こ:'ko',
    さ:'sa',し:'shi',す:'su',せ:'se',そ:'so',た:'ta',ち:'chi',つ:'tsu',て:'te',と:'to',
    な:'na',に:'ni',ぬ:'nu',ね:'ne',の:'no',は:'ha',ひ:'hi',ふ:'fu',へ:'he',ほ:'ho',
    ま:'ma',み:'mi',む:'mu',め:'me',も:'mo',や:'ya',ゆ:'yu',よ:'yo',
    ら:'ra',り:'ri',る:'ru',れ:'re',ろ:'ro',わ:'wa',ゐ:'wi',ゑ:'we',を:'wo',ん:'n',
    が:'ga',ぎ:'gi',ぐ:'gu',げ:'ge',ご:'go',ざ:'za',じ:'ji',ず:'zu',ぜ:'ze',ぞ:'zo',
    だ:'da',ぢ:'ji',づ:'zu',で:'de',ど:'do',ば:'ba',び:'bi',ぶ:'bu',べ:'be',ぼ:'bo',
    ぱ:'pa',ぴ:'pi',ぷ:'pu',ぺ:'pe',ぽ:'po',ゔ:'vu',
    ぁ:'a',ぃ:'i',ぅ:'u',ぇ:'e',ぉ:'o',ゃ:'ya',ゅ:'yu',ょ:'yo',ゎ:'wa'
  };
  function kanaToRomaji(raw) {
    const s = String(raw || '').trim();
    // Only transliterate pure Kana (+ punctuation/middle-dot/ASCII) so Kanji compounds aren't mangled
    if (!s || /[\u4E00-\u9FFF]/.test(s) || !/[\u3040-\u30FF]/.test(s)) return '';
    // Normalize Katakana -> Hiragana
    const hira = s.replace(/[\u30A1-\u30F6]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
    let out = '';
    for (let i = 0; i < hira.length; i++) {
      const c = hira[i];
      if (c === 'っ') {
        const next2 = KANA_DIGRAPHS[hira.slice(i + 1, i + 3)] || KANA_SINGLE[hira[i + 1]] || '';
        if (next2) out += next2[0] === 'c' ? 't' : next2[0];
        continue;
      }
      if (c === 'ー') {
        const last = out[out.length - 1];
        if (last && 'aeiou'.includes(last)) out += last;
        continue;
      }
      if (c === '・' || c === '·' || c === '　') {
        out += ' ';
        continue;
      }
      const pair = hira.slice(i, i + 2);
      if (KANA_DIGRAPHS[pair]) {
        out += KANA_DIGRAPHS[pair];
        i++;
      } else if (KANA_SINGLE[c]) {
        out += KANA_SINGLE[c];
      } else {
        out += c;
      }
    }
    return out.replace(/\s+/g, ' ').trim();
  }

  // Phonetic Romaji normalizer so Hepburn / Kunrei / Pixiv CPS / Danbooru spellings all match cleanly
  // (e.g. `tamakiiroha` == `tamaki_iroha`, `magireco` == `magireko`, `kyuapi-su` == `kyuapiisu`)
  function normRomajiKey(raw) {
    return String(raw || '')
      .toLowerCase()
      .replace(/[\s_\-·・'’`"()（）\[\]]+/g, '')
      .replace(/l/g, 'r')
      .replace(/shi/g, 'si')
      .replace(/chi/g, 'ti')
      .replace(/tsu/g, 'tu')
      .replace(/fu/g, 'hu')
      .replace(/ji/g, 'zi')
      .replace(/sha/g, 'sya')
      .replace(/shu/g, 'syu')
      .replace(/sho/g, 'syo')
      .replace(/cha/g, 'tya')
      .replace(/chu/g, 'tyu')
      .replace(/cho/g, 'tyo')
      .replace(/ja/g, 'zya')
      .replace(/ju/g, 'zyu')
      .replace(/jo/g, 'zyo')
      .replace(/ca/g, 'ka')
      .replace(/co/g, 'ko')
      .replace(/cu/g, 'ku')
      .replace(/nn/g, 'n')
      .replace(/ou|oo|oh/g, 'o')
      .replace(/uu/g, 'u')
      .replace(/aa/g, 'a')
      .replace(/ee/g, 'e')
      .replace(/ii/g, 'i');
  }

  const _tableCpsCache = new Map();
  let _tableCpsTimer = null;

  function scheduleTableCpsLookup(keyword) {
    const q = String(keyword || '').trim().toLowerCase();
    if (!q || q.length < 2) return;
    if ((state.rawDataset?.source || state.source || 'pixiv') !== 'pixiv') return;
    // Trigger Pixiv official /rpc/cps.php lookup for Romaji/English/Chinese keywords so Kanji tags
    // (e.g. `hadaka`->`裸`, `rakugaki`->`落書き`, `tamakiiroha`->`環いろは`, `megaha-to`->`目がハート`) match cleanly!
    const isAscii = /^[a-z0-9\s\-_'.]+$/i.test(q);
    const hasCjkNoKana = /[\u4E00-\u9FFF]/.test(q) && !/[\u3040-\u30FF]/.test(q);
    if (!isAscii && !hasCjkNoKana) return;
    if (_tableCpsCache.has(q)) return;
    if (_tableCpsTimer) clearTimeout(_tableCpsTimer);
    _tableCpsTimer = setTimeout(async () => {
      _tableCpsTimer = null;
      if (_tableCpsCache.has(q)) return;
      const hitSet = new Set();
      try {
        let cands = [];
        if (state.bridgeFetchAvailable && typeof window._pixezBridgeFetch === 'function') {
          const r = await window._pixezBridgeFetch(
            `https://www.pixiv.net/rpc/cps.php?keyword=${encodeURIComponent(q)}&lang=zh`,
            { timeout: 5000 }
          );
          if (Array.isArray(r?.json?.candidates)) cands = r.json.candidates;
        }
        if (!cands.length) {
          const r = await apiFetch(`/api/pixiv/autocomplete?source=pixiv&q=${encodeURIComponent(q)}`);
          if (r.ok) {
            const d = await r.json();
            cands = d.candidates || d.tags || [];
          }
        }
        for (const c of cands) {
          const tn = String(c?.tag_name || c?.name || '').trim();
          if (tn) hitSet.add(tn.toLowerCase());
        }
      } catch (_) {}
      _tableCpsCache.set(q, hitSet);
      if (hitSet.size > 0 && ($('tableFilterInput')?.value || '').trim().toLowerCase() === q) {
        renderTable();
      }
    }, 200);
  }

  function renderTable(scopedList) {
    const tbody = $('coTagTableBody');
    const keyword = $('tableFilterInput').value.trim().toLowerCase();

    // Stamp TRUE original rank BEFORE applying search filter so searched tags keep their real rank!
    let origRankSeq = 0;
    const rankedAll = scopedList.map((item) => ({
      item,
      origRank: item.isPinnedLocked ? 0 : ++origRankSeq
    }));

    if (keyword) scheduleTableCpsLookup(keyword);
    const normKw = keyword ? normRomajiKey(keyword) : '';
    const cpsHitSet = keyword ? _tableCpsCache.get(keyword) : null;
    const filtered = rankedAll.filter(({ item }) => {
      if (item.isPinnedLocked) return true;
      if (keyword) {
        const tagLow = item.tag.toLowerCase();
        const trLow = (item.translation || '').toLowerCase();
        const dbLow = (item.danbooruTag || '').toLowerCase();
        if (tagLow.includes(keyword) || trLow.includes(keyword) || dbLow.includes(keyword)) return true;
        if (dbLow && dbLow.replace(/_/g, ' ').includes(keyword)) return true;
        if (cpsHitSet && cpsHitSet.has(tagLow)) return true;
        // ALWAYS compute Kana Romaji even when translation or danbooruTag exists!
        const rom = kanaToRomaji(item.tag).toLowerCase();
        if (rom && rom.includes(keyword)) return true;
        if (normKw.length >= 2) {
          if (rom && normRomajiKey(rom).includes(normKw)) return true;
          if (dbLow && normRomajiKey(dbLow).includes(normKw)) return true;
          if (trLow && /[a-z]/.test(trLow) && normRomajiKey(trLow).includes(normKw)) return true;
        }
        return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-cell">未找到匹配的共现标签</td></tr>`;
      return;
    }

    const firstUnlocked = scopedList.find((x) => !x.isPinnedLocked) || scopedList[0];
    const maxCount = (firstUnlocked && firstUnlocked.count) || filtered[0].item.count || 1;

    const visibleRows = filtered.slice(0, state.tableDisplayLimit);
    const hasMore = filtered.length > visibleRows.length;

    // On-demand Danbooru Wiki enrichment for ALL currently visible / searched rows (even rank #300 ~ #5000!)
    scheduleVisibleDanbooruEnrich(visibleRows.map((e) => e.item));

    tbody.innerHTML = visibleRows
      .map(({ item, origRank }) => {
        const rankBadgeClass = !item.isPinnedLocked && origRank <= 3 ? `top-${origRank}` : '';
        const rankLabel = item.isPinnedLocked ? '锁' : String(origRank).padStart(2, '0');

        const catInfo = CATEGORY_META[item.category] || CATEGORY_META.meta_general;
        const barW = Math.max(3, Math.round((item.count / maxCount) * 100));
        const inBasket = state.basket.has(item.tag);

        const thirdDesktopHtml = (item.thirdTags || [])
          .slice(0, 3)
          .map(
            (t3) =>
              `<span class="third-mini-chip" data-lock-third="${escapeHtml(t3.tag)}" title="点击叠加必含筛选 [${escapeHtml(t3.tag)}]">${escapeHtml(t3.tag)}<b>${t3.count}</b></span>`
          )
          .join('');

        const thirdMobileHtml = (item.thirdTags || [])
          .slice(0, 2)
          .map(
            (t3) =>
              `<span class="third-mini-chip" data-lock-third="${escapeHtml(t3.tag)}" title="伴生3阶Tag: 点击叠加必含筛选">+${escapeHtml(t3.tag)}<b>${t3.count}</b></span>`
          )
          .join('');

        const dbCacheEntry = state.danbooruCache[item.tag];
        const fallbackRomaji = !item.translation && !item.danbooruTag ? kanaToRomaji(item.tag) : '';
        const displayTrans =
          item.translation ||
          dbCacheEntry?.zhAlias ||
          (item.danbooruTag ? item.danbooruTag.replace(/_/g, ' ') : '') ||
          fallbackRomaji;
        const dbBadgeHtml = item.danbooruTag
          ? `<a class="danbooru-badge" href="https://danbooru.donmai.us/posts?tags=${encodeURIComponent(item.danbooruTag)}" target="_blank" rel="noopener" title="Danbooru / NovelAI 英文词条">${escapeHtml(item.danbooruTag)}</a>`
          : '';

        return `
          <tr class="${item.isPinnedLocked ? 'pinned-locked-row' : ''}">
            <td class="col-rank"><span class="rank-badge ${rankBadgeClass}">${rankLabel}</span></td>
            <td class="col-tag">
              <div class="tag-cell-main">
                <span class="tag-name-link" data-inspect="${escapeHtml(item.tag)}">${escapeHtml(item.tag)}</span>
                ${displayTrans && displayTrans.toLowerCase() !== item.tag.toLowerCase() ? `<span class="tag-trans-badge">${escapeHtml(displayTrans)}</span>` : ''}
                ${dbBadgeHtml}
                ${thirdMobileHtml ? `<div class="inline-third-mobile">${thirdMobileHtml}</div>` : ''}
              </div>
            </td>
            <td class="col-cat">
              <span class="cat-badge cat-${item.category}" data-cycle-cat="${escapeHtml(item.tag)}" title="点击切换该标签的语义分类">${catInfo.short}</span>
            </td>
            <td class="col-stat">
              <div class="stat-combined-cell">
                <div class="stat-combined-top">
                  <span class="count-number">${item.count}次</span>
                  <span class="freq-pct">${item.percentage}%</span>
                  <span class="artist-sub">${item.uniqueArtists}人</span>
                </div>
                <div class="freq-mini-bar">
                  <div class="freq-mini-fill" style="width:${barW}%; background:var(${catInfo.colorVar});"></div>
                </div>
              </div>
            </td>
            <td class="col-third td-third-desktop">
              <div class="third-col-cell">${thirdDesktopHtml || '<span style="color:var(--t-muted)">—</span>'}</div>
            </td>
            <td class="col-act text-right">
              <div class="row-actions">
                <button class="t-btn t-btn--sm" data-inspect="${escapeHtml(item.tag)}" type="button" title="弹窗查看包含该标签的作品与详情">看图</button>
                <button class="t-btn t-btn--sm ${item.isPinnedLocked ? 't-btn--danger' : ''}" data-lock="${escapeHtml(item.tag)}" type="button" title="在当前样本中要求必含该标签">${item.isPinnedLocked ? '✓已锁' : '+必含'}</button>
                <button class="t-btn t-btn--sm" data-pivot="${escapeHtml(item.tag)}" type="button" title="单独以此标签重新发起采样">搜Tag</button>
                <button class="t-btn t-btn--sm ${inBasket ? 't-btn--primary' : ''}" data-basket="${escapeHtml(item.tag)}" type="button" title="加入或移出标签收集篮">${inBasket ? '✓已收' : '+收集'}</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('') + (hasMore ? `<tr class="table-load-more-row"><td colspan="6"><button class="t-btn t-btn--sm" id="loadMoreTableRowsBtn" type="button">展开更多标签 (还有 ${filtered.length - visibleRows.length} 条)</button></td></tr>` : '');

    if ($('loadMoreTableRowsBtn')) {
      $('loadMoreTableRowsBtn').addEventListener('click', () => {
        state.tableDisplayLimit += 180;
        renderTable(state.computedCoTags);
      });
    }
    if (opticalScrollUpdater) requestAnimationFrame(opticalScrollUpdater);

    tbody.querySelectorAll('[data-inspect]').forEach((el) => {
      el.addEventListener('click', () => openInspectorModal(el.dataset.inspect));
    });

    tbody.querySelectorAll('[data-cycle-cat]').forEach((el) => {
      el.addEventListener('click', () => cycleTagCategory(el.dataset.cycleCat));
    });

    tbody.querySelectorAll('[data-lock]').forEach((el) => {
      el.addEventListener('click', () => {
        const t = el.dataset.lock;
        if (state.lockedSubTags.has(t)) {
          state.lockedSubTags.delete(t);
          showToast(`已取消必含筛选: [${t}]`);
        } else {
          state.lockedSubTags.add(t);
          showToast(`已叠加必含筛选 [${t}] (顶部悬浮栏可随时取消)`);
        }
        recomputeAndRender();
      });
    });

    tbody.querySelectorAll('[data-lock-third]').forEach((el) => {
      el.addEventListener('click', () => {
        const t = el.dataset.lockThird;
        if (!state.lockedSubTags.has(t)) {
          state.lockedSubTags.add(t);
          showToast(`已叠加必含子标签 [${t}]`);
          recomputeAndRender();
        }
      });
    });

    tbody.querySelectorAll('[data-pivot]').forEach((el) => {
      el.addEventListener('click', () => {
        const nextTag = el.dataset.pivot;
        $('tagSearchInput').value = nextTag;
        state.lockedSubTags.clear();
        hideAutocomplete();
        $('queryConsolePanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        showToast(`已填入目标标签 [${nextTag}]，请确认采集深度后点击「开始采样」`);
      });
    });

    tbody.querySelectorAll('[data-basket]').forEach((el) => {
      el.addEventListener('click', () => {
        const t = el.dataset.basket;
        if (state.basket.has(t)) {
          state.basket.delete(t);
          showToast(`已从收集篮移除: ${t}`);
        } else {
          state.basket.add(t);
          showToast(`已加入收集篮: ${t}`);
        }
        saveBasket();
        renderTable(state.computedCoTags);
      });
    });
  }

  // =========================================================================
  // 6. ARTWORKS GALLERY, SORTING & OPTICAL ISOLATED VIEWER
  // =========================================================================
  function artworkTimeKey(w) {
    if (w && w.createDate) {
      const ts = Date.parse(w.createDate);
      if (Number.isFinite(ts) && ts > 0) return ts;
    }
    const raw = String((w && (w.externalId || w.id)) || '');
    const digits = raw.replace(/\D+/g, '');
    return digits ? Number(digits) : 0;
  }

  function artworkPopKey(w) {
    return Number((w && (w.bookmarkCount ?? w.totalBookmarks ?? w.score)) || 0);
  }

  function sortArtworksList(list, sortBy = 'date_desc') {
    const arr = [...(list || [])];
    arr.sort((a, b) => {
      if (sortBy === 'date_asc') return artworkTimeKey(a) - artworkTimeKey(b);
      if (sortBy === 'bmk_desc') return artworkPopKey(b) - artworkPopKey(a) || artworkTimeKey(b) - artworkTimeKey(a);
      if (sortBy === 'bmk_asc') return artworkPopKey(a) - artworkPopKey(b) || artworkTimeKey(a) - artworkTimeKey(b);
      if (sortBy === 'page_desc') return (b.pageCount || 1) - (a.pageCount || 1) || artworkPopKey(b) - artworkPopKey(a);
      return artworkTimeKey(b) - artworkTimeKey(a);
    });
    return arr;
  }

  function createArtworkCardHtml(w, highlightTags = [], eager = false) {
    const hiSet = new Set(highlightTags.map((t) => t.toLowerCase()));
    const badges = [];
    if (w.xRestrict >= 1 || (w.tags && w.tags.includes('R-18'))) {
      badges.push(`<span class="art-badge art-badge--r18">R-18</span>`);
    }
    if (w.illustType === 2) {
      badges.push(`<span class="art-badge art-badge--ugoira">动图</span>`);
    } else if (w.pageCount > 1) {
      badges.push(`<span class="art-badge">${w.pageCount}P</span>`);
    }
    if (w.isAi) {
      badges.push(`<span class="art-badge">AI</span>`);
    }

    const miniTags = (w.tags || [])
      .slice(0, 5)
      .map((t) => {
        const isHi = hiSet.has(t.toLowerCase());
        return `<span class="art-tag-pill ${isHi ? 'highlight' : ''}" data-card-tag="${escapeHtml(t)}">${escapeHtml(t)}</span>`;
      })
      .join('');

    const srcKey = w.source || state.rawDataset?.source || 'pixiv';
    const srcMeta = SOURCE_META[srcKey] || SOURCE_META.pixiv;
    const extUrl = w.externalUrl || `https://www.pixiv.net/artworks/${encodeURIComponent(w.id)}`;
    const popLabel = srcKey === 'pixiv' ? '收藏' : '热度';

    return `
      <article class="artwork-card" data-illust-id="${escapeHtml(w.id)}">
        <div class="artwork-thumb-box clean-optical-media" data-open-viewer="${escapeHtml(w.id)}">
          <div class="artwork-badges">${badges.join('')}</div>
          <img class="clean-optical-media" src="${proxyImg(w.thumbUrl)}" data-fallback-src="${escapeHtml(directFallbackImg(w.thumbUrl))}" alt="${escapeHtml(w.title)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async" />
        </div>
        <div class="artwork-meta">
          <div class="artwork-title" data-open-viewer="${escapeHtml(w.id)}" title="${escapeHtml(w.title)}">${escapeHtml(w.title || '无题')}</div>
          <div class="artwork-artist">${escapeHtml(w.userName || srcMeta.label)} · ${popLabel} ${artworkPopKey(w).toLocaleString()}</div>
          <div class="artwork-tags-mini">${miniTags}</div>
          <div class="artwork-card-actions">
            <button class="t-btn t-btn--sm t-btn--primary" data-open-viewer="${escapeHtml(w.id)}" type="button">看高清原图</button>
            <a class="t-btn t-btn--sm" href="${escapeHtml(extUrl)}" target="_blank" rel="noopener">${srcMeta.linkLabel}</a>
          </div>
        </div>
      </article>
    `;
  }

  function bindArtworkCardEvents(container) {
    container.querySelectorAll('img[data-fallback-src]').forEach((img) => {
      img.addEventListener('error', () => {
        const fb = img.dataset.fallbackSrc;
        if (fb && img.src !== fb) {
          img.dataset.fallbackSrc = '';
          img.src = fb;
        }
      });
    });
    container.querySelectorAll('[data-open-viewer]').forEach((el) => {
      el.addEventListener('click', () => openIllustViewer(el.dataset.openViewer));
    });
    container.querySelectorAll('[data-card-tag]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const t = el.dataset.cardTag;
        if (!state.lockedSubTags.has(t)) {
          state.lockedSubTags.add(t);
          showToast(`已叠加必含标签筛选: [${t}]`);
          recomputeAndRender();
        }
      });
    });
  }

  function renderGallery(resetPage = false) {
    const grid = $('artworkGalleryGrid');
    if (!grid) return;

    const q = $('galleryTagFilterInput').value.trim().toLowerCase();
    const typeFilter = $('galleryTypeFilterSelect').value;
    const sortBy = $('gallerySortSelect').value;
    const pageSize = Math.max(24, parseInt($('galleryPageSizeSelect')?.value || '60', 10) || 60);

    let list = (state.filteredArtworks || []).filter((w) => {
      if (typeFilter !== 'all' && String(w.illustType) !== typeFilter) return false;
      if (q) {
        const inTitle = (w.title || '').toLowerCase().includes(q);
        const inUser = (w.userName || '').toLowerCase().includes(q);
        const inTags = (w.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!inTitle && !inUser && !inTags) return false;
      }
      return true;
    });

    list = sortArtworksList(list, sortBy);

    const pager = $('galleryPaginationBar');
    if (list.length === 0) {
      grid.innerHTML = `<div class="empty-placeholder">暂无匹配的作品样本</div>`;
      if (pager) pager.classList.add('hidden');
      return;
    }

    const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
    if (resetPage || !state.galleryPage) state.galleryPage = 1;
    if (state.galleryPage > totalPages) state.galleryPage = totalPages;
    if (state.galleryPage < 1) state.galleryPage = 1;

    const startIdx = (state.galleryPage - 1) * pageSize;
    const pageItems = list.slice(startIdx, startIdx + pageSize);
    const hiTags = [state.rawDataset?.primaryTag || '', ...Array.from(state.lockedSubTags)];
    grid.innerHTML = pageItems.map((w, idx) => createArtworkCardHtml(w, hiTags, idx < 12)).join('');
    bindArtworkCardEvents(grid);

    if (pager) {
      if (totalPages > 1) {
        pager.classList.remove('hidden');
        pager.innerHTML = `
          <button class="t-btn t-btn--sm" type="button" data-gpage="1" ${state.galleryPage <= 1 ? 'disabled' : ''}>首页</button>
          <button class="t-btn t-btn--sm" type="button" data-gpage="${state.galleryPage - 1}" ${state.galleryPage <= 1 ? 'disabled' : ''}>上一页</button>
          <span class="gallery-pager-info">第 <strong>${state.galleryPage}</strong> / ${totalPages} 页 · 共 ${list.length.toLocaleString()} 作</span>
          <button class="t-btn t-btn--sm" type="button" data-gpage="${state.galleryPage + 1}" ${state.galleryPage >= totalPages ? 'disabled' : ''}>下一页</button>
          <button class="t-btn t-btn--sm" type="button" data-gpage="${totalPages}" ${state.galleryPage >= totalPages ? 'disabled' : ''}>末页</button>
        `;
        pager.querySelectorAll('[data-gpage]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const p = parseInt(btn.dataset.gpage, 10);
            if (!Number.isFinite(p) || p === state.galleryPage) return;
            state.galleryPage = Math.max(1, Math.min(totalPages, p));
            renderGallery(false);
            grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        });
      } else {
        pager.classList.add('hidden');
      }
    }
  }

  // =========================================================================
  // 7. DEEP INSPECTOR MODAL (WITH FULL SORTING: TIME ASC/DESC, POPULARITY ASC/DESC, PAGES)
  // =========================================================================
  function renderInspectorArtworks() {
    const tag = state.inspectorTag;
    if (!tag || !state.rawDataset) return;
    const sortBy = $('modalArtworksSortSelect')?.value || 'date_desc';
    const typeFilter = $('modalArtworksTypeSelect')?.value || 'all';

    let matchingWorks = (state.filteredArtworks || []).filter((w) => {
      if (!(w.tags || []).includes(tag)) return false;
      if (typeFilter !== 'all' && String(w.illustType) !== typeFilter) return false;
      return true;
    });
    matchingWorks = sortArtworksList(matchingWorks, sortBy);
    $('modalArtworkCount').textContent = matchingWorks.length;

    const worksGrid = $('modalArtworksGrid');
    const shown = matchingWorks.slice(0, state.inspectorLimit);
    if (shown.length === 0) {
      worksGrid.innerHTML = `<div class="empty-placeholder">当前筛选条件下暂无作品</div>`;
    } else {
      worksGrid.innerHTML = shown
        .map((w, idx) => createArtworkCardHtml(w, [state.rawDataset.primaryTag, tag], idx < 8))
        .join('');
      bindArtworkCardEvents(worksGrid);
    }

    const moreWrap = $('modalArtworksMoreWrap');
    const moreBtn = $('modalArtworksLoadMoreBtn');
    if (moreWrap && moreBtn) {
      const rem = matchingWorks.length - shown.length;
      if (rem > 0) {
        moreWrap.classList.remove('hidden');
        moreBtn.textContent = `加载更多作品 (还有 ${rem} 件)`;
      } else {
        moreWrap.classList.add('hidden');
      }
    }
  }

  function openInspectorModal(tag) {
    const item = state.computedCoTags.find((r) => r.tag === tag);
    if (!item || !state.rawDataset) return;

    state.inspectorTag = tag;
    state.inspectorLimit = 36;

    const modal = $('inspectModal');
    const trText = item.translation ? ` (${item.translation})` : '';
    const dbText = item.danbooruTag ? ` // Danbooru: ${item.danbooruTag}` : '';
    $('modalTitle').textContent = `#${item.tag}${trText}${dbText}`;

    $('modalStatsRow').innerHTML = `
      <div class="ins-stat-box">
        <span class="ins-stat-label">共同出现作品数</span>
        <strong class="ins-stat-val">${item.count} 件</strong>
      </div>
      <div class="ins-stat-box">
        <span class="ins-stat-label">共现占比</span>
        <strong class="ins-stat-val">${item.percentage}%</strong>
      </div>
      <div class="ins-stat-box">
        <span class="ins-stat-label">涉及独立画师</span>
        <strong class="ins-stat-val">${item.uniqueArtists} 位</strong>
      </div>
      <div class="ins-stat-box">
        <span class="ins-stat-label">语义分类</span>
        <strong class="ins-stat-val">${CATEGORY_META[item.category]?.label || '其他'}</strong>
      </div>
    `;

    const thirdContainer = $('modalThirdTags');
    if (item.thirdTags && item.thirdTags.length > 0) {
      thirdContainer.innerHTML = item.thirdTags
        .map((t3, idx) => {
          const pct = item.count > 0 ? ((t3.count / item.count) * 100).toFixed(1) : '0.0';
          return `
            <div class="third-tag-card" data-modal-lock="${escapeHtml(t3.tag)}">
              <span>${String(idx + 1).padStart(2, '0')}</span>
              <strong>${escapeHtml(t3.tag)}</strong>
              <span>${t3.count}次 (${pct}%)</span>
            </div>
          `;
        })
        .join('');

      thirdContainer.querySelectorAll('[data-modal-lock]').forEach((card) => {
        card.addEventListener('click', () => {
          state.lockedSubTags.add(tag);
          state.lockedSubTags.add(card.dataset.modalLock);
          modal.classList.add('hidden');
          showToast(`已叠加筛选: [${tag} + ${card.dataset.modalLock}]`);
          recomputeAndRender();
        });
      });
    } else {
      thirdContainer.innerHTML = `<span style="color:var(--t-muted)">暂无显著的三阶伴生标签</span>`;
    }

    renderInspectorArtworks();
    modal.classList.remove('hidden');
  }

  // =========================================================================
  // 8. HD ARTWORK VIEWER & UGOIRA ANIMATION SYNTHESIZER (PIXIV + MULTI-BOORU)
  // =========================================================================
  function stopUgoiraTimer() {
    if (state.viewer.ugoiraTimer) {
      clearTimeout(state.viewer.ugoiraTimer);
      state.viewer.ugoiraTimer = null;
    }
    if (Array.isArray(state.viewer.ugoiraObjectUrls)) {
      for (const u of state.viewer.ugoiraObjectUrls) {
        try { URL.revokeObjectURL(u); } catch (_) {}
      }
      state.viewer.ugoiraObjectUrls = [];
    }
    state.viewer.ugoiraFrames = null;
    state.viewer.ugoiraIllustId = null;
  }

  // Pure-browser PKZIP unpacker (reads Central Directory; supports STORE=0 & DEFLATE=8 via DecompressionStream)
  async function unpackZipEntriesInBrowser(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    // Locate End of Central Directory (0x06054b50)
    let eocdOffset = -1;
    const minSearch = Math.max(0, bytes.length - 65557);
    for (let i = bytes.length - 22; i >= minSearch; i--) {
      if (dv.getUint32(i, true) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }
    const entries = new Map();
    const dec = new TextDecoder('utf-8');
    const inflateRaw = async (chunk) => {
      if (typeof DecompressionStream !== 'function') {
        throw new Error('当前浏览器不支持内置 deflate-raw 解压');
      }
      const ds = new DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();
      writer.write(chunk);
      writer.close();
      const out = await new Response(ds.readable).arrayBuffer();
      return new Uint8Array(out);
    };

    if (eocdOffset >= 0) {
      const cdOffset = dv.getUint32(eocdOffset + 16, true);
      const totalEntries = dv.getUint16(eocdOffset + 10, true);
      let ptr = cdOffset;
      for (let idx = 0; idx < totalEntries && ptr + 46 <= bytes.length; idx++) {
        if (dv.getUint32(ptr, true) !== 0x02014b50) break;
        const method = dv.getUint16(ptr + 10, true);
        const compSize = dv.getUint32(ptr + 20, true);
        const nameLen = dv.getUint16(ptr + 28, true);
        const extraLen = dv.getUint16(ptr + 30, true);
        const commentLen = dv.getUint16(ptr + 32, true);
        const localHeaderOffset = dv.getUint32(ptr + 42, true);
        const name = dec.decode(bytes.subarray(ptr + 46, ptr + 46 + nameLen));
        ptr += 46 + nameLen + extraLen + commentLen;

        if (localHeaderOffset + 30 > bytes.length) continue;
        if (dv.getUint32(localHeaderOffset, true) !== 0x04034b50) continue;
        const lhNameLen = dv.getUint16(localHeaderOffset + 26, true);
        const lhExtraLen = dv.getUint16(localHeaderOffset + 28, true);
        const dataStart = localHeaderOffset + 30 + lhNameLen + lhExtraLen;
        const dataEnd = dataStart + compSize;
        if (dataEnd > bytes.length) continue;
        const rawSlice = bytes.subarray(dataStart, dataEnd);
        if (method === 0) {
          entries.set(name, rawSlice);
        } else if (method === 8) {
          entries.set(name, await inflateRaw(rawSlice));
        }
      }
    }
    return entries;
  }

  // Self-contained pure-JS GIF89a Encoder (Median-Cut 256-color palette + variable-bit LZW + NETSCAPE2.0 loop)
  async function synthesizeUgoiraGifBlob(frames, onProgress) {
    if (!Array.isArray(frames) || !frames.length) {
      throw new Error('无可用动图帧');
    }
    const srcW = frames[0].img.naturalWidth || frames[0].img.width || 480;
    const srcH = frames[0].img.naturalHeight || frames[0].img.height || 480;
    const maxEdge = 600;
    const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
    const width = Math.max(1, Math.round(srcW * scale));
    const height = Math.max(1, Math.round(srcH * scale));

    const off = document.createElement('canvas');
    off.width = width;
    off.height = height;
    const ctx = off.getContext('2d', { willReadFrequently: true });

    // 1. Sample colors across up to 16 evenly spaced frames into a 5-5-5 RGB histogram (32,768 bins)
    const hist = new Uint32Array(32768);
    const sampleStep = Math.max(1, Math.floor(frames.length / 16));
    const pixelStep = Math.max(1, Math.floor((width * height) / 14000));
    for (let f = 0; f < frames.length; f += sampleStep) {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(frames[f].img, 0, 0, width, height);
      const data = ctx.getImageData(0, 0, width, height).data;
      for (let i = 0; i < data.length; i += 4 * pixelStep) {
        const key = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
        hist[key]++;
      }
    }

    // 2. Median-cut quantization into 256 palette entries
    const activeBins = [];
    for (let k = 0; k < 32768; k++) {
      if (hist[k] > 0) {
        activeBins.push({
          r: ((k >> 10) & 31) * 8 + 4,
          g: ((k >> 5) & 31) * 8 + 4,
          b: (k & 31) * 8 + 4,
          count: hist[k]
        });
      }
    }
    const boxes = [activeBins.length ? activeBins : [{ r: 0, g: 0, b: 0, count: 1 }]];
    while (boxes.length < 256) {
      let bestIdx = -1;
      let bestScore = -1;
      let bestChan = 'r';
      for (let i = 0; i < boxes.length; i++) {
        const box = boxes[i];
        if (box.length <= 1) continue;
        let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0, total = 0;
        for (let j = 0; j < box.length; j++) {
          const c = box[j];
          if (c.r < rMin) rMin = c.r;
          if (c.r > rMax) rMax = c.r;
          if (c.g < gMin) gMin = c.g;
          if (c.g > gMax) gMax = c.g;
          if (c.b < bMin) bMin = c.b;
          if (c.b > bMax) bMax = c.b;
          total += c.count;
        }
        const rr = rMax - rMin;
        const gr = gMax - gMin;
        const br = bMax - bMin;
        const maxRange = Math.max(rr, gr, br);
        const score = maxRange * Math.log2(total + 2);
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
          bestChan = rr >= gr && rr >= br ? 'r' : (gr >= br ? 'g' : 'b');
        }
      }
      if (bestIdx < 0) break;
      const box = boxes[bestIdx];
      box.sort((a, b) => a[bestChan] - b[bestChan]);
      let total = 0;
      for (let j = 0; j < box.length; j++) total += box[j].count;
      let acc = 0;
      let mid = 1;
      for (let j = 0; j < box.length - 1; j++) {
        acc += box[j].count;
        if (acc >= total / 2) {
          mid = j + 1;
          break;
        }
      }
      boxes.splice(bestIdx, 1, box.slice(0, mid), box.slice(mid));
    }

    const palette = new Uint8Array(256 * 3);
    const palLen = boxes.length;
    for (let i = 0; i < palLen; i++) {
      const box = boxes[i];
      let rs = 0, gs = 0, bs = 0, cnt = 0;
      for (let j = 0; j < box.length; j++) {
        rs += box[j].r * box[j].count;
        gs += box[j].g * box[j].count;
        bs += box[j].b * box[j].count;
        cnt += box[j].count;
      }
      palette[i * 3] = cnt ? Math.round(rs / cnt) : 0;
      palette[i * 3 + 1] = cnt ? Math.round(gs / cnt) : 0;
      palette[i * 3 + 2] = cnt ? Math.round(bs / cnt) : 0;
    }

    // Fast 5-5-5 RGB -> nearest palette index lookup cache
    const lut = new Int16Array(32768).fill(-1);
    const mapRgb555 = (r5, g5, b5) => {
      const key = (r5 << 10) | (g5 << 5) | b5;
      const cached = lut[key];
      if (cached >= 0) return cached;
      const r = r5 * 8 + 4;
      const g = g5 * 8 + 4;
      const b = b5 * 8 + 4;
      let best = 0;
      let bestD = 0x7fffffff;
      for (let i = 0; i < palLen; i++) {
        const dr = r - palette[i * 3];
        const dg = g - palette[i * 3 + 1];
        const db = b - palette[i * 3 + 2];
        const d = dr * dr * 2 + dg * dg * 4 + db * db;
        if (d < bestD) {
          bestD = d;
          best = i;
          if (d === 0) break;
        }
      }
      lut[key] = best;
      return best;
    };

    const chunks = [];
    const pushBytes = (arr) => chunks.push(arr instanceof Uint8Array ? arr : new Uint8Array(arr));
    const u16 = (v) => [v & 0xff, (v >> 8) & 0xff];

    // GIF89a Header + Logical Screen Descriptor (256-color Global Color Table)
    pushBytes([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // GIF89a
      ...u16(width),
      ...u16(height),
      0xf7, // GCT flag=1, color res=7, sort=0, size=7 (256 entries)
      0x00,
      0x00
    ]);
    pushBytes(palette);
    // NETSCAPE2.0 Application Extension (loop infinitely)
    pushBytes([
      0x21, 0xff, 0x0b,
      0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30,
      0x03, 0x01, 0x00, 0x00, 0x00
    ]);

    // Standard variable-bit-width GIF LZW encoder (minCodeSize = 8)
    const lzwEncodeFrame = (indexed) => {
      const minCodeSize = 8;
      const clearCode = 256;
      const eoiCode = 257;
      const out = [minCodeSize];
      const subBlock = new Uint8Array(255);
      let subLen = 0;
      let bitBuf = 0;
      let bitCnt = 0;

      const emitCode = (code, bits) => {
        bitBuf |= code << bitCnt;
        bitCnt += bits;
        while (bitCnt >= 8) {
          subBlock[subLen++] = bitBuf & 0xff;
          bitBuf >>= 8;
          bitCnt -= 8;
          if (subLen === 255) {
            out.push(255);
            for (let k = 0; k < 255; k++) out.push(subBlock[k]);
            subLen = 0;
          }
        }
      };

      // Open-addressing hash table for fast prefix+suffix lookup (power-of-2 size 8192)
      const TABLE_SIZE = 8192;
      const MASK = TABLE_SIZE - 1;
      const keys = new Int32Array(TABLE_SIZE).fill(-1);
      const vals = new Int16Array(TABLE_SIZE);

      let nextCode = 258;
      let codeBits = 9;
      emitCode(clearCode, codeBits);

      let prefix = indexed[0];
      for (let i = 1; i < indexed.length; i++) {
        const k = indexed[i];
        const combined = (prefix << 8) | k;
        let slot = ((combined * 2654435761) >>> 19) & MASK;
        let found = -1;
        while (true) {
          const cur = keys[slot];
          if (cur === -1) break;
          if (cur === combined) {
            found = vals[slot];
            break;
          }
          slot = (slot + 1) & MASK;
        }
        if (found >= 0) {
          prefix = found;
        } else {
          emitCode(prefix, codeBits);
          if (nextCode < 4096) {
            keys[slot] = combined;
            vals[slot] = nextCode++;
            if (nextCode > (1 << codeBits) && codeBits < 12) {
              codeBits++;
            }
          } else {
            emitCode(clearCode, codeBits);
            keys.fill(-1);
            nextCode = 258;
            codeBits = 9;
          }
          prefix = k;
        }
      }
      emitCode(prefix, codeBits);
      emitCode(eoiCode, codeBits);
      if (bitCnt > 0) {
        subBlock[subLen++] = bitBuf & 0xff;
      }
      if (subLen > 0) {
        out.push(subLen);
        for (let k = 0; k < subLen; k++) out.push(subBlock[k]);
      }
      out.push(0x00); // Block terminator
      return new Uint8Array(out);
    };

    const indexedBuf = new Uint8Array(width * height);
    for (let f = 0; f < frames.length; f++) {
      const frame = frames[f];
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(frame.img, 0, 0, width, height);
      const rgba = ctx.getImageData(0, 0, width, height).data;
      for (let p = 0, q = 0; p < rgba.length; p += 4, q++) {
        indexedBuf[q] = mapRgb555(rgba[p] >> 3, rgba[p + 1] >> 3, rgba[p + 2] >> 3);
      }
      const delayCs = Math.max(2, Math.round((frame.delay || 50) / 10));
      // Graphic Control Extension
      pushBytes([0x21, 0xf9, 0x04, 0x04, ...u16(delayCs), 0x00, 0x00]);
      // Image Descriptor
      pushBytes([0x2c, 0x00, 0x00, 0x00, 0x00, ...u16(width), ...u16(height), 0x00]);
      pushBytes(lzwEncodeFrame(indexedBuf));

      if (typeof onProgress === 'function') {
        onProgress(f + 1, frames.length);
      }
      if (f % 3 === 2) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    pushBytes([0x3b]); // GIF Trailer
    return new Blob(chunks, { type: 'image/gif' });
  }

  async function openIllustViewer(illustId) {
    if (!illustId) return;
    stopUgoiraTimer();

    const modal = $('illustViewerModal');
    const loading = $('viewerLoadingOverlay');
    const mainImg = $('viewerMainImg');
    const canvas = $('viewerUgoiraCanvas');

    modal.classList.remove('hidden');
    loading.classList.remove('hidden');
    mainImg.classList.remove('hidden');
    canvas.classList.add('hidden');
    clearViewerDownloadButton($('viewerDownloadCurrentBtn'), '正在解析原图...');
    clearViewerDownloadButton($('viewerDownloadUgoiraZipBtn'), '下载 Ugoira 动图帧 ZIP');
    $('viewerDownloadUgoiraZipBtn')?.classList.add('hidden');
    $('viewerDownloadUgoiraGifBtn')?.classList.add('hidden');

    try {
      const localWork = (state.rawDataset?.artworks || []).find((w) => String(w.id) === String(illustId));
      const isBooruWork = Boolean(localWork && localWork.source && localWork.source !== 'pixiv');
      let json = null;

      if (isBooruWork) {
        const reg = localWork.regularUrl || localWork.originalUrl || localWork.thumbUrl || '';
        const orig = localWork.originalUrl || reg;
        json = {
          id: localWork.externalId || localWork.id,
          source: localWork.source,
          externalUrl: localWork.externalUrl || '#',
          title: localWork.title || `${localWork.source} #${localWork.externalId || localWork.id}`,
          description: `来源站点: ${(SOURCE_META[localWork.source] || {}).label || localWork.source}`,
          userName: localWork.userName || localWork.source,
          userId: localWork.userId || '',
          width: localWork.width || 0,
          height: localWork.height || 0,
          pageCount: localWork.pageCount || 1,
          illustType: localWork.illustType || 0,
          isAi: Boolean(localWork.isAi),
          bookmarkCount: artworkPopKey(localWork),
          viewCount: 0,
          thumbUrl: localWork.thumbUrl || reg,
          regularUrl: reg,
          originalUrl: orig,
          tags: localWork.tags || [],
          pages: [{ thumb: localWork.thumbUrl || reg, regular: reg, large: reg, original: orig }]
        };
      } else {
        let fetchedJson = null;
        try {
          const resp = await apiFetch(`/api/illust/detail?id=${encodeURIComponent(illustId)}`, {
            headers: state.cookie ? { 'X-Pixiv-Cookie': state.cookie } : {}
          });
          const rawJson = await resp.json();
          if (resp.ok && !rawJson.error) {
            fetchedJson = rawJson.data || rawJson;
          }
        } catch (_) {}

        const hasFetchedMedia = Boolean(
          fetchedJson &&
            (fetchedJson.originalUrl ||
              fetchedJson.regularUrl ||
              fetchedJson.largeUrl ||
              (Array.isArray(fetchedJson.pages) && fetchedJson.pages.some((p) => p && (p.original || p.regular || p.large))))
        );
        if (fetchedJson && hasFetchedMedia) {
          json = fetchedJson;
        } else if (localWork && (localWork.originalUrl || localWork.regularUrl || localWork.largeUrl || localWork.thumbUrl)) {
          const fallbackReg = localWork.regularUrl || localWork.largeUrl || localWork.originalUrl || localWork.thumbUrl || '';
          const fallbackOrig = localWork.originalUrl || fallbackReg;
          json = {
            ...(fetchedJson || {}),
            id: String(localWork.id),
            title: (fetchedJson && fetchedJson.title) || localWork.title || `Artwork #${localWork.id}`,
            description: (fetchedJson && fetchedJson.description) || '',
            userName: (fetchedJson && fetchedJson.userName) || localWork.userName || '',
            userId: (fetchedJson && fetchedJson.userId) || localWork.userId || '',
            width: (fetchedJson && fetchedJson.width) || localWork.width || 0,
            height: (fetchedJson && fetchedJson.height) || localWork.height || 0,
            pageCount: (fetchedJson && fetchedJson.pageCount) || localWork.pageCount || 1,
            illustType: (fetchedJson && fetchedJson.illustType) ?? localWork.illustType ?? 0,
            isAi: Boolean((fetchedJson && fetchedJson.isAi) || localWork.isAi),
            bookmarkCount: (fetchedJson && (fetchedJson.totalBookmarks ?? fetchedJson.bookmarkCount)) || localWork.bookmarkCount || 0,
            viewCount: (fetchedJson && (fetchedJson.totalView ?? fetchedJson.viewCount)) || 0,
            thumbUrl: localWork.thumbUrl || fallbackReg,
            regularUrl: fallbackReg,
            originalUrl: fallbackOrig,
            tags: (fetchedJson && Array.isArray(fetchedJson.tags) && fetchedJson.tags.length ? fetchedJson.tags : localWork.tags) || [],
            pages: [{ thumb: localWork.thumbUrl || fallbackReg, regular: fallbackReg, large: fallbackReg, original: fallbackOrig }]
          };
        } else {
          throw new Error('无法读取该作品的高清原图地址，请点击「打开原网页」查看');
        }
        json.source = 'pixiv';
        json.externalUrl = `https://www.pixiv.net/artworks/${encodeURIComponent(json.id)}`;
      }

      const srcMeta = SOURCE_META[json.source || 'pixiv'] || SOURCE_META.pixiv;
      state.viewer.illust = json;
      state.viewer.pageIndex = 0;
      state.viewer.useOriginal = false;

      $('viewerTitle').textContent = json.title || `Artwork #${json.id}`;
      const dimText = json.width && json.height ? ` // ${json.width}×${json.height}` : '';
      $('viewerMetaSubtitle').textContent = `[${srcMeta.label}] ID: ${json.id} // ARTIST: ${json.userName || 'Unknown'}${dimText}`;
      $('viewerOpenPixivBtn').href = json.externalUrl || `https://www.pixiv.net/artworks/${encodeURIComponent(json.id)}`;
      $('viewerOpenPixivBtn').textContent = `在 ${srcMeta.label} 打开原网页 ↗`;

      $('viewerStatsBox').innerHTML = `
        <div class="ins-stat-box"><span class="ins-stat-label">${json.source === 'pixiv' ? '收藏数' : '热度/评分'}</span><strong class="ins-stat-val">★ ${Number(json.totalBookmarks ?? json.bookmarkCount ?? 0).toLocaleString()}</strong></div>
        <div class="ins-stat-box"><span class="ins-stat-label">浏览量</span><strong class="ins-stat-val">${Number(json.totalView ?? json.viewCount ?? 0).toLocaleString()}</strong></div>
        <div class="ins-stat-box"><span class="ins-stat-label">页数 / 类型</span><strong class="ins-stat-val">${json.pageCount || 1}P / ${json.illustType === 2 ? '动图/视频' : '插画'}</strong></div>
        <div class="ins-stat-box"><span class="ins-stat-label">AI 标记</span><strong class="ins-stat-val">${json.isAi ? 'AI 生成' : '非 AI 手绘'}</strong></div>
      `;

      $('viewerTagsList').innerHTML = (json.tags || [])
        .map((t) => `<span class="third-tag-card" data-viewer-tag="${escapeHtml(t)}">#${escapeHtml(t)}</span>`)
        .join('');

      $('viewerTagsList').querySelectorAll('[data-viewer-tag]').forEach((pill) => {
        pill.addEventListener('click', () => {
          const nextTag = pill.dataset.viewerTag;
          modal.classList.add('hidden');
          $('tagSearchInput').value = nextTag;
          state.lockedSubTags.clear();
          hideAutocomplete();
          $('queryConsolePanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          showToast(`已填入目标标签 [${nextTag}]，请确认采集深度后点击「开始采样」`);
        });
      });

      $('viewerDescriptionBox').innerHTML = json.description || '<em>该作品无简介说明</em>';

      const thumbStrip = $('viewerThumbStrip');
      const pages = json.pages || [];
      if (pages.length > 1) {
        thumbStrip.innerHTML = pages
          .map(
            (p, idx) => `
            <div class="viewer-thumb-item clean-optical-media ${idx === 0 ? 'active' : ''}" data-page-idx="${idx}">
              <img class="clean-optical-media" src="${proxyImg(p.square_medium || p.thumb || p.medium || p.large || p.regular || p.original)}" alt="P${idx + 1}" />
            </div>
          `
          )
          .join('');
        thumbStrip.querySelectorAll('[data-page-idx]').forEach((th) => {
          th.addEventListener('click', () => {
            state.viewer.pageIndex = parseInt(th.dataset.pageIdx, 10) || 0;
            updateViewerPage();
          });
        });
      } else {
        thumbStrip.innerHTML = '';
      }

      if (json.source === 'pixiv' && json.illustType === 2) {
        const coverUrl = json.originalUrl || json.regularUrl || json.largeUrl || json.pages?.[0]?.original || json.pages?.[0]?.large || '';
        const coverExt = sanitizeMediaExt(coverUrl, 'jpg');
        setViewerDownloadButton(
          $('viewerDownloadCurrentBtn'),
          coverUrl,
          `pixiv_${json.id}_ugoira_cover.${coverExt}`,
          coverUrl ? '下载动图高清封面' : '暂无可下载原图'
        );
        await playUgoiraInViewer(json.id);
      } else {
        $('viewerDownloadUgoiraZipBtn').classList.add('hidden');
        updateViewerPage();
      }
    } catch (err) {
      loading.classList.add('hidden');
      clearViewerDownloadButton($('viewerDownloadCurrentBtn'), '原图解析失败');
      showToast(`看图加载失败: ${err.message}`);
    }
  }

  function updateViewerPage() {
    const ill = state.viewer.illust;
    if (!ill) return;
    const pages = ill.pages || [];
    const page = pages[state.viewer.pageIndex] || {
      large: ill.largeUrl || ill.regularUrl || ill.thumbUrl,
      original: ill.originalUrl || ill.largeUrl || ill.regularUrl || ill.thumbUrl
    };

    const total = pages.length || 1;
    $('viewerPageIndicator').textContent = `${state.viewer.pageIndex + 1} / ${total}`;
    $('viewerQualityToggleBtn').textContent = state.viewer.useOriginal ? '当前: 原图' : '切换原图';

    document.querySelectorAll('#viewerThumbStrip .viewer-thumb-item').forEach((el, idx) => {
      el.classList.toggle('active', idx === state.viewer.pageIndex);
    });

    const regUrl = page.large || page.regular || page.medium || page.original || ill.regularUrl || ill.thumbUrl || '';
    const origUrl = page.original || regUrl;
    const targetUrl = state.viewer.useOriginal ? origUrl : regUrl;
    const mainImg = $('viewerMainImg');
    const loading = $('viewerLoadingOverlay');
    loading.classList.remove('hidden');

    mainImg.onload = () => loading.classList.add('hidden');
    mainImg.onerror = () => {
      const fb = directFallbackImg(targetUrl);
      if (fb && mainImg.src !== fb) {
        mainImg.src = fb;
      } else {
        loading.classList.add('hidden');
      }
    };
    if (targetUrl) {
      mainImg.src = proxyImg(targetUrl);
    } else {
      mainImg.removeAttribute('src');
      loading.classList.add('hidden');
    }

    const dlUrl = origUrl;
    const ext = sanitizeMediaExt(dlUrl, 'jpg');
    const srcPrefix = (ill.source || 'pixiv').replace(/[^a-z0-9_-]/gi, '');
    setViewerDownloadButton(
      $('viewerDownloadCurrentBtn'),
      dlUrl,
      `${srcPrefix}_${ill.id}_p${state.viewer.pageIndex}.${ext}`,
      dlUrl ? (ill.illustType === 2 ? '下载动图高清封面' : '下载当前页高清原图') : '暂无可下载原图'
    );
  }

  async function playUgoiraInViewer(illustId) {
    const loading = $('viewerLoadingOverlay');
    const mainImg = $('viewerMainImg');
    const canvas = $('viewerUgoiraCanvas');
    const gifBtn = $('viewerDownloadUgoiraGifBtn');

    try {
      const resp = await apiFetch(`/api/illust/ugoira?id=${encodeURIComponent(illustId)}`, {
        headers: state.cookie ? { 'X-Pixiv-Cookie': state.cookie } : {}
      });
      const rawData = await resp.json();
      const data = rawData.data || rawData;
      const playZipUrl = data.zipUrl || data.originalZipUrl || '';
      const dlZipUrl = data.originalZipUrl || data.zipUrl || '';
      if (resp.ok && !rawData.error && dlZipUrl) {
        const zipBtn = $('viewerDownloadUgoiraZipBtn');
        zipBtn.classList.remove('hidden');
        setViewerDownloadButton(zipBtn, dlZipUrl, `pixiv_ugoira_${illustId}.zip`, '下载 Ugoira 动图帧 ZIP');
      }

      let frameSources = [];
      const createdObjUrls = [];
      if (resp.ok && !rawData.error && Array.isArray(data.frames) && data.frames.length > 0) {
        frameSources = data.frames.map((f) => ({ src: f.dataUrl, delay: f.delay || 50 }));
      } else if (resp.ok && !rawData.error && playZipUrl && Array.isArray(data.framesMeta) && data.framesMeta.length > 0) {
        // Cloud / Cloudflare Pages mode: fetch Ugoira ZIP via CORS proxy and unpack frames directly in browser!
        const proxyZipHref = downloadImgUrl(playZipUrl, `pixiv_ugoira_${illustId}.zip`);
        let zipBuf = null;
        for (const candidateUrl of [proxyZipHref, directFallbackImg(playZipUrl)]) {
          if (!candidateUrl) continue;
          try {
            const zRes = await fetch(candidateUrl, {
              headers: { Accept: 'application/zip,application/octet-stream,*/*' }
            });
            const ct = (zRes.headers.get('content-type') || '').toLowerCase();
            if (zRes.ok && !ct.includes('text/html') && !ct.includes('application/json')) {
              const ab = await zRes.arrayBuffer();
              if (ab.byteLength > 100 && new DataView(ab).getUint32(0, true) === 0x04034b50) {
                zipBuf = ab;
                break;
              }
            }
          } catch (_) {}
        }
        if (zipBuf) {
          const fileMap = await unpackZipEntriesInBrowser(zipBuf);
          for (const fm of data.framesMeta) {
            const bytes = fileMap.get(fm.file);
            if (!bytes) continue;
            const mime = /\.png$/i.test(fm.file) ? 'image/png' : 'image/jpeg';
            const objUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
            createdObjUrls.push(objUrl);
            frameSources.push({ src: objUrl, delay: Number(fm.delay) || 50 });
          }
        }
      }

      if (!frameSources.length) {
        for (const u of createdObjUrls) { try { URL.revokeObjectURL(u); } catch (_) {} }
        updateViewerPage();
        return;
      }

      const images = await Promise.all(
        frameSources.map(
          (f) =>
            new Promise((resolve) => {
              const img = new Image();
              img.onload = () => resolve({ img, delay: f.delay || 50 });
              img.onerror = () => resolve(null);
              img.src = f.src;
            })
        )
      );

      const validFrames = images.filter(Boolean);
      if (validFrames.length === 0 || String(state.viewer.illust?.id || '') !== String(illustId)) {
        for (const u of createdObjUrls) { try { URL.revokeObjectURL(u); } catch (_) {} }
        if (String(state.viewer.illust?.id || '') === String(illustId)) updateViewerPage();
        return;
      }

      state.viewer.ugoiraObjectUrls = createdObjUrls;
      state.viewer.ugoiraFrames = validFrames;
      state.viewer.ugoiraIllustId = String(illustId);
      if (gifBtn) {
        gifBtn.classList.remove('hidden');
        gifBtn.disabled = false;
        gifBtn.textContent = `合成并下载动图 GIF (${validFrames.length}帧)`;
      }

      canvas.width = validFrames[0].img.naturalWidth || 800;
      canvas.height = validFrames[0].img.naturalHeight || 800;
      const ctx = canvas.getContext('2d');

      mainImg.classList.add('hidden');
      canvas.classList.remove('hidden');
      loading.classList.add('hidden');

      let fIdx = 0;
      function renderFrame() {
        const frame = validFrames[fIdx];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(frame.img, 0, 0);
        fIdx = (fIdx + 1) % validFrames.length;
        state.viewer.ugoiraTimer = setTimeout(renderFrame, frame.delay);
      }
      renderFrame();
    } catch (_) {
      updateViewerPage();
    }
  }

  // =========================================================================
  // 9. PRE-FLIGHT TOTAL COUNT + MULTI-CHUNK STREAMING SAMPLING ENGINE (v4.3)
  // =========================================================================
  function hidePreflightBanner() {
    state.pendingPreflight = null;
    state.pendingCacheHit = null;
    $('preflightNoticeBar')?.classList.add('hidden');
    $('preflightConfirmActions')?.classList.add('hidden');
    $('preflightResumeActions')?.classList.add('hidden');
    $('preflightCacheHitActions')?.classList.add('hidden');
  }

  function showPreflightBanner(text, needsConfirm = false, showResume = false, cacheHitOpts = null) {
    const bar = $('preflightNoticeBar');
    const textEl = $('preflightNoticeText');
    const acts = $('preflightConfirmActions');
    const resActs = $('preflightResumeActions');
    const cacheActs = $('preflightCacheHitActions');
    if (!bar || !textEl) return;
    textEl.textContent = text;
    bar.classList.remove('hidden');
    if (acts) acts.classList.toggle('hidden', !needsConfirm);
    if (resActs) resActs.classList.toggle('hidden', !showResume);
    if (cacheActs) {
      const showCache = Boolean(cacheHitOpts);
      cacheActs.classList.toggle('hidden', !showCache);
      if (showCache) {
        const useBtn = $('preflightUseCacheBtn');
        const resumeBtn = $('preflightCacheResumeBtn');
        const forceBtn = $('preflightForceRefreshBtn');
        if (useBtn) {
          useBtn.classList.toggle('hidden', !cacheHitOpts.showUse);
          if (cacheHitOpts.useLabel) useBtn.textContent = cacheHitOpts.useLabel;
        }
        if (resumeBtn) {
          resumeBtn.classList.toggle('hidden', !cacheHitOpts.showResume);
          if (cacheHitOpts.resumeLabel) resumeBtn.textContent = cacheHitOpts.resumeLabel;
        }
        if (forceBtn && cacheHitOpts.forceLabel) {
          forceBtn.textContent = cacheHitOpts.forceLabel;
        }
      }
    }
  }

  const _danbooruQueriedTags = new Set();
  const _pixivTransQueriedTags = new Set();
  const _pixivFetchedIllustIds = new Set();
  let _visibleEnrichTimer = null;

  function persistPixivTransCache() {
    try {
      const entries = Object.entries(state.pixivTransCache || {});
      const trimmed = entries.length > 4000 ? Object.fromEntries(entries.slice(-4000)) : state.pixivTransCache;
      localStorage.setItem('pixez_pixiv_trans_cache_v1', JSON.stringify(trimmed));
    } catch (_) {}
  }

  // Pixiv Web /ajax/search/artworks only fills body.tagTranslation for ~30 tags/page, whereas
  // Pixiv's /ajax/illust/<id>?lang=zh returns Pixiv's official ZH/EN translation for 100% of tags on that work.
  // We use greedy set-cover over sampled artworks (max 4~6 tiny JSON calls) to recover official Pixiv translations!
  async function enrichPixivOfficialTranslations(targetTags, maxIllusts = 4) {
    if (!state.bridgeFetchAvailable || typeof window._pixezBridgeFetch !== 'function') return;
    const ds = state.rawDataset;
    if (!ds || ds.source !== 'pixiv' || !Array.isArray(ds.artworks) || !ds.artworks.length) return;
    const transLookup = ds.translations || (ds.translations = {});
    const needed = new Set();
    for (const t of targetTags || []) {
      if (!t || /\d+users入り$/i.test(t) || /^[a-z0-9_\-.\s]+$/i.test(t)) continue;
      if (transLookup[t] || state.pixivTransCache[t] || _pixivTransQueriedTags.has(t)) continue;
      needed.add(t);
    }
    if (!needed.size) return;
    for (const t of needed) _pixivTransQueriedTags.add(t);

    // Greedy set-cover: pick up to maxIllusts artworks covering the maximum number of missing tags
    const pickedIds = [];
    const remaining = new Set(needed);
    for (let k = 0; k < maxIllusts && remaining.size > 0; k++) {
      let bestId = '';
      let bestCover = 0;
      for (const w of ds.artworks) {
        const wid = String(w?.id || '');
        if (!wid || !/^\d+$/.test(wid) || _pixivFetchedIllustIds.has(wid)) continue;
        const wTags = w.tags;
        if (!Array.isArray(wTags) || !wTags.length) continue;
        let hit = 0;
        for (let i = 0; i < wTags.length; i++) {
          if (remaining.has(wTags[i])) hit++;
        }
        if (hit > bestCover) {
          bestCover = hit;
          bestId = wid;
          if (hit >= Math.min(remaining.size, 8)) break;
        }
      }
      if (!bestId || bestCover === 0) break;
      pickedIds.push(bestId);
      _pixivFetchedIllustIds.add(bestId);
      const pickedWork = ds.artworks.find((w) => String(w?.id || '') === bestId);
      if (pickedWork && Array.isArray(pickedWork.tags)) {
        for (const t of pickedWork.tags) remaining.delete(t);
      }
    }
    if (!pickedIds.length) return;

    let added = 0;
    await Promise.all(
      pickedIds.map(async (wid) => {
        try {
          const r = await window._pixezBridgeFetch(
            `https://www.pixiv.net/ajax/illust/${encodeURIComponent(wid)}?lang=zh`,
            { timeout: 8000 }
          );
          const list = r?.json?.body?.tags?.tags;
          if (!Array.isArray(list)) return;
          for (const item of list) {
            const tagName = String(item?.tag || '').trim();
            if (!tagName) continue;
            const trObj = item?.translation || {};
            const tr = String(trObj.zh || trObj.zh_tw || trObj.en || item?.romaji || '').trim();
            if (tr && tr.toLowerCase() !== tagName.toLowerCase()) {
              if (!transLookup[tagName]) {
                transLookup[tagName] = tr;
                added++;
              }
              state.pixivTransCache[tagName] = tr;
            }
          }
        } catch (_) {}
      })
    );
    if (added > 0) {
      persistPixivTransCache();
      recomputeAndRender();
    }
  }

  function scheduleVisibleDanbooruEnrich(visibleItems) {
    if (!Array.isArray(visibleItems) || !visibleItems.length) return;
    const src = state.rawDataset?.source || state.source || 'pixiv';
    if (!['pixiv', 'safebooru', 'zerochan', 'rule34'].includes(src)) return;
    const missingDb = [];
    const missingPixiv = [];
    const transLookup = state.rawDataset?.translations || {};
    for (const item of visibleItems) {
      const t = item?.tag;
      if (!t || /\d+users入り$/i.test(t) || /\s/.test(t)) continue;
      if (!state.danbooruCache[t] && !_danbooruQueriedTags.has(t) && missingDb.length < 75) {
        missingDb.push(t);
      }
      if (
        src === 'pixiv' &&
        !transLookup[t] &&
        !state.pixivTransCache[t] &&
        !_pixivTransQueriedTags.has(t) &&
        missingPixiv.length < 40
      ) {
        missingPixiv.push(t);
      }
    }
    if (!missingDb.length && !missingPixiv.length) return;
    if (_visibleEnrichTimer) clearTimeout(_visibleEnrichTimer);
    _visibleEnrichTimer = setTimeout(() => {
      _visibleEnrichTimer = null;
      if (missingDb.length) enrichTagListViaDanbooru(missingDb);
      if (missingPixiv.length) enrichPixivOfficialTranslations(missingPixiv, 4);
    }, 220);
  }

  async function enrichTagListViaDanbooru(tagList) {
    const todo = [];
    for (const t of tagList || []) {
      if (!t || /\d+users入り$/i.test(t) || /\s/.test(t)) continue;
      if (state.danbooruCache[t] || _danbooruQueriedTags.has(t)) continue;
      _danbooruQueriedTags.add(t);
      todo.push(t);
    }
    if (!todo.length) return;
    let map = {};
    try {
      const r = await apiFetch('/api/danbooru/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: todo.slice(0, 100) })
      });
      if (r.ok) {
        const d = await r.json();
        if (d && d.danbooruMap) map = d.danbooruMap;
      }
    } catch (_) {}

    // Direct-browser CORS enrichment (danbooru.donmai.us returns Access-Control-Allow-Origin: *)
    const stillMissing = todo.filter((t) => !map[t]);
    if (stillMissing.length > 0) {
      try {
        const chunks = [];
        for (let i = 0; i < stillMissing.length; i += 25) chunks.push(stillMissing.slice(i, i + 25));
        await Promise.all(
          chunks.map(async (chunk) => {
            // Also include stripped parenthetical stems like `エクアル(プリキュア)` -> `エクアル`
            const expandedTerms = new Set(chunk);
            for (const t of chunk) {
              const stem = t.replace(/[（(][^）)]+[）)]$/, '').trim();
              if (stem && stem !== t && stem.length >= 2) expandedTerms.add(stem);
            }
            const qs = new URLSearchParams({
              'search[other_names_include_any]': Array.from(expandedTerms).join(' '),
              limit: '100',
              only: 'title,other_names,tag[name,category,post_count]'
            });
            const r = await fetch(`https://danbooru.donmai.us/wiki_pages.json?${qs.toString()}`);
            if (!r.ok) return;
            const items = await r.json();
            if (!Array.isArray(items)) return;
            for (const pixTag of chunk) {
              const lp = pixTag.toLowerCase();
              const stemLow = pixTag.replace(/[（(][^）)]+[）)]$/, '').trim().toLowerCase();
              let best = null;
              for (const item of items) {
                const others = Array.isArray(item.other_names) ? item.other_names : [];
                const exactHit = others.some((n) => String(n).toLowerCase() === lp) || String(item.title || '').toLowerCase() === lp;
                const stemHit = !exactHit && stemLow && stemLow !== lp && others.some((n) => String(n).toLowerCase() === stemLow);
                if (exactHit || stemHit) {
                  const pc = Number(item.tag?.post_count || 0) + (exactHit ? 100000000 : 0);
                  if (!best || pc > best.sortScore) {
                    const code = Number(item.tag?.category ?? 0);
                    // Extract a Chinese alias from other_names if available (Hanzi without Kana)
                    const zhAlias = others.find((n) => {
                      const ns = String(n || '').trim();
                      return ns && ns !== pixTag && /[\u4E00-\u9FFF]/.test(ns) && !/[\u3040-\u30FF]/.test(ns);
                    }) || '';
                    best = {
                      danbooruTag: item.title || item.tag?.name || '',
                      category: code === 4 ? 'character' : code === 3 ? 'series_ip' : (code === 1 || code === 5 ? 'meta_general' : 'attribute_xp'),
                      postCount: Number(item.tag?.post_count || 0),
                      zhAlias,
                      sortScore: pc
                    };
                  }
                }
              }
              if (best && best.danbooruTag) {
                map[pixTag] = {
                  danbooruTag: best.danbooruTag,
                  category: best.category,
                  postCount: best.postCount,
                  ...(best.zhAlias ? { zhAlias: best.zhAlias } : {})
                };
              }
            }
          })
        );
      } catch (_) {}
    }

    if (Object.keys(map).length > 0) {
      Object.assign(state.danbooruCache, map);
      persistDanbooruCache();
      if (state.rawDataset) {
        state.rawDataset.danbooruMap = { ...(state.rawDataset.danbooruMap || {}), ...map };
        state.rawDataset.translations = state.rawDataset.translations || {};
        for (const [k, v] of Object.entries(map)) {
          if (v.zhAlias && !state.rawDataset.translations[k]) {
            state.rawDataset.translations[k] = v.zhAlias;
          }
        }
      }
      recomputeAndRender();
    }
  }

  async function enrichTopTagsViaDanbooru(works, primaryTag) {
    const counts = new Map();
    const normPrimary = String(primaryTag || '').toLowerCase();
    for (const w of works) {
      for (const t of w.tags || []) {
        if (!t || t.toLowerCase() === normPrimary || /\d+users入り$/i.test(t) || /\s/.test(t)) continue;
        if (state.danbooruCache[t] || state.rawDataset?.nativeTagCategories?.[t]) continue;
        counts.set(t, (counts.get(t) || 0) + 1);
      }
    }
    const topUncached = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 300)
      .map(([t]) => t);
    if (topUncached.length) {
      await enrichTagListViaDanbooru(topUncached);
    }
    if (state.rawDataset?.source === 'pixiv' && state.bridgeFetchAvailable) {
      const topUntranslated = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 80)
        .map(([t]) => t);
      await enrichPixivOfficialTranslations(topUntranslated, 6);
    }
  }

  // =========================================================================
  // 9A. 1GB LOCAL SEGMENTED CACHE (IndexedDB: pixez_pulse_cache_v1)
  // =========================================================================
  const PulseCacheDB = (() => {
    const DB_NAME = 'pixez_pulse_cache_v1';
    const STORE = 'datasets';
    let dbPromise = null;

    function open() {
      if (dbPromise) return dbPromise;
      dbPromise = new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB unavailable'));
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) {
            db.createObjectStore(STORE, { keyPath: 'key' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      return dbPromise;
    }

    async function getAll() {
      try {
        const db = await open();
        return await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, 'readonly');
          const req = tx.objectStore(STORE).getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });
      } catch (_) {
        return [];
      }
    }

    async function get(key) {
      try {
        const db = await open();
        return await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, 'readonly');
          const req = tx.objectStore(STORE).get(key);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => reject(req.error);
        });
      } catch (_) {
        return null;
      }
    }

    async function remove(key) {
      try {
        const db = await open();
        await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).delete(key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch (_) {}
    }

    async function clearAll() {
      try {
        const db = await open();
        await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch (_) {}
    }

    async function putWithEviction(record, maxBytes) {
      try {
        const approxBytes = new Blob([JSON.stringify(record)]).size;
        record.bytes = approxBytes;
        record.updatedAt = Date.now();
        const existing = await getAll();
        let totalBytes = approxBytes + existing.filter((r) => r.key !== record.key).reduce((s, r) => s + (r.bytes || 0), 0);
        if (maxBytes > 0 && totalBytes > maxBytes) {
          const oldest = existing.filter((r) => r.key !== record.key).sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
          for (const old of oldest) {
            if (totalBytes <= maxBytes) break;
            await remove(old.key);
            totalBytes -= old.bytes || 0;
          }
        }
        const db = await open();
        await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).put(record);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch (_) {}
    }

    return { getAll, get, remove, del: remove, clearAll, putWithEviction };
  })();

  function makeCacheKey(source, tag, mode) {
    return `${String(source || 'pixiv').toLowerCase()}::${String(tag || '').trim().toLowerCase()}::${mode || 'all'}`;
  }

  async function refreshCacheBadge() {
    const records = await PulseCacheDB.getAll();
    if ($('cacheCountBadge')) $('cacheCountBadge').textContent = String(records.length);
    return records;
  }

  function formatCacheLimitLabel(mb) {
    if (!mb || mb <= 0) return '不限上限';
    if (mb >= 1024) return `${mb} MB (${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 2)} GB)`;
    return `${mb} MB`;
  }

  async function renderCacheModal() {
    const records = (await refreshCacheBadge()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    const totalBytes = records.reduce((s, r) => s + (r.bytes || 0), 0);
    const usedMb = (totalBytes / (1024 * 1024)).toFixed(2);
    if ($('cacheUsageSummary')) {
      $('cacheUsageSummary').textContent = `本地已缓存 ${records.length} 份数据集 · 已占用 ${usedMb} MB / 上限 ${formatCacheLimitLabel(state.cacheLimitMb)}`;
    }
    const sel = $('cacheLimitMbSelect');
    const customInp = $('cacheLimitCustomInput');
    const presetValues = ['256', '512', '1024', '2048', '4096', '8192', '0'];
    if (sel) {
      sel.value = presetValues.includes(String(state.cacheLimitMb)) ? String(state.cacheLimitMb) : 'custom';
    }
    if (customInp) {
      customInp.value = String(state.cacheLimitMb);
    }
    const listEl = $('cacheRecordsList');
    if (!listEl) return;
    if (!records.length) {
      listEl.innerHTML = `<div class="empty-placeholder">暂无本地缓存记录（采样完成后会自动保存至本地 IndexedDB，支持断点分段续采与合并计算）</div>`;
      return;
    }
    listEl.innerHTML = records
      .map((rec) => {
        const srcLabel = (SOURCE_META[rec.source] || {}).label || rec.source;
        const cnt = (rec.artworks || []).length;
        const mb = ((rec.bytes || 0) / (1024 * 1024)).toFixed(2);
        const dt = rec.updatedAt ? new Date(rec.updatedAt).toLocaleString() : '';
        const dateHint = rec.oldestDate ? ` · 最早至 ${rec.oldestDate}` : '';
        const totalHint = rec.pixivTotal > 0 ? ` / 全站 ${Number(rec.pixivTotal).toLocaleString()}` : '';
        return `
          <div class="cache-record-card">
            <div class="cache-record-info">
              <div class="cache-record-title">[${escapeHtml(srcLabel)}] ${escapeHtml(rec.primaryTag)}</div>
              <div class="cache-record-meta">已缓存 ${cnt.toLocaleString()} 作${totalHint} · ${rec.pagesScanned || 1}页${dateHint} · ${mb} MB · ${escapeHtml(dt)}</div>
            </div>
            <div class="cache-record-actions">
              <button class="t-btn t-btn--sm t-btn--primary" data-cache-load="${escapeHtml(rec.key)}" type="button">载入计算</button>
              <button class="t-btn t-btn--sm" data-cache-resume="${escapeHtml(rec.key)}" type="button">续采下一段</button>
              <button class="t-btn t-btn--sm t-btn--danger" data-cache-del="${escapeHtml(rec.key)}" type="button">删除</button>
            </div>
          </div>
        `;
      })
      .join('');

    listEl.querySelectorAll('[data-cache-load]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const rec = await PulseCacheDB.get(btn.dataset.cacheLoad);
        if (!rec) return;
        state.source = SOURCE_META[rec.source] ? rec.source : 'pixiv';
        applySourceUI();
        $('tagSearchInput').value = rec.primaryTag || '';
        state.lockedSubTags.clear();
        state.rawDataset = rec;
        if (rec.danbooruMap) Object.assign(state.danbooruCache, rec.danbooruMap);
        $('cacheModal')?.classList.add('hidden');
        recomputeAndRender();
        showToast(`已从本地缓存瞬间载入 [${rec.primaryTag}] (${(rec.artworks || []).length.toLocaleString()} 件作品)`);
      });
    });

    listEl.querySelectorAll('[data-cache-resume]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const rec = await PulseCacheDB.get(btn.dataset.cacheResume);
        if (!rec) return;
        $('cacheModal')?.classList.add('hidden');
        executeAnalysis(rec.primaryTag, {
          source: rec.source,
          overridePages: 'ALL',
          skipConfirm: true,
          resumeFromCache: rec
        });
      });
    });

    listEl.querySelectorAll('[data-cache-del]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await PulseCacheDB.remove(btn.dataset.cacheDel);
        renderCacheModal();
        showToast('已删除该条本地缓存');
      });
    });
  }

  // Direct-browser CORS adapters for Danbooru & Sankaku (bypass CF-Worker-to-CF WAF cleanly!)
  function mapDirectBooruCat(code) {
    const n = Number(code);
    if (n === 4) return 'character';
    if (n === 3) return 'series_ip';
    if (n === 1 || n === 5 || n === 8 || n === 9) return 'meta_general';
    return 'attribute_xp';
  }

  async function directResolveCjkTag(rawTag) {
    const t = String(rawTag || '').trim();
    if (!t || /^[\x00-\x7F]+$/.test(t)) return { tag: t.replace(/\s+/g, '_'), resolvedFromCjk: false };
    try {
      const r = await fetch(
        `https://danbooru.donmai.us/wiki_pages.json?search[other_names_match]=${encodeURIComponent(t)}&limit=5&only=title,other_names,tag[name,category,post_count]`
      );
      if (r.ok) {
        const items = await r.json();
        if (Array.isArray(items) && items.length) {
          items.sort((a, b) => Number(b.tag?.post_count || 0) - Number(a.tag?.post_count || 0));
          if (items[0]?.title) return { tag: items[0].title, resolvedFromCjk: true };
        }
      }
    } catch (_) {}
    return { tag: t, resolvedFromCjk: false };
  }

  async function directBrowserAutocomplete(source, q) {
    if (source === 'danbooru') {
      const out = [];
      if (/[^\x00-\x7F]/.test(q)) {
        const [wRes, aRes] = await Promise.all([
          fetch(`https://danbooru.donmai.us/wiki_pages.json?search[other_names_match]=${encodeURIComponent(q + '*')}&limit=8&only=title,other_names,tag[name,category,post_count]`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
          fetch(`https://danbooru.donmai.us/artists.json?search[any_name_matches]=${encodeURIComponent(q + '*')}&limit=5`).then((r) => (r.ok ? r.json() : [])).catch(() => [])
        ]);
        if (Array.isArray(wRes)) {
          for (const w of wRes) {
            if (!w?.title) continue;
            const alias = Array.isArray(w.other_names) ? w.other_names.find((n) => /[^\x00-\x7F]/.test(n)) || '' : '';
            out.push({ tag_name: w.title, tag_translation: alias || w.title.replace(/_/g, ' '), access_count: Number(w.tag?.post_count || 0), category: mapDirectBooruCat(w.tag?.category ?? 0) });
          }
        }
        if (Array.isArray(aRes)) {
          for (const a of aRes) {
            if (!a?.name || out.some((x) => x.tag_name === a.name)) continue;
            out.push({ tag_name: a.name, tag_translation: `画师: ${(a.other_names || []).slice(0, 2).join(' / ') || a.name}`, access_count: 0, category: 'meta_general' });
          }
        }
        if (out.length) return out.slice(0, 10);
      }
      const r = await fetch(`https://danbooru.donmai.us/autocomplete.json?search[query]=${encodeURIComponent(q)}&search[type]=tag_query&limit=10`);
      if (!r.ok) return [];
      const arr = await r.json();
      return Array.isArray(arr)
        ? arr.filter((x) => x?.value).map((x) => ({ tag_name: x.value, tag_translation: x.label || '', access_count: Number(x.post_count || 0), category: mapDirectBooruCat(x.category ?? 0) }))
        : [];
    }
    if (source === 'sankaku') {
      const r = await fetch(`https://sankakuapi.com/tags/autosuggestCreating?tag=${encodeURIComponent(q)}`, {
        headers: { Accept: 'application/vnd.sankaku.api+json;v=2' }
      });
      if (!r.ok) return [];
      const arr = await r.json();
      return Array.isArray(arr)
        ? arr.slice(0, 10).map((t) => ({ tag_name: t.tagName || t.name || '', tag_translation: t.name_ja || t.name_en || '', access_count: Number(t.post_count || t.count || 0), category: mapDirectBooruCat(t.type ?? 0) })).filter((x) => x.tag_name)
        : [];
    }
    return [];
  }

  async function directBrowserTagInfo(source, rawTag, mode) {
    const res = await directResolveCjkTag(rawTag);
    if (source === 'danbooru') {
      let q = res.tag;
      if (mode === 'safe' && !/rating:/i.test(q)) q += ' rating:g';
      else if (mode === 'r18' && !/rating:/i.test(q)) q += ' rating:e';
      const r = await fetch(`https://danbooru.donmai.us/counts/posts.json?tags=${encodeURIComponent(q)}`);
      if (!r.ok) return null;
      const d = await r.json();
      const totalPosts = Number(d?.counts?.posts || 0);
      return {
        error: false,
        source: 'danbooru',
        resolvedTag: res.tag,
        resolvedFromCjk: res.resolvedFromCjk,
        totalPosts,
        pageSize: 100,
        estimatedPages: totalPosts > 0 ? Math.ceil(totalPosts / 100) : 0,
        apiCeilingWorks: 100000,
        note: res.resolvedFromCjk
          ? `已通过 Danbooru Wiki 自动将 [${rawTag}] 映射为 [${res.tag}]；全站共 ${totalPosts.toLocaleString()} 件作品（浏览器直连 CORS，每页 100 件，官方原生角色/作品/属性/画师分类）`
          : `Danbooru 全站共 ${totalPosts.toLocaleString()} 件作品（浏览器直连 CORS，每页 100 件，官方原生角色/作品/属性/画师分类）`
      };
    }
    if (source === 'sankaku') {
      const r = await fetch(`https://sankakuapi.com/tags/autosuggestCreating?tag=${encodeURIComponent(res.tag)}`, {
        headers: { Accept: 'application/vnd.sankaku.api+json;v=2' }
      });
      if (!r.ok) return null;
      const arr = await r.json();
      const exact = Array.isArray(arr) ? (arr.find((x) => String(x.tagName || x.name || '').toLowerCase() === res.tag.toLowerCase()) || arr[0]) : null;
      const totalPosts = Number(exact?.post_count || exact?.count || 0);
      return {
        error: false,
        source: 'sankaku',
        resolvedTag: res.tag,
        resolvedFromCjk: res.resolvedFromCjk,
        totalPosts,
        pageSize: 40,
        estimatedPages: totalPosts > 0 ? Math.ceil(totalPosts / 40) : 0,
        apiCeilingWorks: 20000,
        note: `Sankaku Complex 全站约 ${totalPosts.toLocaleString()} 件作品（浏览器直连 CORS，每页 40 件，原生双语分类与 Keyset 翻页）`
      };
    }
    return null;
  }

  async function directBrowserSampleChunk({ source, tag, startPage, chunkPages, cursor, mode, order, signal, onProgress }) {
    const artworks = [];
    const nativeTagCategories = {};
    const translations = {};
    let pagesScanned = 0;
    let nextPage = startPage;
    let nextCursor = '';
    let hasMore = false;

    if (source === 'danbooru') {
      let apiTags = tag;
      if (mode === 'safe' && !/rating:/i.test(apiTags)) apiTags += ' rating:g';
      else if (mode === 'r18' && !/rating:/i.test(apiTags)) apiTags += ' rating:e';
      if (order === 'popular_d' && !/order:/i.test(apiTags)) apiTags += ' order:favcount';
      else if (order === 'date' && !/order:/i.test(apiTags)) apiTags += ' order:id_asc';
      let reachedEnd = false;
      const isKeysetCursor = typeof startPage === 'string' && /^[ab]\d+$/i.test(startPage);
      let activeKeyset = isKeysetCursor ? startPage : '';
      for (let off = 0; off < chunkPages && !reachedEnd && !signal.aborted; off += isKeysetCursor ? 1 : 3) {
        const batch = [];
        if (isKeysetCursor) {
          batch.push(activeKeyset);
        } else {
          for (let k = 0; k < 3 && off + k < chunkPages; k++) batch.push(startPage + off + k);
        }
        onProgress?.(isKeysetCursor ? `游标 ${activeKeyset}` : batch[0], artworks.length);
        const results = await Promise.all(
          batch.map((p) =>
            fetch(`https://danbooru.donmai.us/posts.json?tags=${encodeURIComponent(apiTags)}&limit=100&page=${encodeURIComponent(String(p))}`, { signal })
              .then((r) => (r.ok ? r.json() : []))
              .catch(() => [])
              .then((data) => ({ p, data }))
          )
        );
        for (const { p, data } of results) {
          if (!Array.isArray(data) || !data.length) { reachedEnd = true; continue; }
          pagesScanned++;
          if (typeof p === 'number') {
            nextPage = Math.max(typeof nextPage === 'number' ? nextPage : 1, p + 1);
          } else {
            let minBatchId = Infinity;
            let maxBatchId = 0;
            for (const it of data) {
              const nid = Number(it?.id || 0);
              if (nid > 0) {
                if (nid < minBatchId) minBatchId = nid;
                if (nid > maxBatchId) maxBatchId = nid;
              }
            }
            if (order === 'date' && maxBatchId > 0) activeKeyset = `a${maxBatchId}`;
            else if (Number.isFinite(minBatchId)) activeKeyset = `b${minBatchId}`;
            nextPage = activeKeyset;
          }
          for (const item of data) {
            if (!item?.id) continue;
            const id = String(item.id);
            const cTags = String(item.tag_string_character || '').split(/\s+/).filter(Boolean);
            const sTags = String(item.tag_string_copyright || '').split(/\s+/).filter(Boolean);
            const gTags = String(item.tag_string_general || '').split(/\s+/).filter(Boolean);
            const aTags = String(item.tag_string_artist || '').split(/\s+/).filter(Boolean);
            const mTags = String(item.tag_string_meta || '').split(/\s+/).filter(Boolean);
            for (const t of cTags) nativeTagCategories[t] = 'character';
            for (const t of sTags) nativeTagCategories[t] = 'series_ip';
            for (const t of gTags) if (!nativeTagCategories[t]) nativeTagCategories[t] = 'attribute_xp';
            for (const t of aTags) nativeTagCategories[t] = 'meta_general';
            for (const t of mTags) nativeTagCategories[t] = 'meta_general';
            const allTags = [...new Set([...cTags, ...sTags, ...gTags, ...aTags, ...mTags])];
            const thumb = item.preview_file_url || item.large_file_url || item.file_url || '';
            artworks.push({
              id: `db_${id}`,
              externalId: id,
              source: 'danbooru',
              externalUrl: `https://danbooru.donmai.us/posts/${id}`,
              title: cTags[0] ? cTags[0].replace(/_/g, ' ') : `Danbooru #${id}`,
              tags: allTags,
              userId: aTags[0] || String(item.uploader_id || ''),
              userName: aTags.join(', ') || `Uploader #${item.uploader_id || ''}`,
              thumbUrl: thumb,
              regularUrl: item.large_file_url || item.file_url || thumb,
              originalUrl: item.file_url || item.large_file_url || thumb,
              createDate: item.created_at || '',
              pageCount: 1,
              illustType: item.file_ext === 'mp4' || item.file_ext === 'webm' ? 2 : 0,
              xRestrict: String(item.rating || '').toLowerCase() === 'e' ? 1 : 0,
              isAi: allTags.some((t) => /^ai[-_]?generated$/i.test(t)),
              bookmarkCount: Number(item.fav_count || item.score || 0)
            });
          }
          if (data.length < 95) reachedEnd = true;
        }
      }
      hasMore = !reachedEnd && (isKeysetCursor || (typeof nextPage === 'number' && nextPage <= 1001));
    } else if (source === 'sankaku') {
      let skTags = tag;
      if (order === 'popular_d' && !/order:/i.test(skTags)) skTags += ' order:popular';
      else if (order === 'date' && !/order:/i.test(skTags)) skTags += ' order:id_asc';
      let cur = cursor;
      let reachedEnd = false;
      for (let i = 0; i < chunkPages && !reachedEnd && !signal.aborted; i++) {
        const pNum = startPage + i;
        onProgress?.(pNum, artworks.length);
        const u = cur
          ? `https://sankakuapi.com/posts/keyset?tags=${encodeURIComponent(skTags)}&limit=40&next=${encodeURIComponent(cur)}`
          : `https://sankakuapi.com/posts/keyset?tags=${encodeURIComponent(skTags)}&limit=40`;
        const r = await fetch(u, { headers: { Accept: 'application/vnd.sankaku.api+json;v=2' }, signal });
        if (!r.ok) { reachedEnd = true; break; }
        const d = await r.json();
        const list = Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : [];
        if (!list.length) { reachedEnd = true; break; }
        pagesScanned++;
        nextPage = pNum + 1;
        cur = d?.meta?.next || '';
        nextCursor = cur;
        for (const item of list) {
          if (!item?.id) continue;
          const id = String(item.id);
          const rLow = String(item.rating || '').toLowerCase();
          const xRestrict = rLow === 'e' || rLow === 'explicit' ? 1 : 0;
          if (mode === 'safe' && (xRestrict > 0 || rLow === 'q')) continue;
          if (mode === 'r18' && xRestrict === 0) continue;
          const tags = [];
          let artistName = item.author?.name || '';
          for (const tObj of Array.isArray(item.tags) ? item.tags : []) {
            const tn = tObj?.tagName || tObj?.name || '';
            if (!tn) continue;
            tags.push(tn);
            nativeTagCategories[tn] = mapDirectBooruCat(tObj.type ?? 0);
            if (tObj.name_ja && tObj.name_ja !== tn) translations[tn] = tObj.name_ja;
            if (Number(tObj.type) === 1 && !artistName) artistName = tObj.name_en || tn;
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
            isAi: Boolean(item.has_ai_derivatives) || tags.some((t) => /ai_generated|novelai/i.test(t)),
            bookmarkCount: Number(item.fav_count || item.total_score || 0)
          });
        }
        if (!cur) reachedEnd = true;
      }
      hasMore = !reachedEnd && Boolean(nextCursor);
    }

    return {
      source,
      primaryTag: tag,
      pagesScanned,
      nextPage,
      nextCursor,
      hasMore,
      engine: `${source.toUpperCase()}-DIRECT`,
      artworks,
      nativeTagCategories,
      translations
    };
  }

  async function executeAnalysis(overrideQuery, opts = {}) {
    if (state.activeStreamAbort) {
      state.activeStreamAbort.abort();
      state.activeStreamAbort = null;
    }

    const rawInput = overrideQuery !== undefined ? overrideQuery : $('tagSearchInput').value;
    const parsed = parseUserQueryInput(rawInput);
    if (!parsed.tag) {
      showToast('请输入标签或粘贴图站链接');
      return;
    }

    if (parsed.source && SOURCE_META[parsed.source]) {
      state.source = parsed.source;
      localStorage.setItem('pixez_source_v43', state.source);
      if ($('sourceSelect')) $('sourceSelect').value = state.source;
      applySourceUI();
    } else if (opts.source && SOURCE_META[opts.source]) {
      state.source = opts.source;
      localStorage.setItem('pixez_source_v43', state.source);
      if ($('sourceSelect')) $('sourceSelect').value = state.source;
      applySourceUI();
    }

    const source = state.source || 'pixiv';
    const srcMeta = SOURCE_META[source] || SOURCE_META.pixiv;

    $('tagSearchInput').value = parsed.tag;
    recordRecentSearch(parsed.tag, source);
    if (parsed.mode) $('modeSelect').value = parsed.mode;
    if (parsed.sMode) $('sModeSelect').value = parsed.sMode;
    syncCustomSelects();
    hideAutocomplete();

    const rawPagesChoice = opts.overridePages || $('pagesSelect').value;
    const isAllModeRaw = String(rawPagesChoice).toUpperCase() === 'ALL';
    const isCustomDepth = String(rawPagesChoice).toUpperCase() === 'CUSTOM';
    const isDateRangeDepth = String(rawPagesChoice).toUpperCase() === 'DATE_RANGE';
    let userStartDate = isDateRangeDepth ? String($('customStartDateInput')?.value || '').trim() : '';
    let userEndDate = isDateRangeDepth ? String($('customEndDateInput')?.value || '').trim() : '';
    if (userStartDate && userEndDate && userStartDate > userEndDate) {
      const tmp = userStartDate;
      userStartDate = userEndDate;
      userEndDate = tmp;
    }
    if (isDateRangeDepth && !userStartDate && !userEndDate) {
      showToast('请至少填写起始日期或结束日期');
      return;
    }
    const isAllMode = isAllModeRaw || isDateRangeDepth;
    const customUnit = $('customDepthUnit')?.value === 'pages' ? 'pages' : 'works';
    const customNumRaw = parseInt($('customDepthValue')?.value || '2000', 10);
    const customNum = Number.isFinite(customNumRaw) && customNumRaw > 0 ? customNumRaw : (customUnit === 'works' ? 2000 : 20);
    const targetWorksLimit = isCustomDepth && customUnit === 'works' ? Math.max(10, Math.min(200000, customNum)) : 0;
    const requestedMaxPages = isAllMode
      ? 2000
      : isCustomDepth
      ? (customUnit === 'works'
          ? Math.max(1, Math.min(8000, Math.ceil(targetWorksLimit / 25)))
          : Math.max(1, Math.min(5000, customNum)))
      : Math.max(1, parseInt(rawPagesChoice, 10) || 3);
    const pages = isAllMode || targetWorksLimit > 0 || requestedMaxPages > 1000 ? 'ALL' : String(requestedMaxPages);
    const order = $('orderSelect')?.value || 'date_d';
    const mode = $('modeSelect').value;
    const sMode = $('sModeSelect').value;
    const type = $('typeSelect').value;
    const includePopular = $('includePopularCheck').checked;

    // If the user previously stopped / got interrupted on THIS exact tag, ask whether to resume or clear & restart!
    if (!opts.resumeFromCache && !opts.freshRestart) {
      const ic = state.interruptedCrawl;
      if (
        ic &&
        ic.count > 0 &&
        ic.source === source &&
        ic.mode === mode &&
        ic.tag.toLowerCase() === parsed.tag.toLowerCase()
      ) {
        const btn = $('preflightResumeBtn');
        if (btn) btn.textContent = `接着采集 (从 ${ic.count.toLocaleString()} 作继续)`;
        const totPart = ic.total > 0 ? ` / 全站 ${ic.total.toLocaleString()}` : '';
        showPreflightBanner(
          `检测到 [${ic.tag}] 已有上次中断保留的 ${ic.count.toLocaleString()}${totPart} 件样本（最旧至 ${ic.oldestDate || '—'}），请选择「接着采集」断点续采，或「清空重采」从零开始：`,
          false,
          true
        );
        return;
      }
    }
    if (opts.freshRestart) state.interruptedCrawl = null;

    const progressWrap = $('progressBarWrap');
    const progressText = $('progressText');
    const progressPct = $('progressPercent');
    const progressFill = $('progressBarFill');
    const stopBtn = $('stopStreamBtn');
    const analyzeBtn = $('analyzeBtn');

    const commonHeaders = {};
    if (state.cookie) commonHeaders['X-Pixiv-Cookie'] = state.cookie;
    if (state.accessToken) commonHeaders['X-Pixiv-Token'] = state.accessToken;
    if (state.r34Key) commonHeaders['X-R34-Key'] = state.r34Key;
    if (state.r34Uid) commonHeaders['X-R34-Uid'] = state.r34Uid;

    // Step 1: Pre-flight tag total count lookup BEFORE running progress bar!
    const hasVerifiedChromePixivSession = Boolean(
      state.authStatus?.loggedIn &&
      (state.chromeBridgeProfile || state.authStatus.mode === 'chrome_bridge' || state.authStatus.mode === 'cookie')
    );
    let preflightInfo = opts.preflightInfo || null;
    if (!preflightInfo) {
      showPreflightBanner(`正在探测 [${srcMeta.label}] 标签 [${parsed.tag}] 的全站作品总数...`, false);
      try {
        // Logged-in Chrome Userscript direct preflight: gives EXACT 4-way breakdown (全量含R-18/AI vs 全年龄 vs R-18 vs 纯手绘)!
        // Plus automatic Pixiv official CPS translation resolution when user searches English/Romaji directly (e.g. `cure sky` -> `キュアスカイ`)
        let effectivePixivQuery = parsed.tag;
        let autoMappedFrom = '';
        if (source === 'pixiv' && state.bridgeFetchAvailable && typeof window._pixezBridgeFetch === 'function' && hasVerifiedChromePixivSession) {
          const probePixivQuery = async (qTag) => {
            const encP = encodeURIComponent(qTag).replace(/%2F/gi, '%252F');
            const encW = encodeURIComponent(qTag);
            const preDateQs = `${userStartDate ? `&scd=${encodeURIComponent(userStartDate)}` : ''}${userEndDate ? `&ecd=${encodeURIComponent(userEndDate)}` : ''}`;
            const mkU = (m, aiT) => `https://www.pixiv.net/ajax/search/artworks/${encP}?word=${encW}&order=date_d&mode=${encodeURIComponent(m)}&p=1&s_mode=${encodeURIComponent(sMode)}&type=${encodeURIComponent(type)}&ai_type=${aiT}&lang=zh${preDateQs}`;
            const probes = [
              window._pixezBridgeFetch(mkU(mode, 0), { timeout: 9000 }),
              window._pixezBridgeFetch(mkU(mode, 1), { timeout: 9000 })
            ];
            if (mode === 'all') probes.push(window._pixezBridgeFetch(mkU('safe', 0), { timeout: 9000 }));
            const [rAll, rHuman, rSafe] = await Promise.all(probes);
            const getTot = (r) => {
              const b = r?.json?.body;
              const blk = b?.illustManga || b?.illust || b?.manga || {};
              return Number(blk.total || 0);
            };
            return {
              totalAllAi: getTot(rAll),
              totalHuman: getTot(rHuman),
              totalSafe: mode === 'all' ? getTot(rSafe) : (mode === 'safe' ? getTot(rAll) : 0)
            };
          };
          let counts = await probePixivQuery(effectivePixivQuery);
          // If pure ASCII English/Romaji returned few literal hits (<250), resolve via Pixiv official /rpc/cps.php!
          if (counts.totalAllAi < 250 && /^[A-Za-z0-9\s\-_'.:!?/]+$/.test(effectivePixivQuery) && /[A-Za-z]{2,}/.test(effectivePixivQuery)) {
            try {
              const cpsRes = await window._pixezBridgeFetch(
                `https://www.pixiv.net/rpc/cps.php?keyword=${encodeURIComponent(effectivePixivQuery)}&lang=zh`,
                { timeout: 6000 }
              );
              const cands = Array.isArray(cpsRes?.json?.candidates) ? cpsRes.json.candidates : [];
              const qLow = effectivePixivQuery.trim().toLowerCase();
              const qNorm = normRomajiKey(qLow);
              const exactHit =
                cands.find(
                  (c) =>
                    c?.tag_name &&
                    (c.type === 'tag_translation' || c.type === 'romaji') &&
                    (String(c.tag_translation || '').trim().toLowerCase() === qLow ||
                      (qNorm.length >= 3 && normRomajiKey(c.tag_translation) === qNorm))
                ) ||
                (counts.totalAllAi < 30
                  ? cands.find((c) => c?.tag_name && c.type === 'romaji' && Number(c.access_count || 0) >= 50000)
                  : null);
              if (exactHit && exactHit.tag_name !== effectivePixivQuery) {
                const mappedCounts = await probePixivQuery(exactHit.tag_name);
                if (mappedCounts.totalAllAi > counts.totalAllAi * 2) {
                  autoMappedFrom = effectivePixivQuery;
                  effectivePixivQuery = exactHit.tag_name;
                  counts = mappedCounts;
                }
              }
            } catch (_) {}
          }
          const { totalAllAi, totalHuman, totalSafe } = counts;
          if (totalAllAi > 0) {
            const totalR18 = mode === 'all' && totalSafe > 0 && totalAllAi >= totalSafe ? totalAllAi - totalSafe : (mode === 'r18' ? totalAllAi : 0);
            const totalAi = totalHuman > 0 && totalAllAi >= totalHuman ? totalAllAi - totalHuman : 0;
            const r18RateStr = mode === 'all' && totalAllAi > 0 && totalSafe > 0 ? ` (${((totalR18 / totalAllAi) * 100).toFixed(1)}%)` : '';
            const modeDesc = mode === 'safe' ? '全年龄含AI' : mode === 'r18' ? '仅R-18含AI' : '全量含R-18与AI';
            const rangeBadge = isDateRangeDepth ? ` [${userStartDate || '最早'}~${userEndDate || '至今'}]` : '';
            const mappedBadge = autoMappedFrom ? ` [Pixiv官方译名映射: ${autoMappedFrom} → ${effectivePixivQuery}]` : '';
            const detailParts = [];
            if (mode === 'all' && totalSafe > 0) detailParts.push(`全年龄 ${totalSafe.toLocaleString()} + R-18 ${totalR18.toLocaleString()}${r18RateStr}`);
            if (totalHuman > 0) detailParts.push(`纯手绘 ${totalHuman.toLocaleString()} / AI ${totalAi.toLocaleString()}`);
            preflightInfo = {
              error: false,
              source: 'pixiv',
              resolvedTag: effectivePixivQuery,
              totalPosts: totalAllAi,
              pageSize: 60,
              estimatedPages: Math.ceil(totalAllAi / 60),
              totalBreakdown: {
                totalAllAi,
                totalSafe,
                totalR18,
                totalHuman,
                totalAi,
                includesR18: mode !== 'safe',
                isSafeBaselineOnly: false
              },
              note: `Pixiv [${effectivePixivQuery}]${mappedBadge}${rangeBadge} ${modeDesc}共 ${totalAllAi.toLocaleString()} 件${detailParts.length ? `（${detailParts.join(' · ')}）` : ''} · 油猴已登录直连 (60作/页·支持日期分段)`
            };
          }
        }
        // Danbooru & Sankaku support direct browser CORS cleanly (avoids CF-Worker egress WAF)
        if (!preflightInfo && (source === 'danbooru' || source === 'sankaku') && API_BASE) {
          preflightInfo = await directBrowserTagInfo(source, parsed.tag, mode);
        }
        if (!preflightInfo) {
          const infoQs = new URLSearchParams({ source, tag: parsed.tag, mode, s_mode: sMode, type });
          const infoCtrl = new AbortController();
          const infoTimer = setTimeout(() => infoCtrl.abort(), 16000);
          let ir;
          try {
            ir = await apiFetch(`/api/tag-info?${infoQs.toString()}`, {
              headers: commonHeaders,
              signal: infoCtrl.signal
            });
          } finally {
            clearTimeout(infoTimer);
          }
          const idata = await ir.json().catch(() => null);
          if (idata && idata.error) {
            showPreflightBanner(idata.message || '无法连接目标数据源', false);
            if (idata.needsAuth) {
              showToast(idata.message, 4500);
              $('authModal')?.classList.remove('hidden');
            }
            return;
          }
          if (idata && source === 'pixiv' && !idata.totalBreakdown && idata.totalPosts > 0) {
            idata.totalBreakdown = {
              totalAllAi: Number(idata.totalPosts),
              totalSafe: Number(idata.totalPosts),
              totalHuman: Number(idata.totalHuman || 0),
              includesR18: Boolean(!idata.totalIsSafeBaseline && (state.cookie || state.accessToken)),
              isSafeBaselineOnly: Boolean(idata.totalIsSafeBaseline || (!state.cookie && !state.accessToken && mode !== 'safe'))
            };
          }
          preflightInfo = idata || null;
        }
      } catch (_) {}
    }

    if (preflightInfo) {
      const totalPosts = Number(preflightInfo.totalPosts || 0);
      const estPages = Number(preflightInfo.estimatedPages || 0);
      const resolvedTagForCache = preflightInfo.resolvedTag || parsed.tag;
      const bannerNote =
        preflightInfo.note ||
        (totalPosts > 0
          ? `[${srcMeta.label}] 标签 [${resolvedTagForCache}] 全站共 ${totalPosts.toLocaleString()} 件作品 (约 ${estPages.toLocaleString()} 页)`
          : `[${srcMeta.label}] 已连接 [${resolvedTagForCache}]`);

      // Smart Cache Reuse: check local IndexedDB for this exact tag BEFORE crawling!
      if (!opts.freshRestart && !opts.resumeFromCache && !opts.ignoreCacheReuse) {
        let cachedRec = await PulseCacheDB.get(makeCacheKey(source, resolvedTagForCache, mode));
        if (!cachedRec && resolvedTagForCache.toLowerCase() !== parsed.tag.toLowerCase()) {
          cachedRec = await PulseCacheDB.get(makeCacheKey(source, parsed.tag, mode));
        }
        if (cachedRec && Array.isArray(cachedRec.artworks) && cachedRec.artworks.length > 0) {
          const recSMode = cachedRec.sMode || 's_tag';
          const recType = cachedRec.type || 'all';
          const recOrder = cachedRec.order || 'date_d';
          const recDateRange = cachedRec.dateRange || '';
          const curDateRange = isDateRangeDepth ? `${userStartDate}~${userEndDate}` : '';
          const paramsCompatible =
            recSMode === sMode &&
            recType === type &&
            recDateRange === curDateRange;
          const baselineCompatible =
            Boolean(cachedRec.totalBreakdown?.isSafeBaselineOnly) ===
            Boolean(preflightInfo.totalBreakdown?.isSafeBaselineOnly);

          if (paramsCompatible && baselineCompatible) {
            const cachedWorksCount = cachedRec.artworks.length;
            const cachedTotal = Number(cachedRec.pixivTotal || 0);
            const sameTotalCount = totalPosts > 0 && cachedTotal > 0 && totalPosts === cachedTotal;
            const pageSizeEst = Number(preflightInfo.pageSize || (source === 'pixiv' ? 60 : 100));
            const requestedApproxWorks = isAllMode
              ? totalPosts
              : (targetWorksLimit > 0 ? targetWorksLimit : requestedMaxPages * pageSizeEst);
            const cacheIsComplete = !cachedRec.hasMore || (totalPosts > 0 && cachedWorksCount >= totalPosts);
            const coversRequestedDepth =
              cacheIsComplete ||
              (recOrder === order && cachedWorksCount >= Math.min(totalPosts || Infinity, requestedApproxWorks));

            if (sameTotalCount && coversRequestedDepth) {
              // Exact same total works count & cache covers requested depth -> automatic zero-network reuse!
              state.lockedSubTags.clear();
              state.rawDataset = {
                ...cachedRec,
                pixivTotal: totalPosts,
                totalBreakdown: preflightInfo.totalBreakdown || cachedRec.totalBreakdown || null
              };
              if (cachedRec.danbooruMap) Object.assign(state.danbooruCache, cachedRec.danbooruMap);
              if ($('engineSourceIndicator')) {
                $('engineSourceIndicator').textContent = `LOCAL-CACHE · 秒开复用 (${cachedWorksCount.toLocaleString()}作)`;
                $('engineSourceIndicator').classList.remove('hidden');
              }
              state.pendingCacheHit = {
                tag: resolvedTagForCache,
                source,
                record: cachedRec,
                preflightInfo,
                overridePages: rawPagesChoice
              };
              recomputeAndRender();
              showPreflightBanner(
                `${bannerNote} —— 核对全站作品数与本地缓存完全一致（${totalPosts.toLocaleString()} 作，无新增），已自动复用缓存（${cachedWorksCount.toLocaleString()} 作，0 流量秒开）。`,
                false,
                false,
                { showUse: false, showResume: false, forceLabel: '强制重新抓取' }
              );
              showToast(`作品数一致 (${totalPosts.toLocaleString()} 作)，已自动复用本地缓存`);
              return;
            }

            // Cache exists for the same tag, but either total count changed or user now wants deeper depth -> prompt cleanly!
            state.pendingCacheHit = {
              tag: resolvedTagForCache,
              source,
              record: cachedRec,
              preflightInfo,
              overridePages: rawPagesChoice
            };
            const delta = totalPosts > 0 && cachedTotal > 0 ? totalPosts - cachedTotal : 0;
            const deltaText =
              sameTotalCount
                ? `全站总数未变（${totalPosts.toLocaleString()} 作），当前已缓存 ${cachedWorksCount.toLocaleString()} 作`
                : delta > 0
                ? `全站总数较上次新增 +${delta.toLocaleString()} 作（${cachedTotal.toLocaleString()} → ${totalPosts.toLocaleString()}）`
                : delta < 0
                ? `全站总数较上次变化 ${delta.toLocaleString()} 作（${cachedTotal.toLocaleString()} → ${totalPosts.toLocaleString()}）`
                : `上次已缓存 ${cachedWorksCount.toLocaleString()} 作`;
            showPreflightBanner(
              `${bannerNote} —— 检测到本地已有 [${resolvedTagForCache}] 缓存（${deltaText}），可直接秒开复用、续采合并或强制重新抓取：`,
              false,
              false,
              {
                showUse: true,
                useLabel: `直接复用缓存 (${cachedWorksCount.toLocaleString()}作)`,
                showResume: Boolean(isAllMode || cachedRec.hasMore || cachedWorksCount < totalPosts),
                resumeLabel: '基于缓存续采合并',
                forceLabel: '强制重新抓取'
              }
            );
            return;
          }
        }
      }

      const isHugeAll =
        isAllModeRaw &&
        !isDateRangeDepth &&
        !opts.skipConfirm &&
        (totalPosts > 2400 || estPages > 40 || Boolean(preflightInfo.totalIsApproximate));

      if (isHugeAll) {
        state.pendingPreflight = { tag: parsed.tag, source, preflightInfo };
        showPreflightBanner(
          `${bannerNote} —— 当前选择了「全部页」，完整采集耗时较长（过程中可随时点击「停止翻页」锁定样本），请确认采集深度：`,
          true
        );
        return;
      }
      showPreflightBanner(bannerNote, false);
    }

    // Step 2: Start Multi-Chunk Streaming Sampling!
    progressWrap.classList.remove('hidden');
    stopBtn.classList.remove('hidden');
    analyzeBtn.disabled = true;
    progressText.textContent = `正在连接 ${srcMeta.label} 采样 [${parsed.tag}]...`;
    progressPct.textContent = '3%';
    progressFill.style.width = '3%';

    const abortCtrl = new AbortController();
    state.activeStreamAbort = abortCtrl;

    const resumeRec = opts.resumeFromCache || null;
    const accumWorks = new Map();
    const accumTrans = { ...(resumeRec?.translations || {}) };
    const accumNativeCats = { ...(resumeRec?.nativeTagCategories || {}) };
    const accumDanbooru = { ...(resumeRec?.danbooruMap || {}) };
    if (resumeRec && Array.isArray(resumeRec.artworks)) {
      for (const w of resumeRec.artworks) {
        if (w && w.id) accumWorks.set(String(w.id), w);
      }
    }
    let totalPagesScanned = Number(resumeRec?.pagesScanned || 0);
    let knownTotalPosts = Math.max(Number(preflightInfo?.totalPosts || 0), Number(resumeRec?.pixivTotal || 0));
    let knownBreakdown = preflightInfo?.totalBreakdown || resumeRec?.totalBreakdown || null;
    let primaryResolvedTag = preflightInfo?.resolvedTag || resumeRec?.primaryTag || parsed.tag;
    let lastEngine = resumeRec?.engine || `${srcMeta.label.toUpperCase()}-API`;

    const chunkSize = source === 'pixiv' ? 16 : 10;
    const reachedDepthCap = () =>
      (targetWorksLimit > 0 && accumWorks.size >= targetWorksLimit) ||
      (!isAllMode && targetWorksLimit === 0 && totalPagesScanned >= requestedMaxPages);
    const canAcceptMoreWorks = () => targetWorksLimit <= 0 || accumWorks.size < targetWorksLimit;
    const wantContinueBeyondSingleWindow = () =>
      isAllMode || (targetWorksLimit > 0 && accumWorks.size < targetWorksLimit) || (targetWorksLimit === 0 && totalPagesScanned < requestedMaxPages);
    let startPage = 1;
    let cursor = resumeRec?.nextCursor || '';
    let activeEndDate = userEndDate || (order === 'date' ? '' : (resumeRec?.oldestDate || ''));
    let activeStartDate = userStartDate || (order === 'date' ? (resumeRec?.newestDate || '') : '');
    const isWorkInDateRange = (w) => {
      if (!isDateRangeDepth) return true;
      const ymd = String(w?.createDate || '').slice(0, 10);
      if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return true;
      if (userStartDate && ymd < userStartDate) return false;
      if (userEndDate && ymd > userEndDate) return false;
      return true;
    };
    let activeOrder = order;
    let activeQueryTag =
      isDateRangeDepth && source === 'danbooru'
        ? `${primaryResolvedTag} date:${userStartDate || ''}..${userEndDate || ''}`
        : primaryResolvedTag;
    let activeAiFilter = '0';
    let activePhaseLabel = '';
    let hibiQueue = null;
    let currentHibiPhase = null;
    const exhaustedHibiPairs = new Set();
    let consecutiveRateLimits = 0;
    let consecutiveSkippedPages = 0;
    let lockedR18Engine = '';
    let hasMore = true;
    let chunkIndex = 0;
    let lastSnapshotRenderAt = 0;
    let lastCheckpointSize = accumWorks.size;

    // Background-tab-proof sleep: uses an inline Web Worker timer (exempt from Chrome's 1s/60s background tab throttling!)
    let bgTimerWorker = null;
    const bgPending = new Map();
    let bgSeq = 1;
    try {
      const wBlob = new Blob(
        ['self.onmessage=function(e){var d=e.data;setTimeout(function(){self.postMessage(d.id);},d.ms);};'],
        { type: 'application/javascript' }
      );
      const wUrl = URL.createObjectURL(wBlob);
      bgTimerWorker = new Worker(wUrl);
      URL.revokeObjectURL(wUrl);
      bgTimerWorker.onmessage = (e) => {
        const fn = bgPending.get(e.data);
        if (fn) {
          bgPending.delete(e.data);
          fn();
        }
      };
    } catch (_) {
      bgTimerWorker = null;
    }

    const abortableSleep = (ms) =>
      new Promise((resolve, reject) => {
        if (abortCtrl.signal.aborted) {
          const e = new Error('Aborted');
          e.name = 'AbortError';
          return reject(e);
        }
        let fallbackTimer = null;
        let wid = 0;
        const cleanup = () => {
          if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; }
          if (wid) { bgPending.delete(wid); wid = 0; }
          abortCtrl.signal.removeEventListener('abort', onAbort);
        };
        const onDone = () => {
          cleanup();
          resolve();
        };
        const onAbort = () => {
          cleanup();
          const e = new Error('Aborted');
          e.name = 'AbortError';
          reject(e);
        };
        abortCtrl.signal.addEventListener('abort', onAbort, { once: true });
        if (bgTimerWorker) {
          wid = bgSeq++;
          bgPending.set(wid, onDone);
          bgTimerWorker.postMessage({ id: wid, ms });
        } else {
          fallbackTimer = setTimeout(onDone, ms);
        }
      });

    const buildHibiPartitionQueue = (baseTag, initialOrder, ageMode, safeBaseTotal) => {
      const q = [];
      const cleanBase = baseTag.trim();
      const oppOrder = initialOrder === 'date' ? 'date_d' : 'date';
      // Phase 2: Opposite direction of base query (5,000 newest + 5,000 oldest = 10,000 100%-unbiased works!)
      if (initialOrder !== 'popular_d') {
        q.push({ tag: cleanBase, order: oppOrder, aiFilter: '0', label: oppOrder === 'date' ? '最早回溯段' : '最新补充段' });
      }
      // CRITICAL STATISTICAL ACCURACY GUARD:
      // Only split into R-18 / -R-18 / AI / Non-AI quadrants when safeBaseTotal <= 22,000 (~35,000 true total incl. R-18),
      // so ALL quadrants complete 100% without hitting the 10k per-quadrant cap (avoiding artificial 50% R-18 bias on mega-tags!).
      const allowFullQuadrants = safeBaseTotal > 0 && safeBaseTotal <= 22000;
      if (ageMode === 'r18' && allowFullQuadrants) {
        const r18Tag = /\br-?18\b/i.test(cleanBase) ? cleanBase : `${cleanBase} R-18`;
        q.push({ tag: r18Tag, order: 'date_d', aiFilter: '1', label: '手绘 R-18 最新段', pairKey: 'nonai_r18' });
        q.push({ tag: r18Tag, order: 'date', aiFilter: '1', label: '手绘 R-18 最早段', pairOf: 'nonai_r18' });
        q.push({ tag: `${r18Tag} (AIイラスト OR AI生成 OR NovelAI OR AIart)`, order: 'date_d', aiFilter: '0', label: 'AI R-18 最新段', pairKey: 'ai_r18' });
        q.push({ tag: `${r18Tag} (AIイラスト OR AI生成 OR NovelAI OR AIart)`, order: 'date', aiFilter: '0', label: 'AI R-18 最早段', pairOf: 'ai_r18' });
      } else if (ageMode === 'all' && allowFullQuadrants) {
        // 4 Disjoint Quadrants complete to ~100% -> exact unbiased counts + exact R-18% & AI%!
        q.push({ tag: `${cleanBase} R-18`, order: 'date_d', aiFilter: '1', label: '手绘 R-18 最新段', pairKey: 'nonai_r18' });
        q.push({ tag: `${cleanBase} R-18`, order: 'date', aiFilter: '1', label: '手绘 R-18 最早段', pairOf: 'nonai_r18' });
        q.push({ tag: `${cleanBase} -R-18`, order: 'date_d', aiFilter: '1', label: '手绘全年龄 最新段', pairKey: 'nonai_safe' });
        q.push({ tag: `${cleanBase} -R-18`, order: 'date', aiFilter: '1', label: '手绘全年龄 最早段', pairOf: 'nonai_safe' });
        q.push({ tag: `${cleanBase} R-18 (AIイラスト OR AI生成 OR NovelAI OR AIart)`, order: 'date_d', aiFilter: '0', label: 'AI R-18 最新段', pairKey: 'ai_r18' });
        q.push({ tag: `${cleanBase} R-18 (AIイラスト OR AI生成 OR NovelAI OR AIart)`, order: 'date', aiFilter: '0', label: 'AI R-18 最早段', pairOf: 'ai_r18' });
        q.push({ tag: `${cleanBase} -R-18 (AIイラスト OR AI生成 OR NovelAI OR AIart)`, order: 'date_d', aiFilter: '0', label: 'AI全年龄 最新段', pairKey: 'ai_safe' });
        q.push({ tag: `${cleanBase} -R-18 (AIイラスト OR AI生成 OR NovelAI OR AIart)`, order: 'date', aiFilter: '0', label: 'AI全年龄 最早段', pairOf: 'ai_safe' });
        q.push({ tag: `${cleanBase} R-18`, order: 'date_d', aiFilter: '0', label: 'R-18 全量补充(最新)', pairKey: 'all_r18' });
        q.push({ tag: `${cleanBase} R-18`, order: 'date', aiFilter: '0', label: 'R-18 全量补充(最早)', pairOf: 'all_r18' });
        q.push({ tag: `${cleanBase} -R-18`, order: 'date_d', aiFilter: '0', label: '全年龄 全量补充(最新)', pairKey: 'all_safe' });
        q.push({ tag: `${cleanBase} -R-18`, order: 'date', aiFilter: '0', label: '全年龄 全量补充(最早)', pairOf: 'all_safe' });
      }
      return q;
    };

    const computeOldestDate = () => {
      let oldest = '';
      for (const w of accumWorks.values()) {
        const d = String(w.createDate || '').slice(0, 10);
        if (d && (!oldest || d < oldest)) oldest = d;
      }
      return oldest;
    };

    const computeNewestDate = () => {
      let newest = '';
      for (const w of accumWorks.values()) {
        const d = String(w.createDate || '').slice(0, 10);
        if (d && (!newest || d > newest)) newest = d;
      }
      return newest;
    };

    const checkpointToIndexedDb = async (stillHasMore = false) => {
      const worksArr = Array.from(accumWorks.values());
      if (!worksArr.length) return;
      const cacheRecord = {
        key: makeCacheKey(source, primaryResolvedTag, mode),
        source,
        primaryTag: primaryResolvedTag,
        mode,
        sMode,
        type,
        order,
        dateRange: isDateRangeDepth ? `${userStartDate}~${userEndDate}` : '',
        pixivTotal: knownTotalPosts,
        totalBreakdown: knownBreakdown,
        pagesScanned: totalPagesScanned,
        engine: lastEngine,
        hasMore: stillHasMore,
        oldestDate: computeOldestDate(),
        newestDate: computeNewestDate(),
        nextCursor: cursor,
        artworks: worksArr,
        translations: accumTrans,
        nativeTagCategories: accumNativeCats,
        danbooruMap: accumDanbooru
      };
      const maxBytes = state.cacheLimitMb > 0 ? state.cacheLimitMb * 1024 * 1024 : 0;
      await PulseCacheDB.putWithEviction(cacheRecord, maxBytes);
      refreshCacheBadge();
      return cacheRecord;
    };

    const flushDataset = (forceRender = false, stillHasMore = false) => {
      const worksArr = Array.from(accumWorks.values());
      state.rawDataset = {
        source,
        primaryTag: primaryResolvedTag,
        pixivTotal: knownTotalPosts,
        totalBreakdown: knownBreakdown,
        pagesScanned: totalPagesScanned,
        engine: lastEngine,
        hasMore: stillHasMore,
        oldestDate: computeOldestDate(),
        artworks: worksArr,
        translations: accumTrans,
        nativeTagCategories: accumNativeCats,
        danbooruMap: accumDanbooru
      };
      $('engineSourceIndicator').textContent = `${lastEngine} · ${totalPagesScanned}P`;
      if (worksArr.length - lastCheckpointSize >= 3000) {
        lastCheckpointSize = worksArr.length;
        checkpointToIndexedDb(stillHasMore);
      }
      const now = Date.now();
      const renderInterval = worksArr.length < 1500 ? 450 : (worksArr.length < 6000 ? 1200 : 2200);
      if (forceRender || now - lastSnapshotRenderAt >= renderInterval) {
        lastSnapshotRenderAt = now;
        if (forceRender) state.tableDisplayLimit = 160;
        recomputeAndRender();
      }
    };

    try {
      // Direct Chrome Userscript v4.1+ Pixiv Web AJAX mode: uses user's REAL logged-in Chrome Pixiv session!
      // Full R-18 + True AI (ai_type=0) + unlimited ecd/scd date-window segmentation past 30k-500k works!
      // CRITICAL: ONLY run when Chrome actually has a verified Pixiv session (so Guest mode NEVER hits 0%-R18 Web AJAX!).
      if (source === 'pixiv' && state.bridgeFetchAvailable && typeof window._pixezBridgeFetch === 'function' && hasVerifiedChromePixivSession) {
        const encodePixivPath = (t) => encodeURIComponent(t).replace(/%2F/gi, '%252F');
        const webOrd = order === 'date' ? 'date' : 'date_d';
        const shiftYmd = (d, delta) => {
          const ts = Date.parse(`${d}T00:00:00Z`) + delta * 86400000;
          return Number.isFinite(ts) ? new Date(ts).toISOString().slice(0, 10) : '';
        };
        const todayYmd = new Date().toISOString().slice(0, 10);
        const minStopBound = userStartDate || '2007-09-01';
        const maxStopBound = userEndDate || todayYmd;
        let bEndDate = activeEndDate;
        let bStartDate = activeStartDate;
        // Keep segmented Web AJAX date spans <= 360 days so non-premium accounts satisfy Pixiv's 1-year date filter cleanly!
        const applyBoundedWindow = (endStr, startStr) => {
          if (webOrd === 'date_d' && endStr && !startStr) {
            const s = shiftYmd(endStr, -360);
            return { start: s && s > minStopBound ? s : minStopBound, end: endStr };
          }
          if (webOrd === 'date' && startStr && !endStr) {
            const e = shiftYmd(startStr, 360);
            return { start: startStr, end: e && e < maxStopBound ? e : maxStopBound };
          }
          return { start: startStr, end: endStr };
        };
        ({ start: bStartDate, end: bEndDate } = applyBoundedWindow(bEndDate, bStartDate));

        const maxSegs = isAllMode || targetWorksLimit > 0 ? 120 : 24;
        lastEngine = 'USERSCRIPT-PIXIV-DIRECT';
        let bridgeWorked = false;
        // Full-speed adaptive concurrency: 3 pages in parallel with 0ms idle sleep when healthy;
        // ONLY slows down / cools down if Pixiv actually returns a 429/403/error, then auto-ramps back up!
        let concurrency = 3;
        let pageDelayMs = 0;
        let cleanPagesSinceThrottle = 0;
        let consecutiveEmptySegs = 0;
        let consecutiveThrottledSegs = 0;

        const fetchOneBridgePage = async (pageNum, segHint) => {
          const dateQs = `${bStartDate ? `&scd=${encodeURIComponent(bStartDate)}` : ''}${bEndDate ? `&ecd=${encodeURIComponent(bEndDate)}` : ''}`;
          const targetUrl = `https://www.pixiv.net/ajax/search/artworks/${encodePixivPath(primaryResolvedTag)}?word=${encodeURIComponent(primaryResolvedTag)}&order=${webOrd}&mode=${encodeURIComponent(mode)}&p=${pageNum}&s_mode=${encodeURIComponent(sMode)}&type=${encodeURIComponent(type)}&ai_type=0&lang=zh${dateQs}`;
          const backoffSec = [2, 4, 8, 14, 22, 35];
          for (let attempt = 0; attempt < backoffSec.length; attempt++) {
            if (abortCtrl.signal.aborted) return { json: null, throttled: false };
            const r = await window._pixezBridgeFetch(targetUrl, { timeout: 35000 });
            if (r && r.ok && r.json && !r.json.error && r.json.body) {
              return { json: r.json, throttled: attempt > 0 };
            }
            const isRetryable =
              !r ||
              r.status === 429 ||
              r.status === 403 ||
              r.status >= 500 ||
              r.status === 0 ||
              Boolean(r.json?.error);
            if (isRetryable && attempt < backoffSec.length - 1) {
              const waitS = backoffSec[attempt];
              concurrency = 1;
              pageDelayMs = Math.min(500, Math.max(pageDelayMs + 100, 200));
              cleanPagesSinceThrottle = 0;
              const bgTag = document.hidden ? ' [后台保活]' : '';
              progressText.textContent = `[油猴直连 Pixiv]${segHint}${bgTag} 触发限流/波动，冷却 ${waitS}s 后自动续采第 ${pageNum} 页 (${attempt + 1}/${backoffSec.length - 1} · 已采 ${accumWorks.size.toLocaleString()} 作)...`;
              await abortableSleep(waitS * 1000);
              continue;
            }
            return { json: null, throttled: isRetryable };
          }
          return { json: null, throttled: true };
        };

        for (let seg = 1; seg <= maxSegs && !abortCtrl.signal.aborted && !reachedDepthCap(); seg++) {
          let segOldest = '';
          let segNewest = '';
          let segAdded = 0;
          let segRawTotal = 0;
          let segPagesFetched = 0;
          let segExpectedTotal = 0;
          let segHitCeiling = false;
          let segNaturalEnd = false;
          let segThrottledOut = false;
          let consecutiveBatchFails = 0;
          let consecutiveZeroNewPages = 0;
          const segPageLimit = isAllMode || targetWorksLimit > 0 ? 1000 : Math.max(1, requestedMaxPages - totalPagesScanned);

          for (let p = 1; p <= segPageLimit && !abortCtrl.signal.aborted && !reachedDepthCap(); ) {
            const segHint =
              bStartDate && bEndDate
                ? ` [分段#${seg} ${bStartDate}~${bEndDate}]`
                : bEndDate
                ? ` [分段#${seg} 截止 ${bEndDate}]`
                : bStartDate
                ? ` [分段#${seg} 起始 ${bStartDate}]`
                : '';
            const curTotal = accumWorks.size;
            const targetW = targetWorksLimit > 0
              ? targetWorksLimit
              : isAllMode ? (knownTotalPosts || curTotal + 600) : requestedMaxPages * 60;
            const pct = Math.min(96, Math.max(4, Math.round((curTotal / Math.max(1, targetW)) * 96)));
            const denomLabel = targetWorksLimit > 0
              ? ` / 目标 ${targetWorksLimit.toLocaleString()}`
              : knownTotalPosts > 0 ? ` / ${knownTotalPosts.toLocaleString()}` : '';
            progressText.textContent = `[油猴直连 Pixiv]${segHint} 第 ${totalPagesScanned + 1} 页 · 已采集 ${curTotal.toLocaleString()}${denomLabel} 件作品`;
            progressPct.textContent = `${pct}%`;
            progressFill.style.width = `${pct}%`;

            // Keep page 1 of a fresh segment single if target is tiny; otherwise fire `concurrency` (default 3) pages in parallel!
            let batchLen = concurrency;
            if (targetWorksLimit > 0) {
              const remPages = Math.max(1, Math.ceil((targetWorksLimit - accumWorks.size) / 60));
              batchLen = Math.min(batchLen, remPages);
            }
            if (p + batchLen - 1 > segPageLimit) batchLen = segPageLimit - p + 1;
            const pBatch = [];
            for (let k = 0; k < batchLen; k++) pBatch.push(p + k);

            const results = await Promise.all(pBatch.map((pageNum) => fetchOneBridgePage(pageNum, segHint)));
            let batchOk = 0;
            let batchRaw = 0;
            let batchNew = 0;
            let anyThrottled = false;

            for (let idx = 0; idx < results.length; idx++) {
              const { json, throttled } = results[idx];
              if (throttled) anyThrottled = true;
              if (!json || !json.body) continue;
              batchOk++;
              bridgeWorked = true;
              totalPagesScanned++;
              segPagesFetched++;
              const b = json.body;
              const blk = b.illustManga || b.illust || b.manga || {};
              const blkTotal = Number(blk.total || 0);
              if (blkTotal > segExpectedTotal) segExpectedTotal = blkTotal;
              if (seg === 1 && !bStartDate && !bEndDate && blkTotal > knownTotalPosts) knownTotalPosts = blkTotal;
              if (b.tagTranslation) {
                for (const [k, v] of Object.entries(b.tagTranslation)) {
                  const tr = v.zh || v.zh_tw || v.en || v.romaji || '';
                  if (tr) accumTrans[k] = tr;
                }
              }
              const list = Array.isArray(blk.data) ? blk.data : [];
              let pageRaw = 0;
              let pageNew = 0;
              if (list.length < 20) segNaturalEnd = true;
              for (const item of list) {
                if (!canAcceptMoreWorks()) break;
                if (!item || !item.id || item.isAdContainer) continue;
                pageRaw++;
                batchRaw++;
                segRawTotal++;
                const idStr = String(item.id);
                const cDate = String(item.createDate || '');
                const ymd = cDate.slice(0, 10);
                if (ymd) {
                  if (!segOldest || ymd < segOldest) segOldest = ymd;
                  if (!segNewest || ymd > segNewest) segNewest = ymd;
                  if (isDateRangeDepth) {
                    if (userStartDate && ymd < userStartDate) {
                      if (webOrd === 'date_d') segNaturalEnd = true;
                      continue;
                    }
                    if (userEndDate && ymd > userEndDate) {
                      if (webOrd === 'date') segNaturalEnd = true;
                      continue;
                    }
                  }
                }
                if (accumWorks.has(idStr)) continue;
                const tags = Array.isArray(item.tags) ? item.tags.filter(Boolean) : [];
                accumWorks.set(idStr, {
                  id: idStr,
                  source: 'pixiv',
                  title: item.title || '无题',
                  tags,
                  userId: String(item.userId || ''),
                  userName: item.userName || '',
                  thumbUrl: item.url || '',
                  createDate: cDate,
                  pageCount: Number(item.pageCount || 1),
                  illustType: Number(item.illustType || 0),
                  xRestrict: Number(item.xRestrict || 0),
                  isAi: item.aiType === 2 || tags.some((t) => /^(AIイラスト|AI生成|AIart|NovelAI)$/i.test(t)),
                  bookmarkCount: Number(item.bookmarkCount || item.totalBookmarks || 0)
                });
                pageNew++;
                batchNew++;
                segAdded++;
              }
              if (pageRaw > 0 && pageNew === 0) consecutiveZeroNewPages++;
              else if (pageNew > 0) consecutiveZeroNewPages = 0;
            }

            if (batchOk === 0) {
              consecutiveBatchFails++;
              concurrency = 1;
              pageDelayMs = 250;
              cleanPagesSinceThrottle = 0;
              await checkpointToIndexedDb(true);
              if (consecutiveBatchFails <= 3) {
                const waitS = consecutiveBatchFails * 12;
                progressText.textContent = `[油猴直连 Pixiv]${segHint}${document.hidden ? ' [后台保活]' : ''} 上游冷却恢复中 ${waitS}s (重试 ${consecutiveBatchFails}/3，已保留 ${accumWorks.size.toLocaleString()} 作)...`;
                await abortableSleep(waitS * 1000);
                continue; // Retry same page p without incrementing!
              }
              segHitCeiling = true;
              segThrottledOut = true;
              break;
            }

            consecutiveBatchFails = 0;
            p += pBatch.length;

            // Auto-ramp back to full speed (3-way concurrency, 0ms delay) once Pixiv is healthy!
            if (!anyThrottled && batchOk === pBatch.length) {
              cleanPagesSinceThrottle += batchOk;
              if (cleanPagesSinceThrottle >= 12) {
                if (pageDelayMs > 0) pageDelayMs = 0;
                if (concurrency < 3) concurrency++;
                cleanPagesSinceThrottle = 0;
              }
            }

            flushDataset(false, true);
            if (!bridgeWorked || reachedDepthCap()) break;

            const stillHasMoreSiteWide = knownTotalPosts > 0 && accumWorks.size < knownTotalPosts - 50;
            const stillHasMoreInWindow = segExpectedTotal > 0 && segRawTotal < segExpectedTotal - 60;
            if (batchRaw === 0) {
              if (stillHasMoreInWindow || stillHasMoreSiteWide) segHitCeiling = true;
              else segNaturalEnd = true;
              break;
            }
            if (batchNew === 0 || consecutiveZeroNewPages >= 2) {
              segHitCeiling = true;
              break;
            }
            if (segNaturalEnd) {
              if (stillHasMoreInWindow || stillHasMoreSiteWide) segHitCeiling = true;
              break;
            }
            if (p > 1000) { segHitCeiling = true; break; }
            if (pageDelayMs > 0) await abortableSleep(pageDelayMs);
          }

          if (!bridgeWorked) break;
          await checkpointToIndexedDb(true);
          if (reachedDepthCap()) break;
          if (knownTotalPosts > 0 && accumWorks.size >= knownTotalPosts - 10) break;

          if (segThrottledOut && segAdded === 0) {
            consecutiveThrottledSegs++;
            if (consecutiveThrottledSegs >= 3) break;
            const coolS = consecutiveThrottledSegs * 25;
            progressText.textContent = `[油猴直连 Pixiv] 等待 Pixiv 限流窗口解除 (${coolS}s 后继续分段，已保留 ${accumWorks.size.toLocaleString()} 作)...`;
            await abortableSleep(coolS * 1000);
            continue;
          }
          if (segAdded > 0) {
            consecutiveEmptySegs = 0;
            consecutiveThrottledSegs = 0;
          } else {
            consecutiveEmptySegs++;
          }

          // Check whether we genuinely reached the end of the entire tag (NOT a 25-page / 83-page window ceiling!)
          const hasUnexploredDateSpan =
            webOrd === 'date_d'
              ? Boolean(bStartDate && bStartDate > minStopBound)
              : Boolean(bEndDate && bEndDate < maxStopBound);
          const trulyExhausted =
            segNaturalEnd &&
            !segHitCeiling &&
            !segThrottledOut &&
            !hasUnexploredDateSpan &&
            (segExpectedTotal === 0 || segRawTotal >= segExpectedTotal - 60) &&
            (knownTotalPosts === 0 || accumWorks.size >= knownTotalPosts - 50);
          if (trulyExhausted) break;
          if (consecutiveEmptySegs >= 5) break;

          // Slide to next <=360-day date window seamlessly!
          if (webOrd === 'date_d') {
            let nextEnd = '';
            if (segAdded > 0) {
              const cand = segOldest || computeOldestDate();
              nextEnd = cand && cand === bEndDate ? shiftYmd(cand, -1) : cand;
            } else if (segRawTotal > 0 && bEndDate) {
              // All works on boundary day were already collected -> step back 1 day
              nextEnd = shiftYmd(bEndDate, -1);
            } else if (bStartDate && bStartDate > minStopBound) {
              // This 360-day window was empty -> jump to previous 360-day window
              nextEnd = shiftYmd(bStartDate, -1);
            } else {
              const cand = computeOldestDate();
              nextEnd = cand ? shiftYmd(cand, -1) : '';
            }
            if (!nextEnd || nextEnd < minStopBound) break;
            ({ start: bStartDate, end: bEndDate } = applyBoundedWindow(nextEnd, ''));
          } else {
            let nextStart = '';
            if (segAdded > 0) {
              const cand = segNewest || computeNewestDate();
              nextStart = cand && cand === bStartDate ? shiftYmd(cand, 1) : cand;
            } else if (segRawTotal > 0 && bStartDate) {
              nextStart = shiftYmd(bStartDate, 1);
            } else if (bEndDate && bEndDate < maxStopBound) {
              nextStart = shiftYmd(bEndDate, 1);
            } else {
              const cand = computeNewestDate();
              nextStart = cand ? shiftYmd(cand, 1) : '';
            }
            if (!nextStart || nextStart > maxStopBound) break;
            ({ start: bStartDate, end: bEndDate } = applyBoundedWindow('', nextStart));
          }
          if (pageDelayMs > 0) await abortableSleep(pageDelayMs);
        }
        if (bridgeWorked) {
          hasMore = false;
        }
      }

      const useDirectBrowserBooru = Boolean(API_BASE && (source === 'danbooru' || source === 'sankaku'));
      while (hasMore && !abortCtrl.signal.aborted && !reachedDepthCap() && chunkIndex < 650) {
        chunkIndex++;
        if (useDirectBrowserBooru) {
          const stepChunk = targetWorksLimit > 0
            ? Math.min(6, Math.max(1, Math.ceil((targetWorksLimit - accumWorks.size) / Math.max(1, srcMeta.pageSize))))
            : isAllMode ? 6 : Math.min(6, Math.max(1, requestedMaxPages - totalPagesScanned));
          // Danbooru keyset cursor (`b<minId>` / `a<maxId>`) automatically breaks the 1000-page / 100k ceiling!
          let effectivePageArg = startPage;
          if (source === 'danbooru' && typeof startPage === 'number' && startPage > 1000) {
            if (activeOrder === 'date') {
              let maxId = 0;
              for (const w of accumWorks.values()) {
                const nid = Number(w.externalId || String(w.id).replace(/\D+/g, ''));
                if (nid > maxId) maxId = nid;
              }
              if (maxId > 0) effectivePageArg = `a${maxId}`;
            } else {
              let minId = Infinity;
              for (const w of accumWorks.values()) {
                const nid = Number(w.externalId || String(w.id).replace(/\D+/g, ''));
                if (nid > 0 && nid < minId) minId = nid;
              }
              if (Number.isFinite(minId)) effectivePageArg = `b${minId}`;
            }
          }
          const ch = await directBrowserSampleChunk({
            source,
            tag: activeQueryTag,
            startPage: effectivePageArg,
            chunkPages: stepChunk,
            cursor,
            mode,
            order: activeOrder,
            signal: abortCtrl.signal,
            onProgress: (curP, inChunk) => {
              const curTotal = targetWorksLimit > 0 ? Math.min(targetWorksLimit, accumWorks.size + inChunk) : accumWorks.size + inChunk;
              const targetWorks = targetWorksLimit > 0
                ? targetWorksLimit
                : isAllMode
                ? (knownTotalPosts > 0 ? knownTotalPosts : Math.max(curTotal + 200, 1000))
                : Math.min(knownTotalPosts > 0 ? knownTotalPosts : requestedMaxPages * srcMeta.pageSize, requestedMaxPages * srcMeta.pageSize);
              const pct = targetWorks > 0 ? Math.min(96, Math.max(4, Math.round((curTotal / targetWorks) * 96))) : 35;
              const denom = targetWorksLimit > 0 ? ` / 目标 ${targetWorksLimit.toLocaleString()}` : knownTotalPosts > 0 ? ` / ${knownTotalPosts.toLocaleString()}` : '';
              progressText.textContent = `[${srcMeta.label}] 第 ${curP} 页 · 已采集 ${curTotal.toLocaleString()}${denom} 件作品`;
              progressPct.textContent = `${pct}%`;
              progressFill.style.width = `${pct}%`;
            }
          });
          lastEngine = ch.engine;
          Object.assign(accumNativeCats, ch.nativeTagCategories || {});
          Object.assign(accumTrans, ch.translations || {});
          const beforeCount = accumWorks.size;
          let booruPassedBound = false;
          for (const w of ch.artworks || []) {
            if (!canAcceptMoreWorks()) break;
            if (!w || !w.id) continue;
            if (!isWorkInDateRange(w)) {
              const y = String(w.createDate || '').slice(0, 10);
              if (y && ((activeOrder === 'date_d' && userStartDate && y < userStartDate) || (activeOrder === 'date' && userEndDate && y > userEndDate))) {
                booruPassedBound = true;
              }
              continue;
            }
            accumWorks.set(String(w.id), w);
          }
          totalPagesScanned += ch.pagesScanned || 0;
          flushDataset(true, ch.hasMore && !reachedDepthCap() && !booruPassedBound);
          if (!ch.hasMore || booruPassedBound || (accumWorks.size === beforeCount && !isDateRangeDepth) || reachedDepthCap()) {
            hasMore = false;
          } else {
            startPage = ch.nextPage;
            cursor = ch.nextCursor || '';
          }
          continue;
        }
        const effChunkPages = targetWorksLimit > 0
          ? Math.min(chunkSize, Math.max(2, Math.ceil((targetWorksLimit - accumWorks.size) / 28)))
          : isAllMode
          ? chunkSize
          : Math.min(chunkSize, Math.max(1, requestedMaxPages - totalPagesScanned));
        const qs = new URLSearchParams({
          source,
          tag: activeQueryTag,
          pages,
          order: activeOrder,
          startPage: String(startPage),
          chunkPages: String(effChunkPages),
          cursor,
          endDate: activeEndDate,
          startDate: activeStartDate,
          aiFilter: activeAiFilter,
          mode,
          s_mode: sMode,
          type,
          includePopular: includePopular ? '1' : '0'
        });

        const resp = await apiFetch(`/api/analyze-stream?${qs.toString()}`, {
          headers: commonHeaders,
          signal: abortCtrl.signal
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const reader = resp.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let chunkHasMore = false;
        let chunkHitOffsetCeiling = false;
        let chunkRateLimited = false;
        let chunkRetryAfterMs = 4500;
        let chunkNextPage = startPage;
        let chunkNextCursor = '';
        let chunkPagesDone = 0;
        const beforeChunkSize = accumWorks.size;
        const basePagesBeforeChunk = totalPagesScanned;

        let chunkPassedDateBound = false;
        let chunkSawRawWorks = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const block of parts) {
            const lines = block.split('\n');
            let eventType = 'message';
            let dataStr = '';
            for (const line of lines) {
              if (line.startsWith('event:')) eventType = line.slice(6).trim();
              else if (line.startsWith('data:')) dataStr += line.slice(5).trim();
            }
            if (!dataStr) continue;

            try {
              const payload = JSON.parse(dataStr);
              if (eventType === 'progress') {
                if (payload.totalMatches && Number(payload.totalMatches) > knownTotalPosts) {
                  knownTotalPosts = Number(payload.totalMatches);
                }
                const targetWorks = targetWorksLimit > 0
                  ? targetWorksLimit
                  : isAllMode
                  ? (knownTotalPosts > 0 ? knownTotalPosts : Math.max(accumWorks.size + 300, 1200))
                  : Math.min(knownTotalPosts > 0 ? knownTotalPosts : requestedMaxPages * srcMeta.pageSize, requestedMaxPages * srcMeta.pageSize);
                const curWorks = targetWorksLimit > 0
                  ? Math.min(targetWorksLimit, Math.max(accumWorks.size, Number(payload.sampledArtworks || 0)))
                  : Math.max(accumWorks.size, Number(payload.sampledArtworks || 0));
                const pct = targetWorks > 0
                  ? Math.min(96, Math.max(4, Math.round((curWorks / targetWorks) * 96)))
                  : (payload.totalPages ? Math.min(95, Math.round((payload.currentPage / payload.totalPages) * 95)) : 35);
                const segHint = activeEndDate
                  ? ` [截止 ${activeEndDate}]`
                  : activeStartDate
                  ? ` [起始 ${activeStartDate}]`
                  : activePhaseLabel
                  ? ` [${activePhaseLabel}]`
                  : '';
                const denomText = targetWorksLimit > 0
                  ? ` / 目标 ${targetWorksLimit.toLocaleString()}`
                  : knownTotalPosts > 0 ? ` / ${knownTotalPosts.toLocaleString()}` : '';
                progressText.textContent =
                  denomText
                    ? `[${srcMeta.label}]${segHint} 第 ${payload.currentPage || startPage} 页 · 已采集 ${curWorks.toLocaleString()}${denomText} 件作品`
                    : (payload.message || `[${srcMeta.label}]${segHint} 正在采集第 ${payload.currentPage || startPage} 页 (已采 ${curWorks.toLocaleString()} 作)...`);
                progressPct.textContent = `${pct}%`;
                progressFill.style.width = `${pct}%`;
              } else if (eventType === 'snapshot' || eventType === 'complete') {
                const ds = payload.data || payload;
                if (ds.danbooruMap) {
                  Object.assign(state.danbooruCache, ds.danbooruMap);
                  Object.assign(accumDanbooru, ds.danbooruMap);
                }
                if (ds.nativeTagCategories) Object.assign(accumNativeCats, ds.nativeTagCategories);
                if (ds.translations || ds.tagTranslations) Object.assign(accumTrans, ds.translations || ds.tagTranslations);
                if (!activePhaseLabel && (ds.primaryTag || ds.meta?.queryTag)) primaryResolvedTag = ds.primaryTag || ds.meta?.queryTag;
                const chunkEngine = ds.engine || ds.meta?.engine || '';
                if (!lockedR18Engine && mode !== 'safe' && (chunkEngine === 'HIBI-APP-API' || chunkEngine === 'PIXIV-OAUTH-APP-API')) {
                  lockedR18Engine = chunkEngine;
                }
                const isSafeOnlyContaminant =
                  Boolean(lockedR18Engine) &&
                  (chunkEngine === 'WEB-AJAX-MIRROR' || chunkEngine === 'PIXIVIZ-RELAY');
                if (chunkEngine && !isSafeOnlyContaminant) lastEngine = chunkEngine;
                const dsTotal = Number(ds.pixivTotal ?? ds.meta?.totalMatches ?? 0);
                if (dsTotal > knownTotalPosts) knownTotalPosts = dsTotal;

                if (!isSafeOnlyContaminant) {
                  for (const w of ds.artworks || []) {
                    if (!canAcceptMoreWorks()) break;
                    if (!w || !w.id) continue;
                    chunkSawRawWorks++;
                    if (!isWorkInDateRange(w)) {
                      const y = String(w.createDate || '').slice(0, 10);
                      if (y && ((activeOrder === 'date_d' && userStartDate && y < userStartDate) || (activeOrder === 'date' && userEndDate && y > userEndDate))) {
                        chunkPassedDateBound = true;
                      }
                      continue;
                    }
                    accumWorks.set(String(w.id), w);
                  }
                }

                if (eventType === 'complete') {
                  chunkPagesDone = Number(ds.pagesScanned || ds.meta?.pagesFetched || 0);
                  chunkHasMore = Boolean(payload.hasMore ?? ds.hasMore) && !reachedDepthCap();
                  chunkHitOffsetCeiling = Boolean(payload.hitOffsetCeiling ?? ds.hitOffsetCeiling);
                  chunkRateLimited = Boolean(payload.rateLimited ?? ds.rateLimited);
                  chunkRetryAfterMs = Number(payload.retryAfterMs || ds.retryAfterMs || 4500);
                  chunkNextPage = Number(payload.nextPage || ds.nextPage || (startPage + chunkPagesDone));
                  chunkNextCursor = String(payload.nextCursor || ds.nextCursor || '');
                  totalPagesScanned = basePagesBeforeChunk + chunkPagesDone;
                  flushDataset(true, chunkHasMore);
                } else {
                  const snapPages = Number(ds.pagesScanned || ds.meta?.pagesFetched || 1);
                  totalPagesScanned = Math.max(totalPagesScanned, basePagesBeforeChunk + snapPages);
                  flushDataset(false, !reachedDepthCap());
                }
              } else if (eventType === 'error') {
                showToast(`采样提示: ${payload.message || '请求异常'}`, payload.needsAuth ? 6000 : 3000);
                if (payload.needsAuth) $('authModal')?.classList.remove('hidden');
                chunkHasMore = false;
              }
            } catch (_) {}
          }
        }

        const newlyAddedInChunk = accumWorks.size - beforeChunkSize;
        if (newlyAddedInChunk > 0) {
          consecutiveRateLimits = 0;
          consecutiveSkippedPages = 0;
        }
        // Keep knownTotalPosts >= accumWorks.size (guest Web AJAX total can undercount R-18 works!)
        if (accumWorks.size > knownTotalPosts) knownTotalPosts = accumWorks.size;

        if (reachedDepthCap() || (isDateRangeDepth && chunkPassedDateBound && lastEngine === 'HIBI-APP-API')) {
          hasMore = false;
          break;
        }

        // 1) Upstream rate-limit cooldown & cached-error page skip (HibiAPI caches 429 JSON per page!)
        if (chunkHasMore && chunkRateLimited && wantContinueBeyondSingleWindow()) {
          consecutiveRateLimits++;
          if (consecutiveRateLimits <= 5) {
            const waitMs = Math.min(25000, chunkRetryAfterMs * consecutiveRateLimits);
            const waitSec = Math.round(waitMs / 1000);
            progressText.textContent = `[${srcMeta.label}]${activePhaseLabel ? ` [${activePhaseLabel}]` : ''} 上游限流，冷却 ${waitSec}s 后自动续采第 ${chunkNextPage} 页 (重试 ${consecutiveRateLimits}/5 · 已采 ${accumWorks.size.toLocaleString()} 作)...`;
            await abortableSleep(waitMs);
            startPage = chunkNextPage;
            cursor = chunkNextCursor;
          } else if (lastEngine === 'HIBI-APP-API' && chunkNextPage < 167 && consecutiveSkippedPages < 4) {
            // HibiAPI often caches a single page's Rate Limit error in Redis — skip that 1 page and continue!
            consecutiveSkippedPages++;
            consecutiveRateLimits = 0;
            startPage = chunkNextPage + 1;
            cursor = chunkNextCursor;
            progressText.textContent = `[${srcMeta.label}]${activePhaseLabel ? ` [${activePhaseLabel}]` : ''} 跳过上游异常缓存页 ${chunkNextPage}，继续采集第 ${startPage} 页...`;
            await abortableSleep(1500);
          } else {
            // Fall through to next partition cleanly if upstream is genuinely rate-limiting this whole query
            chunkHasMore = false;
            consecutiveRateLimits = 0;
            consecutiveSkippedPages = 0;
          }
        }
        if (chunkHasMore && chunkRateLimited) {
          // Already handled above (retrying or skipping)
        } else if (chunkHasMore && (newlyAddedInChunk > 0 || activePhaseLabel || (isDateRangeDepth && chunkSawRawWorks > 0 && !chunkPassedDateBound)) && wantContinueBeyondSingleWindow()) {
          startPage = chunkNextPage;
          cursor = chunkNextCursor;
        } else if (
          wantContinueBeyondSingleWindow() &&
          source === 'pixiv' &&
          newlyAddedInChunk > 0 &&
          (
            chunkHitOffsetCeiling ||
            (lastEngine === 'PIXIV-OAUTH-APP-API' && chunkNextPage > 160) ||
            ((lastEngine === 'WEB-AJAX' || lastEngine === 'WEB-AJAX-MIRROR') &&
              (chunkNextPage >= 1000 || (knownTotalPosts > 0 && accumWorks.size < knownTotalPosts)))
          )
        ) {
          // Date-Window Segmentation for Web AJAX / OAuth App API
          const ascending = activeOrder === 'date';
          const shiftDay = (d, delta) => {
            const ts = Date.parse(`${d}T00:00:00Z`) + delta * 86400000;
            return Number.isFinite(ts) ? new Date(ts).toISOString().slice(0, 10) : '';
          };
          const current = ascending ? activeStartDate : activeEndDate;
          let edge = ascending ? computeNewestDate() : computeOldestDate();
          if (edge && edge === current) edge = shiftDay(edge, ascending ? 1 : -1);
          const outOfRange =
            (ascending && userEndDate && edge > userEndDate) ||
            (!ascending && userStartDate && edge < userStartDate);
          if (edge && edge !== current && !outOfRange) {
            await checkpointToIndexedDb(true);
            if (ascending) activeStartDate = edge;
            else activeEndDate = edge;
            startPage = 1;
            showToast(`已保存前段 ${accumWorks.size.toLocaleString()} 件作品至本地缓存，自动切换下一时间段 (${ascending ? '起始' : '截止'} ${edge}) 继续采集...`, 3500);
          } else {
            hasMore = false;
          }
        } else if ((isAllMode || (targetWorksLimit > 0 && accumWorks.size < targetWorksLimit)) && source === 'pixiv' && lastEngine === 'HIBI-APP-API') {
          // Multi-Partition Balanced HibiAPI Full-History Queue (up to 40,000+ works with FULL R-18 + AI!)
          if (currentHibiPhase?.pairKey && chunkNextPage <= 160 && !chunkHitOffsetCeiling) {
            // This date_d partition finished under 4,800 works -> 100% captured, skip its paired date_asc pass!
            exhaustedHibiPairs.add(currentHibiPhase.pairKey);
          }
          if (!hibiQueue) {
            // Start extra partitions whenever tag could exceed single-direction 5,000 cap
            const needMore =
              chunkNextPage > 155 ||
              accumWorks.size >= 3800 ||
              (knownTotalPosts > 0 && accumWorks.size < knownTotalPosts - 30);
            hibiQueue = needMore
              ? buildHibiPartitionQueue(primaryResolvedTag, order, mode, Number(preflightInfo?.totalPosts || 0))
              : [];
          }
          let nextPhase = null;
          while (hibiQueue.length > 0) {
            const cand = hibiQueue.shift();
            if (cand.pairOf && exhaustedHibiPairs.has(cand.pairOf)) continue;
            nextPhase = cand;
            break;
          }
          if (nextPhase) {
            await checkpointToIndexedDb(true);
            currentHibiPhase = nextPhase;
            activeQueryTag = nextPhase.tag;
            activeOrder = nextPhase.order;
            activeAiFilter = nextPhase.aiFilter;
            activePhaseLabel = nextPhase.label;
            startPage = 1;
            consecutiveRateLimits = 0;
            consecutiveSkippedPages = 0;
            showToast(`已缓存 ${accumWorks.size.toLocaleString()} 作，自动切换分段 [${nextPhase.label}] 继续全量合并...`, 3000);
            await abortableSleep(1200);
          } else {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      flushDataset(true, false);
      const savedRec = await checkpointToIndexedDb(false);
      progressFill.style.width = '100%';
      progressPct.textContent = '100%';
      const finalCount = accumWorks.size;
      const incompleteCrawl = Boolean(
        finalCount > 0 &&
        knownTotalPosts > 0 &&
        finalCount < knownTotalPosts - 50 &&
        !reachedDepthCap()
      );
      if (incompleteCrawl) {
        state.interruptedCrawl = {
          source,
          tag: primaryResolvedTag,
          mode,
          cacheKey: makeCacheKey(source, primaryResolvedTag, mode),
          count: finalCount,
          total: knownTotalPosts,
          oldestDate: computeOldestDate(),
          newestDate: computeNewestDate(),
          record: savedRec || state.rawDataset
        };
        const btn = $('preflightResumeBtn');
        if (btn) btn.textContent = `接着采集 (从 ${finalCount.toLocaleString()} 作继续)`;
        showPreflightBanner(
          `当前已保留 [${primaryResolvedTag}] ${finalCount.toLocaleString()} / ${knownTotalPosts.toLocaleString()} 件作品（已存缓存，最旧至 ${computeOldestDate() || '—'}），可点击右侧「接着采集」继续增量续采，或「清空重采」从零开始：`,
          false,
          true
        );
      } else {
        state.interruptedCrawl = null;
      }
      progressText.textContent =
        knownTotalPosts > 0
          ? `完成 [${srcMeta.label}] [${primaryResolvedTag}] 采样：已采集 ${finalCount.toLocaleString()} 件 (全站共 ${knownTotalPosts.toLocaleString()} 件 / ${totalPagesScanned} 页，已存入本地缓存)`
          : `完成 [${srcMeta.label}] [${primaryResolvedTag}] 采样：共 ${finalCount.toLocaleString()} 件作品 (${totalPagesScanned} 页，已存入本地缓存)`;

      // Auto-enrich top co-tags via Danbooru Wiki ontology & Pixiv official illust translations!
      if (['pixiv', 'safebooru', 'zerochan', 'rule34'].includes(source) && finalCount > 0) {
        enrichTopTagsViaDanbooru(Array.from(accumWorks.values()), primaryResolvedTag);
      }
    } catch (err) {
      const savedOnInterrupt = accumWorks.size > 0 ? await checkpointToIndexedDb(true) : null;
      if (accumWorks.size > 0) {
        flushDataset(true, true);
        state.interruptedCrawl = {
          source,
          tag: primaryResolvedTag,
          mode,
          cacheKey: makeCacheKey(source, primaryResolvedTag, mode),
          count: accumWorks.size,
          total: knownTotalPosts,
          oldestDate: computeOldestDate(),
          newestDate: computeNewestDate(),
          record: savedOnInterrupt || state.rawDataset
        };
        const btn = $('preflightResumeBtn');
        if (btn) btn.textContent = `接着采集 (从 ${accumWorks.size.toLocaleString()} 作继续)`;
        const reason = err.name === 'AbortError' ? '已手动暂停' : `采样中断 (${err.message})`;
        const totPart = knownTotalPosts > 0 ? ` / 全站 ${knownTotalPosts.toLocaleString()}` : '';
        showPreflightBanner(
          `${reason}：已保留 [${primaryResolvedTag}] ${accumWorks.size.toLocaleString()}${totPart} 件样本（最旧至 ${computeOldestDate() || '—'}），可直接「接着采集」断点续采，或「清空重采」：`,
          false,
          true
        );
      }
      if (err.name === 'AbortError') {
        showToast(`已停止翻页并保留 ${accumWorks.size.toLocaleString()} 件样本（可点「接着采集」续采或「清空重采」）`);
      } else {
        showToast(`采样中断: ${err.message}（已保留 ${accumWorks.size.toLocaleString()} 件样本）`);
      }
    } finally {
      if (bgTimerWorker) { try { bgTimerWorker.terminate(); } catch (_) {} }
      state.activeStreamAbort = null;
      analyzeBtn.disabled = false;
      stopBtn.classList.add('hidden');
      setTimeout(() => progressWrap.classList.add('hidden'), 1800);
    }
  }

  // =========================================================================
  // 10. TOPOLOGY GRAPH VIEW (60 FPS Cached Layout, O(K^2) Links, Character Avatars, 5~40 Slider)
  // =========================================================================
  let _graphAvatarCacheKey = '';
  const _graphAvatarUrlCache = new Map();
  let _graphRafId = 0;

  function scheduleNetworkRender() {
    if (_graphRafId) return;
    _graphRafId = requestAnimationFrame(() => {
      _graphRafId = 0;
      renderNetworkGraph(false);
    });
  }

  function findBestAvatarUrlForTag(tag, isCenter = false) {
    const works = state.filteredArtworks && state.filteredArtworks.length
      ? state.filteredArtworks
      : (state.rawDataset?.artworks || []);
    if (!works.length) return '';

    const cacheSig = `${state.rawDataset?.primaryTag || ''}|${works.length}|${works[0]?.id || ''}`;
    if (_graphAvatarCacheKey !== cacheSig) {
      _graphAvatarCacheKey = cacheSig;
      _graphAvatarUrlCache.clear();
    }
    const lookupKey = isCenter ? '__CENTER__' : tag;
    if (_graphAvatarUrlCache.has(lookupKey)) {
      return _graphAvatarUrlCache.get(lookupKey);
    }

    // O(min(N, 1200)) single-pass linear scan (ZERO O(N log N) sorting, ZERO classifyTagClient in hot loop!)
    let bestUrl = '';
    let bestScore = -1;
    let matched = 0;
    const step = works.length > 2400 ? Math.max(1, Math.floor(works.length / 2000)) : 1;
    for (let i = 0; i < works.length; i += step) {
      const w = works[i];
      if (!w || !w.thumbUrl) continue;
      if (!isCenter && (!Array.isArray(w.tags) || !w.tags.includes(tag))) continue;
      matched++;
      const safeBonus = (w.xRestrict || 0) === 0 ? 1000000 : 0;
      const humanBonus = !w.isAi ? 200000 : 0;
      const score = safeBonus + humanBonus + Number(w.bookmarkCount || 0);
      if (score > bestScore) {
        bestScore = score;
        bestUrl = w.thumbUrl;
      }
      if (matched >= 40 && bestScore >= 1200000) break;
    }

    // Fallback scan from beginning if strided scan didn't hit a rare tag
    if (!bestUrl && step > 1) {
      for (let i = 0; i < works.length; i++) {
        const w = works[i];
        if (!w || !w.thumbUrl) continue;
        if (!isCenter && (!Array.isArray(w.tags) || !w.tags.includes(tag))) continue;
        bestUrl = w.thumbUrl;
        if ((w.xRestrict || 0) === 0) break;
      }
    }

    const result = bestUrl ? proxyImg(bestUrl) : '';
    _graphAvatarUrlCache.set(lookupKey, result);
    return result;
  }

  function getCachedAvatarImage(tag, url) {
    if (!url) return null;
    const cache = state.graph.avatarImgCache;
    const existing = cache.get(tag);
    if (existing && existing.src === url) {
      return existing.status === 'ready' ? existing.img : null;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const record = { status: 'loading', img, src: url };
    cache.set(tag, record);
    img.onload = () => {
      record.status = 'ready';
      if (!$('networkView').classList.contains('hidden')) {
        scheduleNetworkRender();
      }
    };
    img.onerror = () => {
      record.status = 'error';
    };
    img.src = url;
    return null;
  }

  function renderNetworkGraph(exportMode = false) {
    const canvas = $('networkCanvas');
    const stage = $('networkCanvasFrame');
    if (!canvas || !stage || !state.rawDataset) return;

    const stageRect = stage.getBoundingClientRect();
    const W = Math.max(360, Math.round(stageRect.width || 880));
    const H = Math.max(240, Math.round(stageRect.height || 520));
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }

    const ctx = canvas.getContext('2d');
    const limit = Math.max(5, Math.min(40, parseInt($('graphNodeLimitRange').value, 10) || 20));
    $('graphNodeLimitVal').textContent = limit;

    const showAvatar = $('graphShowAvatarCheck') ? $('graphShowAvatarCheck').checked : true;
    const showJp = $('graphShowJpCheck') ? $('graphShowJpCheck').checked : true;
    const showBooru = $('graphShowBooruCheck') ? $('graphShowBooruCheck').checked : true;
    const showZh = $('graphShowZhCheck') ? $('graphShowZhCheck').checked : true;

    const topTags = state.computedCoTags.slice(0, limit);
    const cx = W / 2;
    const cy = H / 2;
    const minDim = Math.min(W, H);

    const style = getComputedStyle(document.documentElement);
    const bgCol = style.getPropertyValue('--t-bg').trim() || '#091006';
    const textCol = style.getPropertyValue('--t-text-strong').trim() || '#221b12';
    const mutedCol = style.getPropertyValue('--t-muted').trim() || '#736650';
    const accentCol = style.getPropertyValue('--t-accent').trim() || '#755f3e';
    const borderCol = style.getPropertyValue('--t-border').trim() || '#806e4b';

    const primaryLabel = state.rawDataset.primaryTag || state.rawDataset.meta?.queryTag || '';
    const primaryCat = classifyTagClient(primaryLabel);
    const centerAvatarUrl = showAvatar ? findBestAvatarUrlForTag(primaryLabel, true) : '';

    const nodes = [
      {
        id: primaryLabel,
        label: primaryLabel,
        translation: '',
        danbooruTag: '',
        category: primaryCat,
        isCenter: true,
        avatarUrl: centerAvatarUrl,
        x: cx,
        y: cy,
        r: showAvatar && centerAvatarUrl ? 26 : 18,
        color: accentCol,
        count: (state.filteredArtworks || []).length
      }
    ];

    const maxCount = (topTags[0] && topTags[0].count) || 1;
    const totalN = topTags.length;
    // Smart 1/2/3-ring radial layout so 5..40 nodes stay legible without crowding
    const rings = [];
    if (totalN <= 8) {
      rings.push({ count: totalN, r: minDim * 0.34, offset: -Math.PI / 2 });
    } else if (totalN <= 24) {
      const innerC = Math.min(8, Math.ceil(totalN * 0.38));
      rings.push({ count: innerC, r: minDim * 0.23, offset: -Math.PI / 2 });
      rings.push({ count: totalN - innerC, r: minDim * 0.40, offset: -Math.PI / 2 + Math.PI / Math.max(1, totalN - innerC) });
    } else {
      const r1 = 7;
      const r2 = 13;
      const r3 = totalN - r1 - r2;
      rings.push({ count: r1, r: minDim * 0.19, offset: -Math.PI / 2 });
      rings.push({ count: r2, r: minDim * 0.32, offset: -Math.PI / 2 + Math.PI / r2 });
      rings.push({ count: r3, r: minDim * 0.44, offset: -Math.PI / 2 });
    }

    const catColorCache = {};
    let ringIdxCur = 0;
    let ringSlot = 0;
    topTags.forEach((item) => {
      while (ringIdxCur < rings.length - 1 && ringSlot >= rings[ringIdxCur].count) {
        ringSlot = 0;
        ringIdxCur++;
      }
      const ring = rings[ringIdxCur];
      const angle = ring.offset + (ringSlot / Math.max(1, ring.count)) * Math.PI * 2;
      ringSlot++;

      const catMeta = CATEGORY_META[item.category] || CATEGORY_META.all;
      const cCol =
        catColorCache[item.category] ||
        (catColorCache[item.category] = style.getPropertyValue(catMeta.colorVar).trim() || accentCol);
      const isCharNode = item.category === 'character';
      const avatarUrl = (showAvatar && isCharNode) ? findBestAvatarUrlForTag(item.tag, false) : '';
      const baseRadius = (showAvatar && isCharNode && avatarUrl)
        ? Math.max(15, Math.round(14 + (item.count / maxCount) * 9))
        : Math.max(6, Math.round(6 + (item.count / maxCount) * 9));

      nodes.push({
        id: item.tag,
        label: item.tag,
        translation: item.translation || '',
        danbooruTag: item.danbooruTag || '',
        category: item.category,
        avatarUrl,
        x: cx + Math.cos(angle) * ring.r,
        y: cy + Math.sin(angle) * ring.r,
        r: baseRadius,
        color: cCol,
        count: item.count,
        percentage: item.percentage,
        thirdTags: item.thirdTags
      });
    });

    state.graph.nodes = nodes;
    ctx.clearRect(0, 0, W, H);

    if (exportMode) {
      ctx.fillStyle = bgCol;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.fillStyle = accentCol;
      ctx.globalAlpha = 0.14;
      ctx.font = 'italic 900 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MAGIUS LINK', cx, cy + 12);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(state.graph.panX, state.graph.panY);
    ctx.scale(state.graph.zoom, state.graph.zoom);

    // O(K^2) direct pairMatrix lookups (max 780 lookups for 40 nodes instead of scanning 500,000+ entries!)
    if (state.pairMatrix && nodes.length > 2) {
      ctx.save();
      ctx.globalAlpha = 0.24;
      ctx.strokeStyle = borderCol;
      for (let i = 1; i < nodes.length; i++) {
        const nA = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const nB = nodes[j];
          const pk = nA.id < nB.id ? `${nA.id}|||${nB.id}` : `${nB.id}|||${nA.id}`;
          const pairCnt = state.pairMatrix.get(pk);
          if (pairCnt && pairCnt >= 2) {
            ctx.beginPath();
            ctx.moveTo(nA.x, nA.y);
            ctx.lineTo(nB.x, nB.y);
            ctx.lineWidth = Math.max(0.6, (pairCnt / maxCount) * 1.9);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }

    // Draw primary radial links from center
    for (let i = 1; i < nodes.length; i++) {
      const n = nodes[i];
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(n.x, n.y);
      ctx.strokeStyle = borderCol;
      ctx.lineWidth = Math.max(1, (n.count / maxCount) * 3.0);
      ctx.stroke();
    }

    // Draw nodes (with Circular Character Avatar Bubbles for character nodes!) and multi-lingual labels
    for (const n of nodes) {
      const avatarImg = n.avatarUrl ? getCachedAvatarImage(n.id, n.avatarUrl) : null;

      if (avatarImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        const iw = avatarImg.naturalWidth || avatarImg.width || 1;
        const ih = avatarImg.naturalHeight || avatarImg.height || 1;
        const side = Math.min(iw, ih);
        const sx = (iw - side) / 2;
        const sy = (ih - side) * 0.18; // Slight top bias for character face in portrait illustrations
        ctx.drawImage(avatarImg, sx, Math.max(0, sy), side, side, n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
        ctx.restore();

        // Outer glowing category ring around character avatar bubble
        ctx.save();
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.lineWidth = n.isCenter ? 2.8 : 2.2;
        ctx.strokeStyle = n.color;
        ctx.shadowColor = n.color;
        ctx.shadowBlur = 7;
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = textCol;
        ctx.stroke();
      }

      const labelParts = [];
      if (showJp || n.isCenter) labelParts.push(n.label);
      if (!n.isCenter && showZh && n.translation && n.translation !== n.label) {
        labelParts.push(`(${n.translation})`);
      }
      const line1 = labelParts.join(' ') || n.label;

      ctx.font = n.isCenter ? 'bold 12px sans-serif' : 'bold 11px sans-serif';
      ctx.fillStyle = textCol;
      ctx.textAlign = 'center';
      ctx.fillText(line1, n.x, n.y + n.r + 13);

      if (!n.isCenter && showBooru && n.danbooruTag) {
        ctx.font = '10px Consolas, monospace';
        ctx.fillStyle = mutedCol;
        ctx.fillText(n.danbooruTag, n.x, n.y + n.r + 24);
      }
    }

    ctx.restore();
  }

  function exportNetworkGraphPng() {
    const canvas = $('networkCanvas');
    if (!canvas || !state.rawDataset) return;
    renderNetworkGraph(true);
    const dataUrl = canvas.toDataURL('image/png');
    renderNetworkGraph(false);
    const a = document.createElement('a');
    const tag = state.rawDataset.primaryTag || state.rawDataset.meta?.queryTag || 'pixiv';
    a.href = dataUrl;
    a.download = `madeinmagius-topology-${tag}.png`;
    a.click();
    showToast('已保存共现拓扑图 PNG 图片');
  }

  // =========================================================================
  // 10B. PORTALED CUSTOM SELECT DROPDOWNS (ZERO OCCLUSION!) & QUICK JUMP RAIL
  // =========================================================================
  const customSelectRegistry = [];
  let activePortalMenu = null;

  function closeAllCustomSelects() {
    if (activePortalMenu) {
      activePortalMenu.classList.add('hidden');
      activePortalMenu = null;
    }
    document.querySelectorAll('.t-cselect__menu').forEach((m) => m.classList.add('hidden'));
  }

  function positionPortalMenu(anchorEl, menuEl, matchAnchorWidth = false) {
    const displayRoot = $('callDisplayRoot') || document.body;
    if (menuEl.parentElement !== displayRoot) {
      displayRoot.appendChild(menuEl);
    }
    const hostRect = displayRoot.getBoundingClientRect();
    const anchorRect = anchorEl.getBoundingClientRect();

    menuEl.style.visibility = 'hidden';
    menuEl.classList.remove('hidden');
    if (matchAnchorWidth) {
      menuEl.style.width = `${Math.round(anchorRect.width)}px`;
    } else {
      menuEl.style.minWidth = `${Math.max(84, Math.round(anchorRect.width))}px`;
      menuEl.style.width = 'max-content';
    }

    const menuW = menuEl.offsetWidth;
    const menuH = menuEl.offsetHeight;
    let left = anchorRect.left - hostRect.left;
    let top = anchorRect.bottom - hostRect.top + 2;

    if (left + menuW > hostRect.width - 8) {
      left = Math.max(6, hostRect.width - menuW - 8);
    }
    if (left < 6) left = 6;

    if (top + menuH > hostRect.height - 10) {
      const aboveTop = anchorRect.top - hostRect.top - menuH - 2;
      if (aboveTop >= 6) top = aboveTop;
      else top = Math.max(6, hostRect.height - menuH - 10);
    }

    menuEl.style.left = `${Math.round(left)}px`;
    menuEl.style.top = `${Math.round(top)}px`;
    menuEl.style.visibility = '';
  }

  function syncCustomSelects() {
    for (const item of customSelectRegistry) {
      item.sync();
    }
  }

  function initCustomSelects() {
    document.querySelectorAll('select.js-custom-select').forEach((sel) => {
      if (sel.dataset.cselectInit === '1') return;
      sel.dataset.cselectInit = '1';

      const inChip = sel.parentElement && sel.parentElement.classList.contains('inline-select-chip');
      const wrap = document.createElement('div');
      wrap.className = inChip ? 't-cselect' : 't-cselect t-cselect--standalone';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 't-cselect__btn';

      const labelSpan = document.createElement('span');
      labelSpan.className = 't-cselect__label';
      const arrowSpan = document.createElement('span');
      arrowSpan.className = 't-cselect__arrow';
      arrowSpan.textContent = '▾';
      btn.appendChild(labelSpan);
      btn.appendChild(arrowSpan);

      const menu = document.createElement('div');
      menu.className = 't-cselect__menu hidden';

      sel.parentNode.insertBefore(wrap, sel);
      wrap.appendChild(sel);
      sel.classList.add('t-cselect__native');
      wrap.appendChild(btn);

      function buildOptions() {
        const selectedOpt = sel.options[sel.selectedIndex] || sel.options[0];
        labelSpan.textContent = selectedOpt ? selectedOpt.textContent : '';
        menu.innerHTML = Array.from(sel.options)
          .map(
            (opt) => `
            <button type="button" class="t-cselect__opt ${opt.value === sel.value ? 'is-selected' : ''}" data-val="${escapeHtml(opt.value)}">
              <span>${escapeHtml(opt.textContent)}</span>
              ${opt.value === sel.value ? '<span>✓</span>' : ''}
            </button>
          `
          )
          .join('');

        menu.querySelectorAll('.t-cselect__opt').forEach((optBtn) => {
          optBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sel.value = optBtn.dataset.val;
            buildOptions();
            closeAllCustomSelects();
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          });
        });
      }

      buildOptions();
      customSelectRegistry.push({ sel, sync: buildOptions });

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasOpen = activePortalMenu === menu && !menu.classList.contains('hidden');
        closeAllCustomSelects();
        if (!wasOpen) {
          buildOptions();
          positionPortalMenu(inChip ? sel.parentElement.parentElement : wrap, menu, false);
          activePortalMenu = menu;
        }
      });
    });

    document.addEventListener('click', () => closeAllCustomSelects());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAllCustomSelects();
        $('autocompleteDropdown')?.classList.add('hidden');
      }
    });
    $('callDisplayScroll')?.addEventListener('scroll', () => closeAllCustomSelects(), { passive: true });
    window.addEventListener('resize', () => closeAllCustomSelects(), { passive: true });
  }

  function scrollToElementInRoot(targetEl) {
    const scrollRoot = $('callDisplayScroll');
    if (!targetEl) return;
    if (!scrollRoot) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const sr = scrollRoot.getBoundingClientRect();
    const er = targetEl.getBoundingClientRect();
    scrollRoot.scrollTo({
      top: Math.max(0, scrollRoot.scrollTop + er.top - sr.top - 8),
      behavior: 'smooth'
    });
  }

  function initQuickJumpRail() {
    const rail = $('quickJumpRail');
    const grip = $('quickRailGrip');
    const collapseBtn = $('quickRailCollapseBtn');
    const scrollRoot = $('callDisplayScroll');
    if (!rail || !grip || !collapseBtn) return;

    collapseBtn.addEventListener('click', () => {
      const collapsed = rail.classList.toggle('is-collapsed');
      collapseBtn.textContent = collapsed ? '>' : '<';
    });

    bindDraggableWidget(rail, grip, 'pixez_pos_rail_v40', () => true);

    rail.querySelectorAll('[data-rail-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.railAction;
        const switchView = (targetId) => {
          const tab = document.querySelector(`.subsystem-tabs .sub-tab[data-view-target="${targetId}"]`);
          if (tab) tab.click();
        };
        if (act === 'top') {
          (scrollRoot || window).scrollTo({ top: 0, behavior: 'smooth' });
        } else if (act === 'query') {
          scrollToElementInRoot($('queryConsolePanel'));
          $('tagSearchInput')?.focus();
        } else if (act === 'filter') {
          scrollToElementInRoot($('filterSwitchesRow'));
        } else if (act === 'table') {
          switchView('cooccurrenceView');
          scrollToElementInRoot($('rankingTablePanel'));
        } else if (act === 'search') {
          executeAnalysis();
        } else if (act === 'clear') {
          state.lockedSubTags.clear();
          recomputeAndRender();
          showToast('已清空叠加必含筛选');
        } else if (act === 'network') {
          switchView('networkView');
          scrollToElementInRoot($('networkView'));
        } else if (act === 'gallery') {
          switchView('artworksView');
          scrollToElementInRoot($('artworksView'));
        } else if (act === 'bottom') {
          if (scrollRoot) scrollRoot.scrollTo({ top: scrollRoot.scrollHeight, behavior: 'smooth' });
          else window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }
      });
    });
  }

  // =========================================================================
  // 11. TAG BASKET & DANBOORU / NOVELAI PROMPT BUILDER
  // =========================================================================
  function saveBasket() {
    const arr = Array.from(state.basket);
    localStorage.setItem('pixez_basket', JSON.stringify(arr));
    $('basketBadge').textContent = arr.length;
  }

  function renderBasketModal() {
    const arr = Array.from(state.basket);
    const container = $('basketTagsList');
    if (arr.length === 0) {
      container.innerHTML = `<span style="color:var(--t-muted)">收集篮为空（在排行榜中点击「+收集」可添加标签）</span>`;
      $('basketSpaceOutput').value = '';
      $('basketDanbooruOutput').value = '';
      $('openBasketInPixivBtn').href = 'https://www.pixiv.net/';
      return;
    }

    container.innerHTML = arr
      .map(
        (t) => `
        <span class="subfilter-chip" data-remove-basket="${escapeHtml(t)}">
          ${escapeHtml(t)} <button type="button">×</button>
        </span>
      `
      )
      .join('');

    container.querySelectorAll('[data-remove-basket]').forEach((chip) => {
      chip.addEventListener('click', () => {
        state.basket.delete(chip.dataset.removeBasket);
        saveBasket();
        renderBasketModal();
        renderTable(state.computedCoTags);
      });
    });

    const spaceJoined = arr.join(' ');
    $('basketSpaceOutput').value = spaceJoined;
    const srcMeta = SOURCE_META[state.source] || SOURCE_META.pixiv;
    $('openBasketInPixivBtn').href = srcMeta.searchUrl(spaceJoined);
    $('openBasketInPixivBtn').textContent = `在 ${srcMeta.label} 搜索此组合 ↗`;

    const booruPrompts = arr.map((t) => {
      const db = state.danbooruCache[t] || (state.rawDataset?.danbooruMap && state.rawDataset.danbooruMap[t]);
      if (db && db.danbooruTag) return db.danbooruTag.replace(/_/g, ' ');
      return t;
    });
    $('basketDanbooruOutput').value = booruPrompts.join(', ');
  }

  // =========================================================================
  // 12. AUTOMATED PIXIV AUTH, PERSISTENT REFRESH & CHROME SESSION BRIDGE
  // =========================================================================
  let oauthExchanging = false;

  function persistCachedAuthUser(authObj) {
    try {
      if (authObj && authObj.loggedIn && authObj.user) {
        localStorage.setItem('pixez_auth_user_v4', JSON.stringify(authObj));
      } else {
        localStorage.removeItem('pixez_auth_user_v4');
      }
    } catch (_) {}
  }

  function loadCachedAuthUser() {
    try {
      const raw = localStorage.getItem('pixez_auth_user_v4');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && parsed.loggedIn && parsed.user ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function bindAvatarImg(imgEl, rawUrl, fallbackEl) {
    if (!imgEl) return;
    const url = String(rawUrl || '').trim();
    if (!url) {
      imgEl.classList.add('hidden');
      imgEl.removeAttribute('src');
      if (fallbackEl) fallbackEl.classList.remove('hidden');
      return;
    }
    const proxied = /^https:\/\/(i|s)\.pximg\.net\//i.test(url) ? proxyImg(url) : url;
    const mirror = /^https:\/\/i\.pximg\.net\//i.test(url)
      ? url.replace(/^https:\/\/i\.pximg\.net\//i, 'https://i.pixiv.re/')
      : '';
    imgEl.dataset.fallbackStage = '0';
    imgEl.onerror = () => {
      if (imgEl.dataset.fallbackStage === '0' && mirror) {
        imgEl.dataset.fallbackStage = '1';
        imgEl.src = mirror;
        return;
      }
      imgEl.classList.add('hidden');
      if (fallbackEl) fallbackEl.classList.remove('hidden');
    };
    imgEl.onload = () => {
      imgEl.classList.remove('hidden');
      if (fallbackEl) fallbackEl.classList.add('hidden');
    };
    imgEl.src = proxied;
  }

  async function performAuthLogout() {
    state.cookie = '';
    state.accessToken = '';
    state.refreshToken = '';
    state.bridgeAutoSyncBlocked = true;
    state.authStatus = { loggedIn: false, mode: 'guest', user: null };
    localStorage.removeItem('pixez_cookie');
    localStorage.removeItem('pixez_access_token_v4');
    localStorage.removeItem('pixez_refresh_token_v4');
    localStorage.removeItem('pixez_auth_user_v4');
    try { sessionStorage.setItem('pixez_manual_logout_v4', '1'); } catch (_) {}
    if ($('cookieInput')) $('cookieInput').value = '';
    if ($('refreshTokenInput')) $('refreshTokenInput').value = '';
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    updateAuthUI();
    showToast('已退出 Pixiv 账号，当前切换为免登录直连模式（可随时点击「登录」重新同步或换号）');
  }

  async function exchangeOAuthWithBridgeFallback(payload) {
    try {
      const r = await apiFetch('/api/oauth/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const d = await r.json().catch(() => null);
      if (r.ok && d && !d.error && (d.accessToken || d.user)) {
        return { ok: true, data: d };
      }
      if (!d?.edgeBlocked || !state.bridgeFetchAvailable || typeof window._pixezBridgeFetch !== 'function') {
        return { ok: false, data: d };
      }
    } catch (_) {
      if (!state.bridgeFetchAvailable || typeof window._pixezBridgeFetch !== 'function') {
        return { ok: false, data: null };
      }
    }
    // Browser-direct OAuth token exchange via Userscript v4.1+ (bypasses Cloudflare 403 cleanly!)
    const form = new URLSearchParams({
      client_id: 'MOBrBDS8blbauoSck0ZfDbtuzpyT',
      client_secret: 'lsACyCD94FhDUtGTXi3QzcFE2uU1hqtDaKeqrdwj',
      include_policy: 'true'
    });
    if (payload.refreshToken) {
      form.set('grant_type', 'refresh_token');
      form.set('refresh_token', String(payload.refreshToken).trim());
    } else if (payload.code) {
      const m = String(payload.code).match(/code=([A-Za-z0-9_-]+)/);
      form.set('grant_type', 'authorization_code');
      form.set('code', m ? m[1] : String(payload.code).trim());
      form.set('code_verifier', String(payload.codeVerifier || ''));
      form.set('redirect_uri', 'https://app-api.pixiv.net/web/v1/users/auth/pixiv/callback');
    }
    const br = await window._pixezBridgeFetch('https://oauth.secure.pixiv.net/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'PixivAndroidApp/5.0.234 (Android 14; Pixel 8)'
      },
      body: form.toString(),
      anonymous: true
    });
    const td = br?.json;
    const resp = td?.response || td;
    if (!br?.ok || !resp?.access_token) {
      return { ok: false, data: { error: true, message: td?.errors?.system?.message || 'Pixiv 浏览器直连 OAuth 验证失败' } };
    }
    const u = resp.user || {};
    return {
      ok: true,
      data: {
        error: false,
        user: {
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
            ''
        },
        accessToken: resp.access_token || '',
        refreshToken: resp.refresh_token || ''
      }
    };
  }

  async function completeAutomatedOAuthCode(code) {
    if (!code || oauthExchanging) return;
    oauthExchanging = true;
    try {
      const ex = await exchangeOAuthWithBridgeFallback({ code, codeVerifier: state.codeVerifier || '' });
      const d = ex.data || {};
      if (!ex.ok || d.error) throw new Error(d.message || d.error || '自动授权交换失败');
      if (d.accessToken) {
        state.accessToken = d.accessToken;
        localStorage.setItem('pixez_access_token_v4', d.accessToken);
      }
      if (d.refreshToken) {
        state.refreshToken = d.refreshToken;
        localStorage.setItem('pixez_refresh_token_v4', d.refreshToken);
      }
      if (d.user) {
        state.authStatus = { loggedIn: true, mode: 'oauth', user: d.user };
        persistCachedAuthUser(state.authStatus);
        updateAuthUI();
      } else {
        await checkAuthStatus();
      }
      $('authModal')?.classList.add('hidden');
      showToast(`已自动完成 Pixiv 登录${d.user?.name ? ': ' + d.user.name : ''}（后续访问将自动保持登录）`);
    } catch (err) {
      showToast(`自动授权提示: ${err.message}`);
    } finally {
      oauthExchanging = false;
    }
  }

  async function checkAuthStatus() {
    // Instantly hydrate cached user profile while verifying with backend
    const cached = loadCachedAuthUser();
    if (cached && (state.refreshToken || state.cookie) && !state.authStatus.loggedIn) {
      state.authStatus = cached;
      updateAuthUI();
    }
    try {
      const resp = await apiFetch('/api/auth/status', {
        headers: state.cookie ? { 'X-Pixiv-Cookie': state.cookie } : {}
      });
      const data = await resp.json();
      if (data && data.loggedIn) {
        state.authStatus = data;
      }

      // Persistent Auto-Login: if server restarted or running on serverless Pages, silently restore via saved Refresh Token or Cookie!
      if (!data.loggedIn && state.refreshToken) {
        try {
          const ex = await exchangeOAuthWithBridgeFallback({ refreshToken: state.refreshToken });
          const rd = ex.data || {};
          if (ex.ok && !rd.error && rd.user) {
            if (rd.accessToken) {
              state.accessToken = rd.accessToken;
              localStorage.setItem('pixez_access_token_v4', rd.accessToken);
            }
            if (rd.refreshToken) {
              state.refreshToken = rd.refreshToken;
              localStorage.setItem('pixez_refresh_token_v4', rd.refreshToken);
            }
            state.authStatus = { loggedIn: true, mode: 'oauth', user: rd.user };
          }
        } catch (_) {}
      } else if (!data.loggedIn && state.cookie) {
        try {
          const cr = await apiFetch('/api/auth/verify-cookie', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cookie: state.cookie })
          });
          const cd = await cr.json();
          if (cr.ok && !cd.error && cd.loggedIn) {
            state.authStatus = cd;
          }
        } catch (_) {}
      } else if (!data.loggedIn && !state.refreshToken && !state.cookie) {
        if (!(state.authStatus?.mode === 'chrome_bridge' && state.authStatus?.loggedIn && !state.bridgeAutoSyncBlocked)) {
          state.authStatus = { loggedIn: false, mode: 'guest', user: null };
        }
      }

      persistCachedAuthUser(state.authStatus);
      updateAuthUI();
    } catch (_) {}
  }

  function updateAuthUI() {
    const d = state.authStatus || {};
    const isLogged = Boolean(d.loggedIn || (state.cookie && d.user));
    const user = d.user || {};
    const userName = user.name || user.account || (state.cookie ? 'Pixiv 账号' : '');
    const uid = user.id && user.id !== 'cookie' && user.id !== 'PixivUser' ? String(user.id) : '';
    const avatarUrl =
      user.profileImageUrl ||
      user.profile_image_urls?.px_170x170 ||
      user.profile_image_urls?.px_50x50 ||
      user.profile_image_urls?.medium ||
      '';
    const modeLabel =
      d.mode === 'oauth'
        ? 'PixEz OAuth'
        : d.mode === 'chrome_bridge'
        ? 'Chrome 直连'
        : d.mode === 'cookie'
        ? 'Chrome Cookie'
        : '已连接';

    const authBtn = $('openAuthModalBtn');
    const authDot = $('headerAuthDot');
    const authAvatar = $('headerAuthAvatar');
    const authInitial = $('headerAuthInitial');
    const quickSwitch = $('headerQuickSwitchBtn');
    const quickLogout = $('headerQuickLogoutBtn');
    const profileCard = $('authProfileCard');
    const statusBanner = $('authStatusBanner');

    if (isLogged) {
      const compactId = uid ? ` · ID:${uid}` : '';
      $('headerAuthLabel').textContent = `${userName || '已登录'}${compactId}`;
      if (authBtn) {
        authBtn.classList.add('is-logged-in');
        authBtn.title = `已登录 Pixiv: ${userName}${uid ? ` (UID ${uid})` : ''} · 点击查看账号信息`;
      }
      if (authDot) authDot.classList.remove('hidden');
      if (quickSwitch) quickSwitch.classList.remove('hidden');
      if (quickLogout) quickLogout.classList.remove('hidden');
      if (authInitial) {
        authInitial.textContent = (userName || 'P').slice(0, 1).toUpperCase();
        authInitial.classList.remove('hidden');
      }
      bindAvatarImg(authAvatar, avatarUrl, authInitial);

      if (profileCard) {
        profileCard.classList.remove('hidden');
        $('authProfileName').textContent = userName || 'Pixiv 用户';
        $('authProfileModeBadge').textContent = modeLabel;
        const r18Badge = $('authProfileR18Badge');
        if (r18Badge) {
          r18Badge.classList.toggle('hidden', !(user.r18Verified || Number(user.xRestrict || 0) > 0 || d.mode === 'oauth'));
        }
        const metaParts = [];
        if (uid) metaParts.push(`UID: ${uid}`);
        if (user.account && user.account !== uid) metaParts.push(`@${user.account}`);
        if (user.isPremium) metaParts.push('Pixiv Premium');
        $('authProfileMeta').textContent = metaParts.join(' · ') || '已保持持久会话，下次打开将自动登录';
        const homeLink = $('authProfileHomeLink');
        if (homeLink) {
          homeLink.href = uid ? `https://www.pixiv.net/users/${encodeURIComponent(uid)}` : 'https://www.pixiv.net/';
        }
        const fallback = $('authProfileAvatarFallback');
        if (fallback) fallback.textContent = (userName || 'P').slice(0, 1).toUpperCase();
        bindAvatarImg($('authProfileAvatar'), avatarUrl, fallback);
      }
      if (statusBanner) statusBanner.classList.add('hidden');
      $('authCurrentStatusBox').textContent = `当前状态: 已登录 Pixiv 账号 ${userName}${uid ? ` (ID: ${uid})` : ''} — 后续打开将自动保持登录。`;
    } else {
      $('headerAuthLabel').textContent = '未登录 · 登录';
      if (authBtn) {
        authBtn.classList.remove('is-logged-in');
        authBtn.title = '当前未登录 Pixiv · 点击登录或查看账号说明';
      }
      if (authDot) authDot.classList.add('hidden');
      if (authInitial) authInitial.classList.add('hidden');
      if (authAvatar) {
        authAvatar.classList.add('hidden');
        authAvatar.removeAttribute('src');
      }
      if (quickSwitch) quickSwitch.classList.add('hidden');
      if (quickLogout) quickLogout.classList.add('hidden');
      if (profileCard) profileCard.classList.add('hidden');
      if (statusBanner) statusBanner.classList.remove('hidden');
      $('authCurrentStatusBox').textContent = '当前状态: 未登录（免登录访客模式）— 可直接使用采样；登录后可解锁账号信息与全量日期分段。';
    }

    if ($('bridgeStatusTitle')) {
      if (state.bridgeDetected) {
        const ver = state.bridgeVersion || '4.1.1';
        const isOutdated = /^4\.(0\b|1\.0\b)/.test(ver);
        $('bridgeStatusTitle').textContent = isOutdated
          ? `检测到旧版油猴脚本 (v${ver}) — 请点击下方更新至 v4.1.1 以自动识别头像/ID并修复授权弹窗`
          : `油猴桥接已就绪 (v${ver})`;
      } else {
        $('bridgeStatusTitle').textContent = '三种使用方式说明';
      }
    }
  }

  const _bridgePending = new Map();
  let _bridgeReqSeq = 1;
  window._pixezBridgeFetch = (url, opts = {}) =>
    new Promise((resolve) => {
      if (!state.bridgeFetchAvailable) return resolve({ ok: false, status: 0, json: null });
      const reqId = `bf_${Date.now()}_${_bridgeReqSeq++}`;
      const timer = setTimeout(() => {
        _bridgePending.delete(reqId);
        resolve({ ok: false, status: 0, json: null, error: 'timeout' });
      }, Number(opts.timeout || 16000));
      _bridgePending.set(reqId, (msg) => {
        clearTimeout(timer);
        let parsedJson = null;
        try { parsedJson = msg.text ? JSON.parse(msg.text) : null; } catch (_) {}
        resolve({ ok: Boolean(msg.ok), status: Number(msg.status || 0), text: msg.text || '', json: parsedJson });
      });
      window.postMessage({
        type: 'PIXEZ_BRIDGE_FETCH_REQ',
        reqId,
        url,
        method: opts.method || 'GET',
        headers: opts.headers || undefined,
        body: opts.body || undefined,
        anonymous: Boolean(opts.anonymous),
        timeout: Number(opts.timeout || 15000)
      }, '*');
    });

  window.addEventListener('message', async (ev) => {
    if (!ev.data || typeof ev.data !== 'object') return;
    if (ev.data.type === 'PIXEZ_BRIDGE_FETCH_RES' && ev.data.reqId) {
      const cb = _bridgePending.get(ev.data.reqId);
      if (cb) {
        _bridgePending.delete(ev.data.reqId);
        cb(ev.data);
      }
      return;
    }
    if (ev.data.type === 'PIXEZ_USERSCRIPT_ALIVE') {
      state.bridgeDetected = true;
      state.bridgeVersion = ev.data.version || '4.1.0';
      state.bridgeFetchAvailable = Boolean(ev.data.canFetch);
      updateAuthUI();
      return;
    }
    if (ev.data.type === 'PIXEZ_BRIDGE_USER_PROFILE') {
      if (ev.data.user && ev.data.user.id) {
        const u = ev.data.user;
        state.chromeBridgeProfile = u;
        if (!state.bridgeAutoSyncBlocked || ev.data.manual) {
          state.bridgeAutoSyncBlocked = false;
          try { sessionStorage.removeItem('pixez_manual_logout_v4'); } catch (_) {}
          const wasLogged = Boolean(state.authStatus?.loggedIn);
          const prevUid = String(state.authStatus?.user?.id || '');
          const keepOAuth = state.authStatus?.mode === 'oauth' && wasLogged;
          state.authStatus = {
            loggedIn: true,
            mode: keepOAuth ? 'oauth' : 'chrome_bridge',
            user: { ...(state.authStatus?.user || {}), ...u }
          };
          persistCachedAuthUser(state.authStatus);
          updateAuthUI();
          if (ev.data.manual || !wasLogged || prevUid !== String(u.id)) {
            $('authModal')?.classList.add('hidden');
            showToast(`已同步 Chrome Pixiv 账号: ${u.name} (ID: ${u.id})`);
          }
        }
      } else if (ev.data.loggedOut && ev.data.manual) {
        showToast('未检测到 Chrome 已登录 pixiv.net，请先点击「一键授权登录」或在浏览器中登录 pixiv.net', 4200);
      }
      return;
    }
    if (ev.data.type === 'PIXEZ_OAUTH_CODE' && ev.data.code) {
      state.bridgeAutoSyncBlocked = false;
      try { sessionStorage.removeItem('pixez_manual_logout_v4'); } catch (_) {}
      await completeAutomatedOAuthCode(ev.data.code);
      return;
    }
    if (ev.data.type === 'PIXEZ_USERSCRIPT_BRIDGE_READY' && ev.data.cookie) {
      if (state.bridgeAutoSyncBlocked) return;
      const changed = ev.data.cookie !== state.cookie || !state.authStatus.loggedIn;
      if (changed) {
        state.cookie = ev.data.cookie;
        localStorage.setItem('pixez_cookie', state.cookie);
        try {
          const resp = await apiFetch('/api/auth/verify-cookie', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cookie: state.cookie, userName: ev.data.userName || '' })
          });
          const d = await resp.json();
          if (resp.ok && !d.error && d.loggedIn) {
            state.authStatus = d;
            persistCachedAuthUser(d);
            updateAuthUI();
            $('authModal')?.classList.add('hidden');
            showToast(`已自动同步 Chrome Pixiv 登录态${d.user?.name ? ': ' + d.user.name : ''}`);
          }
        } catch (_) {}
      }
    }
  });

  // =========================================================================
  // 13. EVENT BINDINGS & INITIALIZATION
  // =========================================================================
  function bindDraggableWidget(widgetEl, gripEl, storageKey, canDragFn) {
    if (!widgetEl || !gripEl) return;
    const displayRoot = $('callDisplayRoot');

    const restoreSavedPos = () => {
      if (!storageKey || (canDragFn && !canDragFn())) return;
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
        if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y) && displayRoot) {
          const maxX = Math.max(6, displayRoot.clientWidth - widgetEl.offsetWidth - 6);
          const maxY = Math.max(6, displayRoot.clientHeight - widgetEl.offsetHeight - 6);
          widgetEl.classList.add('is-positioned');
          widgetEl.style.left = `${Math.max(6, Math.min(maxX, saved.x))}px`;
          widgetEl.style.top = `${Math.max(6, Math.min(maxY, saved.y))}px`;
        }
      } catch (_) {}
    };
    requestAnimationFrame(restoreSavedPos);

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let origLeft = 0;
    let origTop = 0;
    let lastPos = null;

    gripEl.addEventListener('pointerdown', (e) => {
      if (canDragFn && !canDragFn()) return;
      if (e.target && e.target.closest('button') && e.target.closest('button') !== gripEl) return;
      e.preventDefault();
      const hostRect = (displayRoot || document.body).getBoundingClientRect();
      const rect = widgetEl.getBoundingClientRect();
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      origLeft = rect.left - hostRect.left;
      origTop = rect.top - hostRect.top;
      widgetEl.classList.add('is-positioned');
      widgetEl.style.left = `${origLeft}px`;
      widgetEl.style.top = `${origTop}px`;
      gripEl.setPointerCapture?.(e.pointerId);
    });

    gripEl.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const hostW = displayRoot ? displayRoot.clientWidth : window.innerWidth;
      const hostH = displayRoot ? displayRoot.clientHeight : window.innerHeight;
      const nx = Math.max(6, Math.min(hostW - widgetEl.offsetWidth - 6, origLeft + (e.clientX - startX)));
      const ny = Math.max(6, Math.min(hostH - widgetEl.offsetHeight - 6, origTop + (e.clientY - startY)));
      lastPos = { x: Math.round(nx), y: Math.round(ny) };
      widgetEl.style.left = `${lastPos.x}px`;
      widgetEl.style.top = `${lastPos.y}px`;
    });

    const finishDrag = () => {
      if (!dragging) return;
      dragging = false;
      if (lastPos && storageKey) {
        try { localStorage.setItem(storageKey, JSON.stringify(lastPos)); } catch (_) {}
      }
    };
    gripEl.addEventListener('pointerup', finishDrag);
    gripEl.addEventListener('pointercancel', finishDrag);

    gripEl.addEventListener('dblclick', () => {
      widgetEl.classList.remove('is-positioned');
      ['left', 'top', 'right', 'bottom', 'transform'].forEach((p) => widgetEl.style.removeProperty(p));
      if (storageKey) {
        try { localStorage.removeItem(storageKey); } catch (_) {}
      }
    });
  }

  // =========================================================================
  // 10C. LOCAL RECENT SEARCH HISTORY & PIXEZ AUTOCOMPLETE DROPDOWN
  // =========================================================================
  let acTimer = null;
  let acAbort = null;
  let acItems = [];
  let acActiveIndex = -1;

  function updateDepthOptionLabels() {
    const srcMeta = SOURCE_META[state.source] || SOURCE_META.pixiv;
    const ps = Number(srcMeta.pageSize || 60);
    const sel = $('pagesSelect');
    if (sel) {
      for (const opt of sel.options) {
        const n = parseInt(opt.value, 10);
        if (Number.isFinite(n) && n > 0) {
          opt.textContent = `${n}页 (~${(n * ps).toLocaleString()}作)`;
        }
      }
    }
    const lbl = $('pagesSelectLabel');
    if (lbl) {
      lbl.title = state.source === 'pixiv'
        ? `Pixiv 每页约 ${ps} 作（访客 HibiAPI 每批约 30 作；选择自定义「作」可按精确作品数停止）`
        : `${srcMeta.label} 每页约 ${ps} 件作品`;
    }
    const wrap = $('customDepthWrap');
    if (wrap && sel) {
      wrap.classList.toggle('hidden', sel.value !== 'CUSTOM');
    }
    const dateWrap = $('dateRangeDepthWrap');
    if (dateWrap && sel) {
      dateWrap.classList.toggle('hidden', sel.value !== 'DATE_RANGE');
    }
    const valInput = $('customDepthValue');
    const unitSel = $('customDepthUnit');
    const hint = $('customDepthHint');
    if (valInput && unitSel && hint) {
      const v = Math.max(1, parseInt(valInput.value, 10) || 1);
      if (unitSel.value === 'pages') {
        hint.textContent = `≈${(v * ps).toLocaleString()}作 (${ps}作/页)`;
      } else {
        hint.textContent = `≈${Math.max(1, Math.ceil(v / ps)).toLocaleString()}页 (${ps}作/页)`;
      }
    }
    syncCustomSelects();
  }

  function applySourceUI() {
    const srcMeta = SOURCE_META[state.source] || SOURCE_META.pixiv;
    const isPixiv = state.source === 'pixiv';
    if ($('tagSearchInput')) $('tagSearchInput').placeholder = srcMeta.placeholder;
    if ($('sModeSelectChip')) $('sModeSelectChip').classList.toggle('hidden', !isPixiv);
    if ($('typeSelectChip')) $('typeSelectChip').classList.toggle('hidden', !isPixiv);
    if ($('includePopularWrap')) $('includePopularWrap').classList.toggle('hidden', !isPixiv);
    if ($('sourceSelect') && $('sourceSelect').value !== state.source) {
      $('sourceSelect').value = state.source;
    }
    updateDepthOptionLabels();
  }

  function persistRecentSearches() {
    try {
      localStorage.setItem(RECENT_HISTORY_KEY, JSON.stringify(state.recentSearches));
    } catch (_) {}
  }

  function removeRecentSearch(idx) {
    if (idx < 0 || idx >= state.recentSearches.length) return;
    const removed = state.recentSearches[idx];
    state.recentSearches.splice(idx, 1);
    persistRecentSearches();
    renderRecentSearches();
    if (removed) showToast(`已删除最近搜索: ${removed.tag}`);
  }

  function renderRecentSearches() {
    const strip = $('recentHistoryStrip');
    const list = $('recentHistoryList');
    if (!strip || !list) return;
    if (!state.recentSearches.length) {
      strip.classList.add('hidden');
      list.innerHTML = '';
      return;
    }
    strip.classList.remove('hidden');
    list.innerHTML = state.recentSearches
      .map((item, idx) => {
        const tag = item.tag;
        const src = item.source || 'pixiv';
        const prefix = src !== 'pixiv' ? `[${(SOURCE_META[src] || {}).label || src}] ` : '';
        return `<span class="history-chip-wrap"><button class="tag-preset history-chip" data-history-idx="${idx}" type="button" title="搜索 ${escapeHtml(prefix + tag)}">${escapeHtml(prefix + tag)}</button><button class="history-chip__del" data-del-history-idx="${idx}" type="button" title="删除此条记录" aria-label="删除 ${escapeHtml(tag)}">×</button></span>`;
      })
      .join('');
    list.querySelectorAll('[data-history-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = state.recentSearches[parseInt(btn.dataset.historyIdx, 10)];
        if (!item) return;
        const targetSrc = SOURCE_META[item.source] ? item.source : 'pixiv';
        if (targetSrc !== state.source) {
          state.source = targetSrc;
          localStorage.setItem('pixez_source_v43', state.source);
          if ($('sourceSelect')) $('sourceSelect').value = state.source;
          applySourceUI();
        }
        $('tagSearchInput').value = item.tag;
        state.lockedSubTags.clear();
        hideAutocomplete();
        showToast(`已填入历史标签 [${item.tag}]，请确认采集深度后点击「开始采样」`);
      });
    });
    list.querySelectorAll('[data-del-history-idx]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeRecentSearch(parseInt(btn.dataset.delHistoryIdx, 10));
      });
    });
  }

  function recordRecentSearch(tag, source = state.source || 'pixiv') {
    const clean = String(tag || '').trim();
    if (!clean) return;
    const src = SOURCE_META[source] ? source : 'pixiv';
    state.recentSearches = [
      { tag: clean, source: src },
      ...state.recentSearches.filter((x) => !(x.tag === clean && (x.source || 'pixiv') === src))
    ].slice(0, 12);
    persistRecentSearches();
    renderRecentSearches();
  }

  function clearRecentSearches() {
    state.recentSearches = [];
    try {
      localStorage.removeItem(RECENT_HISTORY_KEY);
    } catch (_) {}
    renderRecentSearches();
    showToast('已清空全部本地搜索历史');
  }

  function hideAutocomplete() {
    const dd = $('autocompleteDropdown');
    if (dd) dd.classList.add('hidden');
    acItems = [];
    acActiveIndex = -1;
  }

  function formatAccessCount(val) {
    const n = Number(val || 0);
    if (!Number.isFinite(n) || n <= 0) return '';
    if (n >= 1e8) return `${(n / 1e8).toFixed(1)}亿`;
    if (n >= 1e4) return `${(n / 1e4).toFixed(1)}万`;
    return String(n);
  }

  function updateAutocompleteHighlight() {
    const dd = $('autocompleteDropdown');
    if (!dd) return;
    const rows = dd.querySelectorAll('.ac-item');
    rows.forEach((row, idx) => {
      const active = idx === acActiveIndex;
      row.classList.toggle('is-active', active);
      row.setAttribute('aria-selected', active ? 'true' : 'false');
      if (active) row.scrollIntoView({ block: 'nearest' });
    });
  }

  const acResultCache = new Map();

  function selectAutocompleteItem(tagName) {
    if (!tagName) return;
    $('tagSearchInput').value = tagName;
    hideAutocomplete();
    state.lockedSubTags.clear();
  }

  function renderAutocomplete(candidates) {
    const dd = $('autocompleteDropdown');
    if (!dd) return;
    const list = (Array.isArray(candidates) ? candidates : [])
      .map((c) => ({
        tag_name: String(c.tag_name || c.name || '').trim(),
        tag_translation: String(c.tag_translation || c.translated_name || '').trim(),
        access_count: c.access_count || '',
        category: c.category || ''
      }))
      .filter((c) => c.tag_name)
      .slice(0, 10);

    if (!list.length) {
      hideAutocomplete();
      return;
    }

    acItems = list;
    acActiveIndex = -1;

    dd.innerHTML = list
      .map((c, idx) => {
        const transHtml =
          c.tag_translation && c.tag_translation.toLowerCase() !== c.tag_name.toLowerCase()
            ? `<span class="ac-item__trans">${escapeHtml(c.tag_translation)}</span>`
            : '';
        const catMeta = c.category && CATEGORY_META[c.category] ? CATEGORY_META[c.category] : null;
        const catHtml = catMeta ? `<span class="ac-item__cat ac-item__cat--${c.category}">${catMeta.short}</span>` : '';
        const metaStr = formatAccessCount(c.access_count);
        const metaHtml = metaStr ? `<span class="ac-item__meta">${escapeHtml(metaStr)}</span>` : '';
        return `
          <div class="ac-item" role="option" aria-selected="false" data-ac-idx="${idx}" data-ac="${escapeHtml(c.tag_name)}">
            <div class="ac-item__main">
              ${catHtml}
              <span class="ac-item__tag">${escapeHtml(c.tag_name)}</span>
              ${transHtml}
            </div>
            ${metaHtml}
          </div>
        `;
      })
      .join('');

    const inputBox = $('tagSearchInput')?.closest('.query-input-box');
    if (inputBox) positionPortalMenu(inputBox, dd, true);
    else dd.classList.remove('hidden');

    dd.querySelectorAll('.ac-item').forEach((item) => {
      item.addEventListener('mouseenter', () => {
        acActiveIndex = parseInt(item.dataset.acIdx, 10);
        updateAutocompleteHighlight();
      });
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectAutocompleteItem(item.dataset.ac);
      });
    });
  }

  function triggerAutocomplete(rawVal) {
    clearTimeout(acTimer);
    if (acAbort) {
      acAbort.abort();
      acAbort = null;
    }
    const q = String(rawVal || '').trim();
    const isAscii = /^[\x00-\x7F]+$/.test(q);
    if (!q || (isAscii && q.length < 2) || /^https?:\/\//i.test(q) || q.startsWith('pixiv.net/')) {
      hideAutocomplete();
      return;
    }
    const srcNow = state.source || 'pixiv';
    const cacheKey = `${srcNow}::${q.toLowerCase()}`;
    if (acResultCache.has(cacheKey)) {
      renderAutocomplete(acResultCache.get(cacheKey));
      return;
    }
    acTimer = setTimeout(async () => {
      const ctrl = new AbortController();
      acAbort = ctrl;
      try {
        const headers = state.cookie ? { 'X-Pixiv-Cookie': state.cookie } : {};
        const src = state.source || 'pixiv';
        let list = [];
        // Prefer direct Chrome Userscript Pixiv official /rpc/cps.php (100% identical to original Pixiv Romaji/Kanji/ZH/EN autocomplete!)
        if (src === 'pixiv' && state.bridgeFetchAvailable && typeof window._pixezBridgeFetch === 'function') {
          try {
            const cps = await window._pixezBridgeFetch(
              `https://www.pixiv.net/rpc/cps.php?keyword=${encodeURIComponent(q)}&lang=zh`,
              { timeout: 5000 }
            );
            if (Array.isArray(cps?.json?.candidates) && cps.json.candidates.length > 0) {
              list = cps.json.candidates.map((c) => ({
                tag_name: c.tag_name || '',
                tag_translation: c.tag_translation || '',
                access_count: c.access_count || '',
                type: c.type || ''
              }));
            }
          } catch (_) {}
        }
        if (!list.length && API_BASE && (src === 'danbooru' || src === 'sankaku')) {
          list = await directBrowserAutocomplete(src, q).catch(() => []);
        }
        if (!list.length) {
          const r = await apiFetch(`/api/pixiv/autocomplete?source=${encodeURIComponent(src)}&q=${encodeURIComponent(q)}`, {
            headers,
            signal: ctrl.signal
          });
          if (r.ok) {
            const d = await r.json();
            list = d.candidates || d.tags || [];
          }
        }
        if ($('tagSearchInput')?.value.trim() !== q) return;
        if (list.length) {
          if (acResultCache.size > 120) acResultCache.clear();
          acResultCache.set(`${src}::${q.toLowerCase()}`, list);
        }
        renderAutocomplete(list);
      } catch (err) {
        if (err && err.name !== 'AbortError') hideAutocomplete();
      }
    }, 320);
  }

  function bindFxToggleImpl(id, key) {
    const el = $(id);
    if (!el) return;
    el.addEventListener('change', (e) => {
      const scrollRoot = $('callDisplayScroll');
      const prevScrollTop = scrollRoot ? scrollRoot.scrollTop : 0;
      const checked = Boolean(e.target.checked);
      currentFx()[key] = checked;
      if (state.theme === 'dark' && key === 'pixelFont') {
        state.nightPixelFonts[state.nightPhosphor] = checked;
      }
      persistVisualState();
      applyVisualSettings();
      if (scrollRoot && scrollRoot.scrollTop !== prevScrollTop) {
        scrollRoot.scrollTop = prevScrollTop;
      }
    });
  }

  function initEvents() {
    // Theme Switcher & Display Settings Window (call-theme-widget-v7 + call-fx-window-v7)
    document.querySelectorAll('#themeSwitcher [data-call-theme-option]').forEach((btn) => {
      btn.addEventListener('click', () => setTheme(btn.dataset.callThemeOption));
    });

    document.querySelectorAll('[data-phosphor-choice]').forEach((btn) => {
      btn.addEventListener('click', () => setPhosphor(btn.dataset.phosphorChoice));
    });

    document.querySelectorAll('[data-themebar-mode]').forEach((btn) => {
      btn.addEventListener('click', () => setThemeBarMode(btn.dataset.themebarMode));
    });

    const bindFxToggle = bindFxToggleImpl;
    bindFxToggle('toggleCurvatureCheck', 'curvature');
    bindFxToggle('toggleCrtFxCheck', 'scanlines');
    bindFxToggle('toggleNoiseFxCheck', 'noise');
    bindFxToggle('togglePixelFontCheck', 'pixelFont');
    bindFxToggle('toggleLofiFxCheck', 'registration');
    bindFxToggle('toggleGlassDamageCheck', 'glassDamage');

    if ($('resetThemeDefaultsBtn')) {
      $('resetThemeDefaultsBtn').addEventListener('click', resetCurrentThemeDefaults);
    }
    if ($('doneStyleConfigBtn')) {
      $('doneStyleConfigBtn').addEventListener('click', () => {
        $('styleConfigModal').classList.add('hidden');
        $('openStyleConfigBtn')?.setAttribute('aria-expanded', 'false');
      });
    }

    bindDraggableWidget($('themeSwitcher'), $('themeWidgetGrip'), 'pixez_pos_theme_v40', () => state.themeBarMode === 'floating');
    bindDraggableWidget($('styleConfigModal'), $('fxWindowTitlebar'), 'pixez_pos_fx_v40', () => true);

    if ($('syncChromeBridgeNowBtn')) {
      $('syncChromeBridgeNowBtn').addEventListener('click', () => {
        state.bridgeAutoSyncBlocked = false;
        try { sessionStorage.removeItem('pixez_manual_logout_v4'); } catch (_) {}
        window.postMessage({ type: 'PIXEZ_REQUEST_CHROME_BRIDGE' }, '*');
        showToast(state.bridgeDetected ? '正在检测并同步当前浏览器 Pixiv 登录态...' : '未检测到 v4.1.1 油猴桥接脚本，请先点击左侧安装/更新');
      });
    }

    if ($('copyUserscriptSourceBtn')) {
      $('copyUserscriptSourceBtn').addEventListener('click', async () => {
        try {
          const resp = await fetch('./downloads/pixtag-companion.user.js?v=4.1.1', { cache: 'no-store' });
          const code = await resp.text();
          await navigator.clipboard.writeText(code);
          $('copyUserscriptSourceBtn').textContent = '已复制 v4.1.1 ✓';
          showToast('已一键复制油猴脚本 v4.1.1 完整代码至剪贴板');
          setTimeout(() => {
            $('copyUserscriptSourceBtn').textContent = '一键复制油猴脚本 v4.1.1';
          }, 2200);
        } catch (err) {
          showToast('复制失败，请点击右侧下载脚本');
        }
      });
    }

    // Custom Depth Selector (Pages / Exact Works Count + Live Per-Page Hint)
    try {
      const savedDepth = JSON.parse(localStorage.getItem('pixez_custom_depth_v413') || 'null');
      if (savedDepth && $('customDepthValue') && $('customDepthUnit')) {
        if (savedDepth.value > 0) $('customDepthValue').value = String(savedDepth.value);
        if (savedDepth.unit === 'pages' || savedDepth.unit === 'works') $('customDepthUnit').value = savedDepth.unit;
      }
    } catch (_) {}
    const persistCustomDepth = () => {
      try {
        localStorage.setItem('pixez_custom_depth_v413', JSON.stringify({
          value: parseInt($('customDepthValue')?.value || '2000', 10) || 2000,
          unit: $('customDepthUnit')?.value === 'pages' ? 'pages' : 'works'
        }));
      } catch (_) {}
      updateDepthOptionLabels();
    };
    $('pagesSelect')?.addEventListener('change', () => {
      updateDepthOptionLabels();
      if ($('pagesSelect').value === 'CUSTOM') $('customDepthValue')?.focus();
      if ($('pagesSelect').value === 'DATE_RANGE' && $('customStartDateInput') && !$('customStartDateInput').value && !$('customEndDateInput')?.value) {
        const now = new Date();
        const prev = new Date(now.getTime() - 90 * 86400000);
        $('customStartDateInput').value = prev.toISOString().slice(0, 10);
        if ($('customEndDateInput')) $('customEndDateInput').value = now.toISOString().slice(0, 10);
      }
    });
    $('customDepthValue')?.addEventListener('input', persistCustomDepth);
    $('customDepthUnit')?.addEventListener('change', persistCustomDepth);
    $('customDepthValue')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.target.blur();
      }
    });

    // Custom Date Range Depth Persistence & Quick Presets
    try {
      const savedRange = JSON.parse(localStorage.getItem('pixez_date_range_depth_v415') || 'null');
      if (savedRange) {
        if ($('customStartDateInput') && savedRange.start) $('customStartDateInput').value = savedRange.start;
        if ($('customEndDateInput') && savedRange.end) $('customEndDateInput').value = savedRange.end;
      }
    } catch (_) {}
    const persistDateRange = () => {
      try {
        localStorage.setItem('pixez_date_range_depth_v415', JSON.stringify({
          start: $('customStartDateInput')?.value || '',
          end: $('customEndDateInput')?.value || ''
        }));
      } catch (_) {}
    };
    const applyDatePresetDays = (days) => {
      const now = new Date();
      const from = new Date(now.getTime() - days * 86400000);
      if ($('customStartDateInput')) $('customStartDateInput').value = from.toISOString().slice(0, 10);
      if ($('customEndDateInput')) $('customEndDateInput').value = now.toISOString().slice(0, 10);
      persistDateRange();
    };
    $('customStartDateInput')?.addEventListener('change', persistDateRange);
    $('customEndDateInput')?.addEventListener('change', persistDateRange);
    $('datePreset30dBtn')?.addEventListener('click', () => applyDatePresetDays(30));
    $('datePreset1yBtn')?.addEventListener('click', () => applyDatePresetDays(365));

    // Subsystem View Tabs (Automatically suspends CRT grid/distortion ONLY in Artwork Gallery!)
    document.querySelectorAll('.subsystem-tabs .sub-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.subsystem-tabs .sub-tab').forEach((b) => b.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.viewTarget;
        ['cooccurrenceView', 'artworksView', 'networkView'].forEach((id) => {
          $(id).classList.toggle('hidden', id !== target);
        });
        document.documentElement.dataset.activeView = target === 'artworksView' ? 'gallery' : (target === 'networkView' ? 'network' : 'table');
        if (target === 'artworksView') renderGallery();
        if (target === 'networkView') renderNetworkGraph();
        if (opticalScrollUpdater) requestAnimationFrame(opticalScrollUpdater);
      });
    });

    // Category Scope Tabs
    document.querySelectorAll('#categoryScopeTabs .cat-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#categoryScopeTabs .cat-tab').forEach((b) => b.classList.remove('active'));
        tab.classList.add('active');
        state.activeCategoryScope = tab.dataset.catScope;
        recomputeAndRender();
      });
    });

    // Query Console & Multi-Site Source Switcher
    if ($('sourceSelect')) {
      $('sourceSelect').value = state.source;
      $('sourceSelect').addEventListener('change', (e) => {
        const nextSrc = e.target.value;
        state.source = SOURCE_META[nextSrc] ? nextSrc : 'pixiv';
        localStorage.setItem('pixez_source_v43', state.source);
        applySourceUI();
        hideAutocomplete();
        hidePreflightBanner();
        showToast(`已切换数据源: ${(SOURCE_META[state.source] || SOURCE_META.pixiv).label}`);
      });
    }

    // Pre-flight Confirmation Actions
    const runPendingPreflight = (overridePages = null) => {
      const p = state.pendingPreflight;
      if (!p) return;
      if (overridePages && $('pagesSelect')) {
        $('pagesSelect').value = overridePages;
        syncCustomSelects();
      }
      state.pendingPreflight = null;
      executeAnalysis(p.tag, {
        source: p.source,
        overridePages: overridePages || 'ALL',
        skipConfirm: true,
        preflightInfo: p.preflightInfo
      });
    };
    $('preflightConfirmAllBtn')?.addEventListener('click', () => runPendingPreflight('ALL'));
    $('preflightCap25Btn')?.addEventListener('click', () => runPendingPreflight('25'));
    $('preflightCap50Btn')?.addEventListener('click', () => runPendingPreflight('50'));
    $('preflightCap100Btn')?.addEventListener('click', () => runPendingPreflight('100'));
    $('preflightCancelBtn')?.addEventListener('click', hidePreflightBanner);
    $('preflightResumeBtn')?.addEventListener('click', async () => {
      const ic = state.interruptedCrawl;
      if (!ic) return;
      let rec = ic.record;
      try {
        const dbRec = await PulseCacheDB.get(ic.cacheKey);
        if (dbRec && Array.isArray(dbRec.artworks) && dbRec.artworks.length >= (rec?.artworks?.length || 0)) {
          rec = dbRec;
        }
      } catch (_) {}
      hidePreflightBanner();
      const curDepth = $('pagesSelect')?.value || 'ALL';
      const resumeDepth = (curDepth === 'ALL' || curDepth === 'CUSTOM' || curDepth === 'DATE_RANGE') ? curDepth : 'ALL';
      if (resumeDepth === 'ALL' && $('pagesSelect')) {
        $('pagesSelect').value = 'ALL';
        syncCustomSelects();
      }
      executeAnalysis(ic.tag, {
        source: ic.source,
        resumeFromCache: rec,
        overridePages: resumeDepth,
        skipConfirm: true
      });
    });
    $('preflightClearRestartBtn')?.addEventListener('click', async () => {
      const ic = state.interruptedCrawl;
      if (!ic) return;
      state.interruptedCrawl = null;
      state.rawDataset = null;
      try { await PulseCacheDB.remove(ic.cacheKey); refreshCacheBadge(); } catch (_) {}
      hidePreflightBanner();
      showToast(`已清空 [${ic.tag}] 中断样本，开始重新采集...`);
      executeAnalysis(ic.tag, {
        source: ic.source,
        freshRestart: true,
        skipConfirm: true
      });
    });

    // Smart Cache-Hit Banner Actions (direct reuse / merge resume / force refresh)
    $('preflightUseCacheBtn')?.addEventListener('click', () => {
      const hit = state.pendingCacheHit;
      if (!hit || !hit.record) return;
      const rec = hit.record;
      state.lockedSubTags.clear();
      state.rawDataset = {
        ...rec,
        pixivTotal: Number(hit.preflightInfo?.totalPosts || rec.pixivTotal || 0),
        totalBreakdown: hit.preflightInfo?.totalBreakdown || rec.totalBreakdown || null
      };
      if (rec.danbooruMap) Object.assign(state.danbooruCache, rec.danbooruMap);
      if ($('engineSourceIndicator')) {
        $('engineSourceIndicator').textContent = `LOCAL-CACHE · 复用 (${(rec.artworks || []).length.toLocaleString()}作)`;
        $('engineSourceIndicator').classList.remove('hidden');
      }
      recomputeAndRender();
      showPreflightBanner(
        `已直接复用 [${rec.primaryTag || hit.tag}] 本地缓存（${(rec.artworks || []).length.toLocaleString()} 作，0 流量秒开）。`,
        false,
        false,
        { showUse: false, showResume: false, forceLabel: '强制重新抓取' }
      );
      showToast(`已直接复用本地缓存 (${(rec.artworks || []).length.toLocaleString()} 作)`);
    });
    $('preflightCacheResumeBtn')?.addEventListener('click', () => {
      const hit = state.pendingCacheHit;
      if (!hit || !hit.record) return;
      hidePreflightBanner();
      executeAnalysis(hit.tag, {
        source: hit.source,
        overridePages: hit.overridePages || 'ALL',
        resumeFromCache: hit.record,
        preflightInfo: hit.preflightInfo,
        skipConfirm: true
      });
    });
    $('preflightForceRefreshBtn')?.addEventListener('click', () => {
      const hit = state.pendingCacheHit;
      if (!hit) return;
      hidePreflightBanner();
      executeAnalysis(hit.tag, {
        source: hit.source,
        overridePages: hit.overridePages,
        preflightInfo: hit.preflightInfo,
        freshRestart: true,
        ignoreCacheReuse: true,
        skipConfirm: true
      });
    });

    // Tag Inspector Sort, Type Filter & Load More
    $('modalArtworksSortSelect')?.addEventListener('change', () => {
      state.inspectorLimit = 36;
      renderInspectorArtworks();
    });
    $('modalArtworksTypeSelect')?.addEventListener('change', () => {
      state.inspectorLimit = 36;
      renderInspectorArtworks();
    });
    $('modalArtworksLoadMoreBtn')?.addEventListener('click', () => {
      state.inspectorLimit += 48;
      renderInspectorArtworks();
    });

    // Optional Rule34 Credentials
    if ($('r34ApiKeyInput')) $('r34ApiKeyInput').value = state.r34Key;
    if ($('r34UserIdInput')) $('r34UserIdInput').value = state.r34Uid;
    $('saveR34CredsBtn')?.addEventListener('click', () => {
      state.r34Key = ($('r34ApiKeyInput')?.value || '').trim();
      state.r34Uid = ($('r34UserIdInput')?.value || '').trim();
      localStorage.setItem('pixez_r34_key', state.r34Key);
      localStorage.setItem('pixez_r34_uid', state.r34Uid);
      showToast(state.r34Key && state.r34Uid ? '已保存 Rule34 API 凭据' : '已清空 Rule34 API 凭据');
    });

    $('analyzeBtn').addEventListener('click', () => executeAnalysis());
    $('stopStreamBtn').addEventListener('click', () => {
      if (state.activeStreamAbort) state.activeStreamAbort.abort();
    });
    $('tagSearchInput').addEventListener('keydown', (e) => {
      const dd = $('autocompleteDropdown');
      const isOpen = dd && !dd.classList.contains('hidden') && acItems.length > 0;
      if (e.key === 'ArrowDown' && isOpen) {
        e.preventDefault();
        acActiveIndex = (acActiveIndex + 1) % acItems.length;
        updateAutocompleteHighlight();
        return;
      }
      if (e.key === 'ArrowUp' && isOpen) {
        e.preventDefault();
        acActiveIndex = (acActiveIndex - 1 + acItems.length) % acItems.length;
        updateAutocompleteHighlight();
        return;
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        hideAutocomplete();
        return;
      }
      if (e.key === 'Enter') {
        if (e.isComposing || e.keyCode === 229) return;
        e.preventDefault();
        e.stopPropagation();
        if (isOpen && acActiveIndex >= 0 && acItems[acActiveIndex]) {
          selectAutocompleteItem(acItems[acActiveIndex].tag_name);
        } else {
          hideAutocomplete();
          $('tagSearchInput')?.blur();
        }
      }
    });
    $('tagSearchInput').addEventListener('input', () => {
      triggerAutocomplete($('tagSearchInput').value);
    });
    $('clearInputBtn').addEventListener('click', () => {
      $('tagSearchInput').value = '';
      hideAutocomplete();
      $('tagSearchInput').focus();
    });
    if ($('clearHistoryBtn')) {
      $('clearHistoryBtn').addEventListener('click', clearRecentSearches);
    }

    document.addEventListener('click', (e) => {
      const dd = $('autocompleteDropdown');
      const inputBox = $('tagSearchInput')?.closest('.query-input-box');
      if (dd && !dd.classList.contains('hidden')) {
        if (!dd.contains(e.target) && (!inputBox || !inputBox.contains(e.target))) {
          hideAutocomplete();
        }
      }
    });
    $('callDisplayScroll')?.addEventListener('scroll', () => hideAutocomplete(), { passive: true });
    window.addEventListener('resize', () => hideAutocomplete(), { passive: true });

    // Filter Checkboxes & Controls
    ['hideBookmarkTagCheck', 'excludeAiWorksCheck', 'hideAiTagCheck', 'excludeR18WorksCheck', 'hideR18TagCheck', 'hideMetaTagCheck', 'minCountInput', 'tableSortSelect'].forEach((id) => {
      if ($(id)) $(id).addEventListener('change', recomputeAndRender);
    });
    $('tableFilterInput').addEventListener('input', () => renderTable(state.computedCoTags));
    $('clearAllSubFiltersBtn').addEventListener('click', () => {
      state.lockedSubTags.clear();
      showToast('已清空全部必含筛选');
      recomputeAndRender();
    });

    // Gallery Controls
    $('galleryTagFilterInput').addEventListener('input', () => renderGallery(true));
    $('galleryTypeFilterSelect').addEventListener('change', () => renderGallery(true));
    $('gallerySortSelect').addEventListener('change', () => renderGallery(true));
    $('galleryPageSizeSelect')?.addEventListener('change', () => renderGallery(true));

    // Copy & Export
    $('copyTopTagsBtn').addEventListener('click', () => {
      const top15 = state.computedCoTags.slice(0, 15).map((r) => r.tag).join(' ');
      navigator.clipboard.writeText(top15);
      showToast('已复制前 15 名共现标签');
    });

    $('exportCsvBtn').addEventListener('click', () => {
      if (!state.computedCoTags.length) return;
      const lines = ['Rank,Tag,Translation,Danbooru,Category,Count,Percentage,UniqueArtists'];
      state.computedCoTags.forEach((r, i) => {
        lines.push(`${i + 1},"${r.tag.replace(/"/g, '""')}","${(r.translation || '').replace(/"/g, '""')}","${r.danbooruTag || ''}",${r.category},${r.count},${r.percentage}%,${r.uniqueArtists}`);
      });
      const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `pixez_cooccurrence_${state.rawDataset?.primaryTag || 'tags'}.csv`;
      a.click();
    });

    $('exportJsonBtn').addEventListener('click', () => {
      if (!state.computedCoTags.length) return;
      const blob = new Blob([JSON.stringify(state.computedCoTags, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `pixez_cooccurrence_${state.rawDataset?.primaryTag || 'tags'}.json`;
      a.click();
    });

    // Viewer Page Controls
    $('viewerPrevPageBtn').addEventListener('click', () => {
      if (!state.viewer.illust) return;
      const total = (state.viewer.illust.pages || []).length || 1;
      state.viewer.pageIndex = (state.viewer.pageIndex - 1 + total) % total;
      updateViewerPage();
    });
    $('viewerNextPageBtn').addEventListener('click', () => {
      if (!state.viewer.illust) return;
      const total = (state.viewer.illust.pages || []).length || 1;
      state.viewer.pageIndex = (state.viewer.pageIndex + 1) % total;
      updateViewerPage();
    });
    $('viewerQualityToggleBtn').addEventListener('click', () => {
      state.viewer.useOriginal = !state.viewer.useOriginal;
      updateViewerPage();
    });
    $('viewerDownloadCurrentBtn')?.addEventListener('click', (e) => {
      triggerSafeMediaDownload($('viewerDownloadCurrentBtn'), e);
    });
    $('viewerDownloadUgoiraZipBtn')?.addEventListener('click', (e) => {
      triggerSafeMediaDownload($('viewerDownloadUgoiraZipBtn'), e);
    });
    $('viewerDownloadUgoiraGifBtn')?.addEventListener('click', async () => {
      const btn = $('viewerDownloadUgoiraGifBtn');
      const frames = state.viewer.ugoiraFrames;
      const illId = state.viewer.ugoiraIllustId || state.viewer.illust?.id || 'ugoira';
      if (!Array.isArray(frames) || !frames.length) {
        showToast('动图帧尚未解压完成，请稍候重试');
        return;
      }
      if (btn.disabled) return;
      const origText = btn.textContent;
      btn.disabled = true;
      btn.textContent = `正在合成 GIF (0/${frames.length})...`;
      try {
        const gifBlob = await synthesizeUgoiraGifBlob(frames, (done, total) => {
          btn.textContent = `正在合成 GIF (${done}/${total})...`;
        });
        const filename = `pixiv_ugoira_${illId}.gif`;
        const objUrl = URL.createObjectURL(gifBlob);
        const a = document.createElement('a');
        a.href = objUrl;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(objUrl), 25000);
        showToast(`动图 GIF 合成完毕 (${(gifBlob.size / 1024 / 1024).toFixed(2)} MB): ${filename}`);
      } catch (err) {
        showToast(`GIF 合成失败: ${err.message || '未知错误'}`);
      } finally {
        btn.disabled = false;
        btn.textContent = origText;
      }
    });
    $('viewerSauceNaoBtn').addEventListener('click', () => {
      const ill = state.viewer.illust;
      if (!ill) return;
      const u = ill.regularUrl || ill.thumbUrl;
      if (u) window.open(`https://saucenao.com/search.php?url=${encodeURIComponent(u)}`, '_blank');
    });

    // Topology Graph Events (rAF-coalesced for smooth 60 FPS interaction on 50k+ works!)
    $('graphNodeLimitRange').addEventListener('input', () => {
      $('graphNodeLimitVal').textContent = $('graphNodeLimitRange').value;
      scheduleNetworkRender();
    });
    ['graphShowAvatarCheck', 'graphShowJpCheck', 'graphShowBooruCheck', 'graphShowZhCheck'].forEach((id) => {
      if ($(id)) $(id).addEventListener('change', () => scheduleNetworkRender());
    });
    if ($('applyCanvasSizeBtn')) {
      $('applyCanvasSizeBtn').addEventListener('click', () => {
        const wVal = Math.max(30, parseInt($('canvasWidthInput').value, 10) || 100);
        const wUnit = $('canvasWidthUnitSelect').value || '%';
        const hVal = Math.max(240, parseInt($('canvasHeightInput').value, 10) || 520);
        const frame = $('networkCanvasFrame');
        frame.style.width = wUnit === '%' ? `${Math.min(100, wVal)}%` : `${wVal}px`;
        frame.style.height = `${hVal}px`;
        scheduleNetworkRender();
        showToast(`已调整拓扑画布尺寸: ${wVal}${wUnit} × ${hVal}px`);
      });
    }
    if ($('saveGraphImageBtn')) {
      $('saveGraphImageBtn').addEventListener('click', exportNetworkGraphPng);
    }
    $('resetGraphZoomBtn').addEventListener('click', () => {
      state.graph.zoom = 1;
      state.graph.panX = 0;
      state.graph.panY = 0;
      scheduleNetworkRender();
    });
    window.addEventListener('resize', () => {
      if (!$('networkView').classList.contains('hidden')) scheduleNetworkRender();
    });

    const netCanvas = $('networkCanvas');
    netCanvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 0.9;
      state.graph.zoom = Math.max(0.45, Math.min(2.8, state.graph.zoom * factor));
      scheduleNetworkRender();
    }, { passive: false });
    netCanvas.addEventListener('mousedown', (e) => {
      const rect = netCanvas.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) * (netCanvas.width / rect.width) - state.graph.panX) / state.graph.zoom;
      const my = ((e.clientY - rect.top) * (netCanvas.height / rect.height) - state.graph.panY) / state.graph.zoom;
      const hit = state.graph.nodes.find((n) => Math.hypot(n.x - mx, n.y - my) <= n.r + 5);
      const hud = $('nodeDetailContent');
      if (hit) {
        if (!hit.isCenter && hud) {
          hud.classList.remove('hidden');
          hud.innerHTML = `
            <strong>#${escapeHtml(hit.label)}</strong>
            ${hit.translation ? `<span>(${escapeHtml(hit.translation)})</span>` : ''}
            <span>共现: <strong>${hit.count}次 (${hit.percentage}%)</strong></span>
            <button class="t-btn t-btn--sm t-btn--primary" id="graphLockNodeBtn" type="button">+必含</button>
            <button class="t-btn t-btn--sm" id="graphInspectNodeBtn" type="button">看图</button>
          `;
          $('graphLockNodeBtn').addEventListener('click', () => {
            state.lockedSubTags.add(hit.label);
            recomputeAndRender();
          });
          $('graphInspectNodeBtn').addEventListener('click', () => openInspectorModal(hit.label));
        }
      } else {
        if (hud) hud.classList.add('hidden');
        state.graph.isPanning = true;
        state.graph.startX = e.clientX - state.graph.panX;
        state.graph.startY = e.clientY - state.graph.panY;
      }
    });
    window.addEventListener('mousemove', (e) => {
      if (!state.graph.isPanning) return;
      state.graph.panX = e.clientX - state.graph.startX;
      state.graph.panY = e.clientY - state.graph.startY;
      scheduleNetworkRender();
    });
    window.addEventListener('mouseup', () => {
      state.graph.isPanning = false;
    });

    // Modals Open/Close Bindings
    const modalPairs = [
      ['openAboutLinksBtn', 'closeAboutLinksBtn', 'aboutLinksModal'],
      ['openStyleConfigBtn', 'closeStyleConfigBtn', 'styleConfigModal'],
      ['openHelpGuideBtn', 'closeHelpGuideBtn', 'helpGuideModal'],
      ['openRulesModalBtn', 'closeRulesModalBtn', 'rulesModal'],
      ['openAuthModalBtn', 'closeAuthModalBtn', 'authModal'],
      ['openReverseModalBtn', 'closeReverseModalBtn', 'reverseModal'],
      ['openBasketBtn', 'closeBasketModalBtn', 'basketModal'],
      ['openCacheModalBtn', 'closeCacheModalBtn', 'cacheModal'],
      ['openClientDownloadBtn', 'closeClientDownloadBtn', 'clientDownloadModal'],
      [null, 'closeModalBtn', 'inspectModal'],
      [null, 'closeIllustViewerBtn', 'illustViewerModal']
    ];

    if ($('minimizeAboutLinksBtn')) {
      $('minimizeAboutLinksBtn').addEventListener('click', () => {
        const body = $('aboutLinksBody');
        const isHidden = body.classList.toggle('hidden');
        $('minimizeAboutLinksBtn').textContent = isHidden ? '□' : '−';
      });
    }

    for (const [openId, closeId, modalId] of modalPairs) {
      const m = $(modalId);
      if (openId && $(openId)) {
        $(openId).addEventListener('click', () => {
          if (modalId === 'styleConfigModal') {
            const isHidden = m.classList.toggle('hidden');
            $(openId).setAttribute('aria-expanded', isHidden ? 'false' : 'true');
            return;
          }
          if (modalId === 'basketModal') renderBasketModal();
          if (modalId === 'cacheModal') renderCacheModal();
          if (modalId === 'rulesModal') populateRulesModal();
          m.classList.remove('hidden');
        });
      }
      if (closeId && $(closeId)) {
        $(closeId).addEventListener('click', () => {
          if (modalId === 'illustViewerModal') stopUgoiraTimer();
          if (modalId === 'styleConfigModal') $('openStyleConfigBtn')?.setAttribute('aria-expanded', 'false');
          m.classList.add('hidden');
        });
      }
      if (m) {
        m.addEventListener('click', (e) => {
          if (e.target === m) {
            if (modalId === 'illustViewerModal') stopUgoiraTimer();
            m.classList.add('hidden');
          }
        });
      }
    }

    // Custom Category Rules Save/Reset + Local Correction History + Plan A Community Suggest / Publish
    function setCurationStatus(htmlText, isError = false) {
      const el = $('curationStatusLine');
      if (!el) return;
      el.innerHTML = htmlText;
      el.style.borderColor = isError ? 'var(--t-danger, #c43e3e)' : 'var(--t-accent)';
      el.classList.remove('hidden');
    }

    function collectLocalCorrectionItems() {
      const note = ($('curationNoteInput')?.value || '').trim();
      const map = new Map();
      for (const e of Object.values(state.categoryCorrectionLog || {})) {
        if (e && e.tag && e.to) {
          map.set(e.tag, {
            tag: e.tag,
            from: e.from || classifyTagClient(e.tag, '', null, true),
            to: e.to,
            note: note || e.note || ''
          });
        }
      }
      for (const cat of CATEGORY_CYCLE) {
        for (const t of state.userCategoryLists[cat] || []) {
          if (t && !map.has(t)) {
            map.set(t, {
              tag: t,
              from: classifyTagClient(t, '', null, true),
              to: cat,
              note
            });
          }
        }
      }
      return Array.from(map.values());
    }

    function populateRulesModal() {
      $('ruleCharTextarea').value = (state.userCategoryLists.character || []).join(', ');
      $('ruleAttrTextarea').value = (state.userCategoryLists.attribute_xp || []).join(', ');
      $('ruleIpTextarea').value = (state.userCategoryLists.series_ip || []).join(', ');
      $('ruleMetaTextarea').value = (state.userCategoryLists.meta_general || []).join(', ');
      renderCorrectionLogList();
      $('curationStatusLine')?.classList.add('hidden');
    }

    $('syncCommunityOverridesBtn')?.addEventListener('click', () => syncCommunityTagOverrides(true));

    $('exportCorrectionsBtn')?.addEventListener('click', () => {
      const items = collectLocalCorrectionItems();
      if (!items.length) {
        showToast('暂无可导出的本地纠错记录');
        return;
      }
      const doc = {
        schema: 'madeinmagius-tag-overrides/v1',
        exportedAt: new Date().toISOString(),
        items
      };
      const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pixez-tag-corrections-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast(`已导出 ${items.length} 条本地纠错记录 JSON`);
    });

    $('importCorrectionsBtn')?.addEventListener('click', () => $('importCorrectionsFile')?.click());
    $('importCorrectionsFile')?.addEventListener('change', async (ev) => {
      const file = ev.target?.files?.[0];
      ev.target.value = '';
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const list = Array.isArray(parsed?.items)
          ? parsed.items
          : (parsed?.overrides && typeof parsed.overrides === 'object'
              ? Object.entries(parsed.overrides).map(([tag, v]) => ({
                  tag,
                  from: typeof v === 'object' ? (v.from || '') : '',
                  to: typeof v === 'string' ? v : v?.to
                }))
              : []);
        let imported = 0;
        const now = new Date().toISOString();
        for (const it of list) {
          const tag = String(it?.tag || '').trim();
          const to = String(it?.to || '').trim();
          if (!tag || !CATEGORY_META[to]) continue;
          const from = String(it?.from || '').trim() || classifyTagClient(tag, '', null, true);
          state.userCategoryOverrides[tag] = to;
          state.categoryCorrectionLog[tag] = { tag, from, to, updatedAt: now };
          imported++;
        }
        if (imported > 0) {
          persistCategoryCorrections();
          renderCorrectionLogList();
          recomputeAndRender();
          showToast(`已导入并合并 ${imported} 条分类纠错记录`);
        } else {
          showToast('未在 JSON 文件中找到有效的纠错条目');
        }
      } catch (err) {
        showToast(`导入失败: ${err.message}`);
      }
    });

    $('submitCommunitySuggestBtn')?.addEventListener('click', async () => {
      const items = collectLocalCorrectionItems();
      if (!items.length) {
        showToast('请先在排行表中点击分类徽标纠错至少 1 个标签');
        return;
      }
      const btn = $('submitCommunitySuggestBtn');
      if (btn) btn.disabled = true;
      setCurationStatus(`正在提交 ${items.length} 条待审纠错建议...`);
      try {
        const r = await fetch(getTagOverridesEndpoint(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'suggest',
            items,
            comment: ($('curationNoteInput')?.value || '').trim()
          })
        });
        const d = await r.json().catch(() => ({ error: true, message: `HTTP ${r.status}` }));
        if (!r.ok || d.error) {
          setCurationStatus(escapeHtml(d.message || '提交失败'), true);
        } else if (d.mode === 'issue_created' && d.issueUrl) {
          setCurationStatus(
            `${escapeHtml(d.message)} <a href="${escapeHtml(d.issueUrl)}" target="_blank" rel="noopener">查看待审单 #${escapeHtml(String(d.issueNumber || ''))} ↗</a>`
          );
          showToast(`已提交 ${items.length} 条待审纠错建议！`);
        } else if (d.fallbackUrl) {
          setCurationStatus(
            `${escapeHtml(d.message)} <a href="${escapeHtml(d.fallbackUrl)}" target="_blank" rel="noopener">点此打开预填提交页 ↗</a>`
          );
          window.open(d.fallbackUrl, '_blank', 'noopener');
        } else {
          setCurationStatus(escapeHtml(d.message || '已提交待审建议'));
        }
      } catch (err) {
        setCurationStatus(`提交失败: ${escapeHtml(err.message)}`, true);
      } finally {
        if (btn) btn.disabled = false;
      }
    });

    $('publishCommunityOverridesBtn')?.addEventListener('click', async () => {
      const items = collectLocalCorrectionItems();
      if (!items.length) {
        showToast('请先纠错至少 1 个标签再发布');
        return;
      }
      const passcode = ($('curationPasscodeInput')?.value || '').trim();
      if (!passcode) {
        showToast('请输入管理员口令（普通用户可点击左侧「提交待审建议 (免口令)」）', 3600);
        $('curationPasscodeInput')?.focus();
        return;
      }
      const btn = $('publishCommunityOverridesBtn');
      if (btn) btn.disabled = true;
      setCurationStatus(`正在校验口令并合并发布 ${items.length} 条纠错至全站公共词表...`);
      try {
        const r = await fetch(getTagOverridesEndpoint(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Curation-Passcode': passcode
          },
          body: JSON.stringify({ action: 'publish', passcode, items })
        });
        const d = await r.json().catch(() => ({ error: true, message: `HTTP ${r.status}` }));
        if (!r.ok || d.error) {
          setCurationStatus(escapeHtml(d.message || `发布失败 (HTTP ${r.status})`), true);
        } else {
          if (d.overrides && typeof d.overrides === 'object') {
            state.communityTagOverrides = d.overrides;
            state.communityOverridesMeta = {
              count: Number(d.totalCount || Object.keys(d.overrides).length),
              updatedAt: d.updatedAt || new Date().toISOString(),
              source: 'github-live',
              canPublish: true
            };
            try {
              localStorage.setItem('pixez_community_tag_overrides_v1', JSON.stringify(d.overrides));
            } catch (_) {}
          }
          renderCorrectionLogList();
          const linkHtml = d.commitUrl
            ? ` <a href="${escapeHtml(d.commitUrl)}" target="_blank" rel="noopener">查看提交记录 ↗</a>`
            : '';
          setCurationStatus(`${escapeHtml(d.message || '发布成功')}${linkHtml}`);
          showToast(`已发布 ${d.applied || items.length} 条至全站公共词表！`);
        }
      } catch (err) {
        setCurationStatus(`发布失败: ${escapeHtml(err.message)}`, true);
      } finally {
        if (btn) btn.disabled = false;
      }
    });

    $('saveUserRulesBtn').addEventListener('click', () => {
      const splitTags = (str) =>
        String(str || '')
          .split(/[,，\n\r]+/)
          .map((s) => s.trim())
          .filter(Boolean);
      const nextLists = {
        character: splitTags($('ruleCharTextarea').value),
        attribute_xp: splitTags($('ruleAttrTextarea').value),
        series_ip: splitTags($('ruleIpTextarea').value),
        meta_general: splitTags($('ruleMetaTextarea').value)
      };
      const nowIso = new Date().toISOString();
      for (const cat of CATEGORY_CYCLE) {
        for (const t of nextLists[cat]) {
          if (!state.categoryCorrectionLog[t] || state.categoryCorrectionLog[t].to !== cat) {
            const origFrom = state.categoryCorrectionLog[t]?.from || classifyTagClient(t, '', null, true);
            state.categoryCorrectionLog[t] = { tag: t, from: origFrom, to: cat, updatedAt: nowIso };
          }
        }
      }
      state.userCategoryLists = nextLists;
      localStorage.setItem('pixez_cat_lists', JSON.stringify(state.userCategoryLists));
      persistCategoryCorrections();
      $('rulesModal').classList.add('hidden');
      showToast('已保存自定义分类词表并记录纠错历史');
      recomputeAndRender();
    });

    $('resetUserRulesBtn').addEventListener('click', () => {
      state.userCategoryLists = { character: [], attribute_xp: [], series_ip: [], meta_general: [] };
      state.userCategoryOverrides = {};
      state.categoryCorrectionLog = {};
      localStorage.removeItem('pixez_cat_lists');
      localStorage.removeItem('pixez_cat_overrides');
      localStorage.removeItem('pixez_cat_correction_log_v1');
      populateRulesModal();
      showToast('已清空本地自定义词表与纠错记录');
      recomputeAndRender();
    });

    // Auth Modal Actions
    $('saveCookieBtn').addEventListener('click', async () => {
      const raw = $('cookieInput').value.trim();
      if (!raw) {
        showToast('请输入 PHPSESSID');
        return;
      }
      const cookieVal = raw.includes('PHPSESSID=') ? raw : `PHPSESSID=${raw}`;
      state.cookie = cookieVal;
      localStorage.setItem('pixez_cookie', cookieVal);
      try {
        const resp = await apiFetch('/api/auth/verify-cookie', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cookie: cookieVal })
        });
        const d = await resp.json();
        if (resp.ok && !d.error && d.loggedIn) {
          state.authStatus = d;
          persistCachedAuthUser(d);
          updateAuthUI();
        } else {
          await checkAuthStatus();
        }
        showToast(d.user?.name ? `已登录 Pixiv: ${d.user.name}` : (d.message || 'Cookie 已保存'));
      } catch (_) {
        updateAuthUI();
        showToast('Cookie 已保存在本地');
      }
    });

    $('clearCookieBtn').addEventListener('click', performAuthLogout);

    $('startPixivOAuthBtn').addEventListener('click', async () => {
      state.bridgeAutoSyncBlocked = false;
      try { sessionStorage.removeItem('pixez_manual_logout_v4'); } catch (_) {}
      if (!state.bridgeDetected) {
        showToast('未检测到油猴 v4.1.1：纯网页无法拦截 pixiv:// 回调（跳到 post-redirect 会变白屏）。请先安装油猴脚本或使用 Android APK。', 5200);
        return;
      }
      try {
        const r = await apiFetch('/api/oauth/start');
        const d = await r.json();
        if (d.codeVerifier) state.codeVerifier = d.codeVerifier;
        if (d.loginUrl) {
          const w = 520, h = 720;
          const left = Math.max(40, Math.round((screen.width - w) / 2));
          const top = Math.max(40, Math.round((screen.height - h) / 2));
          window.open(d.loginUrl, 'pixiv_oauth_popup', `width=${w},height=${h},left=${left},top=${top},noopener=no`);
          showToast('已打开 Pixiv 授权窗口，点击「继续使用此账号」后将自动完成登录', 4200);
        }
      } catch (e) {
        showToast('无法生成 OAuth 链接');
      }
    });

    $('submitOAuthCodeBtn').addEventListener('click', async () => {
      const codeInput = $('oauthCodeInput').value.trim();
      if (!codeInput) {
        showToast('请填入 OAuth 回调 code');
        return;
      }
      await completeAutomatedOAuthCode(codeInput);
    });

    $('submitRefreshTokenBtn').addEventListener('click', async () => {
      const token = $('refreshTokenInput').value.trim();
      if (!token) return;
      try {
        const r = await apiFetch('/api/oauth/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: token })
        });
        const d = await r.json();
        if (!r.ok || d.error) throw new Error(d.message || d.error || 'Token 验证失败');
        if (d.refreshToken) {
          state.refreshToken = d.refreshToken;
          localStorage.setItem('pixez_refresh_token_v4', d.refreshToken);
        }
        if (d.user) {
          state.authStatus = { loggedIn: true, mode: 'oauth', user: d.user };
          persistCachedAuthUser(state.authStatus);
          updateAuthUI();
        } else {
          await checkAuthStatus();
        }
        $('authModal').classList.add('hidden');
        showToast(`Refresh Token 登录成功${d.user?.name ? ': ' + d.user.name : ''}（后续将自动保持登录）`);
      } catch (err) {
        showToast(`错误: ${err.message}`);
      }
    });

    const openSwitchAccountFlow = () => {
      $('authModal')?.classList.remove('hidden');
      const adv = document.querySelector('#authModal .auth-advanced-details');
      if (adv) adv.open = true;
      showToast('请选择「一键授权登录」或在下方填入新账号凭据以更换账号', 3600);
    };
    $('oauthLogoutBtn')?.addEventListener('click', performAuthLogout);
    $('headerQuickLogoutBtn')?.addEventListener('click', performAuthLogout);
    $('headerQuickSwitchBtn')?.addEventListener('click', openSwitchAccountFlow);
    $('authSwitchAccountBtn')?.addEventListener('click', openSwitchAccountFlow);
    $('refreshAuthProfileBtn')?.addEventListener('click', async () => {
      state.bridgeAutoSyncBlocked = false;
      try { sessionStorage.removeItem('pixez_manual_logout_v4'); } catch (_) {}
      if (state.bridgeDetected) window.postMessage({ type: 'PIXEZ_REQUEST_CHROME_BRIDGE' }, '*');
      await checkAuthStatus();
      showToast('已刷新账号资料');
    });

    // Reverse Search & Direct Artwork ID
    $('openDirectIllustBtn').addEventListener('click', () => {
      const raw = $('directIllustIdInput').value.trim();
      const m = raw.match(/(\d{5,12})/);
      if (!m) {
        showToast('请输入有效的 Pixiv 作品数字 ID');
        return;
      }
      $('reverseModal').classList.add('hidden');
      openIllustViewer(m[1]);
    });
    $('jumpSauceNaoBtn').addEventListener('click', () => {
      const u = $('reverseImgUrlInput').value.trim();
      if (u) window.open(`https://saucenao.com/search.php?url=${encodeURIComponent(u)}`, '_blank');
    });
    $('jumpAscii2dBtn').addEventListener('click', () => {
      const u = $('reverseImgUrlInput').value.trim();
      if (u) window.open(`https://ascii2d.net/search/url/${encodeURIComponent(u)}`, '_blank');
    });

    // Basket Modal Copy/Clear
    $('copyBasketSpaceBtn').addEventListener('click', () => {
      navigator.clipboard.writeText($('basketSpaceOutput').value);
      showToast('已复制 Pixiv 组合搜索词');
    });
    $('copyBasketDanbooruBtn').addEventListener('click', () => {
      navigator.clipboard.writeText($('basketDanbooruOutput').value);
      showToast('已复制 Danbooru / NovelAI 英文绘图 Prompt');
    });
    $('clearBasketBtn').addEventListener('click', () => {
      state.basket.clear();
      saveBasket();
      renderBasketModal();
      renderTable(state.computedCoTags);
    });

    $('clearAllCacheBtn')?.addEventListener('click', async () => {
      await PulseCacheDB.clearAll();
      renderCacheModal();
      showToast('已清空全部本地缓存');
    });
    const applyCacheLimitMb = (rawVal) => {
      const parsed = parseInt(String(rawVal ?? '').trim(), 10);
      if (!Number.isFinite(parsed) || parsed < 0) {
        showToast('请输入有效的缓存上限 MB（0 表示不限，或 64 ~ 65536）');
        return;
      }
      const nextMb = parsed === 0 ? 0 : Math.max(64, Math.min(65536, parsed));
      state.cacheLimitMb = nextMb;
      localStorage.setItem('pixez_cache_limit_mb', String(nextMb));
      renderCacheModal();
      showToast(`本地缓存上限已设置为 ${formatCacheLimitLabel(nextMb)}`);
    };
    $('cacheLimitMbSelect')?.addEventListener('change', (e) => {
      const v = String(e.target.value || '');
      if (v === 'custom') {
        const inp = $('cacheLimitCustomInput');
        if (inp) {
          inp.focus();
          inp.select();
        }
        return;
      }
      applyCacheLimitMb(v);
    });
    $('applyCacheLimitBtn')?.addEventListener('click', () => {
      applyCacheLimitMb($('cacheLimitCustomInput')?.value);
    });
    $('cacheLimitCustomInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyCacheLimitMb($('cacheLimitCustomInput')?.value);
      }
    });
  }

  // Startup initialization
  applyVisualSettings();
  initOpticalScrollbar();
  saveBasket();
  refreshCacheBadge();
  initCustomSelects();
  applySourceUI();
  initQuickJumpRail();
  initEvents();
  renderRecentSearches();
  refreshCorrectionBadge();
  syncCommunityTagOverrides(false);
  checkAuthStatus();

  const urlParams = new URLSearchParams(window.location.search);
  const autoCode = urlParams.get('pixiv_code');
  if (autoCode) {
    completeAutomatedOAuthCode(autoCode);
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  const initialQuery = (urlParams.get('q') || urlParams.get('tag') || '').trim();
  if (initialQuery) {
    $('tagSearchInput').value = initialQuery;
    showToast(`已填入标签 [${initialQuery}]，请确认采集深度后点击「开始采样」`);
  }
})();
