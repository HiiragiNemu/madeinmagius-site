export function setupCrtEffects(options) {
  const root = document.documentElement;
  const warpImage = options.warpImage;
  const curveDisplacement = document.getElementById('curve-displacement');
  const mobile = matchMedia('(max-width: 767px)');
  const ua = navigator.userAgent || '';
  const isIOSWebKit = /AppleWebKit/i.test(ua) && (
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );

  // Performance-first static CRT mode: desktop keeps one static optical warp;
  // mobile/WebKit uses the CSS glass curve with no SVG filter.
  const mobileStatic = mobile.matches || isIOSWebKit;
  root.dataset.crtEngine = mobileStatic ? 'mobile-static' : 'static-svg';

  function updateCurveScale() {
    if (!curveDisplacement) return;
    curveDisplacement.setAttribute('scale', '46');
  }

  function createWarpMap() {
    if (!warpImage || mobileStatic) return;

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

  return {
    pulse() {},
    scan() {},
    addEnergy() {},
    destroy() {}
  };
}

export function setInteractiveGlow(button, event) {
  const rect = button.getBoundingClientRect();
  button.style.setProperty('--px', String(event.clientX - rect.left) + 'px');
  button.style.setProperty('--py', String(event.clientY - rect.top) + 'px');
}
