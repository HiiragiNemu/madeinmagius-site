import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { loadMagirecoReleaseData } from '../assets/magireco-loader.js';
import { renderContent, serviceUrl } from '../assets/content.js';
const snapshot = JSON.parse(await readFile(new URL('../data/magireco-release.json', import.meta.url)));
const published = JSON.parse(await readFile(new URL('../data/magireco-release.signed.json', import.meta.url)));
const { createMagirecoSnapshot } = await import('./update-magireco-snapshot.mjs');
test('static snapshot matches the canonical signed publisher metadata', async () => {
  assert.deepEqual(snapshot, await createMagirecoSnapshot(published));
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

for (const version of ['1.3.9','1.3.10','1.4.0','2.0.0']) test('future published snapshot survives CF failure: ' + version, async () => {
  const future = {...snapshot, version, version_code:1713000900, download:snapshot.download.replace(snapshot.version,version)};
  const result = await load(async url => url.startsWith('./data/') ? Response.json(future) : new Response('unavailable',{status:503}));
  assert.equal(result.version,version); assert.equal(result.download,future.download);
});
test('build-code order accepts same-display new builds and rejects misleading display versions', async () => {
  for (const [candidate, accepted] of [
    [{...live, version_code:snapshot.version_code+1, sha256:'a'.repeat(64), download:'./downloads/magireco/android?sha256='+'a'.repeat(64)}, true],
    [{...live, version:'2.0.0', version_code:snapshot.version_code-1}, false],
    [{...live, version:snapshot.version==='2.0.0'?'2.0.1':'2.0.0', version_code:undefined}, false],
    [{...live, version_code:snapshot.version_code, sha256:'a'.repeat(64), download:'./downloads/magireco/android?sha256='+'a'.repeat(64)}, false],
  ]) {
    const result=await load(async url=>Response.json(url.startsWith('./data/')?snapshot:candidate));
    assert.equal(result.download, accepted?candidate.download:snapshot.download);
  }
});
