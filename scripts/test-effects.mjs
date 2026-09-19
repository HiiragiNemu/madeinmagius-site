import assert from 'node:assert/strict';
import { setupCrtEffects } from '../assets/effects.js';

// No browser, UA sniff, animation timer, or real canvas is needed to test the
// static lens lifecycle. Browser pixel comparisons cover actual rendering.
const element = () => ({ attrs: {}, setAttribute(key, value) { this.attrs[key] = value; } });
for (const width of [320, 390, 412, 820, 1600]) {
  const filter = element();
  const displacement = { ...element(), parentElement: filter };
  const warp = { ...element(), setAttributeNS(ns, key, value) { this.attrs[key] = value; } };
  const root = { dataset: {} };
  const screen = { clientWidth: width };
  const signal = { clientWidth: width, clientHeight: 844 };
  let allocations = 0, observed, disconnected = false, resize;
  globalThis.document = {
    documentElement: root,
    getElementById: () => displacement,
    createElement: () => ({
      getContext: () => ({
        createImageData(w, h) { allocations++; return { data: new Uint8ClampedArray(w * h * 4) }; },
        putImageData() {},
      }),
      toDataURL: () => 'data:image/png;base64,fixture',
    }),
  };
  globalThis.window = {
    innerHeight: 844,
    addEventListener(type, callback) { assert.equal(type, 'resize'); resize = callback; },
    removeEventListener(type, callback) { assert.equal(callback, resize); resize = null; },
  };
  globalThis.ResizeObserver = class {
    constructor(callback) { this.callback = callback; }
    observe(node) { observed = node; }
    disconnect() { disconnected = true; }
  };
  const effects = setupCrtEffects({ screen, signal, warpImage: warp });
  assert.equal(root.dataset.crtEngine, 'static-svg');
  assert.ok(Number(displacement.attrs.scale) >= 32);
  assert.ok(Number(displacement.attrs.scale) <= 64);
  assert.equal(filter.attrs.width, String(width));
  assert.equal(filter.attrs.height, '844');
  assert.equal(warp.attrs.href, 'data:image/png;base64,fixture');
  assert.equal(observed, screen);
  assert.equal(allocations, 1);
  screen.clientWidth = signal.clientWidth = 844;
  signal.clientHeight = window.innerHeight = 390;
  resize();
  assert.equal(displacement.attrs.scale, '37');
  assert.equal(filter.attrs.width, '844');
  assert.equal(filter.attrs.height, '390');
  effects.pulse(); effects.scan(); effects.addEnergy();
  assert.equal(allocations, 1);
  effects.destroy();
  assert.equal(disconnected, true);
  assert.equal(resize, null);
  console.log(`PASS static lens ${width}px: map, bounds, scale, rotation, idle, cleanup`);
}
console.log('PASS 5/5 static lens profiles');
