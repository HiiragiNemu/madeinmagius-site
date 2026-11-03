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
  const future = {...snapshot, version, version_code:1713000900, download:'https://github.com/HiiragiNemu/ProgettoMagius-1/releases/download/latest/magireco-legacy-client-' + version + '.apk'};
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

const historical144 = JSON.parse(await readFile(new URL('./fixtures/magireco-source-materials144.json', import.meta.url)));
const snapshot1002 = await createMagirecoSnapshot(historical144);
test('historical 144 build1002 fixed URL survives live failure unchanged', async () => {
  assert.equal(snapshot1002.version,'1.4.4'); assert.equal(snapshot1002.version_code,1713001002);
  assert.equal(snapshot1002.download,'https://github.com/HiiragiNemu/ProgettoMagius-1/releases/download/latest/magireco-legacy-client-1.4.4.apk');
  const result=await load(async url=>url.startsWith('./data/')?Response.json(snapshot1002):new Response('',{status:503}));
  assert.equal(result.state,'ready'); assert.equal(result.download,snapshot1002.download);
});
test('exact 144 build1003 static path survives live failure and supersedes old code', async () => {
  assert.equal(snapshot.version,'1.4.4'); assert.equal(snapshot.version_code,1713001003);
  assert.equal(snapshot.sha256,'af78bad30b572cbcdf41b019faf62a36196751349b5eb71d9dec3931d6c7919e'); assert.equal(snapshot.size,137135680);
  assert.equal(snapshot.download,'https://github.com/HiiragiNemu/ProgettoMagius-1/releases/download/latest/magireco-legacy-client-1.4.4-b1713001003.apk');
  const result=await load(async url=>url.startsWith('./data/')?Response.json(snapshot):new Response('',{status:503}));
  assert.equal(result.state,'ready'); assert.equal(result.download,snapshot.download);
  const upgraded=await load(async url=>Response.json(url.startsWith('./data/')?snapshot1002:live));
  assert.equal(upgraded.version_code,1713001003); assert.equal(upgraded.download,live.download);
});
test('build-specific static path rejects wrong identity or suffix', async () => {
  for(const change of [{version_code:1713001002},{version_code:1713001004},{version:'1.4.5'},
    {sha256:'0'.repeat(64)},{size:snapshot.size+1},
    {download:'https://github.com/HiiragiNemu/ProgettoMagius-1/releases/download/latest/magireco-legacy-client-1.4.4.apk'},
    {download:'https://github.com/HiiragiNemu/ProgettoMagius-1/releases/download/latest/magireco-legacy-client-1.4.4-b1713001004.apk'}]) {
    const result=await load(async url=>url.startsWith('./data/')?Response.json({...snapshot,...change}):new Response('',{status:503}));
    assert.equal(result.state,'error',JSON.stringify(change));
  }
});
