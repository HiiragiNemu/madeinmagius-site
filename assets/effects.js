export function setupCrtEffects(options) {
  const root = document.documentElement;
  const signal = options.signal;
  const screen = options.screen;
  const noiseCanvas = options.noiseCanvas;
  const warpImage = options.warpImage;
  const reducedMotion = options.reducedMotion;
  const displacement = document.getElementById('curve-displacement');
  const trackingSweep = document.getElementById('tracking-sweep');

  let pointerEnergy = 0;
  let lastPointer = { x: innerWidth / 2, y: innerHeight / 2, t: performance.now() };
  let roll = -24;
  let rafId = 0;
  let lastSignalFrame = 0;
  let lastNoiseFrame = 0;
  let nextTracking = performance.now() + 1200 + Math.random() * 2200;
  let trackingTimer = 0;
  let signalTickCount = 0;
  let noiseTickCount = 0;
  let trackingCount = 0;
  let active = !document.hidden;

  const mobileCurve = matchMedia('(max-width: 767px)');
  const ua = navigator.userAgent || '';
  const iosMajorMatch = ua.match(/(?:CPU (?:iPhone )?OS|OS) (\d+)_/i);
  const iosMajor = iosMajorMatch ? Number(iosMajorMatch[1]) : 0;
  const isIOSWebKit = /AppleWebKit/i.test(ua) && (
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );

  // iOS 27 developer builds currently have a WebKit feDisplacementMap crash
  // regression. Preserve every dynamic signal layer, but disable only the
  // risky lens displacement on that affected engine.
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
    warpImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', url);
  }

  function renderTemporalNoise(now) {
    if (!noiseCanvas || reducedMotion.matches || !active) return;

    // A small native noise buffer scaled by the browser gives true temporal
    // grain without repainting the full-resolution viewport every frame.
    const rect = screen.getBoundingClientRect();
    const mobile = mobileCurve.matches;
    const targetW = Math.max(112, Math.min(mobile ? 190 : 260, Math.round(rect.width * .17)));
    const targetH = Math.max(80, Math.min(mobile ? 150 : 190, Math.round(rect.height * .17)));

    if (noiseCanvas.width !== targetW || noiseCanvas.height !== targetH) {
      noiseCanvas.width = targetW;
      noiseCanvas.height = targetH;
    }

    const ctx = noiseCanvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!ctx) return;

    const image = ctx.createImageData(targetW, targetH);
    const data = image.data;

    for (let i = 0; i < data.length; i += 4) {
      // Most samples are dark luma noise; occasional bright phosphor flecks
      // keep the grain alive instead of looking like a static texture.
      const spike = Math.random() > .974;
      const luma = spike ? 188 + Math.random() * 67 : 30 + Math.random() * 82;
      const tint = (Math.random() - .5) * 12;
      data[i] = Math.max(0, Math.min(255, luma - 8 + tint));
      data[i + 1] = Math.max(0, Math.min(255, luma + 8));
      data[i + 2] = Math.max(0, Math.min(255, luma - 3 - tint));
      data[i + 3] = spike ? 30 : 11;
    }

    ctx.putImageData(image, 0, 0);
    noiseTickCount += 1;
    signal.dataset.noiseTick = String(noiseTickCount);
    lastNoiseFrame = now;
  }

  function triggerSyncBurst(strength = 1) {
    if (reducedMotion.matches || !active) return;

    root.style.setProperty('--tear-y', String(Math.round(8 + Math.random() * 82)) + '%');
    root.style.setProperty('--tear-h', String(1 + Math.round(Math.random() * 3 * strength)) + 'px');
    root.style.setProperty('--tear-x', String(Math.round((Math.random() - .5) * 26 * strength)) + 'px');
    root.style.setProperty('--tear-o', String(Math.min(.72, .28 + strength * .25)));

    signal.dataset.burst = 'true';
    setTimeout(() => {
      root.style.setProperty('--tear-o', '0');
      signal.dataset.burst = 'false';
    }, 30 + Math.random() * 52);
  }

  function triggerTrackingSweep(now = performance.now()) {
    if (reducedMotion.matches || !active || !trackingSweep) return;

    clearTimeout(trackingTimer);

    // A vertical-sync / timebase disturbance is a moving field boundary with
    // a small horizontal phase error, not a full-screen geometry mutation.
    root.style.setProperty('--tracking-shift', ((Math.random() - .5) * 7.2).toFixed(1) + 'px');
    root.style.setProperty('--tracking-duration', (.78 + Math.random() * .46).toFixed(2) + 's');
    root.style.setProperty('--tracking-brightness', (1.04 + Math.random() * .09).toFixed(3));

    signal.dataset.tracking = 'true';
    trackingCount += 1;
    signal.dataset.trackingCount = String(trackingCount);
    pointerEnergy = Math.max(pointerEnergy, .68);

    if (Math.random() < .55) {
      setTimeout(() => triggerSyncBurst(.58 + Math.random() * .5), 180 + Math.random() * 260);
    }

    trackingTimer = setTimeout(() => {
      signal.dataset.tracking = 'false';
    }, 1450);

    // The supplied reference does not sit perfectly still: a stronger field
    // rolls through every few seconds even without user input.
    nextTracking = now + 1900 + Math.random() * 4300;
  }

  function updateSignal(now) {
    if (!active || reducedMotion.matches) return;

    signalTickCount += 1;
    signal.dataset.tick = String(signalTickCount);

    // Measured from the supplied 60 fps video: stable areas wander roughly
    // ±0.5 px horizontally frame-to-frame, while vertical motion is much lower.
    // Combine a slow timebase wander with low-amplitude high-frequency jitter.
    const lowDrift =
      Math.sin(now * .00155) * .16 +
      Math.sin(now * .0039 + 1.37) * .08;
    const randomPhase = (Math.random() + Math.random() - 1) * .50;
    const motion = Math.min(.68, pointerEnergy * .42);

    const x = lowDrift + randomPhase + (Math.random() - .5) * motion;
    const y =
      Math.sin(now * .00115 + .7) * .025 +
      (Math.random() + Math.random() - 1) * (.075 + motion * .10);

    root.style.setProperty('--jitter-x', x.toFixed(2) + 'px');
    root.style.setProperty('--jitter-y', y.toFixed(2) + 'px');

    // Brightness changes are correlated and tiny; independent strong flicker
    // looks digital rather than like a CRT timebase/phosphor system.
    const breath =
      Math.sin(now * .00215) * .006 +
      Math.sin(now * .00063 + 2.1) * .004;
    root.style.setProperty('--flicker', (0.994 + breath + (Math.random() - .5) * .006).toFixed(3));

    // Continuous slow field roll underneath the rarer tracking fault.
    roll += .50;
    if (roll > 112) roll = -24;
    root.style.setProperty('--roll-y', roll.toFixed(1) + '%');

    pointerEnergy *= .92;

    // Short horizontal sync disturbances happen independently of clicks.
    if (Math.random() < .014) triggerSyncBurst(.50 + Math.random() * .48);

    // Full luminance dropout is rare and short.
    if (Math.random() < .0018) {
      signal.dataset.drop = 'true';
      setTimeout(() => { signal.dataset.drop = 'false'; }, 20 + Math.random() * 46);
    }

    if (now >= nextTracking) triggerTrackingSweep(now);
  }

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    if (!active || reducedMotion.matches) return;

    // Signal instability is intentionally around 30 Hz; the raster, text,
    // curvature and phosphor layers themselves remain full-resolution.
    if (now - lastSignalFrame >= 31) {
      lastSignalFrame = now;
      updateSignal(now);
    }

    // True temporal grain refreshes more slowly than the raster and is drawn
    // from a tiny buffer for iOS/Android efficiency.
    const noiseInterval = mobileCurve.matches ? 92 : 72;
    if (now - lastNoiseFrame >= noiseInterval) {
      renderTemporalNoise(now);
    }
  }

  function onPointerMove(event) {
    const rect = screen.getBoundingClientRect();
    root.style.setProperty('--mx', String(event.clientX - rect.left) + 'px');
    root.style.setProperty('--my', String(event.clientY - rect.top) + 'px');

    const now = performance.now();
    const dt = Math.max(12, now - lastPointer.t);
    const velocity = Math.hypot(event.clientX - lastPointer.x, event.clientY - lastPointer.y) / dt;
    pointerEnergy = Math.min(1.2, pointerEnergy * .74 + velocity * .15);
    lastPointer = { x: event.clientX, y: event.clientY, t: now };
  }

  function onVisibility() {
    active = !document.hidden;
    if (active) {
      lastSignalFrame = performance.now();
      lastNoiseFrame = 0;
      nextTracking = Math.min(nextTracking, lastSignalFrame + 1200 + Math.random() * 1700);
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
      pointerEnergy = Math.min(1.2, pointerEnergy + amount);
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
