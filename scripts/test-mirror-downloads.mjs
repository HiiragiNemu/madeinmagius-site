import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderContent, serviceUrl } from '../assets/content.js';
import { onRequest } from '../functions/_middleware.js';

const origin = 'https://madeinmagius-site.pages.dev';
const snapshot = JSON.parse(await readFile(new URL('../data/releases.json', import.meta.url)));
const cases = [['bilibili','android'],['bilibili','userscript'],['bilibili','console'],
  ['netease','android-full'],['netease','windows'],['netease','python'],['netease','netease-verify'],
  ['exedra','exedra-downloads'],['home','magireco-private-server']];
for (const hostname of ['madeinmagius-site.pages.dev','hiiraginemu.github.io']) {
  globalThis.location = {hostname};
  assert.equal(serviceUrl('./api/magireco'), hostname.endsWith('github.io') ? origin+'/api/magireco' : './api/magireco');
  assert.equal(serviceUrl('https://example.com/file.apk'),'https://example.com/file.apk');
  for (const releases of [null, snapshot]) {
    for (const [program,sub] of cases) {
      const html=renderContent(program,sub,{releases,magireco:{state:'ready',version:'1.2.3',size:42,sha256:'a'.repeat(64),download:'./downloads/magireco/android?sha256='+'a'.repeat(64)}});
      assert.ok(!html.includes('href="#"'),`${hostname} ${program}/${sub}: no false download`);
      assert.ok(!html.includes('href="undefined"'));
      if (hostname.endsWith('github.io')) {
        assert.ok(!/(?:href|data-copy-url|data-copy-fallback)="\.\/downloads\//.test(html),`${program}/${sub}: mirror route`);
        if((sub!=='netease-verify'||releases) && !(program==='exedra' && releases)) assert.ok(html.includes(origin+'/downloads/'),`${program}/${sub}: service URL`);
      }
    }
  }
  console.log(hostname+': all download panels route correctly, with and without release metadata');
}
delete globalThis.location;
for (const status of [200,503]) {
  for (const path of ['/api/releases','/api/magireco','/downloads/bilibili-follower-snapshot-console.js','/downloads/bilibili-follower-snapshot-console.txt','/downloads/netease/python']) {
    const response=await onRequest({request:new Request(origin+path),next:async()=>new Response('fixture',{status,headers:{'cache-control':'no-store'}})});
    assert.equal(response.status,status);assert.equal(await response.text(),'fixture');
    assert.equal(response.headers.get('access-control-allow-origin'),path.includes('netease')?null:'https://hiiraginemu.github.io');
    assert.equal(response.headers.get('access-control-allow-credentials'),null);
    assert.equal(response.headers.get('cache-control'),'no-store');
  }
}
console.log('MIRROR_DOWNLOADS=PASS: both origins, all panels, loading fallback, public CORS success/error');

