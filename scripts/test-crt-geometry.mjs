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


test('report assets and HTML entry invalidate together through the content/app dependency chain', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'magius-report-assets-test-'));
  const stem = 'reporting-records-20261116';
  const key = extension => 'reports/' + stem + '.' + extension;
  const reportPath = extension => path.join(dir, 'assets/reports', stem + '.' + extension);
  try {
    await mkdir(path.join(dir, 'assets/reports'), { recursive: true });
    await writeFile(path.join(dir, 'index.html'), '<link href="./assets/styles.css?v=old"><script type="module" src="./assets/app.js?v=old"></script>');
    await writeFile(path.join(dir, 'assets/app.js'), "import {x} from './content.js?v=old';\nimport {y} from './effects.js?v=old';\nimport {z} from './magireco-loader.js?v=old';");
    await writeFile(path.join(dir, 'assets/content.js'), '<a href="./assets/reports/' + stem + '.html">Report</a>');
    for (const name of ['effects.js', 'styles.css', 'magireco-loader.js']) await writeFile(path.join(dir, 'assets', name), 'fixture-' + name);
    await writeFile(reportPath('html'), '<link href="' + stem + '.css"><script src="' + stem + '.js" defer></script><span>edition-1</span>');
    await writeFile(reportPath('css'), '.report{color:green}');
    await writeFile(reportPath('js'), 'console.log("revision-1");');
    const first = await versionStaticAssets(dir);
    const html = await readFile(reportPath('html'), 'utf8');
    for (const extension of ['css', 'js']) assert.ok(html.includes(stem + '.' + extension + '?v=' + first[key(extension)]));
    const content = await readFile(path.join(dir, 'assets/content.js'), 'utf8');
    assert.ok(content.includes(stem + '.html?v=' + first[key('html')]));
    assert.ok((await readFile(path.join(dir, 'assets/app.js'), 'utf8')).includes('./content.js?v=' + first['content.js']));
    assert.deepEqual(await versionStaticAssets(dir), first, 'repeat build is stable');

    await writeFile(reportPath('js'), 'console.log("revision-2");');
    const second = await versionStaticAssets(dir);
    for (const name of [key('js'), key('html'), 'content.js', 'app.js']) assert.notEqual(second[name], first[name], name);
    assert.equal(second[key('css')], first[key('css')]);
    assert.ok((await readFile(path.join(dir, 'assets/content.js'), 'utf8')).includes(stem + '.html?v=' + second[key('html')]));

    await writeFile(reportPath('html'), (await readFile(reportPath('html'), 'utf8')).replace('edition-1', 'edition-2'));
    const third = await versionStaticAssets(dir);
    for (const name of [key('html'), 'content.js', 'app.js']) assert.notEqual(third[name], second[name], name);
    for (const extension of ['js', 'css']) assert.equal(third[key(extension)], second[key(extension)]);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('report HTML cache rules detach inherited asset caching for both Cloudflare URL forms', async () => {
  const build = await readFile(new URL('./build.mjs', import.meta.url), 'utf8');
  const headers = build.match(/await writeFile\('dist\/_headers',`([\s\S]*?)`\);/)[1];
  const effectiveCacheControl = route => {
    let matches = false, values = [];
    for (const line of headers.split(/\r?\n/)) {
      if (!line.trim() || line.trimStart().startsWith('#')) continue;
      if (!/^\s/.test(line)) {
        matches = line.endsWith('*') ? route.startsWith(line.slice(0, -1)) : route === line;
      } else if (matches) {
        const header = line.trim();
        if (header === '! Cache-Control') values = [];
        else if (header.startsWith('Cache-Control:')) values.push(header.slice('Cache-Control:'.length).trim());
      }
    }
    return values.join(', ');
  };
  const report = '/assets/reports/reporting-records-20261116';
  assert.equal(effectiveCacheControl(report), 'no-cache');
  assert.equal(effectiveCacheControl(report + '.html'), 'no-cache');
  for (const route of ['/assets/styles.css', report + '.js', report + '/source-01.png', '/assets/reports/other.html']) {
    assert.equal(effectiveCacheControl(route), 'public, max-age=3600', route);
  }
});
