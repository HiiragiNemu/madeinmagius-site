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
const canonicalName = 'magireco-latest-legacy-client.apk';
const aliasName = 'magireco-current-legacy-client.apk';
const sha = data => createHash('sha256').update(data).digest('hex');
const bytes = version => Buffer.from('APK-fixture-' + version);
function sidecar(version, lane = 'current') {
  const data = bytes(version), apk = lane === 'current' ? canonicalName : aliasName, apk_url = root + apk;
  const value = { version, version_code:1713000865 /* synthetic test code, not final producer identity */,
    size:data.length, sha256:sha(data), apk, apk_url };
  // Synthetic consistency fixture, not a cryptographically signed release.
  value.signed_update = { schema:1, payload:JSON.stringify({ ...value, apk_urls:[apk_url] }) };
  return value;
}
function asset(name, version, id) { return { name, id, state:'uploaded', size:bytes(version).length, digest:'sha256:' + sha(bytes(version)) }; }
let state, calls = [], cases = 0;
function reset(version = '1.2.5', compatibility = '1.3.4') {
  state = { current:sidecar(version), config:sidecar(compatibility,'compatibility'),
    release:{draft:false,prerelease:false,assets:[asset(canonicalName,version,134),asset(aliasName,compatibility,124),
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
  assert.equal(h.headers.get('content-length'),String(bytes(version).length));assert.equal(calls.length,2);assert.ok(!calls.some(x=>x.url.includes('/releases/assets/')));
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
  'signed-code-mismatch':key=>state[key].signed_update.payload=JSON.stringify({...state[key],version_code:1713000864,apk_urls:[state[key].apk_url]}),
  'signed-bad-json':key=>state[key].signed_update.payload='{',
  'signed-url-mismatch':key=>state[key].signed_update.payload=JSON.stringify({...state[key],apk_urls:['https://untrusted.test/a.apk']}),
  'signed-extra-alias':key=>state[key].signed_update.payload=JSON.stringify({...state[key],apk_urls:[root+canonicalName,root+aliasName]}),
  'current-alias-as-canonical':key=>{state[key].apk=aliasName;state[key].apk_url=root+aliasName;state[key].signed_update.payload=JSON.stringify({...state[key],apk_urls:[root+aliasName]});},
  'foreign-url':key=>state[key].apk_url='https://untrusted.test/a.apk',
  'query-url':key=>state[key].apk_url+='?other=1',
  'frozen-bridge-url':key=>state[key].apk_url=bridge+canonicalName,
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
function assertSingleMetadata() {
  assert.ok(calls.some(x=>x.url===bridge+'magireco-current-legacy-client.version.json'));
  assert.ok(!calls.some(x=>x.url.includes('magireco-compat-') || x.url.includes('legacy/config.json')));
}
try {
  reset();const latest=await streamCheck('1.2.5','current');assertSingleMetadata();
  reset('1.2.6');await streamCheck('1.2.6','current');assertSingleMetadata();
  calls=[];assert.equal((await download(context('?sha256='+latest.sha256))).status,409);
  assert.ok(!calls.some(x=>x.url.includes('/releases/assets/')));
  console.log('PASS single current125 -> current126: hash/size/asset ID, GET/HEAD/Range; stale page=409');
  for (const mutate of Object.values(invalidCases)) {reset();mutate('config');await selected('1.2.5','current');assertSingleMetadata();}
  for (const [label,mutate] of Object.entries(invalidCases)) {
    reset();mutate('current');await unavailable(label);assertSingleMetadata();
  }
  for (const version of ['1.1.11','1.2.3','1.2.4','1.3.4','1.3.5','2.0.0']) {
    reset(version);await unavailable('not the single 1.2.x release line: '+version);assertSingleMetadata();
  }
  for (const code of [1713000864,1713000858,'1713000865',1713000865.5,null]) {
    reset();state.current.version_code=code;
    state.current.signed_update.payload=JSON.stringify({...state.current,apk_urls:[state.current.apk_url]});
    await unavailable('invalid migration version code '+code);
  }
  for (const fault of ['github','draft','prerelease']) {
    reset();if(fault==='github')state.githubStatus=429;else state.release[fault]=true;
    await unavailable(fault);
  }
  reset('1.2.5','1.2.5');state.release.assets.shift();await unavailable('canonical missing even with byte-identical current alias');
  reset();state.currentStatus=404;await unavailable('no current even with compatibility/bridge/higher archive');assertSingleMetadata();
  reset();state.replaced=true;assert.equal((await download(context())).status,502);cases++;
  assert.equal((await metadata({env:{}})).status,503);cases++;
  console.log('PASS no compatibility/bridge fallback; old125 code, 134/135 and mismatched metadata rejected');
  for (const state of ['loading','error']) {
    const html=renderContent('home','magireco-private-server',{magireco:{state}});
    assert.ok(!html.includes('>下载 APK</a>'));assert.ok(html.includes('data-magireco-refresh'));
  }
  const html=renderContent('home','magireco-private-server',{magireco:{...latest,state:'ready'}});
  assert.ok(html.includes('客户端版本 1.2.5'));assert.ok(html.includes(latest.download));
  assert.equal((html.match(/>下载 APK<\/a>/g)||[]).length,1);
  assert.ok(!html.includes('以下为已校验的兼容版') && !html.includes('客户端版本 1.3.4'));
  for(const text of ['此前显示为 1.3.4','一次覆盖迁移','统一使用 1.2.x','同来源、同签名','不要先卸载或清除数据','初次安装','下载资源与线路','无需开启所有文件访问'])assert.ok(html.includes(text),text);
  for(const path of ['./api/magireco',latest.download]) {
    assert.equal(serviceUrl(path,{hostname:'hiiraginemu.github.io'}),'https://madeinmagius-site.pages.dev/'+path.slice(2));
    assert.equal(serviceUrl(path,{hostname:'madeinmagius-site.pages.dev'}),path);
  }
  assert.ok(html.includes(root+'magireco-legacy-client-1.2.5-corresponding-source.zip'));
  assert.ok(!html.includes('1.2.6 更新内容'));
  const release126=renderContent('home','magireco-private-server',{magireco:{...latest,version:'1.2.6',state:'ready'}});
  assert.ok(release126.includes(root+'magireco-legacy-client-1.2.6-corresponding-source.zip'));
  assert.equal((release126.match(/>下载 APK<\/a>/g)||[]).length,1);
  const notes126=release126.split('<h3>1.2.6 更新内容</h3><ul>')[1]?.split('</ul>')[0];
  assert.equal((notes126?.match(/<li>/g)||[]).length,6);
  for (const text of ['行动盘外观到原生战斗','LOG新增手动游玩记录','离线结算台词','Awaken','单一版本线','紧凑横向弹窗']) assert.ok(notes126.includes(text),text);
  for (const text of ['AP石','504','福袋']) assert.ok(!notes126.includes(text),text);
  assert.ok(release126.includes('误报已是最新版') && release126.includes('不要卸载或清除数据'));
  cases++;
  console.log('PASS current metadata -> signed GitHub latest canonical only; relay1111, extra signed URL and alias-only asset excluded');
  console.log('PASS 1.2.6 six producer notes, version-specific source ZIP, single APK and old1.3.4 migration notice');
  console.log('MAGIRECO_SINGLE_LINE_DELIVERY=PASS cases='+cases+'; synthetic API fixtures only; no real APK download; network requests=0');
} finally {globalThis.fetch=originalFetch;}
