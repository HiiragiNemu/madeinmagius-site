import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { onRequestGet as metadata } from '../functions/api/magireco.js';
import { onRequestGet as download, onRequestHead as head } from '../functions/downloads/magireco/android.js';
import { renderContent } from '../assets/content.js';

const originalFetch = globalThis.fetch;
const env = { GITHUB_RELEASES_TOKEN: 'fixture-private-token' };
const base = 'https://api.github.com/repos/HiiragiNemu/ProgettoMagius-1';
const root = 'https://github.com/HiiragiNemu/ProgettoMagius-1/releases/download/latest/';
const bridge = 'https://magireco-personal-release.pages.dev/';
const latestName = 'magireco-latest-legacy-client.apk';
const archiveName = 'magireco-legacy-client-1.1.11.apk';
const sha = data => createHash('sha256').update(data).digest('hex');
const bytes = version => Buffer.from('APK-fixture-' + version);
function sidecar(version) {
  const data = bytes(version), apk_url = version === '1.1.11' ? bridge + latestName : root + latestName;
  const value = { version, version_code:version === '1.1.11' ? 1713000826 : 1713000830,
    size:data.length, sha256:sha(data), apk:latestName, apk_url };
  // Synthetic consistency fixture, not a cryptographically signed release.
  value.signed_update = { schema:1, payload:JSON.stringify({ ...value, apk_urls:[apk_url] }) };
  return value;
}
function asset(name, version, id) { return { name, id, state:'uploaded', size:bytes(version).length, digest:'sha256:' + sha(bytes(version)) }; }
let state, calls = [], cases = 0;
function reset(version = '1.2.3') {
  state = { current:sidecar(version), config:{updated:'2026-10-21T00:00:00Z',client:{
    version:'1.1.11',size:bytes('1.1.11').length,sha256:sha(bytes('1.1.11')),apk_url:bridge + latestName}},
    release:{draft:false,prerelease:false,assets:[asset(latestName,version,123),asset(archiveName,'1.1.11',1111),asset('magireco-legacy-client-1.2.2.apk','1.2.2',122)]},
    currentStatus:200,configStatus:200,githubStatus:200,replaced:false,
    binaries:{123:bytes(version),1111:bytes('1.1.11'),122:bytes('1.2.2')} };
  calls = [];
}
const context = (suffix='', method='GET', headers={}) => ({env,request:new Request('https://site.test/downloads/magireco/android'+suffix,{method,headers}),params:{}});
globalThis.fetch = async (input, init={}) => {
  const url=String(input), headers=new Headers(init.headers);
  calls.push({url,authorization:headers.get('authorization'),range:headers.get('range')});
  if (url === bridge + 'magireco-latest-legacy-client.version.json' || url === bridge + 'legacy/config.json') {
    assert.equal(headers.get('authorization'),null);
    assert.equal(headers.get('cache-control'),'no-cache');
    const key=url.endsWith('config.json')?'config':'current';
    if (state[key+'Status'] !== 200) return new Response('unavailable',{status:state[key+'Status']});
    return state[key] === 'invalid-json' ? new Response('{') : Response.json(state[key]);
  }
  if (url === base + '/releases/tags/latest') {
    assert.equal(headers.get('authorization'),'Bearer fixture-private-token');
    return state.githubStatus === 200 ? Response.json(state.release) : new Response('unavailable',{status:state.githubStatus});
  }
  if (url.startsWith(base + '/releases/assets/')) {
    const id=Number(url.split('/').pop());assert.ok(state.binaries[id]);
    assert.equal(headers.get('authorization'),'Bearer fixture-private-token');
    return state.replaced ? new Response('deleted',{status:404}) : new Response(null,{status:302,headers:{location:'https://objects.test/immutable-'+id}});
  }
  if (url.startsWith('https://objects.test/immutable-')) {
    assert.equal(headers.get('authorization'),null);
    const data=state.binaries[Number(url.split('-').pop())];
    if (headers.has('range')) return new Response(data.subarray(0,2),{status:206,headers:{'content-length':'2','content-range':`bytes 0-1/${data.length}`}});
    return new Response(data);
  }
  throw new Error('Unexpected URL '+url);
};
async function selected(version, source) {
  const response=await metadata({env});assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'no-store');
  const result=await response.json();assert.equal(result.version,version);assert.equal(result.source,source);
  assert.equal(result.sha256,sha(bytes(version)));assert.equal(result.size,bytes(version).length);
  assert.equal(result.asset,undefined);assert.ok(!JSON.stringify(result).includes(env.GITHUB_RELEASES_TOKEN));cases++;
  return result;
}
async function streamCheck(version, source) {
  const result=await selected(version,source);calls=[];
  const response=await download(context('?sha256='+result.sha256));assert.equal(response.status,200);
  assert.equal(await response.text(),bytes(version).toString());assert.equal(response.headers.get('x-client-version'),version);
  assert.equal(response.headers.get('cache-control'),'no-store');assert.ok(response.headers.get('content-disposition').includes('magireco-cn-'+version+'.apk'));
  const id=source==='current'?123:1111;assert.ok(calls.some(x=>x.url===base+'/releases/assets/'+id));
  calls=[];const h=await head(context('?sha256='+result.sha256,'HEAD'));assert.equal(h.status,200);assert.equal(await h.text(),'');
  assert.equal(h.headers.get('content-length'),String(bytes(version).length));assert.equal(calls.length,3);assert.ok(!calls.some(x=>x.url.includes('/releases/assets/')));
  const r=await download(context('?sha256='+result.sha256,'GET',{Range:'bytes=0-1'}));assert.equal(r.status,206);
  assert.equal(await r.text(),bytes(version).subarray(0,2).toString());assert.equal(r.headers.get('content-range'),`bytes 0-1/${bytes(version).length}`);
  assert.ok(calls.filter(x=>x.url.includes('/releases/assets/')||x.url.startsWith('https://objects.test/')).every(x=>x.range==='bytes=0-1'));
  return result;
}
async function unavailable(label) {
  calls=[];const response=await metadata({env});assert.equal(response.status,503,label);assert.equal((await response.json()).version,undefined);
  assert.equal((await download(context())).status,503,label);assert.ok(!calls.some(x=>x.url.includes('/releases/assets/')));cases++;
}
try {
  reset('1.1.11');const old=await streamCheck('1.1.11','current');
  reset();const latest=await streamCheck('1.2.3','current');
  calls=[];assert.equal((await download(context('?sha256='+old.sha256))).status,409);assert.ok(!calls.some(x=>x.url.includes('/releases/assets/')));
  console.log('PASS current1111 -> current123: version/size/hash/asset ID, GET/HEAD/Range, old hash link=409');
  for (const fault of ['config-down','config-invalid','config-version122','config-hash']) {
    reset();if(fault==='config-down')state.configStatus=503;
    if(fault==='config-invalid')state.config=null;
    if(fault==='config-version122')state.config.client.version='1.2.2';
    if(fault==='config-hash')state.config.client.sha256='0'.repeat(64);
    await selected('1.2.3','current');
  }
  console.log('PASS valid published current wins independently of frozen/broken/incorrect legacy config');
  const fallbackCases = {
    'no-metadata':()=>state.currentStatus=404,
    'metadata-503':()=>state.currentStatus=503,
    'null-metadata':()=>state.current=null,
    'invalid-json':()=>state.current='invalid-json',
    'bad-version':()=>state.current.version='invalid',
    'bad-hash':()=>state.current.sha256='g'.repeat(64),
    'negative-size':()=>state.current.size=-1,
    'signed-version-mismatch':()=>state.current.signed_update.payload=JSON.stringify({...state.current,version:'1.2.2',apk_urls:[state.current.apk_url]}),
    'signed-bad-json':()=>state.current.signed_update.payload='{',
    'signed-url-mismatch':()=>state.current.signed_update.payload=JSON.stringify({...state.current,apk_urls:['https://untrusted.test/a.apk']}),
    'foreign-url':()=>state.current.apk_url='https://untrusted.test/a.apk',
    'query-url':()=>state.current.apk_url+='?other=1',
    'future-bridge-url':()=>state.current.apk_url=bridge+latestName,
    'manual122-as-current':()=>{state.current=sidecar('1.2.2');state.current.apk='magireco-legacy-client-1.2.2.apk';state.current.apk_url=root+state.current.apk;},
    'digest-mismatch':()=>state.release.assets[0].digest='sha256:'+'0'.repeat(64),
    'size-mismatch':()=>state.release.assets[0].size++,
    'asset-uploading':()=>state.release.assets[0].state='new',
    'bad-asset-id':()=>state.release.assets[0].id=0,
    'duplicate-current-name':()=>state.release.assets.push(structuredClone(state.release.assets[0])),
    'current-asset-missing':()=>state.release.assets.shift(),
    'metadata-ahead-of-APK':()=>state.release.assets[0]=asset(latestName,'1.1.11',123),
    'APK-ahead-of-metadata':()=>state.current=sidecar('1.1.11'),
  };
  for (const [name,mutate] of Object.entries(fallbackCases)) {
    reset();mutate();await selected('1.1.11','legacy-bridge');
    calls=[];assert.equal((await download(context('?sha256='+latest.sha256))).status,409,name+' must not silently downgrade an old current link');
    assert.ok(!calls.some(x=>x.url.includes('/releases/assets/')));
  }
  reset();state.currentStatus=404;await streamCheck('1.1.11','legacy-bridge');
  for(const url of [root+archiveName,root+latestName]) {reset();state.currentStatus=404;state.config.client.apk_url=url;await selected('1.1.11','legacy-bridge');}
  console.log('PASS 22 absent/malformed/mismatch/out-of-order cases -> exact1111 archive; no manual122 promotion; former123 hash link=409');
  for (const fault of ['github','draft','prerelease','both-missing','bad-bridge-url','bridge-version122','bridge-hash','bridge-size','bridge-asset-missing','duplicate-bridge']) {
    reset();state.currentStatus=404;
    if(fault==='github')state.githubStatus=429;
    if(fault==='draft')state.release.draft=true;
    if(fault==='prerelease')state.release.prerelease=true;
    if(fault==='both-missing')state.configStatus=503;
    if(fault==='bad-bridge-url')state.config.client.apk_url='https://untrusted.test/client.apk';
    if(fault==='bridge-version122')state.config.client.version='1.2.2';
    if(fault==='bridge-hash')state.config.client.sha256='0'.repeat(64);
    if(fault==='bridge-size')state.config.client.size++;
    if(fault==='bridge-asset-missing')state.release.assets=state.release.assets.filter(x=>x.name!==archiveName);
    if(fault==='duplicate-bridge')state.release.assets.push(structuredClone(state.release.assets[1]));
    await unavailable(fault);
  }
  for(const key of ['draft','prerelease']){reset();state.release[key]=true;await unavailable('current '+key);}
  reset();state.replaced=true;assert.equal((await download(context())).status,502);cases++;
  assert.equal((await metadata({env:{}})).status,503);cases++;
  console.log('PASS draft/prerelease, unavailable GitHub, invalid/missing bridge, replaced pinned asset fail closed');
  for (const state of ['loading','error']) {const html=renderContent('home','magireco-private-server',{magireco:{state}});assert.ok(!html.includes('>下载 APK</a>'));assert.ok(html.includes('data-magireco-refresh'));}
  const html=renderContent('home','magireco-private-server',{magireco:{...latest,state:'ready'}});
  assert.ok(html.includes('客户端版本 1.2.3'));assert.ok(html.includes(latest.download));
  for(const text of ['初次安装','下载资源与线路','已有客户端如何更新','无需开启所有文件访问','不要先卸载或清除数据'])assert.ok(html.includes(text));
  assert.ok(!html.includes('3.1.9'));
  console.log('MAGIRECO_TWO_SOURCE_DELIVERY=PASS cases='+cases+'; UI preserved; test binaries only; network requests=0');
} finally {globalThis.fetch=originalFetch;}
