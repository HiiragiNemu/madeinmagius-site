export function setupCrtEffects(options) {
  const root = document.documentElement;
  const warpImage = options.warpImage;
  const curveDisplacement = document.getElementById('curve-displacement');
  // One static optical path on every viewport. A phone is not a reason to
  // discard the lens. There is no animation or per-frame texture allocation.
  root.dataset.crtEngine = 'static-svg';

  function updateCurveScale() {
    if (!curveDisplacement) return;
    // Explicit pixel bounds avoid percentage filter-region rounding in WebKit.
    const filter = curveDisplacement.parentElement;
    const width = options.signal.clientWidth;
    const height = options.signal.clientHeight;
    filter.setAttribute('filterUnits', 'userSpaceOnUse');
    filter.setAttribute('primitiveUnits', 'userSpaceOnUse');
    for (const node of [filter, warpImage]) {
      node.setAttribute('width', String(width));
      node.setAttribute('height', String(height));
    }
    const size = Math.min(options.screen.clientWidth, window.innerHeight);
    curveDisplacement.setAttribute('scale', String(Math.round(Math.max(32, Math.min(64, size * .095)))));
  }

  function createWarpMap() {
    if (!warpImage) return;

    const canvas = document.createElement('canvas');
    const size = 384;
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
        pixels.data[i] = Math.round(128 + nx * radial * 43);
        pixels.data[i + 1] = Math.round(128 + ny * radial * 43);
        pixels.data[i + 2] = 128;
        pixels.data[i + 3] = 255;
      }
    }

    ctx.putImageData(pixels, 0, 0);
    const url = canvas.toDataURL('image/png');
    warpImage.setAttribute('href', url);
    warpImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', url);
  }

  createWarpMap();
  updateCurveScale();
  const resizeObserver = new ResizeObserver(updateCurveScale);
  resizeObserver.observe(options.screen);
  window.addEventListener('resize', updateCurveScale);

  return {
    pulse() {},
    scan() {},
    addEnergy() {},
    destroy() {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateCurveScale);
    }
  };
}

export function setInteractiveGlow(button, event) {
  const rect = button.getBoundingClientRect();
  button.style.setProperty('--px', String(event.clientX - rect.left) + 'px');
  button.style.setProperty('--py', String(event.clientY - rect.top) + 'px');
}
