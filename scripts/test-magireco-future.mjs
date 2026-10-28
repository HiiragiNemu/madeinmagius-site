import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { readMagirecoRelease, selectMagirecoRelease } from '../lib/magireco-release.js';
import { createMagirecoSnapshot } from './update-magireco-snapshot.mjs';
import { prepareSnapshotUpdate } from './sync-magireco-release.mjs';
import { loadMagirecoReleaseData } from '../assets/magireco-loader.js';
import { onRequestGet as metadata } from '../functions/api/magireco.js';

const root = 'https://github.com/HiiragiNemu/ProgettoMagius-1/releases/download/latest/';
const repo = 'https://api.github.com/repos/HiiragiNemu/ProgettoMagius-1';
const metadataUrl = 'https://magireco-personal-release.pages.dev/magireco-current-legacy-client.version.json';
const currentName = 'magireco-current-legacy-client.apk';
const currentUrl = root + currentName;
const domain = 'MAGIACN-APK-UPDATE-V1\n';
const originalFetch = globalThis.fetch;
const subtle = crypto.subtle;
const originalImport = subtle.importKey.bind(subtle);
const fixture138 = JSON.parse(await readFile(new URL('./fixtures/magireco-discovery138.json', import.meta.url)));
const originalPayload = JSON.parse(fixture138.signed_update.payload);
const readerSource = await readFile(new URL('../lib/magireco-release.js', import.meta.url), 'utf8');
const productionModulus = readerSource.match(/^const UPDATE_KEY = .*?n:"([^"]+)"/m)?.[1];
assert.ok(productionModulus);
const pair = generateKeyPairSync('rsa', { modulusLength:3072 });
const sha256 = value => createHash('sha256').update(value).digest('hex');
let verifyingKey;

before(async () => {
  verifyingKey = await originalImport('jwk', pair.publicKey.export({format:'jwk'}),
    {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'}, false, ['verify']);
  // Only this isolated test process substitutes the imported test key. The
  // production module has no key argument/environment override; verify is real.
  subtle.importKey = async (format, jwk, algorithm, extractable, usages) => {
    assert.equal(format, 'jwk');
    assert.equal(jwk.n, productionModulus);
    assert.equal(jwk.e, 'AQAB');
    assert.deepEqual(algorithm, {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'});
    assert.equal(extractable, false);
    assert.deepEqual(usages, ['verify']);
    return verifyingKey;
  };
  globalThis.fetch = async () => { throw new Error('Unexpected network request in future-release test'); };
});

after(() => {
  subtle.importKey = originalImport;
  globalThis.fetch = originalFetch;
});

function envelope(payload, signingDomain = domain) {
  const text = JSON.stringify(payload);
  return {schema:1,key_id:'release-manifest-v1',payload:text,
    signature:sign('sha256', Buffer.from(signingDomain + text), pair.privateKey).toString('hex')};
}

function clientFrom(payload) {
  return {...structuredClone(payload), apk:currentName, apk_url:currentUrl, signed_update:envelope(payload)};
}

function fixture(version = '1.4.0', code = 1713000898, direct = false) {
  const payload = structuredClone(originalPayload);
  for (const key of ['note','update_history','source_inputs']) delete payload[key];
  const apkBytes = Buffer.from('Synthetic future APK ' + version);
  const sourceBytes = Buffer.from('Synthetic corresponding source ' + version);
  Object.assign(payload, {version:direct ? version : '1.3.' + (code - 1713000757),
    display_version:version, version_code:code, size:apkBytes.length, sha256:sha256(apkBytes),
    source_commit:'a'.repeat(40), apk_urls:[currentUrl],
    release_notes:['实际安装版本：' + version + '；仅用于本地签名测试。'],
    corresponding_source:{asset:'magireco-legacy-client-' + version + '-corresponding-source.zip',
      size:sourceBytes.length, sha256:sha256(sourceBytes)}});
  payload.corresponding_source.url = root + payload.corresponding_source.asset;
  Object.assign(payload.compatibility_discovery, {discovery_version:payload.version,
    installed_public_version:version, installed_version_code:code});
  Object.assign(payload.single_line_migration, {minimum_version:version, minimum_code:code,
    legacy_discovery:{version:payload.version, display_version:version}});
  const release = {draft:false, prerelease:false, assets:[
    {id:9001,name:'magireco-legacy-client-' + version + '.apk',state:'uploaded',size:payload.size,digest:'sha256:' + payload.sha256},
    {id:9002,name:payload.corresponding_source.asset,state:'uploaded',size:sourceBytes.length,digest:'sha256:' + sha256(sourceBytes)},
    {id:1111,name:'magireco-latest-legacy-client.apk',state:'uploaded',size:3,digest:'sha256:' + 'b'.repeat(64)},
    {id:138,name:'magireco-legacy-client-1.3.8.apk',state:'uploaded',size:3,digest:'sha256:' + 'c'.repeat(64)},
  ]};
  return {payload,client:clientFrom(payload),release};
}

for (const [version, code] of [['1.3.9',1713000896],['1.3.10',1713000897],['1.4.0',1713000898],['2.0.0',1713000899]]) {
  test('real RSA future release selects exact APK/source: ' + version, async () => {
    const f = fixture(version, code);
    const result = await selectMagirecoRelease(f.client, f.release);
    assert.equal(result.version, version);
    assert.equal(result.version_code, code);
    const snapshot = await createMagirecoSnapshot(f.client, f.release);
    assert.equal(snapshot.version, version); assert.equal(snapshot.version_code, code);
    const display = await loadMagirecoReleaseData({liveUrl:'https://fixture.invalid/api',fetcher:async url => url.startsWith('./data/') ? Response.json(snapshot) : new Response('unavailable',{status:503})});
    assert.equal(display.download, root+'magireco-legacy-client-'+version+'.apk');
    const prior = fixture('1.3.9',1713000896);
    const synced = await prepareSnapshotUpdate({client:f.client,release:f.release},prior.client);
    assert.deepEqual(JSON.parse(synced.snapshot),snapshot);
    assert.equal(result.sha256, f.payload.sha256);
    assert.equal(result.size, f.payload.size);
    assert.equal(result.asset.id, 9001);
    assert.equal(result.asset.url, repo + '/releases/assets/9001');
    assert.equal(result.asset.name, 'magireco-cn-' + version + '.apk');
    assert.equal(result.download, './downloads/magireco/android?sha256=' + f.payload.sha256);
  });
}

test('direct signed future version needs no legacy discovery alias or migration', async () => {
  const f = fixture('2.0.0',1713000900,true);
  for (const field of ['display_version','compatibility_discovery','single_line_migration']) delete f.payload[field];
  const selected = await selectMagirecoRelease(clientFrom(f.payload), f.release);
  assert.equal(selected.version, '2.0.0');
  assert.equal(selected.version_code, 1713000900);
});

test('network reader and API expose authenticated future code without exposing token or asset', async () => {
  const f = fixture();
  const offline = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push(url);
    if (url === metadataUrl) return Response.json(f.client);
    assert.equal(url, repo + '/releases/tags/latest');
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    return Response.json(f.release);
  };
  try {
    const result = await readMagirecoRelease({GITHUB_RELEASES_TOKEN:'test-token'});
    assert.equal(result.version_code, f.payload.version_code);
    const response = await metadata({env:{GITHUB_RELEASES_TOKEN:'test-token'}});
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.version, '1.4.0');
    assert.equal(body.version_code, f.payload.version_code);
    assert.equal(body.asset, undefined);
    assert.ok(!JSON.stringify(body).includes('test-token'));
    assert.deepEqual(calls, [metadataUrl,repo + '/releases/tags/latest',metadataUrl,repo + '/releases/tags/latest']);
  } finally { globalThis.fetch = offline; }
});

for (const [label, mutate] of Object.entries({
  'publisher':p => p.publisher = 'OtherPublisher',
  'channel':p => p.channel = 'organization',
  'package':p => p.package_name = 'other.package',
  'release cert':p => p.release_cert_sha256 = 'd'.repeat(64),
  'legacy cert':p => p.legacy_cert_sha256 = 'd'.repeat(64),
  'invalid source commit':p => p.source_commit = 'not-a-commit',
  'code at legacy floor':p => p.version_code = 1713000895,
  'code regression':p => p.version_code = 1713000894,
  'code integer overflow':p => p.version_code = 2147483648,
  'code string':p => p.version_code = '1713000898',
  'code fraction':p => p.version_code = 1713000898.5,
  'APK hash':p => p.sha256 = 'd'.repeat(64),
  'APK size':p => p.size++,
  'APK empty':p => p.size = 0,
  'APK too large':p => p.size = 1073741825,
  'source hash':p => p.corresponding_source.sha256 = 'd'.repeat(64),
  'source size':p => p.corresponding_source.size++,
  'source wrong name':p => p.corresponding_source.asset = 'other-source.zip',
  'source wrong URL':p => p.corresponding_source.url = 'https://example.test/source.zip',
  'source absent':p => delete p.corresponding_source,
  'arbitrary APK host':p => p.apk_urls = ['https://example.test/app.apk'],
  'relay route':p => p.apk_urls = ['https://magireco-personal-release.pages.dev/' + currentName],
  'bridge route':p => p.apk_urls = [root + 'magireco-latest-legacy-client.apk'],
  'fixed route rather than approved current':p => p.apk_urls = [root + 'magireco-legacy-client-1.4.0.apk'],
  'duplicate routes':p => p.apk_urls = [currentUrl,currentUrl],
  'mapping missing for alias':p => delete p.compatibility_discovery,
  'mapping public version':p => p.compatibility_discovery.installed_public_version = '1.3.8',
  'mapping code':p => p.compatibility_discovery.installed_version_code++,
  'mapping alias':p => p.compatibility_discovery.discovery_version = '2.0.0',
  'mapping two APKs':p => p.compatibility_discovery.same_published_apk = false,
  'mapping separate client':p => p.compatibility_discovery.separate_client_release = true,
  'migration minimum':p => p.single_line_migration.minimum_version = '1.3.8',
  'migration code':p => p.single_line_migration.minimum_code++,
  'migration alias':p => p.single_line_migration.legacy_discovery.version = '2.0.0',
  'migration anchor':p => p.single_line_migration.from.sha256 = 'e'.repeat(64),
  'legacy bridge field':p => p.upgrade_bridge = {},
  'release identity override':p => p.release_version = p.display_version,
  'empty notes':p => p.release_notes = [],
  'old display':p => p.display_version = '1.3.8',
  'two-part display':p => p.display_version = '2.0',
  'leading zero display':p => p.display_version = '01.4.0',
  'unsafe numeric display':p => p.display_version = '9007199254740992.0.0',
  'path in display':p => p.display_version = '../2.0.0',
  'noncanonical discovery':p => p.version = '1.03.141',
})) {
  test('future signed invalid identity rejected: ' + label, async () => {
    const f = fixture(); mutate(f.payload);
    await assert.rejects(() => selectMagirecoRelease(clientFrom(f.payload), f.release));
  });
}

for (const [label, mutate] of Object.entries({
  'bad signature':c => c.signed_update.signature = '0'.repeat(768),
  'no signature':c => delete c.signed_update,
  'unsigned public version':c => c.display_version = '2.0.0',
  'unsigned discovery':c => c.version = '2.0.0',
  'unsigned code':c => c.version_code++,
  'unsigned hash':c => c.sha256 = 'e'.repeat(64),
  'unsigned publisher':c => c.publisher = 'OtherPublisher',
  'unsigned source':c => c.corresponding_source.sha256 = 'e'.repeat(64),
  'unsigned mapping':c => c.compatibility_discovery.installed_version_code++,
  'unsigned migration':c => c.single_line_migration.minimum_code++,
  'unsigned notes':c => c.release_notes = ['not signed'],
  'unsigned release identity':c => c.release_version = c.version,
  'outer APK alias':c => c.apk = 'magireco-latest-legacy-client.apk',
  'outer URL':c => c.apk_url = 'https://example.test/app.apk',
})) {
  test('future unsigned mutation rejected: ' + label, async () => {
    const f = fixture(); mutate(f.client);
    await assert.rejects(() => selectMagirecoRelease(f.client, f.release));
  });
}

for (const [label, mutate] of Object.entries({
  'missing APK even with bridge':r => r.assets.shift(),
  'duplicate APK':r => r.assets.push(structuredClone(r.assets[0])),
  'APK wrong digest':r => r.assets[0].digest = 'sha256:' + 'e'.repeat(64),
  'APK wrong size':r => r.assets[0].size++,
  'APK pending':r => r.assets[0].state = 'new',
  'APK missing id':r => delete r.assets[0].id,
  'missing GPL':r => r.assets.splice(1,1),
  'duplicate GPL':r => r.assets.push(structuredClone(r.assets[1])),
  'GPL wrong digest':r => r.assets[1].digest = 'sha256:' + 'e'.repeat(64),
  'GPL wrong size':r => r.assets[1].size++,
  'GPL pending':r => r.assets[1].state = 'new',
  'GPL missing id':r => delete r.assets[1].id,
  'draft':r => r.draft = true,
  'prerelease':r => r.prerelease = true,
})) {
  test('future fixed-asset publication rejected: ' + label, async () => {
    const f = fixture(); mutate(f.release);
    await assert.rejects(() => selectMagirecoRelease(f.client, f.release));
  });
}

test('future signature domain is not interchangeable', async () => {
  const f = fixture(); f.client.signed_update = envelope(f.payload, 'WRONG-DOMAIN\n');
  await assert.rejects(() => selectMagirecoRelease(f.client, f.release));
});

test('actual signed 138 still selects through the frozen historical path', async () => {
  const previous = subtle.importKey;
  subtle.importKey = originalImport;
  try {
    const release = {draft:false,prerelease:false,assets:[
      {id:138,name:'magireco-legacy-client-1.3.8.apk',state:'uploaded',size:fixture138.size,digest:'sha256:' + fixture138.sha256},
      {id:139,name:fixture138.corresponding_source.asset,state:'uploaded',size:fixture138.corresponding_source.size,digest:'sha256:' + fixture138.corresponding_source.sha256},
    ]};
    const result = await selectMagirecoRelease(fixture138, release);
    assert.equal(result.version, '1.3.8');
    assert.equal(result.version_code, 1713000895);
    assert.equal(result.asset.id, 138);
  } finally { subtle.importKey = previous; }
});
