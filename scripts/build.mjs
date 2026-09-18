import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const checkOnly = process.argv.includes('--check');
const required = ['index.html','assets/styles.css','assets/app.js','data/releases.json'];
for (const path of required) {
  if (!existsSync(path)) throw new Error(`Missing required site file: ${path}`);
}

const index = await readFile('index.html','utf8');
for (const token of ['./assets/styles.css','./assets/app.js','PROGRAM INDEX','BILIBILI SNAPSHOT','NETEASE EXPORTER']) {
  if (!index.includes(token)) throw new Error(`index.html missing required token: ${token}`);
}
for (const rejected of ['独立分发','HTTPS 直链','本站直链','版本可核对']) {
  if (index.includes(rejected)) throw new Error(`rejected homepage copy returned: ${rejected}`);
}
JSON.parse(await readFile('data/releases.json','utf8'));

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

for (const [route,hash] of [['tools/bilibili','bilibili'],['tools/netease','netease'],['about','about']]) {
  const dir=`dist/${route}`;
  await mkdir(dir,{recursive:true});
  await writeFile(`${dir}/index.html`,`<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><script>location.replace('../../#${hash}')</script><a href="../../#${hash}">Open MadeInMagius Terminal</a>`);
}
console.log('built dist/');
