import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { updateCrtFilterGeometry } from '../assets/effects.js';
import { versionStaticAssets } from './version-static-assets.mjs';

class Node {
  attributes = new Map(); writes = 0; children = [];
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  setAttribute(name, value) { this.writes++; this.attributes.set(name, value); }
}

test('every CRT primitive keeps fixed viewport bounds and repeated hover-size notifications cause no writes', () => {
  const filter = new Node(); const curve = new Node();
  filter.children = [new Node(), curve, new Node(), new Node(), new Node()];
  assert.equal(updateCrtFilterGeometry(filter, curve, 1600, 900, 64), true);
  const nodes = [filter, ...filter.children]; const before = nodes.map(n => n.writes);
  for (const node of nodes) for (const [key, value] of [['x','0'],['y','0'],['width','1600'],['height','900']]) assert.equal(node.getAttribute(key), value);
  for (let i = 0; i < 100; i++) assert.equal(updateCrtFilterGeometry(filter, curve, 1600, 900, 64), false);
  assert.deepEqual(nodes.map(n => n.writes), before);
  assert.equal(updateCrtFilterGeometry(filter, curve, 390, 844, 37), true);
  for (const node of nodes) assert.equal(node.getAttribute('width'), '390');
  assert.equal(curve.getAttribute('scale'), '37');
  assert.equal(updateCrtFilterGeometry(filter, curve, 0, 844, 37), false);
});

test('hover keeps local glow and connector feedback but never adds global signal energy', async () => {
  const app = await readFile(new URL('../assets/app.js', import.meta.url), 'utf8');
  assert.match(app, /setInteractiveGlow\(button, event\)/);
  assert.match(app, /hoverSubId = item\.id/);
  assert.doesNotMatch(app, /crt\.addEnergy\(/);
  const optics = await readFile(new URL('../assets/effects.js', import.meta.url), 'utf8');
  assert.match(optics, /size = 384/); assert.match(optics, /nx \* radial \* 43/);
  assert.match(optics, /ios-static-css/);
});

test('build versions dependencies and parent app so optics updates do not reuse stale browser module URLs', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'magius-assets-test-'));
  try {
    await mkdir(path.join(dir, 'assets'));
    await writeFile(path.join(dir, 'index.html'), '<link href="./assets/styles.css?v=old"><script type="module" src="./assets/app.js?v=old"></script>');
    await writeFile(path.join(dir, 'assets/app.js'), "import {x} from './content.js?v=old';\nimport {y} from './effects.js?v=old';");
    for (const f of ['content.js','effects.js','styles.css']) await writeFile(path.join(dir, 'assets', f), 'first-' + f);
    const first = await versionStaticAssets(dir);
    const again = await versionStaticAssets(dir); assert.deepEqual(again, first);
    await writeFile(path.join(dir, 'assets/effects.js'), 'fixed-optics');
    const second = await versionStaticAssets(dir);
    assert.notEqual(second['effects.js'], first['effects.js']); assert.notEqual(second['app.js'], first['app.js']);
    assert.equal(second['content.js'], first['content.js']); assert.equal(second['styles.css'], first['styles.css']);
    const html = await readFile(path.join(dir, 'index.html'), 'utf8'); assert(html.includes('?v=' + second['app.js']));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
