import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { PROGRAMS, HOME_WEBSITES, renderContent } from '../assets/content.js';

assert.deepEqual(PROGRAMS.home.subs.map(s => s.id), ['welcome', 'programs', 'contact']);
assert.equal(PROGRAMS.home.subs[0].label, '魔法纪录系列网站');
assert.equal(PROGRAMS.home.subs[1].label, '未来将添加更多网站');
assert.equal(HOME_WEBSITES.length, 5);
assert.deepEqual(HOME_WEBSITES.map(s => new URL(s.url).hostname), [
  'magireader.pages.dev', 'magireco-call-search-cn.pages.dev', 'magius3dviewer.pages.dev',
  'magiaexedralive2dviewer.pages.dev', 'madeinmagius-site.pages.dev',
]);
const home = renderContent('home', 'welcome', {});
assert.equal((home.match(/<article /g) || []).length, 5);
assert.equal((home.match(/target="_blank" rel="noopener noreferrer"/g) || []).length, 4);
for (const site of HOME_WEBSITES.filter(s => !s.current)) assert.ok(home.includes('href="'+site.url+'"'));
for (const link of ['#bilibili/android', '#netease/android-full', '#exedra/exedra-downloads']) assert.ok(home.includes('href="'+link+'"'));
assert.ok(!home.includes('WELCOME'));
const future = renderContent('home', 'programs', {});
assert.ok(future.includes('未来将添加更多网站'));
assert.ok(!future.includes('工具清单'));
assert.ok(!future.includes('BILIBILI SNAPSHOT'));
assert.ok(renderContent('home', 'contact', {}).includes('CONTACT'));
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
console.log('HOME_HUB=PASS: 5 sites, 4 external + 3 existing download links, future slot, profile, old hashes preserved');
console.log('IOS_ROLLBACK=PASS: stylesheet byte-identical to pre-softness version; no new optical changes');
