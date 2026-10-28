import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const version = bytes => createHash('sha256').update(bytes).digest('hex').slice(0, 16);

export async function versionStaticAssets(directory) {
  const assets = path.join(directory, 'assets');
  let app = await readFile(path.join(assets, 'app.js'), 'utf8');
  const versions = {};
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
