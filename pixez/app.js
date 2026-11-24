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

  const THEME_LABELS = {
    light: '明亮',
    paper: '纸张',
    eyecare: '护眼',
    green: '夜间 (绿磷光)',
    amber: '夜间 (橙磷光)',
    frost: '冷辉'
  };

  const state = {
    theme: localStorage.getItem('pixez_theme_v39') || 'paper',
    nightPhosphor: localStorage.getItem('pixez_phosphor_v39') || 'green',
    themeBarMode: localStorage.getItem('pixez_themebar_mode_v39') || 'top',
    curvature: localStorage.getItem('pixez_curvature_v39') !== 'false',
    pixelFont: localStorage.getItem('pixez_pixel_v39') === 'true',
    crtFx: localStorage.getItem('pixez_crt_v39') !== 'false',
    noiseFx: localStorage.getItem('pixez_noise_v39') !== 'false',
    lofiFx: localStorage.getItem('pixez_lofi_v39') !== 'false',
    cookie: localStorage.getItem('pixez_cookie') || '',
    authStatus: { loggedIn: false, user: null, mode: 'guest' },

    rawDataset: null,
    activeCategoryScope: 'all',
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

  const API_BASE = (() => {
    const h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') return '';
    if (h === 'hiiraginemu.github.io') return 'https://madeinmagius-site.pages.dev/api/pixiv';
    return '/api/pixiv';
  })();

  function apiUrl(p) {
    if (!API_BASE) return p;
    return API_BASE + p.replace(/^\/api/, '');
  }

  function apiFetch(p, init) {
    return fetch(apiUrl(p), init);
  }

  function proxyImg(url) {
    if (!url) return '';
    return apiUrl(`/api/pximg?url=${encodeURIComponent(url)}`);
  }

  function downloadImgUrl(url, filename) {
    if (!url) return '#';
    return apiUrl(`/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename || 'pixiv-artwork.jpg')}`);
  }

  // =========================================================================
  // 1. THEME & AUTHENTIC READER/CALL V14 OPTICS MANAGEMENT
  // =========================================================================
  function placeThemeBar() {
    const widget = $('themeSwitcher');
    const slot = $('themeBarTopSlot');
    if (!widget || !slot) return;
    if (state.themeBarMode === 'floating') {
      if (widget.parentElement !== document.body) {
        document.body.appendChild(widget);
      }
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
    const effectiveTheme = (state.theme === 'green' || state.theme === 'amber') ? state.nightPhosphor : state.theme;
    state.theme = effectiveTheme;

    root.setAttribute('data-theme', effectiveTheme);
    root.setAttribute('data-theme-bar-mode', state.themeBarMode);
    root.setAttribute('data-fx-curvature', state.curvature ? 'true' : 'false');
    root.setAttribute('data-pixel-font', state.pixelFont ? 'true' : 'false');
    root.setAttribute('data-crt-fx', state.crtFx ? 'true' : 'false');
    root.setAttribute('data-lofi-fx', (state.lofiFx && state.noiseFx) ? 'true' : (state.lofiFx ? 'true' : 'false'));

    placeThemeBar();

    document.querySelectorAll('#themeSwitcher [data-theme-choice]').forEach((btn) => {
      const choice = btn.dataset.themeChoice;
      const isNightBtn = choice === 'green' && (effectiveTheme === 'green' || effectiveTheme === 'amber');
      const isActive = isNightBtn || choice === effectiveTheme;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    if ($('fxCurrentThemeLabel')) {
      $('fxCurrentThemeLabel').textContent = THEME_LABELS[effectiveTheme] || '纸张';
    }

    document.querySelectorAll('[data-phosphor-choice]').forEach((btn) => {
      btn.setAttribute('aria-pressed', btn.dataset.phosphorChoice === state.nightPhosphor ? 'true' : 'false');
    });

    document.querySelectorAll('[data-themebar-mode]').forEach((btn) => {
      btn.setAttribute('aria-pressed', btn.dataset.themebarMode === state.themeBarMode ? 'true' : 'false');
    });

    if ($('toggleCurvatureCheck')) $('toggleCurvatureCheck').checked = state.curvature;
    if ($('togglePixelFontCheck')) $('togglePixelFontCheck').checked = state.pixelFont;
    if ($('toggleCrtFxCheck')) $('toggleCrtFxCheck').checked = state.crtFx;
    if ($('toggleNoiseFxCheck')) $('toggleNoiseFxCheck').checked = state.noiseFx;
    if ($('toggleLofiFxCheck')) $('toggleLofiFxCheck').checked = state.lofiFx;
  }

  function setTheme(themeName) {
    if (themeName === 'green' || themeName === 'amber') {
      if (themeName === 'amber') state.nightPhosphor = 'amber';
      state.theme = state.nightPhosphor;
      localStorage.setItem('pixez_phosphor_v39', state.nightPhosphor);
    } else {
      state.theme = themeName;
    }
    localStorage.setItem('pixez_theme_v39', state.theme);
    if (state.theme === 'paper' || state.theme === 'light' || state.theme === 'eyecare') {
      state.pixelFont = false;
      localStorage.setItem('pixez_pixel_v39', 'false');
    }
    applyVisualSettings();
    if (!$('networkView').classList.contains('hidden')) {
      renderNetworkGraph();
    }
  }

  function setPhosphor(phosphor) {
    state.nightPhosphor = phosphor === 'amber' ? 'amber' : 'green';
    localStorage.setItem('pixez_phosphor_v39', state.nightPhosphor);
    state.theme = state.nightPhosphor;
    localStorage.setItem('pixez_theme_v39', state.theme);
    if (state.nightPhosphor === 'amber') {
      state.pixelFont = true;
      localStorage.setItem('pixez_pixel_v39', 'true');
    }
    applyVisualSettings();
    if (!$('networkView').classList.contains('hidden')) {
      renderNetworkGraph();
    }
  }

  function setThemeBarMode(mode) {
    state.themeBarMode = mode === 'floating' ? 'floating' : 'top';
    localStorage.setItem('pixez_themebar_mode_v39', state.themeBarMode);
    applyVisualSettings();
  }

  function resetCurrentThemeDefaults() {
    state.curvature = true;
    state.crtFx = true;
    state.noiseFx = true;
    state.lofiFx = true;
    state.pixelFont = state.theme === 'amber';
    localStorage.setItem('pixez_curvature_v39', 'true');
    localStorage.setItem('pixez_crt_v39', 'true');
    localStorage.setItem('pixez_noise_v39', 'true');
    localStorage.setItem('pixez_lofi_v39', 'true');
    localStorage.setItem('pixez_pixel_v39', state.pixelFont ? 'true' : 'false');
    applyVisualSettings();
    showToast('已恢复当前主题默认画面与字体效果');
  }

  // =========================================================================
  // 2. PIXIV URL & TAG PARSER
  // =========================================================================
  function parseUserQueryInput(raw) {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return { tag: '', mode: null, sMode: null, type: null };

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
          return { tag: decodedTag, mode, sMode: null, type: null };
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

          return { tag: q || trimmed, mode, sMode, type: null };
        }
      } catch (_) {}
    }

    return { tag: trimmed, mode: null, sMode: null, type: null };
  }

  // =========================================================================
  // 3. SEMANTIC CATEGORY CLASSIFIER (Danbooru Ontology + User Rules + Heuristics)
  // =========================================================================
  const SERIES_SET = new Set([
    'ブルーアーカイブ', 'ブルアカ', 'BlueArchive', '原神', 'GenshinImpact', '崩壊:スターレイル', '崩壊スターレイル',
    'アークナイツ', '明日方舟', 'Fate/GrandOrder', 'FGO', 'アズールレーン', '碧蓝航线', '艦これ', '艦隊これくしょん',
    '東方Project', '東方', 'アイドルマスター', 'シャニマス', '学マス', '学園アイドルマスター', 'デレマス',
    'ウマ娘', 'ウマ娘プリティーダービー', 'ホロライブ', 'hololive', 'にじさんじ', '初音ミク', 'VOCALOID', 'プロセカ',
    '葬送のフリーレン', '魔法少女まどか☆マギカ', 'マギアレコード', 'まどマギ', 'マギレコ',
    'ラブライブ!', 'ラブライブ', 'ゼンレスゾーンゼロ', '绝区零', '鳴潮', '勝利の女神:NIKKE', 'NIKKE',
    'チェンソーマン', '呪術廻戦', '鬼滅の刃', 'ぼっち・ざ・ろっく!', 'リコリス・リコイル',
    'プリキュア', 'precure', '名探偵プリキュア!', '名探偵プリキュア', 'たんプリ', 'わんだふるぷりきゅあ!', 'ひろがるスカイ!プリキュア'
  ]);

  const ATTR_SET = new Set([
    '白タイツ', '黒タイツ', 'タイツ', 'ストッキング', 'ニーソ', 'ニーソックス', 'オーバーニー', 'ガーターベルト',
    '水着', 'ビキニ', 'スク水', '競泳水着', '制服', 'セーラー服', 'ブレザー', 'メイド', 'メイド服', 'バニーガール',
    'チャイナドレス', '体操服', 'ブルマ', '巫女', 'シスター', 'ナース', '私服', 'ドレス', 'ウェディングドレス',
    '着物', '浴衣', 'パーカー', '水手服', '眼鏡', 'メガネ', 'サングラス', '眼帯', 'ケモミミ', '猫耳', 'ネコミミ', '狐耳', 'ウサ耳',
    '角', '翼', '尻尾', 'ヘイロー', 'ツインテール', 'ポニーテール', 'ショートヘア', 'ロングヘア', 'ボブカット', '三つ編み',
    '白髪', '銀髪', '金髪', '黒髪', 'ピンク髪', '青髪', '赤髪', 'オッドアイ', '赤目', '青目', 'ジト目',
    '巨乳', '爆乳', '貧乳', 'ちっぱい', '微乳', 'ロリ', 'お姉さん', '少女', '美少女', '女の子', '男の子', '男の娘',
    '足裏', '素足', '裸足', '足指', '脚', '美脚', '太もも', 'ふともも', '魅惑のふともも', '絶対領域',
    'おっぱい', '魅惑の谷間', '谷間', 'お尻', '尻', '尻神様', '腋', 'へそ', 'お腹', '腹筋', '背中', 'うなじ',
    '百合', 'キス', 'ハグ', '手繋ぎ', '泣き顔', '笑顔', '赤面', '照れ', 'ドヤ顔', 'ハート目', '触手', '拘束', '催眠', '悪堕ち'
  ]);

  const META_SET = new Set([
    'R-18', 'R-18G', 'NSFW', 'オリジナル', '創作', '一次創作', '二次創作', '漫画', 'マンガ', '4コマ',
    'イラスト', '落書き', 'らくがき', 'ドット絵', 'デフォルメ', 'SD', 'ちびキャラ', 'Live2D', '3DCG',
    'うごイラ', 'GIF', '風景', '背景', '厚塗り', '線画', 'モノクロ', 'skeb', 'commission', '立ち絵'
  ]);

  const AI_SET = new Set(['AI生成', 'AIイラスト', 'AI-generated', 'AIart', 'AI作品', 'AI', 'NovelAI', 'StableDiffusion']);

  function classifyTagClient(tag, serverCategory = null) {
    const clean = String(tag || '').trim();
    if (!clean) return 'meta_general';

    if (state.userCategoryOverrides[clean]) return state.userCategoryOverrides[clean];
    for (const cat of CATEGORY_CYCLE) {
      if (Array.isArray(state.userCategoryLists[cat]) && state.userCategoryLists[cat].includes(clean)) {
        return cat;
      }
    }

    if (/^\d+users入り$/i.test(clean) || /users入り$/i.test(clean)) return 'bookmark_milestone';
    if (AI_SET.has(clean) || /^AI[生成イラスト]/i.test(clean)) return 'ai_meta';
    if (META_SET.has(clean)) return 'meta_general';

    const dbEntry = state.danbooruCache[clean] || (state.rawDataset?.danbooruMap && state.rawDataset.danbooruMap[clean]);
    if (dbEntry && dbEntry.category) return dbEntry.category;

    if (SERIES_SET.has(clean) || /プリキュア|アーカイブ|原神|東方|艦これ|ホロライブ|ウマ娘|FGO|スターレイル|アークナイツ|アズールレーン|アイドルマスター|ラブライブ/i.test(clean)) {
      return 'series_ip';
    }
    if (ATTR_SET.has(clean) || /(タイツ|ストッキング|ニーソ|水着|ビキニ|制服|メイド|バニー|ドレス|服|着|耳|髪|目|眼|乳|胸|尻|足|脚|もも|腋|腹|へそ|顔|涙|笑|娘|少女|ロリ|姉|百合|キス|メガネ|眼鏡|リボン|帽)$/.test(clean)) {
      return 'attribute_xp';
    }

    if (serverCategory && ['character', 'attribute_xp', 'series_ip', 'meta_general', 'bookmark_milestone', 'ai_meta'].includes(serverCategory)) {
      return serverCategory;
    }

    return 'character';
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

      const cat = classifyTagClient(item.tag);
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
    renderGallery();
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
    const totalMatches = ds.pixivTotal ?? ds.meta?.totalMatches ?? activeWorks.length;
    const pagesScanned = ds.pagesScanned ?? ds.meta?.pagesFetched ?? 1;

    const lockedArr = Array.from(state.lockedSubTags);
    const titleStr = lockedArr.length > 0 ? `${primaryTag} + ${lockedArr.join('+')}` : primaryTag;
    $('statPrimaryTag').textContent = titleStr;
    $('statTotalMatched').textContent = `(全站 ${Number(totalMatches).toLocaleString()})`;

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

    const aiWorksCount = activeWorks.filter((w) => w.isAi).length;
    const origCount = activeWorks.length - aiWorksCount;
    const origRate = activeWorks.length > 0 ? ((origCount / activeWorks.length) * 100).toFixed(1) : '100.0';
    $('statOriginalRate').textContent = `${origRate}% 手绘`;
    $('statAiBreakdown').textContent = `(AI ${aiWorksCount}作)`;

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

    tbody.innerHTML = filtered
      .slice(0, 250)
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
      .join('');

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
  // 6. ARTWORKS GALLERY & OPTICAL ISOLATED VIEWER
  // =========================================================================
  function createArtworkCardHtml(w, highlightTags = []) {
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

    return `
      <article class="artwork-card" data-illust-id="${escapeHtml(w.id)}">
        <div class="artwork-thumb-box clean-optical-media" data-open-viewer="${escapeHtml(w.id)}">
          <div class="artwork-badges">${badges.join('')}</div>
          <img class="clean-optical-media" src="${proxyImg(w.thumbUrl)}" alt="${escapeHtml(w.title)}" loading="lazy" />
        </div>
        <div class="artwork-meta">
          <div class="artwork-title" data-open-viewer="${escapeHtml(w.id)}" title="${escapeHtml(w.title)}">${escapeHtml(w.title || '无题')}</div>
          <div class="artwork-artist">${escapeHtml(w.userName || 'Pixiv Artist')} · ★${Number(w.bookmarkCount || 0).toLocaleString()}</div>
          <div class="artwork-tags-mini">${miniTags}</div>
          <div class="artwork-card-actions">
            <button class="t-btn t-btn--sm t-btn--primary" data-open-viewer="${escapeHtml(w.id)}" type="button">看高清原图</button>
            <a class="t-btn t-btn--sm" href="https://www.pixiv.net/artworks/${encodeURIComponent(w.id)}" target="_blank" rel="noopener">Pixiv ↗</a>
          </div>
        </div>
      </article>
    `;
  }

  function bindArtworkCardEvents(container) {
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

    list = [...list].sort((a, b) => {
      if (sortBy === 'bmk_desc') return (b.bookmarkCount || 0) - (a.bookmarkCount || 0);
      if (sortBy === 'page_desc') return (b.pageCount || 1) - (a.pageCount || 1);
      return String(b.id).localeCompare(String(a.id));
    });

    if (list.length === 0) {
      grid.innerHTML = `<div class="empty-placeholder">暂无匹配的作品样本</div>`;
      return;
    }

    const hiTags = [state.rawDataset?.primaryTag || '', ...Array.from(state.lockedSubTags)];
    grid.innerHTML = list.slice(0, 96).map((w) => createArtworkCardHtml(w, hiTags)).join('');
    bindArtworkCardEvents(grid);
  }

  // =========================================================================
  // 7. DEEP INSPECTOR MODAL
  // =========================================================================
  function openInspectorModal(tag) {
    const item = state.computedCoTags.find((r) => r.tag === tag);
    if (!item || !state.rawDataset) return;

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

    const matchingWorks = (state.filteredArtworks || []).filter((w) => (w.tags || []).includes(tag));
    $('modalArtworkCount').textContent = matchingWorks.length;

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

    const worksGrid = $('modalArtworksGrid');
    worksGrid.innerHTML = matchingWorks
      .slice(0, 24)
      .map((w) => createArtworkCardHtml(w, [state.rawDataset.primaryTag, tag]))
      .join('');
    bindArtworkCardEvents(worksGrid);

    modal.classList.remove('hidden');
  }

  // =========================================================================
  // 8. HD ARTWORK VIEWER & UGOIRA ANIMATION SYNTHESIZER
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
      const resp = await apiFetch(`/api/illust/detail?id=${encodeURIComponent(illustId)}`, {
        headers: state.cookie ? { 'X-Pixiv-Cookie': state.cookie } : {}
      });
      const rawJson = await resp.json();
      if (!resp.ok || rawJson.error) throw new Error(rawJson.message || rawJson.error || '加载作品详情失败');
      const json = rawJson.data || rawJson;

      state.viewer.illust = json;
      state.viewer.pageIndex = 0;
      state.viewer.useOriginal = false;

      $('viewerTitle').textContent = json.title || `Artwork #${json.id}`;
      $('viewerMetaSubtitle').textContent = `ID: ${json.id} // ARTIST: ${json.userName || 'Unknown'} // ${json.width}×${json.height}`;
      $('viewerOpenPixivBtn').href = `https://www.pixiv.net/artworks/${encodeURIComponent(json.id)}`;

      $('viewerStatsBox').innerHTML = `
        <div class="ins-stat-box"><span class="ins-stat-label">收藏数</span><strong class="ins-stat-val">★ ${Number(json.totalBookmarks ?? json.bookmarkCount ?? 0).toLocaleString()}</strong></div>
        <div class="ins-stat-box"><span class="ins-stat-label">浏览量</span><strong class="ins-stat-val">${Number(json.totalView ?? json.viewCount ?? 0).toLocaleString()}</strong></div>
        <div class="ins-stat-box"><span class="ins-stat-label">页数 / 类型</span><strong class="ins-stat-val">${json.pageCount || 1}P / ${json.illustType === 2 ? '动图' : '插画'}</strong></div>
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

      if (json.illustType === 2) {
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
    mainImg.onerror = () => loading.classList.add('hidden');
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
  // 9. STREAMING FULL-HISTORY SAMPLING ENGINE
  // =========================================================================
  async function executeAnalysis(overrideQuery) {
    if (state.activeStreamAbort) {
      state.activeStreamAbort.abort();
      state.activeStreamAbort = null;
    }

    const rawInput = overrideQuery !== undefined ? overrideQuery : $('tagSearchInput').value;
    const parsed = parseUserQueryInput(rawInput);
    if (!parsed.tag) {
      showToast('请输入 Pixiv 标签或粘贴搜索链接');
      return;
    }

    $('tagSearchInput').value = parsed.tag;
    if (parsed.mode) $('modeSelect').value = parsed.mode;
    if (parsed.sMode) $('sModeSelect').value = parsed.sMode;
    syncCustomSelects();
    $('autocompleteDropdown').classList.add('hidden');

    const pages = $('pagesSelect').value;
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

    progressWrap.classList.remove('hidden');
    stopBtn.classList.remove('hidden');
    analyzeBtn.disabled = true;
    progressText.textContent = `正在连接 Pixiv 采样 [${parsed.tag}]...`;
    progressPct.textContent = '5%';
    progressFill.style.width = '5%';

    const abortCtrl = new AbortController();
    state.activeStreamAbort = abortCtrl;

    const qs = new URLSearchParams({
      tag: parsed.tag,
      pages,
      mode,
      s_mode: sMode,
      type,
      includePopular: includePopular ? '1' : '0'
    });

    try {
      const resp = await apiFetch(`/api/analyze-stream?${qs.toString()}`, {
        headers: state.cookie ? { 'X-Pixiv-Cookie': state.cookie } : {},
        signal: abortCtrl.signal
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

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
              const pct = payload.percent || (payload.totalPages ? Math.min(95, Math.round((payload.currentPage / payload.totalPages) * 95)) : 45);
              progressText.textContent = payload.message || `正在采样第 ${payload.currentPage || payload.page || 1} 页...`;
              progressPct.textContent = `${pct}%`;
              progressFill.style.width = `${pct}%`;
            } else if (eventType === 'snapshot' || eventType === 'complete') {
              const ds = payload.data || payload;
              if (ds.danbooruMap) {
                Object.assign(state.danbooruCache, ds.danbooruMap);
              }
              ds.primaryTag = ds.primaryTag || ds.meta?.queryTag || parsed.tag;
              ds.pagesScanned = ds.pagesScanned || ds.meta?.pagesFetched || 1;
              ds.pixivTotal = ds.pixivTotal ?? ds.meta?.totalMatches ?? (ds.artworks || []).length;
              ds.engine = ds.engine || ds.meta?.engine || 'WEB-AJAX';
              state.rawDataset = ds;
              $('engineSourceIndicator').textContent = `${ds.engine} · ${ds.pagesScanned}P`;
              recomputeAndRender();

              if (eventType === 'complete') {
                progressFill.style.width = '100%';
                progressPct.textContent = '100%';
                progressText.textContent = `完成 [${ds.primaryTag}] 采样 (${(ds.artworks || []).length} 件作品)`;
              }
            } else if (eventType === 'error') {
              showToast(`采样提示: ${payload.message || '请求异常'}`);
            }
          } catch (_) {}
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        showToast('已停止翻页并锁定当前已采集样本');
      } else {
        showToast(`采样中断: ${err.message}`);
      }
    } finally {
      state.activeStreamAbort = null;
      analyzeBtn.disabled = false;
      stopBtn.classList.add('hidden');
      setTimeout(() => progressWrap.classList.add('hidden'), 1200);
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
  // 10B. IN-DOM CUSTOM SELECT DROPDOWNS & RIGHT QUICK JUMP RAIL
  // =========================================================================
  const customSelectRegistry = [];

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
      wrap.appendChild(menu);

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
            menu.classList.add('hidden');
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          });
        });
      }

      buildOptions();
      customSelectRegistry.push({ sel, sync: buildOptions });

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasHidden = menu.classList.contains('hidden');
        document.querySelectorAll('.t-cselect__menu').forEach((m) => m.classList.add('hidden'));
        if (wasHidden) {
          buildOptions();
          menu.classList.remove('hidden');
        }
      });
    });

    document.addEventListener('click', () => {
      document.querySelectorAll('.t-cselect__menu').forEach((m) => m.classList.add('hidden'));
    });
  }

  function initQuickJumpRail() {
    const rail = $('quickJumpRail');
    const grip = $('quickRailGrip');
    const collapseBtn = $('quickRailCollapseBtn');
    if (!rail || !grip || !collapseBtn) return;

    collapseBtn.addEventListener('click', () => {
      const collapsed = rail.classList.toggle('is-collapsed');
      collapseBtn.textContent = collapsed ? '>' : '<';
    });

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let origLeft = 0;
    let origTop = 0;

    grip.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const rect = rail.getBoundingClientRect();
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      origLeft = rect.left;
      origTop = rect.top;
      rail.classList.add('is-positioned');
      rail.style.left = `${origLeft}px`;
      rail.style.top = `${origTop}px`;
      grip.setPointerCapture(e.pointerId);
    });

    grip.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const nx = Math.max(4, Math.min(window.innerWidth - rail.offsetWidth - 4, origLeft + (e.clientX - startX)));
      const ny = Math.max(4, Math.min(window.innerHeight - rail.offsetHeight - 4, origTop + (e.clientY - startY)));
      rail.style.left = `${nx}px`;
      rail.style.top = `${ny}px`;
    });

    grip.addEventListener('pointerup', () => {
      dragging = false;
    });

    rail.querySelectorAll('[data-rail-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.railAction;
        const switchView = (targetId) => {
          const tab = document.querySelector(`.subsystem-tabs .sub-tab[data-view-target="${targetId}"]`);
          if (tab) tab.click();
        };
        if (act === 'top') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (act === 'query') {
          $('queryConsolePanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          $('tagSearchInput')?.focus();
        } else if (act === 'filter') {
          $('filterSwitchesRow')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (act === 'table') {
          switchView('cooccurrenceView');
          $('rankingTablePanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (act === 'search') {
          executeAnalysis();
        } else if (act === 'clear') {
          state.lockedSubTags.clear();
          recomputeAndRender();
          showToast('已清空叠加必含筛选');
        } else if (act === 'network') {
          switchView('networkView');
          $('networkView')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (act === 'gallery') {
          switchView('artworksView');
          $('artworksView')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (act === 'bottom') {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
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
    $('openBasketInPixivBtn').href = `https://www.pixiv.net/search?q=${encodeURIComponent(spaceJoined)}&s_mode=tag&type=artwork`;

    const booruPrompts = arr.map((t) => {
      const db = state.danbooruCache[t] || (state.rawDataset?.danbooruMap && state.rawDataset.danbooruMap[t]);
      if (db && db.danbooruTag) return db.danbooruTag.replace(/_/g, ' ');
      return t;
    });
    $('basketDanbooruOutput').value = booruPrompts.join(', ');
  }

  // =========================================================================
  // 12. AUTHENTICATION & CHROME TAMPERMONKEY SESSION BRIDGE
  // =========================================================================
  async function checkAuthStatus() {
    try {
      const resp = await apiFetch('/api/auth/status', {
        headers: state.cookie ? { 'X-Pixiv-Cookie': state.cookie } : {}
      });
      const data = await resp.json();
      state.authStatus = data;
      updateAuthUI();
    } catch (_) {}
  }

  function updateAuthUI() {
    const d = state.authStatus;
    const isLogged = Boolean(d.loggedIn || state.cookie);
    const userName = d.user?.name || d.user?.account || (state.cookie ? 'Cookie 会话' : '');

    if (isLogged) {
      $('headerAuthLabel').textContent = `已登录: ${userName}`;
      $('authCurrentStatusBox').textContent = `当前状态: 已连接 Pixiv 账号 (${userName}) — 全量采样与原图下载已就绪。`;
      $('oauthLogoutBtn').classList.remove('hidden');
    } else {
      $('headerAuthLabel').textContent = '账号';
      $('authCurrentStatusBox').textContent = '当前状态: 免登录直连模式 — 无需登录即可直接进行全量页面采样、分类排行与高清看图下载。';
      $('oauthLogoutBtn').classList.add('hidden');
    }
  }

  window.addEventListener('message', async (ev) => {
    if (!ev.data || ev.data.type !== 'PIXEZ_USERSCRIPT_BRIDGE_READY') return;
    if (ev.data.cookie && ev.data.cookie !== state.cookie) {
      state.cookie = ev.data.cookie;
      localStorage.setItem('pixez_cookie', state.cookie);
      try {
        await apiFetch('/api/auth/verify-cookie', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cookie: state.cookie })
        });
      } catch (_) {}
      await checkAuthStatus();
      showToast('已通过 v3.0 油猴脚本自动同步 Chrome Pixiv 登录态');
    }
  });

  // =========================================================================
  // 13. EVENT BINDINGS & INITIALIZATION
  // =========================================================================
  function bindDraggableWidget(widgetEl, gripEl, canDragFn) {
    if (!widgetEl || !gripEl) return;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let origLeft = 0;
    let origTop = 0;

    gripEl.addEventListener('pointerdown', (e) => {
      if (canDragFn && !canDragFn()) return;
      if (e.target && e.target.closest('button') && e.target.closest('button') !== gripEl) return;
      e.preventDefault();
      const rect = widgetEl.getBoundingClientRect();
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      origLeft = rect.left;
      origTop = rect.top;
      widgetEl.classList.add('is-positioned');
      widgetEl.style.left = `${origLeft}px`;
      widgetEl.style.top = `${origTop}px`;
      gripEl.setPointerCapture?.(e.pointerId);
    });

    gripEl.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const nx = Math.max(4, Math.min(window.innerWidth - widgetEl.offsetWidth - 4, origLeft + (e.clientX - startX)));
      const ny = Math.max(4, Math.min(window.innerHeight - widgetEl.offsetHeight - 4, origTop + (e.clientY - startY)));
      widgetEl.style.left = `${nx}px`;
      widgetEl.style.top = `${ny}px`;
    });

    gripEl.addEventListener('pointerup', () => {
      dragging = false;
    });

    gripEl.addEventListener('dblclick', () => {
      widgetEl.classList.remove('is-positioned');
      ['left', 'top', 'right', 'bottom', 'transform'].forEach((p) => widgetEl.style.removeProperty(p));
    });
  }

  function initEvents() {
    // Theme Switcher & Display Settings Window (call-theme-widget-v7 + call-fx-window-v7)
    document.querySelectorAll('#themeSwitcher [data-theme-choice]').forEach((btn) => {
      btn.addEventListener('click', () => setTheme(btn.dataset.themeChoice));
    });

    document.querySelectorAll('[data-phosphor-choice]').forEach((btn) => {
      btn.addEventListener('click', () => setPhosphor(btn.dataset.phosphorChoice));
    });

    document.querySelectorAll('[data-themebar-mode]').forEach((btn) => {
      btn.addEventListener('click', () => setThemeBarMode(btn.dataset.themebarMode));
    });

    if ($('toggleCurvatureCheck')) {
      $('toggleCurvatureCheck').addEventListener('change', (e) => {
        state.curvature = e.target.checked;
        localStorage.setItem('pixez_curvature_v39', state.curvature ? 'true' : 'false');
        applyVisualSettings();
      });
    }
    if ($('togglePixelFontCheck')) {
      $('togglePixelFontCheck').addEventListener('change', (e) => {
        state.pixelFont = e.target.checked;
        localStorage.setItem('pixez_pixel_v39', state.pixelFont ? 'true' : 'false');
        applyVisualSettings();
      });
    }
    if ($('toggleCrtFxCheck')) {
      $('toggleCrtFxCheck').addEventListener('change', (e) => {
        state.crtFx = e.target.checked;
        localStorage.setItem('pixez_crt_v39', state.crtFx ? 'true' : 'false');
        applyVisualSettings();
      });
    }
    if ($('toggleNoiseFxCheck')) {
      $('toggleNoiseFxCheck').addEventListener('change', (e) => {
        state.noiseFx = e.target.checked;
        localStorage.setItem('pixez_noise_v39', state.noiseFx ? 'true' : 'false');
        applyVisualSettings();
      });
    }
    if ($('toggleLofiFxCheck')) {
      $('toggleLofiFxCheck').addEventListener('change', (e) => {
        state.lofiFx = e.target.checked;
        localStorage.setItem('pixez_lofi_v39', state.lofiFx ? 'true' : 'false');
        applyVisualSettings();
      });
    }
    if ($('resetThemeDefaultsBtn')) {
      $('resetThemeDefaultsBtn').addEventListener('click', resetCurrentThemeDefaults);
    }
    if ($('doneStyleConfigBtn')) {
      $('doneStyleConfigBtn').addEventListener('click', () => {
        $('styleConfigModal').classList.add('hidden');
        $('openStyleConfigBtn')?.setAttribute('aria-expanded', 'false');
      });
    }

    bindDraggableWidget($('themeSwitcher'), $('themeWidgetGrip'), () => state.themeBarMode === 'floating');
    bindDraggableWidget($('styleConfigModal'), $('fxWindowTitlebar'), () => true);

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

    // Subsystem View Tabs
    document.querySelectorAll('.subsystem-tabs .sub-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.subsystem-tabs .sub-tab').forEach((b) => b.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.viewTarget;
        ['cooccurrenceView', 'artworksView', 'networkView'].forEach((id) => {
          $(id).classList.toggle('hidden', id !== target);
        });
        if (target === 'networkView') renderNetworkGraph();
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

    // Query Console
    $('analyzeBtn').addEventListener('click', () => executeAnalysis());
    $('stopStreamBtn').addEventListener('click', () => {
      if (state.activeStreamAbort) state.activeStreamAbort.abort();
    });
    $('tagSearchInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') executeAnalysis();
    });
    $('clearInputBtn').addEventListener('click', () => {
      $('tagSearchInput').value = '';
      $('tagSearchInput').focus();
    });

    // Autocomplete
    let acTimer = null;
    $('tagSearchInput').addEventListener('input', () => {
      clearTimeout(acTimer);
      const q = $('tagSearchInput').value.trim();
      const dd = $('autocompleteDropdown');
      if (!q || q.length < 2 || q.startsWith('http')) {
        dd.classList.add('hidden');
        return;
      }
      acTimer = setTimeout(async () => {
        try {
          const r = await apiFetch(`/api/autocomplete?keyword=${encodeURIComponent(q)}`);
          const d = await r.json();
          const list = d.candidates || [];
          if (!list.length) {
            dd.classList.add('hidden');
            return;
          }
          dd.innerHTML = list
            .slice(0, 8)
            .map(
              (c) => `
              <div class="ac-item" data-ac="${escapeHtml(c.tag_name)}">
                <span><strong>${escapeHtml(c.tag_name)}</strong> ${c.tag_translation ? `<small style="color:var(--t-muted)">(${escapeHtml(c.tag_translation)})</small>` : ''}</span>
              </div>
            `
            )
            .join('');
          dd.classList.remove('hidden');
          dd.querySelectorAll('[data-ac]').forEach((item) => {
            item.addEventListener('click', () => {
              $('tagSearchInput').value = item.dataset.ac;
              dd.classList.add('hidden');
              executeAnalysis(item.dataset.ac);
            });
          });
        } catch (_) {}
      }, 220);
    });

    document.querySelectorAll('.tag-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        $('tagSearchInput').value = btn.dataset.tag;
        state.lockedSubTags.clear();
        executeAnalysis(btn.dataset.tag);
      });
    });

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
        await checkAuthStatus();
        showToast(d.message || 'Cookie 已保存');
      } catch (_) {
        updateAuthUI();
        showToast('Cookie 已保存在本地');
      }
    });

    $('clearCookieBtn').addEventListener('click', async () => {
      state.cookie = '';
      localStorage.removeItem('pixez_cookie');
      $('cookieInput').value = '';
      await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      await checkAuthStatus();
      showToast('已清除本地 Cookie');
    });

    $('startPixivOAuthBtn').addEventListener('click', async () => {
      try {
        const r = await apiFetch('/api/oauth/start');
        const d = await r.json();
        if (d.codeVerifier) state.codeVerifier = d.codeVerifier;
        if (d.loginUrl) window.open(d.loginUrl, '_blank');
      } catch (e) {
        showToast('无法生成 OAuth 链接');
      }
    });

    $('submitOAuthCodeBtn').addEventListener('click', async () => {
      const codeInput = $('oauthCodeInput').value.trim();
      if (!codeInput) {
        showToast('请粘贴 F12 Console 中的 pixiv://account/login?code=... 文本');
        return;
      }
      try {
        const r = await apiFetch('/api/oauth/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: codeInput, codeVerifier: state.codeVerifier || '' })
        });
        const d = await r.json();
        if (!r.ok || d.error) throw new Error(d.message || d.error || '登录失败');
        await checkAuthStatus();
        $('authModal').classList.add('hidden');
        showToast('Pixiv OAuth 登录成功');
      } catch (err) {
        showToast(`错误: ${err.message}`);
      }
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
        await checkAuthStatus();
        $('authModal').classList.add('hidden');
        showToast('Refresh Token 登录成功');
      } catch (err) {
        showToast(`错误: ${err.message}`);
      }
    });

    $('oauthLogoutBtn').addEventListener('click', async () => {
      state.cookie = '';
      localStorage.removeItem('pixez_cookie');
      await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      await checkAuthStatus();
      showToast('已退出登录');
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
  saveBasket();
  initCustomSelects();
  initQuickJumpRail();
  initEvents();
  checkAuthStatus();

  const urlParams = new URLSearchParams(window.location.search);
  const autoCode = urlParams.get('pixiv_code');
  if (autoCode) {
    $('oauthCodeInput').value = autoCode;
    $('submitOAuthCodeBtn').click();
    window.history.replaceState({}, document.title, '/');
  }

  const initialQuery = urlParams.get('q') || urlParams.get('tag') || '森亜るるか';
  $('tagSearchInput').value = initialQuery;
  executeAnalysis(initialQuery);
})();
