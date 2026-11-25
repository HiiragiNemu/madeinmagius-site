import { PROGRAMS, escapeHtml, findSubItem, flattenSubs, renderContent, resolveHashRoute, serviceUrl } from './content.js?v=20261017-report1';
import { setupCrtEffects } from './effects.js?v=20260921-iosnative1';
import { loadMagirecoReleaseData } from './magireco-loader.js';

const body = document.body;
const iosStatic = document.documentElement.dataset.crtPlatform === 'ios-webkit';
const signal = document.getElementById('signal');
const screen = document.querySelector('.screen');
const boot = document.getElementById('boot');
const noiseCanvas = document.getElementById('noise');
const programButtons = Array.from(document.querySelectorAll('.menu-node[data-program]'));
const subMenu = document.getElementById('sub-menu');
const subsystem = document.querySelector('.subsystem');
const contentInner = document.getElementById('content-inner');
const contentPanel = document.getElementById('content-panel');
const stage = document.getElementById('stage');
const terminalUi = document.querySelector('.terminal-ui');
const connectorSvg = document.getElementById('connectors');
const statusLine = document.getElementById('status-line');
const clock = document.getElementById('clock');
const homeJump = document.getElementById('home-jump');
const pixelToggle = document.getElementById('pixel-toggle');
const warpImage = document.getElementById('crt-warp-map');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const mobileMode = matchMedia('(max-width: 760px)');

const data = { releases: null, docs: new Map(), integrity: null, magireco: null };
const expandedGroups = new Set();
let magirecoLoading = false;
let programId = 'home';
let subId = 'welcome';
let hoverSubId = null;
let mobileExpandedSub = null;
let shouldScrollActiveSub = false;

const contentAnchor = document.createComment('content-panel-anchor');
contentPanel.parentNode.insertBefore(contentAnchor, contentPanel);

const crt = setupCrtEffects({
  signal,
  screen,
  noiseCanvas,
  warpImage,
  reducedMotion
});

// Native scrolling on every platform. Retired query parameters have no effect.
const scrollBehavior = () => reducedMotion.matches ? 'auto' : 'smooth';

function applyPixelFont(enabled) {
  document.documentElement.dataset.pixelFont = enabled ? 'true' : 'false';
  if (pixelToggle) {
    pixelToggle.setAttribute('aria-pressed', String(enabled));
    pixelToggle.textContent = enabled ? 'PIXEL FONT / ON' : 'PIXEL FONT / OFF';
  }
}

function initPixelFont() {
  let enabled = true;
  try {
    const saved = localStorage.getItem('magius-pixel-font');
    if (saved === 'false') enabled = false;
  } catch {}
  applyPixelFont(enabled);

  function togglePixelFont() {
    const next = document.documentElement.dataset.pixelFont !== 'true';
    applyPixelFont(next);
    try { localStorage.setItem('magius-pixel-font', String(next)); } catch {}
    crt.pulse(.72);
    statusLine.textContent = next ? 'PIXEL FONT // ON' : 'PIXEL FONT // OFF';
  }

  pixelToggle?.addEventListener('click', togglePixelFont);
}

function selectedProgramButton() {
  return programButtons.find(button => button.dataset.program === programId);
}

function restoreContentPanel() {
  if (contentPanel.parentNode !== stage) {
    contentAnchor.parentNode.insertBefore(contentPanel, contentAnchor.nextSibling);
  }
}

// Scroll only the real mobile content viewport. scrollIntoView also moves
// overflow:hidden optical ancestors whose decorative overscan extends 12px.
function scrollWithinTerminal(target) {
  if (!terminalUi || !target || !terminalUi.contains(target)) return;
  const viewport = terminalUi.getBoundingClientRect();
  const box = target.getBoundingClientRect();
  const max = Math.max(0, terminalUi.scrollHeight - terminalUi.clientHeight);
  const top = Math.max(0, Math.min(max,
    terminalUi.scrollTop + box.top - viewport.top - terminalUi.clientTop));
  terminalUi.scrollTo({ top, behavior: scrollBehavior() });
}

function placeContentPanel(scrollIntoView = false) {
  if (!mobileMode.matches) {
    contentPanel.hidden = false;
    restoreContentPanel();
    return;
  }

  if (!mobileExpandedSub) {
    contentPanel.hidden = true;
    restoreContentPanel();
    return;
  }

  const selected = subMenu.querySelector('[data-sub="' + CSS.escape(mobileExpandedSub) + '"]');
  if (!selected) {
    contentPanel.hidden = true;
    restoreContentPanel();
    return;
  }

  contentPanel.hidden = false;
  selected.insertAdjacentElement('afterend', contentPanel);

  if (scrollIntoView) {
    requestAnimationFrame(() => {
      scrollWithinTerminal(selected);
    });
  }
}

function syncProgramButtons() {
  programButtons.forEach(button => {
    const selected = button.dataset.program === programId;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function animateRedraw() {
  // No forced layout or transient blur surfaces on the native iOS path.
  if (iosStatic) return;
  contentInner.classList.remove('is-redrawing');
  void contentInner.offsetWidth;
  contentInner.classList.add('is-redrawing');
  setTimeout(() => contentInner.classList.remove('is-redrawing'), 190);
}

function renderCurrentContent() {
  contentInner.innerHTML = renderContent(programId, subId, data);
  contentPanel.scrollTop = 0;
  animateRedraw();
  placeContentPanel(false);
}

// Hover changes only existing branch paint. Rebuilding SVG geometry inside the
// whole-screen optical filter can invalidate the entire filtered surface.
function updateConnectorHighlights() {
  const activeKey = connectorKeyForSub(subId);
  const hoverKey = hoverSubId ? connectorKeyForSub(hoverSubId) : null;
  connectorSvg.querySelectorAll('[data-connector-sub]').forEach(node => {
    const hot = node.dataset.connectorSub === activeKey || node.dataset.connectorSub === hoverKey;
    node.classList.toggle('is-hot', hot);
  });
}

function connectorKeyForSub(id) {
  const list = PROGRAMS[programId]?.subs || [];
  for (const item of list) {
    if (Array.isArray(item.children)) {
      if (item.id === id || item.children.some(child => child.id === id)) return item.id;
    } else if (item.id === id) {
      return item.id;
    }
  }
  return id;
}

function drawConnectors() {
  if (mobileMode.matches) {
    connectorSvg.innerHTML = '';
    return;
  }

  const activeProgram = selectedProgramButton();
  const subs = Array.from(subMenu.querySelectorAll('.sub-node--top'));
  if (!activeProgram || !subs.length) {
    connectorSvg.innerHTML = '';
    return;
  }

  const stageRect = stage.getBoundingClientRect();
  const programRect = activeProgram.getBoundingClientRect();
  const menuRect = typeof subMenu.getBoundingClientRect === 'function'
    ? subMenu.getBoundingClientRect()
    : null;
  const startX = programRect.right - stageRect.left + 2;
  const startY = programRect.top + programRect.height / 2 - stageRect.top;

  const allPoints = subs.map(button => {
    const rect = button.getBoundingClientRect();
    return {
      button,
      key: button.dataset.sub || button.dataset.group || '',
      endX: rect.left - stageRect.left - 12,
      endY: rect.top + rect.height / 2 - stageRect.top,
    };
  });

  const visibleTop = menuRect ? menuRect.top - stageRect.top + 2 : -Infinity;
  const visibleBottom = menuRect ? menuRect.bottom - stageRect.top - 2 : Infinity;
  const points = allPoints.filter(point => point.endY >= visibleTop && point.endY <= visibleBottom);
  if (!points.length) {
    connectorSvg.innerHTML = '';
    return;
  }

  const firstEndX = Math.min(...points.map(point => point.endX));
  const trunkX = Math.max(14, firstEndX - 24);
  const minY = Math.min(startY, ...points.map(point => point.endY));
  const maxY = Math.max(startY, ...points.map(point => point.endY));

  const lines = [
    '<path class="connector-path" d="M ' + startX.toFixed(1) + ' ' + startY.toFixed(1) +
      ' H ' + trunkX.toFixed(1) +
      ' M ' + trunkX.toFixed(1) + ' ' + minY.toFixed(1) +
      ' V ' + maxY.toFixed(1) + '"/>'
  ];

  for (const point of points) {
    lines.push(
      '<path class="connector-path" data-connector-sub="' + escapeHtml(point.key) +
      '" d="M ' + trunkX.toFixed(1) + ' ' + point.endY.toFixed(1) +
      ' H ' + point.endX.toFixed(1) + '"/>' +
      '<circle class="connector-dot" data-connector-sub="' + escapeHtml(point.key) +
      '" cx="' + point.endX.toFixed(1) +
      '" cy="' + point.endY.toFixed(1) +
      '" r="2.1"/>'
    );
  }

  const activeKey = connectorKeyForSub(subId);
  const hotPoint = points.find(point => point.key === activeKey);
  if (hotPoint) {
    lines.push(
      '<path class="connector-path is-hot" d="M ' + startX.toFixed(1) + ' ' + startY.toFixed(1) +
      ' H ' + trunkX.toFixed(1) +
      ' V ' + hotPoint.endY.toFixed(1) +
      ' H ' + hotPoint.endX.toFixed(1) + '"/>'
    );
  }

  connectorSvg.setAttribute(
    'viewBox',
    '0 0 ' + Math.max(1, stageRect.width) + ' ' + Math.max(1, stageRect.height)
  );
  connectorSvg.innerHTML = lines.join('');
  updateConnectorHighlights();
}

function buildSubMenu() {
  restoreContentPanel();

  const list = PROGRAMS[programId].subs;
  const leafIds = [];
  for (const item of list) {
    if (Array.isArray(item.children)) {
      for (const child of item.children) leafIds.push(child.id);
    } else {
      leafIds.push(item.id);
    }
  }
  if (!leafIds.includes(subId) && leafIds.length) {
    subId = leafIds[0];
  }

  subMenu.innerHTML = '';

  list.forEach(item => {
    if (Array.isArray(item.children)) {
      const expanded = typeof expandedGroups !== 'undefined' && expandedGroups.has(item.id);
      const hasActiveChild = item.children.some(child => child.id === subId);

      const wrap = document.createElement('div');
      wrap.className = 'sub-group' + (expanded ? ' is-expanded' : '');
      wrap.dataset.groupWrap = item.id;

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'sub-node sub-node--top sub-node--group' +
        (expanded ? ' is-expanded' : '') +
        (hasActiveChild ? ' has-active-child' : '');
      toggle.dataset.group = item.id;
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.setAttribute('aria-controls', 'sub-tree-' + item.id);
      toggle.innerHTML =
        '<span class="sub-group__title"><b>&gt;' + escapeHtml(item.label) + '</b><small>' +
        escapeHtml((item.note || '') + ' · ' + (expanded ? '收起' : '展开')) + '</small></span>' +
        '<span class="sub-group__toggle" aria-hidden="true">' + (expanded ? '[-]' : '[+]') + '</span>';

      toggle.addEventListener('pointerenter', () => {
        hoverSubId = item.id;
        updateConnectorHighlights();
      });
      toggle.addEventListener('pointerleave', () => {
        hoverSubId = null;
        updateConnectorHighlights();
      });
      toggle.addEventListener('click', () => {
        toggleGroup(item.id, { focusToggle: false });
      });

      const tree = document.createElement('div');
      tree.id = 'sub-tree-' + item.id;
      tree.className = 'sub-tree';
      tree.setAttribute('role', 'group');
      tree.setAttribute('aria-label', item.label + ' 子菜单');
      tree.hidden = !expanded;

      let currentSection = null;
      item.children.forEach(child => {
        if (child.section && child.section !== currentSection) {
          currentSection = child.section;
          const divider = document.createElement('div');
          divider.className = 'sub-tree__divider';
          divider.textContent = '// ' + child.section;
          tree.append(divider);
        }

        const branch = document.createElement('div');
        const selected = child.id === subId;
        branch.className = 'sub-branch' + (selected ? ' is-active' : '');
        branch.dataset.branchSub = child.id;

        const childBtn = document.createElement('button');
        childBtn.type = 'button';
        childBtn.className = 'sub-node sub-node--child' + (selected ? ' is-selected' : '');
        childBtn.dataset.sub = child.id;
        childBtn.dataset.parentGroup = item.id;
        childBtn.setAttribute('aria-expanded', String(mobileMode.matches && child.id === mobileExpandedSub));
        childBtn.innerHTML =
          '<span class="sub-child__head"><b>' + escapeHtml(child.label) + '</b>' +
          (child.tag ? '<span class="sub-child__tag">' + escapeHtml(child.tag) + '</span>' : '') +
          '</span><small>' + escapeHtml(child.note || '') + '</small>';

        childBtn.addEventListener('pointerenter', () => {
          hoverSubId = child.id;
          updateConnectorHighlights();
        });
        childBtn.addEventListener('pointerleave', () => {
          hoverSubId = null;
          updateConnectorHighlights();
        });
        childBtn.addEventListener('click', () => {
          selectSub(child.id, true);
        });

        branch.append(childBtn);
        tree.append(branch);
      });

      wrap.append(toggle, tree);
      subMenu.append(wrap);
      return;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sub-node sub-node--top' + (item.id === subId ? ' is-selected' : '');
    button.dataset.sub = item.id;
    button.setAttribute('aria-expanded', String(mobileMode.matches && item.id === mobileExpandedSub));
    button.innerHTML =
      '<b>&gt;' + escapeHtml(item.label) + '</b><small>' + escapeHtml(item.note || '') + '</small>';

    button.addEventListener('pointerenter', () => {
      hoverSubId = item.id;
      updateConnectorHighlights();
    });
    button.addEventListener('pointerleave', () => {
      hoverSubId = null;
      updateConnectorHighlights();
    });
    button.addEventListener('click', () => {
      selectSub(item.id, true);
    });

    subMenu.append(button);
  });

  placeContentPanel(false);
  requestAnimationFrame(drawConnectors);
}

function scrollSubsystemIntoView() {
  if (!mobileMode.matches) return;
  requestAnimationFrame(() => {
    scrollWithinTerminal(subsystem);
  });
}

function scrollSubNodeIntoView(target) {
  if (!target) return;
  if (mobileMode.matches) {
    scrollWithinTerminal(target);
    return;
  }
  if (!subMenu || !subMenu.contains(target)) return;
  const view = subMenu.getBoundingClientRect();
  const box = target.getBoundingClientRect();
  const pad = 10;
  if (box.top < view.top + pad) {
    const top = Math.max(0, subMenu.scrollTop + (box.top - view.top) - pad);
    subMenu.scrollTo({ top, behavior: scrollBehavior() });
  } else if (box.bottom > view.bottom - pad) {
    const max = Math.max(0, subMenu.scrollHeight - subMenu.clientHeight);
    const top = Math.min(max, subMenu.scrollTop + (box.bottom - view.bottom) + pad);
    subMenu.scrollTo({ top, behavior: scrollBehavior() });
  }
}

function ensureGroupVisible(wrap) {
  if (!wrap || mobileMode.matches || !subMenu || !subMenu.contains(wrap)) return;
  const view = subMenu.getBoundingClientRect();
  const box = wrap.getBoundingClientRect();
  const toggle = wrap.querySelector('.sub-node--group');
  const toggleBox = toggle ? toggle.getBoundingClientRect() : box;
  const pad = 8;
  if (box.bottom > view.bottom - pad && toggleBox.top > view.top + pad) {
    const maxShift = Math.max(0, toggleBox.top - (view.top + pad));
    const shift = Math.min(box.bottom - (view.bottom - pad), maxShift);
    const maxScroll = Math.max(0, subMenu.scrollHeight - subMenu.clientHeight);
    subMenu.scrollTo({ top: Math.min(maxScroll, subMenu.scrollTop + shift), behavior: scrollBehavior() });
  }
}

function revealActiveSub() {
  if (!shouldScrollActiveSub) return;
  shouldScrollActiveSub = false;
  if (mobileMode.matches) {
    placeContentPanel(true);
    return;
  }
  requestAnimationFrame(() => {
    const activeButton = subMenu.querySelector('[data-sub="' + CSS.escape(subId) + '"]');
    scrollSubNodeIntoView(activeButton);
    drawConnectors();
  });
}

function toggleGroup(groupId, options = {}) {
  const { force, focusFirstChild = false, focusToggle = false, silent = false } = options;
  const group = (PROGRAMS[programId]?.subs || []).find(item => item.id === groupId && Array.isArray(item.children));
  if (!group) return;

  const wasExpanded = expandedGroups.has(groupId);
  const nextExpanded = typeof force === 'boolean' ? force : !wasExpanded;
  if (nextExpanded === wasExpanded && !focusFirstChild && !focusToggle) return;

  if (nextExpanded) {
    expandedGroups.add(groupId);
  } else {
    expandedGroups.delete(groupId);
    if (mobileMode.matches && mobileExpandedSub && group.children.some(child => child.id === mobileExpandedSub)) {
      mobileExpandedSub = null;
      placeContentPanel(false);
    }
  }

  const wrap = subMenu.querySelector('[data-group-wrap="' + CSS.escape(groupId) + '"]');
  const toggle = wrap?.querySelector('.sub-node--group');
  const tree = wrap?.querySelector('.sub-tree');
  if (wrap && toggle && tree) {
    wrap.classList.toggle('is-expanded', nextExpanded);
    toggle.classList.toggle('is-expanded', nextExpanded);
    toggle.setAttribute('aria-expanded', String(nextExpanded));
    const toggleBadge = toggle.querySelector('.sub-group__toggle');
    if (toggleBadge) toggleBadge.textContent = nextExpanded ? '[-]' : '[+]';
    const toggleNote = toggle.querySelector('.sub-group__title small');
    if (toggleNote) toggleNote.textContent = (group.note || '') + ' · ' + (nextExpanded ? '收起' : '展开');
    tree.hidden = !nextExpanded;
    if (!nextExpanded && mobileMode.matches) {
      tree.querySelectorAll('.sub-node--child').forEach(btn => btn.setAttribute('aria-expanded', 'false'));
    }
  }

  if (!silent) {
    statusLine.textContent = programId.toUpperCase() + ' // ' + group.label + ' // ' +
      (nextExpanded ? 'EXPANDED (' + group.children.length + ')' : 'COLLAPSED');
    crt.pulse(nextExpanded ? .62 : .42);
  }

  if (nextExpanded && focusFirstChild) {
    const firstChild = tree?.querySelector('.sub-node--child');
    firstChild?.focus();
    requestAnimationFrame(() => {
      scrollSubNodeIntoView(firstChild);
      drawConnectors();
    });
  } else if (nextExpanded) {
    requestAnimationFrame(() => {
      ensureGroupVisible(wrap);
      drawConnectors();
    });
  } else {
    if (focusToggle) toggle?.focus();
    requestAnimationFrame(() => {
      scrollSubNodeIntoView(toggle);
      drawConnectors();
    });
  }
}

function selectProgram(id, focusSub = false, mobileScroll = true) {
  if (!PROGRAMS[id]) return;

  programId = id;
  const firstLeaf = flattenSubs(id)[0];
  subId = firstLeaf ? firstLeaf.id : '';
  expandedGroups.clear();
  if (mobileMode.matches) mobileExpandedSub = null;
  syncProgramButtons();
  buildSubMenu();
  renderCurrentContent();

  statusLine.textContent = 'PROGRAM // ' + id.toUpperCase() + ' // SUBSYSTEM READY';
  history.replaceState(null, '', '#' + id + '/' + subId);
  crt.pulse(1.05);

  if (mobileMode.matches && mobileScroll) {
    scrollSubsystemIntoView();
  }

  if (focusSub && !mobileMode.matches) {
    requestAnimationFrame(() => subMenu.querySelector('.sub-node')?.focus());
  }
}

function selectSub(id, focus = false) {
  const found = findSubItem(programId, id);
  if (!found) return;

  if (found.parentGroup && !expandedGroups.has(found.parentGroup.id)) {
    toggleGroup(found.parentGroup.id, { force: true, silent: true });
  }

  if (mobileMode.matches && mobileExpandedSub === id) {
    mobileExpandedSub = null;
    Array.from(subMenu.querySelectorAll('.sub-node[data-sub]')).forEach(button => {
      const selected = button.dataset.sub === id;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-expanded', 'false');
    });
    placeContentPanel(false);
    statusLine.textContent = programId.toUpperCase() + ' // ' + (programId === 'home' ? found.item.label : id.toUpperCase()) + ' // COLLAPSED';
    crt.pulse(.42);
    return;
  }

  subId = id;
  if (programId === 'home' && id === 'magireco-private-server') loadMagirecoRelease();
  if (mobileMode.matches) mobileExpandedSub = id;

  Array.from(subMenu.querySelectorAll('.sub-node[data-sub]')).forEach(button => {
    const selected = button.dataset.sub === id;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-expanded', String(mobileMode.matches && selected));
  });
  Array.from(subMenu.querySelectorAll('.sub-branch[data-branch-sub]')).forEach(branch => {
    branch.classList.toggle('is-active', branch.dataset.branchSub === id);
  });
  Array.from(subMenu.querySelectorAll('.sub-node--group[data-group]')).forEach(toggle => {
    toggle.classList.toggle('has-active-child', found.parentGroup?.id === toggle.dataset.group);
  });

  renderCurrentContent();
  placeContentPanel(mobileMode.matches);

  statusLine.textContent = found.parentGroup
    ? programId.toUpperCase() + ' // ' + found.parentGroup.label + ' // ' + found.item.label
    : programId.toUpperCase() + ' // ' + (programId === 'home' ? found.item.label : id.toUpperCase());
  history.replaceState(null, '', '#' + programId + '/' + subId);
  crt.pulse(.78);

  const selectedButton = subMenu.querySelector('[data-sub="' + CSS.escape(id) + '"]');
  if (!mobileMode.matches) {
    scrollSubNodeIntoView(selectedButton);
  }
  drawConnectors();

  if (focus && !mobileMode.matches) {
    selectedButton?.focus();
  }
}

function parseHash() {
  const route = resolveHashRoute(location.hash);
  if (!route) return;

  programId = route.programId;
  subId = route.subId;
  expandedGroups.clear();
  if (route.expandGroupId) {
    expandedGroups.add(route.expandGroupId);
  }
  shouldScrollActiveSub = route.hasSub;
  if (mobileMode.matches) mobileExpandedSub = route.hasSub ? subId : null;
}

function setupProgramInteractions() {
  programButtons.forEach(button => {
    button.addEventListener('pointerenter', () => {
      statusLine.textContent = 'TARGET // ' + button.dataset.program.toUpperCase();
    });
    button.addEventListener('click', () => {
      selectProgram(button.dataset.program, false, true);
    });
  });
}

function visibleSubButtons() {
  return Array.from(subMenu.querySelectorAll('.sub-node')).filter(
    button => !button.closest('[hidden]')
  );
}

function keyboardNavigation(event) {
  if (event.defaultPrevented) return;
  const active = document.activeElement;
  const programIndex = programButtons.indexOf(active);
  const subButtons = visibleSubButtons();
  const subIndex = subButtons.indexOf(active);

  if (programIndex >= 0) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      const next = (programIndex + delta + programButtons.length) % programButtons.length;
      programButtons[next].focus();
    } else if (event.key === 'Enter' || event.key === 'ArrowRight') {
      event.preventDefault();
      selectProgram(active.dataset.program, true, false);
    }
    return;
  }

  if (subIndex >= 0) {
    const groupId = active.dataset.group;
    const parentGroupId = active.dataset.parentGroup;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      const next = (subIndex + delta + subButtons.length) % subButtons.length;
      subButtons[next].focus();
      scrollSubNodeIntoView(subButtons[next]);
      return;
    }

    if (groupId) {
      const expanded = expandedGroups.has(groupId);
      if (event.key === 'Enter') {
        event.preventDefault();
        toggleGroup(groupId, { force: !expanded, focusFirstChild: !expanded, focusToggle: expanded });
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (!expanded) {
          toggleGroup(groupId, { force: true, focusFirstChild: true });
        } else {
          const firstChild = subMenu.querySelector('[data-parent-group="' + CSS.escape(groupId) + '"]');
          firstChild?.focus();
          scrollSubNodeIntoView(firstChild);
        }
      } else if (event.key === 'Escape' || event.key === 'ArrowLeft') {
        event.preventDefault();
        if (expanded) {
          toggleGroup(groupId, { force: false, focusToggle: true });
        } else {
          selectedProgramButton()?.focus();
        }
      }
      return;
    }

    if (event.key === 'Enter' || event.key === 'ArrowRight') {
      event.preventDefault();
      selectSub(active.dataset.sub, false);
      if (!mobileMode.matches) contentPanel.focus();
    } else if (event.key === 'Escape' || event.key === 'ArrowLeft') {
      event.preventDefault();
      if (parentGroupId && expandedGroups.has(parentGroupId)) {
        toggleGroup(parentGroupId, { force: false, focusToggle: true });
      } else {
        selectedProgramButton()?.focus();
      }
    }
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    if (active && contentPanel.contains(active)) {
      const currentSub = subMenu.querySelector('[data-sub="' + CSS.escape(subId) + '"]');
      if (currentSub && !currentSub.closest('[hidden]')) {
        currentSub.focus();
        scrollSubNodeIntoView(currentSub);
        return;
      }
      const found = findSubItem(programId, subId);
      if (found?.parentGroup) {
        const groupBtn = subMenu.querySelector('[data-group="' + CSS.escape(found.parentGroup.id) + '"]');
        if (groupBtn) {
          groupBtn.focus();
          scrollSubNodeIntoView(groupBtn);
          return;
        }
      }
    }
    selectedProgramButton()?.focus();
  }
}

contentPanel.addEventListener('click', async event => {
  const button = event.target.closest('[data-copy-url]');
  if (!button) return;

  const url = button.dataset.copyUrl;
  const fallback = button.dataset.copyFallback || url;
  const original = button.textContent;

  button.disabled = true;
  button.textContent = 'READING...';

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('download failed');
    const source = await response.text();

    if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
    await navigator.clipboard.writeText(source);

    button.textContent = 'COPIED ✓';
    statusLine.textContent = programId.toUpperCase() + ' // SCRIPT COPIED';
    setTimeout(() => {
      button.textContent = original;
      button.disabled = false;
    }, 1600);
  } catch {
    button.textContent = 'OPEN TEXT ↗';
    button.disabled = false;
    window.open(fallback, '_blank', 'noopener,noreferrer');
    setTimeout(() => {
      button.textContent = original;
    }, 1600);
  }
});

async function loadMagirecoRelease() {
  if (magirecoLoading) return;
  magirecoLoading = true;
  data.magireco = { state: 'loading' };
  if (programId === 'home' && subId === 'magireco-private-server') renderCurrentContent();
  try {
    data.magireco = await loadMagirecoReleaseData({
      liveUrl: serviceUrl('./api/magireco'),
      onUpdate(current) {
        data.magireco = current;
        if (programId === 'home' && subId === 'magireco-private-server') renderCurrentContent();
      },
    });
  } finally {
    magirecoLoading = false;
    if (programId === 'home' && subId === 'magireco-private-server') renderCurrentContent();
  }
}

contentInner.addEventListener('click', event => {
  if (event.target.closest('[data-magireco-refresh]')) loadMagirecoRelease();
});

async function loadData() {
  try {
    const response = await fetch('./data/releases.json', { cache: 'no-cache' });
    if (response.ok) data.releases = await response.json();
  } catch {}

  try {
    const live = await fetch(serviceUrl('./api/releases'), {
      headers: { accept: 'application/json' },
      cache: 'no-store'
    });
    if (live.ok) {
      const payload = await live.json();
      if (payload?.projects) {
        if (!data.releases) data.releases = { projects: {} };
        data.releases.projects = { ...data.releases.projects, ...payload.projects };
      }
    }
  } catch {}

  try {
    const response = await fetch('./data/exedra-docs.json', { cache: 'no-cache' });
    if (response.ok) {
      const payload = await response.json();
      data.docs = new Map((payload.docs || []).map(doc => [doc.id, doc]));
    }
  } catch {}

  try {
    const response = await fetch('./data/exedra-integrity.json', { cache: 'no-cache' });
    if (response.ok) data.integrity = await response.json();
  } catch {}

  renderCurrentContent();
}

function updateClock() {
  clock.textContent = new Date().toLocaleTimeString('en-GB', { hour12: false });
}

function bootSequence() {
  const seen = sessionStorage.getItem('magius-link-booted');
  const wait = reducedMotion.matches ? 100 : (seen ? 760 : 1800);

  setTimeout(() => {
    if (!iosStatic) body.dataset.wake = 'true';
    boot.classList.add('is-hidden');
    sessionStorage.setItem('magius-link-booted', '1');

    if (!iosStatic) setTimeout(() => {
      body.dataset.wake = 'false';
    }, 380);
  }, wait);
}

homeJump.addEventListener('click', event => {
  event.preventDefault();
  selectProgram('home', false, false);
  if (mobileMode.matches) {
    selectSub('welcome', false);
  }
  if (terminalUi) {
    requestAnimationFrame(() => {
      terminalUi.scrollTo({
        top: 0,
        behavior: scrollBehavior()
      });
    });
  }
});

/* The CRT displacement bends pixels but DOM hit boxes stay rectangular.
   Let the green hardware bar accept taps in a slightly expanded visual zone. */
document.querySelector('.masthead__bar')?.addEventListener('pointerup', event => {
  if (event.target.closest('button,a')) return;
  for (const control of [pixelToggle, document.getElementById('crt-mode'), homeJump]) {
    if (!control) continue;
    const rect = control.getBoundingClientRect();
    const pad = 16;
    if (
      event.clientX >= rect.left - pad &&
      event.clientX <= rect.right + pad &&
      event.clientY >= rect.top - pad &&
      event.clientY <= rect.bottom + pad
    ) {
      control.click();
      break;
    }
  }
});

parseHash();
initPixelFont();
setupProgramInteractions();
syncProgramButtons();
buildSubMenu();
renderCurrentContent();
revealActiveSub();
loadData();
if (programId === 'home' && subId === 'magireco-private-server') loadMagirecoRelease();
updateClock();
bootSequence();

setInterval(updateClock, 1000);
addEventListener('keydown', keyboardNavigation);

let connectorScrollRaf = 0;
subMenu.addEventListener('scroll', () => {
  if (mobileMode.matches || connectorScrollRaf) return;
  connectorScrollRaf = requestAnimationFrame(() => {
    connectorScrollRaf = 0;
    drawConnectors();
  });
}, { passive: true });

mobileMode.addEventListener?.('change', event => {
  if (event.matches) {
    const route = resolveHashRoute(location.hash);
    mobileExpandedSub = route?.hasSub ? subId : null;
  } else {
    mobileExpandedSub = subId;
  }
  buildSubMenu();
  renderCurrentContent();
});

addEventListener('resize', () => {
  requestAnimationFrame(drawConnectors);
});

addEventListener('hashchange', () => {
  parseHash();
  if (programId === 'home' && subId === 'magireco-private-server') loadMagirecoRelease();
  syncProgramButtons();
  buildSubMenu();
  renderCurrentContent();
  revealActiveSub();
});

addEventListener('pagehide', event => {
  // Cached pages resume with the existing optical observer.
  if (event.persisted) return;
  crt.destroy();
});
