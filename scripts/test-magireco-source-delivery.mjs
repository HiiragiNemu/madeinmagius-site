import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { renderContent } from '../assets/content.js';

const root = 'https://github.com/HiiragiNemu/ProgettoMagius-1/releases/download/latest/';
const sourceName = 'magireco-legacy-client-1.3.9-corresponding-source-current-r4.zip';
const sourceHash = '0cbb1990c7741a2dc3078bce37bc6914af340986eb526926fca36f762884ccaa';
const apkHash = 'fa5a29fb3a861573e92b322b3827cbb5398ee1d4cd510f181cec406560701220';
const detail = './assets/magireco-source-1.3.9-r4.html';
const current = {state:'ready',version:'1.3.9',sha256:apkHash,size:134604104,download:'./downloads/magireco/android?sha256='+apkHash};
const render = release => renderContent('home','magireco-private-server',{magireco:release});

test('exact ready 1.3.9 APK gets separate r4 source and explanation next to download', () => {
  const html = render(current);
  assert.ok(html.includes('href="'+root+sourceName+'"'));
  assert.ok(html.includes('href="'+detail+'"'));
  assert.ok(html.includes('385,379,111'));
  assert.ok(html.includes('SHA-256: '+apkHash));
  assert.ok(!html.includes('源码交付方式调整中。'));
});

for (const [name, overrides] of Object.entries({
  'future 1.4.0 with reused hash':{version:'1.4.0'},
  'future 2.0.0 with reused hash':{version:'2.0.0'},
  'historical 1.3.8':{version:'1.3.8'},
  'same version wrong hash':{sha256:'0'.repeat(64)},
  'same version missing hash':{sha256:undefined},
  'same version wrong size':{size:134604105},
  'loading metadata':{state:'loading'},
  'error metadata':{state:'error'},
})) {
  test('never binds r4 source to '+name, () => {
    const release = {...current,...overrides};
    const html = render(release);
    assert.ok(!html.includes(sourceName));
    assert.ok(!html.includes(detail));
    if (release.state === 'ready') assert.ok(html.includes('该版本的完整对应源码入口待恢复。'));
  });
}

test('historical report keeps its existing 1.1.1 source-withdrawal state', () => {
  const html = renderContent('home','programs',{});
  assert.ok(html.includes('历史 1.1.1 APK'));
  assert.ok(html.includes('源码交付方式调整中。'));
  assert.ok(!html.includes(sourceName));
});

test('fixed download page and detail page identify the exact r4 archive', async () => {
  for (const file of ['magireco-direct-downloads-20261029.html','magireco-source-1.3.9-r4.html']) {
    const html = await readFile(new URL('../assets/'+file,import.meta.url),'utf8');
    for (const required of [root+sourceName,sourceHash,'385,379,111',apkHash]) assert.ok(html.includes(required),file+': '+required);
  }
});

test('detail page pins both external inputs and independent build scope', async () => {
  const html = await readFile(new URL('../assets/magireco-source-1.3.9-r4.html',import.meta.url),'utf8');
  for (const required of [root+'frontend-supplement-exact-r7.zip','335,109,307',
    '1139358c5e6b8d03c4a3e71ebfe3dcf460d7d5a69da39aa743c74665bbfeb1b5',
    root+'magireco-legacy-client-1.1.9.apk','94,360,121',
    'bda60d8afda79d95bd4f9f5899270cc66107268008d335d744b75a486eb6a020',
    '3,484','294','493','README-BUILD.md','EXTERNAL-INPUTS.json',
    'build/rebuild139.py --verify-inputs-only','--mode full-unsigned','build/finish-source-apk.py',
    '不需要私有历史 APK 或生产私钥','未签名产物','不是旧签名发布元数据',
    '不表示全部历史版本源码已经恢复','不因纳入构建而由本项目重新许可']) assert.ok(html.includes(required),required);
  assert.ok(!/[A-Za-z]:[\\/]/.test(html.replaceAll('https://','')),'No private filesystem paths');
  assert.ok(!html.includes('已完成设备验收'));
});

test('signed source metadata is not relabeled as r4', async () => {
  const metadata = await readFile(new URL('../data/magireco-release.signed.json',import.meta.url),'utf8');
  assert.ok(!metadata.includes(sourceName));
  assert.ok(!metadata.includes(sourceHash));
});
