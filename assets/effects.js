export function setupCrtEffects(options) {
  const root = document.documentElement;
  const signal = options.signal;
  const screen = options.screen;
  const warpImage = options.warpImage;
  const reducedMotion = options.reducedMotion;
  const displacement = document.getElementById('curve-displacement');
  const trackingSweep = document.getElementById('tracking-sweep');

  let pointerEnergy = 0;
  let lastPointer = { x: innerWidth / 2, y: innerHeight / 2, t: performance.now() };
  let roll = -26;
  let rafId = 0;
  let lastFrame = 0;
  let nextTracking = performance.now() + 1700 + Math.random() * 2200;
  let trackingTimer = 0;
  let signalTickCount = 0;
  let active = !document.hidden;

  const mobileCurve = matchMedia('(max-width: 767px)');
  const ua = navigator.userAgent || '';
  const iosMajorMatch = ua.match(/(?:CPU (?:iPhone )?OS|OS) (\d+)_/i);
  const iosMajor = iosMajorMatch ? Number(iosMajorMatch[1]) : 0;
  const isIOSWebKit = /AppleWebKit/i.test(ua) && (
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );

  // WebKit currently has a reported feDisplacementMap regression in iOS 27
  // developer builds. Keep full optics on current stable iOS; fail safe only
  // for the affected major instead of risking a tab crash.
  const riskyDisplacement = isIOSWebKit && iosMajor >= 27;
  root.dataset.crtEngine = riskyDisplacement ? 'ios-safe' : (isIOSWebKit ? 'webkit-svg' : 'svg');

  function updateCurveScale() {
    if (!displacement) return;
    displacement.setAttribute('scale', mobileCurve.matches ? '38' : '50');
  }

  function createWarpMap() {
    if (!warpImage || riskyDisplacement) return;

    const canvas = document.createElement('canvas');
    const size = 512;
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const pixels = ctx.createImageData(size, size);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const nx = x / (size - 1) * 2 - 1;
        const ny = y / (size - 1) * 2 - 1;
        const radial = nx * nx + ny * ny;
        const i = (y * size + x) * 4;
        pixels.data[i] = Math.round(128 + nx * radial * 45);
        pixels.data[i + 1] = Math.round(128 + ny * radial * 45);
        pixels.data[i + 2] = 128;
        pixels.data[i + 3] = 255;
      }
    }

    ctx.putImageData(pixels, 0, 0);
    const url = canvas.toDataURL('image/png');
    warpImage.setAttribute('href', url);
    // Older WebKit still checks the legacy xlink namespace for feImage data URLs.
    warpImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', url);
  }

  function triggerSyncBurst(strength = 1) {
    if (reducedMotion.matches || !active) return;

    root.style.setProperty('--tear-y', String(Math.round(9 + Math.random() * 80)) + '%');
    root.style.setProperty('--tear-h', String(1 + Math.round(Math.random() * 4 * strength)) + 'px');
    root.style.setProperty('--tear-x', String(Math.round((Math.random() - .5) * 34 * strength)) + 'px');
    root.style.setProperty('--tear-o', String(Math.min(.76, .36 + strength * .24)));

    signal.dataset.burst = 'true';
    setTimeout(() => {
      root.style.setProperty('--tear-o', '0');
      signal.dataset.burst = 'false';
    }, 34 + Math.random() * 55);
  }

  function triggerTrackingSweep(now = performance.now()) {
    if (reducedMotion.matches || !active || !trackingSweep) return;

    clearTimeout(trackingTimer);
    root.style.setProperty('--tracking-shift', ((Math.random() - .5) * 11).toFixed(1) + 'px');
    root.style.setProperty('--tracking-duration', (.92 + Math.random() * .48).toFixed(2) + 's');

    signal.dataset.tracking = 'true';
    // Tiny global kick accompanies the local top-to-bottom tracking fault,
    // matching the measured ~subpixel horizontal movement in the reference.
    pointerEnergy = Math.max(pointerEnergy, .75);

    trackingTimer = setTimeout(() => {
      signal.dataset.tracking = 'false';
    }, 1500);

    nextTracking = now + 2300 + Math.random() * 5200;
  }

  function updateSignal(now) {
    if (!active || reducedMotion.matches) return;

    signalTickCount += 1;
    signal.dataset.tick = String(signalTickCount);

    // The source video moves horizontally by roughly half a pixel frame-to-frame,
    // with very little vertical movement.
    const motion = Math.min(.75, pointerEnergy * .48);
    const x = (Math.random() - .5) * (1.08 + motion);
    const y = (Math.random() - .5) * (.22 + motion * .16);

    root.style.setProperty('--jitter-x', x.toFixed(2) + 'px');
    root.style.setProperty('--jitter-y', y.toFixed(2) + 'px');
    root.style.setProperty('--flicker', (.982 + Math.random() * .034).toFixed(3));

    roll += .32;
    if (roll > 112) roll = -26;
    root.style.setProperty('--roll-y', roll.toFixed(1) + '%');

    pointerEnergy *= .91;

    if (Math.random() < .022) triggerSyncBurst(.72 + Math.random() * .55);
    if (Math.random() < .0032) {
      signal.dataset.drop = 'true';
      setTimeout(() => { signal.dataset.drop = 'false'; }, 24 + Math.random() * 58);
    }
    if (now >= nextTracking) triggerTrackingSweep(now);
  }

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    if (!active || reducedMotion.matches) return;
    if (now - lastFrame < 32) return; // ~30 Hz signal instability; raster itself remains full resolution.
    lastFrame = now;
    updateSignal(now);
  }

  function onPointerMove(event) {
    const rect = screen.getBoundingClientRect();
    root.style.setProperty('--mx', String(event.clientX - rect.left) + 'px');
    root.style.setProperty('--my', String(event.clientY - rect.top) + 'px');

    const now = performance.now();
    const dt = Math.max(12, now - lastPointer.t);
    const velocity = Math.hypot(event.clientX - lastPointer.x, event.clientY - lastPointer.y) / dt;
    pointerEnergy = Math.min(1.35, pointerEnergy * .72 + velocity * .18);
    lastPointer = { x: event.clientX, y: event.clientY, t: now };
  }

  function onVisibility() {
    active = !document.hidden;
    if (active) {
      lastFrame = performance.now();
      nextTracking = Math.min(nextTracking, lastFrame + 1600 + Math.random() * 1800);
    }
  }

  createWarpMap();
  updateCurveScale();

  screen.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('visibilitychange', onVisibility, { passive: true });
  mobileCurve.addEventListener?.('change', updateCurveScale);
  rafId = requestAnimationFrame(frame);

  return {
    pulse: triggerSyncBurst,
    scan: triggerTrackingSweep,
    addEnergy(amount) {
      pointerEnergy = Math.min(1.35, pointerEnergy + amount);
    },
    destroy() {
      cancelAnimationFrame(rafId);
      clearTimeout(trackingTimer);
      screen.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibility);
      mobileCurve.removeEventListener?.('change', updateCurveScale);
    }
  };
}

export function setInteractiveGlow(button, event) {
  const rect = button.getBoundingClientRect();
  button.style.setProperty('--px', String(event.clientX - rect.left) + 'px');
  button.style.setProperty('--py', String(event.clientY - rect.top) + 'px');
}
