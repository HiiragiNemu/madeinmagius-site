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
    refreshToken: localStorage.getItem('pixez_refresh_token_v4') || '',
    source: SOURCE_META[localStorage.getItem('pixez_source_v43')] ? localStorage.getItem('pixez_source_v43') : 'pixiv',
    r34Key: localStorage.getItem('pixez_r34_key') || '',
    r34Uid: localStorage.getItem('pixez_r34_uid') || '',
    bridgeDetected: false,
    bridgeVersion: '',
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
    lockedSubTags: new Set(),
    basket: new Set(JSON.parse(localStorage.getItem('pixez_basket') || '[]')),
    userCategoryOverrides: JSON.parse(localStorage.getItem('pixez_cat_overrides') || '{}'),
    userCategoryLists: JSON.parse(localStorage.getItem('pixez_cat_lists') || '{"character":[],"attribute_xp":[],"series_ip":[],"meta_general":[]}'),
    danbooruCache: {},

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
    if (!url) return '#';
    return apiUrl(`/api/pixiv/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename || 'pixiv-artwork.jpg')}`);
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

  function classifyTagClient(tag, translation = '', serverCategory = null) {
    const clean = String(tag || '').trim();
    if (!clean) return 'meta_general';
    const lower = clean.toLowerCase();

    if (state.userCategoryOverrides[clean]) return state.userCategoryOverrides[clean];
    for (const cat of CATEGORY_CYCLE) {
      if (Array.isArray(state.userCategoryLists[cat]) && state.userCategoryLists[cat].includes(clean)) {
        return cat;
      }
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

    if (
      ATTR_SET.has(lower) ||
      (/(タイツ|ストッキング|ニーソ|水着|ビキニ|制服|メイド|バニー|ドレス|服|着|耳|髪|目|眼|乳|胸|尻|足|脚|もも|腋|腹|へそ|顔|涙|笑|娘|少女|ロリ|姉|百合|キス|メガネ|眼鏡|リボン|帽|脱ぎ|出し|再臨|緊縛|拘束|ゲーム|ブローチ)$/.test(clean) &&
        !/^キュア/.test(clean))
    ) {
      return 'attribute_xp';
    }

    if (serverCategory && ['character', 'attribute_xp', 'series_ip', 'meta_general', 'bookmark_milestone', 'ai_meta'].includes(serverCategory)) {
      return serverCategory;
    }

    // Positive-evidence-ONLY Character Heuristics (NEVER default unknown tags to 'character'!)
    if (/^(キュア|仮面ライダー|ウルトラマン)[ァ-ヴー・]+/.test(clean)) return 'character';

    const parenMatch = clean.match(/^([^()（）]{2,15})[(（]([^()（）]{1,18})[)）]$/);
    if (parenMatch) {
      const baseName = parenMatch[1].trim();
      if (!CLASS_OR_NON_CHAR_BASE_RE.test(baseName) && !ATTR_SET.has(baseName.toLowerCase()) && !META_SET.has(baseName.toLowerCase())) {
        return 'character';
      }
      return 'attribute_xp';
    }

    if (/^[ァ-ヴー]{2,10}・[ァ-ヴー]{2,10}$/.test(clean) && !NON_CHAR_WORDS.has(lower)) {
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

    if (!NON_CHAR_WORDS.has(lower) && /^[一-龥々ヶノ]{1,3}[ぁ-んー]{2,5}$/.test(clean)) {
      return 'character';
    }
    if (!NON_CHAR_WORDS.has(lower) && /^[一-龥々ヶノ]{1,3}[ァ-ヴー]{2,6}$/.test(clean)) {
      return 'character';
    }

    return 'attribute_xp';
  }

  function cycleTagCategory(tag) {
    const current = classifyTagClient(tag);
    const idx = CATEGORY_CYCLE.indexOf(current);
    const nextCat = CATEGORY_CYCLE[(idx + 1) % CATEGORY_CYCLE.length];
    state.userCategoryOverrides[tag] = nextCat;
    localStorage.setItem('pixez_cat_overrides', JSON.stringify(state.userCategoryOverrides));
    showToast(`已将 [${tag}] 归类切换为: ${CATEGORY_META[nextCat].label}`);
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
    const hideMetaTags = $('hideMetaTagCheck').checked;
    const minCount = Math.max(1, parseInt($('minCountInput').value, 10) || 1);

    const activeWorks = allWorks.filter((w) => {
      if (excludeAiWorks && w.isAi) return false;
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
            translation: transLookup[t] || '',
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
        if (hideMetaTags && (cat === 'meta_general' || cat === 'ai_meta')) continue;
      }

      const dbInfo = state.danbooruCache[item.tag] || (ds.danbooruMap && ds.danbooruMap[item.tag]) || null;

      const thirdTags = Array.from(item.thirdMap.entries())
        .filter(([t3]) => {
          if (state.lockedSubTags.has(t3)) return false;
          const c3 = classifyTagClient(t3);
          if (hideBookmarkTags && c3 === 'bookmark_milestone') return false;
          if (hideAiTags && c3 === 'ai_meta') return false;
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
    if (totalMatches > 0) {
      $('statTotalMatched').textContent = `(全站 ${totalMatches.toLocaleString()})`;
    } else if (ds.hasMore) {
      $('statTotalMatched').textContent = `(全站 ${activeWorks.length.toLocaleString()}+ 续翻中)`;
    } else {
      $('statTotalMatched').textContent = `(已采 ${activeWorks.length.toLocaleString()})`;
    }

    const uniqueArtists = new Set(activeWorks.map((w) => w.userId).filter(Boolean)).size;
    $('statSampledCount').textContent = `${activeWorks.length} 作`;
    $('statUniqueArtists').textContent = `(${uniqueArtists}画师/${pagesScanned}页)`;

    const totalTagsInWorks = activeWorks.reduce((acc, w) => acc + (w.tags ? w.tags.length : 0), 0);
    const avgTags = activeWorks.length > 0 ? (totalTagsInWorks / activeWorks.length).toFixed(1) : '0.0';
    $('statUniqueCoTags').textContent = `${fullList.length} 个`;
    $('statAvgTagsPerWork').textContent = `(可见 ${scopedList.length} · 均${avgTags}/作)`;

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
    $('statOriginalRate').textContent = `${origRate}% 手绘`;
    $('statAiBreakdown').textContent = excludeAi && poolAiCount > 0
      ? `(已剔除 AI ${poolAiCount}作)`
      : `(AI ${aiWorksCount}作)`;

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

  function renderTable(scopedList) {
    const tbody = $('coTagTableBody');
    const keyword = $('tableFilterInput').value.trim().toLowerCase();

    const filtered = scopedList.filter((item) => {
      if (item.isPinnedLocked) return true;
      if (keyword) {
        const matchTag = item.tag.toLowerCase().includes(keyword);
        const matchTr = (item.translation || '').toLowerCase().includes(keyword);
        const matchDb = (item.danbooruTag || '').toLowerCase().includes(keyword);
        if (!matchTag && !matchTr && !matchDb) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-cell">未找到匹配的共现标签</td></tr>`;
      return;
    }

    const maxCount = filtered[0].count || 1;
    let unlockedRank = 0;

    const visibleRows = filtered.slice(0, state.tableDisplayLimit);
    const hasMore = filtered.length > visibleRows.length;

    tbody.innerHTML = visibleRows
      .map((item) => {
        if (!item.isPinnedLocked) unlockedRank++;
        const rankBadgeClass = !item.isPinnedLocked && unlockedRank <= 3 ? `top-${unlockedRank}` : '';
        const rankLabel = item.isPinnedLocked ? '锁' : String(unlockedRank).padStart(2, '0');

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

        const dbBadgeHtml = item.danbooruTag
          ? `<a class="danbooru-badge" href="https://danbooru.donmai.us/posts?tags=${encodeURIComponent(item.danbooruTag)}" target="_blank" rel="noopener" title="Danbooru / NovelAI 英文词条">${escapeHtml(item.danbooruTag)}</a>`
          : '';

        return `
          <tr class="${item.isPinnedLocked ? 'pinned-locked-row' : ''}">
            <td class="col-rank"><span class="rank-badge ${rankBadgeClass}">${rankLabel}</span></td>
            <td class="col-tag">
              <div class="tag-cell-main">
                <span class="tag-name-link" data-inspect="${escapeHtml(item.tag)}">${escapeHtml(item.tag)}</span>
                ${item.translation ? `<span class="tag-trans-badge">${escapeHtml(item.translation)}</span>` : ''}
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
        $('tagSearchInput').value = el.dataset.pivot;
        state.lockedSubTags.clear();
        executeAnalysis(el.dataset.pivot);
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

  function renderGallery() {
    const grid = $('artworkGalleryGrid');
    if (!grid) return;

    const q = $('galleryTagFilterInput').value.trim().toLowerCase();
    const typeFilter = $('galleryTypeFilterSelect').value;
    const sortBy = $('gallerySortSelect').value;

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

    if (list.length === 0) {
      grid.innerHTML = `<div class="empty-placeholder">暂无匹配的作品样本</div>`;
      return;
    }

    const hiTags = [state.rawDataset?.primaryTag || '', ...Array.from(state.lockedSubTags)];
    grid.innerHTML = list.slice(0, 80).map((w, idx) => createArtworkCardHtml(w, hiTags, idx < 12)).join('');
    bindArtworkCardEvents(grid);
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
        const resp = await apiFetch(`/api/illust/detail?id=${encodeURIComponent(illustId)}`, {
          headers: state.cookie ? { 'X-Pixiv-Cookie': state.cookie } : {}
        });
        const rawJson = await resp.json();
        if (!resp.ok || rawJson.error) throw new Error(rawJson.message || rawJson.error || '加载作品详情失败');
        json = rawJson.data || rawJson;
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
          modal.classList.add('hidden');
          $('tagSearchInput').value = pill.dataset.viewerTag;
          state.lockedSubTags.clear();
          executeAnalysis(pill.dataset.viewerTag);
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
        await playUgoiraInViewer(json.id);
      } else {
        $('viewerDownloadUgoiraZipBtn').classList.add('hidden');
        updateViewerPage();
      }
    } catch (err) {
      loading.classList.add('hidden');
      showToast(`看图加载失败: ${err.message}`);
    }
  }

  function updateViewerPage() {
    const ill = state.viewer.illust;
    if (!ill) return;
    const pages = ill.pages || [];
    const page = pages[state.viewer.pageIndex] || {
      large: ill.largeUrl || ill.regularUrl,
      original: ill.originalUrl
    };

    const total = pages.length || 1;
    $('viewerPageIndicator').textContent = `${state.viewer.pageIndex + 1} / ${total}`;
    $('viewerQualityToggleBtn').textContent = state.viewer.useOriginal ? '当前: 原图' : '切换原图';

    document.querySelectorAll('#viewerThumbStrip .viewer-thumb-item').forEach((el, idx) => {
      el.classList.toggle('active', idx === state.viewer.pageIndex);
    });

    const regUrl = page.large || page.regular || page.medium || page.original;
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
    mainImg.src = proxyImg(targetUrl);

    const dlUrl = origUrl;
    const ext = (dlUrl && dlUrl.split('.').pop().split('?')[0]) || 'jpg';
    $('viewerDownloadCurrentBtn').href = downloadImgUrl(dlUrl, `pixiv_${ill.id}_p${state.viewer.pageIndex}.${ext}`);
  }

  async function playUgoiraInViewer(illustId) {
    const loading = $('viewerLoadingOverlay');
    const mainImg = $('viewerMainImg');
    const canvas = $('viewerUgoiraCanvas');

    try {
      const resp = await apiFetch(`/api/illust/ugoira?id=${encodeURIComponent(illustId)}`, {
        headers: state.cookie ? { 'X-Pixiv-Cookie': state.cookie } : {}
      });
      const rawData = await resp.json();
      const data = rawData.data || rawData;
      if (!resp.ok || rawData.error || !data.frames || !data.frames.length) {
        updateViewerPage();
        return;
      }

      if (data.zipUrl) {
        const zipBtn = $('viewerDownloadUgoiraZipBtn');
        zipBtn.classList.remove('hidden');
        zipBtn.href = downloadImgUrl(data.zipUrl, `pixiv_ugoira_${illustId}.zip`);
      }

      const images = await Promise.all(
        data.frames.map(
          (f) =>
            new Promise((resolve) => {
              const img = new Image();
              img.onload = () => resolve({ img, delay: f.delay || 50 });
              img.onerror = () => resolve(null);
              img.src = f.dataUrl;
            })
        )
      );

      const validFrames = images.filter(Boolean);
      if (validFrames.length === 0) {
        updateViewerPage();
        return;
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
    $('preflightNoticeBar')?.classList.add('hidden');
    $('preflightConfirmActions')?.classList.add('hidden');
  }

  function showPreflightBanner(text, needsConfirm = false) {
    const bar = $('preflightNoticeBar');
    const textEl = $('preflightNoticeText');
    const acts = $('preflightConfirmActions');
    if (!bar || !textEl) return;
    textEl.textContent = text;
    bar.classList.remove('hidden');
    if (acts) acts.classList.toggle('hidden', !needsConfirm);
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
      .slice(0, 60)
      .map(([t]) => t);
    if (!topUncached.length) return;
    let map = {};
    try {
      const r = await apiFetch('/api/danbooru/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: topUncached })
      });
      if (r.ok) {
        const d = await r.json();
        if (d && d.danbooruMap) map = d.danbooruMap;
      }
    } catch (_) {}

    // Direct-browser CORS fallback (danbooru.donmai.us returns Access-Control-Allow-Origin: *)
    if (Object.keys(map).length === 0) {
      try {
        for (let i = 0; i < topUncached.length; i += 20) {
          const chunk = topUncached.slice(i, i + 20);
          const qs = new URLSearchParams({
            'search[other_names_include_any]': chunk.join(' '),
            limit: '100',
            only: 'title,other_names,tag[name,category,post_count]'
          });
          const r = await fetch(`https://danbooru.donmai.us/wiki_pages.json?${qs.toString()}`);
          if (!r.ok) continue;
          const items = await r.json();
          if (!Array.isArray(items)) continue;
          for (const pixTag of chunk) {
            const lp = pixTag.toLowerCase();
            let best = null;
            for (const item of items) {
              const others = Array.isArray(item.other_names) ? item.other_names : [];
              if (others.some((n) => String(n).toLowerCase() === lp) || String(item.title || '').toLowerCase() === lp) {
                const pc = Number(item.tag?.post_count || 0);
                if (!best || pc > best.postCount) {
                  const code = Number(item.tag?.category ?? 0);
                  best = {
                    danbooruTag: item.title || item.tag?.name || '',
                    category: code === 4 ? 'character' : code === 3 ? 'series_ip' : (code === 1 || code === 5 ? 'meta_general' : 'attribute_xp'),
                    postCount: pc
                  };
                }
              }
            }
            if (best && best.danbooruTag) map[pixTag] = best;
          }
        }
      } catch (_) {}
    }

    if (Object.keys(map).length > 0) {
      Object.assign(state.danbooruCache, map);
      if (state.rawDataset) {
        state.rawDataset.danbooruMap = { ...(state.rawDataset.danbooruMap || {}), ...map };
      }
      recomputeAndRender();
    }
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
      for (let off = 0; off < chunkPages && !reachedEnd && !signal.aborted; off += 3) {
        const batch = [];
        for (let k = 0; k < 3 && off + k < chunkPages; k++) batch.push(startPage + off + k);
        onProgress?.(batch[0], artworks.length);
        const results = await Promise.all(
          batch.map((p) =>
            fetch(`https://danbooru.donmai.us/posts.json?tags=${encodeURIComponent(apiTags)}&limit=100&page=${p}`, { signal })
              .then((r) => (r.ok ? r.json() : []))
              .catch(() => [])
              .then((data) => ({ p, data }))
          )
        );
        for (const { p, data } of results) {
          if (!Array.isArray(data) || !data.length) { reachedEnd = true; continue; }
          pagesScanned++;
          nextPage = Math.max(nextPage, p + 1);
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
      hasMore = !reachedEnd && nextPage <= 1000;
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

    const pages = opts.overridePages || $('pagesSelect').value;
    const isAllMode = String(pages).toUpperCase() === 'ALL';
    const order = $('orderSelect')?.value || 'date_d';
    const mode = $('modeSelect').value;
    const sMode = $('sModeSelect').value;
    const type = $('typeSelect').value;
    const includePopular = $('includePopularCheck').checked;

    const progressWrap = $('progressBarWrap');
    const progressText = $('progressText');
    const progressPct = $('progressPercent');
    const progressFill = $('progressBarFill');
    const stopBtn = $('stopStreamBtn');
    const analyzeBtn = $('analyzeBtn');

    const commonHeaders = {};
    if (state.cookie) commonHeaders['X-Pixiv-Cookie'] = state.cookie;
    if (state.r34Key) commonHeaders['X-R34-Key'] = state.r34Key;
    if (state.r34Uid) commonHeaders['X-R34-Uid'] = state.r34Uid;

    // Step 1: Pre-flight tag total count lookup BEFORE running progress bar!
    let preflightInfo = opts.preflightInfo || null;
    if (!preflightInfo) {
      showPreflightBanner(`正在探测 [${srcMeta.label}] 标签 [${parsed.tag}] 的全站作品总数...`, false);
      try {
        // Danbooru & Sankaku support direct browser CORS cleanly (avoids CF-Worker egress WAF)
        if ((source === 'danbooru' || source === 'sankaku') && API_BASE) {
          preflightInfo = await directBrowserTagInfo(source, parsed.tag, mode);
        }
        if (!preflightInfo) {
          const infoQs = new URLSearchParams({ source, tag: parsed.tag, mode, s_mode: sMode, type });
          const ir = await apiFetch(`/api/tag-info?${infoQs.toString()}`, { headers: commonHeaders });
          const idata = await ir.json().catch(() => null);
          if (idata && idata.error) {
            showPreflightBanner(idata.message || '无法连接目标数据源', false);
            if (idata.needsAuth) {
              showToast(idata.message, 4500);
              $('authModal')?.classList.remove('hidden');
            }
            return;
          }
          preflightInfo = idata || null;
        }
      } catch (_) {}
    }

    if (preflightInfo) {
      const totalPosts = Number(preflightInfo.totalPosts || 0);
      const estPages = Number(preflightInfo.estimatedPages || 0);
      const bannerNote =
        preflightInfo.note ||
        (totalPosts > 0
          ? `[${srcMeta.label}] 标签 [${preflightInfo.resolvedTag || parsed.tag}] 全站共 ${totalPosts.toLocaleString()} 件作品 (约 ${estPages.toLocaleString()} 页)`
          : `[${srcMeta.label}] 已连接 [${preflightInfo.resolvedTag || parsed.tag}]`);

      const isHugeAll =
        isAllMode &&
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

    const accumWorks = new Map();
    const accumTrans = {};
    const accumNativeCats = {};
    const accumDanbooru = {};
    let totalPagesScanned = 0;
    let knownTotalPosts = Number(preflightInfo?.totalPosts || 0);
    let primaryResolvedTag = preflightInfo?.resolvedTag || parsed.tag;
    let lastEngine = `${srcMeta.label.toUpperCase()}-API`;

    const requestedMaxPages = isAllMode ? 1000 : Math.max(1, parseInt(pages, 10) || 3);
    const chunkSize = source === 'pixiv' ? 24 : 10;
    let startPage = 1;
    let cursor = '';
    let hasMore = true;
    let chunkIndex = 0;
    let lastSnapshotRenderAt = 0;

    const flushDataset = (forceRender = false, stillHasMore = false) => {
      const worksArr = Array.from(accumWorks.values());
      state.rawDataset = {
        source,
        primaryTag: primaryResolvedTag,
        pixivTotal: knownTotalPosts,
        pagesScanned: totalPagesScanned,
        engine: lastEngine,
        hasMore: stillHasMore,
        artworks: worksArr,
        translations: accumTrans,
        nativeTagCategories: accumNativeCats,
        danbooruMap: accumDanbooru
      };
      $('engineSourceIndicator').textContent = `${lastEngine} · ${totalPagesScanned}P`;
      const now = Date.now();
      if (forceRender || now - lastSnapshotRenderAt >= 420) {
        lastSnapshotRenderAt = now;
        if (forceRender) state.tableDisplayLimit = 160;
        recomputeAndRender();
      }
    };

    try {
      const useDirectBrowserBooru = Boolean(API_BASE && (source === 'danbooru' || source === 'sankaku'));
      while (hasMore && !abortCtrl.signal.aborted && chunkIndex < 120) {
        chunkIndex++;
        if (useDirectBrowserBooru) {
          const stepChunk = isAllMode ? 6 : Math.min(6, Math.max(1, requestedMaxPages - totalPagesScanned));
          const ch = await directBrowserSampleChunk({
            source,
            tag: primaryResolvedTag,
            startPage,
            chunkPages: stepChunk,
            cursor,
            mode,
            order,
            signal: abortCtrl.signal,
            onProgress: (curP, inChunk) => {
              const curTotal = accumWorks.size + inChunk;
              const targetWorks = isAllMode
                ? (knownTotalPosts > 0 ? Math.min(knownTotalPosts, 100000) : Math.max(curTotal + 200, 1000))
                : Math.min(knownTotalPosts > 0 ? knownTotalPosts : requestedMaxPages * srcMeta.pageSize, requestedMaxPages * srcMeta.pageSize);
              const pct = targetWorks > 0 ? Math.min(96, Math.max(4, Math.round((curTotal / targetWorks) * 96))) : 35;
              progressText.textContent = knownTotalPosts > 0
                ? `[${srcMeta.label}] 第 ${curP} 页 · 已采集 ${curTotal.toLocaleString()} / ${knownTotalPosts.toLocaleString()} 件作品`
                : `[${srcMeta.label}] 正在采集第 ${curP} 页 (已采 ${curTotal.toLocaleString()} 作)...`;
              progressPct.textContent = `${pct}%`;
              progressFill.style.width = `${pct}%`;
            }
          });
          lastEngine = ch.engine;
          Object.assign(accumNativeCats, ch.nativeTagCategories || {});
          Object.assign(accumTrans, ch.translations || {});
          for (const w of ch.artworks || []) {
            if (w && w.id) accumWorks.set(String(w.id), w);
          }
          totalPagesScanned += ch.pagesScanned || 0;
          flushDataset(true, ch.hasMore);
          if (!ch.hasMore || (!isAllMode && totalPagesScanned >= requestedMaxPages)) {
            hasMore = false;
          } else {
            startPage = ch.nextPage;
            cursor = ch.nextCursor || '';
          }
          continue;
        }
        const qs = new URLSearchParams({
          source,
          tag: primaryResolvedTag,
          pages,
          order,
          startPage: String(startPage),
          chunkPages: String(chunkSize),
          cursor,
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
        let chunkNextPage = startPage;
        let chunkNextCursor = '';
        let chunkPagesDone = 0;

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
                const ceilingWorks = Number(preflightInfo?.apiCeilingWorks || 60000);
                const targetWorks = isAllMode
                  ? (knownTotalPosts > 0 ? Math.min(knownTotalPosts, ceilingWorks) : Math.max(accumWorks.size + 300, 1200))
                  : Math.min(knownTotalPosts > 0 ? knownTotalPosts : requestedMaxPages * srcMeta.pageSize, requestedMaxPages * srcMeta.pageSize);
                const curWorks = Math.max(accumWorks.size, Number(payload.sampledArtworks || 0));
                const pct = targetWorks > 0
                  ? Math.min(96, Math.max(4, Math.round((curWorks / targetWorks) * 96)))
                  : (payload.totalPages ? Math.min(95, Math.round((payload.currentPage / payload.totalPages) * 95)) : 35);
                progressText.textContent =
                  knownTotalPosts > 0
                    ? `[${srcMeta.label}] 第 ${payload.currentPage || startPage} 页 · 已采集 ${curWorks.toLocaleString()} / ${knownTotalPosts.toLocaleString()} 件作品`
                    : (payload.message || `[${srcMeta.label}] 正在采集第 ${payload.currentPage || startPage} 页 (已采 ${curWorks.toLocaleString()} 作)...`);
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
                if (ds.primaryTag || ds.meta?.queryTag) primaryResolvedTag = ds.primaryTag || ds.meta?.queryTag;
                if (ds.engine || ds.meta?.engine) lastEngine = ds.engine || ds.meta?.engine;
                const dsTotal = Number(ds.pixivTotal ?? ds.meta?.totalMatches ?? 0);
                if (dsTotal > knownTotalPosts) knownTotalPosts = dsTotal;

                for (const w of ds.artworks || []) {
                  if (w && w.id) accumWorks.set(String(w.id), w);
                }

                if (eventType === 'complete') {
                  chunkPagesDone = Number(ds.pagesScanned || ds.meta?.pagesFetched || 1);
                  chunkHasMore = Boolean(payload.hasMore ?? ds.hasMore);
                  chunkNextPage = Number(payload.nextPage || ds.nextPage || (startPage + chunkPagesDone));
                  chunkNextCursor = String(payload.nextCursor || ds.nextCursor || '');
                  totalPagesScanned += chunkPagesDone;
                  flushDataset(true, chunkHasMore);
                } else {
                  const snapPages = Number(ds.pagesScanned || ds.meta?.pagesFetched || 1);
                  totalPagesScanned = Math.max(totalPagesScanned, snapPages);
                  flushDataset(false, true);
                }
              } else if (eventType === 'error') {
                showToast(`采样提示: ${payload.message || '请求异常'}`);
                chunkHasMore = false;
              }
            } catch (_) {}
          }
        }

        if (!chunkHasMore) {
          hasMore = false;
        } else if (!isAllMode && totalPagesScanned >= requestedMaxPages) {
          hasMore = false;
        } else if (chunkNextPage <= startPage && !chunkNextCursor) {
          hasMore = false;
        } else {
          startPage = chunkNextPage;
          cursor = chunkNextCursor;
        }
      }

      flushDataset(true, false);
      progressFill.style.width = '100%';
      progressPct.textContent = '100%';
      const finalCount = accumWorks.size;
      progressText.textContent =
        knownTotalPosts > 0
          ? `完成 [${srcMeta.label}] [${primaryResolvedTag}] 采样：已采集 ${finalCount.toLocaleString()} 件 (全站共 ${knownTotalPosts.toLocaleString()} 件 / ${totalPagesScanned} 页)`
          : `完成 [${srcMeta.label}] [${primaryResolvedTag}] 采样：共 ${finalCount.toLocaleString()} 件作品 (${totalPagesScanned} 页)`;

      // Auto-enrich Pixiv / Safebooru / Zerochan / Rule34 top tags via Danbooru semantic wiki
      if (['pixiv', 'safebooru', 'zerochan', 'rule34'].includes(source) && finalCount > 0) {
        enrichTopTagsViaDanbooru(Array.from(accumWorks.values()), primaryResolvedTag);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        flushDataset(true, false);
        showToast(`已停止翻页并锁定当前已采集的 ${accumWorks.size.toLocaleString()} 件样本`);
      } else {
        showToast(`采样中断: ${err.message}`);
      }
    } finally {
      state.activeStreamAbort = null;
      analyzeBtn.disabled = false;
      stopBtn.classList.add('hidden');
      setTimeout(() => progressWrap.classList.add('hidden'), 1800);
    }
  }

  // =========================================================================
  // 10. TOPOLOGY GRAPH VIEW (True 1:1 Aspect Ratio, Character Avatar Bubbles, Multi-Lingual, PNG Exporter)
  // =========================================================================
  function findBestAvatarUrlForTag(tag, isCenter = false) {
    const works = state.filteredArtworks && state.filteredArtworks.length
      ? state.filteredArtworks
      : (state.rawDataset?.artworks || []);
    if (!works.length) return '';

    const candidates = isCenter
      ? works.filter((w) => w.thumbUrl)
      : works.filter((w) => w.thumbUrl && Array.isArray(w.tags) && w.tags.includes(tag));

    if (!candidates.length) return '';

    const scored = candidates.slice().sort((a, b) => {
      const aSafe = (a.xRestrict || 0) === 0 ? 1 : 0;
      const bSafe = (b.xRestrict || 0) === 0 ? 1 : 0;
      if (aSafe !== bSafe) return bSafe - aSafe;
      const aCharCount = (a.tags || []).filter((t) => classifyTagClient(t) === 'character').length;
      const bCharCount = (b.tags || []).filter((t) => classifyTagClient(t) === 'character').length;
      if (aCharCount !== bCharCount && aCharCount <= 2 && bCharCount > 2) return -1;
      if (aCharCount !== bCharCount && bCharCount <= 2 && aCharCount > 2) return 1;
      return (b.bookmarkCount || 0) - (a.bookmarkCount || 0);
    });

    return proxyImg(scored[0].thumbUrl);
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
        requestAnimationFrame(() => renderNetworkGraph(false));
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
    const H = Math.max(240, Math.round(stageRect.height || 480));
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }

    const ctx = canvas.getContext('2d');
    const limit = parseInt($('graphNodeLimitRange').value, 10) || 28;
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
    const innerCount = Math.min(9, Math.ceil(topTags.length * 0.35));
    const outerCount = Math.max(1, topTags.length - innerCount);
    const innerR = minDim * 0.23;
    const outerR = minDim * 0.39;

    topTags.forEach((item, idx) => {
      const isInner = idx < innerCount;
      const ringIdx = isInner ? idx : idx - innerCount;
      const ringTotal = isInner ? innerCount : outerCount;
      const angleOffset = isInner ? -Math.PI / 2 : -Math.PI / 2 + Math.PI / ringTotal;
      const angle = angleOffset + (ringIdx / ringTotal) * Math.PI * 2;
      const ringRadius = isInner ? innerR : outerR;

      const catMeta = CATEGORY_META[item.category] || CATEGORY_META.all;
      const cCol = style.getPropertyValue(catMeta.colorVar).trim() || accentCol;
      const isCharNode = item.category === 'character';
      const avatarUrl = (showAvatar && isCharNode) ? findBestAvatarUrlForTag(item.tag, false) : '';
      const baseRadius = (showAvatar && isCharNode && avatarUrl)
        ? Math.max(16, Math.round(15 + (item.count / maxCount) * 10))
        : Math.max(7, Math.round(7 + (item.count / maxCount) * 10));

      nodes.push({
        id: item.tag,
        label: item.tag,
        translation: item.translation || '',
        danbooruTag: item.danbooruTag || '',
        category: item.category,
        avatarUrl,
        x: cx + Math.cos(angle) * ringRadius,
        y: cy + Math.sin(angle) * ringRadius,
        r: baseRadius,
        color: cCol,
        count: item.count,
        percentage: item.percentage,
        thirdTags: item.thirdTags
      });
    });

    state.graph.nodes = nodes;
    const nodeById = new Map(nodes.map((n) => [n.id, n]));

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

    // Draw secondary co-occurrence links between outer/inner nodes
    if (state.pairMatrix) {
      ctx.save();
      ctx.globalAlpha = 0.28;
      for (const [pairKey, pairCnt] of state.pairMatrix.entries()) {
        if (pairCnt < 2) continue;
        const [tA, tB] = pairKey.split('|||');
        const nA = nodeById.get(tA);
        const nB = nodeById.get(tB);
        if (nA && nB && !nA.isCenter && !nB.isCenter) {
          ctx.beginPath();
          ctx.moveTo(nA.x, nA.y);
          ctx.lineTo(nB.x, nB.y);
          ctx.strokeStyle = borderCol;
          ctx.lineWidth = Math.max(0.7, (pairCnt / maxCount) * 2);
          ctx.stroke();
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
    state.refreshToken = '';
    state.authStatus = { loggedIn: false, mode: 'guest', user: null };
    localStorage.removeItem('pixez_cookie');
    localStorage.removeItem('pixez_refresh_token_v4');
    localStorage.removeItem('pixez_auth_user_v4');
    if ($('cookieInput')) $('cookieInput').value = '';
    if ($('refreshTokenInput')) $('refreshTokenInput').value = '';
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    updateAuthUI();
    showToast('已退出 Pixiv 账号，当前切换为免登录直连模式');
  }

  async function completeAutomatedOAuthCode(code) {
    if (!code || oauthExchanging) return;
    oauthExchanging = true;
    try {
      const r = await apiFetch('/api/oauth/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, codeVerifier: state.codeVerifier || '' })
      });
      const d = await r.json();
      if (!r.ok || d.error) throw new Error(d.message || d.error || '自动授权交换失败');
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
          const rr = await apiFetch('/api/oauth/exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: state.refreshToken })
          });
          const rd = await rr.json();
          if (rr.ok && !rd.error && rd.user) {
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
        state.authStatus = { loggedIn: false, mode: 'guest', user: null };
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
    const modeLabel = d.mode === 'oauth' ? 'PixEz OAuth' : d.mode === 'cookie' ? 'Chrome Cookie' : '已连接';

    const authBtn = $('openAuthModalBtn');
    const authDot = $('headerAuthDot');
    const authAvatar = $('headerAuthAvatar');
    const quickLogout = $('headerQuickLogoutBtn');
    const profileCard = $('authProfileCard');
    const statusBanner = $('authStatusBanner');

    if (isLogged) {
      $('headerAuthLabel').textContent = userName || '已登录';
      if (authBtn) {
        authBtn.classList.add('is-logged-in');
        authBtn.title = `已登录 Pixiv: ${userName}${uid ? ` (UID ${uid})` : ''} · 点击查看资料或退出`;
      }
      if (authDot) authDot.classList.remove('hidden');
      if (quickLogout) quickLogout.classList.remove('hidden');
      bindAvatarImg(authAvatar, avatarUrl, null);

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
      $('authCurrentStatusBox').textContent = `当前状态: 已连接 Pixiv 账号 (${userName}) — 后续打开将自动保持登录。`;
    } else {
      $('headerAuthLabel').textContent = '账号';
      if (authBtn) {
        authBtn.classList.remove('is-logged-in');
        authBtn.title = 'Pixiv 账号与登录说明（当前免登录直连模式）';
      }
      if (authDot) authDot.classList.add('hidden');
      if (authAvatar) {
        authAvatar.classList.add('hidden');
        authAvatar.removeAttribute('src');
      }
      if (quickLogout) quickLogout.classList.add('hidden');
      if (profileCard) profileCard.classList.add('hidden');
      if (statusBanner) statusBanner.classList.remove('hidden');
      $('authCurrentStatusBox').textContent = '当前状态: 免登录直连模式 — 可直接使用全部采样与看图功能。';
    }

    if ($('bridgeStatusTitle')) {
      if (state.bridgeDetected) {
        $('bridgeStatusTitle').textContent = `油猴桥接已就绪 (v${state.bridgeVersion || '4.0'})`;
      } else {
        $('bridgeStatusTitle').textContent = '三种使用方式说明';
      }
    }
  }

  window.addEventListener('message', async (ev) => {
    if (!ev.data || typeof ev.data !== 'object') return;
    if (ev.data.type === 'PIXEZ_USERSCRIPT_ALIVE') {
      state.bridgeDetected = true;
      state.bridgeVersion = ev.data.version || '4.0';
      updateAuthUI();
      return;
    }
    if (ev.data.type === 'PIXEZ_OAUTH_CODE' && ev.data.code) {
      await completeAutomatedOAuthCode(ev.data.code);
      return;
    }
    if (ev.data.type === 'PIXEZ_USERSCRIPT_BRIDGE_READY' && ev.data.cookie) {
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
    syncCustomSelects();
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
        $('tagSearchInput').value = item.tag;
        state.lockedSubTags.clear();
        executeAnalysis(item.tag, { source: item.source || 'pixiv' });
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

  function selectAutocompleteItem(tagName) {
    if (!tagName) return;
    $('tagSearchInput').value = tagName;
    hideAutocomplete();
    state.lockedSubTags.clear();
    executeAnalysis(tagName);
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
    acTimer = setTimeout(async () => {
      const ctrl = new AbortController();
      acAbort = ctrl;
      try {
        const headers = state.cookie ? { 'X-Pixiv-Cookie': state.cookie } : {};
        const src = state.source || 'pixiv';
        let list = [];
        if (API_BASE && (src === 'danbooru' || src === 'sankaku')) {
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
        renderAutocomplete(list);
      } catch (err) {
        if (err && err.name !== 'AbortError') hideAutocomplete();
      }
    }, 180);
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
        window.postMessage({ type: 'PIXEZ_REQUEST_CHROME_BRIDGE' }, '*');
        showToast(state.bridgeDetected ? '正在同步当前浏览器 Pixiv 登录态...' : '未检测到 v4.0 油猴桥接脚本，请先点击右侧安装/更新');
      });
    }

    if ($('copyUserscriptSourceBtn')) {
      $('copyUserscriptSourceBtn').addEventListener('click', async () => {
        try {
          const resp = await fetch('./downloads/pixtag-companion.user.js');
          const code = await resp.text();
          await navigator.clipboard.writeText(code);
          $('copyUserscriptSourceBtn').textContent = '已复制油猴脚本 ✓';
          showToast('已一键复制油猴脚本完整代码至剪贴板');
          setTimeout(() => {
            $('copyUserscriptSourceBtn').textContent = '一键复制油猴脚本代码';
          }, 2200);
        } catch (err) {
          showToast('复制失败，请点击右侧下载脚本');
        }
      });
    }

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
        e.preventDefault();
        if (isOpen && acActiveIndex >= 0 && acItems[acActiveIndex]) {
          selectAutocompleteItem(acItems[acActiveIndex].tag_name);
        } else {
          hideAutocomplete();
          executeAnalysis();
        }
      }
    });
    $('tagSearchInput').addEventListener('input', () => {
      triggerAutocomplete($('tagSearchInput').value);
    });
    $('tagSearchInput').addEventListener('focus', () => {
      const val = $('tagSearchInput').value.trim();
      if (val) triggerAutocomplete(val);
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
    ['hideBookmarkTagCheck', 'excludeAiWorksCheck', 'hideAiTagCheck', 'hideMetaTagCheck', 'minCountInput', 'tableSortSelect'].forEach((id) => {
      $(id).addEventListener('change', recomputeAndRender);
    });
    $('tableFilterInput').addEventListener('input', () => renderTable(state.computedCoTags));
    $('clearAllSubFiltersBtn').addEventListener('click', () => {
      state.lockedSubTags.clear();
      showToast('已清空全部必含筛选');
      recomputeAndRender();
    });

    // Gallery Controls
    $('galleryTagFilterInput').addEventListener('input', renderGallery);
    $('galleryTypeFilterSelect').addEventListener('change', renderGallery);
    $('gallerySortSelect').addEventListener('change', renderGallery);

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
    $('viewerSauceNaoBtn').addEventListener('click', () => {
      const ill = state.viewer.illust;
      if (!ill) return;
      const u = ill.regularUrl || ill.thumbUrl;
      if (u) window.open(`https://saucenao.com/search.php?url=${encodeURIComponent(u)}`, '_blank');
    });

    // Topology Graph Events
    $('graphNodeLimitRange').addEventListener('input', () => renderNetworkGraph(false));
    ['graphShowAvatarCheck', 'graphShowJpCheck', 'graphShowBooruCheck', 'graphShowZhCheck'].forEach((id) => {
      if ($(id)) $(id).addEventListener('change', () => renderNetworkGraph(false));
    });
    if ($('applyCanvasSizeBtn')) {
      $('applyCanvasSizeBtn').addEventListener('click', () => {
        const wVal = Math.max(30, parseInt($('canvasWidthInput').value, 10) || 100);
        const wUnit = $('canvasWidthUnitSelect').value || '%';
        const hVal = Math.max(240, parseInt($('canvasHeightInput').value, 10) || 480);
        const frame = $('networkCanvasFrame');
        frame.style.width = wUnit === '%' ? `${Math.min(100, wVal)}%` : `${wVal}px`;
        frame.style.height = `${hVal}px`;
        renderNetworkGraph(false);
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
      renderNetworkGraph(false);
    });
    window.addEventListener('resize', () => {
      if (!$('networkView').classList.contains('hidden')) renderNetworkGraph(false);
    });

    const netCanvas = $('networkCanvas');
    netCanvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 0.9;
      state.graph.zoom = Math.max(0.45, Math.min(2.8, state.graph.zoom * factor));
      renderNetworkGraph(false);
    });
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
      renderNetworkGraph(false);
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

    // Custom Category Rules Save/Reset
    function populateRulesModal() {
      $('ruleCharTextarea').value = (state.userCategoryLists.character || []).join(', ');
      $('ruleAttrTextarea').value = (state.userCategoryLists.attribute_xp || []).join(', ');
      $('ruleIpTextarea').value = (state.userCategoryLists.series_ip || []).join(', ');
      $('ruleMetaTextarea').value = (state.userCategoryLists.meta_general || []).join(', ');
    }

    $('saveUserRulesBtn').addEventListener('click', () => {
      const splitTags = (str) =>
        String(str || '')
          .split(/[,，\n\r]+/)
          .map((s) => s.trim())
          .filter(Boolean);
      state.userCategoryLists = {
        character: splitTags($('ruleCharTextarea').value),
        attribute_xp: splitTags($('ruleAttrTextarea').value),
        series_ip: splitTags($('ruleIpTextarea').value),
        meta_general: splitTags($('ruleMetaTextarea').value)
      };
      localStorage.setItem('pixez_cat_lists', JSON.stringify(state.userCategoryLists));
      $('rulesModal').classList.add('hidden');
      showToast('已保存自定义分类词表并重算排行');
      recomputeAndRender();
    });

    $('resetUserRulesBtn').addEventListener('click', () => {
      state.userCategoryLists = { character: [], attribute_xp: [], series_ip: [], meta_general: [] };
      state.userCategoryOverrides = {};
      localStorage.removeItem('pixez_cat_lists');
      localStorage.removeItem('pixez_cat_overrides');
      populateRulesModal();
      showToast('已恢复默认分类规则');
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
      if (!state.bridgeDetected) {
        showToast('未检测到油猴 v4.0：纯网页无法拦截 pixiv:// 回调（跳到 post-redirect 会变白屏）。请先安装油猴脚本或使用 Android APK。', 5200);
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

    $('oauthLogoutBtn')?.addEventListener('click', performAuthLogout);
    $('headerQuickLogoutBtn')?.addEventListener('click', performAuthLogout);
    $('refreshAuthProfileBtn')?.addEventListener('click', async () => {
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
  }

  // Startup initialization
  applyVisualSettings();
  initOpticalScrollbar();
  saveBasket();
  initCustomSelects();
  applySourceUI();
  initQuickJumpRail();
  initEvents();
  renderRecentSearches();
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
    executeAnalysis(initialQuery);
  }
})();
