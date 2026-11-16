import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const version = bytes => createHash('sha256').update(bytes).digest('hex').slice(0, 16);

export async function versionStaticAssets(directory) {
  const assets = path.join(directory, 'assets');
  let app = await readFile(path.join(assets, 'app.js'), 'utf8');
  const versions = {};
  await versionReportingPage(assets, versions);
  for (const name of ['content.js', 'effects.js', 'magireco-loader.js']) {
    versions[name] = version(await readFile(path.join(assets, name)));
    const expression = new RegExp('\\./' + name.replace('.', '\\.') + '(?:\\?[^\'\"]*)?', 'g');
    let matches = 0;
    app = app.replace(expression, () => { matches++; return './' + name + '?v=' + versions[name]; });
    if (matches !== 1) throw Error('Unexpected module import count: ' + name);
  }
  await writeFile(path.join(assets, 'app.js'), app);
  versions['app.js'] = version(app);
  versions['styles.css'] = version(await readFile(path.join(assets, 'styles.css')));
  let html = await readFile(path.join(directory, 'index.html'), 'utf8');
  for (const name of ['app.js', 'styles.css']) {
    const expression = new RegExp('\\./assets/' + name.replace('.', '\\.') + '(?:\\?[^\'\"\\s>]*)?', 'g');
    let matches = 0;
    html = html.replace(expression, () => { matches++; return './assets/' + name + '?v=' + versions[name]; });
    if (matches !== 1) throw Error('Unexpected HTML asset reference count: ' + name);
  }
  await writeFile(path.join(directory, 'index.html'), html);
  return versions;
}


// Version the report dependency graph before content.js/app.js, so an updated
// report also changes the URL users open from the terminal on either host.
async function versionReportingPage(assets, versions) {
  const stem = 'reporting-records-20261116';
  const directory = path.join(assets, 'reports');
  const htmlPath = path.join(directory, stem + '.html');
  let html;
  try {
    html = await readFile(htmlPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  for (const extension of ['css', 'js']) {
    const name = stem + '.' + extension;
    const key = 'reports/' + name;
    versions[key] = version(await readFile(path.join(directory, name)));
    const expression = new RegExp(name.replace('.', '\\.') + '(?:\\?[^\'\"\\s>]*)?', 'g');
    let matches = 0;
    html = html.replace(expression, () => { matches++; return name + '?v=' + versions[key]; });
    if (matches !== 1) throw Error('Unexpected report asset reference count: ' + name);
  }
  await writeFile(htmlPath, html);
  const htmlKey = 'reports/' + stem + '.html';
  versions[htmlKey] = version(html);
  const contentPath = path.join(assets, 'content.js');
  let content = await readFile(contentPath, 'utf8');
  const entry = './assets/reports/' + stem + '.html';
  const entryPattern = new RegExp('\\./assets/reports/' + stem + '\\.html(?:\\?[^\'\"\\s<>]*)?', 'g');
  let entries = 0;
  content = content.replace(entryPattern, () => { entries++; return entry + '?v=' + versions[htmlKey]; });
  if (entries !== 1) throw Error('Unexpected report entry count in content.js');
  await writeFile(contentPath, content);
}
