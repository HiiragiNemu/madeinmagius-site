import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createMagirecoSnapshot, fixedApkName } from './update-magireco-snapshot.mjs';

const client = JSON.parse(await readFile(new URL('./fixtures/magireco-discovery138.json', import.meta.url)));
const snapshot = {schema:'madeinmagius-magireco-snapshot/v1',version:'1.3.8',version_code:1713000895,
  size:134530376,sha256:'f140fd086be89b03e9ac65a47fc0cee1daa57561fb49dead6440bd34b9620e0c',
  source:'published-snapshot',updated:null,download:'https://github.com/HiiragiNemu/ProgettoMagius-1/releases/download/latest/magireco-legacy-client-1.3.8.apk'};

test('138 snapshot is generated from the actual publisher signature and frozen identity', async () => {
  const fetch = globalThis.fetch;
  assert.deepEqual(await createMagirecoSnapshot(client), snapshot);
  assert.equal(globalThis.fetch, fetch);
  assert.equal(snapshot.version, '1.3.8');
  assert.equal(snapshot.size, 134530376);
  assert.equal(snapshot.sha256, 'f140fd086be89b03e9ac65a47fc0cee1daa57561fb49dead6440bd34b9620e0c');
  assert.equal(snapshot.download, 'https://github.com/HiiragiNemu/ProgettoMagius-1/releases/download/latest/magireco-legacy-client-1.3.8.apk');
});

test('metadata without a timestamp does not invent a publication time', async () => {
  const withoutTimestamp = structuredClone(client); delete withoutTimestamp.updated;
  assert.equal((await createMagirecoSnapshot(withoutTimestamp)).updated, null);
});

for (const [label, mutate] of Object.entries({
  'bad signature': x => x.signed_update.signature = '0'.repeat(768),
  'outer hash mismatch': x => x.sha256 = '0'.repeat(64),
  'outer notes mismatch': x => x.release_notes = ['different'],
  'outer source mismatch': x => x.corresponding_source.sha256 = '0'.repeat(64),
  'raw version': x => x.version = '1.3.8',
  'future discovery': x => x.version = '1.3.139',
  'wrong APK route': x => x.apk_url = 'https://example.test/replaced.apk',
})) test('snapshot updater rejects ' + label + ' without leaving a fetch override', async () => {
  const fetch = globalThis.fetch;
  const changed = structuredClone(client); mutate(changed);
  await assert.rejects(() => createMagirecoSnapshot(changed));
  assert.equal(globalThis.fetch, fetch);
});

test('artifact names accept future major/minor generations without approving their release', () => {
  for (const version of ['1.3.8', '1.4.0', '2.0.0', '10.20.30']) {
    assert.equal(fixedApkName(version), 'magireco-legacy-client-' + version + '.apk');
  }
  for (const version of ['../2.0.0', '2.0', '2.0.0/path', '02.0.0', '2.00.0', '2.0.0/path#']) {
    assert.throws(() => fixedApkName(version));
  }
});
