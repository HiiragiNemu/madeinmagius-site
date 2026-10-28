// The signed release is checked when publishing the static snapshot. It stays
// usable when the account's Functions quota makes the live API unavailable.
const PUBLIC_RELEASE = 'https://github.com/HiiragiNemu/ProgettoMagius-1/releases/download/latest/';
const versionParts = value => {
  if (typeof value !== 'string' || !/^[1-9]\d*\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(value)) return null;
  const parts = value.split('.').map(Number);
  return parts.every(Number.isSafeInteger) ? parts : null;
};
const validCode = value => Number.isSafeInteger(value) && value > 0 && value <= 2147483647;

function valid(value, snapshot) {
  if (!value || !versionParts(value.version) || !Number.isSafeInteger(value.size) || value.size <= 0 ||
      !/^[a-f0-9]{64}$/.test(value.sha256 || '') ||
      (value.version_code !== undefined && !validCode(value.version_code))) return false;
  return snapshot
    ? value.schema === 'madeinmagius-magireco-snapshot/v1' &&
      value.download === PUBLIC_RELEASE + 'magireco-legacy-client-' + value.version + '.apk'
    : value.download === './downloads/magireco/android?sha256=' + value.sha256;
}

export function atLeast(candidate, baseline) {
  const sameIdentity = candidate.version === baseline.version && candidate.sha256 === baseline.sha256 && candidate.size === baseline.size;
  if (validCode(baseline.version_code)) {
    // Old deployed API responses lack the build code. Only the already-known
    // identity is compatible; a display-name jump is not proof of a newer APK.
    if (!validCode(candidate.version_code)) return sameIdentity;
    if (candidate.version_code !== baseline.version_code) return candidate.version_code > baseline.version_code;
    return sameIdentity;
  }
  const a = versionParts(candidate.version), b = versionParts(baseline.version);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return sameIdentity;
}

export async function loadMagirecoReleaseData({ liveUrl, fetcher = fetch, onUpdate = () => {}, timeoutMs = 5000 } = {}) {
  let current = null;
  async function read(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetcher(url, { cache: 'no-cache', signal: controller.signal });
      if (!response.ok) throw new Error('Release endpoint unavailable');
      return await response.json();
    } finally { clearTimeout(timeout); }
  }
  try {
    const snapshot = await read('./data/magireco-release.json');
    if (valid(snapshot, true)) {
      current = { ...snapshot, state: 'ready' };
      onUpdate(current);
    }
  } catch { /* Keep the independent live path available. */ }
  try {
    const live = await read(liveUrl);
    if (valid(live, false) && (!current || atLeast(live, current))) {
      current = { ...live, version_code: live.version_code ?? current?.version_code, state: 'ready' };
      onUpdate(current);
    }
  } catch { /* A failed Function must not erase a verified static download. */ }
  return current || { state: 'error' };
}
