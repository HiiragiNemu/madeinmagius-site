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
    state.release.assets.push({id:1270,name:payload.corresponding_source.asset,
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

    // Synthetic identities are isolated from the frozen official production contract.
    const synthetic128 = JSON.parse(fixtures.valid.payload);
    Object.assign(synthetic128, {version:'1.3.128',display_version:'1.2.8',version_code:1713000880,
      sha256:sha(bytes('1.2.8')),size:bytes('1.2.8').length,source_commit:'8'.repeat(40),
      corresponding_source:{asset:'magireco-legacy-client-1.2.8-corresponding-source.zip',sha256:'8'.repeat(64),size:128},
      release_notes:['实际安装版本：1.2.8；1.3.128仅为旧版发现序号。合成测试，非发布。']});
    synthetic128.compatibility_discovery={...synthetic128.compatibility_discovery,discovery_version:'1.3.128',
      installed_public_version:'1.2.8',installed_version_code:1713000880};
    synthetic128.single_line_migration={...synthetic128.single_line_migration,minimum_version:'1.2.8',minimum_code:1713000880,
      legacy_discovery:{version:'1.3.128',display_version:'1.2.8'}};
    if(Object.hasOwn(synthetic128,'release_version'))synthetic128.release_version='1.3.128';
    const contractFields=['version','display_version','version_code','sha256','size','source_commit','corresponding_source','single_line_migration','release_notes'];
    const syntheticContract=Object.fromEntries(contractFields.map(field=>[field,structuredClone(synthetic128[field])]));
    function use128(mutate=()=>{}) {
      alias(signedPayload(p=>{Object.assign(p,structuredClone(synthetic128));mutate(p);}));
      state.binaries[134]=bytes('1.2.8');
    }
    use128();await unavailable('synthetic128 cannot match the official production identity');
    const readerSource=await readFile(new URL('../lib/magireco-release.js',import.meta.url),'utf8');
    const contractDeclaration=/^const RELEASE_128_CONTRACT = .*;$/m;
    assert.equal(readerSource.match(new RegExp(contractDeclaration.source,'gm'))?.length,1);
    async function boundReader(contract) {
      const source=readerSource.replace(contractDeclaration,
        'const RELEASE_128_CONTRACT = '+JSON.stringify(contract)+';');
      return (await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).readMagirecoRelease;
    }
    const readUnbound=await boundReader(null);
    await assert.rejects(()=>readUnbound(env));cases++;
    const readBound=await boundReader(syntheticContract);
    for(const urls of [[root+canonicalName],[root+canonicalName,bridge+aliasName]]) {
      use128(p=>{p.apk_urls=urls;});const result=await readBound(env);
      assert.equal(result.version,'1.2.8');assert.equal(result.sha256,synthetic128.sha256);
      assert.equal(result.size,synthetic128.size);assert.equal(result.asset.name,'magireco-cn-1.2.8.apk');
      assert.equal(result.asset.id,134);assert.equal(result.asset.url,base+'/releases/assets/134');
      const html=renderContent('home','magireco-private-server',{magireco:{...result,state:'ready'}});
      assert.ok(html.includes('magireco-legacy-client-1.2.8-corresponding-source.zip'));
      const officialContract=JSON.parse(readerSource.match(/^const RELEASE_128_CONTRACT = (.*);$/m)[1]);
      const notes128=html.split('<h3>1.2.8 更新内容</h3><ul>')[1]?.split('</ul>')[0];
      assert.equal(officialContract.release_notes.length,8);
      assert.equal((notes128?.match(/<li>/g)||[]).length,8);
      for(const note of officialContract.release_notes)assert.ok(notes128.includes(note),note);
      assert.ok(!html.includes('客户端版本 1.3.128'));
      assert.ok(!html.includes('1.2.7 更新内容'));
      cases++;
    }
    for(const urls of [[root+canonicalName],[root+canonicalName,bridge+aliasName]]) {
      alias(signedPayload(p=>{p.apk_urls=urls;}));const result=await readBound(env);
      assert.equal(result.version,'1.2.7');cases++;
    }
    use128(p=>{p.corresponding_source.url=root+p.corresponding_source.asset;});
    assert.equal((await readBound(env)).version,'1.2.8');cases++;
    use128();state.current.release_notes=['not signed'];await assert.rejects(()=>readBound(env));cases++;
    const invalid128={
      'APK hash':p=>p.sha256='9'.repeat(64),
      'APK size':p=>p.size++,
      'GPL hash':p=>p.corresponding_source.sha256='9'.repeat(64),
      'GPL size':p=>p.corresponding_source.size++,
      'GPL old name':p=>p.corresponding_source.asset='magireco-legacy-client-1.2.7-corresponding-source.zip',
      'source commit':p=>p.source_commit='9'.repeat(40),
      'lower code':p=>{p.version_code=1713000879;p.compatibility_discovery.installed_version_code=p.version_code;},
      'higher code':p=>{p.version_code=1713000881;p.compatibility_discovery.installed_version_code=p.version_code;},
      'migration':p=>p.single_line_migration.minimum_code++,
      'notes':p=>p.release_notes.push('unsigned by frozen contract'),
      'old display':p=>p.display_version='1.2.7',
      'mixed mapping':p=>p.compatibility_discovery.discovery_version='1.3.127',
      'old first note':p=>p.release_notes[0]='实际安装版本：1.2.7；1.3.127',
      'unknown alias':p=>p.version='1.3.129',
      'bad route':p=>p.apk_urls=[root+canonicalName,bridge+canonicalName],
    };
    for(const [label,mutate] of Object.entries(invalid128)) {
      use128(mutate);await assert.rejects(()=>readBound(env),undefined,label);cases++;
    }
    for(const contract of [null,{}, {...syntheticContract,sha256:null},
      {...syntheticContract,extra:true}, {...syntheticContract,release_notes:[123]},
      {...syntheticContract,corresponding_source:{...syntheticContract.corresponding_source,url:'extra'}},
      {...syntheticContract,corresponding_source:{asset:syntheticContract.corresponding_source.asset}},
      {...syntheticContract,single_line_migration:{}}]) {
      use128();await assert.rejects(()=>(boundReader(contract)).then(reader=>reader(env)));cases++;
    }
    use128();state.current.sha256='9'.repeat(64);await assert.rejects(()=>readBound(env));cases++;
    use128();state.current.signed_update.signature='0'.repeat(768);await assert.rejects(()=>readBound(env));cases++;
    use128();state.release.assets[0].digest='sha256:'+'9'.repeat(64);await assert.rejects(()=>readBound(env));cases++;
    for(const version of ['1.2.8','1.2.08','1.2.9','1.2.999']) {
      reset(version);await unavailable('raw future patch bypass '+version);
      delete state.current.signed_update;await unavailable('raw future without envelope '+version);
    }
    reset('1.2.7');state.current.version_code=1713000880;
    state.current.signed_update.payload=JSON.stringify({...state.current,apk_urls:[root+canonicalName]});
    await unavailable('future code disguised as historical raw127');
    alias(signedPayload(p=>{p.version_code=1713000880;p.compatibility_discovery.installed_version_code=p.version_code;}));
    await unavailable('future code disguised as signed127');

    // Producer code is confirmed; all APK/source identities below remain synthetic.
    const synthetic129=structuredClone(synthetic128);
    Object.assign(synthetic129,{version:'1.3.129',display_version:'1.2.9',version_code:1713000881,
      sha256:sha(bytes('1.2.9')),size:bytes('1.2.9').length,source_commit:'9'.repeat(40),
      corresponding_source:{asset:'magireco-legacy-client-1.2.9-corresponding-source.zip',sha256:'9'.repeat(64),size:129},
      release_notes:['实际安装版本：1.2.9；1.3.129仅为旧版发现序号。合成测试，非发布。']});
    synthetic129.compatibility_discovery={...synthetic129.compatibility_discovery,discovery_version:'1.3.129',installed_public_version:'1.2.9',installed_version_code:1713000881};
    synthetic129.single_line_migration={...synthetic129.single_line_migration,minimum_version:'1.2.9',minimum_code:1713000881,legacy_discovery:{version:'1.3.129',display_version:'1.2.9'}};
    if(Object.hasOwn(synthetic129,'release_version'))synthetic129.release_version='1.3.129';
    const contract129=Object.fromEntries(contractFields.map(field=>[field,structuredClone(synthetic129[field])]));
    function use129(mutate=()=>{}) {
      alias(signedPayload(p=>{Object.assign(p,structuredClone(synthetic129));mutate(p);}));
      state.binaries[134]=bytes('1.2.9');
    }
    async function boundReader129(contract) {
      const source=readerSource.replace(contractDeclaration,'const RELEASE_128_CONTRACT = '+JSON.stringify(syntheticContract)+';')
        .replace(/^const RELEASE_129_CONTRACT = .*;$/m,'const RELEASE_129_CONTRACT = '+JSON.stringify(contract)+';');
      return (await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).readMagirecoRelease;
    }
    assert.equal(readerSource.match(/^const RELEASE_129_CONTRACT = .*;$/gm)?.length,1);
    use129();await unavailable('synthetic129 is not the official production identity');
    await assert.rejects(()=>(boundReader129(null)).then(reader=>reader(env)));cases++;
    const read129=await boundReader129(contract129);
    for(const urls of [[root+canonicalName],exactDual]) {
      use129(p=>p.apk_urls=urls);const selected129=await read129(env);
      assert.equal(selected129.version,'1.2.9');assert.equal(selected129.sha256,synthetic129.sha256);
      assert.equal(selected129.asset.id,134);assert.equal(selected129.asset.name,'magireco-cn-1.2.9.apk');
      const rendered=renderContent('home','magireco-private-server',{magireco:{...selected129,state:'ready'}});
      assert.equal((rendered.match(/>下载 APK<\/a>/g)||[]).length,1);
      assert.ok(rendered.includes('magireco-legacy-client-1.2.9-corresponding-source.zip'));
      const notes129=rendered.split('<h3>1.2.9 更新内容</h3><ul>')[1]?.split('</ul>')[0];
      if(notes129) {
        const official129=JSON.parse(readerSource.match(/^const RELEASE_129_CONTRACT = (.*);$/m)[1]);
        assert.ok(official129);
        assert.equal((notes129.match(/<li>/g)||[]).length,official129.release_notes.length);
        for(const note of official129.release_notes)assert.ok(notes129.includes(note),note);
      }
      cases++;
      use128(p=>p.apk_urls=urls);assert.equal((await read129(env)).version,'1.2.8');cases++;
      alias(signedPayload(p=>p.apk_urls=urls));assert.equal((await read129(env)).version,'1.2.7');cases++;
    }
    for(const [label,mutate] of Object.entries({
      'code lower':p=>{p.version_code--;p.compatibility_discovery.installed_version_code=p.version_code;},
      'code higher':p=>{p.version_code++;p.compatibility_discovery.installed_version_code=p.version_code;},
      'hash':p=>p.sha256='a'.repeat(64),'size':p=>p.size++,
      'GPL hash':p=>p.corresponding_source.sha256='a'.repeat(64),'GPL size':p=>p.corresponding_source.size++,
      'source':p=>p.source_commit='a'.repeat(40),'notes':p=>p.release_notes.push('different'),
      'migration':p=>p.single_line_migration.minimum_code++,
      'mapping':p=>p.compatibility_discovery.discovery_version='1.3.128',
      'unknown131':p=>p.version='1.3.131','raw129':p=>p.version='1.2.9',
      'route':p=>p.apk_urls=[bridge+aliasName],
    })) {use129(mutate);await assert.rejects(()=>read129(env),undefined,label);cases++;}
    for(const mutate of [p=>p.version_code=1713000880,p=>p.version_code='1713000999',p=>p.version_code=2147483648,
      p=>p.single_line_migration.minimum_code++,p=>p.single_line_migration.from.sha256='a'.repeat(64),
      p=>p.single_line_migration.mode='other',p=>p.single_line_migration.minimum_version='1.2.8']) {
      const invalid=structuredClone(contract129);mutate(invalid);
      use129(p=>Object.assign(p,structuredClone(invalid)));
      await assert.rejects(()=>(boundReader129(invalid)).then(reader=>reader(env)));cases++;
    }
    for(const mutate of [()=>state.current.signed_update.signature='0'.repeat(768),
      ()=>state.current.source_commit='a'.repeat(40),()=>state.release.assets[0].digest='sha256:'+'a'.repeat(64)]) {
      use129();mutate();await assert.rejects(()=>read129(env));cases++;
    }
    console.log('PASS129 local preparation: null rejects; synthetic bound accepts129 and preserves128/127; mismatched identity, migration, signer and assets rejected; confirmed code; synthetic payload only');

    // 130 fixtures never substitute for the producer's official APK/source identity.
    const synthetic130=structuredClone(synthetic129);
    Object.assign(synthetic130,{version:'1.3.130',display_version:'1.3.0',version_code:1713000882,
      sha256:sha(bytes('1.3.0')),size:bytes('1.3.0').length,source_commit:'c'.repeat(40),
      corresponding_source:{asset:'magireco-legacy-client-1.3.0-corresponding-source.zip',sha256:'c'.repeat(64),size:130},
      release_notes:['实际安装版本：1.3.0；1.3.130仅为旧版发现序号。合成测试，非发布。']});
    synthetic130.compatibility_discovery={...synthetic130.compatibility_discovery,discovery_version:'1.3.130',
      installed_public_version:'1.3.0',installed_version_code:1713000882};
    synthetic130.single_line_migration={...synthetic130.single_line_migration,minimum_version:'1.3.0',minimum_code:1713000882,
      legacy_discovery:{version:'1.3.130',display_version:'1.3.0'}};
    if(Object.hasOwn(synthetic130,'release_version'))synthetic130.release_version='1.3.130';
    const contract130=Object.fromEntries(contractFields.map(field=>[field,structuredClone(synthetic130[field])]));
    const declaration130=/^const RELEASE_130_CONTRACT = .*;$/m;
    assert.equal(readerSource.match(new RegExp(declaration130.source,'gm'))?.length,1);
    const official130=JSON.parse(readerSource.match(/^const RELEASE_130_CONTRACT = (.*);$/m)[1]);
    function use130(mutate=()=>{}) {
      alias(signedPayload(p=>{Object.assign(p,structuredClone(synthetic130));mutate(p);}));
      state.binaries[134]=bytes('1.3.0');
    }
    const moduleUrl=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
    function reader130Url(contract) {
      return moduleUrl(readerSource.replace(contractDeclaration,'const RELEASE_128_CONTRACT = '+JSON.stringify(syntheticContract)+';')
        .replace(/^const RELEASE_129_CONTRACT = .*;$/m,'const RELEASE_129_CONTRACT = '+JSON.stringify(contract129)+';')
        .replace(declaration130,'const RELEASE_130_CONTRACT = '+JSON.stringify(contract)+';'));
    }
    async function boundReader130(contract) {return (await import(reader130Url(contract))).readMagirecoRelease;}
    use130();await unavailable('synthetic130 is not an official bound production identity');
    await assert.rejects(()=>(boundReader130(null)).then(reader=>reader(env)));cases++;
    const read130=await boundReader130(contract130);
    // Exercise the real handlers with only their reader import rebound in this process.
    const apiSource=await readFile(new URL('../functions/api/magireco.js',import.meta.url),'utf8');
    const downloadSource=await readFile(new URL('../functions/downloads/magireco/android.js',import.meta.url),'utf8');
    assert.equal(apiSource.split("'../../lib/magireco-release.js'").length,2);
    assert.equal(downloadSource.split("'../../../lib/magireco-release.js'").length,2);
    assert.equal(downloadSource.split("'../[project]/[kind].js'").length,2);
    async function boundHandlers(readerUrl) {
      const {onRequestGet:metadata}=await import(moduleUrl(apiSource.replace("'../../lib/magireco-release.js'",JSON.stringify(readerUrl))));
      const {onRequestGet:download,onRequestHead:head}=await import(moduleUrl(downloadSource
        .replace("'../../../lib/magireco-release.js'",JSON.stringify(readerUrl))
        .replace("'../[project]/[kind].js'",JSON.stringify(new URL('../functions/downloads/[project]/[kind].js',import.meta.url).href))));
      return {metadata,download,head};
    }
    const {metadata:metadata130,download:download130,head:head130}=await boundHandlers(reader130Url(contract130));
    for(const urls of [[root+canonicalName],exactDual]) {
      use130(p=>p.apk_urls=urls);
      const selected130=await read130(env);
      assert.equal(selected130.version,'1.3.0');assert.equal(selected130.sha256,synthetic130.sha256);
      assert.equal(selected130.size,synthetic130.size);assert.equal(selected130.asset.id,134);
      assert.equal(selected130.asset.name,'magireco-cn-1.3.0.apk');assert.equal(selected130.asset.url,base+'/releases/assets/134');
      const response=await metadata130({env});assert.equal(response.status,200);
      assert.equal(response.headers.get('cache-control'),'no-store');
      const current130=await response.json();assert.equal(current130.version,'1.3.0');assert.equal(current130.source,'current');
      assert.equal(current130.asset,undefined);assert.ok(!JSON.stringify(current130).includes(env.GITHUB_RELEASES_TOKEN));
      assert.equal(current130.download,'./downloads/magireco/android?sha256='+synthetic130.sha256);cases++;
      calls=[];
      const full=await download130(context('?sha256='+current130.sha256));assert.equal(full.status,200);
      assert.equal(await full.text(),bytes('1.3.0').toString());assert.equal(full.headers.get('x-client-version'),'1.3.0');
      assert.ok(full.headers.get('content-disposition').includes('magireco-cn-1.3.0.apk'));
      assert.equal(full.headers.get('cache-control'),'no-store');assert.ok(calls.some(call=>call.url===base+'/releases/assets/134'));cases++;
      calls=[];
      const headers=await head130(context('?sha256='+current130.sha256,'HEAD'));assert.equal(headers.status,200);
      assert.equal(await headers.text(),'');assert.equal(headers.headers.get('content-length'),String(synthetic130.size));
      assert.equal(headers.headers.get('x-client-version'),'1.3.0');assert.equal(calls.length,2);
      assert.ok(!calls.some(call=>call.url.includes('/releases/assets/')));cases++;
      calls=[];
      const range=await download130(context('?sha256='+current130.sha256,'GET',{Range:'bytes=0-1'}));assert.equal(range.status,206);
      assert.equal(await range.text(),bytes('1.3.0').subarray(0,2).toString());
      assert.equal(range.headers.get('content-range'),`bytes 0-1/${synthetic130.size}`);
      assert.equal(range.headers.get('x-client-version'),'1.3.0');
      assert.ok(calls.filter(call=>call.url.includes('/releases/assets/')||call.url.startsWith('https://objects.test/')).every(call=>call.range==='bytes=0-1'));
      assert.ok(!calls.some(call=>call.url===bridge+aliasName||call.url===bridge+canonicalName));cases++;
      calls=[];
      assert.equal((await download130(context('?sha256='+'0'.repeat(64)))).status,409);
      assert.ok(!calls.some(call=>call.url.includes('/releases/assets/')));cases++;
      const rendered=renderContent('home','magireco-private-server',{magireco:{...current130,state:'ready'}});
      assert.equal((rendered.match(/>下载 APK<\/a>/g)||[]).length,1);
      assert.ok(rendered.includes('客户端版本 1.3.0'));
      assert.ok(rendered.includes('magireco-legacy-client-1.3.0-corresponding-source.zip'));
      assert.ok(!rendered.includes('客户端版本 1.3.130'));
      assert.ok(!rendered.includes('magireco-legacy-client-1.3.130-corresponding-source.zip'));
      assert.ok(!rendered.includes('实际安装版本统一为 1.2.x'));
      assert.ok(!rendered.includes('1.2.9 更新内容'));
      const notes130=rendered.split('<h3>1.3.0 更新内容</h3><ul>')[1]?.split('</ul>')[0];
      // Support deploy binds the identity before activation adds its notes.
      if(notes130 !== undefined) {
        assert.ok(official130,'published notes require the official bound identity');
        assert.equal((notes130?.match(/<li>/g)||[]).length,official130.release_notes.length);
        for(const note of official130.release_notes)assert.ok(notes130.includes(note),note);
      }
      if(!official130) assert.equal(notes130,undefined,'unbound130 must not invent published notes');
      cases++;
      use129(p=>p.apk_urls=urls);assert.equal((await read130(env)).version,'1.2.9');cases++;
      use128(p=>p.apk_urls=urls);assert.equal((await read130(env)).version,'1.2.8');cases++;
      alias(signedPayload(p=>p.apk_urls=urls));assert.equal((await read130(env)).version,'1.2.7');cases++;
    }
    use130(p=>p.corresponding_source.url=root+p.corresponding_source.asset);
    assert.equal((await read130(env)).version,'1.3.0');cases++;
    for(const [label,mutate] of Object.entries({
      'lower code':p=>{p.version_code--;p.compatibility_discovery.installed_version_code=p.version_code;},
      'higher code':p=>{p.version_code++;p.compatibility_discovery.installed_version_code=p.version_code;},
      'APK hash':p=>p.sha256='b'.repeat(64),'APK size':p=>p.size++,
      'GPL hash':p=>p.corresponding_source.sha256='b'.repeat(64),'GPL size':p=>p.corresponding_source.size++,
      'GPL alias name':p=>p.corresponding_source.asset='magireco-legacy-client-1.3.130-corresponding-source.zip',
      'source':p=>p.source_commit='b'.repeat(40),'notes':p=>p.release_notes.push('different'),
      'migration':p=>p.single_line_migration.minimum_code++,
      'old display':p=>p.display_version='1.2.9','mapping':p=>p.compatibility_discovery.discovery_version='1.3.129',
      'unknown131':p=>p.version='1.3.131','raw130':p=>p.version='1.3.0',
      'coherent future131':p=>{
        Object.assign(p,{version:'1.3.131',display_version:'1.3.1',version_code:1713000883,
          release_notes:['实际安装版本：1.3.1；1.3.131仅为旧版发现序号。合成测试，非发布。']});
        Object.assign(p.compatibility_discovery,{discovery_version:'1.3.131',installed_public_version:'1.3.1',installed_version_code:1713000883});
        Object.assign(p.single_line_migration,{minimum_version:'1.3.1',minimum_code:1713000883,
          legacy_discovery:{version:'1.3.131',display_version:'1.3.1'}});
        p.corresponding_source.asset='magireco-legacy-client-1.3.1-corresponding-source.zip';
        if(Object.hasOwn(p,'release_version'))p.release_version='1.3.131';
      },
      'release identity':p=>p.release_version='1.3.0','route':p=>p.apk_urls=[bridge+aliasName],
      'unsigned-shape mapping':p=>p.compatibility_discovery.same_published_apk=false,
    })) {use130(mutate);await assert.rejects(()=>read130(env),undefined,'130 '+label);cases++;}
    for(const [label,mutate] of Object.entries({
      'lower code':p=>p.version_code=1713000881,'higher code':p=>p.version_code=1713000883,
      'string code':p=>p.version_code='1713000882','extra field':p=>p.extra=true,
      'bad hash':p=>p.sha256=null,'bad size':p=>p.size=0,'bad source':p=>p.source_commit='invalid',
      'bad source hash':p=>p.corresponding_source.sha256='invalid','bad source size':p=>p.corresponding_source.size=0,
      'extra source field':p=>p.corresponding_source.extra=true,'missing source':p=>delete p.corresponding_source,
      'bad notes':p=>p.release_notes=[123],'empty notes':p=>p.release_notes=[],
      'migration code':p=>p.single_line_migration.minimum_code++,
      'migration source':p=>p.single_line_migration.from.sha256='b'.repeat(64),
      'migration mode':p=>p.single_line_migration.mode='other','migration line':p=>p.single_line_migration.to_line='other',
      'migration minimum':p=>p.single_line_migration.minimum_version='1.2.9',
    })) {
      const invalid=structuredClone(contract130);mutate(invalid);
      use130(p=>Object.assign(p,structuredClone(invalid)));
      await assert.rejects(()=>(boundReader130(invalid)).then(reader=>reader(env)),undefined,'130 invalid contract '+label);cases++;
    }
    for(const mutate of [()=>state.current.signed_update.signature='0'.repeat(768),
      ()=>state.current.source_commit='b'.repeat(40),()=>state.current.release_notes=['not signed'],
      ()=>state.release.assets[0].digest='sha256:'+'b'.repeat(64),()=>state.release.assets.pop(),
      ()=>state.release.assets.at(-1).digest='sha256:'+'b'.repeat(64)]) {
      use130();mutate();await assert.rejects(()=>read130(env));
      assert.equal((await metadata130({env})).status,503);assert.equal((await download130(context())).status,503);cases++;
    }
    for(const version of ['1.3.0','1.3.00','1.3.1','1.3.130','1.3.131']) {
      reset(version);await assert.rejects(()=>read130(env),undefined,'raw version '+version);cases++;
      delete state.current.signed_update;await assert.rejects(()=>read130(env),undefined,'unsigned raw version '+version);cases++;
    }
    reset('1.3.0');state.current.version_code=1713000882;
    state.current.signed_update.payload=JSON.stringify({...state.current,apk_urls:[root+canonicalName]});
    await assert.rejects(()=>read130(env),undefined,'raw130 with exact production code');cases++;
    console.log('PASS130 preparation: null and synthetic production identities reject; isolated signed130 -> display1.3.0/code1713000882 accepts; GET/HEAD/Range and stale409; preserves129/128/127; raw/future/forged/altered contracts reject; no invented notes');

    // Official131 staging: preserve isolated null-contract and synthetic-tamper rejection.
    const synthetic131=structuredClone(synthetic130);
    Object.assign(synthetic131,{version:'1.3.131',display_version:'1.3.1',version_code:1713000883,
      sha256:sha(bytes('1.3.1')),size:bytes('1.3.1').length,source_commit:'d'.repeat(40),
      corresponding_source:{asset:'magireco-legacy-client-1.3.1-corresponding-source.zip',sha256:'d'.repeat(64),size:131},
      release_notes:['实际安装版本：1.3.1；1.3.131仅为旧版发现序号。合成测试，非发布。']});
    Object.assign(synthetic131.compatibility_discovery,{discovery_version:'1.3.131',installed_public_version:'1.3.1',installed_version_code:1713000883});
    Object.assign(synthetic131.single_line_migration,{minimum_version:'1.3.1',minimum_code:1713000883,
      legacy_discovery:{version:'1.3.131',display_version:'1.3.1'}});
    if(Object.hasOwn(synthetic131,'release_version'))synthetic131.release_version='1.3.131';
    const contract131=Object.fromEntries(contractFields.map(field=>[field,structuredClone(synthetic131[field])]));
    const declaration131=/^const RELEASE_131_CONTRACT = .*;$/m;
    assert.equal(readerSource.match(new RegExp(declaration131.source,'gm'))?.length,1);
    const official131=JSON.parse(readerSource.match(/^const RELEASE_131_CONTRACT = (.*);$/m)[1]);
    assert.equal(official131.sha256,"74c41cfd33d6250addbb73e55fee98eae43cf3f39591cfde2d055b4790c40cba");assert.equal(official131.size,504003682);assert.equal(official131.version_code,1713000883);
    function use131(mutate=()=>{}) {
      alias(signedPayload(p=>{Object.assign(p,structuredClone(synthetic131));mutate(p);}));
      state.binaries[134]=bytes('1.3.1');
    }
    function reader131Url(contract) {
      return moduleUrl(readerSource.replace(contractDeclaration,'const RELEASE_128_CONTRACT = '+JSON.stringify(syntheticContract)+';')
        .replace(/^const RELEASE_129_CONTRACT = .*;$/m,'const RELEASE_129_CONTRACT = '+JSON.stringify(contract129)+';')
        .replace(declaration130,'const RELEASE_130_CONTRACT = '+JSON.stringify(contract130)+';')
        .replace(declaration131,'const RELEASE_131_CONTRACT = '+JSON.stringify(contract)+';'));
    }
    async function boundReader131(contract) {return (await import(reader131Url(contract))).readMagirecoRelease;}
    use131();await unavailable('unbound production131 rejects even locally signed synthetic identity');
    await assert.rejects(()=>(boundReader131(null)).then(reader=>reader(env)));cases++;
    const read131=await boundReader131(contract131);
    const handlers131=await boundHandlers(reader131Url(contract131));
    for(const urls of [[root+canonicalName],exactDual]) {
      use131(p=>p.apk_urls=urls);
      const selected131=await read131(env);
      assert.equal(selected131.version,'1.3.1');assert.equal(selected131.sha256,synthetic131.sha256);
      assert.equal(selected131.size,synthetic131.size);assert.equal(selected131.asset.id,134);
      assert.equal(selected131.asset.name,'magireco-cn-1.3.1.apk');assert.equal(selected131.asset.url,base+'/releases/assets/134');
      const response=await handlers131.metadata({env});assert.equal(response.status,200);
      const current131=await response.json();assert.equal(current131.version,'1.3.1');assert.equal(current131.source,'current');
      assert.equal(current131.asset,undefined);assert.ok(!JSON.stringify(current131).includes(env.GITHUB_RELEASES_TOKEN));
      assert.equal(current131.download,'./downloads/magireco/android?sha256='+synthetic131.sha256);
      assert.equal(response.headers.get('cache-control'),'no-store');cases++;
      for(const [handler,method,headers,status] of [[handlers131.download,'GET',{},200],
        [handlers131.head,'HEAD',{},200],[handlers131.download,'GET',{Range:'bytes=0-1'},206]]) {
        calls=[];const served=await handler(context('?sha256='+current131.sha256,method,headers));assert.equal(served.status,status);
        assert.equal(served.headers.get('x-client-version'),'1.3.1');assert.equal(served.headers.get('cache-control'),'no-store');
        assert.ok(served.headers.get('content-disposition').includes('magireco-cn-1.3.1.apk'));
        if(method==='HEAD') {
          assert.equal(await served.text(),'');assert.equal(served.headers.get('content-length'),String(synthetic131.size));
          assert.equal(calls.length,2);assert.ok(!calls.some(call=>call.url.includes('/releases/assets/')));
        } else {
          assert.equal(await served.text(),(status===206?bytes('1.3.1').subarray(0,2):bytes('1.3.1')).toString());
          assert.ok(calls.some(call=>call.url===base+'/releases/assets/134'));
          if(status===206) {
            assert.equal(served.headers.get('content-range'),`bytes 0-1/${synthetic131.size}`);
            assert.equal(served.headers.get('content-length'),'2');
            assert.ok(calls.filter(call=>call.url.includes('/releases/assets/')||call.url.startsWith('https://objects.test/')).every(call=>call.range==='bytes=0-1'));
          }
        }
        assert.ok(!calls.some(call=>call.url===bridge+aliasName||call.url===bridge+canonicalName));cases++;
      }
      calls=[];assert.equal((await handlers131.download(context('?sha256='+'0'.repeat(64)))).status,409);
      assert.ok(!calls.some(call=>call.url.includes('/releases/assets/')));cases++;
      const rendered=renderContent('home','magireco-private-server',{magireco:{...current131,state:'ready'}});
      assert.ok(rendered.includes('客户端版本 1.3.1'));
      assert.ok(rendered.includes('magireco-legacy-client-1.3.1-corresponding-source.zip'));
      assert.equal((rendered.match(/>下载 APK<\/a>/g)||[]).length,1);
      const displayed131Notes=rendered.split('<h3>1.3.1 更新内容</h3><ul>')[1]?.split('</ul>')[0];
      assert.ok(displayed131Notes);assert.equal((displayed131Notes.match(/<li>/g)||[]).length,official131.release_notes.length);
      for(const note of official131.release_notes)assert.ok(displayed131Notes.includes(note));
      for(const hidden of ['客户端版本 1.3.131','magireco-legacy-client-1.3.131-corresponding-source.zip','1.3.0 更新内容','实际安装版本统一为 1.2.x'])assert.ok(!rendered.includes(hidden),hidden);
      cases++;
      for(const [select,version] of [[use130,'1.3.0'],[use129,'1.2.9'],[use128,'1.2.8']]) {
        select(p=>p.apk_urls=urls);assert.equal((await read131(env)).version,version);cases++;
      }
      alias(signedPayload(p=>p.apk_urls=urls));assert.equal((await read131(env)).version,'1.2.7');cases++;
    }
    use131(p=>p.corresponding_source.url=root+p.corresponding_source.asset);
    assert.equal((await read131(env)).version,'1.3.1');cases++;
    for(const [label,mutate] of Object.entries({
      'lower code':p=>{p.version_code--;p.compatibility_discovery.installed_version_code=p.version_code;},
      'higher code':p=>{p.version_code++;p.compatibility_discovery.installed_version_code=p.version_code;},
      'APK hash':p=>p.sha256='e'.repeat(64),'APK size':p=>p.size++,
      'GPL hash':p=>p.corresponding_source.sha256='e'.repeat(64),'GPL size':p=>p.corresponding_source.size++,
      'GPL alias name':p=>p.corresponding_source.asset='magireco-legacy-client-1.3.131-corresponding-source.zip',
      'source':p=>p.source_commit='e'.repeat(40),'notes':p=>p.release_notes.push('different'),
      'migration':p=>p.single_line_migration.minimum_code++,'display':p=>p.display_version='1.3.0',
      'mapping':p=>p.compatibility_discovery.discovery_version='1.3.130','raw131':p=>p.version='1.3.1',
      'unknown132':p=>p.version='1.3.132','release identity':p=>p.release_version='1.3.1',
      'relay only':p=>p.apk_urls=[bridge+aliasName],'fixed1111 bridge':p=>p.apk_urls=[root+canonicalName,bridge+canonicalName],
      'reversed routes':p=>p.apk_urls=[...exactDual].reverse(),
      'coherent future132':p=>{
        Object.assign(p,{version:'1.3.132',display_version:'1.3.2',version_code:1713000884,
          release_notes:['实际安装版本：1.3.2；1.3.132仅为旧版发现序号。合成测试，非发布。']});
        Object.assign(p.compatibility_discovery,{discovery_version:'1.3.132',installed_public_version:'1.3.2',installed_version_code:1713000884});
        Object.assign(p.single_line_migration,{minimum_version:'1.3.2',minimum_code:1713000884,
          legacy_discovery:{version:'1.3.132',display_version:'1.3.2'}});
        p.corresponding_source.asset='magireco-legacy-client-1.3.2-corresponding-source.zip';
        if(Object.hasOwn(p,'release_version'))p.release_version='1.3.132';
      },
    })) {use131(mutate);await assert.rejects(()=>read131(env),undefined,'131 '+label);cases++;}
    for(const [label,mutate] of Object.entries({
      'lower code':p=>p.version_code=1713000882,'higher code':p=>p.version_code=1713000884,
      'string code':p=>p.version_code='1713000883','extra field':p=>p.extra=true,
      'bad hash':p=>p.sha256=null,'bad size':p=>p.size=0,'bad source':p=>p.source_commit='invalid',
      'extra source field':p=>p.corresponding_source.extra=true,'missing source':p=>delete p.corresponding_source,
      'empty notes':p=>p.release_notes=[],'bad notes':p=>p.release_notes=[123],
      'migration source':p=>p.single_line_migration.from.sha256='e'.repeat(64),
      'migration mode':p=>p.single_line_migration.mode='other','migration line':p=>p.single_line_migration.to_line='1.3',
      'migration minimum':p=>p.single_line_migration.minimum_version='1.3.0',
    })) {
      const invalid=structuredClone(contract131);mutate(invalid);use131(p=>Object.assign(p,structuredClone(invalid)));
      await assert.rejects(()=>(boundReader131(invalid)).then(reader=>reader(env)),undefined,'131 invalid contract '+label);cases++;
    }
    for(const mutate of [()=>state.current.signed_update.signature='0'.repeat(768),()=>state.current.source_commit='e'.repeat(40),
      ()=>state.current.release_notes=['not signed'],()=>state.release.assets[0].digest='sha256:'+'e'.repeat(64),
      ()=>state.release.assets.pop(),()=>state.release.assets.at(-1).digest='sha256:'+'e'.repeat(64)]) {
      use131();mutate();await assert.rejects(()=>read131(env));
      assert.equal((await handlers131.metadata({env})).status,503);assert.equal((await handlers131.download(context())).status,503);cases++;
    }
    for(const version of ['1.3.1','1.3.01','1.3.2','1.3.131','1.3.132']) {
      reset(version);await assert.rejects(()=>read131(env),undefined,'raw131 version '+version);cases++;
      delete state.current.signed_update;await assert.rejects(()=>read131(env),undefined,'unsigned131 raw '+version);cases++;
    }
    reset('1.3.1');state.current.version_code=1713000883;
    state.current.signed_update.payload=JSON.stringify({...state.current,apk_urls:[root+canonicalName]});
    await assert.rejects(()=>read131(env),undefined,'raw131 exact code');cases++;
    delete state.current.signed_update;await assert.rejects(()=>read131(env),undefined,'unsigned raw131 exact code');cases++;
    use131();state.currentStatus=404;calls=[];
    assert.equal((await handlers131.download(context())).status,503);
    assert.ok(!calls.some(call=>call.url.includes('/releases/assets/')));cases++;
    console.log('PASS131 consumer-only: null rejects; isolated RSA-signed131 -> display1.3.1/code1713000883 accepts; API/GET/HEAD/Range/stale409; preserves130/129/128/127; raw/future132/tampered identities reject; fixed1111 never fallback; phase-specific131 notes verified');

    // Official132 staging: preserve isolated null-contract and synthetic-tamper rejection.
    const synthetic132=structuredClone(synthetic130);
    Object.assign(synthetic132,{version:'1.3.132',display_version:'1.3.2',version_code:1713000885,
      sha256:sha(bytes('1.3.2')),size:bytes('1.3.2').length,source_commit:'d'.repeat(40),
      corresponding_source:{asset:'magireco-legacy-client-1.3.2-corresponding-source.zip',sha256:'d'.repeat(64),size:132},
      release_notes:['实际安装版本：1.3.2；1.3.132仅为旧版发现序号。合成测试，非发布。']});
    Object.assign(synthetic132.compatibility_discovery,{discovery_version:'1.3.132',installed_public_version:'1.3.2',installed_version_code:1713000885});
    Object.assign(synthetic132.single_line_migration,{minimum_version:'1.3.2',minimum_code:1713000885,
      legacy_discovery:{version:'1.3.132',display_version:'1.3.2'}});
    if(Object.hasOwn(synthetic132,'release_version'))synthetic132.release_version='1.3.132';
    const contract132=Object.fromEntries(contractFields.map(field=>[field,structuredClone(synthetic132[field])]));
    const declaration132=/^const RELEASE_132_CONTRACT = .*;$/m;
    assert.equal(readerSource.match(new RegExp(declaration132.source,'gm'))?.length,1);
    const official132=JSON.parse(readerSource.match(/^const RELEASE_132_CONTRACT = (.*);$/m)[1]);
    assert.equal(official132.sha256,"8ac0722cda21a724e6d807a0564173a94cf375b6ada7fe48562aa8dd44187b32");assert.equal(official132.size,504141253);assert.equal(official132.version_code,1713000885);
    function use132(mutate=()=>{}) {
      alias(signedPayload(p=>{Object.assign(p,structuredClone(synthetic132));mutate(p);}));
      state.binaries[134]=bytes('1.3.2');
    }
    function reader132Url(contract) {
      return moduleUrl(readerSource.replace(contractDeclaration,'const RELEASE_128_CONTRACT = '+JSON.stringify(syntheticContract)+';')
        .replace(/^const RELEASE_129_CONTRACT = .*;$/m,'const RELEASE_129_CONTRACT = '+JSON.stringify(contract129)+';')
        .replace(declaration130,'const RELEASE_130_CONTRACT = '+JSON.stringify(contract130)+';')
        .replace(declaration131,'const RELEASE_131_CONTRACT = '+JSON.stringify(contract131)+';')
        .replace(declaration132,'const RELEASE_132_CONTRACT = '+JSON.stringify(contract)+';'));
    }
    async function boundReader132(contract) {return (await import(reader132Url(contract))).readMagirecoRelease;}
    use132();await unavailable('unbound production132 rejects even locally signed synthetic identity');
    await assert.rejects(()=>(boundReader132(null)).then(reader=>reader(env)));cases++;
    const read132=await boundReader132(contract132);
    const handlers132=await boundHandlers(reader132Url(contract132));
    for(const urls of [[root+canonicalName],exactDual]) {
      use132(p=>p.apk_urls=urls);
      const selected132=await read132(env);
      assert.equal(selected132.version,'1.3.2');assert.equal(selected132.sha256,synthetic132.sha256);
      assert.equal(selected132.size,synthetic132.size);assert.equal(selected132.asset.id,134);
      assert.equal(selected132.asset.name,'magireco-cn-1.3.2.apk');assert.equal(selected132.asset.url,base+'/releases/assets/134');
      const response=await handlers132.metadata({env});assert.equal(response.status,200);
      const current132=await response.json();assert.equal(current132.version,'1.3.2');assert.equal(current132.source,'current');
      assert.equal(current132.asset,undefined);assert.ok(!JSON.stringify(current132).includes(env.GITHUB_RELEASES_TOKEN));
      assert.equal(current132.download,'./downloads/magireco/android?sha256='+synthetic132.sha256);
      assert.equal(response.headers.get('cache-control'),'no-store');cases++;
      for(const [handler,method,headers,status] of [[handlers132.download,'GET',{},200],
        [handlers132.head,'HEAD',{},200],[handlers132.download,'GET',{Range:'bytes=0-1'},206]]) {
        calls=[];const served=await handler(context('?sha256='+current132.sha256,method,headers));assert.equal(served.status,status);
        assert.equal(served.headers.get('x-client-version'),'1.3.2');assert.equal(served.headers.get('cache-control'),'no-store');
        assert.ok(served.headers.get('content-disposition').includes('magireco-cn-1.3.2.apk'));
        if(method==='HEAD') {
          assert.equal(await served.text(),'');assert.equal(served.headers.get('content-length'),String(synthetic132.size));
          assert.equal(calls.length,2);assert.ok(!calls.some(call=>call.url.includes('/releases/assets/')));
        } else {
          assert.equal(await served.text(),(status===206?bytes('1.3.2').subarray(0,2):bytes('1.3.2')).toString());
          assert.ok(calls.some(call=>call.url===base+'/releases/assets/134'));
          if(status===206) {
            assert.equal(served.headers.get('content-range'),`bytes 0-1/${synthetic132.size}`);
            assert.equal(served.headers.get('content-length'),'2');
            assert.ok(calls.filter(call=>call.url.includes('/releases/assets/')||call.url.startsWith('https://objects.test/')).every(call=>call.range==='bytes=0-1'));
          }
        }
        assert.ok(!calls.some(call=>call.url===bridge+aliasName||call.url===bridge+canonicalName));cases++;
      }
      calls=[];assert.equal((await handlers132.download(context('?sha256='+'0'.repeat(64)))).status,409);
      assert.ok(!calls.some(call=>call.url.includes('/releases/assets/')));cases++;
      const rendered=renderContent('home','magireco-private-server',{magireco:{...current132,state:'ready'}});
      assert.ok(rendered.includes('客户端版本 1.3.2'));
      assert.ok(rendered.includes('magireco-legacy-client-1.3.2-corresponding-source.zip'));
      assert.equal((rendered.match(/>下载 APK<\/a>/g)||[]).length,1);
      const displayed132Notes=rendered.split('<h3>1.3.2 更新内容</h3><ul>')[1]?.split('</ul>')[0];
      assert.ok(displayed132Notes);assert.equal((displayed132Notes.match(/<li>/g)||[]).length,official132.release_notes.length);
      for(const note of official132.release_notes)assert.ok(displayed132Notes.includes(note));
      for(const hidden of ['客户端版本 1.3.132','magireco-legacy-client-1.3.132-corresponding-source.zip','1.3.0 更新内容','实际安装版本统一为 1.2.x'])assert.ok(!rendered.includes(hidden),hidden);
      cases++;
      for(const [select,version] of [[use131,'1.3.1'],[use130,'1.3.0'],[use129,'1.2.9'],[use128,'1.2.8']]) {
        select(p=>p.apk_urls=urls);assert.equal((await read132(env)).version,version);cases++;
      }
      alias(signedPayload(p=>p.apk_urls=urls));assert.equal((await read132(env)).version,'1.2.7');cases++;
    }
    use132(p=>p.corresponding_source.url=root+p.corresponding_source.asset);
    assert.equal((await read132(env)).version,'1.3.2');cases++;
    for(const [label,mutate] of Object.entries({
      'lower code':p=>{p.version_code--;p.compatibility_discovery.installed_version_code=p.version_code;},
      'higher code':p=>{p.version_code++;p.compatibility_discovery.installed_version_code=p.version_code;},
      'APK hash':p=>p.sha256='e'.repeat(64),'APK size':p=>p.size++,
      'GPL hash':p=>p.corresponding_source.sha256='e'.repeat(64),'GPL size':p=>p.corresponding_source.size++,
      'GPL alias name':p=>p.corresponding_source.asset='magireco-legacy-client-1.3.132-corresponding-source.zip',
      'source':p=>p.source_commit='e'.repeat(40),'notes':p=>p.release_notes.push('different'),
      'migration':p=>p.single_line_migration.minimum_code++,'display':p=>p.display_version='1.3.0',
      'mapping':p=>p.compatibility_discovery.discovery_version='1.3.130','raw132':p=>p.version='1.3.2',
      'unknown133':p=>p.version='1.3.133','release identity':p=>p.release_version='1.3.2',
      'relay only':p=>p.apk_urls=[bridge+aliasName],'fixed1111 bridge':p=>p.apk_urls=[root+canonicalName,bridge+canonicalName],
      'reversed routes':p=>p.apk_urls=[...exactDual].reverse(),
      'coherent future133':p=>{
        Object.assign(p,{version:'1.3.133',display_version:'1.3.3',version_code:1713000886,
          release_notes:['实际安装版本：1.3.3；1.3.133仅为旧版发现序号。合成测试，非发布。']});
        Object.assign(p.compatibility_discovery,{discovery_version:'1.3.133',installed_public_version:'1.3.3',installed_version_code:1713000886});
        Object.assign(p.single_line_migration,{minimum_version:'1.3.3',minimum_code:1713000886,
          legacy_discovery:{version:'1.3.133',display_version:'1.3.3'}});
        p.corresponding_source.asset='magireco-legacy-client-1.3.3-corresponding-source.zip';
        if(Object.hasOwn(p,'release_version'))p.release_version='1.3.133';
      },
    })) {use132(mutate);await assert.rejects(()=>read132(env),undefined,'132 '+label);cases++;}
    for(const [label,mutate] of Object.entries({
      'lower code':p=>p.version_code=1713000882,'higher code':p=>p.version_code=1713000886,
      'string code':p=>p.version_code='1713000885','extra field':p=>p.extra=true,
      'bad hash':p=>p.sha256=null,'bad size':p=>p.size=0,'bad source':p=>p.source_commit='invalid',
      'extra source field':p=>p.corresponding_source.extra=true,'missing source':p=>delete p.corresponding_source,
      'empty notes':p=>p.release_notes=[],'bad notes':p=>p.release_notes=[123],
      'migration source':p=>p.single_line_migration.from.sha256='e'.repeat(64),
      'migration mode':p=>p.single_line_migration.mode='other','migration line':p=>p.single_line_migration.to_line='1.3',
      'migration minimum':p=>p.single_line_migration.minimum_version='1.3.0',
    })) {
      const invalid=structuredClone(contract132);mutate(invalid);use132(p=>Object.assign(p,structuredClone(invalid)));
      await assert.rejects(()=>(boundReader132(invalid)).then(reader=>reader(env)),undefined,'132 invalid contract '+label);cases++;
    }
    for(const mutate of [()=>state.current.signed_update.signature='0'.repeat(768),()=>state.current.source_commit='e'.repeat(40),
      ()=>state.current.release_notes=['not signed'],()=>state.release.assets[0].digest='sha256:'+'e'.repeat(64),
      ()=>state.release.assets.pop(),()=>state.release.assets.at(-1).digest='sha256:'+'e'.repeat(64)]) {
      use132();mutate();await assert.rejects(()=>read132(env));
      assert.equal((await handlers132.metadata({env})).status,503);assert.equal((await handlers132.download(context())).status,503);cases++;
    }
    for(const version of ['1.3.2','1.3.01','1.3.3','1.3.132','1.3.133']) {
      reset(version);await assert.rejects(()=>read132(env),undefined,'raw132 version '+version);cases++;
      delete state.current.signed_update;await assert.rejects(()=>read132(env),undefined,'unsigned132 raw '+version);cases++;
    }
    reset('1.3.2');state.current.version_code=1713000885;
    state.current.signed_update.payload=JSON.stringify({...state.current,apk_urls:[root+canonicalName]});
    await assert.rejects(()=>read132(env),undefined,'raw132 exact code');cases++;
    delete state.current.signed_update;await assert.rejects(()=>read132(env),undefined,'unsigned raw132 exact code');cases++;
    use132();state.currentStatus=404;calls=[];
    assert.equal((await handlers132.download(context())).status,503);
    assert.ok(!calls.some(call=>call.url.includes('/releases/assets/')));cases++;
    console.log('PASS132 consumer-only: null rejects; isolated RSA-signed132 -> display1.3.2/code1713000885 accepts; API/GET/HEAD/Range/stale409; preserves130/129/128/127; raw/future133/tampered identities reject; fixed1111 never fallback; no132 announcement before activation');

    // Official133 staging: preserve isolated null-contract and synthetic-tamper rejection.
    const synthetic133=structuredClone(synthetic130);
    Object.assign(synthetic133,{version:'1.3.133',display_version:'1.3.3',version_code:1713000887,
      sha256:sha(bytes('1.3.3')),size:bytes('1.3.3').length,source_commit:'d'.repeat(40),
      corresponding_source:{asset:'magireco-legacy-client-1.3.3-corresponding-source.zip',sha256:'d'.repeat(64),size:133},
      release_notes:['实际安装版本：1.3.3；1.3.133仅为旧版发现序号。合成测试，非发布。']});
    Object.assign(synthetic133.compatibility_discovery,{discovery_version:'1.3.133',installed_public_version:'1.3.3',installed_version_code:1713000887});
    Object.assign(synthetic133.single_line_migration,{minimum_version:'1.3.3',minimum_code:1713000887,
      legacy_discovery:{version:'1.3.133',display_version:'1.3.3'}});
    if(Object.hasOwn(synthetic133,'release_version'))synthetic133.release_version='1.3.133';
    const contract133=Object.fromEntries(contractFields.map(field=>[field,structuredClone(synthetic133[field])]));
    const declaration133=/^const RELEASE_133_CONTRACT = .*;$/m;
    assert.equal(readerSource.match(new RegExp(declaration133.source,'gm'))?.length,1);
    const official133=JSON.parse(readerSource.match(/^const RELEASE_133_CONTRACT = (.*);$/m)[1]);
    assert.equal(official133.sha256,"1c31f585791ee343b9242eddeb168b0962fea7af28fc1ac8a0e0f614e962803a");assert.equal(official133.size,619311116);assert.equal(official133.version_code,1713000887);
    function use133(mutate=()=>{}) {
      alias(signedPayload(p=>{Object.assign(p,structuredClone(synthetic133));mutate(p);}));
      state.binaries[134]=bytes('1.3.3');
    }
    function reader133Url(contract) {
      return moduleUrl(readerSource.replace(contractDeclaration,'const RELEASE_128_CONTRACT = '+JSON.stringify(syntheticContract)+';')
        .replace(/^const RELEASE_129_CONTRACT = .*;$/m,'const RELEASE_129_CONTRACT = '+JSON.stringify(contract129)+';')
        .replace(declaration130,'const RELEASE_130_CONTRACT = '+JSON.stringify(contract130)+';')
        .replace(declaration131,'const RELEASE_131_CONTRACT = '+JSON.stringify(contract131)+';')
        .replace(declaration132,'const RELEASE_132_CONTRACT = '+JSON.stringify(contract132)+';')
        .replace(declaration133,'const RELEASE_133_CONTRACT = '+JSON.stringify(contract)+';'));
    }
    async function boundReader133(contract) {return (await import(reader133Url(contract))).readMagirecoRelease;}
    use133();await unavailable('unbound production133 rejects even locally signed synthetic identity');
    await assert.rejects(()=>(boundReader133(null)).then(reader=>reader(env)));cases++;
    const read133=await boundReader133(contract133);
    const handlers133=await boundHandlers(reader133Url(contract133));
    for(const urls of [[root+canonicalName],exactDual]) {
      use133(p=>p.apk_urls=urls);
      const selected133=await read133(env);
      assert.equal(selected133.version,'1.3.3');assert.equal(selected133.sha256,synthetic133.sha256);
      assert.equal(selected133.size,synthetic133.size);assert.equal(selected133.asset.id,134);
      assert.equal(selected133.asset.name,'magireco-cn-1.3.3.apk');assert.equal(selected133.asset.url,base+'/releases/assets/134');
      const response=await handlers133.metadata({env});assert.equal(response.status,200);
      const current133=await response.json();assert.equal(current133.version,'1.3.3');assert.equal(current133.source,'current');
      assert.equal(current133.asset,undefined);assert.ok(!JSON.stringify(current133).includes(env.GITHUB_RELEASES_TOKEN));
      assert.equal(current133.download,'./downloads/magireco/android?sha256='+synthetic133.sha256);
      assert.equal(response.headers.get('cache-control'),'no-store');cases++;
      for(const [handler,method,headers,status] of [[handlers133.download,'GET',{},200],
        [handlers133.head,'HEAD',{},200],[handlers133.download,'GET',{Range:'bytes=0-1'},206]]) {
        calls=[];const served=await handler(context('?sha256='+current133.sha256,method,headers));assert.equal(served.status,status);
        assert.equal(served.headers.get('x-client-version'),'1.3.3');assert.equal(served.headers.get('cache-control'),'no-store');
        assert.ok(served.headers.get('content-disposition').includes('magireco-cn-1.3.3.apk'));
        if(method==='HEAD') {
          assert.equal(await served.text(),'');assert.equal(served.headers.get('content-length'),String(synthetic133.size));
          assert.equal(calls.length,2);assert.ok(!calls.some(call=>call.url.includes('/releases/assets/')));
        } else {
          assert.equal(await served.text(),(status===206?bytes('1.3.3').subarray(0,2):bytes('1.3.3')).toString());
          assert.ok(calls.some(call=>call.url===base+'/releases/assets/134'));
          if(status===206) {
            assert.equal(served.headers.get('content-range'),`bytes 0-1/${synthetic133.size}`);
            assert.equal(served.headers.get('content-length'),'2');
            assert.ok(calls.filter(call=>call.url.includes('/releases/assets/')||call.url.startsWith('https://objects.test/')).every(call=>call.range==='bytes=0-1'));
          }
        }
        assert.ok(!calls.some(call=>call.url===bridge+aliasName||call.url===bridge+canonicalName));cases++;
      }
      calls=[];assert.equal((await handlers133.download(context('?sha256='+'0'.repeat(64)))).status,409);
      assert.ok(!calls.some(call=>call.url.includes('/releases/assets/')));cases++;
      const rendered=renderContent('home','magireco-private-server',{magireco:{...current133,state:'ready'}});
      assert.ok(rendered.includes('客户端版本 1.3.3'));
      assert.ok(rendered.includes('magireco-legacy-client-1.3.3-corresponding-source.zip'));
      assert.equal((rendered.match(/>下载 APK<\/a>/g)||[]).length,1);
      for(const hidden of ['1.3.3 更新内容','客户端版本 1.3.133','magireco-legacy-client-1.3.133-corresponding-source.zip','1.3.0 更新内容','实际安装版本统一为 1.2.x'])assert.ok(!rendered.includes(hidden),hidden);
      cases++;
      for(const [select,version] of [[use132,'1.3.2'],[use131,'1.3.1'],[use130,'1.3.0'],[use129,'1.2.9'],[use128,'1.2.8']]) {
        select(p=>p.apk_urls=urls);assert.equal((await read133(env)).version,version);cases++;
      }
      alias(signedPayload(p=>p.apk_urls=urls));assert.equal((await read133(env)).version,'1.2.7');cases++;
    }
    use133(p=>p.corresponding_source.url=root+p.corresponding_source.asset);
    assert.equal((await read133(env)).version,'1.3.3');cases++;
    for(const [label,mutate] of Object.entries({
      'lower code':p=>{p.version_code--;p.compatibility_discovery.installed_version_code=p.version_code;},
      'higher code':p=>{p.version_code++;p.compatibility_discovery.installed_version_code=p.version_code;},
      'APK hash':p=>p.sha256='e'.repeat(64),'APK size':p=>p.size++,
      'GPL hash':p=>p.corresponding_source.sha256='e'.repeat(64),'GPL size':p=>p.corresponding_source.size++,
      'GPL alias name':p=>p.corresponding_source.asset='magireco-legacy-client-1.3.133-corresponding-source.zip',
      'source':p=>p.source_commit='e'.repeat(40),'notes':p=>p.release_notes.push('different'),
      'migration':p=>p.single_line_migration.minimum_code++,'display':p=>p.display_version='1.3.0',
      'mapping':p=>p.compatibility_discovery.discovery_version='1.3.130','raw133':p=>p.version='1.3.3',
      'unknown133':p=>p.version='1.3.134','release identity':p=>p.release_version='1.3.3',
      'relay only':p=>p.apk_urls=[bridge+aliasName],'fixed1111 bridge':p=>p.apk_urls=[root+canonicalName,bridge+canonicalName],
      'reversed routes':p=>p.apk_urls=[...exactDual].reverse(),
      'coherent future133':p=>{
        Object.assign(p,{version:'1.3.134',display_version:'1.3.4',version_code:1713000888,
          release_notes:['实际安装版本：1.3.4；1.3.134仅为旧版发现序号。合成测试，非发布。']});
        Object.assign(p.compatibility_discovery,{discovery_version:'1.3.134',installed_public_version:'1.3.4',installed_version_code:1713000888});
        Object.assign(p.single_line_migration,{minimum_version:'1.3.4',minimum_code:1713000888,
          legacy_discovery:{version:'1.3.134',display_version:'1.3.4'}});
        p.corresponding_source.asset='magireco-legacy-client-1.3.4-corresponding-source.zip';
        if(Object.hasOwn(p,'release_version'))p.release_version='1.3.134';
      },
    })) {use133(mutate);await assert.rejects(()=>read133(env),undefined,'133 '+label);cases++;}
    for(const [label,mutate] of Object.entries({
      'lower code':p=>p.version_code=1713000882,'higher code':p=>p.version_code=1713000888,
      'string code':p=>p.version_code='1713000887','extra field':p=>p.extra=true,
      'bad hash':p=>p.sha256=null,'bad size':p=>p.size=0,'bad source':p=>p.source_commit='invalid',
      'extra source field':p=>p.corresponding_source.extra=true,'missing source':p=>delete p.corresponding_source,
      'empty notes':p=>p.release_notes=[],'bad notes':p=>p.release_notes=[123],
      'migration source':p=>p.single_line_migration.from.sha256='e'.repeat(64),
      'migration mode':p=>p.single_line_migration.mode='other','migration line':p=>p.single_line_migration.to_line='1.3',
      'migration minimum':p=>p.single_line_migration.minimum_version='1.3.0',
    })) {
      const invalid=structuredClone(contract133);mutate(invalid);use133(p=>Object.assign(p,structuredClone(invalid)));
      await assert.rejects(()=>(boundReader133(invalid)).then(reader=>reader(env)),undefined,'133 invalid contract '+label);cases++;
    }
    for(const mutate of [()=>state.current.signed_update.signature='0'.repeat(768),()=>state.current.source_commit='e'.repeat(40),
      ()=>state.current.release_notes=['not signed'],()=>state.release.assets[0].digest='sha256:'+'e'.repeat(64),
      ()=>state.release.assets.pop(),()=>state.release.assets.at(-1).digest='sha256:'+'e'.repeat(64)]) {
      use133();mutate();await assert.rejects(()=>read133(env));
      assert.equal((await handlers133.metadata({env})).status,503);assert.equal((await handlers133.download(context())).status,503);cases++;
    }
    for(const version of ['1.3.3','1.3.01','1.3.4','1.3.133','1.3.134']) {
      reset(version);await assert.rejects(()=>read133(env),undefined,'raw133 version '+version);cases++;
      delete state.current.signed_update;await assert.rejects(()=>read133(env),undefined,'unsigned133 raw '+version);cases++;
    }
    reset('1.3.3');state.current.version_code=1713000887;
    state.current.signed_update.payload=JSON.stringify({...state.current,apk_urls:[root+canonicalName]});
    await assert.rejects(()=>read133(env),undefined,'raw133 exact code');cases++;
    delete state.current.signed_update;await assert.rejects(()=>read133(env),undefined,'unsigned raw133 exact code');cases++;
    use133();state.currentStatus=404;calls=[];
    assert.equal((await handlers133.download(context())).status,503);
    assert.ok(!calls.some(call=>call.url.includes('/releases/assets/')));cases++;
    console.log('PASS133 consumer-only: null rejects; isolated RSA-signed133 -> display1.3.3/code1713000887 accepts; API/GET/HEAD/Range/stale409; preserves130/129/128/127; raw/future133/tampered identities reject; fixed1111 never fallback; no133 announcement before activation');

    console.log('PASS128 support: unbound and synthetic production identities rejected; isolated frozen fixture accepts128 while preserving127; identity/migration/routes/raw bypasses rejected');
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
  assert.ok(!release127.includes('1.2.8 更新内容'));
  assert.ok(!release127.includes('1.2.9 更新内容'));
  assert.ok(release127.includes('不要卸载或清除数据'));
  assert.ok(release127.includes(root+'magireco-legacy-client-1.2.7-corresponding-source.zip'));
  assert.equal((release127.match(/>下载 APK<\/a>/g)||[]).length,1);
  for(const state of ['loading','error']) {
    const pending=renderContent('home','magireco-private-server',{magireco:{state}});
    assert.ok(!pending.includes('误报已是最新版'));
    assert.ok(!pending.includes('1.2.7 更新内容'));
    assert.ok(!pending.includes('1.2.8 更新内容'));
    assert.ok(!pending.includes('1.2.9 更新内容'));
    assert.ok(!pending.includes('1.3.0 更新内容'));
    assert.ok(!pending.includes('客户端版本 1.3.0'));
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
