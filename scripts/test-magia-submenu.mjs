import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { PROGRAMS, EXEDRA_SUBS, findSubItem, flattenSubs, resolveHashRoute, escapeHtml } from '../assets/content.js';

function createMockElement(tagName = 'div') {
  const el = {
    tagName: tagName.toUpperCase(),
    id: '',
    type: '',
    hidden: false,
    textContent: '',
    _innerHTML: '',
    dataset: {},
    attrs: new Map(),
    classes: new Set(),
    handlers: {},
    children: [],
    parentNode: null,
    scrollTop: 0,
    scrollHeight: 600,
    clientHeight: 300,
    clientTop: 0,
    scrollCalls: [],
    get className() {
      return [...this.classes].join(' ');
    },
    set className(value) {
      this.classes = new Set(String(value || '').split(/\s+/).filter(Boolean));
    },
    classList: {
      add(...names) { names.forEach(n => el.classes.add(n)); },
      remove(...names) { names.forEach(n => el.classes.delete(n)); },
      contains(name) { return el.classes.has(name); },
      toggle(name, force) {
        const on = typeof force === 'boolean' ? force : !el.classes.has(name);
        if (on) el.classes.add(name); else el.classes.delete(name);
        return on;
      },
    },
    get innerHTML() { return this._innerHTML; },
    set innerHTML(val) {
      this._innerHTML = String(val);
      if (val === '') this.children = [];
    },
    setAttribute(name, value) { this.attrs.set(name, String(value)); },
    getAttribute(name) { return this.attrs.has(name) ? this.attrs.get(name) : null; },
    addEventListener(type, fn) { this.handlers[type] = fn; },
    append(...nodes) {
      for (const node of nodes) {
        node.parentNode = this;
        this.children.push(node);
      }
    },
    contains(target) {
      let cur = target;
      while (cur) {
        if (cur === this) return true;
        cur = cur.parentNode;
      }
      return false;
    },
    closest(selector) {
      let cur = this;
      while (cur) {
        if (selector === '[hidden]' && cur.hidden) return cur;
        cur = cur.parentNode;
      }
      return null;
    },
    querySelectorAll(selector) {
      const results = [];
      const visit = node => {
        for (const child of node.children) {
          if (matchesSelector(child, selector)) results.push(child);
          visit(child);
        }
      };
      visit(this);
      return results;
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    },
    focus() {
      if (el._doc) el._doc.activeElement = el;
    },
    scrollTo(opts) {
      this.scrollCalls.push(opts);
      this.scrollTop = opts.top;
    },
    getBoundingClientRect() {
      if (typeof el._rect === 'function') return el._rect();
      return { left: 300, top: 100, right: 520, bottom: 148, width: 220, height: 48 };
    },
  };
  return el;
}

function matchesSelector(node, selector) {
  if (selector === '.sub-node') return node.classes.has('sub-node');
  if (selector === '.sub-node--top') return node.classes.has('sub-node--top');
  if (selector === '.sub-node--group') return node.classes.has('sub-node--group');
  if (selector === '.sub-node--child') return node.classes.has('sub-node--child');
  if (selector === '.sub-tree') return node.classes.has('sub-tree');
  if (selector === '.sub-node[data-sub]') return node.classes.has('sub-node') && Boolean(node.dataset.sub);
  if (selector === '.sub-branch[data-branch-sub]') return node.classes.has('sub-branch') && Boolean(node.dataset.branchSub);
  if (selector === '.sub-node--group[data-group]') return node.classes.has('sub-node--group') && Boolean(node.dataset.group);
  let m = selector.match(/^\[data-group-wrap="([^"]+)"\]$/);
  if (m) return node.dataset.groupWrap === m[1];
  m = selector.match(/^\[data-sub="([^"]+)"\]$/);
  if (m) return node.dataset.sub === m[1];
  m = selector.match(/^\[data-group="([^"]+)"\]$/);
  if (m) return node.dataset.group === m[1];
  m = selector.match(/^\[data-parent-group="([^"]+)"\]$/);
  if (m) return node.dataset.parentGroup === m[1];
  return false;
}

async function createAppHarness({ hash = '', mobile = false } = {}) {
  const appSource = await readFile(new URL('../assets/app.js', import.meta.url), 'utf8');
  const start = appSource.indexOf('function updateConnectorHighlights()');
  const end = appSource.indexOf('contentPanel.addEventListener(\'click\'');
  assert.ok(start >= 0 && end > start, 'Expected submenu and keyboard functions block');

  const doc = {
    activeElement: null,
    createElement(tag) {
      const el = createMockElement(tag);
      el._doc = doc;
      return el;
    },
  };

  const programButtons = ['home', 'bilibili', 'netease', 'pixiv', 'about'].map((id, i) => {
    const btn = doc.createElement('button');
    btn.dataset.program = id;
    btn._rect = () => ({ left: 20, right: 220, top: 80 + i * 70, bottom: 146 + i * 70, width: 200, height: 66 });
    return btn;
  });

  const subMenu = doc.createElement('nav');
  subMenu._rect = () => ({ left: 280, right: 530, top: 60, bottom: 560, width: 250, height: 500 });
  const contentPanel = doc.createElement('section');
  const subsystem = doc.createElement('div');
  const statusLine = { textContent: '' };
  const svg = {
    children: [], writes: 0, geometryWrites: 0,
    set innerHTML(html) {
      this.writes++;
      this.children = [...html.matchAll(/<(?:path|circle)\b([^>]*)\/>/g)].map(match => {
        const attrs = Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
        const classes = new Set(attrs.class.split(' '));
        return {
          attrs,
          dataset: { connectorSub: attrs['data-connector-sub'] },
          classList: {
            toggle(name, on) { if (on) classes.add(name); else classes.delete(name); },
            contains(name) { return classes.has(name); },
          },
        };
      });
    },
    setAttribute() { this.geometryWrites++; },
    querySelectorAll() { return this.children.filter(node => node.dataset.connectorSub); },
  };

  const rendered = [];
  const historyStates = [];
  const context = {
    PROGRAMS,
    escapeHtml,
    findSubItem,
    flattenSubs,
    resolveHashRoute,
    CSS: { escape: String },
    document: doc,
    location: { hash },
    history: { replaceState: (_s, _t, url) => { historyStates.push(url); context.location.hash = url; } },
    programButtons,
    subMenu,
    subsystem,
    contentPanel,
    connectorSvg: svg,
    statusLine,
    mobileMode: { matches: mobile },
    stage: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 1200, height: 700 }) },
    selectedProgramButton: () => programButtons.find(b => b.dataset.program === context.programId),
    expandedGroups: new Set(),
    programId: 'home',
    subId: 'welcome',
    hoverSubId: null,
    mobileExpandedSub: null,
    shouldScrollActiveSub: false,
    crt: { pulse() {} },
    scrollBehavior: () => 'auto',
    restoreContentPanel() {},
    placeContentPanel(scroll) { context.lastPlaceScroll = scroll; },
    syncProgramButtons() {},
    renderCurrentContent() { rendered.push([context.programId, context.subId]); },
    loadMagirecoRelease() {},
    scrollWithinTerminal(target) { context.lastMobileScrollTarget = target; },
    requestAnimationFrame(fn) { fn(); },
  };

  runInNewContext(appSource.slice(start, end), context);
  context.parseHash();
  context.buildSubMenu();
  // Assign sequential rects for visible top-level nodes so drawConnectors computes clean coordinates.
  let idx = 0;
  for (const btn of subMenu.querySelectorAll('.sub-node--top')) {
    const row = idx++;
    btn._rect = () => ({ left: 300, right: 520, top: 70 + row * 56, bottom: 118 + row * 56, width: 220, height: 48 });
  }
  context.drawConnectors();

  return { context, doc, subMenu, contentPanel, programButtons, svg, rendered, historyStates };
}

test('01 >MAGIA defaults to compact 7 top-level items with EXEDRA TW / JP collapsed and zero emojis', async () => {
  const { subMenu, svg } = await createAppHarness();
  const topButtons = subMenu.querySelectorAll('.sub-node--top');
  assert.deepEqual(
    topButtons.map(b => b.dataset.sub || b.dataset.group),
    ['welcome', 'magireco-private-server', 'universal-adv-reader', 'exedra-group', 'programs', 'reporting-records', 'contact']
  );

  const groupBtn = subMenu.querySelector('[data-group="exedra-group"]');
  assert.equal(groupBtn.getAttribute('aria-expanded'), 'false');
  assert.ok(groupBtn.innerHTML.includes('[+]'));
  assert.ok(groupBtn.innerHTML.includes('EXEDRA TW / JP'));

  const tree = subMenu.querySelector('.sub-tree');
  assert.equal(tree.hidden, true);
  assert.equal(tree.querySelectorAll('.sub-node--child').length, 10);

  // Only top-level nodes receive main SVG trunk connectors (1 trunk + 7*2 branches/dots + 1 hot = 16).
  assert.equal(svg.children.length, 16);

  // Zero emojis in labels, notes, tags, sections, or toggle markup.
  const emojiRe = /\p{Extended_Pictographic}/u;
  for (const item of PROGRAMS.home.subs) {
    assert.ok(!emojiRe.test(item.label + (item.note || '')), 'No emoji in ' + item.id);
  }
  for (const child of EXEDRA_SUBS) {
    assert.ok(!emojiRe.test(child.label + child.note + child.section + child.tag), 'No emoji in ' + child.id);
  }
});

test('clicking EXEDRA TW / JP expands and collapses in place; hover on children highlights parent connector without SVG rebuilds', async () => {
  const { context, subMenu, svg } = await createAppHarness();
  const groupBtn = subMenu.querySelector('[data-group="exedra-group"]');
  const tree = subMenu.querySelector('.sub-tree');

  groupBtn.handlers.click();
  assert.equal(context.expandedGroups.has('exedra-group'), true);
  assert.equal(tree.hidden, false);
  assert.equal(groupBtn.getAttribute('aria-expanded'), 'true');
  assert.ok(groupBtn.innerHTML.includes('[+]') || context.statusLine.textContent.includes('EXPANDED (10)'));

  const child = subMenu.querySelector('[data-sub="tw-client-113"]');
  const writesBeforeHover = svg.writes;
  child.handlers.pointerenter();
  assert.equal(svg.writes, writesBeforeHover, 'Hovering child must not rebuild SVG geometry');
  const exedraNodes = svg.querySelectorAll().filter(n => n.dataset.connectorSub === 'exedra-group');
  assert.equal(exedraNodes.length, 2);
  assert.ok(exedraNodes.every(n => n.classList.contains('is-hot')));
  child.handlers.pointerleave();
  assert.ok(exedraNodes.every(n => !n.classList.contains('is-hot')));

  // Selecting child highlights parent group and updates hash.
  child.handlers.click();
  assert.equal(context.subId, 'tw-client-113');
  assert.equal(groupBtn.classList.contains('has-active-child'), true);
  assert.equal(child.classList.contains('is-selected'), true);
  assert.equal(context.location.hash, '#home/tw-client-113');

  // Clicking group button collapses subtree again.
  groupBtn.handlers.click();
  assert.equal(context.expandedGroups.has('exedra-group'), false);
  assert.equal(tree.hidden, true);
  assert.equal(groupBtn.getAttribute('aria-expanded'), 'false');
});

test('deep links auto-select MAGIA, auto-expand EXEDRA TW / JP, and select target child', async () => {
  for (const [hash, expectedSub] of [
    ['#home/tw-client-113', 'tw-client-113'],
    ['#home/downloads', 'exedra-downloads'],
    ['#home/tw-windows', 'tw-mumu'],
    ['#exedra', 'exedra-downloads'],
    ['#exedra/integrity', 'integrity'],
  ]) {
    const { context, subMenu } = await createAppHarness({ hash });
    assert.equal(context.programId, 'home', hash);
    assert.equal(context.subId, expectedSub, hash);
    assert.equal(context.expandedGroups.has('exedra-group'), true, hash);
    const tree = subMenu.querySelector('.sub-tree');
    assert.equal(tree.hidden, false, hash);
    const targetBtn = subMenu.querySelector('[data-sub="' + expectedSub + '"]');
    assert.ok(targetBtn?.classList.contains('is-selected'), hash);
    const groupBtn = subMenu.querySelector('[data-group="exedra-group"]');
    assert.ok(groupBtn.classList.contains('has-active-child'), hash);
  }
});

test('keyboard navigation traverses visible items, expands/collapses EXEDRA cleanly, and preserves ESC BACK', async () => {
  const { context, doc, subMenu, contentPanel, programButtons } = await createAppHarness();
  const press = key => {
    let prevented = false;
    context.keyboardNavigation({ key, defaultPrevented: false, preventDefault() { prevented = true; } });
    return prevented;
  };

  // Start on first top-level item.
  subMenu.querySelector('[data-sub="welcome"]').focus();
  press('ArrowDown');
  assert.equal(doc.activeElement.dataset.sub, 'magireco-private-server');
  press('ArrowDown');
  assert.equal(doc.activeElement.dataset.sub, 'universal-adv-reader');
  press('ArrowDown');
  assert.equal(doc.activeElement.dataset.group, 'exedra-group');

  // While collapsed, ArrowDown skips hidden children and goes directly to programs.
  press('ArrowDown');
  assert.equal(doc.activeElement.dataset.sub, 'programs');
  press('ArrowUp');
  assert.equal(doc.activeElement.dataset.group, 'exedra-group');

  // Enter expands group and focuses first child (exedra-downloads).
  press('Enter');
  assert.equal(context.expandedGroups.has('exedra-group'), true);
  assert.equal(doc.activeElement.dataset.sub, 'exedra-downloads');

  // ArrowDown advances to tw-client-113; Enter opens content and focuses contentPanel.
  press('ArrowDown');
  assert.equal(doc.activeElement.dataset.sub, 'tw-client-113');
  press('Enter');
  assert.equal(context.subId, 'tw-client-113');
  assert.equal(doc.activeElement, contentPanel);

  // Escape from contentPanel returns focus to active child; Escape again collapses group to toggle; Escape again returns to folder.
  press('Escape');
  assert.equal(doc.activeElement.dataset.sub, 'tw-client-113');
  press('Escape');
  assert.equal(context.expandedGroups.has('exedra-group'), false);
  assert.equal(doc.activeElement.dataset.group, 'exedra-group');
  press('Escape');
  assert.equal(doc.activeElement, programButtons[0]);
});

test('mobile collapsing EXEDRA group clears active mobile content panel inside subtree', async () => {
  const { context, subMenu } = await createAppHarness({ hash: '#home/tw-client-113', mobile: true });
  assert.equal(context.mobileExpandedSub, 'tw-client-113');
  assert.equal(context.expandedGroups.has('exedra-group'), true);

  const groupBtn = subMenu.querySelector('[data-group="exedra-group"]');
  groupBtn.handlers.click();
  assert.equal(context.expandedGroups.has('exedra-group'), false);
  assert.equal(context.mobileExpandedSub, null);
});
