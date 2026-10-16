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
assert.ok(future.includes('196 个反编译补丁类文件'));
assert.ok(future.includes('72 条资源命中对应 70 个受检文件'));
const reportPath = './assets/reports/resource-comparison-20261014.html';
assert.ok(future.includes('href="' + reportPath + '" target="_blank" rel="noopener noreferrer"'));
for (const base of ['https://madeinmagius-site.pages.dev/', 'https://hiiraginemu.github.io/madeinmagius-site/']) {
  assert.equal(new URL(reportPath, base).href, base + reportPath.slice(2));
}
const report = await readFile(new URL('../assets/reports/resource-comparison-20261014.html', import.meta.url));
assert.equal(report.length, 33528);
assert.equal(createHash('sha256').update(report).digest('hex'), '623410256c0b0acd6b227c0ffca908e03683804bb01489c729863090d334403f');
assert.ok(!future.includes('工具清单'));
assert.equal((future.match(/<article /g) || []).length, 3);
assert.ok(future.includes('<img src="./assets/reports/project-response-20261017-thumbnail.webp"'));
assert.ok(future.includes('download="project-response-20261017.png">保存图片'));
assert.ok(future.includes('download="project-response-20261017.txt">下载文字版'));
for (const [file, bytes, sha] of [
  ['resource-comparison-full.png', 2892144, '13fe9bd00b4965933f3e992efc98ab8161c853ff014cc3490689dc2e2003f482'],
  ['resource-comparison-thumbnail.webp', 42736, '0ddd4fe058e13d525450b36f6aa5384e16a33ec90d3670559e43249376d5540f'],
  ['response-final.png', 1752944, '3bbec8ce0415e0da8513e07252d38a5168743e120051618cb81b6d9f3c5f8080'],
  ['response-final.txt', 6390, 'd668fdb7c0a9c2278fdcb376f5ff55532cc672f99b684f496992643c770ff8ab'],
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

const viewerPath = './assets/reports/forensic-report-20261017-image.html';
assert.ok(future.indexOf('资源与客户端比对报告</h3>') < future.indexOf('原报告长图（匿名版）</h3>'));
assert.ok(future.indexOf('原报告长图（匿名版）</h3>') < future.indexOf('项目回应长图</h3>'));
assert.ok(future.includes('class="evidence-report-grid"'));
assert.ok(future.includes('class="evidence-response-card"') || future.includes('download-card evidence-response-card'));
assert.ok(future.includes('href="' + viewerPath + '"'));
assert.ok(future.includes('<img src="./assets/reports/forensic-report-20261017-thumbnail.webp" width="600" height="600"'));
assert.ok(future.includes('download="forensic-report-20261017.png"'));
const viewer = await readFile(new URL('../assets/reports/forensic-report-20261017-image.html', import.meta.url), 'utf8');
assert.ok(viewer.includes('<title>公开取证核查报告 · 完整长图</title>'));
assert.ok(viewer.includes('src="forensic-report-20261017.png" width="1800" height="13661"'));
assert.ok(viewer.includes('href="forensic-report-20261017.png" download>下载完整长图'));
assert.ok(viewer.includes('href="forensic-report-20261017.pdf" download>下载 PDF'));
for (const base of ['https://madeinmagius-site.pages.dev/', 'https://hiiraginemu.github.io/madeinmagius-site/']) {
  const url = new URL(viewerPath, base);
  assert.equal(new URL('./forensic-report-20261017.png', url).href, base + 'assets/reports/forensic-report-20261017.png');
  assert.equal(new URL('../../#home/programs', url).href, base + '#home/programs');
}
const evidenceCss = await readFile(new URL('../assets/evidence.css', import.meta.url), 'utf8');
assert.ok(evidenceCss.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'));
assert.match(evidenceCss, /@media \(max-width: 900px\)\s*\{\s*\.evidence-report-grid \{ grid-template-columns: minmax\(0, 1fr\)/);
console.log('REPORT_IMAGE=PASS: separate original report and response, desktop/mobile CSS, static viewer and same-origin download links');

const adv=renderContent('home','universal-adv-reader',{});
assert.ok(adv.includes('https://universal-adv-reader.pages.dev/apps/web'));
for(const [program,sub] of [['home','contact'],['about','contact-about']]){const contact=renderContent(program,sub,{});assert.ok(contact.includes('加入群858083286'));assert.ok(contact.includes('inviteCode=2oaXZG3lL1g'));}

// First report refresh is independent of the retained original report and response.
const firstReportFiles = [["resource-client-comparison-20261017.html", 33528, "623410256c0b0acd6b227c0ffca908e03683804bb01489c729863090d334403f"], ["resource-client-comparison-20261017.png", 2387588, "36f8b89f3079b35cbd2d01cbef03a17fd24fdc24e3072678d4198a35610e53a5"], ["resource-client-comparison-20261017.pdf", 414989, "577508f156d7e0d6661d4b0dbd028b86bb0ff3a19fe247b28a3105e9c4eaed3e"], ["resource-client-comparison-20261017.txt", 11540, "c71b4c57614a95bdad0feb9de0ff0f56a8ef2d5ffd7494911b84c7b70d1b9f7d"], ["resource-client-comparison-20261017-thumbnail.webp", 38812, "36825c1cafd8b9e625d75a27163a5e25937d811ae133b0e1a5da6c69392b09ba"], ["resource-client-comparison-20261017-image.html", 909, "1d30ad4d5003ccd2eec724c211afe71d08e2c5359da2c326cfac243796d9843d"], ["client-111-reproduce.html", 21918, "761277c869744347f98995bb17f23551ad4e1ba5da58db0b7656d0098e276155"], ["reproduce-client-1.1.1.zip", 47555, "4d112af7a6d1a86bca8dc6dfa1fc180ef2ef290828e61a62339c62f49c7e58e6"]];
for (const [file, size, sha] of firstReportFiles) {
  const bytes = await readFile(new URL('../assets/reports/' + file, import.meta.url));
  assert.equal(bytes.length, size, file);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), sha, file);
}
assert.deepEqual(report, await readFile(new URL('../assets/reports/resource-client-comparison-20261017.html', import.meta.url)));
for (const link of ['resource-client-comparison-20261017-image.html', 'resource-client-comparison-20261017.png', 'resource-client-comparison-20261017.pdf', 'client-111-reproduce.html']) {
  assert.ok(future.includes('./assets/reports/' + link), link);
}
const reproduction = await readFile(new URL('../assets/reports/client-111-reproduce.html', import.meta.url), 'utf8');
for (const suffix of ['1.1.1-evidence', '1.1.1-evidence-source']) {
  assert.ok(reproduction.includes('https://madeinmagius-site.pages.dev/downloads/pinned/magireco/' + suffix));
}
const pinned = (await import('../data/pinned-assets.js')).default;
const pinnedRoute = await import('../functions/downloads/pinned/[project]/[version].js');
for (const [version, id, size, sha, name] of [
  ['1.1.1-evidence', 648431048, 103821876, '60031daf95e42448f4ddb2d80a1b0b08f007734a488e0b7318a4decc20a02815', 'magireco-personal-1.1.1-evidence.apk'],
  ['1.1.1-evidence-source', 648432154, 61686724, 'ad9899a1b2af0ac1c45a4f316cf655dcd3c94293814b12e6aeeb375c2641b513', 'magireco-legacy-client-1.1.1-corresponding-source.zip'],
]) {
  const asset = pinned['magireco/' + version];
  assert.equal(asset.url, 'https://api.github.com/repos/HiiragiNemu/ProgettoMagius-1/releases/assets/' + id);
  assert.equal(asset.size, size);
  assert.equal(asset.digest, 'sha256:' + sha);
  assert.equal(asset.name, name);
  const context = {params:{project:'magireco',version}, env:{GITHUB_RELEASES_TOKEN:'local-test-only'}, request:new Request('https://example.test/downloads/pinned/magireco/' + version)};
  const head = await pinnedRoute.onRequestHead(context);
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('content-length'), String(size));
  assert.equal(head.headers.get('x-release-digest'), 'sha256:' + sha);
  assert.ok(head.headers.get('content-disposition').includes(name));
  const savedFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, asset.url);
      assert.equal(new Headers(init.headers).get('range'), 'bytes=0-1');
      return new Response('PK', {status:206, headers:{'content-range':'bytes 0-1/' + size, 'content-length':'2','accept-ranges':'bytes'}});
    };
    const response = await pinnedRoute.onRequestGet({...context, request:new Request(context.request.url,{headers:{Range:'bytes=0-1'}})});
    assert.equal(response.status, 206);
    assert.equal(response.headers.get('content-range'), 'bytes 0-1/' + size);
    assert.equal(await response.text(), 'PK');
  } finally { globalThis.fetch = savedFetch; }
}
console.log('FIRST_REPORT_111=PASS: frozen 8 files, old URL alias, mirror links, fixed historical APK/source HEAD and Range');

const secondReportFiles = [["forensic-report-20261017.html", 38108, "233fb21f4fcb608d303d03bd5d4c4c12167e1344ccecc5d401526a32e9612897"], ["forensic-report-20261017.png", 2892144, "13fe9bd00b4965933f3e992efc98ab8161c853ff014cc3490689dc2e2003f482"], ["forensic-report-20261017.pdf", 478504, "b0cf03e199108515fd86e6d209b5ec6c8a99adf20c60ea2864f8fd234b23bad0"], ["forensic-report-20261017.txt", 14184, "8d6d166c74009ecdaf85d10b79a6bb1676c195877b1fe4e009b24474884e2cc9"], ["forensic-report-20261017-thumbnail.webp", 42736, "0ddd4fe058e13d525450b36f6aa5384e16a33ec90d3670559e43249376d5540f"], ["forensic-report-20261017-image.html", 860, "f300de290ec1dc2aaaddb36d414586435fa3609706a073d8a397c494d6a7f118"]];
for (const [file, size, sha] of secondReportFiles) {
  const bytes = await readFile(new URL('../assets/reports/' + file, import.meta.url));
  assert.equal(bytes.length, size, file);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), sha, file);
}
for (const [legacy, current] of [
  ['resource-comparison-full.png', 'forensic-report-20261017.png'],
  ['resource-comparison-thumbnail.webp', 'forensic-report-20261017-thumbnail.webp'],
  ['resource-comparison-image.html', 'forensic-report-20261017-image.html'],
]) {
  assert.deepEqual(await readFile(new URL('../assets/reports/' + legacy, import.meta.url)), await readFile(new URL('../assets/reports/' + current, import.meta.url)));
}
for (const extension of ['html', 'png', 'pdf', 'txt']) assert.ok(future.includes('./assets/reports/forensic-report-20261017.' + extension));
console.log('SECOND_REPORT=PASS: 6 frozen files, 3 legacy aliases, independent HTML/image/PDF/TXT entries');

const thirdResponseFiles = [["project-response-20261017.html", 12006, "f9fe961504c18c8df483644ced144f0c2887f9e26e05df4993a5c19721d2397a"], ["project-response-20261017.png", 1752944, "3bbec8ce0415e0da8513e07252d38a5168743e120051618cb81b6d9f3c5f8080"], ["project-response-20261017.pdf", 351221, "f69ae2af743328e7382144400e9d108f9641f7aab1866f031e7c934c0b702a3c"], ["project-response-20261017.txt", 6390, "d668fdb7c0a9c2278fdcb376f5ff55532cc672f99b684f496992643c770ff8ab"], ["project-response-20261017-thumbnail.webp", 68148, "d3161de05c8d66645c69828bd6ca547c7c5af4e545dcb6b34e16a23040d5acce"], ["project-response-20261017-image.html", 914, "feba48f06ba8afc719eefe08cdcf89047f8432ca5c5c0f8c12b88b71fa0dc190"]];
for (const [file, size, sha] of thirdResponseFiles) {
  const bytes = await readFile(new URL('../assets/reports/' + file, import.meta.url));
  assert.equal(bytes.length, size, file);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), sha, file);
}
for (const extension of ['png', 'txt']) {
  assert.deepEqual(await readFile(new URL('../assets/reports/response-final.' + extension, import.meta.url)), await readFile(new URL('../assets/reports/project-response-20261017.' + extension, import.meta.url)));
}
for (const extension of ['html', 'png', 'pdf', 'txt']) assert.ok(future.includes('./assets/reports/project-response-20261017.' + extension));
assert.ok(future.includes('href="./assets/reports/project-response-20261017-image.html"'));
assert.ok(future.includes('2026-10-14 · 回应长图</p><h3>项目回应长图</h3>'));
const responseViewer = await readFile(new URL('../assets/reports/project-response-20261017-image.html', import.meta.url), 'utf8');
assert.ok(responseViewer.includes('src="project-response-20261017.png" width="1800" height="6774"'));
assert.ok(responseViewer.includes('href="project-response-20261017.png" download>下载完整长图'));
console.log('THIRD_RESPONSE=PASS: 6 frozen files, 2 legacy aliases, scrolling viewer, original date, all formats linked');
