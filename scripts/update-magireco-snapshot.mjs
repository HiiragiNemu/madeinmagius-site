import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMagirecoRelease } from '../lib/magireco-release.js';

const releaseRoot = 'https://github.com/HiiragiNemu/ProgettoMagius-1/releases/download/latest/';
const metadataUrl = 'https://magireco-personal-release.pages.dev/magireco-current-legacy-client.version.json';
const releaseUrl = 'https://api.github.com/repos/HiiragiNemu/ProgettoMagius-1/releases/tags/latest';

// Artifact naming is generation-neutral; signature and approved release binding
// validation below still decides whether a version is publishable.
export function fixedApkName(version) {
  assert.match(version || '', /^[1-9]\d*\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/);
  return 'magireco-legacy-client-' + version + '.apk';
}

// Offline only: validate the publisher signature and frozen site contract before
// constructing the static fallback. Asset publication is checked by the publisher.
export async function createMagirecoSnapshot(client) {
  assert.ok(client && typeof client === 'object');
  const fixedName = fixedApkName(client.display_version);
  const source = client.corresponding_source;
  assert.ok(source && typeof source === 'object');
  const release = { draft:false, prerelease:false, assets:[
    { id:1, name:fixedName, state:'uploaded', size:client.size, digest:'sha256:' + client.sha256 },
    { id:2, name:source.asset, state:'uploaded', size:source.size, digest:'sha256:' + source.sha256 },
  ] };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async url => {
    if (url === metadataUrl) return Response.json(client);
    if (url === releaseUrl) return Response.json(release);
    throw new Error('Unexpected network request in offline snapshot updater: ' + url);
  };
  let selected;
  try {
    selected = await readMagirecoRelease({ GITHUB_RELEASES_TOKEN:'offline-snapshot-fixture' });
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(selected.version, client.display_version);
  return {
    schema:'madeinmagius-magireco-snapshot/v1',
    version:selected.version,
    size:selected.size,
    sha256:selected.sha256,
    source:'published-snapshot',
    updated:client.updated || null,
    download:releaseRoot + fixedName,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const check = args.at(-1) === '--check';
  if (check) args.pop();
  assert.equal(args.length, 2, 'Usage: node scripts/update-magireco-snapshot.mjs --metadata FILE [--check]');
  assert.equal(args[0], '--metadata');
  const client = JSON.parse(await readFile(resolve(args[1]), 'utf8'));
  const snapshot = await createMagirecoSnapshot(client);
  const output = new URL('../data/magireco-release.json', import.meta.url);
  const text = JSON.stringify(snapshot, null, 2) + '\n';
  if (check) assert.equal(await readFile(output, 'utf8'), text, 'Published snapshot differs from verified metadata');
  else await writeFile(output, text);
  console.log('MAGIRECO_SNAPSHOT_' + (check ? 'CHECK' : 'UPDATED') + '=PASS version=' + snapshot.version + '; realRSA=true; networkRequests=0');
}
