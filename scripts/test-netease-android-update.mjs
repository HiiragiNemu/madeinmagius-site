import assert from 'node:assert/strict';
import { FALLBACK, validatedUpdate } from '../functions/updates/netease/[file].js';

const signer = '4f8bdaa6ce7940d73a4ac0cc4337a81479ffed8a2f576f2e7c4bffbe5ce85481';
const sha = 'a'.repeat(64);
const release = {
  tag_name: 'v2.5.3',
  body: 'Android 2.5.3 startup update reminder',
  assets: [{
    name: 'NeteasePlaylistExporter-v2.5.3-android-full.apk',
    size: 912345,
    digest: 'sha256:' + sha,
  }],
};
const manifest = {
  schema: 'netease-playlist-exporter-release/v3',
  version: '2.5.3',
  tag: 'v2.5.3',
  android: {
    packageName: 'io.github.hiiraginemu.ncmexporter',
    versionCode: 253,
    signerSha256: signer,
  },
  components: {android: '2.5.3', windows: '2.5.1', python: '2.5.1'},
  assets: [{
    name: 'NeteasePlaylistExporter-v2.5.3-android-full.apk',
    bytes: 912345,
    sha256: sha,
  }],
};

const good = validatedUpdate(release, manifest);
assert.equal(good.version, '2.5.3');
assert.equal(good.versionCode, 253);
assert.equal(good.size, 912345);
assert.equal(good.sha256, sha);
assert.equal(good.apk_url, 'https://madeinmagius-site.pages.dev/downloads/netease/android-full');

assert.throws(
  () => validatedUpdate(release, {...manifest, android: {...manifest.android, signerSha256: 'b'.repeat(64)}}),
  /signer mismatch/,
);
assert.throws(
  () => validatedUpdate(release, {...manifest, android: {...manifest.android, packageName: 'wrong.package'}}),
  /package mismatch/,
);
assert.throws(
  () => validatedUpdate(release, {...manifest, version: '2.5.2', tag: 'v2.5.2'}),
  /not newer/,
);
assert.throws(
  () => validatedUpdate(release, {...manifest, assets: [{...manifest.assets[0], bytes: 1}]}),
  /size mismatch/,
);
assert.throws(
  () => validatedUpdate(release, {...manifest, assets: [{...manifest.assets[0], sha256: 'b'.repeat(64)}]}),
  /digest mismatch/,
);

assert.equal(FALLBACK.version, '2.5.2');
assert.equal(FALLBACK.versionCode, 252);
console.log('NETEASE_ANDROID_UPDATE_TEST_PASS');
