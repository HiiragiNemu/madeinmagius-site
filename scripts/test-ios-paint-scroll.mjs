import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { paintScrollRequested, coastStep } from '../assets/ios-paint-scroll.js';

for (const query of ['', '?iosPaintScroll=0', '?iosPaintScroll=true']) {
  assert.equal(paintScrollRequested(true, query), false);
}
assert.equal(paintScrollRequested(true, '?iosPaintScroll=1'), true);
assert.equal(paintScrollRequested(false, '?iosPaintScroll=1'), false);
const full = coastStep(2, 32), a = coastStep(2, 16), b = coastStep(a.velocity, 16);
assert.ok(Math.abs(full.distance - a.distance - b.distance) < 1e-10);
assert.ok(Math.abs(full.velocity - b.velocity) < 1e-10);
assert.deepEqual(coastStep(2, -1), { distance: 0, velocity: 2 });
const source = readFileSync(new URL('../assets/ios-paint-scroll.js', import.meta.url), 'utf8');
assert.doesNotMatch(source, /cloneNode|foreignObject|devicePixelRatio|canvas|setProperty\(['"]filter/);
assert.match(source, /mutation.disconnect\(\)/);
assert.match(source, /owned.forEach\(restore\)/);
assert.match(source, /overflow-x', 'hidden', 'important'/);
assert.match(source, /overflow-y', 'hidden', 'important'/);
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.ok(html.indexOf('id="boot"') > html.indexOf('id="signal"'));
const app = readFileSync(new URL('../assets/app.js', import.meta.url), 'utf8');
assert.match(app, /if \(event.persisted && usePaintScroll\) return/);
console.log('PASS iOS trial opt-in only; momentum stable; no cloned scene or optical downgrade; cleanup; shared boot lens');
