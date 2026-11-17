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
      const packagedImage = /^reporting-records-20261116\/(?:source-[\da-z]+\.(?:png|webp)|notice-\d+\.jpg)$/.test(href) && url.origin === location.origin;
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
      button.append(el('span', 'image-error', '图片暂未载入，点击“打开大图”重试。'));
    });
    button.append(img, el('span', 'expand-hint', '点击放大 ↗'));
    button.addEventListener('click', () => openImage(record.index, button));
    const body = el('figcaption', 'image-body');
    const label = el('div', 'card-heading');
    label.append(el('p', 'card-label', item.label || groupLabel), el('span', `version-badge ${item.version === 'redacted' ? 'is-redacted' : ''}`, item.versionLabel));
    body.append(label, el('h3', '', item.title), el('p', 'image-caption', item.caption || ''));
    if (item.redactionNote) body.append(el('p', 'redaction-note', `公开版本：${item.redactionNote}`));
    const links = el('div', 'card-links');
    const original = link('打开大图 ↗', item.src);
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

  function renderSummary(summary, videoRecords, data) {
    const lockedVideos = videoRecords.filter(item => item.status.startsWith('锁定')).length;
    const returnedVideos = videoRecords.filter(item => item.status.startsWith('退回')).length;
    const totalArchive = data.archiveSummary?.totalRecords || 4433;
    const metrics = [
      [data.gallery.length, '全部无删改事件原图', '00 至 18 完整原件（无黑框遮盖）'],
      [summary.dynamicEvents, '动态移除通知（11-16）', `涉及 ${summary.dynamicObjects} 个动态 · 其中 ${summary.rightsHolderEvents} 条权利人投诉`],
      ['351 → 240+', 'BV1q4Wa67EB2 评论消减', `11-16 录屏后台 351 条；11-18 已被举报至约 240+ 且 QQ 遭封禁`, 'metric-value-text'],
      [totalArchive, '全量历史公开发言可检', `647014264 (4,329) + 1703887112 (104) · ${summary.videoObjects} 个核对视频（${lockedVideos} 锁/${returnedVideos} 退）`],
    ];
    const container = document.getElementById('summary-metrics');
    for (const [value, label, detail, valueClass = ''] of metrics) {
      const card = el('div', 'metric-card');
      card.append(el('strong', `metric-value ${valueClass}`.trim(), String(value)), el('span', 'metric-label', label), el('small', 'metric-detail', detail));
      container.append(card);
    }
    const esc = data.escalation20261118;
    const escBox = document.getElementById('escalation-box');
    if (esc && escBox) {
      document.getElementById('escalation-title').textContent = esc.headline || '2026-11-18 最新进展';
      const ul = document.getElementById('escalation-list');
      ul.replaceChildren();
      for (const text of esc.items || []) ul.append(el('li', '', text));
      escBox.hidden = false;
    }
  }

  function renderGalleryIndex(gallery) {
    const container = document.getElementById('gallery-index');
    for (const item of gallery) {
      const a = el('a', '', item.number);
      a.href = `#${item.id}`;
      a.setAttribute('aria-label', `图 ${item.number}：${item.title}`);
      container.append(a);
    }
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
        const button = el('button', 'table-image-link', imageId.replace('notice-', '通知图 '));
        button.type = 'button';
        button.addEventListener('click', () => openImage(record.index, button));
        cell.append(button);
      }
      if (!cell.childElementCount) cell.append(el('span', 'table-note', '通知台账'));
      row.append(cell);
      tbody.append(row);
    }
    document.getElementById('notice-record-count').textContent = String(records.length);
    document.getElementById('dynamic-visible-count').textContent = `显示 ${visible.length} / ${records.length} 条`;
  }

  function renderVideos(records) {
    const tbody = document.getElementById('video-table-body');
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
    for (const item of records) {
      const row = el('tr');
      row.append(el('td', 'date-cell', dateLabel(item.noticeAt)), el('td', 'id-cell', item.rpid), el('td', '', item.reason));
      tbody.append(row);
    }
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
      showToast('已复制评论ID');
    } catch { showToast(`评论ID：${value}`); }
  }

  function commentCard(item, index) {
    const article = el('article', 'comment-card');
    article.id = item.id || `comment-${item.rpid}`;
    article.setAttribute('aria-label', `${item.dateLabel}的公开评论`);
    const header = el('div', 'comment-header');
    header.append(el('span', 'comment-number', `COMMENT / ${String(index + 1).padStart(2, '0')}`), el('span', 'source-badge', item.badge || '官方接口原文'));
    const time = el('time', 'comment-time', item.dateLabel);
    time.dateTime = item.date;
    const message = el('blockquote', 'comment-message', item.message);
    const meta = el('div', 'comment-meta');
    meta.append(el('span', '', `UID ${item.uid}`), el('span', '', `评论ID ${item.rpid}`));
    const copy = el('button', 'copy-button', '复制评论ID');
    copy.type = 'button';
    copy.addEventListener('click', () => copyId(item.rpid));
    meta.append(copy);
    const links = el('div', 'card-links');
    addLinks(links, item.links);
    article.append(header, time, message);
    if (item.context) article.append(el('p', 'comment-context', item.context));
    article.append(meta, links, el('small', 'verified-time', `核验时间：${item.verifiedAt}`));
    return article;
  }

  function setZoom(zoomed) {
    viewport.classList.toggle('is-zoomed', zoomed);
    const button = document.getElementById('viewer-zoom');
    button.textContent = zoomed ? '适合屏幕' : '放大阅读';
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
    document.getElementById('viewer-caption').textContent = `${item.versionLabel} · ${item.caption || ''}${item.redactionNote ? ` 公开版本：${item.redactionNote}` : ''}`;
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
    if (data.schemaVersion !== 2) throw new Error('Unsupported event-record schema');
    for (const [id, key] of Object.entries({
      'summary-note': 'summaryNote', 'gallery-note': 'galleryNote', 'notice-note': 'noticeNote',
      'dynamic-record-note': 'dynamicRecordNote', 'video-record-note': 'videoRecordNote',
      'own-comment-note': 'ownCommentNote', 'record-source-note': 'recordSourceNote',
      'comment-note': 'commentNote', 'comment-link-note': 'commentLinkNote',
    })) document.getElementById(id).textContent = data[key] || '';
    document.querySelector('[data-count="gallery"]').textContent = String(data.gallery.length);
    document.querySelector('[data-count="dynamicEvents"]').textContent = String(data.dynamicRecords.length);
    document.querySelector('[data-count="comments"]').textContent = String(data.comments.length);
    renderSummary(data.summary, data.videoRecords, data);
    renderGalleryIndex(data.gallery);
    for (const item of data.gallery || []) document.getElementById('gallery-grid').append(imageCard(item, '作者说明图'));
    for (const item of data.notices || []) document.getElementById('notice-grid').append(imageCard(item, '平台处理通知'));
    document.getElementById('attack-message').textContent = data.attackQuote.text;
    document.getElementById('attack-attribution').textContent = data.attackQuote.attribution;
    renderNoticeTable(data.dynamicRecords);
    document.getElementById('dynamic-reason-filter').addEventListener('change', event => renderNoticeTable(data.dynamicRecords, event.target.value));
    renderVideos(data.videoRecords);
    renderOwnComments(data.ownCommentRemovals);
    (data.comments || []).forEach((item, index) => document.getElementById('comment-list').append(commentCard(item, index)));
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
    if (!badge || !resultsEl) return;

    const CAT_NAMES = ['举报/客服/自残施压', '冲突/小号/双标/删评', '魔法纪录/Exedra', '普通讨论', '简短/表情'];
    const ST_NAMES = ['AICU全量归档', '官方接口原文一致', '评论区关闭(12002)', '没有该评论(12006)'];
    const TYPE_NAMES = { 1: '视频', 11: '图文动态', 12: '专栏', 17: '转发/文字动态' };
    const fmtCst = ts => {
      const d = new Date((ts + 8 * 3600) * 1000);
      return d.toISOString().slice(0, 19).replace('T', ' ');
    };

    let rows = null;
    let uids = ['647014264', '1703887112'];
    let page = 1;
    const size = 25;

    function renderRows() {
      if (!rows) return;
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
      countEl.textContent = filtered.length ? `匹配 ${filtered.length.toLocaleString('zh-CN')} 条 · 显示 ${start + 1}–${end}` : '无匹配评论';
      pageInfo.textContent = `${page} / ${pages}`;
      prevBtn.disabled = page <= 1;
      nextBtn.disabled = page >= pages;
      resultsEl.replaceChildren();
      if (!filtered.length) {
        resultsEl.append(el('div', 'archive-empty', '未找到匹配记录，请清空或调整关键词/筛选条件。'));
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
        const cp = el('button', 'copy-button', '复制RPID');
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
        renderRows();
      })
      .catch(() => {
        badge.textContent = '离线 file:// 提示';
        countEl.textContent = '本地 file:// 直接打开时浏览器限制 fetch 读取同目录 JSON；请通过网站在线访问或本地 HTTP 服务 / B站 Toy 界面查看全量 4,433 条检索（上方 21 张原图与 18 条核心精选均可离线查看）。';
      });
  }

  init().catch(error => {
    console.error('Event records could not load', error);
    const status = document.getElementById('load-status');
    status.className = 'load-status error-message';
    status.textContent = '记录暂未载入，请刷新页面重试。';
  });
})();
