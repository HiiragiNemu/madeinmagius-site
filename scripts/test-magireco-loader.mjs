import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { loadMagirecoReleaseData } from '../assets/magireco-loader.js';
import { renderContent, serviceUrl } from '../assets/content.js';
const snapshot = JSON.parse(await readFile(new URL('../data/magireco-release.json', import.meta.url)));
const contracts = await readFile(new URL('../lib/magireco-release.js', import.meta.url), 'utf8');
test('static snapshot tracks the newest supported published release contract', () => {
  const entries = [...contracts.matchAll(/^const RELEASE_(\d+)_CONTRACT = (.*);$/gm)]
    .map(match => ({number:Number(match[1]), value:JSON.parse(match[2])})).sort((a,b) => b.number-a.number);
  assert.ok(entries.length);
  const latest = entries[0].value;
  assert.equal(snapshot.version, latest.display_version);
  assert.equal(snapshot.sha256, latest.sha256);
  assert.equal(snapshot.size, latest.size);
});
const live = { ...snapshot, source:'current', download:'./downloads/magireco/android?sha256=' + snapshot.sha256 };
const load = (fetcher, rest = {}) => loadMagirecoReleaseData({ fetcher, liveUrl:'https://example.test/api/magireco', ...rest });
for (const [label, response] of [
  ['404 HTML', () => new Response('<script>location.replace("/")</script>', {status:404})],
  ['503 JSON', () => Response.json({error:'unavailable'}, {status:503})],
  ['200 HTML fallback', () => new Response('<html>fallback</html>')],
  ['network failure', () => { throw new Error('network'); }],
]) test('snapshot remains usable with live ' + label, async () => {
  const updates = [];
  const result = await load(async url => url.startsWith('./data/') ? Response.json(snapshot) : response(), {onUpdate: x => updates.push(x)});
  assert.equal(result.state, 'ready'); assert.equal(result.download, snapshot.download);
  assert.equal(updates.length, 1);
  const html = renderContent('home', 'magireco-private-server', {magireco:result});
  assert.ok(html.includes(snapshot.download)); assert.ok(!html.includes('发布信息正在同步或暂时不可用'));
});
test('snapshot is presented before a stalled live API, abort leaves it usable', async () => {
  let shown = false;
  const result = await load(async (url, {signal}) => {
    if (url.startsWith('./data/')) return Response.json(snapshot);
    assert.ok(shown);
    return new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('timeout')), {once:true}));
  }, {timeoutMs:10, onUpdate:() => { shown = true; }});
  assert.equal(result.download, snapshot.download);
});
test('healthy live data retains its normal download path', async () => {
  const result = await load(async url => Response.json(url.startsWith('./data/') ? snapshot : live));
  assert.equal(result.download, live.download);
});
test('live path works if snapshot is missing', async () => {
  const result = await load(async url => url.startsWith('./data/') ? new Response('', {status:404}) : Response.json(live));
  assert.equal(result.download, live.download);
});
test('failure of both independent sources returns error', async () => {
  assert.equal((await load(async () => new Response('', {status:503}))).state, 'error');
});
test('mismatched snapshot URL is rejected', async () => {
  const result = await load(async url => url.startsWith('./data/') ? Response.json({...snapshot, download:'javascript:alert(1)'}) : new Response('', {status:503}));
  assert.equal(result.state, 'error');
});
test('stale or identity-mismatched API cannot replace published snapshot', async () => {
  for (const bad of [{...live, version:'1.1.11'}, {...live, sha256:'f'.repeat(64), download:'./downloads/magireco/android?sha256='+'f'.repeat(64)}]) {
    assert.equal((await load(async url => Response.json(url.startsWith('./data/') ? snapshot : bad))).download, snapshot.download);
  }
});
test('static snapshot and direct URL remain local/independent on both hosts', () => {
  for (const hostname of ['hiiraginemu.github.io', 'madeinmagius-site.pages.dev']) {
    assert.equal(serviceUrl('./data/magireco-release.json', {hostname}), './data/magireco-release.json');
    assert.equal(serviceUrl(snapshot.download, {hostname}), snapshot.download);
  }
});
