// Builds the same static event-record viewer for Bilibili Toy; no network or publishing.
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { resolve, dirname, relative, sep, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readManifest, checkAssets } from './check-reporting-records.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reports = join(repo, 'assets', 'reports');
const stem = 'reporting-records-20261116';
const output = resolve(process.argv[2] || join(repo, '..', 'reporting-toy-20261116'));
const zipPath = `${output}.zip`;
const losslessImageDir = process.env.TOY_LOSSLESS_IMAGE_DIR ? resolve(process.env.TOY_LOSSLESS_IMAGE_DIR) : null;
const data = await readManifest();
const assetCheck = await checkAssets(data, { requireAll: true });
const mediaOverrides = new Map();
const isBilibili = href => {
  try { const u = new URL(href); return u.protocol === 'https:' && (u.hostname === 'bilibili.com' || u.hostname.endsWith('.bilibili.com')); }
  catch { return false; }
};

for (const item of [...data.gallery, ...data.notices, ...data.comments]) {
  item.links = (item.links || []).filter(link => !link.webOnly && isBilibili(link.href));
}
// Retain each image's original/redacted version label; remove personal-site links.
for (const item of data.gallery) {
  if (item.id === 'source-09c') item.caption = '资源包文件列表与早期发布记录对照。点击图片放大阅读。';
}
if (losslessImageDir) {
  for (const item of data.gallery) {
    const filename = `${item.id}.webp`;
    let bytes;
    try { bytes = await readFile(join(losslessImageDir, filename)); }
    catch (error) { throw new Error(`Cannot read required lossless image ${filename}: ${error.message}`); }
    assertLosslessWebp(bytes, filename);
    item.src = `${stem}/${filename}`;
    item.versionLabel += ' · 无损 WebP';
    mediaOverrides.set(item.src, bytes);
  }
  data.galleryNote += ' 此 Toy 图集使用无损 WebP 文件，原图或遮盖副本的标识与网站对应。';
}
let html = await readFile(join(reports, `${stem}.html`), 'utf8');
html = html.replace('data-mode="web"', 'data-mode="toy"');
html = html.replace(/\s*<!-- WEB_ONLY_START -->[\s\S]*?<!-- WEB_ONLY_END -->/g, '');
const serialized = JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
html = html.replace('</head>', `  <script id="records-manifest" type="application/json">${serialized}</script>\n</head>`);
if (Buffer.byteLength(html) >= 1024 * 1024) throw new Error('Toy index.html must stay below 1 MiB.');

const files = new Map([
  ['index.html', Buffer.from(html)],
  [`${stem}.css`, await readFile(join(reports, `${stem}.css`))],
  [`${stem}.js`, await readFile(join(reports, `${stem}.js`))],
  [`${stem}/data.json`, Buffer.from(JSON.stringify(data, null, 2) + '\n')],
]);
for (const item of [...data.gallery, ...data.notices]) {
  if (mediaOverrides.has(item.src)) {
    files.set(item.src, mediaOverrides.get(item.src));
    continue;
  }
  const source = resolve(reports, item.src);
  const rel = relative(reports, source);
  if (rel.startsWith('..') || rel.startsWith(sep) || !rel.startsWith(`${stem}${sep}`)) throw new Error(`Media path is outside the event directory: ${item.src}`);
  const metadata = await stat(source);
  if (!metadata.isFile()) throw new Error(`Not a regular image: ${source}`);
  files.set(item.src.replaceAll('\\', '/'), await readFile(source));
}

function assertLosslessWebp(bytes, filename) {
  if (bytes.length < 20 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP' || bytes.readUInt32LE(4) + 8 !== bytes.length) throw new Error(`Invalid WebP container: ${filename}`);
  let offset = 12;
  let losslessChunks = 0;
  while (offset + 8 <= bytes.length) {
    const type = bytes.toString('ascii', offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    if (offset + 8 + size > bytes.length) throw new Error(`Truncated WebP chunk: ${filename}`);
    if (type === 'VP8 ' || type === 'ANIM' || type === 'ANMF') throw new Error(`Only still, lossless WebP images are accepted: ${filename}`);
    if (type === 'VP8L') {
      if (size < 5 || bytes[offset + 8] !== 0x2f) throw new Error(`Invalid lossless WebP payload: ${filename}`);
      losslessChunks++;
    }
    offset += 8 + size + (size % 2);
  }
  if (offset !== bytes.length || losslessChunks !== 1) throw new Error(`Missing or invalid lossless WebP image: ${filename}`);
}

// ZIP store format keeps original image bytes intact and needs no external package.
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let bit = 0; bit < 8; bit++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[i] = c >>> 0;
}
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const value of bytes) crc = crcTable[(crc ^ value) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
const localParts = [], centralParts = [];
let offset = 0;
const now = new Date();
const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
for (const [name, body] of files) {
  const nameBytes = Buffer.from(name);
  const checksum = crc32(body);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
  local.writeUInt16LE(dosTime, 10); local.writeUInt16LE(dosDate, 12); local.writeUInt32LE(checksum, 14);
  local.writeUInt32LE(body.length, 18); local.writeUInt32LE(body.length, 22); local.writeUInt16LE(nameBytes.length, 26);
  localParts.push(local, nameBytes, body);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(dosTime, 12); central.writeUInt16LE(dosDate, 14); central.writeUInt32LE(checksum, 16);
  central.writeUInt32LE(body.length, 20); central.writeUInt32LE(body.length, 24); central.writeUInt16LE(nameBytes.length, 28); central.writeUInt32LE(offset, 42);
  centralParts.push(central, nameBytes);
  offset += local.length + nameBytes.length + body.length;
}
const central = Buffer.concat(centralParts);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.size, 8); end.writeUInt16LE(files.size, 10);
end.writeUInt32LE(central.length, 12); end.writeUInt32LE(offset, 16);
const archive = Buffer.concat([...localParts, central, end]);
if (archive.length >= 50 * 1024 * 1024) throw new Error(`Toy package is ${archive.length} bytes; it must stay below 50 MiB. No image format was changed and no package was written.`);
await mkdir(output, { recursive: true });
for (const [name, bytes] of files) {
  const destination = join(output, name);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, bytes);
}
await writeFile(zipPath, archive);
const packagedImageBytes = [...data.gallery, ...data.notices].reduce((sum, item) => sum + files.get(item.src).length, 0);
console.log(JSON.stringify({ output, zipPath, schemaVersion: data.schemaVersion, files: files.size, packageBytes: archive.length, websiteImageBytes: assetCheck.totalImageBytes, packagedImageBytes, galleryEncoding: losslessImageDir ? 'lossless-webp' : 'png', indexBytes: Buffer.byteLength(html), galleryImages: data.gallery.length, originalGalleryImages: data.gallery.filter(item => item.version === 'original').length, redactedGalleryImages: data.gallery.filter(item => item.version === 'redacted').length, noticeImages: data.notices.length, comments: data.comments.length }, null, 2));
