const geometryCache = new WeakMap();

// The optical coordinate system is the viewport, never the painted bounds of
// a hovered descendant. Keep every primitive fixed, including blur and echo.
export function updateCrtFilterGeometry(filter, curve, width, height, scale) {
  if (!filter || !curve || ![width, height, scale].every(value => Number.isFinite(value) && value > 0)) return false;
  const primitives = Array.from(filter.children);
  const key = [width, height, scale, primitives.length].join(':');
  if (geometryCache.get(filter) === key) return false;
  const set = (node, name, value) => { const text = String(value); if (node.getAttribute(name) !== text) node.setAttribute(name, text); };
  set(filter, 'filterUnits', 'userSpaceOnUse');
  set(filter, 'primitiveUnits', 'userSpaceOnUse');
  for (const node of [filter, ...primitives]) {
    set(node, 'x', 0); set(node, 'y', 0);
    set(node, 'width', width); set(node, 'height', height);
  }
  set(curve, 'scale', scale);
  geometryCache.set(filter, key);
  return true;
}

export function setupCrtEffects(options) {
  const root = document.documentElement;
  const warpImage = options.warpImage;
  const curveDisplacement = document.getElementById('curve-displacement');
  // iOS WebKit uses the existing CSS materials, without any reference-filter
  // curvature or displacement map allocation. Bootstrap already chose this
  // before first paint; runtime never changes a saved cross-device preference.
  if (root.dataset.crtPlatform === 'ios-webkit') {
    root.dataset.crtEngine = 'ios-static-css';
    curveDisplacement?.setAttribute('scale', '0');
    return { pulse() {}, scan() {}, addEnergy() {}, destroy() {} };
  }
  // Other platforms keep the existing static optical path. A phone is not a reason to
  // discard the lens. There is no animation or per-frame texture allocation.
  root.dataset.crtEngine = 'static-svg';

  function updateCurveScale() {
    if (!curveDisplacement) return;
    const width = options.signal.clientWidth;
    const height = options.signal.clientHeight;
    const size = Math.min(options.screen.clientWidth, window.innerHeight);
    updateCrtFilterGeometry(curveDisplacement.parentElement, curveDisplacement,
      width, height, Math.round(Math.max(32, Math.min(64, size * .095))));
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
  if (options.signal !== options.screen) resizeObserver.observe(options.signal);
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
