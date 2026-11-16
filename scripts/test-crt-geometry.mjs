import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
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

test('six-item menu hover preserves connector nodes and geometry while selection stays highlighted', async () => {
  const app = await readFile(new URL('../assets/app.js', import.meta.url), 'utf8');
  const ids = ['welcome', 'magireco-private-server', 'universal-adv-reader', 'programs', 'reporting-records', 'contact'];
  const buttons = [];
  const svg = {
    children: [], writes: 0, geometryWrites: 0,
    set innerHTML(html) {
      this.writes++;
      this.children = [...html.matchAll(/<(?:path|circle)\b([^>]*)\/>/g)].map(match => {
        const attrs = Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
        const classes = new Set(attrs.class.split(' '));
        return { attrs, dataset: { connectorSub: attrs['data-connector-sub'] }, classList: {
          toggle(name, on) { if (on) classes.add(name); else classes.delete(name); },
          contains(name) { return classes.has(name); }
        }};
      });
    },
    setAttribute() { this.geometryWrites++; },
    querySelectorAll(selector) {
      assert.equal(selector, '[data-connector-sub]');
      return this.children.filter(node => node.dataset.connectorSub);
    }
  };
  const context = {
    connectorSvg: svg, mobileMode: { matches: false }, programId: 'home', subId: 'reporting-records', hoverSubId: null,
    PROGRAMS: { home: { subs: ids.map(id => ({ id, label: id })) } },
    subMenu: { set innerHTML(value) { buttons.length = 0; }, append(button) { buttons.push(button); }, querySelectorAll() { return buttons; } },
    document: { createElement() { return {
      dataset: {}, handlers: {}, setAttribute() {}, addEventListener(type, fn) { this.handlers[type] = fn; },
      getBoundingClientRect() { return { left: 300, top: 100 + buttons.indexOf(this) * 60, height: 50 }; }
    }; } },
    selectedProgramButton: () => ({ getBoundingClientRect: () => ({ right: 220, top: 100, height: 80 }) }),
    stage: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 1200, height: 700 }) },
    restoreContentPanel() {}, placeContentPanel() {}, requestAnimationFrame(fn) { fn(); }, escapeHtml: String
  };
  const start = app.indexOf('function updateConnectorHighlights()');
  const end = app.indexOf('function scrollSubsystemIntoView()');
  assert.ok(start >= 0 && end > start);
  runInNewContext(app.slice(start, end), context);
  context.buildSubMenu();
  assert.equal(buttons.length, 6);
  assert.equal(svg.children.length, 14);
  const nodes = [...svg.children];
  const geometry = nodes.map(node => JSON.stringify(node.attrs));
  const writes = [svg.writes, svg.geometryWrites];
  const expectHot = hovered => svg.querySelectorAll('[data-connector-sub]').forEach(node => {
    assert.equal(node.classList.contains('is-hot'), node.dataset.connectorSub === context.subId || node.dataset.connectorSub === hovered);
  });
  expectHot(null);
  for (let round = 0; round < 20; round++) for (const button of buttons) {
    assert.equal(button.handlers.pointermove, undefined);
    button.handlers.pointerenter(); expectHot(button.dataset.sub);
    button.handlers.pointerleave(); expectHot(null);
  }
  assert.deepEqual(svg.children, nodes);
  assert.deepEqual(svg.children.map(node => JSON.stringify(node.attrs)), geometry);
  assert.deepEqual([svg.writes, svg.geometryWrites], writes);
  assert.ok(svg.children.at(-1).classList.contains('is-hot'), 'selected trunk stays highlighted');
  context.subId = 'welcome'; context.drawConnectors(); expectHot(null);
  assert.equal(svg.writes, writes[0] + 1, 'actual selection/layout changes may rebuild geometry');
  assert.doesNotMatch(app, /crt\.addEnergy\(/);
  assert.doesNotMatch(app, /setInteractiveGlow\(button, event\)/);
  const optics = await readFile(new URL('../assets/effects.js', import.meta.url), 'utf8');
  assert.match(optics, /size = 384/); assert.match(optics, /nx \* radial \* 43/);
  assert.match(optics, /ios-static-css/);
});

test('build versions dependencies and parent app so optics updates do not reuse stale browser module URLs', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'magius-assets-test-'));
  try {
    await mkdir(path.join(dir, 'assets'));
    await writeFile(path.join(dir, 'index.html'), '<link href="./assets/styles.css?v=old"><script type="module" src="./assets/app.js?v=old"></script>');
    await writeFile(path.join(dir, 'assets/app.js'), "import {x} from './content.js?v=old';\nimport {y} from './effects.js?v=old';\nimport {z} from './magireco-loader.js?v=old';");
    for (const f of ['content.js','effects.js','styles.css','magireco-loader.js']) await writeFile(path.join(dir, 'assets', f), 'first-' + f);
    const first = await versionStaticAssets(dir);
    const again = await versionStaticAssets(dir); assert.deepEqual(again, first);
    await writeFile(path.join(dir, 'assets/effects.js'), 'fixed-optics');
    const second = await versionStaticAssets(dir);
    assert.notEqual(second['effects.js'], first['effects.js']); assert.notEqual(second['app.js'], first['app.js']);
    assert.equal(second['content.js'], first['content.js']); assert.equal(second['styles.css'], first['styles.css']);
    const html = await readFile(path.join(dir, 'index.html'), 'utf8'); assert(html.includes('?v=' + second['app.js']));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
