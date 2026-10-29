import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const baseline = process.argv.indexOf('--baseline-module');
const moduleUrl = baseline >= 0 ? pathToFileURL(process.argv[baseline + 1]) : new URL('../lib/magireco-release.js', import.meta.url);
const { selectMagirecoRelease } = await import(moduleUrl);
const sourceRequired = process.argv.includes('--expect-source-required');
const clients = [
  JSON.parse(await readFile(new URL('../data/magireco-release.signed.json', import.meta.url))),
  JSON.parse(await readFile(new URL('./fixtures/magireco-discovery138.json', import.meta.url))),
];
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('Unexpected network request'); };
process.on('exit', () => { globalThis.fetch = originalFetch; });

for (const original of clients) {
  const version = original.compatibility_discovery.installed_public_version;
  function fixture() {
    const client = structuredClone(original);
    const source = client.corresponding_source;
    const release = {draft:false,prerelease:false,assets:[
      {id:9101,name:'magireco-legacy-client-' + version + '.apk',state:'uploaded',size:client.size,digest:'sha256:' + client.sha256},
      {id:9102,name:source.asset,state:'uploaded',size:source.size,digest:'sha256:' + source.sha256},
    ]};
    return {client,release};
  }
  test('production signature and APK identity retained: ' + version, async () => {
    const f = fixture();
    const selected = await selectMagirecoRelease(f.client, f.release);
    assert.equal(selected.version, version);
    assert.equal(selected.sha256, original.sha256);
    assert.equal(selected.size, original.size);
  });
  test('source withdrawal changes no selected APK fields: ' + version, async () => {
    const f = fixture();
    const before = await selectMagirecoRelease(f.client, f.release);
    f.release.assets.pop();
    if (sourceRequired) await assert.rejects(() => selectMagirecoRelease(f.client, f.release));
    else assert.deepEqual(await selectMagirecoRelease(f.client, f.release), before);
  });
  for (const [label,mutate] of Object.entries({
    'duplicate source':f => f.release.assets.push(structuredClone(f.release.assets[1])),
    'source digest mismatch':f => f.release.assets[1].digest = 'sha256:' + '0'.repeat(64),
    'source size mismatch':f => f.release.assets[1].size++,
    'source pending':f => f.release.assets[1].state = 'new',
    'missing APK':f => f.release.assets.shift(),
    'duplicate APK':f => f.release.assets.push(structuredClone(f.release.assets[0])),
    'APK digest mismatch':f => f.release.assets[0].digest = 'sha256:' + '0'.repeat(64),
    'withdrawn source plus bad signature':f => {f.release.assets.pop(); f.client.signed_update.signature='0'.repeat(768);},
    'withdrawn source plus unsigned source identity':f => {f.release.assets.pop(); f.client.corresponding_source.sha256='0'.repeat(64);},
    'withdrawn source plus unsigned APK identity':f => {f.release.assets.pop(); f.client.sha256='0'.repeat(64);},
    'withdrawn source plus unsigned version':f => {f.release.assets.pop(); f.client.version='9.9.9';},
  })) {
    test('still rejects ' + label + ': ' + version, async () => {
      const f=fixture();mutate(f);await assert.rejects(() => selectMagirecoRelease(f.client,f.release));
    });
  }
}
