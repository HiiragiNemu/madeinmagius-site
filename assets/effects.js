export function setupCrtEffects(options) {
  const root = document.documentElement;
  const signal = options.signal;
  const screen = options.screen;
  const warpImage = options.warpImage;
  const reducedMotion = options.reducedMotion;

  const curveDisplacement = document.getElementById('curve-displacement');
  const lineDisplacement = document.getElementById('line-displacement');
  const lineNoise = document.getElementById('line-noise');
  const trackingSweep = document.getElementById('tracking-sweep');

  let rafId = 0;
  let active = !document.hidden;
  let lastFrame = 0;
  let lastLineNoise = 0;
  let lineNoiseTick = 0;
  let trackingCount = 0;
  let nextTracking = performance.now() + 2400 + Math.random() * 4800;
  let faultTimer = 0;
  let trackingTimer = 0;
  let pointerEnergy = 0;
  let lastPointer = { x: innerWidth / 2, y: innerHeight / 2, t: performance.now() };

  const mobile = matchMedia('(max-width: 767px)');
  const ua = navigator.userAgent || '';
  const isIOSWebKit = /AppleWebKit/i.test(ua) && (
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );

  // WebKit mobile gets the safe compositor curve. Every raster / grain /
  // line-noise layer remains active.
  root.dataset.crtEngine = isIOSWebKit ? 'ios-safe' : 'svg';

  function updateCurveScale() {
    if (!curveDisplacement) return;
    curveDisplacement.setAttribute('scale', mobile.matches ? '38' : '50');
  }

  function createWarpMap() {
    if (!warpImage || isIOSWebKit) return;

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
    warpImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', url);
  }

  function setLineNoise(strength = 1) {
    const motionScale = reducedMotion.matches ? .55 : 1;
    const scale = (.42 + Math.random() * .42) * strength * motionScale;

    if (lineNoise) {
      lineNoise.setAttribute('seed', String((Math.random() * 9973) | 0));
      lineNoise.setAttribute(
        'baseFrequency',
        (.0007 + Math.random() * .0022).toFixed(4) + ' ' +
        (.105 + Math.random() * .115).toFixed(3)
      );
    }
    if (lineDisplacement) {
      lineDisplacement.setAttribute('scale', scale.toFixed(2));
    }

    lineNoiseTick += 1;
    signal.dataset.lineNoiseTick = String(lineNoiseTick);
  }

  function setGlyphNoise(now) {
    const m = reducedMotion.matches ? .55 : 1;
    const energy = 1 + Math.min(.6, pointerEnergy);
    const gx = ((Math.random() + Math.random() - 1) * .30 + Math.sin(now * .017) * .06) * m * energy;
    const gy = (Math.random() + Math.random() - 1) * .08 * m;
    const blue = -(.92 + Math.random() * .42) * m;
    const red = (.98 + Math.random() * .44) * m;

    root.style.setProperty('--glyph-jitter-x', gx.toFixed(2) + 'px');
    root.style.setProperty('--glyph-jitter-y', gy.toFixed(2) + 'px');
    root.style.setProperty('--blue-edge-x', blue.toFixed(2) + 'px');
    root.style.setProperty('--red-edge-x', red.toFixed(2) + 'px');

    const breath =
      Math.sin(now * .0021) * .0045 +
      Math.sin(now * .00061 + 1.9) * .003;
    root.style.setProperty('--flicker', (0.997 + breath + (Math.random() - .5) * .003).toFixed(3));

    pointerEnergy *= .91;
  }

  function triggerLineFault(strength = 1) {
    if (!active) return;
    clearTimeout(faultTimer);

    const strong = reducedMotion.matches ? strength * .55 : strength;
    if (lineDisplacement) {
      lineDisplacement.setAttribute('scale', (1.15 + Math.random() * 1.35 * strong).toFixed(2));
    }
    if (lineNoise) {
      lineNoise.setAttribute('seed', String((Math.random() * 9973) | 0));
      lineNoise.setAttribute(
        'baseFrequency',
        (.0006 + Math.random() * .0015).toFixed(4) + ' ' +
        (.16 + Math.random() * .18).toFixed(3)
      );
    }

    root.style.setProperty('--tear-y', String(Math.round(5 + Math.random() * 90)) + '%');
    root.style.setProperty('--tear-h', String(1 + Math.round(Math.random() * 2)) + 'px');
    root.style.setProperty('--tear-x', ((Math.random() - .5) * 7 * strong).toFixed(1) + 'px');
    root.style.setProperty('--tear-o', (.10 + Math.random() * .18).toFixed(2));

    faultTimer = setTimeout(() => {
      root.style.setProperty('--tear-o', '0');
      setLineNoise(.9);
    }, 55 + Math.random() * 120);
  }

  function triggerTrackingSweep(now = performance.now()) {
    if (!active || !trackingSweep) return;

    const modeRoll = Math.random();
    const mode =
      modeRoll < .48 ? 'down' :
      modeRoll < .72 ? 'up' :
      modeRoll < .94 ? 'converge' :
      'double';

    trackingSweep.dataset.mode = mode;
    root.style.setProperty('--tracking-duration', (.72 + Math.random() * .62).toFixed(2) + 's');
    root.style.setProperty('--scan-height', (3.2 + Math.random() * 3.8).toFixed(1) + '%');
    root.style.setProperty('--tracking-brightness', (1.008 + Math.random() * .026).toFixed(3));
    root.style.setProperty('--tracking-shift-a', ((Math.random() - .5) * 2.6).toFixed(1) + 'px');
    root.style.setProperty('--tracking-shift-b', ((Math.random() - .5) * 2.6).toFixed(1) + 'px');

    signal.dataset.tracking = 'true';
    trackingCount += 1;
    signal.dataset.trackingCount = String(trackingCount);

    // The visible error is primarily line phase, not a whole-screen shove.
    triggerLineFault(.85 + Math.random() * .7);

    clearTimeout(trackingTimer);
    trackingTimer = setTimeout(() => {
      signal.dataset.tracking = 'false';
    }, 1500);

    const u = Math.max(.002, Math.random());
    nextTracking = now + Math.min(10500, 3200 + (-Math.log(u) * 2300));
  }

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    if (!active) return;

    const uiInterval = mobile.matches ? 34 : 24;
    if (now - lastFrame >= uiInterval) {
      lastFrame = now;
      setGlyphNoise(now);

      if (Math.random() < .010) triggerLineFault(.45 + Math.random() * .45);
      if (now >= nextTracking) triggerTrackingSweep(now);
    }

    const lineInterval = mobile.matches ? 66 : 46;
    if (now - lastLineNoise >= lineInterval) {
      lastLineNoise = now;
      setLineNoise(.82 + Math.random() * .24);
    }
  }

  function onPointerMove(event) {
    const rect = screen.getBoundingClientRect();
    root.style.setProperty('--mx', String(event.clientX - rect.left) + 'px');
    root.style.setProperty('--my', String(event.clientY - rect.top) + 'px');

    const now = performance.now();
    const dt = Math.max(12, now - lastPointer.t);
    const velocity = Math.hypot(event.clientX - lastPointer.x, event.clientY - lastPointer.y) / dt;
    pointerEnergy = Math.min(.75, pointerEnergy * .72 + velocity * .09);
    lastPointer = { x: event.clientX, y: event.clientY, t: now };
  }

  function onVisibility() {
    active = !document.hidden;
    if (active) {
      lastFrame = performance.now();
      lastLineNoise = 0;
      nextTracking = Math.min(nextTracking, lastFrame + 1800 + Math.random() * 2600);
    }
  }

  createWarpMap();
  updateCurveScale();
  setLineNoise(.9);

  screen.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('visibilitychange', onVisibility, { passive: true });
  mobile.addEventListener?.('change', updateCurveScale);
  rafId = requestAnimationFrame(frame);

  return {
    pulse(strength = 1) {
      triggerLineFault(.35 + strength * .3);
    },
    scan() {
      triggerTrackingSweep(performance.now());
    },
    addEnergy(amount) {
      pointerEnergy = Math.min(.75, pointerEnergy + amount);
    },
    destroy() {
      cancelAnimationFrame(rafId);
      clearTimeout(faultTimer);
      clearTimeout(trackingTimer);
      screen.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibility);
      mobile.removeEventListener?.('change', updateCurveScale);
    }
  };
}

export function setInteractiveGlow(button, event) {
  const rect = button.getBoundingClientRect();
  button.style.setProperty('--px', String(event.clientX - rect.left) + 'px');
  button.style.setProperty('--py', String(event.clientY - rect.top) + 'px');
}
