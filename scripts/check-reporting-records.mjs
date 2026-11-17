// Checks the curated public manifest and prevents missing or unlisted assets from shipping.
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const stem = 'reporting-records-20261116';
export const reports = join(repo, 'assets', 'reports');
const approvedNumbers = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '09B', '09C', '10', '11', '12', '13', '14', '15', '16', '17', '18'];
const originalNumbers = new Set(approvedNumbers);
const expectedRpids = ['159728551632', '172761210528', '172809228160'];
const expectedBvids = ['BV1q4Wa67EB2', 'BV1YG4K6kE6e', 'BV1h3x86qEyf', 'BV1qfxb61ENJ', 'BV1o7xb6CEdB', 'BV1WExx6jE42', 'BV1izxE6UESw', 'BV18Up86hEZq', 'BV1g8ph6YEYe'];

const keys = (value, permitted, label) => {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${label}: expected object`);
  for (const key of Object.keys(value)) assert(permitted.includes(key), `${label}: unexpected public field ${key}`);
};
const text = (value, label) => assert(typeof value === 'string' && value.length > 0, `${label}: expected nonempty text`);
const id = (value, label) => assert(typeof value === 'string' && /^\d+$/.test(value), `${label}: IDs must be decimal strings`);
const date = (value, label) => assert(typeof value === 'string' && /^2026-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/.test(value) && Number.isFinite(Date.parse(value)), `${label}: expected dated local record`);
const countBy = (items, field) => items.reduce((counts, item) => ({ ...counts, [item[field]]: (counts[item[field]] || 0) + 1 }), {});

function checkLinks(links = []) {
  for (const entry of links) {
    keys(entry, ['label', 'href', 'webOnly'], 'link');
    text(entry.label, 'link.label');
    if (entry.webOnly) {
      assert.equal(entry.href, 'resource-client-comparison-20261017.html');
      continue;
    }
    const url = new URL(entry.href);
    assert.equal(url.protocol, 'https:');
    assert(['www.bilibili.com', 'api.bilibili.com'].includes(url.hostname), `Unapproved source domain: ${url.hostname}`);
  }
}

export function validateManifest(data) {
  keys(data, ['schemaVersion', 'title', 'updatedAt', 'timeZone', 'authorStatement', 'relatedVideo', 'escalation20261118', 'summary', 'summaryNote', 'crossPageAudit', 'profileCard', 'galleryNote', 'gallery', 'attackQuote', 'noticeNote', 'notices', 'dynamicRecordNote', 'dynamicRecords', 'videoRecordNote', 'videoRecords', 'ownCommentNote', 'ownCommentRemovals', 'recordSourceNote', 'commentNote', 'commentLinkNote', 'comments', 'archiveSummary'], 'manifest');
  assert.equal(data.schemaVersion, 3);
  assert.equal(data.timeZone, 'Asia/Shanghai');
  text(data.title, 'title');
  assert.equal(data.relatedVideo.href, 'https://www.bilibili.com/video/BV1q4Wa67EB2/');
  keys(data.relatedVideo, ['label', 'href'], 'relatedVideo');
  text(data.authorStatement, 'authorStatement');
  if (data.crossPageAudit) {
    keys(data.crossPageAudit, ['checkedAt', 'bv1q4CommentsBackend', 'bv1q4CommentsBackendPages', 'bv1q4CommentsBaseline', 'bv1q4CommentsPublicVisible', 'bv1q4CommentsDiscrepancy', 'uploadTotalVideos', 'uploadPublishedVideos', 'uploadNotPassedTotal', 'uploadLocked', 'uploadReturnedSelfOnly', 'communityVisibleNov18', 'communityCumulativeNov16', 'deniedDynamicAppeals', 'deniedAppealDynamicIds', 'accountMutes', 'outgoingReportFeedback647'], 'crossPageAudit');
  }
  if (data.profileCard) {
    keys(data.profileCard, ['src', 'alt', 'title', 'caption'], 'profileCard');
    assert.match(data.profileCard.src, /^reporting-records-20261116\/comment-proof-\d{2}\.jpg$/);
    for (const key of ['alt', 'title', 'caption']) text(data.profileCard[key], `profileCard.${key}`);
  }
  if (data.escalation20261118) {
    keys(data.escalation20261118, ['date', 'headline', 'items'], 'escalation20261118');
    text(data.escalation20261118.headline, 'escalation20261118.headline');
    assert(Array.isArray(data.escalation20261118.items) && data.escalation20261118.items.length >= 2);
  }
  if (data.archiveSummary) {
    keys(data.archiveSummary, ['totalRecords', 'uid647014264', 'uid1703887112', 'previouslyDroppedRecovered', 'datasetPath'], 'archiveSummary');
    assert.equal(data.archiveSummary.totalRecords, 4433);
  }
  for (const key of ['summaryNote', 'galleryNote', 'noticeNote', 'dynamicRecordNote', 'videoRecordNote', 'ownCommentNote', 'recordSourceNote', 'commentNote', 'commentLinkNote']) text(data[key], key);
  assert.deepEqual(data.gallery.map(item => item.number), approvedNumbers);
  for (const item of data.gallery) {
    keys(item, ['id', 'number', 'title', 'label', 'version', 'versionLabel', 'src', 'alt', 'caption', 'redactionNote', 'links'], 'gallery item');
    assert.equal(item.id, `source-${item.number.toLowerCase()}`);
    assert.equal(item.src, `${stem}/${item.id}.png`);
    const original = originalNumbers.has(item.number);
    assert.equal(item.version, original ? 'original' : 'redacted');
    assert(original ? ['原图', '无删改原图'].includes(item.versionLabel) : item.versionLabel === '遮盖副本', `${item.id}: unexpected versionLabel ${item.versionLabel}`);
    if (!original) text(item.redactionNote, `${item.id}.redactionNote`);
    else assert.equal(item.redactionNote, undefined, `${item.id}: original must not be labeled as redacted`);
    for (const key of ['title', 'label', 'alt', 'caption']) text(item[key], `${item.id}.${key}`);
    checkLinks(item.links);
  }
  assert.deepEqual(data.notices.map(item => item.id), ['notice-04', 'notice-05', 'notice-13', 'notice-06', 'notice-07', 'notice-08', 'notice-09', 'notice-10', 'notice-11', 'notice-12', 'notice-01', 'notice-02', 'notice-03']);
  for (const item of data.notices) {
    keys(item, ['id', 'title', 'label', 'src', 'alt', 'caption', 'version', 'versionLabel'], 'notice image');
    assert.equal(item.src, `${stem}/${item.id}.jpg`);
    assert.equal(item.version, 'original');
    assert(['原图', '现场截图', '现场留存'].includes(item.versionLabel), `${item.id}: unexpected notice versionLabel ${item.versionLabel}`);
  }
  keys(data.attackQuote, ['imageId', 'speaker', 'text', 'attribution'], 'attackQuote');
  assert.equal(data.attackQuote.imageId, 'source-05');
  assert.equal(data.attackQuote.speaker, '沉恋古川');
  text(data.attackQuote.text, 'attackQuote.text');
  text(data.attackQuote.attribution, 'attackQuote.attribution');
  for (const number of ['15', '16']) {
    const item = data.gallery.find(entry => entry.number === number);
    assert((item.title + item.caption).includes('DD魔女'), `Slide ${number} must reference DD魔女`);
  }

  const noticeIds = new Set(data.notices.map(item => item.id));
  const dynamicIds = new Set();
  const eventIds = new Set();
  for (const item of data.dynamicRecords) {
    keys(item, ['id', 'dynamicId', 'noticeAt', 'timeBasis', 'reasonCategory', 'reason', 'exampleImages'], 'dynamic record');
    assert(!eventIds.has(item.id), `Duplicate notification entry: ${item.id}`);
    eventIds.add(item.id);
    id(item.dynamicId, 'dynamicId');
    dynamicIds.add(item.dynamicId);
    assert(['notice_record', 'recording_supplement', 'unrecorded'].includes(item.timeBasis));
    if (item.noticeAt !== null) date(item.noticeAt, 'noticeAt');
    assert.equal(item.noticeAt === null, item.timeBasis === 'unrecorded');
    text(item.reason, 'reason');
    for (const image of item.exampleImages) assert(noticeIds.has(image), `Unknown notification image: ${image}`);
  }
  const rights = data.dynamicRecords.filter(item => item.reasonCategory === 'rights_holder_complaint');
  const derived = {
    dynamicEvents: data.dynamicRecords.length,
    dynamicObjects: dynamicIds.size,
    rightsHolderEvents: rights.length,
    rightsHolderObjects: new Set(rights.map(item => item.dynamicId)).size,
    videoObjects: new Set(data.videoRecords.map(item => item.bvid)).size,
    videoTriggerCounts: countBy(data.videoRecords, 'triggerSource'),
    ownCommentRemovalsAtLeast: new Set(data.ownCommentRemovals.map(item => item.rpid)).size,
    datedDynamicEvents: data.dynamicRecords.filter(item => item.noticeAt !== null).length,
    undatedDynamicEvents: data.dynamicRecords.filter(item => item.noticeAt === null).length,
    reasonCounts: countBy(data.dynamicRecords, 'reasonCategory'),
  };
  assert.deepEqual(data.summary, derived, 'Published summary must match item counts');
  assert.equal(derived.dynamicEvents, 63);
  assert.equal(derived.dynamicObjects, 62);
  assert.equal(derived.rightsHolderEvents, 15);
  assert.equal(derived.rightsHolderObjects, 14);
  assert.equal(derived.datedDynamicEvents, 57);
  assert.deepEqual(derived.reasonCounts, { rights_holder_complaint: 15, inappropriate: 14, personal_attack: 16, provocation: 18 });
  assert.deepEqual(derived.videoTriggerCounts, { not_specified: 3, rights_holder_complaint: 3, user_report: 3 });
  assert.deepEqual(data.videoRecords.map(item => item.bvid), expectedBvids);
  for (const item of data.videoRecords) {
    keys(item, ['bvid', 'label', 'listedAt', 'status', 'triggerSource', 'triggerLabel', 'reasonSummary', 'href'], 'video record');
    assert.equal(item.href, `https://www.bilibili.com/video/${item.bvid}/`);
    date(item.listedAt, 'listedAt');
    text(item.reasonSummary, 'reasonSummary');
  }
  assert.equal(data.ownCommentRemovals.length, 3);
  for (const item of data.ownCommentRemovals) {
    keys(item, ['rpid', 'bvid', 'noticeAt', 'reason'], 'own comment record');
    id(item.rpid, 'own comment rpid');
    date(item.noticeAt, 'own comment noticeAt');
    assert.equal(item.bvid, 'BV1q4Wa67EB2');
    text(item.reason, 'own comment reason');
  }
  const commentRpids = new Set(data.comments.map(item => item.rpid));
  for (const baseRpid of expectedRpids) assert(commentRpids.has(baseRpid), `Missing baseline verified RPID: ${baseRpid}`);
  assert(data.comments.length >= 18, `Expected expanded featured comments, found ${data.comments.length}`);
  for (const item of data.comments) {
    keys(item, ['id', 'rpid', 'uid', 'badge', 'date', 'dateLabel', 'message', 'rootRpid', 'context', 'verifiedAt', 'links', 'screenshot', 'screenshotAlt'], 'historical comment');
    assert(['647014264', '1703887112'].includes(item.uid), `Unexpected comment UID: ${item.uid}`);
    assert.equal(item.id, `comment-${item.rpid}`);
    id(item.rootRpid, 'rootRpid');
    text(item.message, 'historical comment message');
    if (item.screenshot) {
      assert.match(item.screenshot, /^reporting-records-20261116\/comment-proof-\d{2}\.jpg$/);
      text(item.screenshotAlt, `${item.id}.screenshotAlt`);
    }
    checkLinks(item.links);
    assert.equal(item.links.length, 2);
  }
  const serialized = JSON.stringify(data);
  assert(!/[A-Za-z]:\\|\/workspace\/|private-review|member\.bilibili\.com|raw_visible|source_occurrences/.test(serialized), 'Private audit fields or local paths must not be public');
  return derived;
}

export async function readManifest() {
  const data = JSON.parse(await readFile(join(reports, stem, 'data.json'), 'utf8'));
  validateManifest(data);
  return data;
}

export async function checkAssets(data, { requireAll = false } = {}) {
  const seenSrc = new Set();
  const items = [];
  for (const item of [
    ...data.gallery,
    ...data.notices,
    ...(data.profileCard ? [{ id: 'profile-card', src: data.profileCard.src }] : []),
    ...data.comments.filter(c => c.screenshot).map(c => ({ id: `${c.id}-proof`, src: c.screenshot })),
  ]) {
    if (!seenSrc.has(item.src)) {
      seenSrc.add(item.src);
      items.push(item);
    }
  }
  const permitted = new Set(['data.json', 'comments-4433.json', ...items.map(item => item.src.slice(stem.length + 1))]);
  for (const entry of await readdir(join(reports, stem), { withFileTypes: true })) {
    assert(entry.isFile() && permitted.has(entry.name), `Unlisted public asset: ${entry.name}`);
  }
  const available = [], missing = [];
  for (const item of items) {
    const path = join(reports, item.src);
    try { assert((await stat(path)).isFile(), `Not a file: ${item.src}`); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      missing.push(item.src);
      continue;
    }
    const bytes = await readFile(path);
    if (item.src.endsWith('.png')) assert(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), `Not a PNG: ${item.src}`);
    else assert(bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255, `Not a JPEG: ${item.src}`);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    if (item.id === 'source-00') assert.equal(sha256, 'e13c33a503646b8ccc558054ba4d81ac1de7832d6b47a34e2a185570c2fb5fd9', '00 must retain the verified regenerated bytes');
    if (item.id === 'source-09c') assert.equal(sha256, '9a5a5f3d4caee3cc8c3e8e2b81dafc4d975d25a892142ee13b9b4a7cee8673ce', '09C must retain the verified regenerated bytes');
    if (item.id === 'source-03') assert.equal(bytes.length, 6511741, '03 regenerated byte size changed');
    if (item.id === 'source-05') assert.equal(bytes.length, 3127712, '05 regenerated byte size changed');
    if (item.id === 'source-13') assert.equal(sha256, 'f0fb7e1f1d5172f050e9090c885eeabd64694263da233eed377aa5888bd4f8a6', '13 must retain the verified regenerated bytes');
    if (item.id === 'source-18') assert.equal(sha256, 'ff5ed1de8eccbca33dfe072ed37a9b021eec52747c8878df27e9d365aa61fdfd', '18 must retain the verified regenerated bytes');
    available.push({ src: item.src, bytes: bytes.length, sha256 });
  }
  const archivePath = join(reports, stem, 'comments-4433.json');
  try {
    const rawArchive = await readFile(archivePath, 'utf8');
    const parsedArchive = JSON.parse(rawArchive);
    assert.equal(parsedArchive.total, 4433, 'comments-4433.json total must be 4433');
    assert.equal(parsedArchive.rows.length, 4433, 'comments-4433.json rows.length must be 4433');
  } catch (error) {
    if (error.code === 'ENOENT') missing.push(`${stem}/comments-4433.json`);
    else throw error;
  }
  if (requireAll && missing.length) throw new Error(`Missing ${missing.length} approved assets:\n${missing.join('\n')}`);
  return { available, missing, totalImageBytes: available.reduce((sum, item) => sum + item.bytes, 0) };
}

async function checkPageBindings(data) {
  const html = await readFile(join(reports, `${stem}.html`), 'utf8');
  const js = await readFile(join(reports, `${stem}.js`), 'utf8');
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  for (const match of js.matchAll(/getElementById\('([^']+)'\)/g)) assert(ids.has(match[1]) || match[1] === 'records-manifest', `Missing HTML element: ${match[1]}`);
  const dynamicIds = new Set([...data.gallery, ...data.notices, ...data.comments].map(item => item.id));
  for (const match of html.matchAll(/href="#([^"]+)"/g)) assert(ids.has(match[1]) || dynamicIds.has(match[1]), `Broken in-page link: ${match[1]}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const data = await readManifest();
    await checkPageBindings(data);
    const assets = await checkAssets(data, { requireAll: process.argv.includes('--require-assets') });
    console.log(JSON.stringify({ schemaVersion: data.schemaVersion, gallery: data.gallery.length, notices: data.notices.length, summary: data.summary, availableImages: assets.available.length, missingImages: assets.missing, totalImageBytes: assets.totalImageBytes, assetsRequired: process.argv.includes('--require-assets') }, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
