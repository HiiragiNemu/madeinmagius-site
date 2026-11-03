// Emergency withdrawal: never fetch metadata or revive a cached snapshot.
const versionParts = value => {
  if (typeof value !== 'string' || !/^[1-9]\d*\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(value)) return null;
  const parts = value.split('.').map(Number);
  return parts.every(Number.isSafeInteger) ? parts : null;
};
const validCode = value => Number.isSafeInteger(value) && value > 0 && value <= 2147483647;


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

export async function loadMagirecoReleaseData({onUpdate=()=>{}}={}) {
  const current={state:'withdrawn'};onUpdate(current);return current;
}
