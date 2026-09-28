import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { FALLBACK, onRequestGet, validatedUpdate } from '../functions/updates/netease/[file].js';
import { verifyNetEaseUpdate } from './verify-netease-android-update.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const jsonResponse = data => new Response(JSON.stringify(data));

function fixture(version = '2.5.3', versionCode = 253) {
  const bytes = Buffer.from('APK fixture ' + version);
  const apk = { name: `NeteasePlaylistExporter-v${version}-android-full.apk`,
    size: bytes.length, digest: 'sha256:' + hash(bytes) };
  const manifest = {
    schema: 'netease-playlist-exporter-release/v3', version, tag: 'v' + version,
    android: { packageName: 'io.github.hiiraginemu.ncmexporter', versionCode,
      signerSha256: '4f8bdaa6ce7940d73a4ac0cc4337a81479ffed8a2f576f2e7c4bffbe5ce85481' },
    components: { android: version, windows: '2.5.1', python: '2.5.1' },
    assets: [{ name: apk.name, bytes: apk.size, sha256: hash(bytes) }],
  };
  const manifestBytes = Buffer.from(JSON.stringify(manifest));
  const project = { tag: manifest.tag, name: 'Release ' + version,
    assets: { androidFull: apk, manifest: { name: 'RELEASE_MANIFEST.json',
      size: manifestBytes.length, digest: 'sha256:' + hash(manifestBytes) } } };
  const snapshot = { projects: { netease: structuredClone(project) } };
  const live = { source: 'cloudflare-live', projects: { netease: project } };
  const update = validatedUpdate({ tag_name: manifest.tag, assets: [apk] }, manifest);
  const state = { snapshot, deployed: structuredClone(snapshot), live, update,
    source: 'verified-latest-release', apkBytes: bytes, manifestBytes, manifest };
  state.fetchImpl = async (url, init) => {
    const path = new URL(url).pathname;
    assert.equal(new URL(url).origin, 'https://madeinmagius-site.pages.dev');
    assert.equal(init.redirect, 'error');
    assert.equal(new Headers(init.headers).has('authorization'), false);
    const assetResponse = (body, asset) => new Response(init.method === 'HEAD' ? null : body,
      { headers: { 'content-length': String(asset.size), 'x-release-digest': asset.digest } });
    if (path === '/data/releases.json') return jsonResponse(state.deployed);
    if (path === '/api/releases') return jsonResponse(state.live);
    if (path === '/downloads/netease/manifest') return assetResponse(state.manifestBytes, project.assets.manifest);
    if (path === '/updates/netease/android.json') return new Response(JSON.stringify(state.update),
      { headers: { 'x-update-source': state.source } });
    if (path === '/downloads/netease/android-full') return assetResponse(state.apkBytes, apk);
    throw new Error('unexpected route: ' + path);
  };
  return state;
}

const verify = f => verifyNetEaseUpdate({ snapshot: f.snapshot, fetchImpl: f.fetchImpl, nonce: 'test' });

test('current release passes with Windows/Python still at 2.5.1', async () => {
  const f = fixture();
  const before = structuredClone(f.snapshot);
  const result = await verify(f);
  assert.equal(result.version, '2.5.3');
  assert.equal(result.versionCode, 253);
  assert.equal(result.sha256, hash(f.apkBytes));
  assert.deepEqual(f.snapshot, before, 'verification must not mutate the snapshot');
  assert.equal(f.manifest.components.windows, '2.5.1');
  assert.equal(f.manifest.components.python, '2.5.1');
});

test('a newer release passes without raising the site snapshot', async () => {
  const f = fixture('2.5.4', 254);
  f.snapshot = fixture().snapshot;
  f.deployed = structuredClone(f.snapshot);
  assert.equal((await verify(f)).version, '2.5.4');
});

test('regression: 2.5.3 live with a 2.5.2 snapshot is not pinned back to 2.5.2', async () => {
  const f = fixture();
  f.snapshot.projects.netease.tag = 'v2.5.2';
  f.snapshot.projects.netease.assets.androidFull = { name: 'old.apk', size: 908807,
    digest: 'sha256:' + FALLBACK.sha256 };
  f.deployed = structuredClone(f.snapshot);
  assert.equal((await verify(f)).version, '2.5.3');
});

for (const [label, mutate, error] of [
  ['wrong versionCode', f => { f.update.versionCode = 999; }, /versionCode mismatch/],
  ['old pinned URL', f => { f.update.apk_url = FALLBACK.apk_url; }, /apk_url mismatch/],
  ['wrong update size', f => { f.update.size += 1; }, /size mismatch/],
  ['wrong update digest', f => { f.update.sha256 = '0'.repeat(64); }, /sha256 mismatch/],
  ['wrong package', f => { f.update.packageName = 'wrong.package'; }, /packageName mismatch/],
  ['fallback advertised as current', f => { f.source = 'verified-fallback'; }, /serving fallback/],
  ['unchanged-tag APK substitution', f => { f.live.projects.netease.assets.androidFull.digest = 'sha256:' + '0'.repeat(64); }, /same-tag/],
  ['snapshot not deployed', f => { f.deployed.projects.netease.tag = 'v2.5.2'; }, /snapshot not deployed/],
  ['downgrade below snapshot', f => { f.snapshot.projects.netease.tag = 'v2.5.4'; f.deployed = structuredClone(f.snapshot); }, /older than verified snapshot/],
  ['corrupt APK with valid headers', f => { f.apkBytes = Buffer.alloc(f.apkBytes.length); }, /downloaded bytes SHA-256 mismatch/],
  ['truncated APK', f => { f.apkBytes = f.apkBytes.subarray(1); }, /byte count mismatch/],
  ['oversized APK', f => { f.apkBytes = Buffer.concat([f.apkBytes, Buffer.from('extra')]); }, /size limit/],
  ['corrupt manifest with valid headers', f => { f.manifestBytes = Buffer.alloc(f.manifestBytes.length); }, /downloaded bytes SHA-256 mismatch/],
]) {
  test('rejects ' + label, async () => {
    const f = fixture(); mutate(f);
    await assert.rejects(verify(f), error);
  });
}

test('rejects a bad manifest signer even when its download digest is consistent', async () => {
  const f = fixture();
  f.manifest.android.signerSha256 = '0'.repeat(64);
  f.manifestBytes = Buffer.from(JSON.stringify(f.manifest));
  f.live.projects.netease.assets.manifest.digest = 'sha256:' + hash(f.manifestBytes);
  f.snapshot = { projects: { netease: structuredClone(f.live.projects.netease) } };
  f.deployed = structuredClone(f.snapshot);
  await assert.rejects(verify(f), /signer mismatch/);
});

test('HTTP errors are not accepted as a successful update check', async () => {
  const f = fixture();
  f.fetchImpl = async () => new Response('unavailable', { status: 503 });
  await assert.rejects(verify(f), /HTTP 503/);
});

test('the existing no-token fallback remains 2.5.2 and is explicitly marked', async () => {
  const response = await onRequestGet({ params: { file: 'android.json' }, env: {} });
  assert.equal(response.headers.get('x-update-source'), 'verified-fallback');
  assert.deepEqual(await response.json(), FALLBACK);
  assert.equal(FALLBACK.version, '2.5.2');
  assert.equal(FALLBACK.versionCode, 252);
});
