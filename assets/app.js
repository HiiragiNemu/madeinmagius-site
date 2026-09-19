import { PROGRAMS, escapeHtml, renderContent } from './content.js';
import { setupCrtEffects, setInteractiveGlow } from './effects.js';

const body = document.body;
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
const pixelFontToggle = document.getElementById('pixel-font-toggle');
const pixelToggle = document.getElementById('pixel-toggle');
const warpImage = document.getElementById('crt-warp-map');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const mobileMode = matchMedia('(max-width: 760px)');

const data = { releases: null, docs: new Map(), integrity: null };
let programId = 'home';
let subId = 'welcome';
let hoverSubId = null;

const contentAnchor = document.createComment('content-panel-anchor');
contentPanel.parentNode.insertBefore(contentAnchor, contentPanel);

const crt = setupCrtEffects({
  signal,
  screen,
  noiseCanvas,
  warpImage,
  reducedMotion
});

function applyPixelFont(enabled) {
  document.documentElement.dataset.pixelFont = enabled ? 'true' : 'false';
  if (pixelToggle) {
    pixelToggle.setAttribute('aria-pressed', String(enabled));
    pixelToggle.textContent = enabled ? 'PIXEL ON' : 'PIXEL OFF';
  }
}

function initPixelFont() {
  let enabled = true;
  try {
    const saved = localStorage.getItem('magius-pixel-font');
    if (saved === 'false') enabled = false;
  } catch {}
  applyPixelFont(enabled);

  pixelToggle?.addEventListener('click', () => {
    const next = document.documentElement.dataset.pixelFont !== 'true';
    applyPixelFont(next);
    try { localStorage.setItem('magius-pixel-font', String(next)); } catch {}
    crt.pulse(.72);
    statusLine.textContent = next ? 'PIXEL FONT // ON' : 'PIXEL FONT // OFF';
  });
}

function selectedProgramButton() {
  return programButtons.find(button => button.dataset.program === programId);
}

function restoreContentPanel() {
  if (contentPanel.parentNode !== stage) {
    contentAnchor.parentNode.insertBefore(contentPanel, contentAnchor.nextSibling);
  }
}

function placeContentPanel(scrollIntoView = false) {
  if (!mobileMode.matches) {
    restoreContentPanel();
    return;
  }

  const selected = subMenu.querySelector('.sub-node.is-selected');
  if (!selected) {
    restoreContentPanel();
    return;
  }

  selected.insertAdjacentElement('afterend', contentPanel);

  if (scrollIntoView) {
    requestAnimationFrame(() => {
      selected.scrollIntoView({
        behavior: reducedMotion.matches ? 'auto' : 'smooth',
        block: 'start',
        inline: 'nearest'
      });
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

function drawConnectors() {
  if (mobileMode.matches) {
    connectorSvg.innerHTML = '';
    return;
  }

  const activeProgram = selectedProgramButton();
  const subs = Array.from(subMenu.querySelectorAll('.sub-node'));
  if (!activeProgram || !subs.length) {
    connectorSvg.innerHTML = '';
    return;
  }

  const stageRect = stage.getBoundingClientRect();
  const programRect = activeProgram.getBoundingClientRect();
  const startX = programRect.right - stageRect.left + 2;
  const startY = programRect.top + programRect.height / 2 - stageRect.top;
  const trunkX = 26;
  const lines = [];

  subs.forEach(button => {
    const rect = button.getBoundingClientRect();
    const endX = rect.left - stageRect.left - 11;
    const endY = rect.top + rect.height / 2 - stageRect.top;
    const hot = button.dataset.sub === subId || button.dataset.sub === hoverSubId;
    const d = 'M ' + startX.toFixed(1) + ' ' + startY.toFixed(1) +
      ' H ' + trunkX +
      ' V ' + endY.toFixed(1) +
      ' H ' + endX.toFixed(1);

    lines.push(
      '<path class="connector-path' + (hot ? ' is-hot' : '') + '" d="' + d + '"/>' +
      '<circle class="connector-dot' + (hot ? ' is-hot' : '') + '" cx="' +
      endX.toFixed(1) + '" cy="' + endY.toFixed(1) + '" r="' + (hot ? '3.2' : '2.1') + '"/>'
    );
  });

  connectorSvg.setAttribute(
    'viewBox',
    '0 0 ' + Math.max(1, stageRect.width) + ' ' + Math.max(1, stageRect.height)
  );
  connectorSvg.innerHTML = lines.join('');
}

function buildSubMenu() {
  restoreContentPanel();

  const list = PROGRAMS[programId].subs;
  if (!list.some(item => item.id === subId)) {
    subId = list[0].id;
  }

  subMenu.innerHTML = '';

  list.forEach(item => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sub-node' + (item.id === subId ? ' is-selected' : '');
    button.dataset.sub = item.id;
    button.setAttribute('aria-expanded', String(item.id === subId && mobileMode.matches));
    button.innerHTML =
      '<b>&gt;' + escapeHtml(item.label) + '</b><small>' + escapeHtml(item.note || '') + '</small>';

    button.addEventListener('pointermove', event => {
      setInteractiveGlow(button, event);
    });
    button.addEventListener('pointerenter', () => {
      hoverSubId = item.id;
      crt.addEnergy(.4);
      drawConnectors();
    });
    button.addEventListener('pointerleave', () => {
      hoverSubId = null;
      drawConnectors();
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
    subsystem.scrollIntoView({
      behavior: reducedMotion.matches ? 'auto' : 'smooth',
      block: 'start',
      inline: 'nearest'
    });
  });
}

function selectProgram(id, focusSub = false, mobileScroll = true) {
  if (!PROGRAMS[id]) return;

  programId = id;
  subId = PROGRAMS[id].subs[0].id;
  syncProgramButtons();
  buildSubMenu();
  renderCurrentContent();

  statusLine.textContent = 'PROGRAM // ' + id.toUpperCase() + ' // SUBSYSTEM READY';
  history.replaceState(null, '', '#' + id + '/' + subId);
  crt.pulse(1.05);
  crt.scan();

  if (mobileMode.matches && mobileScroll) {
    scrollSubsystemIntoView();
  }

  if (focusSub && !mobileMode.matches) {
    requestAnimationFrame(() => subMenu.querySelector('.sub-node')?.focus());
  }
}

function selectSub(id, focus = false) {
  if (!PROGRAMS[programId].subs.some(item => item.id === id)) return;

  subId = id;

  Array.from(subMenu.querySelectorAll('.sub-node')).forEach(button => {
    const selected = button.dataset.sub === id;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-expanded', String(selected && mobileMode.matches));
  });

  renderCurrentContent();
  placeContentPanel(mobileMode.matches);

  statusLine.textContent = programId.toUpperCase() + ' // ' + id.toUpperCase();
  history.replaceState(null, '', '#' + programId + '/' + subId);
  crt.pulse(.78);
  drawConnectors();

  if (focus && !mobileMode.matches) {
    subMenu.querySelector('[data-sub="' + CSS.escape(id) + '"]')?.focus();
  }
}

function parseHash() {
  const [p, s] = location.hash.slice(1).split('/');
  if (!PROGRAMS[p]) return;

  programId = p;
  subId = PROGRAMS[p].subs.some(item => item.id === s)
    ? s
    : PROGRAMS[p].subs[0].id;
}

function setupProgramInteractions() {
  programButtons.forEach(button => {
    button.addEventListener('pointermove', event => {
      setInteractiveGlow(button, event);
    });
    button.addEventListener('pointerenter', () => {
      crt.addEnergy(.3);
      statusLine.textContent = 'TARGET // ' + button.dataset.program.toUpperCase();
    });
    button.addEventListener('click', () => {
      selectProgram(button.dataset.program, false, true);
    });
  });
}

function keyboardNavigation(event) {
  const active = document.activeElement;
  const programIndex = programButtons.indexOf(active);
  const subButtons = Array.from(subMenu.querySelectorAll('.sub-node'));
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
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      const next = (subIndex + delta + subButtons.length) % subButtons.length;
      subButtons[next].focus();
    } else if (event.key === 'Enter' || event.key === 'ArrowRight') {
      event.preventDefault();
      selectSub(active.dataset.sub, false);
      if (!mobileMode.matches) contentPanel.focus();
    } else if (event.key === 'Escape' || event.key === 'ArrowLeft') {
      event.preventDefault();
      selectedProgramButton()?.focus();
    }
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
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
    statusLine.textContent = 'BILIBILI // CONSOLE SCRIPT COPIED';
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

async function loadData() {
  try {
    const response = await fetch('./data/releases.json', { cache: 'no-cache' });
    if (response.ok) data.releases = await response.json();
  } catch {}

  try {
    const live = await fetch('./api/releases', {
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
    body.dataset.wake = 'true';
    boot.classList.add('is-hidden');
    sessionStorage.setItem('magius-link-booted', '1');

    setTimeout(() => {
      body.dataset.wake = 'false';
    }, 380);
  }, wait);
}

function applyPixelFont(enabled, persist = true) {
  document.documentElement.dataset.pixelFont = enabled ? 'true' : 'false';
  if (pixelFontToggle) {
    pixelFontToggle.setAttribute('aria-pressed', String(enabled));
    pixelFontToggle.textContent = enabled ? 'PIXEL FONT / ON' : 'PIXEL FONT / OFF';
  }
  if (persist) localStorage.setItem('magius-link-pixel-font', enabled ? 'true' : 'false');
}

applyPixelFont(localStorage.getItem('magius-link-pixel-font') !== 'false', false);

pixelFontToggle?.addEventListener('click', () => {
  const enabled = document.documentElement.dataset.pixelFont !== 'true';
  applyPixelFont(enabled);
  crt.pulse(.45);
});

homeJump.addEventListener('click', () => {
  selectProgram('home', false, false);
  if (terminalUi) {
    terminalUi.scrollTo({
      top: 0,
      behavior: reducedMotion.matches ? 'auto' : 'smooth'
    });
  }
});

parseHash();
initPixelFont();
setupProgramInteractions();
syncProgramButtons();
buildSubMenu();
renderCurrentContent();
loadData();
updateClock();
bootSequence();

setInterval(updateClock, 1000);
addEventListener('keydown', keyboardNavigation);

mobileMode.addEventListener?.('change', () => {
  buildSubMenu();
  renderCurrentContent();
});

addEventListener('resize', () => {
  requestAnimationFrame(drawConnectors);
});

addEventListener('hashchange', () => {
  parseHash();
  syncProgramButtons();
  buildSubMenu();
  renderCurrentContent();
});

addEventListener('pagehide', () => {
  crt.destroy();
});
