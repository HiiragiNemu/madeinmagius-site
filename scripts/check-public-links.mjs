import { readFile } from 'node:fs/promises';

const data = JSON.parse(await readFile('data/releases.json','utf8'));
const urls = [];

for (const [projectName, project] of Object.entries(data.projects || {})) {
  for (const [assetName, asset] of Object.entries(project.assets || {})) {
    if (!asset?.browser_download_url) continue;
    urls.push({ projectName, assetName, url: asset.browser_download_url });
  }
}

let failures = 0;
for (const entry of urls) {
  try {
    const response = await fetch(entry.url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: { 'user-agent': 'MagiusLink-LinkCheck/1.0' }
    });
    const ok = response.status >= 200 && response.status < 400;
    console.log(`${ok ? 'OK' : 'FAIL'} ${response.status} ${entry.projectName}/${entry.assetName} ${entry.url}`);
    if (!ok) failures += 1;
  } catch (error) {
    failures += 1;
    console.error(`FAIL ERR ${entry.projectName}/${entry.assetName} ${entry.url} :: ${error.message}`);
  }
}

if (failures) {
  throw new Error(`${failures} public download link(s) failed`);
}
console.log(`verified ${urls.length} public download links`);
