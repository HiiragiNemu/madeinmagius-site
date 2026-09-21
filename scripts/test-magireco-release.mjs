import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { onRequestGet as metadata } from '../functions/api/magireco.js';
import { onRequestGet as download, onRequestHead as head } from '../functions/downloads/magireco/android.js';
import { renderContent } from '../assets/content.js';

const originalFetch = globalThis.fetch;
const env = { GITHUB_RELEASES_TOKEN: 'fixture-private-token' };
const base = 'https://api.github.com/repos/HiiragiNemu/magireco-cn-patch';
let version='1.0.184', fault=null, id=184, calls=[];
const body=()=>Buffer.from('APK-fixture-'+version);
const sha=()=>createHash('sha256').update(body()).digest('hex');
const context=(suffix='',method='GET',headers={})=>({env,request:new Request('https://site.test/downloads/magireco/android'+suffix,{method,headers}),params:{}});
globalThis.fetch = async (input, init={}) => {
  const url=String(input), headers=new Headers(init.headers);
  calls.push({url,authorization:headers.get('authorization')});
  if (url==='https://magireco-personal-release.pages.dev/legacy/config.json') {
    assert.equal(headers.get('authorization'),null);
    if (fault==='config') return new Response('unavailable',{status:503});
    return Response.json({updated:'2026-09-22T00:00:00Z',client:{version:fault==='version'?'invalid':version,
      apk_url:'https://magireco-personal-release.pages.dev/magireco-latest-legacy-client.apk',
      size:body().length,sha256:sha()}});
  }
  if (url===base+'/releases/tags/latest') {
    assert.equal(headers.get('authorization'),'Bearer fixture-private-token');
    if (fault==='github') return new Response('unavailable',{status:429});
    return Response.json({draft:fault==='draft',prerelease:false,assets:fault==='missing'?[]:[{
      id,name:'magireco-latest-legacy-client.apk',state:'uploaded',size:body().length,
      digest:'sha256:'+(fault==='mismatch'?'0'.repeat(64):sha()),
    }]});
  }
  if (url===base+'/releases/assets/'+id) {
    if (fault==='replaced') return new Response('deleted',{status:404});
    return new Response(null,{status:302,headers:{location:'https://objects.test/immutable-'+id}});
  }
  if (url==='https://objects.test/immutable-'+id) {
    assert.equal(headers.get('authorization'),null);
    if (headers.has('range')) return new Response(body().subarray(0,2),{status:206,headers:{'content-length':'2','content-range':`bytes 0-1/${body().length}`}});
    return new Response(body());
  }
  throw new Error('Unexpected URL '+url);
};
try {
  const first=await metadata({env});assert.equal(first.status,200);
  assert.equal(first.headers.get('cache-control'),'no-store');
  const a=await first.json();assert.equal(a.version,'1.0.184');assert.equal(a.sha256,sha());
  assert.equal(a.asset,undefined);assert.ok(!JSON.stringify(a).includes('fixture-private-token'));
  const binary=await download(context('?sha256='+a.sha256));assert.equal(binary.status,200);
  assert.equal(binary.headers.get('x-client-version'),a.version);
  assert.equal(binary.headers.get('cache-control'),'no-store');
  assert.match(binary.headers.get('content-disposition'),/magireco-cn-1.0.184.apk/);
  assert.equal(await binary.text(),body().toString());
  assert.ok(calls.some(c=>c.url===base+'/releases/assets/184'));
  console.log('Release A: version, size, SHA and streamed immutable asset agree; no credential forwarding');
  calls=[];
  const h=await head(context('', 'HEAD'));assert.equal(h.status,200);assert.equal(await h.text(),'');
  assert.equal(h.headers.get('content-length'),String(body().length));assert.equal(calls.length,2);
  const partial=await download(context('', 'GET', {Range:'bytes=0-1'}));assert.equal(partial.status,206);
  assert.equal(await partial.text(),body().subarray(0,2).toString());

  version='1.0.185';id=185;
  const b=await (await metadata({env})).json();assert.equal(b.version,'1.0.185');assert.notEqual(b.sha256,a.sha256);
  const next=await download(context('?sha256='+b.sha256));assert.equal(next.status,200);assert.equal(await next.text(),body().toString());
  calls=[];const stale=await download(context('?sha256='+a.sha256));assert.equal(stale.status,409);
  assert.ok(!calls.some(c=>c.url.includes('/releases/assets/')));
  console.log('Release B: picked up automatically without source change; old-page SHA rejected with 409');
  for (fault of ['config','github','version','draft','missing','mismatch']) {
    calls=[];const m=await metadata({env});assert.equal(m.status,503,fault);
    assert.equal((await m.json()).version,undefined,fault);
    const d=await download(context());assert.equal(d.status,503,fault);
    assert.ok(!calls.some(c=>c.url.includes('/releases/assets/')),fault);
  }
  fault='replaced';assert.equal((await download(context())).status,502);
  fault=null;assert.equal((await metadata({env:{}})).status,503);
  console.log('Partial publication / bad metadata / unavailable sources / replaced asset: no stale version fallback');

  for (const state of ['loading','error']) {
    const html=renderContent('home','magireco-private-server',{magireco:{state}});
    assert.ok(!html.includes('>下载 APK</a>'));
    assert.ok(html.includes('data-magireco-refresh'));
    assert.ok(html.includes('初次安装'));
  }
  const html=renderContent('home','magireco-private-server',{magireco:{...b,state:'ready'}});
  assert.ok(html.includes('客户端版本 1.0.185'));assert.ok(html.includes(b.download));
  for(const text of ['初次安装','下载资源与线路','已有客户端如何更新','无需开启所有文件访问','不要先卸载或清除数据']) assert.ok(html.includes(text));
  assert.ok(!html.includes('1.0.184'));assert.ok(!html.includes('3.1.9'));
  console.log('MAGIRECO_AUTO_DELIVERY=PASS: dynamic versions, guarded downloads, HEAD/Range, tutorial and failure UI');
} finally {globalThis.fetch=originalFetch;}
