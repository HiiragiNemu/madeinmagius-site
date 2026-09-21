import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { onRequestGet as install, onRequestHead as installHead } from '../functions/downloads/bilibili-follower-snapshot.user.js.js';
import { onRequestGet as download } from '../functions/downloads/[project]/[kind].js';
import { renderContent } from '../assets/content.js';

const body = '// ==UserScript==\n// @name 测试脚本\n// @version 0.2.10\n// @match https://space.bilibili.com/*\n// ==/UserScript==\n';
const digest = 'sha256:' + createHash('sha256').update(body).digest('hex');
const asset = { name: 'bilibili-follower-snapshot-v0.2.10.user.js', size: Buffer.byteLength(body), digest,
  content_type: 'application/octet-stream', url: 'https://api.github.test/assets/1' };
const context = (options = {}) => ({
  env: { GITHUB_RELEASES_TOKEN: 'fixture-token' },
  params: {},
  request: new Request('https://site.test/downloads/bilibili-follower-snapshot.user.js', options),
});
const originalFetch = globalThis.fetch;
let failure = null;
const calls = [];
globalThis.fetch = async (input, init = {}) => {
  const url = String(input);
  const headers = new Headers(init.headers);
  calls.push({ url, authorization: headers.get('authorization'), range: headers.get('range') });
  if (url.endsWith('/repos/HiiragiNemu/Bilibili-Follower-Snapshot/releases/latest')) {
    assert.equal(headers.get('authorization'), 'Bearer fixture-token');
    return failure === 'lookup' ? new Response('missing', { status: 404 }) : Response.json({ assets: failure === 'missing' ? [] : [asset] });
  }
  if (url === asset.url) {
    assert.equal(headers.get('authorization'), 'Bearer fixture-token');
    return new Response(null, { status: 302, headers: { location: 'https://objects.test/script' } });
  }
  if (url === 'https://objects.test/script') {
    assert.equal(headers.get('authorization'), null, 'Private credentials stay on GitHub API');
    if (failure === 'binary') return new Response('upstream error', { status: 500 });
    if (headers.get('range') === 'bytes=0-1') return new Response('//', { status: 206,
      headers: { 'content-range': `bytes 0-1/${asset.size}`, 'content-length': '2' } });
    return new Response(body);
  }
  throw new Error('Unexpected fixture URL: ' + url);
};

try {
  const response = await install(context());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('location'), null);
  assert.equal(response.headers.get('content-type'), 'text/javascript; charset=utf-8');
  assert.match(response.headers.get('content-disposition'), /^inline;.*\.user\.js"$/);
  assert.equal(response.headers.get('content-length'), String(asset.size));
  assert.equal(response.headers.get('x-release-digest'), digest);
  assert.equal(response.headers.get('cache-control'), 'public, max-age=0, must-revalidate');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(!JSON.stringify([...response.headers]).includes('fixture-token'));
  assert.equal(await response.text(), body);
  console.log('GET: 200, direct .user.js, JavaScript MIME, inline, identical script bytes');

  calls.length = 0;
  const head = await installHead(context({ method: 'HEAD' }));
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assert.equal(head.headers.get('content-length'), String(asset.size));
  assert.equal(head.headers.get('content-type'), response.headers.get('content-type'));
  assert.equal(calls.length, 1, 'HEAD only needs release metadata');
  console.log('HEAD: 200, no body, correct length/type, no binary download');

  const ranged = await install(context({ headers: { Range: 'bytes=0-1' } }));
  assert.equal(ranged.status, 206);
  assert.equal(ranged.headers.get('content-range'), `bytes 0-1/${asset.size}`);
  assert.equal(await ranged.text(), '//');

  const fixed = await install({ ...context(), params: { project: 'netease', kind: 'android-full' } });
  assert.equal(await fixed.text(), body, 'Install route always serves the userscript');

  const file = await download({ ...context(), params: { project: 'bilibili', kind: 'userscript' } });
  assert.equal(file.status, 200);
  assert.match(file.headers.get('content-disposition'), /^attachment;/);
  assert.equal(await file.text(), body);
  console.log('Manual file download remains attachment; range and fixed route checks passed');

  const absent = await install({ ...context(), env: {} });
  assert.equal(absent.status, 503);
  assert.match(absent.headers.get('content-type'), /^text\/plain/);
  for (failure of ['lookup', 'missing', 'binary']) {
    const error = await install(context());
    assert.equal(error.status, 502);
    assert.equal(error.headers.get('content-disposition'), null);
    assert.equal(error.headers.get('cache-control'), 'no-store');
    assert.ok(!(await error.text()).includes('fixture-token'));
  }
  console.log('Missing configuration / release / asset / upstream errors retained; no credentials exposed');

  for (const data of [ {}, { releases: { projects: { bilibili: { assets: { userscript: {
    download: './downloads/bilibili/userscript', size: asset.size, digest,
  }, android: { download: './downloads/bilibili/android' } } } } } } ]) {
    const html = renderContent('bilibili', 'userscript', data);
    assert.match(html, /<a class="download-button" href="\.\/downloads\/bilibili-follower-snapshot\.user\.js">安装到油猴<\/a>/);
    assert.match(html, /<a href="\.\/downloads\/bilibili\/userscript">下载脚本文件<\/a>/);
    assert.ok(html.includes('确认页点击“安装”'));
    assert.ok(!html.includes(' download='));
    assert.ok(!html.includes('blob:'));
    const apk = renderContent('bilibili', 'android', data);
    assert.ok(!apk.includes('安装到油猴'));
    assert.ok(apk.includes('>DOWNLOAD</a>'));
  }
  console.log('UI: install and file links distinct, works before metadata loads, APK buttons unchanged');
  console.log('USERSCRIPT_INSTALL=PASS');
} finally {
  globalThis.fetch = originalFetch;
}
