// ==UserScript==
// @name         MadeInMagius PixEz Pulse — Pixiv 全量标签共现分析 & 全自动授权登录桥接
// @namespace    https://madeinmagius-site.pages.dev/
// @version      4.1.0
// @description  在 Pixiv (/tags/ 与 /search?q= 全格式链接) 嵌入纸张档案风全量共现分析抽屉；自动同步 Chrome Pixiv 登录态、直连 Pixiv 全量分段接口 (绕过云端403、含完整R-18/AI突破3万+上限) 并全自动接管 OAuth 授权回调回传原页面。
// @author       MadeInMagius
// @match        https://www.pixiv.net/*
// @match        https://accounts.pixiv.net/*
// @match        https://app-api.pixiv.net/*
// @match        http://localhost:3456/*
// @match        http://127.0.0.1:3456/*
// @match        https://madeinmagius-site.pages.dev/*
// @match        https://hiiraginemu.github.io/*
// @grant        GM_xmlhttpRequest
// @grant        GM_cookie
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @connect      www.pixiv.net
// @connect      accounts.pixiv.net
// @connect      app-api.pixiv.net
// @connect      oauth.secure.pixiv.net
// @connect      danbooru.donmai.us
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const VERSION = '4.1.0';
  const DEFAULT_WEB_ORIGIN = 'http://localhost:3456';

  function isAppHost(host) {
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === 'madeinmagius-site.pages.dev' ||
      host === 'hiiraginemu.github.io'
    );
  }

  function extractCodeFromText(text) {
    if (!text) return '';
    const m = String(text).match(/pixiv:\/\/account\/login\?[^"'<>\s]*code=([A-Za-z0-9_-]+)/i)
      || String(text).match(/[?&]code=([A-Za-z0-9_-]{12,})/);
    return m ? m[1] : '';
  }

  function deliverOAuthCode(code) {
    if (!code) return;
    const payload = { code, ts: Date.now(), version: VERSION };
    try {
      if (typeof GM_setValue === 'function') {
        GM_setValue('pixez_oauth_code_v4', JSON.stringify(payload));
      }
    } catch (_) {}
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'PIXEZ_OAUTH_CODE', code, source: 'userscript_auto' }, '*');
      }
    } catch (_) {}
  }

  function deliverCookieSession(cookieVal, userName = '') {
    if (!cookieVal) return;
    const normalized = cookieVal.includes('PHPSESSID=') ? cookieVal : `PHPSESSID=${cookieVal}`;
    const payload = { cookie: normalized, userName: userName || '', ts: Date.now(), version: VERSION };
    try {
      if (typeof GM_setValue === 'function') {
        GM_setValue('pixez_cookie_session_v4', JSON.stringify(payload));
      }
    } catch (_) {}
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'PIXEZ_USERSCRIPT_BRIDGE_READY', cookie: normalized, userName, source: 'userscript_auto' }, '*');
      }
    } catch (_) {}
  }

  function readChromePixivCookie(cb) {
    if (typeof GM_cookie !== 'undefined' && GM_cookie.list) {
      try {
        GM_cookie.list({ url: 'https://www.pixiv.net' }, function (cookies, error) {
          if (!error && Array.isArray(cookies)) {
            const phpSess = cookies.find((c) => c.name === 'PHPSESSID');
            if (phpSess && phpSess.value) {
              cb(`PHPSESSID=${phpSess.value}`);
              return;
            }
          }
          cb('');
        });
        return;
      } catch (_) {}
    }
    cb('');
  }

  function showAutoAuthOverlay(title, desc, done = false, returnUrl = '') {
    const render = () => {
      let box = document.getElementById('pxp-auto-auth-overlay');
      if (!box) {
        box = document.createElement('div');
        box.id = 'pxp-auto-auth-overlay';
        box.style.cssText = 'position:fixed;inset:0;background:#f3eacb;color:#2c2318;font-family:"PingFang SC","Microsoft YaHei UI",sans-serif;display:flex;align-items:center;justify-content:center;z-index:2147483647;padding:24px;';
        (document.body || document.documentElement).appendChild(box);
      }
      box.innerHTML = `
        <div style="max-width:460px;width:100%;background:#fff7de;border:2px solid #6e5a3b;padding:20px 22px;box-shadow:0 8px 28px rgba(55,42,24,0.22);">
          <div style="font-size:11px;font-family:Consolas,monospace;color:#755f3e;font-weight:800;margin-bottom:6px;">MADE IN MAGIUS // PIXIV AUTO AUTH v${VERSION}</div>
          <h2 style="margin:0 0 8px 0;font-size:17px;color:#18120a;">${title}</h2>
          <p style="margin:0 0 14px 0;font-size:13px;line-height:1.6;color:#4f402b;">${desc}</p>
          ${done && returnUrl ? `<a href="${returnUrl}" style="display:inline-block;background:#755f3e;color:#fff7df;text-decoration:none;padding:7px 14px;font-weight:800;font-size:12.5px;border:1px solid #4f402b;">立即返回 PixEz Pulse 终端</a>` : ''}
        </div>
      `;
    };
    if (document.body) render();
    else window.addEventListener('DOMContentLoaded', render, { once: true });
  }

  // =========================================================================
  // 1. 全自动 OAuth 回调捕获 (accounts.pixiv.net/post-redirect & app-api.pixiv.net)
  //    在 document-start 阶段直接接管，禁止跳转进空白页，自动回传 code 给原页面并关闭窗口！
  // =========================================================================
  const href = window.location.href;
  const directCode = extractCodeFromText(href);
  if (directCode && (href.startsWith('pixiv://') || window.location.hostname === 'app-api.pixiv.net' || href.includes('via=login'))) {
    deliverOAuthCode(directCode);
    const backOrigin = (typeof GM_getValue === 'function' && GM_getValue('pixez_last_app_origin_v4', '')) || DEFAULT_WEB_ORIGIN;
    showAutoAuthOverlay('Pixiv 授权成功', '已将登录授权自动回传至原终端页面，本窗口即将自动关闭…', true, `${backOrigin}/?pixiv_code=${encodeURIComponent(directCode)}`);
    setTimeout(() => {
      window.close();
      if (!window.closed) window.location.replace(`${backOrigin}/?pixiv_code=${encodeURIComponent(directCode)}`);
    }, 450);
    return;
  }

  if (
    (window.location.hostname === 'accounts.pixiv.net' && window.location.pathname.startsWith('/post-redirect')) ||
    (window.location.hostname === 'app-api.pixiv.net' && window.location.pathname.startsWith('/web/v1/'))
  ) {
    const backOrigin = (typeof GM_getValue === 'function' && GM_getValue('pixez_last_app_origin_v4', '')) || DEFAULT_WEB_ORIGIN;
    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get('return_to') || window.location.href;

    // 阻止原生页面继续跳往 Chrome 无法打开的 pixiv:// 协议导致空白页
    try { window.stop(); } catch (_) {}
    showAutoAuthOverlay('正在自动完成 Pixiv 授权…', '正在将登录凭据自动回传给原终端页面，无需任何手动操作。');

    // 并行策略 A: 同步当前已登录的 Chrome PHPSESSID 会话
    readChromePixivCookie((cookieStr) => {
      if (cookieStr) deliverCookieSession(cookieStr);
    });

    // 并行策略 B: 使用 GM_xmlhttpRequest 静默追踪 return_to，直接从响应头/finalUrl 抓取 pixiv://account/login?code=...
    if (typeof GM_xmlhttpRequest === 'function' && returnTo && returnTo.startsWith('http')) {
      GM_xmlhttpRequest({
        method: 'GET',
        url: returnTo,
        headers: { Referer: 'https://accounts.pixiv.net/' },
        anonymous: false,
        redirect: 'manual',
        onload: (res) => {
          const locHeader = (res.responseHeaders || '').match(/^location:\s*(.+)$/im);
          const loc = locHeader ? locHeader[1].trim() : '';
          const captured = extractCodeFromText(loc) || extractCodeFromText(res.finalUrl) || extractCodeFromText(res.responseText);
          if (captured) {
            deliverOAuthCode(captured);
            showAutoAuthOverlay('Pixiv 自动授权已完成', '已自动回传 OAuth 授权并同步登录状态，正在关闭本页…', true, `${backOrigin}/?pixiv_code=${encodeURIComponent(captured)}`);
            setTimeout(() => {
              window.close();
              if (!window.closed) window.location.replace(`${backOrigin}/?pixiv_code=${encodeURIComponent(captured)}`);
            }, 450);
          } else {
            // 若未能抓到 code（例如已通过 cookie 完成登录），直接回传 cookie 并返回
            readChromePixivCookie((cookieStr) => {
              if (cookieStr) deliverCookieSession(cookieStr);
              showAutoAuthOverlay('Pixiv 登录态已同步', '已将当前 Chrome Pixiv 登录状态同步回原页面，正在返回…', true, backOrigin);
              setTimeout(() => {
                window.close();
                if (!window.closed) window.location.replace(backOrigin);
              }, 600);
            });
          }
        },
        onerror: () => {
          readChromePixivCookie((cookieStr) => {
            if (cookieStr) deliverCookieSession(cookieStr);
            showAutoAuthOverlay('Pixiv 登录态已同步', '已将当前 Chrome 会话同步回原页面，正在返回…', true, backOrigin);
            setTimeout(() => {
              window.close();
              if (!window.closed) window.location.replace(backOrigin);
            }, 600);
          });
        }
      });
    }
    return;
  }

  // =========================================================================
  // 2. 在终端页面 (localhost:3456 / madeinmagius-site.pages.dev / hiiraginemu.github.io)
  //    自动广播桥接就绪、自动同步 Chrome 会话、并实时接收跨标签页 OAuth 授权码！
  // =========================================================================
  if (isAppHost(window.location.hostname)) {
    try {
      if (typeof GM_setValue === 'function') {
        const appUrl = window.location.origin + (window.location.pathname.includes('/pixez') ? '/pixez' : '');
        GM_setValue('pixez_last_app_origin_v4', appUrl);
      }
    } catch (_) {}

    function announceAndSync() {
      window.postMessage({ type: 'PIXEZ_USERSCRIPT_ALIVE', version: VERSION, canFetch: typeof GM_xmlhttpRequest === 'function' }, '*');
      // 1) 优先直接读取 Chrome 当前 pixiv.net PHPSESSID
      readChromePixivCookie((cookieStr) => {
        if (cookieStr) {
          let cachedUserName = '';
          try {
            const saved = JSON.parse((typeof GM_getValue === 'function' && GM_getValue('pixez_cookie_session_v4', '')) || '{}');
            cachedUserName = saved.userName || '';
          } catch (_) {}
          window.postMessage({
            type: 'PIXEZ_USERSCRIPT_BRIDGE_READY',
            cookie: cookieStr,
            userName: cachedUserName,
            source: 'GM_cookie'
          }, '*');
        } else {
          // 2) 回退到缓存的跨站会话
          try {
            const saved = JSON.parse((typeof GM_getValue === 'function' && GM_getValue('pixez_cookie_session_v4', '')) || '{}');
            if (saved.cookie) {
              window.postMessage({
                type: 'PIXEZ_USERSCRIPT_BRIDGE_READY',
                cookie: saved.cookie,
                userName: saved.userName || '',
                source: 'GM_storage'
              }, '*');
            }
          } catch (_) {}
        }
      });
    }

    // 实时监听其他标签页（Pixiv 登录页）写入的 OAuth Code 或 Cookie 会话
    if (typeof GM_addValueChangeListener === 'function') {
      GM_addValueChangeListener('pixez_oauth_code_v4', (_name, _oldVal, newVal) => {
        try {
          const parsed = JSON.parse(newVal || '{}');
          if (parsed.code && Date.now() - (parsed.ts || 0) < 60000) {
            window.postMessage({ type: 'PIXEZ_OAUTH_CODE', code: parsed.code, source: 'GM_listener' }, '*');
          }
        } catch (_) {}
      });
      GM_addValueChangeListener('pixez_cookie_session_v4', (_name, _oldVal, newVal) => {
        try {
          const parsed = JSON.parse(newVal || '{}');
          if (parsed.cookie) {
            window.postMessage({
              type: 'PIXEZ_USERSCRIPT_BRIDGE_READY',
              cookie: parsed.cookie,
              userName: parsed.userName || '',
              source: 'GM_listener'
            }, '*');
          }
        } catch (_) {}
      });
    }

    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', announceAndSync, { once: true });
    } else {
      announceAndSync();
    }
    setTimeout(announceAndSync, 600);

    window.addEventListener('message', (ev) => {
      if (!ev.data) return;
      if (ev.data.type === 'PIXEZ_REQUEST_CHROME_BRIDGE') {
        announceAndSync();
      } else if (ev.data.type === 'PIXEZ_BRIDGE_FETCH_REQ' && ev.data.reqId && typeof ev.data.url === 'string') {
        const reqId = ev.data.reqId;
        const targetUrl = ev.data.url;
        const allowed = /^https:\/\/(www\.pixiv\.net|app-api\.pixiv\.net|oauth\.secure\.pixiv\.net)\//i.test(targetUrl);
        if (!allowed || typeof GM_xmlhttpRequest !== 'function') {
          window.postMessage({ type: 'PIXEZ_BRIDGE_FETCH_RES', reqId, ok: false, status: 403, error: 'Host not allowed' }, '*');
          return;
        }
        GM_xmlhttpRequest({
          method: ev.data.method || 'GET',
          url: targetUrl,
          headers: ev.data.headers || { Referer: 'https://www.pixiv.net/', Accept: 'application/json' },
          data: ev.data.body || undefined,
          anonymous: Boolean(ev.data.anonymous),
          timeout: Number(ev.data.timeout || 15000),
          onload: (res) => {
            window.postMessage({
              type: 'PIXEZ_BRIDGE_FETCH_RES',
              reqId,
              ok: res.status >= 200 && res.status < 300,
              status: res.status,
              text: res.responseText || ''
            }, '*');
          },
          onerror: () => {
            window.postMessage({ type: 'PIXEZ_BRIDGE_FETCH_RES', reqId, ok: false, status: 0, error: 'Network error' }, '*');
          },
          ontimeout: () => {
            window.postMessage({ type: 'PIXEZ_BRIDGE_FETCH_RES', reqId, ok: false, status: 0, error: 'Timeout' }, '*');
          }
        });
      }
    });
    return;
  }

  // 在 pixiv.net 正常浏览时，也自动把当前登录的昵称与会话同步给 GM 存储（供终端自动登录）
  if (window.location.hostname === 'www.pixiv.net') {
    window.addEventListener('DOMContentLoaded', () => {
      let userName = '';
      try {
        const meta = document.querySelector('meta[name="global-data"]');
        if (meta && meta.content) {
          const gd = JSON.parse(meta.content);
          userName = gd?.userData?.name || '';
        }
      } catch (_) {}
      readChromePixivCookie((cookieStr) => {
        if (cookieStr) deliverCookieSession(cookieStr, userName);
      });
    }, { once: true });
  }

  // 等待 DOM Ready 再注入 Pixiv 站内抽屉 UI
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initPixivInPageDrawer, { once: true });
    return;
  }
  initPixivInPageDrawer();

  function initPixivInPageDrawer() {

  // =========================================================================
  // 3. Pixiv 站内全格式 URL 解析 (/tags/ 与 /search?q= 全支持)
  // =========================================================================
  function getCurrentTagFromUrl() {
    const pathname = window.location.pathname;
    const search = window.location.search;
    const tagMatch = pathname.match(/\/tags\/([^/?#]+)/);
    if (tagMatch) {
      try { return decodeURIComponent(tagMatch[1]).trim(); } catch { return tagMatch[1]; }
    }
    if (pathname.startsWith('/search')) {
      const params = new URLSearchParams(search);
      const q = params.get('q') || params.get('word');
      if (q) return q.trim();
    }
    return null;
  }

  // 语义分类识别 (角色 / 属性 / 作品IP / 元标签 / 收藏梯队)
  const SERIES_SET = new Set([
    '崩壊:スターレイル', '崩壊スターレイル', 'アークナイツ', '明日方舟',
    'Fate/GrandOrder', 'FGO', 'アズールレーン', '碧蓝航线', '艦これ', '艦隊これくしょん',
    '東方Project', '東方', 'アイドルマスター', 'ウマ娘', 'ウマ娘プリティーダービー', 'ホロライブ', 'hololive',
    'にじさんじ', 'VOCALOID', 'プロセカ', 'ゼンレスゾーンゼロ', '绝区零', '鳴潮', '勝利の女神:NIKKE', 'NIKKE'
  ]);
  const ATTR_SET = new Set([
    '白タイツ', '黒タイツ', 'タイツ', 'ストッキング', 'ニーソ', 'ガーターベルト', '水着', 'ビキニ', 'スク水',
    '制服', 'セーラー服', 'メイド', 'メイド服', 'バニーガール', 'チャイナドレス', '体操服', 'ブルマ', '巫女',
    'シスター', 'ナース', '私服', 'ドレス', '着物', '浴衣', 'パーカー', '眼鏡', 'メガネ', 'ケモミミ', '猫耳', '狐耳', 'ウサ耳',
    'ツインテール', 'ポニーテール', '白髪', '銀髪', '金髪', '黒髪', '赤目', '青目', 'オッドアイ',
    '巨乳', '爆乳', '貧乳', 'ちっぱい', 'ロリ', 'お姉さん', '少女', '美少女', '女の子', '百合',
    '足裏', '素足', '裸足', '太もも', '魅惑のふともも', 'おっぱい', '尻神様', '腋', 'へそ', '泣き顔', '笑顔', '赤面'
  ]);
  const META_SET = new Set([
    'R-18', 'R-18G', 'AI生成', 'AIイラスト', 'AI', 'NovelAI', 'StableDiffusion',
    'オリジナル', '創作', '漫画', '4コマ', 'イラスト', '落書き', 'らくがき', 'ドット絵', 'Live2D', 'ugoira'
  ]);

  function classifyTag(tag) {
    const clean = String(tag || '').trim();
    if (/^\d+users入り$/i.test(clean) || /users入り$/i.test(clean)) return 'bookmark_milestone';
    if (META_SET.has(clean)) return 'meta_general';
    if (SERIES_SET.has(clean) || /東方|艦これ|ホロライブ|ウマ娘|FGO|スターレイル|Project|シリーズ/i.test(clean)) return 'series_ip';
    if (ATTR_SET.has(clean) || /(タイツ|水着|制服|服|ドレス|耳|髪|乳|足|もも|尻|顔|目|娘|少女|百合|メガネ|眼鏡|ビキニ|ニーソ)$/.test(clean)) return 'attribute_xp';
    return 'character';
  }

  const CAT_LABELS = {
    character: '角色',
    attribute_xp: '属性',
    series_ip: '作品',
    meta_general: '元标签',
    bookmark_milestone: '收藏'
  };

  // =========================================================================
  // 4. 注入 PAPER 档案风无网格、无像素字体、无 Emoji 侧边栏样式
  // =========================================================================
  const style = document.createElement('style');
  style.textContent = `
    #pxp-toggle-btn {
      position: fixed;
      right: 16px;
      bottom: 24px;
      z-index: 999990;
      background: #FAF6F0;
      color: #231F1C;
      border: 2px solid #231F1C;
      border-radius: 0 !important;
      padding: 8px 14px;
      font-family: 'Noto Sans SC', 'Inter', 'Hiragino Kaku Gothic ProN', sans-serif;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 4px 4px 0 rgba(35, 31, 28, 0.18);
      display: flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
    }
    #pxp-toggle-btn:hover {
      background: #8E2B23;
      color: #FAF6F0;
      border-color: #8E2B23;
    }
    #pxp-drawer {
      position: fixed;
      top: 56px;
      right: 16px;
      width: 470px;
      max-height: calc(100vh - 84px);
      z-index: 999991;
      background: #FAF6F0;
      color: #231F1C;
      border: 2px solid #231F1C;
      border-radius: 0 !important;
      box-shadow: 6px 6px 0 rgba(35, 31, 28, 0.2);
      display: flex;
      flex-direction: column;
      font-family: 'Noto Sans SC', 'Inter', 'Hiragino Kaku Gothic ProN', sans-serif;
      overflow: hidden;
      transition: transform 0.2s ease, opacity 0.2s ease;
    }
    #pxp-drawer.pxp-hidden {
      transform: translateX(510px);
      opacity: 0;
      pointer-events: none;
    }
    .pxp-hdr {
      padding: 10px 12px;
      background: #EAE3D5;
      border-bottom: 1px solid #231F1C;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .pxp-title {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 700;
      color: #8E2B23;
      letter-spacing: 0.04em;
    }
    .pxp-close {
      background: #FAF6F0;
      border: 1px solid #231F1C;
      color: #231F1C;
      padding: 2px 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }
    .pxp-close:hover {
      background: #8E2B23;
      color: #FAF6F0;
    }
    .pxp-ctrl {
      padding: 8px 12px;
      border-bottom: 1px solid #B5AC9E;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
      background: #F4EFE6;
    }
    .pxp-select, .pxp-btn {
      background: #FAF6F0;
      color: #231F1C;
      border: 1px solid #231F1C;
      border-radius: 0 !important;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
    }
    .pxp-btn-primary {
      background: #8E2B23;
      color: #FAF6F0;
      border-color: #8E2B23;
    }
    .pxp-btn-stop {
      background: #7A4B16;
      color: #FAF6F0;
      border-color: #7A4B16;
    }
    .pxp-cats {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      border-bottom: 1px solid #231F1C;
      background: #EAE3D5;
    }
    .pxp-cat-tab {
      background: transparent;
      color: #5A534A;
      border: none;
      border-right: 1px solid #B5AC9E;
      padding: 6px 4px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      text-align: center;
      white-space: nowrap;
    }
    .pxp-cat-tab:last-child { border-right: none; }
    .pxp-cat-tab.active {
      background: #8E2B23;
      color: #FAF6F0;
    }
    .pxp-status {
      padding: 6px 12px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #5A534A;
      background: #FAF6F0;
      border-bottom: 1px solid #B5AC9E;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .pxp-list {
      overflow-y: auto;
      flex: 1;
      max-height: 55vh;
      background: #FAF6F0;
    }
    .pxp-row {
      padding: 7px 12px;
      border-bottom: 1px solid #D8CFC0;
      display: grid;
      grid-template-columns: 32px 1fr auto;
      gap: 8px;
      align-items: center;
    }
    .pxp-row:hover {
      background: #EAE3D5;
    }
    .pxp-rank {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #5A534A;
      font-weight: 700;
    }
    .pxp-tag-main {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }
    .pxp-tag-line {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .pxp-tag-link {
      color: #231F1C;
      font-weight: 700;
      font-size: 12.5px;
      text-decoration: none;
    }
    .pxp-tag-link:hover {
      color: #8E2B23;
      text-decoration: underline;
    }
    .pxp-tag-tr {
      font-size: 11px;
      color: #5A534A;
      background: #EAE3D5;
      padding: 0 5px;
      border: 1px solid #B5AC9E;
    }
    .pxp-cat-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      padding: 0 4px;
      border: 1px solid #B5AC9E;
      color: #5A534A;
    }
    .pxp-cat-badge.cat-character { color: #1F5C44; border-color: #1F5C44; }
    .pxp-cat-badge.cat-attribute_xp { color: #8E2B23; border-color: #8E2B23; }
    .pxp-cat-badge.cat-series_ip { color: #7A4B16; border-color: #7A4B16; }
    .pxp-bar-bg {
      height: 4px;
      background: #EAE3D5;
      width: 100%;
    }
    .pxp-bar-fill {
      height: 100%;
      background: #8E2B23;
    }
    .pxp-stat {
      text-align: right;
      font-family: 'JetBrains Mono', monospace;
      white-space: nowrap;
    }
    .pxp-cnt {
      font-size: 12px;
      font-weight: 700;
      color: #231F1C;
    }
    .pxp-pct {
      font-size: 10px;
      color: #8E2B23;
    }
  `;
  document.head.appendChild(style);

  // =========================================================================
  // 5. 构建 UI 与全量页面流式采样器
  // =========================================================================
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'pxp-toggle-btn';
  toggleBtn.innerHTML = '<span>MadeInMagius // 标签共现分析</span>';
  document.body.appendChild(toggleBtn);

  const drawer = document.createElement('div');
  drawer.id = 'pxp-drawer';
  drawer.innerHTML = `
    <div class="pxp-hdr">
      <span class="pxp-title">MadeInMagius // 全量标签共现与分类排行</span>
      <button class="pxp-close" id="pxp-close-btn">关闭</button>
    </div>
    <div class="pxp-ctrl">
      <select class="pxp-select" id="pxp-pages">
        <option value="5">5页</option>
        <option value="15" selected>15页</option>
        <option value="35">35页</option>
        <option value="80">80页</option>
        <option value="ALL">全部页</option>
      </select>
      <select class="pxp-select" id="pxp-mode">
        <option value="all">全部年龄</option>
        <option value="safe">全年龄</option>
        <option value="r18">仅R-18</option>
      </select>
      <label style="font-size:11px;display:flex;align-items:center;gap:3px;cursor:pointer;">
        <input type="checkbox" id="pxp-hide-bmk" checked /> 隐藏收藏Tag
      </label>
      <button class="pxp-btn pxp-btn-primary" id="pxp-run-btn">开始采样</button>
      <button class="pxp-btn pxp-btn-stop" id="pxp-stop-btn" style="display:none;">停止翻页</button>
    </div>
    <div class="pxp-cats" id="pxp-cat-tabs">
      <button class="pxp-cat-tab active" data-cat="all">全部 (<span id="pxp-c-all">0</span>)</button>
      <button class="pxp-cat-tab" data-cat="character">角色 (<span id="pxp-c-character">0</span>)</button>
      <button class="pxp-cat-tab" data-cat="attribute_xp">属性 (<span id="pxp-c-attribute_xp">0</span>)</button>
      <button class="pxp-cat-tab" data-cat="series_ip">作品 (<span id="pxp-c-series_ip">0</span>)</button>
      <button class="pxp-cat-tab" data-cat="meta_general">元标签 (<span id="pxp-c-meta_general">0</span>)</button>
    </div>
    <div class="pxp-status" id="pxp-status">
      <span id="pxp-status-text">等待分析</span>
      <a href="${DEFAULT_WEB_ORIGIN}" target="_blank" style="color:#8E2B23;text-decoration:none;font-weight:700;">打开完整终端 ↗</a>
    </div>
    <div class="pxp-list" id="pxp-list"></div>
  `;
  document.body.appendChild(drawer);

  let activeTag = null;
  let activeCategory = 'all';
  let abortFlag = false;
  let currentRows = [];
  let totalSampledWorks = 0;

  toggleBtn.addEventListener('click', () => {
    drawer.classList.toggle('pxp-hidden');
  });
  document.getElementById('pxp-close-btn').addEventListener('click', () => {
    drawer.classList.add('pxp-hidden');
  });

  document.querySelectorAll('#pxp-cat-tabs .pxp-cat-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#pxp-cat-tabs .pxp-cat-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.cat;
      renderRows();
    });
  });

  document.getElementById('pxp-hide-bmk').addEventListener('change', renderRows);
  document.getElementById('pxp-run-btn').addEventListener('click', () => startSampling(true));
  document.getElementById('pxp-stop-btn').addEventListener('click', () => { abortFlag = true; });

  function renderRows() {
    const hideBmk = document.getElementById('pxp-hide-bmk').checked;
    const listEl = document.getElementById('pxp-list');

    const counts = { all: 0, character: 0, attribute_xp: 0, series_ip: 0, meta_general: 0 };
    const filtered = [];

    for (const r of currentRows) {
      if (hideBmk && r.category === 'bookmark_milestone') continue;
      counts.all++;
      if (counts[r.category] !== undefined) counts[r.category]++;
      if (activeCategory === 'all' || r.category === activeCategory) {
        filtered.push(r);
      }
    }

    document.getElementById('pxp-c-all').textContent = counts.all;
    document.getElementById('pxp-c-character').textContent = counts.character;
    document.getElementById('pxp-c-attribute_xp').textContent = counts.attribute_xp;
    document.getElementById('pxp-c-series_ip').textContent = counts.series_ip;
    document.getElementById('pxp-c-meta_general').textContent = counts.meta_general;

    if (filtered.length === 0) {
      listEl.innerHTML = `<div style="padding:24px;text-align:center;color:#5A534A;font-size:12px;">当前分类下暂无共现标签</div>`;
      return;
    }

    const topCount = filtered[0].count || 1;
    listEl.innerHTML = filtered.slice(0, 180).map((item, idx) => {
      const barW = Math.max(3, Math.round((item.count / topCount) * 100));
      const searchUrl = `https://www.pixiv.net/search?q=${encodeURIComponent(item.tag)}&s_mode=tag&type=artwork`;
      const crossUrl = `https://www.pixiv.net/search?q=${encodeURIComponent(activeTag + ' ' + item.tag)}&s_mode=tag&type=artwork`;
      return `
        <div class="pxp-row">
          <div class="pxp-rank">#${String(idx + 1).padStart(2, '0')}</div>
          <div class="pxp-tag-main">
            <div class="pxp-tag-line">
              <a class="pxp-tag-link" href="${searchUrl}" title="单独搜索 ${item.tag}">${item.tag}</a>
              ${item.translation ? `<span class="pxp-tag-tr">${item.translation}</span>` : ''}
              <span class="pxp-cat-badge cat-${item.category}">${CAT_LABELS[item.category] || 'TAG'}</span>
              <a href="${crossUrl}" style="font-size:10px;color:#8E2B23;text-decoration:none;font-family:monospace;" title="在 Pixiv 联合搜索 [${activeTag} + ${item.tag}]">[+联合搜]</a>
            </div>
            <div class="pxp-bar-bg"><div class="pxp-bar-fill" style="width:${barW}%"></div></div>
          </div>
          <div class="pxp-stat">
            <div class="pxp-cnt">${item.count} 次</div>
            <div class="pxp-pct">${item.percentage}%</div>
          </div>
        </div>
      `;
    }).join('');
  }

  async function startSampling(forceRestart = false) {
    const tag = getCurrentTagFromUrl();
    if (!tag) {
      drawer.classList.add('pxp-hidden');
      return;
    }
    if (!forceRestart && tag === activeTag && currentRows.length > 0) return;

    activeTag = tag;
    abortFlag = false;
    drawer.classList.remove('pxp-hidden');

    const pagesRaw = document.getElementById('pxp-pages').value;
    const maxPages = pagesRaw === 'ALL' ? 250 : (parseInt(pagesRaw, 10) || 15);
    const mode = document.getElementById('pxp-mode').value;
    const statusText = document.getElementById('pxp-status-text');
    const runBtn = document.getElementById('pxp-run-btn');
    const stopBtn = document.getElementById('pxp-stop-btn');

    runBtn.style.display = 'none';
    stopBtn.style.display = 'inline-block';

    const seenIds = new Set();
    const tagMap = new Map();
    const transMap = new Map();
    let pixivTotal = 0;

    function rebuildCurrentRows() {
      totalSampledWorks = seenIds.size;
      const normQuery = activeTag.toLowerCase();
      const rows = [];
      for (const [t, cnt] of tagMap.entries()) {
        if (t.toLowerCase() === normQuery) continue;
        rows.push({
          tag: t,
          translation: transMap.get(t) || '',
          category: classifyTag(t),
          count: cnt,
          percentage: totalSampledWorks > 0 ? Number(((cnt / totalSampledWorks) * 100).toFixed(1)) : 0
        });
      }
      rows.sort((a, b) => b.count - a.count);
      currentRows = rows;
      renderRows();
    }

    const batchSize = 3;
    for (let startP = 1; startP <= maxPages; startP += batchSize) {
      if (abortFlag) break;
      const endP = Math.min(maxPages, startP + batchSize - 1);
      statusText.textContent = `SAMPLING [${activeTag}] // 第 ${startP}~${endP} 页 (已采样 ${seenIds.size} 作)...`;

      const promises = [];
      for (let p = startP; p <= endP; p++) {
        const apiUrl = `https://www.pixiv.net/ajax/search/artworks/${encodeURIComponent(activeTag)}?word=${encodeURIComponent(activeTag)}&order=date_d&mode=${mode}&p=${p}&s_mode=s_tag&type=all&lang=zh`;
        promises.push(
          fetch(apiUrl, { credentials: 'include' })
            .then(r => r.json())
            .catch(() => null)
        );
      }

      const results = await Promise.all(promises);
      let newAdded = 0;

      for (const json of results) {
        if (!json || json.error || !json.body) continue;
        const body = json.body;
        const block = body.illustManga || body.illust || body.manga || {};
        const data = block.data || [];
        if (block.total && block.total > pixivTotal) pixivTotal = block.total;

        if (body.tagTranslation) {
          for (const [k, v] of Object.entries(body.tagTranslation)) {
            const tr = v.zh || v.zh_tw || v.en || '';
            if (tr) transMap.set(k, tr);
          }
        }

        for (const item of data) {
          if (!item || !item.id || item.isAdContainer) continue;
          const idStr = String(item.id);
          if (seenIds.has(idStr)) continue;
          seenIds.add(idStr);
          newAdded++;

          const uniqueTags = new Set(item.tags || []);
          for (const t of uniqueTags) {
            tagMap.set(t, (tagMap.get(t) || 0) + 1);
          }
        }
      }

      rebuildCurrentRows();

      if (newAdded === 0 || (pixivTotal > 0 && seenIds.size >= pixivTotal)) {
        break;
      }
    }

    runBtn.style.display = 'inline-block';
    stopBtn.style.display = 'none';
    statusText.textContent = `DONE [${activeTag}] // 共采样 ${seenIds.size}${pixivTotal ? '/' + pixivTotal : ''} 作 · ${currentRows.length} 共现Tag`;
  }

  // 监听 SPA 路由切换 (/tags/ 与 /search?q= 全支持)
  let lastHref = window.location.href;
  setInterval(() => {
    if (window.location.href !== lastHref) {
      lastHref = window.location.href;
      const t = getCurrentTagFromUrl();
      if (t) startSampling(false);
    }
  }, 1000);

  if (getCurrentTagFromUrl()) {
    startSampling(true);
  } else {
    drawer.classList.add('pxp-hidden');
  }
  }
})();
