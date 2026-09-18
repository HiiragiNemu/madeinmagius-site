export function setupCrtEffects(options) {
  const root = document.documentElement;
  const signal = options.signal;
  const screen = options.screen;
  const noiseCanvas = options.noiseCanvas;
  const warpImage = options.warpImage;
  const turbulence = options.turbulence;
  const reducedMotion = options.reducedMotion;
  let pointerEnergy = 0;
  let lastPointer = { x: innerWidth / 2, y: innerHeight / 2, t: performance.now() };
  let roll = -28;
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
        const radial = Math.min(1.35, nx * nx + ny * ny);
        const i = (y * size + x) * 4;
        pixels.data[i] = Math.max(0, Math.min(255, Math.round(128 + nx * radial * 84)));
        pixels.data[i + 1] = Math.max(0, Math.min(255, Math.round(128 + ny * radial * 84)));
        pixels.data[i + 2] = 128;
        pixels.data[i + 3] = 255;
      }
    }
    ctx.putImageData(pixels, 0, 0);
    warpImage.setAttribute('href', canvas.toDataURL());
  }

  function triggerSyncBurst(strength) {
    if (reducedMotion.matches) return;
    const power = strength || 1;
    signal.dataset.slip = 'true';
    root.style.setProperty('--tear-y', String(Math.round(16 + Math.random() * 70)) + '%');
    root.style.setProperty('--tear-h', String(2 + Math.round(Math.random() * 7 * power)) + 'px');
    root.style.setProperty('--tear-x', String(Math.round((Math.random() - .5) * 52 * power)) + 'px');
    root.style.setProperty('--tear-o', String(Math.min(.95, .6 + power * .22)));
    setTimeout(function() {
      signal.dataset.slip = 'false';
      root.style.setProperty('--tear-o', '0');
    }, 42 + Math.random() * 65);
  }

  function signalTick() {
    if (reducedMotion.matches) return;
    const energy = .7 + pointerEnergy * 2.4;
    root.style.setProperty('--jitter-x', String(((Math.random() - .5) * energy).toFixed(2)) + 'px');
    root.style.setProperty('--jitter-y', String(((Math.random() - .5) * Math.min(.8, energy * .3)).toFixed(2)) + 'px');
    root.style.setProperty('--signal-scale', String((1 + (Math.random() - .5) * .0022).toFixed(4)));
    root.style.setProperty('--flicker', String((.955 + Math.random() * .075).toFixed(3)));
    pointerEnergy *= .88;

    if (Math.random() < .07) triggerSyncBurst(.8 + Math.random() * .8);
    if (Math.random() < .011) {
      signal.dataset.drop = 'true';
      setTimeout(function() {
        signal.dataset.drop = 'false';
      }, 26 + Math.random() * 92);
    }
    if (Math.random() < .045 && turbulence) {
      turbulence.setAttribute('seed', String(Math.floor(Math.random() * 9999)));
    }
  }

  function noiseFrame() {
    if (reducedMotion.matches || !noiseCanvas) return;
    const rect = screen.getBoundingClientRect();
    const width = Math.max(180, Math.floor(rect.width * .22));
    const height = Math.max(120, Math.floor(rect.height * .22));
    if (noiseCanvas.width !== width || noiseCanvas.height !== height) {
      noiseCanvas.width = width;
      noiseCanvas.height = height;
    }
    const ctx = noiseCanvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    const image = ctx.createImageData(width, height);
    for (let i = 0; i < image.data.length; i += 4) {
      const bright = Math.random() > .9;
      const value = bright ? 215 + Math.random() * 40 : Math.random() * 120;
      image.data[i] = value;
      image.data[i + 1] = value;
      image.data[i + 2] = value;
      image.data[i + 3] = bright ? 38 : 13;
    }
    ctx.putImageData(image, 0, 0);
  }

  function moveRoll() {
    if (reducedMotion.matches) return;
    roll += .82;
    if (roll > 112) roll = -28;
    root.style.setProperty('--roll-y', String(roll.toFixed(1)) + '%');
  }

  function onPointerMove(event) {
    const rect = screen.getBoundingClientRect();
    root.style.setProperty('--mx', String(event.clientX - rect.left) + 'px');
    root.style.setProperty('--my', String(event.clientY - rect.top) + 'px');
    const now = performance.now();
    const dt = Math.max(12, now - lastPointer.t);
    const velocity = Math.hypot(event.clientX - lastPointer.x, event.clientY - lastPointer.y) / dt;
    pointerEnergy = Math.min(1.8, pointerEnergy * .68 + velocity * .27);
    lastPointer = { x: event.clientX, y: event.clientY, t: now };
  }

  createWarpMap();
  noiseFrame();
  screen.addEventListener('pointermove', onPointerMove, { passive: true });
  addEventListener('resize', noiseFrame, { passive: true });
  jitterTimer = setInterval(signalTick, 32);
  noiseTimer = setInterval(noiseFrame, 78);
  rollTimer = setInterval(moveRoll, 45);

  return {
    pulse: triggerSyncBurst,
    addEnergy: function(amount) {
      pointerEnergy = Math.min(1.8, pointerEnergy + amount);
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
