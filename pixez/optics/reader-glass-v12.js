/* PixEz Pulse v4.1 — Zero-Lag Simultaneous Cold Glass Film & Texture Prewarmer
 * - Preloads & decodes frost-glass-scratches.png + all optical textures on startup.
 * - Pre-warms and KEEPS the CallGlassCache SVG refraction mask ready in memory
 *   across theme switches so enabling frost + glass scratches renders in the
 *   EXACT same paint frame as the theme colors with zero async pop-in! */
(() => {
  'use strict';
  const root = document.documentElement;
  const scene = document.querySelector('.call-display-root-v7');
  if (!scene) return;

  const ns = 'http://www.w3.org/2000/svg';
  const property = '--call-glass-filter-v12';

  // Retire any stale static wear node
  scene.querySelectorAll('.call-fx-frost-wear-v7, .call-glass-refraction-v12').forEach((node) => node.remove());

  // Preload & decode all optical textures once at startup so theme switches never pop in textures late
  const PRELOAD_TEXTURES = [
    './textures/frost-glass-scratches.png',
    './textures/2k_BG_Texture.png',
    './textures/DirtHighContrast.png',
    './textures/magi-lofi-grain.png',
    './textures/NoiseAndGrain.png',
    './textures/PixelOverlay_RGB_16.png',
    './textures/magi-tube-lens-512.png'
  ];
  const preloadedImages = [];
  function preloadAllTextures() {
    for (const url of PRELOAD_TEXTURES) {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      if (typeof img.decode === 'function') {
        img.decode().catch(() => {});
      }
      preloadedImages.push(img);
    }
  }

  let mounted = false;
  let prepared = false;
  let activeDesired = false;
  let readyPromise = null;
  let wearEl = null;
  let refractionEl = null;

  function applyVisibility(visible) {
    if (visible && prepared) {
      if (wearEl) wearEl.style.removeProperty('visibility');
      if (refractionEl) refractionEl.style.removeProperty('visibility');
      root.dataset.callGlassActive = 'true';
    } else {
      if (wearEl) wearEl.style.visibility = 'hidden';
      if (refractionEl) refractionEl.style.visibility = 'hidden';
      root.dataset.callGlassActive = 'false';
    }
  }

  function ensurePrepared() {
    if (readyPromise) return readyPromise;
    mounted = true;

    const defs = document.createElementNS(ns, 'svg');
    defs.setAttribute('width', '0');
    defs.setAttribute('height', '0');
    defs.setAttribute('aria-hidden', 'true');
    defs.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;overflow:hidden';
    defs.classList.add('call-optics-defs-v7', 'call-glass-definitions-v19');
    defs.innerHTML = `<defs><filter id="call-glass-refraction-v12" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feImage href="./textures/frost-glass-scratches.png" x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="scratchMap"/>
      <feColorMatrix in="scratchMap" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  .2126 .7152 .0722 0 0" result="scratchMask"/>
      <feMorphology in="scratchMask" operator="dilate" radius=".6" result="crackZone"/>
      <feColorMatrix in="crackZone" type="matrix" values="${window.CallGlassCache.GLASS_REFRACTION_MATRIX}" result="refractionMap"/>
      <feDisplacementMap in="SourceGraphic" in2="refractionMap" scale="${window.CallGlassCache.GLASS_REFRACTION_SCALE}" xChannelSelector="R" yChannelSelector="G"/>
    </filter></defs>`;
    document.body.appendChild(defs);

    const viewport = window.CallGlassCache.mountViewportFilter(scene, defs.querySelector('filter'), property);

    wearEl = document.createElement('img');
    wearEl.className = 'call-fx-frost-wear-v7';
    wearEl.alt = '';
    wearEl.decoding = 'async';
    wearEl.src = './textures/frost-glass-scratches.png';
    wearEl.style.visibility = 'hidden';
    scene.appendChild(wearEl);

    refractionEl = document.createElement('div');
    refractionEl.className = 'call-glass-refraction-v12';
    refractionEl.setAttribute('aria-hidden', 'true');
    refractionEl.style.visibility = 'hidden';
    scene.appendChild(refractionEl);

    scene.dataset.filmReady = 'false';

    readyPromise = new Promise((resolve) => {
      const finish = () => {
        if (prepared) return;
        prepared = true;
        scene.dataset.filmReady = 'true';
        if (activeDesired) applyVisibility(true);
        scene.dispatchEvent(new Event('call-film-ready'));
        resolve();
      };

      (async () => {
        try {
          await wearEl.decode();
        } catch (_) {}
        window.CallGlassCache.startCachedGlassMask(scene, viewport.filter, finish);
      })();
    });

    return readyPromise;
  }

  function sync(on = root.dataset.callTheme === 'frost' && root.dataset.callFxGlassDamage === 'true', deferActivation = false) {
    activeDesired = Boolean(on) && !deferActivation;
    if (!on) {
      applyVisibility(false);
      return Promise.resolve();
    }
    const p = ensurePrepared();
    // Synchronous same-frame activation when already pre-warmed!
    if (prepared && activeDesired) {
      applyVisibility(true);
    }
    return p;
  }

  function prepare() {
    return ensurePrepared();
  }

  function isPrepared() {
    return prepared;
  }

  window.CallGlass = Object.freeze({ sync, prepare, isPrepared });

  // Preload textures immediately and pre-warm glass refraction cache on startup/idle
  preloadAllTextures();
  if (root.dataset.callTheme === 'frost' && root.dataset.callFxGlassDamage === 'true') {
    sync(true, false);
  } else {
    root.dataset.callGlassActive = 'false';
    const startPrewarm = () => {
      if (!mounted) ensurePrepared();
    };
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(startPrewarm, { timeout: 600 });
    } else {
      setTimeout(startPrewarm, 80);
    }
  }
})();
