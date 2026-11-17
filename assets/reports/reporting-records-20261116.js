(() => {
  'use strict';

  const toyMode = document.documentElement.dataset.mode === 'toy';
  const images = [];
  const byId = new Map();
  const viewer = document.getElementById('image-viewer');
  const viewerImage = document.getElementById('viewer-image');
  const viewport = document.getElementById('viewer-viewport');
  let activeImage = -1;
  let lastImageTrigger = null;
  let toastTimer;

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function allowedHref(href) {
    try {
      const url = new URL(href, document.baseURI);
      if (!['https:', 'http:'].includes(url.protocol)) return null;
      const packagedImage = /^reporting-records-20261116\/(?:source-[\da-z]+\.(?:png|webp)|(?:notice|comment-proof)-\d+\.jpg)$/.test(href) && url.origin === location.origin;
      if (toyMode && !packagedImage && !(url.hostname === 'bilibili.com' || url.hostname.endsWith('.bilibili.com'))) return null;
      return url.href;
    } catch { return null; }
  }

  function link(text, href, className = '') {
    const resolved = allowedHref(href);
    if (!resolved) return null;
    const a = el('a', className, text);
    a.href = resolved;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    return a;
  }

  function addLinks(container, entries = []) {
    for (const entry of entries) {
      if (toyMode && entry.webOnly) continue;
      const a = link(entry.label, entry.href);
      if (a) container.append(a);
    }
  }

  function registerImage(item, groupLabel) {
    const record = { ...item, groupLabel, index: images.length };
    images.push(record);
    byId.set(item.id, record);
    return record;
  }

  function imageCard(item, groupLabel) {
    const record = registerImage(item, groupLabel);
    const card = el('figure', 'image-card');
    card.id = item.id;
    card.dataset.stage = item.label || '';
    if (item.number === '00') card.dataset.full = 'true';
    const button = el('button', 'image-button');
    button.type = 'button';
    button.setAttribute('aria-label', `放大查看：${item.title}`);
    const img = el('img');
    img.src = item.src;
    img.alt = item.alt || item.title;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('error', () => {
      if (button.querySelector('.image-error')) return;
      button.append(el('span', 'image-error', '图片暂未载入，点击打开大图重试。'));
    });
    button.append(img, el('span', 'expand-hint', '放大阅读 ↗'));
    button.addEventListener('click', () => openImage(record.index, button));

    const body = el('figcaption', 'image-body');
    const heading = el('div', 'card-heading');
    heading.append(el('p', 'card-label', item.label || groupLabel), el('span', 'version-badge', item.versionLabel));
    body.append(heading, el('h3', '', item.title), el('p', 'image-caption', item.caption || ''));

    const links = el('div', 'card-links');
    const original = link('新标签看大图 ↗', item.src);
    if (original) links.append(original);
    addLinks(links, item.links);
    body.append(links);
    card.append(button, body);
    return card;
  }

  function dateLabel(value, seconds = false) {
    if (!value) return '未记录';
    return value.slice(0, seconds ? 19 : 16).replace('T', ' ');
  }

  function renderSummary(summary, data) {
    const cp = data.crossPageAudit || {};
    const metrics = [
      [data.gallery.length, '完整事件原图 (00–18)', '全套高清原图 · 无黑框遮盖'],
      [`${cp.bv1q4CommentsBackend || 348} / ${cp.bv1q4CommentsPublicVisible || 249}`, 'BV1q4Wa67EB2 评论落差', `后台 ${cp.bv1q4CommentsBackend || 348} 条（11-16 为 ${cp.bv1q4CommentsBaseline || 351}）· 前台仅显 ${cp.bv1q4CommentsPublicVisible || 249}（差 ${cp.bv1q4CommentsDiscrepancy || 99} 条）`, 'metric-value-text'],
      [`${cp.uploadNotPassedTotal || 8} 稿件 / ${summary.dynamicEvents} 动态`, '全站受限与禁言记录', `${cp.uploadLocked || 6} 锁定 + ${cp.uploadReturnedSelfOnly || 2} 退回仅自见 · 2×7天禁言 · 个人QQ封禁`, 'metric-value-text'],
      [data.archiveSummary?.totalRecords || 4433, '4,433 条历史公开发言', 'UID 647014264 (4,329) + 1703887112 (104) · 12类精细归类'],
    ];
    const container = document.getElementById('summary-metrics');
    container.replaceChildren();
    for (const [value, label, detail, valueClass = ''] of metrics) {
      const card = el('div', 'metric-card');
      card.append(el('strong', `metric-value ${valueClass}`.trim(), String(value)), el('span', 'metric-label', label), el('small', 'metric-detail', detail));
      container.append(card);
    }

    const esc = data.escalation20261118;
    const escBox = document.getElementById('escalation-box');
    if (esc && escBox) {
      document.getElementById('escalation-title').textContent = esc.headline || '2026-11-18 最新核查进展';
      const ul = document.getElementById('escalation-list');
      ul.replaceChildren();
      for (const item of esc.items || []) ul.append(el('li', '', item));
      escBox.hidden = false;
    }

    const cpStrip = document.getElementById('cross-page-strip');
    if (cpStrip && data.crossPageAudit) {
      cpStrip.replaceChildren();
      const cards = [
        [`${cp.bv1q4CommentsDiscrepancy || 99} 条隐藏/过滤`, 'BV1q4Wa67EB2 评论前后台差额', `系统通知只推送过 3 条违规，实际后台 348 条中有 99 条无法在前台展示`],
        [`${cp.uploadNotPassedTotal || 8} / ${cp.uploadTotalVideos || 92} 受限`, '创作中心「未通过」视频', `${cp.uploadLocked || 6} 个锁定 + ${cp.uploadReturnedSelfOnly || 2} 个退回仅自见；BV1q4Wa67EB2 历 18 次审改才过审`],
        [`${cp.deniedDynamicAppeals || 7} 条「无法恢复」`, '系统通知申诉与账号禁言', `10月10日与11月1日两次 7 天禁言 · 账号禁言申诉未通过 · 侵权/限流警告`],
        [`${(cp.outgoingReportFeedback647 || []).length} 条重点关注`, '对 647014264 举报进展反馈', `社区中心回复「我们已收到您对账号的举报，将会重点关注该账号」`],
      ];
      for (const [val, lbl, sub] of cards) {
        const c = el('div', 'cp-card');
        c.append(el('strong', '', val), el('span', '', lbl), el('small', '', sub));
        cpStrip.append(c);
      }
    }
  }

  function renderSystemAuditCards(cp) {
    const host = document.getElementById('system-audit-cards');
    if (!host || !cp) return;
    host.replaceChildren();

    const makeCard = (title, items) => {
      const box = el('div', 'sys-card');
      box.append(el('h3', '', title));
      const ul = el('ul');
      for (const line of items) ul.append(el('li', '', line));
      box.append(ul);
      return box;
    };

    host.append(
      makeCard('账号禁言、申诉驳回与警告记录（message.bilibili.com）', cp.accountMutes || []),
      makeCard('动态申诉「无法恢复」(7条) 与对 647014264 反馈 (2条)', [
        `被驳回动态 ID：${(cp.deniedAppealDynamicIds || []).join(' · ')}`,
        ...(cp.outgoingReportFeedback647 || []),
      ])
    );
  }

  function renderGalleryIndex(gallery) {
    const container = document.getElementById('gallery-index');
    container.replaceChildren();
    for (const item of gallery) {
      const a = el('a', '', item.number);
      a.href = `#${item.id}`;
      a.title = item.title;
      container.append(a);
    }
  }

  function initGalleryFilter() {
    const filterHost = document.getElementById('stage-filter');
    const grid = document.getElementById('gallery-grid');
    if (!filterHost || !grid) return;
    filterHost.addEventListener('click', event => {
      const btn = event.target.closest('.stage-chip');
      if (!btn) return;
      const stage = btn.dataset.stage || '';
      filterHost.querySelectorAll('.stage-chip').forEach(b => b.classList.toggle('is-active', b === btn));
      grid.querySelectorAll('.image-card').forEach(card => {
        card.hidden = Boolean(stage && card.dataset.stage !== stage);
      });
    });
  }

  function initNoticeSubtabs() {
    const btns = [...document.querySelectorAll('[data-ntab]')];
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.ntab;
        btns.forEach(b => {
          const active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-selected', String(active));
        });
        document.querySelectorAll('.ntab-panel').forEach(panel => {
          panel.hidden = panel.id !== `ntab-${target}`;
        });
      });
    });
  }

  function renderNoticeTable(records, filter = 'all') {
    const tbody = document.getElementById('notice-table-body');
    tbody.replaceChildren();
    const visible = records.filter(item => filter === 'all' || item.reasonCategory === filter);
    for (const item of visible) {
      const row = el('tr');
      const time = el('td', 'date-cell', dateLabel(item.noticeAt));
      if (item.timeBasis === 'recording_supplement') time.append(el('small', 'table-note', '录屏补证'));
      row.append(time, el('td', 'id-cell', item.dynamicId), el('td', '', item.reason));
      const cell = el('td', 'image-source-cell');
      for (const imageId of item.exampleImages) {
        const record = byId.get(imageId);
        if (!record) continue;
        const button = el('button', 'table-image-link', '查看截图');
        button.type = 'button';
        button.addEventListener('click', () => openImage(record.index, button));
        cell.append(button);
      }
      if (!cell.childElementCount) cell.append(el('span', 'table-note', '通知台账'));
      row.append(cell);
      tbody.append(row);
    }
    document.getElementById('dynamic-visible-count').textContent = `显示 ${visible.length} / ${records.length} 条`;
  }

  function renderVideos(records) {
    const tbody = document.getElementById('video-table-body');
    tbody.replaceChildren();
    for (const item of records) {
      const row = el('tr');
      const identity = el('td');
      const entry = link(item.bvid, item.href, 'video-entry');
      if (entry) identity.append(entry);
      else identity.append(el('span', 'id-cell', item.bvid));
      identity.append(el('span', 'table-note', item.label), el('time', 'table-note', dateLabel(item.listedAt, true)));
      row.append(identity, el('td', 'status-cell', item.status), el('td', '', item.triggerLabel), el('td', '', item.reasonSummary));
      tbody.append(row);
    }
  }

  function renderOwnComments(records) {
    const tbody = document.getElementById('own-comment-table-body');
    tbody.replaceChildren();
    for (const item of records) {
      const row = el('tr');
      row.append(el('td', 'date-cell', dateLabel(item.noticeAt)), el('td', 'id-cell', item.rpid), el('td', '', item.reason));
      tbody.append(row);
    }
  }

  function renderProfileBanner(profileCard) {
    const host = document.getElementById('profile-banner');
    if (!host || !profileCard) return;
    host.replaceChildren();
    const record = registerImage({
      id: 'profile-647014264',
      title: profileCard.title,
      groupLabel: '关联账号主页',
      versionLabel: 'B站主页实拍',
      src: profileCard.src,
      alt: profileCard.alt,
      caption: profileCard.caption,
    }, '关联账号主页');
    const thumbBtn = el('button', 'profile-banner-thumb');
    thumbBtn.type = 'button';
    thumbBtn.setAttribute('aria-label', `放大查看：${profileCard.title}`);
    const img = el('img');
    img.src = profileCard.src;
    img.alt = profileCard.alt;
    img.loading = 'lazy';
    thumbBtn.append(img);
    thumbBtn.addEventListener('click', () => openImage(record.index, thumbBtn));

    const txt = el('div');
    txt.append(el('h3', '', profileCard.title), el('p', '', profileCard.caption));
    host.append(thumbBtn, txt);
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('is-visible');
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2300);
  }

  async function copyId(value) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const input = el('textarea');
        input.value = value;
        input.style.cssText = 'position:fixed;top:-1000px;left:-1000px';
        document.body.append(input);
        input.select();
        const copied = document.execCommand('copy');
        input.remove();
        if (!copied) throw new Error('copy unavailable');
      }
      showToast('已复制评论 ID');
    } catch { showToast(`评论 ID：${value}`); }
  }

  function commentCard(item, index) {
    const article = el('article', item.screenshot ? 'comment-card has-proof' : 'comment-card');
    article.id = item.id || `comment-${item.rpid}`;
    const main = el('div');
    const header = el('div', 'comment-header');
    header.append(el('span', 'comment-number', `#${String(index + 1).padStart(2, '0')} · UID ${item.uid}`), el('span', 'source-badge', item.badge || '历史公开发言'));
    const time = el('time', 'comment-time', item.dateLabel);
    time.dateTime = item.date;
    const message = el('blockquote', 'comment-message', item.message);
    const meta = el('div', 'comment-meta');
    meta.append(el('span', '', `RPID ${item.rpid}`));
    const copy = el('button', 'copy-button', '复制 ID');
    copy.type = 'button';
    copy.addEventListener('click', () => copyId(item.rpid));
    meta.append(copy);
    const links = el('div', 'card-links');
    addLinks(links, item.links);

    main.append(header, time, message);
    if (item.context) main.append(el('p', 'comment-context', item.context));
    main.append(meta, links);
    article.append(main);

    if (item.screenshot) {
      const record = registerImage({
        id: `proof-${item.rpid}`,
        title: `评论 ${item.rpid} B站实拍截图`,
        groupLabel: '历史言论实拍',
        versionLabel: 'B站界面 / 官方接口',
        src: item.screenshot,
        alt: item.screenshotAlt || item.message,
        caption: item.message,
      }, '历史言论实拍');
      const box = el('div', 'comment-proof-box');
      const btn = el('button', 'comment-proof-btn');
      btn.type = 'button';
      btn.setAttribute('aria-label', `点击放大评论 ${item.rpid} 实拍截图`);
      const img = el('img');
      img.src = item.screenshot;
      img.alt = item.screenshotAlt || item.message;
      img.loading = 'lazy';
      btn.append(img, el('span', 'comment-proof-cap', '点击放大查看B站截图 ↗'));
      btn.addEventListener('click', () => openImage(record.index, btn));
      box.append(btn);
      article.append(box);
    }

    return article;
  }

  function setZoom(zoomed) {
    viewport.classList.toggle('is-zoomed', zoomed);
    const button = document.getElementById('viewer-zoom');
    button.textContent = zoomed ? '适合屏幕' : '1:1 放大阅读';
    button.setAttribute('aria-pressed', String(zoomed));
    viewport.scrollTo(0, 0);
  }

  function showImage(index) {
    const item = images[index];
    if (!item) return;
    activeImage = index;
    setZoom(false);
    document.getElementById('viewer-title').textContent = item.title;
    document.getElementById('viewer-counter').textContent = `${String(index + 1).padStart(2, '0')} / ${String(images.length).padStart(2, '0')} · ${item.groupLabel}`;
    document.getElementById('viewer-caption').textContent = `${item.versionLabel} · ${item.caption || ''}`;
    viewerImage.src = item.src;
    viewerImage.alt = item.alt || item.title;
    const original = document.getElementById('viewer-original');
    const resolved = allowedHref(item.src);
    original.hidden = !resolved;
    if (resolved) original.href = resolved;
    document.getElementById('viewer-previous').disabled = index === 0;
    document.getElementById('viewer-next').disabled = index === images.length - 1;
  }

  function openImage(index, trigger) {
    if (!images[index]) return;
    if (typeof viewer.showModal !== 'function') {
      const href = allowedHref(images[index].src);
      if (href) window.open(href, '_blank', 'noopener,noreferrer');
      return;
    }
    lastImageTrigger = trigger || document.activeElement;
    showImage(index);
    document.body.classList.add('viewer-open');
    if (!viewer.open) viewer.showModal();
    document.getElementById('viewer-close').focus();
  }

  document.getElementById('viewer-close').addEventListener('click', () => viewer.close());
  document.getElementById('viewer-previous').addEventListener('click', () => showImage(activeImage - 1));
  document.getElementById('viewer-next').addEventListener('click', () => showImage(activeImage + 1));
  document.getElementById('viewer-zoom').addEventListener('click', () => setZoom(!viewport.classList.contains('is-zoomed')));
  viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
  viewer.addEventListener('close', () => {
    document.body.classList.remove('viewer-open');
    if (lastImageTrigger && lastImageTrigger.isConnected) lastImageTrigger.focus({ preventScroll: true });
  });
  viewer.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' && activeImage > 0) { event.preventDefault(); showImage(activeImage - 1); }
    if (event.key === 'ArrowRight' && activeImage < images.length - 1) { event.preventDefault(); showImage(activeImage + 1); }
  });

  const sectionLinks = [...document.querySelectorAll('.section-nav a')];
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (!visible.length) return;
      const hash = `#${visible[0].target.id}`;
      for (const a of sectionLinks) {
        if (a.getAttribute('href') === hash) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
      }
    }, { rootMargin: '-60px 0px -55% 0px', threshold: 0 });
    document.querySelectorAll('.record-section').forEach(section => observer.observe(section));
  }

  async function init() {
    const embedded = document.getElementById('records-manifest');
    let data;
    if (embedded) data = JSON.parse(embedded.textContent);
    else {
      const response = await fetch(document.body.dataset.manifest, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`manifest ${response.status}`);
      data = await response.json();
    }
    if (data.schemaVersion < 2) throw new Error('Unsupported event-record schema');
    for (const [id, key] of Object.entries({
      'author-statement': 'authorStatement',
      'summary-note': 'summaryNote', 'gallery-note': 'galleryNote', 'notice-note': 'noticeNote',
      'dynamic-record-note': 'dynamicRecordNote', 'video-record-note': 'videoRecordNote',
      'own-comment-note': 'ownCommentNote',
      'comment-note': 'commentNote', 'comment-link-note': 'commentLinkNote',
    })) document.getElementById(id).textContent = data[key] || '';

    document.querySelector('[data-count="gallery"]').textContent = String(data.gallery.length);
    document.querySelector('[data-count="notices"]').textContent = String(data.notices.length);
    document.querySelector('[data-count="comments"]').textContent = String(data.comments.length);

    renderSummary(data.summary, data);
    renderSystemAuditCards(data.crossPageAudit);
    renderGalleryIndex(data.gallery);
    initGalleryFilter();
    initNoticeSubtabs();

    const gGrid = document.getElementById('gallery-grid');
    gGrid.replaceChildren();
    for (const item of data.gallery || []) gGrid.append(imageCard(item, '事件说明图'));

    const nGrid = document.getElementById('notice-grid');
    nGrid.replaceChildren();
    for (const item of data.notices || []) nGrid.append(imageCard(item, '平台截图'));

    document.getElementById('attack-message').textContent = data.attackQuote.text;
    document.getElementById('attack-attribution').textContent = data.attackQuote.attribution;
    renderNoticeTable(data.dynamicRecords);
    document.getElementById('dynamic-reason-filter').addEventListener('change', event => renderNoticeTable(data.dynamicRecords, event.target.value));
    renderVideos(data.videoRecords);
    renderOwnComments(data.ownCommentRemovals);
    renderProfileBanner(data.profileCard);

    const cList = document.getElementById('comment-list');
    cList.replaceChildren();
    (data.comments || []).forEach((item, index) => cList.append(commentCard(item, index)));

    initArchiveExplorer(data.archiveSummary?.datasetPath || 'reporting-records-20261116/comments-4433.json');
    document.getElementById('load-status').hidden = true;
    if (location.hash) {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) requestAnimationFrame(() => target.scrollIntoView());
    }
  }

  function initArchiveExplorer(datasetPath) {
    const badge = document.getElementById('archive-load-badge');
    const countEl = document.getElementById('archive-count');
    const resultsEl = document.getElementById('archive-results');
    const pageInfo = document.getElementById('archive-page-info');
    const prevBtn = document.getElementById('archive-prev');
    const nextBtn = document.getElementById('archive-next');
    const qInput = document.getElementById('archive-query');
    const uidSelect = document.getElementById('archive-uid');
    const catSelect = document.getElementById('archive-cat');
    const recCheck = document.getElementById('archive-recovered');
    const chipsHost = document.getElementById('portrait-chips');
    const insightsHost = document.getElementById('portrait-insights');
    if (!badge || !resultsEl) return;

    const CAT_NAMES = [
      '举报机制/客服对抗/自残施压',
      '群冲突/小号卧底/抄袭双标/诉讼',
      '魔法纪录/小圆/Exedra圈内',
      '漫展抢票/BW/BML/谷子周边',
      '蔚蓝档案/二游抽卡/手游讨论',
      'LoveLive/少歌/偶像与声优',
      '番剧/VTB/小说/泛ACGN',
      '公共议题/规则争议/维权舆论',
      '高频刷屏/复读/站外短链',
      '科技数码/工具/消费日常',
      '观点交锋/评论区常规讨论',
      '纯表情/极短附和回复',
    ];
    const ST_NAMES = ['AICU全量归档', '官方接口原文一致', '评论区关闭(12002)', '没有该评论(12006)'];
    const TYPE_NAMES = { 1: '视频', 11: '图文动态', 12: '专栏', 17: '文字/转发动态' };
    const fmtCst = ts => {
      const d = new Date((ts + 8 * 3600) * 1000);
      return d.toISOString().slice(0, 19).replace('T', ' ');
    };

    let rows = null;
    let uids = ['647014264', '1703887112'];
    let page = 1;
    const size = 25;

    function buildPortraitStats(allRows) {
      if (!chipsHost || !insightsHost) return;
      const counts = new Array(CAT_NAMES.length).fill(0);
      let night = 0;
      let links = 0;
      for (const r of allRows) {
        counts[r[6]] = (counts[r[6]] || 0) + 1;
        const h = Number(fmtCst(r[5]).slice(11, 13));
        if (h >= 0 && h <= 5) night++;
        if (r[9].includes('b23.tv/') || r[9].includes('http')) links++;
      }
      chipsHost.replaceChildren();
      const allBtn = el('button', 'portrait-chip is-active', `全部分类 (${allRows.length})`);
      allBtn.type = 'button';
      allBtn.dataset.cat = '';
      chipsHost.append(allBtn);
      CAT_NAMES.forEach((name, idx) => {
        const b = el('button', 'portrait-chip', `${name} (${counts[idx]})`);
        b.type = 'button';
        b.dataset.cat = String(idx);
        chipsHost.append(b);
      });
      chipsHost.addEventListener('click', e => {
        const btn = e.target.closest('.portrait-chip');
        if (!btn) return;
        catSelect.value = btn.dataset.cat;
        page = 1;
        renderRows();
      });

      insightsHost.replaceChildren();
      [
        `● 作息与高频输出：全库 4,433 条中 ${(night / allRows.length * 100).toFixed(1)}%（${night} 条）发在凌晨 00:00–05:59；含短链复制传播 ${links} 条，遇到争议或抢票常在同一楼内连发 50～100+ 条同质发言。`,
        '● 把举报与客服施压当作习惯工具：从 2022 提倡“在评论区举报升等级”，到 2023 多次炫耀把单个视频评论“从600多条举报到100多条”“成功二三十个”“反手举报致人永久封号”，还具体教人“长按私信点举报-引战”，不通过就连续缠诉人工客服，并在 2023-07 抢票时连刷 85 条“当场割腕自杀”。',
        '● 大小号配合、小号卧底与鲜明双标：公开自述“用小号卧底进他们的一群”“找网图骗自拍”，1703887112 小号与大号在 4 个相同视频重合互动；2023 曾主张群聊天记录随便传 B站，2026-04-21 同日大小号齐斥抄袭，到了《魔法纪录》窃码事件却彻底反站窃码方并改名「帐号己㴤銷」威胁起诉。',
        '● 深度圈内玩家（并非无关路人）：发言长期涉足《蔚蓝档案》《原神》及偶像/漫展圈，并在 2024–2026 明确记录从《魔法纪录》国服游玩到自学转战日服至 2024 年 7 月关服，跟团购买双子月夜/月咲吧唧谷子。',
      ].forEach(line => insightsHost.append(el('p', '', line)));
    }

    function syncChipActive() {
      if (!chipsHost) return;
      const cur = catSelect.value;
      chipsHost.querySelectorAll('.portrait-chip').forEach(b => b.classList.toggle('is-active', b.dataset.cat === cur));
    }

    function renderRows() {
      if (!rows) return;
      syncChipActive();
      const q = qInput.value.trim().toLowerCase();
      const uidVal = uidSelect.value;
      const catVal = catSelect.value;
      const recOnly = recCheck.checked;
      const filtered = rows.filter(r => {
        if (uidVal !== '' && String(r[1]) !== uidVal) return false;
        if (catVal !== '' && String(r[6]) !== catVal) return false;
        if (recOnly && r[8] !== 1) return false;
        if (q && !(r[9].toLowerCase().includes(q) || r[0].includes(q) || String(r[2]).includes(q))) return false;
        return true;
      });
      const pages = Math.max(1, Math.ceil(filtered.length / size));
      if (page > pages) page = pages;
      const start = (page - 1) * size;
      const end = Math.min(start + size, filtered.length);
      countEl.textContent = filtered.length ? `匹配 ${filtered.length.toLocaleString('zh-CN')} 条 · 第 ${start + 1}–${end} 条` : '无匹配评论';
      pageInfo.textContent = `${page} / ${pages}`;
      prevBtn.disabled = page <= 1;
      nextBtn.disabled = page >= pages;
      resultsEl.replaceChildren();
      if (!filtered.length) {
        resultsEl.append(el('div', 'archive-empty', '未找到匹配记录，请尝试切换分类或更换关键词。'));
        return;
      }
      const frag = document.createDocumentFragment();
      for (const r of filtered.slice(start, end)) {
        const [rpid, uIdx, oid, type, rootRaw, ts, catIdx, stCode, recovered, msg] = r;
        const rootId = rootRaw || rpid;
        const card = el('article', 'archive-card');
        const head = el('div', 'archive-card-head');
        const left = el('div', '');
        left.append(el('span', 'source-badge', CAT_NAMES[catIdx] || '评论'));
        if (recovered === 1) left.append(el('span', 'archive-badge-recovered', '原被AI屏蔽 · 现已恢复'));
        head.append(left, el('span', 'comment-time', `${fmtCst(ts)} · ${ST_NAMES[stCode] || '归档'}`));
        const meta = el('div', 'comment-meta');
        meta.append(el('span', '', `UID ${uids[uIdx]}`), el('span', '', `RPID ${rpid}`), el('span', '', `${TYPE_NAMES[type] || '类型' + type} OID ${oid}`));
        const cp = el('button', 'copy-button', '复制 RPID');
        cp.type = 'button';
        cp.addEventListener('click', () => copyId(rpid));
        meta.append(cp);
        const links = el('div', 'card-links');
        const tLink = link('原楼入口 ↗', `https://www.bilibili.com/h5/comment/sub?oid=${encodeURIComponent(oid)}&pageType=${encodeURIComponent(type)}&root=${encodeURIComponent(rootId)}`);
        if (tLink) links.append(tLink);
        if (type === 1) {
          const vLink = link('所在视频 ↗', `https://www.bilibili.com/video/av${oid}`);
          if (vLink) links.append(vLink);
        }
        const aLink = link('官方接口原文 ↗', `https://api.bilibili.com/x/v2/reply/reply?type=${encodeURIComponent(type)}&oid=${encodeURIComponent(oid)}&root=${encodeURIComponent(rootId)}&pn=1&ps=20`);
        if (aLink) links.append(aLink);
        card.append(head, el('p', 'archive-msg', msg), meta, links);
        frag.append(card);
      }
      resultsEl.append(frag);
    }

    for (const ctrl of [uidSelect, catSelect, recCheck]) ctrl.addEventListener('change', () => { page = 1; renderRows(); });
    qInput.addEventListener('input', () => { page = 1; renderRows(); });
    prevBtn.addEventListener('click', () => { if (page > 1) { page--; renderRows(); } });
    nextBtn.addEventListener('click', () => { page++; renderRows(); });

    fetch(datasetPath, { cache: 'default' })
      .then(res => { if (!res.ok) throw new Error(`archive ${res.status}`); return res.json(); })
      .then(payload => {
        uids = payload.uids || uids;
        rows = payload.rows || [];
        badge.textContent = `已加载 ${rows.length.toLocaleString('zh-CN')} 条`;
        buildPortraitStats(rows);
        renderRows();
      })
      .catch(() => {
        badge.textContent = '离线提示';
        countEl.textContent = '本地 file:// 直接打开时浏览器限制读取同目录 JSON，请通过网站或 B站 Toy 打开浏览全量 4,433 条检索引擎。';
      });
  }

  init().catch(error => {
    console.error('Event records could not load', error);
    const status = document.getElementById('load-status');
    status.className = 'load-status error-message';
    status.textContent = '记录加载失败，请刷新页面重试。';
  });
})();
