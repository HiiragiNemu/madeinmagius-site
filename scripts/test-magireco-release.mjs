import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { onRequestGet as metadata } from '../functions/api/magireco.js';
import { onRequestGet as download, onRequestHead as head } from '../functions/downloads/magireco/android.js';
import { renderContent, serviceUrl } from '../assets/content.js';

const originalFetch = globalThis.fetch;
const env = { GITHUB_RELEASES_TOKEN: 'fixture-private-token' };
const base = 'https://api.github.com/repos/HiiragiNemu/ProgettoMagius-1';
const root = 'https://github.com/HiiragiNemu/ProgettoMagius-1/releases/download/latest/';
const bridge = 'https://magireco-personal-release.pages.dev/';
const latestName = 'magireco-latest-legacy-client.apk';
const archiveName = 'magireco-current-legacy-client.apk';
const sha = data => createHash('sha256').update(data).digest('hex');
const bytes = version => Buffer.from('APK-fixture-' + version);
function sidecar(version, lane = 'current') {
  const data = bytes(version), apk = lane === 'current' ? archiveName : latestName, apk_url = root + apk;
  const value = { version, version_code:lane === 'current' ? 1713000858 : 1713000856,
    size:data.length, sha256:sha(data), apk, apk_url };
  // Synthetic consistency fixture, not a cryptographically signed release.
  value.signed_update = { schema:1, payload:JSON.stringify({ ...value, apk_urls:[apk_url] }) };
  return value;
}
function asset(name, version, id) { return { name, id, state:'uploaded', size:bytes(version).length, digest:'sha256:' + sha(bytes(version)) }; }
let state, calls = [], cases = 0;
function reset(version = '1.3.4', compatibility = '1.2.4') {
  state = { current:sidecar(version), config:sidecar(compatibility,'compatibility'),
    release:{draft:false,prerelease:false,assets:[asset(archiveName,version,134),asset(latestName,compatibility,124),
      asset('magireco-legacy-client-1.1.11.apk','1.1.11',1111),asset('magireco-legacy-client-9.9.9.apk','9.9.9',999)]},
    currentStatus:200,configStatus:200,githubStatus:200,replaced:false,
    binaries:{134:bytes(version),124:bytes(compatibility),1111:bytes('1.1.11'),999:bytes('9.9.9')} };
  calls = [];
}
const context = (suffix='', method='GET', headers={}) => ({env,request:new Request('https://site.test/downloads/magireco/android'+suffix,{method,headers}),params:{}});
globalThis.fetch = async (input, init={}) => {
  const url=String(input), headers=new Headers(init.headers);
  calls.push({url,authorization:headers.get('authorization'),range:headers.get('range')});
  if (url === bridge + 'magireco-current-legacy-client.version.json' || url === bridge + 'magireco-compat-legacy-client.version.json') {
    assert.equal(headers.get('authorization'),null);
    assert.equal(headers.get('cache-control'),'no-cache');
    const key=url.includes('compat-legacy')?'config':'current';
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
  const id=source==='current'?134:124;assert.ok(calls.some(x=>x.url===base+'/releases/assets/'+id));
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
const invalidCases = {
  'no-metadata':key=>state[key+'Status']=404,
  'metadata-503':key=>state[key+'Status']=503,
  'null-metadata':key=>state[key]=null,
  'invalid-json':key=>state[key]='invalid-json',
  'bad-version':key=>state[key].version='invalid',
  'bad-hash':key=>state[key].sha256='g'.repeat(64),
  'negative-size':key=>state[key].size=-1,
  'signed-version-mismatch':key=>state[key].signed_update.payload=JSON.stringify({...state[key],version:'9.9.9',apk_urls:[state[key].apk_url]}),
  'signed-bad-json':key=>state[key].signed_update.payload='{',
  'signed-url-mismatch':key=>state[key].signed_update.payload=JSON.stringify({...state[key],apk_urls:['https://untrusted.test/a.apk']}),
  'foreign-url':key=>state[key].apk_url='https://untrusted.test/a.apk',
  'query-url':key=>state[key].apk_url+='?other=1',
  'frozen-bridge-url':key=>state[key].apk_url=bridge+latestName,
  'manual-archive':key=>{state[key].apk='magireco-legacy-client-9.9.9.apk';state[key].apk_url=root+state[key].apk;},
  'digest-mismatch':key=>state.release.assets[key==='current'?0:1].digest='sha256:'+'0'.repeat(64),
  'size-mismatch':key=>state.release.assets[key==='current'?0:1].size++,
  'asset-uploading':key=>state.release.assets[key==='current'?0:1].state='new',
  'bad-asset-id':key=>state.release.assets[key==='current'?0:1].id=0,
  'duplicate-name':key=>state.release.assets.push(structuredClone(state.release.assets[key==='current'?0:1])),
  'missing-asset':key=>state.release.assets.splice(key==='current'?0:1,1),
  'metadata-ahead-of-APK':key=>state.release.assets[key==='current'?0:1].digest='sha256:'+sha(bytes('1.1.11')),
  'APK-ahead-of-metadata':key=>state[key]=sidecar('1.1.11',key==='current'?'current':'compatibility'),
};
try {
  reset();const latest=await streamCheck('1.3.4','current');
  reset('1.3.5','1.2.5');await streamCheck('1.3.5','current');
  calls=[];assert.equal((await download(context('?sha256='+latest.sha256))).status,409);assert.ok(!calls.some(x=>x.url.includes('/releases/assets/')));
  console.log('PASS current134 -> current135: version/size/hash/asset ID, GET/HEAD/Range; stale page=409');
  for (const mutate of Object.values(invalidCases)) {reset();mutate('config');await selected('1.3.4','current');}
  reset('1.3.4','1.2.3');await selected('1.3.4','current');
  console.log('PASS current lane wins over old/broken compatibility metadata and manual higher archives');
  for (const [label,mutate] of Object.entries(invalidCases)) {
    reset();mutate('current');await selected('1.2.4','compatibility');
    calls=[];assert.equal((await download(context('?sha256='+latest.sha256))).status,409,label+' must not change the selected bytes');
    assert.ok(!calls.some(x=>x.url.includes('/releases/assets/')));
    reset();state.currentStatus=404;mutate('config');await unavailable(label);
  }
  reset();state.currentStatus=404;const compat=await streamCheck('1.2.4','compatibility');
  reset('1.3.3');await selected('1.2.4','compatibility');
  for(const version of ['1.2.3','1.1.11']) {reset('1.3.3',version);await unavailable('both below repair minimum '+version);}
  reset();state.currentStatus=state.configStatus=404;await unavailable('no metadata even with bridge/higher archive');
  for (const fault of ['github','draft','prerelease']) {
    reset();if(fault==='github')state.githubStatus=429;else state.release[fault]=true;
    await unavailable(fault);
  }
  reset();state.replaced=true;assert.equal((await download(context())).status,502);cases++;
  assert.equal((await metadata({env:{}})).status,503);cases++;
  console.log('PASS independently bound compat124 fallback; no123/1111 fallback; malformed/replaced assets rejected');
  for (const state of ['loading','error']) {const html=renderContent('home','magireco-private-server',{magireco:{state}});assert.ok(!html.includes('>下载 APK</a>'));assert.ok(html.includes('data-magireco-refresh'));}
  const html=renderContent('home','magireco-private-server',{magireco:{...latest,state:'ready'}});
  assert.ok(html.includes('客户端版本 1.3.4'));assert.ok(html.includes(latest.download));
  assert.ok(!html.includes('以下为已校验的兼容版'));
  const fallback=renderContent('home','magireco-private-server',{magireco:{...compat,state:'ready'}});
  assert.ok(fallback.includes('客户端版本 1.2.4'));assert.ok(fallback.includes('以下为已校验的兼容版'));assert.ok(fallback.includes(compat.download));
  for(const text of ['初次安装','下载资源与线路','已有客户端如何更新','无需开启所有文件访问','不要先卸载或清除数据'])assert.ok(html.includes(text));
  for(const path of ['./api/magireco',latest.download,compat.download]) {
    assert.equal(serviceUrl(path,{hostname:'hiiraginemu.github.io'}),'https://madeinmagius-site.pages.dev/'+path.slice(2));
    assert.equal(serviceUrl(path,{hostname:'madeinmagius-site.pages.dev'}),path);
  }
  // M365 producer identities: metadata/HEAD binding only, not APK-byte acceptance.
  const m365 = {"current": {"version": "1.3.4", "version_code": 1713000858, "size": 462325970, "sha256": "e2fb1e34f87e95ac5cb5a20f9f60e7e9fd745510805d644d8cd3bcb1aa0e70f9"}, "compatibility": {"version": "1.2.4", "version_code": 1713000856, "size": 462325970, "sha256": "302303b615c7876e885492a54b1e38cdd55b25d95b6bce4023652fbcef422926"}};
  reset();
  for (const [lane, key, index] of [['current','current',0],['compatibility','config',1]]) {
    Object.assign(state[key],m365[lane]);
    state[key].signed_update.payload=JSON.stringify({...m365[lane],apk_urls:[state[key].apk_url]});
    Object.assign(state.release.assets[index],{size:m365[lane].size,digest:'sha256:'+m365[lane].sha256});
  }
  for (const lane of ['current','compatibility']) {
    if(lane==='compatibility')state.currentStatus=404;
    const response=await metadata({env});assert.equal(response.status,200);
    const result=await response.json();assert.equal(result.source,lane);
    for(const key of ['version','sha256','size'])assert.equal(result[key],m365[lane][key]);
    calls=[];const h=await head(context('?sha256='+result.sha256,'HEAD'));
    assert.equal(h.status,200);assert.equal(h.headers.get('content-length'),String(m365[lane].size));
    assert.equal(h.headers.get('x-client-version'),m365[lane].version);
    assert.ok(!calls.some(x=>x.url.includes('/releases/assets/')));cases++;
  }
  state.currentStatus=200;
  for(const oldHash of ['9c66871a2dcc6dfb5045d25be56f6f684669b23477414115060935447931918d',
    'a941356c669d094f0511871820a88f7949b1cf6a549374305949fb345205a1e5']) {
    calls=[];assert.equal((await download(context('?sha256='+oldHash))).status,409);
    assert.ok(!calls.some(x=>x.url.includes('/releases/assets/')));cases++;
  }
  console.log('PASS M365 identity/HEAD binding; M364 stale hashes=409; no real APK or remote publication');
  console.log('MAGIRECO_DUAL_LANE_DELIVERY=PASS cases='+cases+'; UI/mirror routes preserved; synthetic binaries only; network requests=0');
} finally {globalThis.fetch=originalFetch;}
