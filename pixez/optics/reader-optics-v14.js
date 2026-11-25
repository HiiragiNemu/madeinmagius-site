/* PixEz Pulse v4.1 — Zero-Jump Static Reader v14 Optical Filter Runtime
 * - Pre-mounts ALL static <filter> graphs ONCE inside <defs> at boot.
 * - NEVER destroys or replaces <filter> or <feImage> elements on theme switch
 *   or dispersion toggle (eliminates the 25px diagonal feDisplacementMap jump!).
 * - Pre-fetches and inlines magi-tube-lens-512.png as a data URI once. */
(() => {
  'use strict';
  const ns = 'http://www.w3.org/2000/svg';
  const parse = (markup) =>
    new DOMParser().parseFromString('<svg xmlns="' + ns + '">' + markup + '</svg>', 'image/svg+xml').querySelector('filter');
  const instances = new WeakMap();
  const materialInstances = new WeakMap();
  let nextInstance = 0;

  let cachedLensDataUriPromise = null;
  function loadLensDataUri() {
    if (cachedLensDataUriPromise) return cachedLensDataUriPromise;
    cachedLensDataUriPromise = fetch('./textures/magi-tube-lens-512.png')
      .then((res) => {
        if (!res.ok) throw new Error('Lens map fetch failed');
        return res.blob();
      })
      .then(
        (blob) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          })
      )
      .catch(() => null);
    return cachedLensDataUriPromise;
  }

  function mountMaterials(scene) {
    if (materialInstances.has(scene)) return materialInstances.get(scene);
    function surface(className, enabled) {
      const current = scene.querySelector('.' + className);
      if (!enabled) {
        current?.remove();
        return;
      }
      if (current) return;
      const span = document.createElement('span');
      span.className = className + ' call-material-direct-v11';
      span.setAttribute('aria-hidden', 'true');
      scene.appendChild(span);
    }
    function sync() {
      const d = document.documentElement.dataset;
      surface('call-fx-day-grain-v7', d.callFxNoise === 'true' && d.callTheme !== 'dark');
      surface('call-fx-scanlines-v7', d.callFxScanlines === 'true');
      d.callReaderOptics = 'v14';
    }
    sync();
    const api = { sync };
    materialInstances.set(scene, api);
    return api;
  }

  function resolveGraphKeys(d) {
    const reg = d.callFxRegistration === 'true' ? 'true' : 'false';
    const theme = d.callTheme || 'paper';
    const phosphor = d.callPhosphor === 'amber' ? 'amber' : 'green';
    let tubeKey;
    let flatKey;
    if (theme === 'dark') {
      tubeKey = 'dark:' + phosphor + ':' + reg;
      flatKey = 'flat:' + phosphor;
    } else if (theme === 'frost') {
      tubeKey = 'frost:' + reg;
      flatKey = 'flat:day';
    } else {
      tubeKey = 'day:' + reg;
      flatKey = 'flat:day';
    }
    return { tubeKey, flatKey };
  }

  function mount(scene) {
    if (instances.has(scene)) return instances.get(scene);
    const instanceId = ++nextInstance;
    const svg = document.createElementNS(ns, 'svg');
    svg.classList.add('call-optics-defs-v7', 'call-reader-optics-defs-v14');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;overflow:hidden';
    const defs = document.createElementNS(ns, 'defs');
    svg.appendChild(defs);
    document.body.appendChild(svg);

    const filterNodes = new Map();
    const filterIds = new Map();
    const lensImages = [];
    const dispMaps = [];

    for (const [key, markup] of Object.entries(window.CallReaderGraphsV14 || {})) {
      const node = document.importNode(parse(markup), true);
      const safeId = 'call-opt-' + instanceId + '-' + key.replace(/[^a-z0-9]+/gi, '-');
      node.setAttribute('id', safeId);
      defs.appendChild(node);
      filterNodes.set(key, node);
      filterIds.set(key, safeId);
      const feImg = node.querySelector('feImage[data-lens-map="true"]');
      if (feImg) lensImages.push(feImg);
      const disp = node.querySelector('feDisplacementMap');
      if (disp) dispMaps.push(disp);
    }

    // Inline lens PNG data URI once so every tube filter uses an immediately available bitmap
    loadLensDataUri().then((dataUri) => {
      if (!dataUri) return;
      for (const feImg of lensImages) {
        feImg.setAttribute('href', dataUri);
      }
    });

    const materials = mountMaterials(scene);
    let sizeKey = '';
    let activeTubeId = '';
    let activeFlatId = '';

    function syncViewportBounds() {
      const width = scene.clientWidth;
      const height = scene.clientHeight;
      if (!(width > 0 && height > 0)) return;
      const nextSize = width + 'x' + height;
      if (nextSize === sizeKey) return;
      for (const filter of filterNodes.values()) {
        filter.setAttribute('filterUnits', 'userSpaceOnUse');
        filter.setAttribute('primitiveUnits', 'userSpaceOnUse');
        for (const primitive of [filter, ...filter.children]) {
          primitive.setAttribute('x', '0');
          primitive.setAttribute('y', '0');
          primitive.setAttribute('width', String(width));
          primitive.setAttribute('height', String(height));
        }
      }
      const scale = width <= 767 ? '38' : '50';
      for (const disp of dispMaps) {
        disp.setAttribute('scale', scale);
      }
      sizeKey = nextSize;
      scene.dataset.opticalViewport = nextSize;
    }

    function sync() {
      const d = document.documentElement.dataset;
      syncViewportBounds();
      const { tubeKey, flatKey } = resolveGraphKeys(d);
      const nextTubeId = filterIds.get(tubeKey) || '';
      const nextFlatId = filterIds.get(flatKey) || '';
      if (nextTubeId && nextTubeId !== activeTubeId) {
        scene.style.setProperty('--call-active-tube-filter', 'url(#' + nextTubeId + ')');
        activeTubeId = nextTubeId;
      }
      if (nextFlatId && nextFlatId !== activeFlatId) {
        scene.style.setProperty('--call-active-flat-filter', 'url(#' + nextFlatId + ')');
        activeFlatId = nextFlatId;
      }
      materials.sync();
      scene.dataset.opticalGraph = tubeKey;
    }

    sync();
    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(syncViewportBounds).observe(scene);
    }
    const api = { sync };
    instances.set(scene, api);
    return api;
  }

  window.CallReaderOpticsV14 = Object.freeze({ mount, mountMaterials, loadLensDataUri });
})();
