import { PROGRAMS, escapeHtml, renderContent } from './content.js';
import { setupCrtEffects, setInteractiveGlow } from './effects.js';

const body = document.body;
const signal = document.getElementById('signal');
const screen = document.querySelector('.screen');
const boot = document.getElementById('boot');
const noiseCanvas = document.getElementById('noise');
const programButtons = Array.from(document.querySelectorAll('.menu-node[data-program]'));
const subMenu = document.getElementById('sub-menu');
const contentInner = document.getElementById('content-inner');
const contentPanel = document.getElementById('content-panel');
const stage = document.getElementById('stage');
const connectorSvg = document.getElementById('connectors');
const statusLine = document.getElementById('status-line');
const clock = document.getElementById('clock');
const warpImage = document.getElementById('crt-warp-map');
const turbulence = document.getElementById('signal-turbulence');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const data = { releases: null, docs: new Map() };
let programId = 'home';
let subId = 'welcome';
let hoverSubId = null;

const crt = setupCrtEffects({
  signal: signal,
  screen: screen,
  noiseCanvas: noiseCanvas,
  warpImage: warpImage,
  turbulence: turbulence,
  reducedMotion: reducedMotion
});

function selectedProgramButton() {
  return programButtons.find(function(button) {
    return button.dataset.program === programId;
  });
}

function syncProgramButtons() {
  programButtons.forEach(function(button) {
    const selected = button.dataset.program === programId;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function animateRedraw() {
  contentInner.classList.remove('is-redrawing');
  void contentInner.offsetWidth;
  contentInner.classList.add('is-redrawing');
  setTimeout(function() {
    contentInner.classList.remove('is-redrawing');
  }, 190);
}

function renderCurrentContent() {
  contentInner.innerHTML = renderContent(programId, subId, data);
  contentPanel.scrollTop = 0;
  animateRedraw();
}

function drawConnectors() {
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

  subs.forEach(function(button) {
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
  const list = PROGRAMS[programId].subs;
  if (!list.some(function(item) { return item.id === subId; })) {
    subId = list[0].id;
  }

  subMenu.innerHTML = '';
  list.forEach(function(item) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sub-node' + (item.id === subId ? ' is-selected' : '');
    button.dataset.sub = item.id;
    button.innerHTML = '<b>&gt;' + escapeHtml(item.label) + '</b><small>' +
      escapeHtml(item.note || '') + '</small>';

    button.addEventListener('pointermove', function(event) {
      setInteractiveGlow(button, event);
    });
    button.addEventListener('pointerenter', function() {
      hoverSubId = item.id;
      crt.addEnergy(.4);
      drawConnectors();
    });
    button.addEventListener('pointerleave', function() {
      hoverSubId = null;
      drawConnectors();
    });
    button.addEventListener('click', function() {
      selectSub(item.id, true);
    });
    subMenu.append(button);
  });

  requestAnimationFrame(drawConnectors);
}

function selectProgram(id, focusSub) {
  if (!PROGRAMS[id]) return;
  programId = id;
  subId = PROGRAMS[id].subs[0].id;
  syncProgramButtons();
  buildSubMenu();
  renderCurrentContent();
  statusLine.textContent = 'PROGRAM // ' + id.toUpperCase() + ' // SUBSYSTEM READY';
  history.replaceState(null, '', '#' + id + '/' + subId);
  crt.pulse(1.15);
  if (focusSub) {
    requestAnimationFrame(function() {
      const first = subMenu.querySelector('.sub-node');
      if (first) first.focus();
    });
  }
}

function selectSub(id, focus) {
  if (!PROGRAMS[programId].subs.some(function(item) { return item.id === id; })) return;
  subId = id;
  Array.from(subMenu.children).forEach(function(button) {
    button.classList.toggle('is-selected', button.dataset.sub === id);
  });
  renderCurrentContent();
  statusLine.textContent = programId.toUpperCase() + ' // ' + id.toUpperCase();
  history.replaceState(null, '', '#' + programId + '/' + subId);
  crt.pulse(.9);
  drawConnectors();
  if (focus) {
    const button = subMenu.querySelector('[data-sub="' + CSS.escape(id) + '"]');
    if (button) button.focus();
  }
}

function parseHash() {
  const parts = location.hash.slice(1).split('/');
  const p = parts[0];
  const s = parts[1];
  if (!PROGRAMS[p]) return;
  programId = p;
  subId = PROGRAMS[p].subs.some(function(item) { return item.id === s; })
    ? s
    : PROGRAMS[p].subs[0].id;
}

function setupProgramInteractions() {
  programButtons.forEach(function(button) {
    button.addEventListener('pointermove', function(event) {
      setInteractiveGlow(button, event);
    });
    button.addEventListener('pointerenter', function() {
      crt.addEnergy(.3);
      statusLine.textContent = 'TARGET // ' + button.dataset.program.toUpperCase();
    });
    button.addEventListener('click', function() {
      selectProgram(button.dataset.program, false);
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
      selectProgram(active.dataset.program, true);
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
      contentPanel.focus();
    } else if (event.key === 'Escape' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const selected = selectedProgramButton();
      if (selected) selected.focus();
    }
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    const selected = selectedProgramButton();
    if (selected) selected.focus();
  }
}

async function loadData() {
  try {
    const response = await fetch('./data/releases.json', { cache: 'no-cache' });
    if (response.ok) data.releases = await response.json();
  } catch (error) {}

  try {
    const live = await fetch('./api/releases', {
      headers: { accept: 'application/json' },
      cache: 'no-store'
    });
    if (live.ok) {
      const payload = await live.json();
      if (payload && payload.projects) {
        if (!data.releases) data.releases = { projects: {} };
        data.releases.projects = Object.assign({}, data.releases.projects, payload.projects);
      }
    }
  } catch (error) {}

  try {
    const response = await fetch('./data/exedra-docs.json', { cache: 'no-cache' });
    if (response.ok) {
      const payload = await response.json();
      data.docs = new Map((payload.docs || []).map(function(doc) {
        return [doc.id, doc];
      }));
    }
  } catch (error) {}

  renderCurrentContent();
}

function updateClock() {
  clock.textContent = new Date().toLocaleTimeString('en-GB', { hour12: false });
}

function bootSequence() {
  const seen = sessionStorage.getItem('magius-link-booted');
  const wait = reducedMotion.matches ? 100 : (seen ? 720 : 1650);
  setTimeout(function() {
    body.dataset.wake = 'true';
    boot.classList.add('is-hidden');
    sessionStorage.setItem('magius-link-booted', '1');
    setTimeout(function() {
      body.dataset.wake = 'false';
    }, 360);
  }, wait);
}

parseHash();
setupProgramInteractions();
syncProgramButtons();
buildSubMenu();
renderCurrentContent();
loadData();
updateClock();
bootSequence();

setInterval(updateClock, 1000);
addEventListener('keydown', keyboardNavigation);
addEventListener('resize', function() {
  requestAnimationFrame(drawConnectors);
});
addEventListener('hashchange', function() {
  parseHash();
  syncProgramButtons();
  buildSubMenu();
  renderCurrentContent();
});
addEventListener('pagehide', function() {
  crt.destroy();
});
