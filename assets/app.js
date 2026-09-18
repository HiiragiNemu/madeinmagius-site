(() => {
  const root = document.documentElement;
  const body = document.body;
  const terminal = document.getElementById('terminal');
  const nav = Array.from(document.querySelectorAll('.program[data-program]'));
  const panels = Array.from(document.querySelectorAll('.panel[data-panel]'));
  const statusLine = document.getElementById('status-line');
  const clock = document.getElementById('clock');
  const signalValue = document.getElementById('signal-value');
  const boot = document.getElementById('boot');
  const bootSync = document.getElementById('boot-sync');
  const toggle = document.getElementById('phosphor-toggle');
  const noiseCanvas = document.getElementById('signal-noise');
  const tear = document.querySelector('.fx-tear');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const programs = nav.map(item => item.dataset.program);
  let selected = Math.max(0, programs.indexOf(location.hash.slice(1)));
  let lastPointer = { x: innerWidth / 2, y: innerHeight / 2, t: performance.now() };
  let pointerEnergy = 0;
  let glitchTimer = 0;

  function selectProgram(name, fromHistory = false) {
    if (!programs.includes(name)) name = 'home';
    selected = programs.indexOf(name);
    terminal.dataset.program = name;
    nav.forEach(item => item.classList.toggle('is-active', item.dataset.program === name));
    panels.forEach(panel => panel.classList.toggle('is-active', panel.dataset.panel === name));
    statusLine.textContent = `PROGRAM ${String(selected).padStart(2, '0')} // ${name.toUpperCase()} // INPUT READY`;
    if (!fromHistory && location.hash !== `#${name}`) history.replaceState(null, '', `#${name}`);
    body.dataset.signalFlash = 'true';
    setTimeout(() => { body.dataset.signalFlash = 'false'; }, 90);
  }

  nav.forEach((item, index) => {
    item.addEventListener('click', () => selectProgram(item.dataset.program));
    item.addEventListener('pointerenter', () => {
      selected = index;
      if (!reducedMotion.matches) {
        pointerEnergy = Math.min(1, pointerEnergy + .28);
        statusLine.textContent = `TARGET ${String(index).padStart(2, '0')} // ${item.dataset.program.toUpperCase()}`;
      }
    });
  });

  window.addEventListener('keydown', event => {
    const tag = event.target && event.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      selected = (selected + 1) % programs.length;
      nav[selected].focus();
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      selected = (selected - 1 + programs.length) % programs.length;
      nav[selected].focus();
    } else if (event.key === 'Enter' && document.activeElement?.dataset?.program) {
      selectProgram(document.activeElement.dataset.program);
    } else if (event.key === 'Escape') {
      selectProgram('home');
      nav[0].focus();
    }
  });

  window.addEventListener('hashchange', () => selectProgram(location.hash.slice(1), true));

  function updateClock() {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString('en-GB', { hour12: false });
  }
  updateClock();
  setInterval(updateClock, 1000);

  function bootSequence() {
    const seen = sessionStorage.getItem('magi-terminal-booted');
    const delay = reducedMotion.matches ? 120 : (seen ? 760 : 2050);
    setTimeout(() => { bootSync.textContent = 'LOCKED'; }, Math.max(80, delay - 560));
    setTimeout(() => {
      boot.classList.add('is-hidden');
      sessionStorage.setItem('magi-terminal-booted', '1');
      selectProgram(location.hash.slice(1) || 'home', true);
    }, delay);
  }
  bootSequence();

  const savedPhosphor = localStorage.getItem('magi-phosphor');
  if (savedPhosphor === 'amber') root.dataset.phosphor = 'amber';
  toggle.addEventListener('click', () => {
    root.dataset.phosphor = root.dataset.phosphor === 'amber' ? 'green' : 'amber';
    localStorage.setItem('magi-phosphor', root.dataset.phosphor);
    statusLine.textContent = `PHOSPHOR PROFILE // ${root.dataset.phosphor.toUpperCase()}`;
    body.dataset.signalFlash = 'true';
    setTimeout(() => { body.dataset.signalFlash = 'false'; }, 110);
  });

  window.addEventListener('pointermove', event => {
    root.style.setProperty('--mx', `${event.clientX}px`);
    root.style.setProperty('--my', `${event.clientY}px`);
    const now = performance.now();
    const dt = Math.max(12, now - lastPointer.t);
    const velocity = Math.hypot(event.clientX - lastPointer.x, event.clientY - lastPointer.y) / dt;
    pointerEnergy = Math.min(1, pointerEnergy * .72 + velocity * .16);
    lastPointer = { x: event.clientX, y: event.clientY, t: now };
  }, { passive: true });

  function randomSignalTick() {
    if (reducedMotion.matches) {
      root.style.setProperty('--jitter-x', '0px');
      root.style.setProperty('--jitter-y', '0px');
      return;
    }
    const energy = .18 + pointerEnergy * .7;
    const x = (Math.random() - .5) * energy;
    const y = (Math.random() - .5) * energy * .35;
    root.style.setProperty('--jitter-x', `${x.toFixed(3)}px`);
    root.style.setProperty('--jitter-y', `${y.toFixed(3)}px`);
    root.style.setProperty('--signal-brightness', (0.985 + Math.random() * .025).toFixed(3));
    pointerEnergy *= .94;

    if (Math.random() < .024) {
      body.dataset.hardSync = 'true';
      root.style.setProperty('--tear-y', `${Math.round(Math.random() * innerHeight)}px`);
      root.style.setProperty('--tear-h', `${1 + Math.round(Math.random() * 4)}px`);
      root.style.setProperty('--tear-x', `${Math.round((Math.random() - .5) * 30)}px`);
      root.style.setProperty('--tear-opacity', (.25 + Math.random() * .45).toFixed(2));
      setTimeout(() => {
        body.dataset.hardSync = 'false';
        root.style.setProperty('--tear-opacity', '0');
      }, 28 + Math.random() * 50);
    }
    if (Math.random() < .004) {
      body.dataset.dropout = 'true';
      setTimeout(() => { body.dataset.dropout = 'false'; }, 35 + Math.random() * 90);
    }
  }
  glitchTimer = window.setInterval(randomSignalTick, 52);

  function makeNoise() {
    if (!noiseCanvas || reducedMotion.matches) return;
    const dpr = Math.min(1.25, devicePixelRatio || 1);
    const w = Math.max(160, Math.round(innerWidth / 5 * dpr));
    const h = Math.max(90, Math.round(innerHeight / 5 * dpr));
    if (noiseCanvas.width !== w || noiseCanvas.height !== h) {
      noiseCanvas.width = w;
      noiseCanvas.height = h;
    }
    const ctx = noiseCanvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    const image = ctx.createImageData(w, h);
    for (let i = 0; i < image.data.length; i += 4) {
      const n = Math.random() * 255;
      const alpha = Math.random() > .86 ? 33 : 9;
      image.data[i] = n;
      image.data[i + 1] = n;
      image.data[i + 2] = n;
      image.data[i + 3] = alpha;
    }
    ctx.putImageData(image, 0, 0);
  }
  makeNoise();
  const noiseTimer = window.setInterval(makeNoise, 115);
  window.addEventListener('resize', makeNoise, { passive: true });

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return 'unknown size';
    const units = ['B','KB','MB','GB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }
    return `${value >= 10 || unit === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
  }

  function projectAsset(project, key) {
    return project?.assets?.[key] || null;
  }

  function paintRelease(projectKey, project, dynamic) {
    const state = document.querySelector(`[data-release-state="${projectKey}"]`);
    const version = document.querySelector(`[data-release-version="${projectKey}"]`);
    const digest = document.querySelector(`[data-release-digest="${projectKey}"]`);
    if (!project) {
      if (state) state.textContent = 'OFFLINE';
      return;
    }
    if (state) {
      state.textContent = dynamic ? 'LIVE SYNC' : 'SNAPSHOT';
      state.classList.add('is-live');
    }
    if (version) version.textContent = `${project.tag || 'unknown'} // ${new Date(project.published_at).toISOString().slice(0,10)}`;

    const map = projectKey === 'bilibili'
      ? [['bilibili-apk','android'],['bilibili-userscript','userscript']]
      : [['netease-windows','windows'],['netease-python','python']];

    const digests = [];
    for (const [domKey, assetKey] of map) {
      const asset = projectAsset(project, assetKey);
      const text = document.querySelector(`[data-release-asset="${domKey}"]`);
      const link = document.querySelector(`[data-download="${domKey}"]`);
      if (!asset) {
        if (text) text.textContent = 'not published';
        if (link) link.classList.add('is-disabled');
        continue;
      }
      if (text) text.textContent = `${asset.name} // ${formatBytes(asset.size)}`;
      if (link) {
        if (dynamic && asset.download) {
          link.href = asset.download;
          link.removeAttribute('target');
        } else if (asset.browser_download_url) {
          link.href = asset.browser_download_url;
          link.target = '_blank';
          link.rel = 'noreferrer';
          link.title = 'GitHub Pages fallback: private source repository authentication may be required';
        }
        link.classList.remove('is-disabled');
      }
      if (asset.digest) digests.push(`${assetKey}: ${asset.digest}`);
    }
    if (digest) digest.textContent = digests.join('  //  ') || 'digest unavailable';
  }

  async function loadReleases() {
    let payload = null;
    let dynamic = false;
    try {
      const apiUrl = new URL('./api/releases', location.href.split('#')[0]);
      const response = await fetch(apiUrl, { headers: { accept: 'application/json' }, cache: 'no-store' });
      if (response.ok) {
        payload = await response.json();
        dynamic = payload?.source === 'cloudflare-live';
      }
    } catch (_) {}
    if (!payload) {
      try {
        const fallback = new URL('./data/releases.json', document.baseURI);
        const response = await fetch(fallback, { cache: 'no-cache' });
        if (response.ok) payload = await response.json();
      } catch (_) {}
    }
    if (!payload?.projects) {
      statusLine.textContent = 'RELEASE BUS OFFLINE // DISPLAY ONLY';
      return;
    }
    paintRelease('bilibili', payload.projects.bilibili, dynamic);
    paintRelease('netease', payload.projects.netease, dynamic);
    statusLine.textContent = dynamic
      ? 'RELEASE BUS LIVE // MIRROR ROUTES READY'
      : 'RELEASE SNAPSHOT LOADED // CLOUDFLARE MIRROR STANDBY';
  }
  loadReleases();

  window.addEventListener('pagehide', () => {
    clearInterval(glitchTimer);
    clearInterval(noiseTimer);
  });

  selectProgram(programs[selected] || 'home', true);
})();