import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { PROGRAMS, HOME_WEBSITES, renderContent } from '../assets/content.js';

assert.deepEqual(PROGRAMS.home.subs.map(s => s.id), ['welcome', 'magireco-private-server', 'programs', 'contact']);
assert.equal(PROGRAMS.home.subs[0].label, '魔法纪录相关网站');
assert.equal(PROGRAMS.home.subs[2].label, '未来将添加更多网站');
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
assert.ok(future.includes('未来将添加更多网站'));
assert.ok(!future.includes('工具清单'));
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
console.log('HOME_HUB=PASS: 4 external sites, separate private-server menu, future slot, profile, old hashes preserved');
console.log('IOS_ROLLBACK=PASS: stylesheet byte-identical to pre-softness version; no new optical changes');
