import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const checkOnly = process.argv.includes('--check');
const required = [
  'index.html',
  'assets/styles.css',
  'assets/app.js',
  'assets/content.js',
  'assets/effects.js',
  'assets/magius-mark.svg',
  'assets/magius-link-wordmark.svg',
  'assets/lofi-grain.svg',
  'assets/fonts/night-pixel/fusion-pixel-12px-monospaced-zh_hans.2026.07.20.woff2',
  'assets/fonts/night-pixel/fusion-pixel-12px-monospaced-ja.2026.07.20.woff2',
  'assets/fonts/night-pixel/OFL.txt',
  'data/releases.json',
  'data/exedra-docs.json',
  'data/exedra-integrity.json',
];
for (const path of required) {
  if (!existsSync(path)) throw new Error(`Missing required site file: ${path}`);
}

const index = await readFile('index.html','utf8');
for (const token of ['./assets/styles.css','./assets/app.js','FOLDERS','BILIBILI','NETEASE','EXEDRA TW / JP','MADE IN MAGIUS']) {
  if (!index.includes(token)) throw new Error(`index.html missing required token: ${token}`);
}
for (const rejected of ['独立分发','HTTPS 直链','本站直链','版本可核对','左侧选择程序，连接线会点亮']) {
  if (index.includes(rejected)) throw new Error(`rejected homepage copy returned: ${rejected}`);
}
const contentSource = await readFile('assets/content.js','utf8');
if (contentSource.includes('github.com/HiiragiNemu/Bilibili-Follower-Snapshot#readme')) {
  throw new Error('private Bilibili repository link returned to public UI');
}
const releaseData = JSON.parse(await readFile('data/releases.json','utf8'));
const exedraDocs = JSON.parse(await readFile('data/exedra-docs.json','utf8'));
const exedraIntegrity = JSON.parse(await readFile('data/exedra-integrity.json','utf8'));

const requiredDocIds = ['tw-mumu','tw-phone','jp-android','steam','tw-client-113','tw-demo','tw-mumu-en','tw-phone-en'];
const availableDocIds = new Set((exedraDocs.docs || []).map(item => item.id));
for (const id of requiredDocIds) {
  if (!availableDocIds.has(id)) throw new Error(`Missing migrated Exedra guide: ${id}`);
}
for (const key of ['twManifest','jpManifest','twSums','jpSums','twVerification','jpVerification']) {
  if (!exedraIntegrity.files?.[key]?.content) throw new Error(`Missing Exedra integrity record: ${key}`);
}
for (const project of ['bilibili','netease','exedra']) {
  if (!releaseData.projects?.[project]) throw new Error(`Missing release project: ${project}`);
}

if (checkOnly) {
  console.log('site source check: ok');
  process.exit(0);
}

await rm('dist',{ recursive:true, force:true });
await mkdir('dist',{ recursive:true });
await cp('index.html','dist/index.html');
await cp('assets','dist/assets',{ recursive:true });
await cp('data','dist/data',{ recursive:true });
await writeFile('dist/.nojekyll','');
await writeFile('dist/404.html',`<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><script>
const base = location.pathname.includes('/madeinmagius-site/') ? '/madeinmagius-site/' : '/';
location.replace(base);
</script><a href="./">Open MadeInMagius Terminal</a>`);
await writeFile('dist/_headers',`/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Cross-Origin-Opener-Policy: same-origin-allow-popups
/assets/*
  Cache-Control: public, max-age=3600
/data/*
  Cache-Control: public, max-age=300
`);
await writeFile('dist/_routes.json',JSON.stringify({
  version:1,
  include:['/api/*','/downloads/*'],
  exclude:['/assets/*','/data/*']
},null,2)+'\n');

for (const [route,hash] of [['tools/bilibili','bilibili'],['tools/netease','netease'],['tools/exedra','exedra'],['about','about']]) {
  const dir=`dist/${route}`;
  await mkdir(dir,{recursive:true});
  await writeFile(`${dir}/index.html`,`<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><script>location.replace('../../#${hash}')</script><a href="../../#${hash}">Open MadeInMagius Terminal</a>`);
}
console.log('built dist/');
