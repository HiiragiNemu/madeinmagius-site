import assert from 'node:assert/strict';
import { onRequestGet as install, onRequestHead as installHead } from '../functions/downloads/bilibili-follower-snapshot.user.js.js';
import { onRequestGet as download } from '../functions/downloads/[project]/[kind].js';
import { renderContent } from '../assets/content.js';

const PINNED_BLOB =
  'https://api.github.com/repos/HiiragiNemu/Bilibili-Follower-Snapshot/git/blobs/' +
  '4e3866b7fdef21e8e8814757685d8f065e74462c';
const PINNED_SIZE = 139359;
const PINNED_DIGEST =
  'sha256:831c82dcfc86b3eac0127dad2485bb48825159201bbf189882e476bf89345eb2';
const header =
  '// ==UserScript==\n' +
  '// @name 测试脚本\n' +
  '// @version 0.2.11\n' +
  '// @match https://space.bilibili.com/*\n' +
  '// ==/UserScript==\n';
const body = header + ' '.repeat(PINNED_SIZE - Buffer.byteLength(header));
assert.equal(Buffer.byteLength(body), PINNED_SIZE);

const context = (options = {}) => ({
  env: { GITHUB_RELEASES_TOKEN: 'fixture-token' },
  params: {},
  request: new Request(
    'https://site.test/downloads/bilibili-follower-snapshot.user.js',
    options,
  ),
});

const originalFetch = globalThis.fetch;
let failure = null;
const calls = [];
globalThis.fetch = async (input, init = {}) => {
  const url = String(input);
  const headers = new Headers(init.headers);
  calls.push({
    url,
    authorization: headers.get('authorization'),
    accept: headers.get('accept'),
    range: headers.get('range'),
  });

  if (url === PINNED_BLOB) {
    assert.equal(headers.get('authorization'), 'Bearer fixture-token');
    assert.match(headers.get('accept') || '', /application\/vnd\.github\.raw\+json/);
    assert.equal(headers.get('range'), null, 'Worker slices pinned source ranges itself');
    if (failure === 'blob') return new Response('upstream error', { status: 500 });
    if (failure === 'short') return new Response(body.slice(0, -1));
    return new Response(body, {
      status: 200,
      headers: { 'content-type': 'application/octet-stream' },
    });
  }

  throw new Error('Unexpected fixture URL: ' + url);
};

try {
  const response = await install(context());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('location'), null);
  assert.equal(response.headers.get('content-type'), 'text/javascript; charset=utf-8');
  assert.match(response.headers.get('content-disposition'), /^inline;.*\.user\.js"$/);
  assert.equal(response.headers.get('content-length'), String(PINNED_SIZE));
  assert.equal(response.headers.get('x-release-digest'), PINNED_DIGEST);
  assert.equal(response.headers.get('cache-control'), 'public, max-age=0, must-revalidate');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(!JSON.stringify([...response.headers]).includes('fixture-token'));
  assert.equal(await response.text(), body);
  console.log('GET: pinned 0.2.11 source served directly with JavaScript MIME');

  calls.length = 0;
  const head = await installHead(context({ method: 'HEAD' }));
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assert.equal(head.headers.get('content-length'), String(PINNED_SIZE));
  assert.equal(head.headers.get('content-type'), response.headers.get('content-type'));
  assert.equal(calls.length, 0, 'HEAD uses immutable pinned metadata without fetching source bytes');
  console.log('HEAD: metadata-only, no private source body request');

  calls.length = 0;
  const ranged = await install(context({ headers: { Range: 'bytes=0-1' } }));
  assert.equal(ranged.status, 206);
  assert.equal(ranged.headers.get('content-range'), `bytes 0-1/${PINNED_SIZE}`);
  assert.equal(ranged.headers.get('content-length'), '2');
  assert.equal(await ranged.text(), '//');
  assert.equal(calls.length, 1);

  const invalidRange = await install(context({ headers: { Range: 'bytes=999999-' } }));
  assert.equal(invalidRange.status, 416);

  const fixed = await install({
    ...context(),
    params: { project: 'netease', kind: 'android-full' },
  });
  assert.equal(await fixed.text(), body, 'Install alias always serves the pinned userscript');

  const file = await download({
    ...context(),
    params: { project: 'bilibili', kind: 'userscript' },
  });
  assert.equal(file.status, 200);
  assert.match(file.headers.get('content-disposition'), /^attachment;/);
  assert.equal(file.headers.get('x-release-digest'), PINNED_DIGEST);
  assert.equal(await file.text(), body);
  console.log('Manual userscript file download uses the same pinned bytes');

  const absent = await install({ ...context(), env: {} });
  assert.equal(absent.status, 503);
  assert.match(absent.headers.get('content-type'), /^text\/plain/);

  for (failure of ['blob', 'short']) {
    const error = await install(context());
    assert.equal(error.status, 502);
    assert.equal(error.headers.get('content-disposition'), null);
    assert.equal(error.headers.get('cache-control'), 'no-store');
    assert.ok(!(await error.text()).includes('fixture-token'));
  }
  failure = null;
  console.log('Pinned source upstream and integrity-size errors fail closed');

  for (const data of [
    {},
    {
      releases: {
        projects: {
          bilibili: {
            assets: {
              userscript: {
                name: 'bilibili-follower-snapshot-v0.2.11.user.js',
                download: './downloads/bilibili/userscript',
                size: PINNED_SIZE,
                digest: PINNED_DIGEST,
              },
              android: { download: './downloads/bilibili/android' },
            },
          },
        },
      },
    },
  ]) {
    const html = renderContent('bilibili', 'userscript', data);
    assert.match(
      html,
      /<a class="download-button" href="\.\/downloads\/bilibili-follower-snapshot\.user\.js">安装到油猴<\/a>/,
    );
    assert.match(
      html,
      /<a href="\.\/downloads\/bilibili\/userscript">下载脚本文件<\/a>/,
    );
    assert.ok(html.includes('确认页点击“安装”'));
    assert.ok(!html.includes(' download='));
    assert.ok(!html.includes('blob:'));

    const apk = renderContent('bilibili', 'android', data);
    assert.ok(!apk.includes('安装到油猴'));
    assert.ok(apk.includes('>DOWNLOAD</a>'));
  }

  console.log('UI: userscript install/download links remain distinct; APK route unchanged');
  console.log('USERSCRIPT_INSTALL=PASS');
} finally {
  globalThis.fetch = originalFetch;
}
