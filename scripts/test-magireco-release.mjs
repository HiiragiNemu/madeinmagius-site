import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
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
async function discoveryContractTests() {
  const fixtures = JSON.parse(await readFile(new URL('./fixtures/magireco-discovery127.json', import.meta.url), 'utf8'));
  const subtle = globalThis.crypto.subtle;
  const originalImport = subtle.importKey;
  let testingKey = await originalImport.call(subtle, 'spki', Buffer.from(fixtures.public_key,'hex'),
    { name:'RSASSA-PKCS1-v1_5', hash:'SHA-256' }, false, ['verify']);
  function alias(envelope=fixtures.valid) {
    reset('1.2.7');
    const payload = JSON.parse(envelope.payload);
    state.current = { ...payload, apk:canonicalName, apk_url:root+canonicalName, signed_update:envelope };
    state.release.assets[0].size = payload.size;
    state.release.assets[0].digest = 'sha256:'+payload.sha256;
    state.release.assets.push({id:1270,name:'magireco-legacy-client-1.2.7-corresponding-source.zip',
      state:'uploaded',size:payload.corresponding_source.size,digest:'sha256:'+payload.corresponding_source.sha256});
  }
  // Production pinned key must reject the independent fixture signer.
  alias();await unavailable('untrusted fixture signer with actual production public key');
  subtle.importKey = async function(format, data, algorithm, extractable, usages) {
    assert.equal(format,'jwk');assert.equal(data.n,fixtures.production_public_jwk);assert.equal(data.e,'AQAB');
    assert.deepEqual(algorithm,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'});
    assert.equal(extractable,false);assert.deepEqual(usages,['verify']);
    return testingKey; // Only in this test process. Real verify() is never mocked.
  };
  async function accepted(envelope=fixtures.valid) {
    alias(envelope);
    const response=await metadata({env});assert.equal(response.status,200);
    const result=await response.json();assert.equal(result.version,'1.2.7');
    assert.equal(result.sha256,state.current.sha256);assert.equal(result.size,state.current.size);
    for(const [handler,ctx,status] of [[head,context('','HEAD'),200],[download,context('?sha256='+result.sha256),200],
      [download,context('','GET',{Range:'bytes=0-1'}),206]]) {
      const served=await handler(ctx);assert.equal(served.status,status);
      assert.equal(served.headers.get('x-client-version'),'1.2.7');
      assert.ok(served.headers.get('content-disposition').includes('magireco-cn-1.2.7.apk'));
      if(status===206)assert.ok(served.headers.get('content-range').startsWith('bytes 0-1/'));
    }
    const html=renderContent('home','magireco-private-server',{magireco:{...result,state:'ready'}});
    assert.ok(html.includes('客户端版本 1.2.7'));
    assert.ok(html.includes('magireco-legacy-client-1.2.7-corresponding-source.zip'));
    assert.ok(!html.includes('客户端版本 1.3.127'));
    assert.ok(!html.includes('magireco-cn-1.3.127.apk'));
    assert.ok(!html.includes('magireco-legacy-client-1.3.127-corresponding-source.zip'));
    assert.equal((html.match(/>下载 APK<\/a>/g)||[]).length,1);
    assert.equal((await download(context('?sha256='+'0'.repeat(64)))).status,409);
    cases++;
  }
  try {
    await accepted();
    for(const [label,envelope] of Object.entries(fixtures.publication_negative)) {
      alias(envelope);await unavailable('signed mapping '+label);
    }
    const topMutations={
      'unsigned display':x=>x.display_version='1.2.8',
      'unsigned mapping':x=>x.compatibility_discovery.same_published_apk=false,
      'unsigned migration':x=>x.single_line_migration.minimum_code++,
      'unsigned code':x=>x.version_code++,
      'unsigned hash':x=>x.sha256='0'.repeat(64),
      'unsigned release_version':x=>x.release_version='1.3.127',
      'unsigned publisher':x=>x.publisher='Other',
      'unsigned source':x=>x.corresponding_source.sha256='0'.repeat(64),
      'unsigned apk_urls':x=>x.apk_urls=[root+aliasName],
      'legacy compatibility flag':x=>x.legacy_compatibility={},
      'bridge flag':x=>x.upgrade_bridge={},
      'missing envelope':x=>delete x.signed_update,
      'wrong key id':x=>x.signed_update.key_id='other',
      'extra envelope key':x=>x.signed_update.extra=true,
      'signature tampered':x=>x.signed_update.signature='0'.repeat(768),
      'signature out of range':x=>x.signed_update.signature='f'.repeat(768),
      'payload tampered':x=>x.signed_update.payload+=' ',
      'payload too large':x=>x.signed_update.payload+=' '.repeat(65537),
      'missing source asset':x=>state.release.assets.pop(),
      'source asset mismatch':x=>state.release.assets.at(-1).digest='sha256:'+'0'.repeat(64),
    };
    for(const [label,mutate] of Object.entries(topMutations)) {
      alias(structuredClone(fixtures.valid));mutate(state.current);await unavailable(label);
    }
    // Additional boundary cases use a new ephemeral signer, never production credentials.
    const pair=generateKeyPairSync('rsa',{modulusLength:3072});
    testingKey=await originalImport.call(subtle,'spki',pair.publicKey.export({format:'der',type:'spki'}),
      {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
    function signedPayload(mutator,domain='MAGIACN-APK-UPDATE-V1\n') {
      const data=JSON.parse(fixtures.valid.payload);mutator(data);const payload=JSON.stringify(data);
      return {schema:1,key_id:'release-manifest-v1',payload,
        signature:sign('sha256',Buffer.from(domain+payload),pair.privateKey).toString('hex')};
    }
    await accepted(signedPayload(p=>{p.version_code=1713000870;p.compatibility_discovery.installed_version_code=1713000870;p.release_version='1.3.127';
      p.single_line_migration=Object.fromEntries(Object.entries(p.single_line_migration).reverse());}));
    const exactDual = [root+canonicalName, bridge+aliasName];
    await accepted(signedPayload(p=>{p.apk_urls=exactDual;}));
    assert.ok(calls.some(call=>call.url.endsWith('/releases/assets/134')));
    assert.ok(!calls.some(call=>call.url===bridge+aliasName || call.url===bridge+canonicalName));
    for (const [label, urls] of Object.entries({
      'empty':[],
      'relay alone':[bridge+aliasName],
      'reversed':[bridge+aliasName,root+canonicalName],
      'duplicate canonical':[root+canonicalName,root+canonicalName],
      'third route':[...exactDual,bridge+aliasName],
      'fixed1111 bridge':[root+canonicalName,bridge+canonicalName],
      'github current alias':[root+canonicalName,root+aliasName],
      'other host':[root+canonicalName,'https://other.example/magireco-current-legacy-client.apk'],
      'http relay':[root+canonicalName,'http://magireco-personal-release.pages.dev/'+aliasName],
      'query':[root+canonicalName,bridge+aliasName+'?v=127'],
      'fragment':[root+canonicalName,bridge+aliasName+'#127'],
      'trailing slash':[root+canonicalName,bridge+aliasName+'/'],
      'encoded path':[root+canonicalName,bridge+'magireco%2Dcurrent-legacy-client.apk'],
      'object instead of array':{0:root+canonicalName,1:bridge+aliasName},
      'null':null,
      'string':root+canonicalName,
    })) {alias(signedPayload(p=>{p.apk_urls=urls;}));await unavailable('signed route '+label);}
    alias(signedPayload(p=>{p.apk_urls=exactDual;}));state.current.apk_urls=[root+canonicalName];
    await unavailable('signed dual but unsigned top singleton');
    alias(signedPayload(()=>{}));state.current.apk_urls=exactDual;
    await unavailable('unsigned dual added to signed singleton');
    alias(signedPayload(p=>{p.apk_urls=exactDual;}));state.current.apk_url=bridge+aliasName;
    await unavailable('dual cannot replace canonical apk_url');
    alias(signedPayload(p=>{p.apk_urls=exactDual;}));state.current.signed_update.signature='0'.repeat(768);
    await unavailable('dual still requires valid publisher signature');
    console.log('PASS exact signed single/dual routes; wrong lists, unsigned route changes and bad signature rejected; canonical asset unchanged; fixed1111 excluded');
    for(const [label,mutate] of Object.entries({
      'release_version is not display':p=>p.release_version='1.2.7',
      'release_version null':p=>p.release_version=null,
      'migration extra key':p=>p.single_line_migration.extra=true,
      'migration missing key':p=>delete p.single_line_migration.from,
      'note alias too late':p=>p.release_notes=['实际安装版本：1.2.7'+ 'x'.repeat(160)+'1.3.127'],
      'code upper bound':p=>{p.version_code=2147483648;p.compatibility_discovery.installed_version_code=p.version_code;},
      'GPL wrong real version':p=>p.corresponding_source.asset='magireco-legacy-client-1.3.127-corresponding-source.zip',
    })) {alias(signedPayload(mutate));await unavailable(label);}
    alias(signedPayload(()=>{},'WRONG-DOMAIN\n'));await unavailable('wrong signed domain');
    reset();state.current.display_version='1.2.7';await unavailable('unsigned display attached to ordinary126 path');
  } finally {subtle.importKey=originalImport;}
  console.log('PASS RSA3072/SHA256 publisher-key pin, signed127 mapping and tamper rejection; real126 preserved; alias never leaks to UI/download/source');
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
  const release127=renderContent('home','magireco-private-server',{magireco:{...latest,version:'1.2.7',state:'ready'}});
  const notes127=release127.split('<h3>1.2.7 更新内容</h3><ul>')[1]?.split('</ul>')[0];
  assert.equal((notes127?.match(/<li>/g)||[]).length,6);
  const expectedNotes127 = ["实际安装版本：1.2.7；1.3.127仅为兼容旧1.3.4检查更新的发现序号，安装包只有一份，覆盖安装保留存档与资源。", "接通魔法石回复AP按钮，按5颗魔法石、免费优先的规则扣款并保存AP。", "修复排队与实际执行共用超时导致的结算成功响应丢失；保留真正超时提示和重复结算回执。", "修复商店首购、多商品库存及持有数刷新，兼容旧档Android魔法石余额。", "恢复2020新年三档福袋：通过本地免费模拟买钻购买，不涉及真实充值；打通383/384自选券、385券及28种记忆兑换。", "补齐福袋记忆兑换券的原版小图，调整礼包说明为两行，避免与价格重叠。"];
  for(const note of expectedNotes127) assert.ok(notes127.includes(note),note);
  assert.ok(release127.includes('旧版“检查更新”接收新版安装包'));
  assert.ok(!release127.includes('误报已是最新版'));
  assert.ok(!release127.includes('完成一次覆盖迁移'));
  assert.ok(!release127.includes('1.2.6 更新内容'));
  assert.ok(release127.includes('不要卸载或清除数据'));
  assert.ok(release127.includes(root+'magireco-legacy-client-1.2.7-corresponding-source.zip'));
  assert.equal((release127.match(/>下载 APK<\/a>/g)||[]).length,1);
  for(const state of ['loading','error']) {
    const pending=renderContent('home','magireco-private-server',{magireco:{state}});
    assert.ok(!pending.includes('误报已是最新版'));
    assert.ok(!pending.includes('1.2.7 更新内容'));
    assert.equal((pending.match(/>下载 APK<\/a>/g)||[]).length,0);
    cases++;
  }
  cases++;
  console.log('PASS final127 six exact producer notes, local free simulation copy, single APK, updated134 guide and neutral pending states');
  console.log('PASS current metadata -> signed GitHub latest canonical only; relay1111, unapproved extra signed URL and alias-only asset excluded');
  console.log('PASS 1.2.6 six producer notes, version-specific source ZIP, single APK and old1.3.4 migration notice');
  await discoveryContractTests();
  console.log('MAGIRECO_SINGLE_LINE_DELIVERY=PASS cases='+cases+'; synthetic API fixtures only; no real APK download; network requests=0');
} finally {globalThis.fetch=originalFetch;}
