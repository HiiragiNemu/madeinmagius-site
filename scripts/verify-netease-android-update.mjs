import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { validatedUpdate } from '../functions/updates/netease/[file].js';

const ORIGIN = 'https://madeinmagius-site.pages.dev';

function sha256(value) {
  const sha = String(value || '').replace(/^sha256:/i, '').toLowerCase();
  assert.match(sha, /^[0-9a-f]{64}$/, 'missing/invalid SHA-256');
  return sha;
}

function compareVersions(a, b) {
  const parts = value => {
    assert.match(String(value), /^v?\d+\.\d+\.\d+$/, 'invalid release version');
    return String(value).replace(/^v/, '').split('.').map(Number);
  };
  const x = parts(a), y = parts(b);
  for (let i = 0; i < 3; i += 1) {
    if (x[i] !== y[i]) return x[i] > y[i] ? 1 : -1;
  }
  return 0;
}

async function readBytes(response, limit) {
  assert(response.body, 'response body missing');
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    assert(size <= limit, 'response exceeds expected size limit');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function readJson(response, limit = 512 * 1024) {
  return JSON.parse((await readBytes(response, limit)).toString('utf8'));
}

function checkHeaders(response, asset, headOnly = false) {
  assert.equal(sha256(response.headers.get('x-release-digest')), sha256(asset.digest),
    'download header digest mismatch');
  if (headOnly) {
    assert.equal(response.headers.get('content-length'), String(asset.size),
      'download Content-Length mismatch');
  }
}

function checkBytes(bytes, asset) {
  assert.equal(bytes.byteLength, asset.size, 'download byte count mismatch');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), sha256(asset.digest),
    'downloaded bytes SHA-256 mismatch');
}

// The private source repository is exposed by the existing authenticated Pages
// mirror. Read its Release metadata and manifest independently of android.json;
// never use the response under test as its own expected value or require a PAT
// in this public repository. The snapshot is a verified floor, not a latest pin.
export async function verifyNetEaseUpdate({
  snapshot,
  fetchImpl = globalThis.fetch,
  nonce = Date.now(),
  signal = AbortSignal.timeout(30_000),
}) {
  async function request(path, method = 'GET') {
    const url = new URL(path, ORIGIN);
    assert.equal(url.origin, ORIGIN, 'unexpected download origin');
    url.searchParams.set('verify', String(nonce));
    const response = await fetchImpl(url, {
      method, signal, redirect: 'error',
      headers: { 'cache-control': 'no-cache', 'accept-encoding': 'identity' },
    });
    assert.equal(response.status, 200, `${method} ${url.pathname}: HTTP ${response.status}`);
    return response;
  }

  const baseline = snapshot.projects.netease;
  const deployed = await readJson(await request('/data/releases.json'));
  assert.deepEqual(deployed.projects?.netease, baseline, 'NetEase snapshot not deployed yet');

  const live = await readJson(await request('/api/releases'));
  assert.equal(live.source, 'cloudflare-live', 'live Release metadata unavailable');
  const project = live.projects?.netease;
  assert(project?.assets?.androidFull && project.assets.manifest, 'NetEase release assets missing');
  const comparison = compareVersions(project.tag, baseline.tag);
  assert(comparison >= 0, 'live release is older than verified snapshot');

  // An already-verified tag must still identify exactly the same bytes. A newer
  // tag may advance without a site commit, but must pass all manifest/APK checks.
  if (comparison === 0) {
    for (const key of ['androidFull', 'manifest']) {
      for (const field of ['name', 'size', 'digest']) {
        assert.equal(project.assets[key][field], baseline.assets[key][field],
          `same-tag ${key}.${field} differs from verified snapshot`);
      }
    }
  }

  const manifestAsset = project.assets.manifest;
  assert(Number.isSafeInteger(manifestAsset.size) && manifestAsset.size > 0
    && manifestAsset.size <= 128 * 1024, 'invalid manifest size');
  const manifestResponse = await request('/downloads/netease/manifest');
  checkHeaders(manifestResponse, manifestAsset);
  const manifestBytes = await readBytes(manifestResponse, manifestAsset.size);
  checkBytes(manifestBytes, manifestAsset);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const expected = validatedUpdate({
    tag_name: project.tag,
    body: project.name,
    assets: [project.assets.androidFull],
  }, manifest);

  const metaResponse = await request('/updates/netease/android.json');
  assert.equal(metaResponse.headers.get('x-update-source'), 'verified-latest-release',
    'update route is serving fallback, not the latest verified release');
  const actual = await readJson(metaResponse, 64 * 1024);
  for (const key of ['schema', 'packageName', 'version', 'versionCode', 'minSdk', 'apk_url', 'size', 'sha256']) {
    assert.equal(actual[key], expected[key], `update ${key} mismatch`);
  }

  const apk = project.assets.androidFull;
  assert(apk.size <= 128 * 1024 * 1024, 'APK exceeds verifier size limit');
  checkHeaders(await request(expected.apk_url, 'HEAD'), apk, true);
  const apkResponse = await request(expected.apk_url);
  checkHeaders(apkResponse, apk);
  const apkBytes = await readBytes(apkResponse, apk.size);
  checkBytes(apkBytes, apk);
  return { version: expected.version, versionCode: expected.versionCode,
    size: apkBytes.byteLength, sha256: expected.sha256, apk_url: expected.apk_url };
}

async function main() {
  const snapshot = JSON.parse(await readFile(new URL('../data/releases.json', import.meta.url), 'utf8'));
  const deadline = Date.now() + 5 * 60_000;
  let failure;
  for (let attempt = 1; attempt <= 24 && Date.now() < deadline; attempt += 1) {
    try {
      const result = await verifyNetEaseUpdate({ snapshot,
        nonce: `${process.env.GITHUB_RUN_ID || 'local'}-${Date.now()}-${attempt}` });
      console.log(`attempt=${attempt} ${JSON.stringify(result)}`);
      console.log('NETEASE_ANDROID_UPDATE_ROUTE_PASS');
      return;
    } catch (error) {
      failure = error;
      console.error(`attempt=${attempt}: ${error.message}`);
      if (attempt < 24 && Date.now() + 10_000 < deadline) await delay(10_000);
    }
  }
  throw failure || new Error('NetEase verification deadline exceeded');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
