export function setupCrtEffects(options) {
  const root = document.documentElement;
  const signal = options.signal;
  const screen = options.screen;
  const noiseCanvas = options.noiseCanvas;
  const warpImage = options.warpImage;
  const reducedMotion = options.reducedMotion;

  let pointerEnergy = 0;
  let lastPointer = { x: innerWidth / 2, y: innerHeight / 2, t: performance.now() };
  let roll = -26;
  let jitterTimer = 0;
  let noiseTimer = 0;
  let rollTimer = 0;

  function createWarpMap() {
    const canvas = document.createElement('canvas');
    const size = 384;
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx || !warpImage) return;

    const pixels = ctx.createImageData(size, size);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const nx = x / (size - 1) * 2 - 1;
        const ny = y / (size - 1) * 2 - 1;
        const r2 = Math.min(1.4, nx * nx + ny * ny);
        const edgeWeight = Math.pow(r2, 1.55);
        const i = (y * size + x) * 4;

        pixels.data[i] = Math.max(0, Math.min(255, Math.round(128 + nx * edgeWeight * 72)));
        pixels.data[i + 1] = Math.max(0, Math.min(255, Math.round(128 + ny * edgeWeight * 72)));
        pixels.data[i + 2] = 128;
        pixels.data[i + 3] = 255;
      }
    }

    ctx.putImageData(pixels, 0, 0);
    warpImage.setAttribute('href', canvas.toDataURL());
  }

  function triggerSyncBurst(strength = 1) {
    if (reducedMotion.matches) return;

    root.style.setProperty('--tear-y', String(Math.round(10 + Math.random() * 78)) + '%');
    root.style.setProperty('--tear-h', String(1 + Math.round(Math.random() * 4 * strength)) + 'px');
    root.style.setProperty('--tear-x', String(Math.round((Math.random() - .5) * 34 * strength)) + 'px');
    root.style.setProperty('--tear-o', String(Math.min(.78, .38 + strength * .22)));

    signal.dataset.burst = 'true';
    setTimeout(function() {
      root.style.setProperty('--tear-o', '0');
      signal.dataset.burst = 'false';
    }, 34 + Math.random() * 48);
  }

  function signalTick() {
    if (reducedMotion.matches) return;

    const base = .24;
    const motion = Math.min(1.2, pointerEnergy * .58);
    const x = (Math.random() - .5) * (base + motion);
    const y = (Math.random() - .5) * (.14 + motion * .22);

    root.style.setProperty('--jitter-x', x.toFixed(2) + 'px');
    root.style.setProperty('--jitter-y', y.toFixed(2) + 'px');
    root.style.setProperty('--flicker', (.985 + Math.random() * .026).toFixed(3));

    pointerEnergy *= .9;

    if (Math.random() < .034) triggerSyncBurst(.65 + Math.random() * .55);

    if (Math.random() < .0045) {
      signal.dataset.drop = 'true';
      setTimeout(function() {
        signal.dataset.drop = 'false';
      }, 24 + Math.random() * 58);
    }
  }

  function noiseFrame() {
    if (reducedMotion.matches || !noiseCanvas) return;

    const rect = screen.getBoundingClientRect();
    const width = Math.max(170, Math.floor(rect.width * .19));
    const height = Math.max(110, Math.floor(rect.height * .19));

    if (noiseCanvas.width !== width || noiseCanvas.height !== height) {
      noiseCanvas.width = width;
      noiseCanvas.height = height;
    }

    const ctx = noiseCanvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const image = ctx.createImageData(width, height);
    for (let i = 0; i < image.data.length; i += 4) {
      const bright = Math.random() > .955;
      const value = bright ? 210 + Math.random() * 45 : Math.random() * 100;
      image.data[i] = value;
      image.data[i + 1] = value;
      image.data[i + 2] = value;
      image.data[i + 3] = bright ? 26 : 7;
    }
    ctx.putImageData(image, 0, 0);
  }

  function moveRoll() {
    if (reducedMotion.matches) return;
    roll += .34;
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

    pointerEnergy = Math.min(1.5, pointerEnergy * .72 + velocity * .2);
    lastPointer = { x: event.clientX, y: event.clientY, t: now };
  }

  createWarpMap();
  noiseFrame();

  screen.addEventListener('pointermove', onPointerMove, { passive: true });
  addEventListener('resize', noiseFrame, { passive: true });

  jitterTimer = setInterval(signalTick, 34);
  noiseTimer = setInterval(noiseFrame, 96);
  rollTimer = setInterval(moveRoll, 48);

  return {
    pulse: triggerSyncBurst,
    addEnergy: function(amount) {
      pointerEnergy = Math.min(1.5, pointerEnergy + amount);
    },
    destroy: function() {
      clearInterval(jitterTimer);
      clearInterval(noiseTimer);
      clearInterval(rollTimer);
      screen.removeEventListener('pointermove', onPointerMove);
      removeEventListener('resize', noiseFrame);
    }
  };
}

export function setInteractiveGlow(button, event) {
  const rect = button.getBoundingClientRect();
  button.style.setProperty('--px', String(event.clientX - rect.left) + 'px');
  button.style.setProperty('--py', String(event.clientY - rect.top) + 'px');
}
