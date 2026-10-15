import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { PROGRAMS, HOME_WEBSITES, renderContent } from '../assets/content.js';

assert.deepEqual(PROGRAMS.home.subs.map(s => s.id), ['welcome', 'magireco-private-server', 'universal-adv-reader', 'programs', 'contact']);
assert.equal(PROGRAMS.home.subs[0].label, '魔法纪录相关网站');
assert.equal(PROGRAMS.home.subs.find(s => s.id === 'programs').label, '资源比对与证据记录');
assert.equal(HOME_WEBSITES.length, 4);
assert.deepEqual(HOME_WEBSITES.map(s => new URL(s.url).hostname), [
  'magireader.pages.dev', 'magireco-call-search-cn.pages.dev', 'magius3dviewer.pages.dev',
  'magiaexedralive2dviewer.pages.dev',
]);
const home = renderContent('home', 'welcome', {});
assert.equal((home.match(/<article /g) || []).length, 4);
assert.equal((home.match(/target="_blank" rel="noopener noreferrer"/g) || []).length, 4);
for (const site of HOME_WEBSITES) assert.ok(home.includes('href="'+site.url+'"'));
assert.ok(!home.includes('MAGIUS LINK</h3>'));
assert.ok(!home.includes('madeinmagius-site.pages.dev'));
assert.ok(!home.includes('WELCOME'));
const future = renderContent('home', 'programs', {});
assert.ok(future.includes('资源比对与证据记录'));
assert.ok(future.includes('17 个分发包中有 10 个'));
assert.ok(future.includes('93 个反编译补丁类文件'));
assert.ok(future.includes('72 条资源命中对应 70 个受检文件'));
const reportPath = './assets/reports/resource-comparison-20261014.html';
assert.ok(future.includes('href="' + reportPath + '" target="_blank" rel="noopener noreferrer"'));
for (const base of ['https://madeinmagius-site.pages.dev/', 'https://hiiraginemu.github.io/madeinmagius-site/']) {
  assert.equal(new URL(reportPath, base).href, base + reportPath.slice(2));
}
const report = await readFile(new URL('../assets/reports/resource-comparison-20261014.html', import.meta.url));
assert.equal(report.length, 30761);
assert.equal(createHash('sha256').update(report).digest('hex'), '0c30d875c4e1d5876e3ee5cc2455ac7a2141e429d74ee5aabf514aa37b6e78c4');
assert.ok(!future.includes('工具清单'));
assert.equal((future.match(/<article /g) || []).length, 3);
assert.ok(future.includes('<img src="./assets/reports/response-final.png"'));
assert.ok(future.includes('download="response-final.png">保存图片'));
assert.ok(future.includes('download="response-final.txt">下载文字版'));
for (const [file, bytes, sha] of [
  ['resource-comparison-full.png', 2445595, 'dc16d22219867194bb18234354b45270cf113d3d8bb5e91f912ddd4623d1f3e7'],
  ['resource-comparison-thumbnail.webp', 47500, 'da66b63f5aa6aba228f7ad6affc54091567c87ea90e30655b7561329950971c6'],
  ['response-final.png', 1388103, '16369ff0838c4f13089c7046e6b835ba481477516369c42969fc42c9c9d16acb'],
  ['response-final.txt', 5011, '6180bb47399ebfc86abebecf33aca5cc5cd455c6a0b83383c95218150bc8eb19'],
]) {
  const data = await readFile(new URL('../assets/reports/' + file, import.meta.url));
  assert.equal(data.length, bytes);
  assert.equal(createHash('sha256').update(data).digest('hex'), sha);
  for (const base of ['https://madeinmagius-site.pages.dev/', 'https://hiiraginemu.github.io/madeinmagius-site/']) {
    assert.equal(new URL('./assets/reports/' + file, base).href, base + 'assets/reports/' + file);
  }
}
assert.ok(!future.includes('BILIBILI SNAPSHOT'));
assert.ok(renderContent('home', 'contact', {}).includes('CONTACT'));
// Do not claim newer APK behavior for old releases or unknown metadata.
function androidCopy(project, tag) {
  return renderContent(project, project === 'bilibili' ? 'android' : 'android-full', {
    releases: { projects: { [project]: { tag, assets: {} } } },
  });
}
for (const [tag, storageFix, startupCheck] of [
  ['v0.1.10', false, false], ['v0.1.11', true, false],
  ['v0.1.12', true, true], ['v0.2.0', true, true],
  ['v1.0.0', true, true], [null, false, false], ['invalid', false, false],
]) {
  const html = androidCopy('bilibili', tag);
  assert.equal(html.includes('默认 Download 始终优先使用 Android MediaStore'), storageFix, String(tag));
  assert.equal(html.includes('应用启动时会静默检查新版'), startupCheck, String(tag));
  assert.ok(html.includes('不要先卸载或清除数据'));
}
assert.ok(androidCopy('bilibili', 'v0.1.10').includes('该版本仍保持原有'));
assert.ok(androidCopy('bilibili', null).includes('版本信息就绪前'));
for (const [tag, startupCheck] of [
  ['v2.5.1', false], ['v2.5.2', false], ['v2.5.3', true],
  ['v2.6.0', true], ['v3.0.0', true], [null, false],
]) {
  const html = androidCopy('netease', tag);
  assert.ok(html.includes('NETEASE / ANDROID / ' + (tag || 'LATEST')));
  assert.equal(html.includes('应用启动时会静默检查新版'), startupCheck, String(tag));
}
assert.ok(androidCopy('netease', 'v2.5.2').includes('尚无启动更新提醒'));
const hostile = androidCopy('netease', '<img src=x onerror=alert(1)>');
assert.ok(!hostile.includes('<img src=x'));
assert.ok(hostile.includes('&lt;img'));
const verify = renderContent('netease', 'netease-verify', {
  releases: { projects: { netease: { tag: 'v2.5.3', assets: {} } } },
});
assert.ok(verify.includes('NETEASE / VERIFY / ANDROID v2.5.3'));
for (const [project, tag] of [['bilibili', 'v0.1.12'], ['netease', 'v2.5.3']]) {
  const html = androidCopy(project, tag);
  for (const text of ['暂不更新', '下载并校验', 'SHA-256', '原签名', 'Android 确认安装', '手动检查']) {
    assert.ok(html.includes(text), project + ': ' + text);
  }
}
console.log('RELEASE_COPY=PASS: old/current/future/unknown versions, escaped labels, optional verified updates');
const profile = renderContent('about', 'profile', {});
for (const phrase of [
  '我进行插画、角色创作和 Cosplay以及程序开发。',
  '可以阅读、搜索、互动和长期保存的数字项目。',
  '目前主要围绕《魔法纪录》《Magia Exedra》等作品进行开发。',
  '基于美服私服的中文化国服， L2D 网站，并整合 ADV 剧情播放。',
  '角色同时出场统计以及魔女文字 OCR',
  '更通用的 ADV 浏览器',
  '计划实现舞台调度、关键帧时间轴和完整的实时演出系统。',
  'Bilibili 粉丝取关记录与查询工具等。',
]) assert.ok(profile.includes(phrase), phrase);
assert.ok(!profile.includes('旧的独立工具站会逐步并入'));
const css = await readFile(new URL('../assets/styles.css', import.meta.url));
assert.equal(createHash('sha256').update(css).digest('hex'), '89b05c8471592e18b63549a6f2a6d80fdd25a294f63451cbbd062ae50b09dca2',
  'Keep the exact pre-softness CSS during this content-only change');
console.log('HOME_HUB=PASS: 4 external sites, separate private-server menu, report slot, profile, old hashes preserved');
console.log('IOS_ROLLBACK=PASS: stylesheet byte-identical to pre-softness version; no new optical changes');

const viewerPath = './assets/reports/resource-comparison-image.html';
assert.ok(future.indexOf('资源与客户端比对报告</h3>') < future.indexOf('原报告长图（匿名版）</h3>'));
assert.ok(future.indexOf('原报告长图（匿名版）</h3>') < future.indexOf('项目回应长图</h3>'));
assert.ok(future.includes('class="evidence-report-grid"'));
assert.ok(future.includes('class="evidence-response-card"') || future.includes('download-card evidence-response-card'));
assert.ok(future.includes('href="' + viewerPath + '"'));
assert.ok(future.includes('<img src="./assets/reports/resource-comparison-thumbnail.webp" width="600" height="600"'));
assert.ok(future.includes('download="resource-comparison-full.png"'));
const viewer = await readFile(new URL('../assets/reports/resource-comparison-image.html', import.meta.url), 'utf8');
assert.ok(viewer.includes('<h1>原报告长图（匿名版）</h1>'));
assert.ok(viewer.includes('src="./resource-comparison-full.png" width="1800" height="11132"'));
assert.ok(viewer.includes('download="resource-comparison-full.png">下载原图'));
assert.ok(!viewer.includes('.pdf'));
for (const base of ['https://madeinmagius-site.pages.dev/', 'https://hiiraginemu.github.io/madeinmagius-site/']) {
  const url = new URL(viewerPath, base);
  assert.equal(new URL('./resource-comparison-full.png', url).href, base + 'assets/reports/resource-comparison-full.png');
  assert.equal(new URL('../../#home/programs', url).href, base + '#home/programs');
}
const evidenceCss = await readFile(new URL('../assets/evidence.css', import.meta.url), 'utf8');
assert.ok(evidenceCss.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'));
assert.match(evidenceCss, /@media \(max-width: 900px\)\s*\{\s*\.evidence-report-grid \{ grid-template-columns: minmax\(0, 1fr\)/);
console.log('REPORT_IMAGE=PASS: separate original report and response, desktop/mobile CSS, static viewer and same-origin download links');

const adv=renderContent('home','universal-adv-reader',{});
assert.ok(adv.includes('https://universal-adv-reader.pages.dev/apps/web'));
for(const [program,sub] of [['home','contact'],['about','contact-about']]){const contact=renderContent(program,sub,{});assert.ok(contact.includes('加入群858083286'));assert.ok(contact.includes('inviteCode=2oaXZG3lL1g'));}
