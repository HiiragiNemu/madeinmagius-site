/* PixEz Pulse v4.1 — Cached Glass Mask + Viewport Filter (Zero-Lag Prewarm Edition) */
(() => {
  'use strict';

  const usesCachedGlassMask = (userAgent) => /(?:Chrome|Chromium|Edg)\//.test(userAgent);
  const GLASS_REFRACTION_SCALE = 4;
  const GLASS_REFRACTION_MATRIX = '0 0 0 -.375 .5  0 0 0 .15 .5  0 0 0 0 .5  0 0 0 0 1';

  let sharedScratchDataUriPromise = null;
  function loadScratchDataUri() {
    if (sharedScratchDataUriPromise) return sharedScratchDataUriPromise;
    sharedScratchDataUriPromise = fetch('./textures/frost-glass-scratches.png')
      .then((response) => {
        if (!response.ok) throw new Error('Glass source fetch failed');
        return response.blob();
      })
      .then(
        (blob) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          })
      );
    void sharedScratchDataUriPromise.catch(() => {
      sharedScratchDataUriPromise = null;
    });
    return sharedScratchDataUriPromise;
  }

  function glassMaskSize(width, height, dpr) {
    if (![width, height, dpr].every((n) => Number.isFinite(n) && n > 0)) return null;
    return { width, height, dpr, pixelWidth: Math.ceil(width * dpr), pixelHeight: Math.ceil(height * dpr) };
  }

  function glassMaskExtent(previous, next) {
    return {
      width: (previous.pixelWidth / previous.dpr) * (next.width / previous.width),
      height: (previous.pixelHeight / previous.dpr) * (next.height / previous.height)
    };
  }

  function glassMaskSvg(size, imageData) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size.pixelWidth}" height="${size.pixelHeight}" viewBox="0 0 ${size.pixelWidth / size.dpr} ${size.pixelHeight / size.dpr}"><defs><filter id="mask" filterUnits="userSpaceOnUse" x="0" y="0" width="${size.width}" height="${size.height}" color-interpolation-filters="sRGB"><feImage href="${imageData}" x="0" y="0" width="${size.width}" height="${size.height}" preserveAspectRatio="none" result="scratchMap"/><feColorMatrix in="scratchMap" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  .2126 .7152 .0722 0 0" result="scratchMask"/><feMorphology in="scratchMask" operator="dilate" radius=".6"/></filter></defs><rect width="${size.width}" height="${size.height}" filter="url(#mask)"/></svg>`;
  }

  async function renderMask(size, data) {
    const svgUrl = URL.createObjectURL(new Blob([glassMaskSvg(size, data)], { type: 'image/svg+xml' }));
    let pngUrl = '';
    const canvas = document.createElement('canvas');
    try {
      const svg = new Image();
      svg.src = svgUrl;
      await svg.decode();
      canvas.width = size.pixelWidth;
      canvas.height = size.pixelHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Glass mask canvas unavailable');
      context.drawImage(svg, 0, 0);
      const png = await new Promise((resolve, reject) =>
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Glass mask raster failed'))), 'image/png')
      );
      pngUrl = URL.createObjectURL(png);
      const image = new Image();
      image.src = pngUrl;
      await image.decode();
      return { url: pngUrl, image };
    } catch (error) {
      if (pngUrl) URL.revokeObjectURL(pngUrl);
      throw error;
    } finally {
      URL.revokeObjectURL(svgUrl);
      canvas.width = canvas.height = 0;
    }
  }

  function startCachedGlassMask(root, original, ready = () => {}) {
    if (!usesCachedGlassMask(navigator.userAgent)) {
      ready();
      return () => {};
    }
    const property = '--call-glass-filter-v12';
    const base = root.style.getPropertyValue(property);
    let stopped = false;
    let generation = 0;
    let timer = 0;
    let sizeKey = '';
    let clone = null;
    let resource = null;
    let resourceSize = null;
    const source = loadScratchDataUri();

    const restore = () => {
      if (clone && root.style.getPropertyValue(property) === `url(#${clone.id})`) {
        root.style.setProperty(property, base);
      }
      clone?.remove();
      clone = null;
      if (resource) URL.revokeObjectURL(resource.url);
      resource = null;
      resourceSize = null;
      delete root.dataset.glassMaskCache;
    };

    const prepare = async (size, token) => {
      try {
        const data = await source;
        if (stopped || token !== generation) return;
        const next = await renderMask(size, data);
        if (stopped || token !== generation) {
          URL.revokeObjectURL(next.url);
          return;
        }
        const cached = original.cloneNode(true);
        cached.id = `${original.id}-cached-${token}`;
        cached.children[0].setAttribute('href', next.url);
        cached.children[0].setAttribute('result', 'crackZone');
        cached.children[0].setAttribute('width', String(size.pixelWidth / size.dpr));
        cached.children[0].setAttribute('height', String(size.pixelHeight / size.dpr));
        cached.children[2].remove();
        cached.children[1].remove();
        original.parentNode.appendChild(cached);
        const previousClone = clone;
        const previousResource = resource;
        clone = cached;
        resource = next;
        resourceSize = size;
        root.style.setProperty(property, `url(#${cached.id})`);
        root.dataset.glassMaskCache = `${size.pixelWidth}x${size.pixelHeight}`;
        previousClone?.remove();
        if (previousResource) URL.revokeObjectURL(previousResource.url);
        ready();
      } catch {
        if (!stopped && token === generation) ready();
      }
    };

    const resize = (immediate = false) => {
      const size = glassMaskSize(root.offsetWidth, root.offsetHeight, window.devicePixelRatio);
      if (!size) {
        sizeKey = '';
        generation++;
        clearTimeout(timer);
        return;
      }
      const key = `${size.width}:${size.height}:${size.dpr}`;
      if (key === sizeKey) return;
      sizeKey = key;
      const token = ++generation;
      clearTimeout(timer);
      if (clone && resourceSize) {
        const extent = glassMaskExtent(resourceSize, size);
        clone.children[0].setAttribute('width', String(extent.width));
        clone.children[0].setAttribute('height', String(extent.height));
      }
      // Run immediately (0ms) on initial mount so prewarm/first switch has zero debounce lag
      if (immediate || !clone) {
        void prepare(size, token);
      } else {
        timer = window.setTimeout(() => {
          void prepare(size, token);
        }, 120);
      }
    };

    const onResize = () => resize(false);
    const observer = new ResizeObserver(onResize);
    observer.observe(root);
    window.addEventListener('resize', onResize);
    resize(true);

    return () => {
      stopped = true;
      generation++;
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('resize', onResize);
      restore();
    };
  }

  function boundViewportFilter(filter, width, height) {
    if (!(width > 0 && height > 0)) return;
    filter.setAttribute('filterUnits', 'userSpaceOnUse');
    filter.setAttribute('primitiveUnits', 'userSpaceOnUse');
    for (const node of [filter, ...Array.from(filter.children)]) {
      node.setAttribute('x', '0');
      node.setAttribute('y', '0');
      node.setAttribute('width', String(width));
      node.setAttribute('height', String(height));
    }
  }

  function mountViewportFilter(root, source, property) {
    const ns = 'http://www.w3.org/2000/svg';
    const host = document.createElementNS(ns, 'svg');
    host.setAttribute('width', '0');
    host.setAttribute('height', '0');
    host.setAttribute('aria-hidden', 'true');
    host.dataset.viewportFilter = source.id;
    host.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;overflow:hidden';
    const defs = document.createElementNS(ns, 'defs');
    host.appendChild(defs);
    const filter = source.cloneNode(true);
    filter.id = `${source.id}-viewport`;
    defs.appendChild(filter);
    document.body.appendChild(host);
    const previous = root.style.getPropertyValue(property);
    const resize = () => {
      for (const child of Array.from(defs.children)) {
        const image = child.id.includes('-cached-') ? child.firstElementChild : null;
        const extent = image && [image.getAttribute('width'), image.getAttribute('height')];
        boundViewportFilter(child, root.clientWidth, root.clientHeight);
        if (image && extent) {
          image.setAttribute('width', extent[0]);
          image.setAttribute('height', extent[1]);
        }
      }
    };
    resize();
    root.style.setProperty(property, `url(#${filter.id})`);
    const observer = new ResizeObserver(resize);
    observer.observe(root);
    return {
      filter,
      dispose: () => {
        observer.disconnect();
        if (root.style.getPropertyValue(property).includes(filter.id)) {
          if (previous) root.style.setProperty(property, previous);
          else root.style.removeProperty(property);
        }
        host.remove();
      }
    };
  }

  window.CallGlassCache = Object.freeze({
    startCachedGlassMask,
    loadScratchDataUri,
    glassMaskSize,
    glassMaskExtent,
    glassMaskSvg,
    usesCachedGlassMask,
    GLASS_REFRACTION_MATRIX,
    GLASS_REFRACTION_SCALE,
    boundViewportFilter,
    mountViewportFilter
  });
})();
