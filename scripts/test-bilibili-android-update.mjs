import assert from 'node:assert/strict';
import {
  FALLBACK,
  onRequestGet,
  validatedUpdate,
} from '../functions/updates/bilibili/android.json.js';

const APK_SHA = 'a'.repeat(64);
const EXPECTED_SIGNER =
  '3372dbf9263c6a8a29bf76ed13c78570a58b10945f39ff7b6a9a613ef3c9bab8';

function releaseFixture(overrides = {}) {
  return {
    tag_name: 'v0.1.11',
    body: '保存与滚动比较热修复',
    assets: [
      {
        name: 'Bilibili-Follower-Snapshot-Companion-v0.1.11.apk',
        size: 2500000,
        digest: 'sha256:' + APK_SHA,
        url: 'https://api.github.com/repos/HiiragiNemu/Bilibili-Follower-Snapshot/releases/assets/111',
      },
      {
        name: 'RELEASE_MANIFEST.json',
        size: 1000,
        url: 'https://api.github.com/repos/HiiragiNemu/Bilibili-Follower-Snapshot/releases/assets/222',
      },
    ],
    ...overrides,
  };
}

function manifestFixture(overrides = {}) {
  return {
    schema: 'bilibili-follower-snapshot-release/v1',
    packageName: 'io.github.hiiraginemu.bilibilifollowersnapshot.companion',
    version: '0.1.11',
    versionCode: 12,
    minSdk: 29,
    targetSdk: 36,
    signerSha256: EXPECTED_SIGNER,
    assets: {
      android: {
        name: 'Bilibili-Follower-Snapshot-Companion-v0.1.11.apk',
        size: 2500000,
        sha256: APK_SHA,
      },
    },
    ...overrides,
  };
}

const direct = validatedUpdate(releaseFixture(), manifestFixture());
assert.equal(direct.version, '0.1.11');
assert.equal(direct.versionCode, 12);
assert.equal(direct.sha256, APK_SHA);
assert.equal(
  direct.apk_url,
  'https://madeinmagius-site.pages.dev/downloads/bilibili/android',
);

for (const [label, release, manifest] of [
  ['wrong signer', releaseFixture(), manifestFixture({ signerSha256: 'b'.repeat(64) })],
  ['wrong package', releaseFixture(), manifestFixture({ packageName: 'example.invalid' })],
  ['old version', releaseFixture({ tag_name: 'v0.1.10' }), manifestFixture({ version: '0.1.10', versionCode: 11 })],
  ['wrong manifest size', releaseFixture(), manifestFixture({ assets: { android: {
    name: 'Bilibili-Follower-Snapshot-Companion-v0.1.11.apk',
    size: 2499999,
    sha256: APK_SHA,
  } } })],
  ['wrong manifest digest', releaseFixture(), manifestFixture({ assets: { android: {
    name: 'Bilibili-Follower-Snapshot-Companion-v0.1.11.apk',
    size: 2500000,
    sha256: 'c'.repeat(64),
  } } })],
]) {
  assert.throws(() => validatedUpdate(release, manifest), undefined, label);
}

async function responseJson(response) {
  return {
    source: response.headers.get('x-update-source'),
    body: await response.json(),
  };
}

const noToken = await responseJson(await onRequestGet({ env: {} }));
assert.equal(noToken.source, 'verified-fallback');
assert.deepEqual(noToken.body, FALLBACK);

let mode = 'valid';
const calls = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const url = String(input);
  const headers = new Headers(init.headers);
  calls.push({
    url,
    authorization: headers.get('authorization'),
    accept: headers.get('accept'),
  });

  if (url.endsWith('/releases/latest')) {
    assert.equal(headers.get('authorization'), 'Bearer fixture-token');
    if (mode === 'old') {
      return Response.json(releaseFixture({
        tag_name: 'v0.1.10',
        assets: [],
      }));
    }
    if (mode === 'missing-manifest') {
      return Response.json(releaseFixture({
        assets: releaseFixture().assets.filter(asset => asset.name !== 'RELEASE_MANIFEST.json'),
      }));
    }
    return Response.json(releaseFixture());
  }

  if (url.endsWith('/releases/assets/222')) {
    assert.equal(headers.get('authorization'), 'Bearer fixture-token');
    assert.equal(headers.get('accept'), 'application/octet-stream');
    return new Response(null, {
      status: 302,
      headers: { location: 'https://release-assets.githubusercontent.com/fixture-manifest' },
    });
  }

  if (url === 'https://release-assets.githubusercontent.com/fixture-manifest') {
    assert.equal(headers.has('authorization'), false);
    const manifest = mode === 'bad-signer'
      ? manifestFixture({ signerSha256: 'b'.repeat(64) })
      : manifestFixture();
    return new Response(JSON.stringify(manifest), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  throw new Error('unexpected fixture URL: ' + url);
};

try {
  for (const expected of [
    ['old', 'verified-fallback', '0.1.10'],
    ['missing-manifest', 'verified-fallback', '0.1.10'],
    ['bad-signer', 'verified-fallback', '0.1.10'],
    ['valid', 'verified-latest-release', '0.1.11'],
  ]) {
    [mode] = expected;
    const response = await onRequestGet({
      env: { GITHUB_RELEASES_TOKEN: 'fixture-token' },
    });
    const parsed = await responseJson(response);
    assert.equal(parsed.source, expected[1], mode);
    assert.equal(parsed.body.version, expected[2], mode);
  }

  assert.ok(
    calls.some(call =>
      call.url === 'https://release-assets.githubusercontent.com/fixture-manifest' &&
      call.authorization === null
    ),
    'GitHub credential must never cross the release-asset redirect',
  );
  console.log('BILIBILI_ANDROID_UPDATE_PASS');
} finally {
  globalThis.fetch = originalFetch;
}
