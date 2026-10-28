import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMagirecoSnapshot } from './update-magireco-snapshot.mjs';
import { atLeast } from '../assets/magireco-loader.js';

const api = 'https://api.github.com/repos/HiiragiNemu/ProgettoMagius-1';
const root = 'https://github.com/HiiragiNemu/ProgettoMagius-1/releases/download/latest/';
const name = 'magireco-current-legacy-client.version.json';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// Two bounded public reads, no Cloudflare Function and no APK/body download.
export async function readPublishedBundle({fetcher = fetch, token = '', receipt = null} = {}) {
  const headers = {'User-Agent':'Magius-Snapshot-Sync/1.0', 'Cache-Control':'no-cache'};
  async function bytes(url, limit, auth = false) {
    const response = await fetcher(url, {headers:{...headers,
      ...(auth ? {Accept:'application/vnd.github+json', ...(token ? {Authorization:'Bearer '+token} : {})} : {})},
      signal:AbortSignal.timeout(30000)});
    assert.ok(response.ok, 'Public release read failed: HTTP '+response.status);
    const chunks = []; let length = 0;
    for await (const part of response.body) {
      length += part.length; assert.ok(length <= limit, 'Release metadata exceeded size limit'); chunks.push(part);
    }
    return Buffer.concat(chunks);
  }
  const release = JSON.parse(await bytes(api+'/releases/tags/latest', 1048576, true));
  assert.ok(!release.draft && !release.prerelease && Array.isArray(release.assets));
  const found = release.assets.filter(asset => asset.name === name);
  assert.equal(found.length, 1, 'Canonical metadata asset must be unique');
  const asset = found[0];
  assert.equal(asset.state, 'uploaded');
  assert.ok(Number.isSafeInteger(asset.id) && asset.id > 0);
  if (receipt) {
    assert.equal(receipt.schema, 1); assert.equal(receipt.status, 'assets_verified');
    assert.ok(Array.isArray(receipt.assets));
    const records = receipt.assets.filter(item => item.name === name);
    assert.equal(records.length, 1, 'Verified mirror receipt must include current metadata');
    assert.equal(records[0].size, asset.size);
    assert.equal('sha256:'+records[0].sha256, asset.digest, 'Mirror receipt and live metadata differ');
  }
  const raw = await bytes(root+name, 262144);
  assert.equal(raw.length, asset.size); assert.equal('sha256:'+sha(raw), asset.digest);
  return {client:JSON.parse(raw), release};
}

export async function prepareSnapshotUpdate({client, release}, previousClient) {
  const next = await createMagirecoSnapshot(client, release);
  const previous = await createMagirecoSnapshot(previousClient);
  assert.ok(atLeast(next, previous), 'Published build regressed or reused a build identity');
  return {snapshot:JSON.stringify(next,null,2)+'\n', signed:JSON.stringify(client,null,2)+'\n'};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  assert.ok(args.length === 0 || (args.length === 2 && args[0] === '--receipt'),
    'Usage: node scripts/sync-magireco-release.mjs [--receipt verified-mirror-report.json]');
  const receipt = args.length ? JSON.parse(await readFile(resolve(args[1]), 'utf8')) : null;
  const previousPath = new URL('../data/magireco-release.signed.json', import.meta.url);
  const snapshotPath = new URL('../data/magireco-release.json', import.meta.url);
  const previous = JSON.parse(await readFile(previousPath, 'utf8'));
  const bundle = await readPublishedBundle({token:process.env.TARGET_TOKEN || '', receipt});
  const output = await prepareSnapshotUpdate(bundle, previous);
  // No files are touched until signature, asset state, receipt and monotonic checks pass.
  const unchanged = await readFile(snapshotPath,'utf8') === output.snapshot &&
    await readFile(previousPath,'utf8') === output.signed;
  if (!unchanged) {
    await writeFile(snapshotPath, output.snapshot);
    await writeFile(previousPath, output.signed);
  }
  console.log('MAGIRECO_SNAPSHOT_SYNC='+ (unchanged ? 'UNCHANGED' : 'UPDATED') +
    '; version='+JSON.parse(output.snapshot).version+'; verifiedSignature=true; apkDownloads=0');
}
