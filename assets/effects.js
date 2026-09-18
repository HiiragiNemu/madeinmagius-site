export function setupCrtEffects(options) {
  const root = document.documentElement;
  const signal = options.signal;
  const screen = options.screen;
  const noiseCanvas = options.noiseCanvas;
  const warpImage = options.warpImage;
  const reducedMotion = options.reducedMotion;
  const displacement = document.getElementById('curve-displacement');

  let pointerEnergy = 0;
  let lastPointer = { x: innerWidth / 2, y: innerHeight / 2, t: performance.now() };
  let roll = -26;
  let jitterTimer = 0;
  let noiseTimer = 0;
  let rollTimer = 0;

  const mobileCurve = matchMedia('(max-width: 767px)');
  const appleWebKit = /AppleWebKit/i.test(navigator.userAgent) && !/Chrome|Chromium|Edg/i.test(navigator.userAgent);
  root.dataset.crtEngine = appleWebKit ? 'webkit-svg' : 'svg';

  function updateCurveScale() {
    if (!displacement) return;
    displacement.setAttribute('scale', mobileCurve.matches ? '38' : '50');
  }

  function createWarpMap() {
    const canvas = document.createElement('canvas');
    const size = 512;
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx || !warpImage) return;

    const pixels = ctx.createImageData(size, size);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const nx = x / (size - 1) * 2 - 1;
        const ny = y / (size - 1) * 2 - 1;
        const radial = nx * nx + ny * ny;
        const i = (y * size + x) * 4;

        // Exact reader lens map. Curvature is fixed geometry and is never
        // rewritten by hover/click/glitch interactions.
        pixels.data[i] = Math.round(128 + nx * radial * 45);
        pixels.data[i + 1] = Math.round(128 + ny * radial * 45);
        pixels.data[i + 2] = 128;
        pixels.data[i + 3] = 255;
      }
    }

    ctx.putImageData(pixels, 0, 0);
    warpImage.setAttribute('href', canvas.toDataURL('image/png'));
    warpImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', canvas.toDataURL('image/png'));
  }

  function triggerSyncBurst(strength = 1) {
    if (reducedMotion.matches) return;

    root.style.setProperty('--tear-y', String(Math.round(10 + Math.random() * 78)) + '%');
    root.style.setProperty('--tear-h', String(1 + Math.round(Math.random() * 4 * strength)) + 'px');
    root.style.setProperty('--tear-x', String(Math.round((Math.random() - .5) * 30 * strength)) + 'px');
    root.style.setProperty('--tear-o', String(Math.min(.72, .34 + strength * .22)));

    signal.dataset.burst = 'true';
    setTimeout(function() {
      root.style.setProperty('--tear-o', '0');
      signal.dataset.burst = 'false';
    }, 34 + Math.random() * 48);
  }

  function signalTick() {
    if (reducedMotion.matches) return;

    const base = .20;
    const motion = Math.min(1.0, pointerEnergy * .5);
    const x = (Math.random() - .5) * (base + motion);
    const y = (Math.random() - .5) * (.11 + motion * .18);

    root.style.setProperty('--jitter-x', x.toFixed(2) + 'px');
    root.style.setProperty('--jitter-y', y.toFixed(2) + 'px');
    root.style.setProperty('--flicker', (.988 + Math.random() * .021).toFixed(3));

    pointerEnergy *= .9;

    if (Math.random() < .03) triggerSyncBurst(.62 + Math.random() * .5);

    if (Math.random() < .0035) {
      signal.dataset.drop = 'true';
      setTimeout(function() {
        signal.dataset.drop = 'false';
      }, 22 + Math.random() * 50);
    }
  }

  function noiseFrame() {
    if (reducedMotion.matches || !noiseCanvas) return;

    const rect = screen.getBoundingClientRect();
    const width = Math.max(170, Math.floor(rect.width * .18));
    const height = Math.max(110, Math.floor(rect.height * .18));

    if (noiseCanvas.width !== width || noiseCanvas.height !== height) {
      noiseCanvas.width = width;
      noiseCanvas.height = height;
    }

    const ctx = noiseCanvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const image = ctx.createImageData(width, height);
    for (let i = 0; i < image.data.length; i += 4) {
      const bright = Math.random() > .965;
      const value = bright ? 220 + Math.random() * 35 : Math.random() * 100;
      image.data[i] = value;
      image.data[i + 1] = value;
      image.data[i + 2] = value;
      image.data[i + 3] = bright ? 23 : 6;
    }
    ctx.putImageData(image, 0, 0);
  }

  function moveRoll() {
    if (reducedMotion.matches) return;
    roll += .26;
    if (roll > 112) roll = -26;
    root.style.setProperty('--roll-y', roll.toFixed(1) + '%');
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

  createWarpMap();
  updateCurveScale();
  noiseFrame();

  screen.addEventListener('pointermove', onPointerMove, { passive: true });
  addEventListener('resize', noiseFrame, { passive: true });
  mobileCurve.addEventListener?.('change', updateCurveScale);

  jitterTimer = setInterval(signalTick, 34);
  noiseTimer = setInterval(noiseFrame, 104);
  rollTimer = setInterval(moveRoll, 50);

  return {
    pulse: triggerSyncBurst,
    addEnergy: function(amount) {
      pointerEnergy = Math.min(1.35, pointerEnergy + amount);
    },
    destroy: function() {
      clearInterval(jitterTimer);
      clearInterval(noiseTimer);
      clearInterval(rollTimer);
      screen.removeEventListener('pointermove', onPointerMove);
      removeEventListener('resize', noiseFrame);
      mobileCurve.removeEventListener?.('change', updateCurveScale);
    }
  };
}

export function setInteractiveGlow(button, event) {
  const rect = button.getBoundingClientRect();
  button.style.setProperty('--px', String(event.clientX - rect.left) + 'px');
  button.style.setProperty('--py', String(event.clientY - rect.top) + 'px');
}
