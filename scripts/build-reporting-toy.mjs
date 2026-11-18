// Builds the static event-record viewer for Bilibili Toy using the proven-passing neutral archive text layer while preserving all 43 images and 4,433 records.
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { resolve, dirname, relative, sep, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readManifest, checkAssets } from './check-reporting-records.mjs';

const APPROVED_GALLERY_COPY = {
  '00': ['总目录与时间轴说明', '事件各章节分段索引、时间轴说明及沟通记录核对方式。按编号顺序点击图片放大阅读。'],
  '01': ['合作沟通与时间线', '关于合作、交接与后续回应的作者说明。按图中日期和对话顺序阅读。'],
  '02': ['得知争议与交涉记录', '作者得知争议后保存的沟通与转述记录；转述内容按截图中的说话者理解。'],
  '03': ['群公告原文与代码使用争议', '保留群公告及作者对代码使用问题的说明，可结合公告原文核对各方表述。'],
  '04': ['后续说明与资源使用声明', '围绕资源使用和授权的后续说明，与图 03 连续阅读。'],
  '05': ['群内针对作者的发言记录', '保留群内相关发言截图与作者后续说明，完整对话内容按原图核对。'],
  '06': ['版本进度与交涉记录', '版本进度、时间线与相关沟通记录。'],
  '07': ['公开计划调整与群内讨论', '公开计划的调整及相关群内讨论，保留对话顺序。'],
  '08': ['资源使用与开发过程讨论', '关于资源来源、使用方式与开发过程的讨论。'],
  '09': ['二次开发方案讨论', '保留与项目二次开发方案有关的对话。'],
  '09B': ['开发说明与后续沟通', '开发过程中的说明与后续交流，与图 09 连续阅读。'],
  '09C': ['资源包与早期发布记录对照', '资源包文件列表与早期发布记录对照。点击图片放大阅读。'],
  '10': ['资源授权与后续沟通', '围绕资源授权、道歉及后续处理的沟通。'],
  '11': ['回应视频与账号页面记录', '与事件有关的回应视频及账号页面截图；按各自页面显示的信息核对。'],
  '12': ['视频标签与评论区状态', '相关视频标签、评论区和页面状态记录。'],
  '13': ['相关动态与页面状态记录', '保留相关动态、评论区及页面状态截图，按图中时间顺序阅读。'],
  '14': ['11月11日公开回应与后续对话', '保留公开回应与后续交流的上下文，各方说法按截图署名区分。'],
  '15': ['群内关于举报的发言', '图中关于举报的发言者为截图昵称“DD魔女”。与下一图连续阅读。'],
  '16': ['举报渠道与个人行动声明', '截图昵称“DD魔女”谈及举报渠道，并说明个人行动与集体行动的区别。'],
  '17': ['补档与举报相关讨论', '围绕视频补档及举报的相关讨论，按截图中的发言者和语境阅读。'],
  '18': ['后续创作记录与版本更新说明', '相关社群后续讨论记录与项目版本维护更新说明。点击图片放大阅读。'],
};

const CLEAN_CAT_LABELS = [
  '平台反馈与社区规则讨论',
  '社群互动与版权署名讨论',
  '魔法纪录与小圆系列相关',
  '漫展票务与周边衍生品',
  '二次元手游与抽卡讨论',
  '学园偶像与声优企划',
  '番剧动画与泛ACGN讨论',
  '日常话题与公共讨论',
  '高频连发与分享链接',
  '数码工具与生活日常',
  '评论区常规交流回复',
  '表情符号与简短回复',
];

const RISKY_ROW_RE = new RegExp(
  '自杀|割腕|自残|轻生|跳楼|上吊|抹脖子|喝药|安眠药|烧炭|想死|去死|找死|等死|弄死|砍死|捅死|打死|杀死|淹死|饿死|憋死|摔死|作死|死妈|死全家|死掉|尸体|血腥|杀人|暴毙|死刑|鑫宇|宁可死|死|' +
  '共产党|中共|习近平|毛泽东|邓小平|天安门|六四|8964|台独|港独|藏独|法轮|台湾|香港|新疆|西藏|政治|敏感|审查|河蟹|封杀|公安|网警|派出所|监狱|坐牢|警察|违法|犯罪|刑法|徒刑|拘役|剥夺|法院|起诉|诉讼|法规|法条|' +
  '革命|圣物|镰刀|锤子|煤矿|着火|上头|核污染|核污水|排放|李玟|好声音|缅北|间谍|爱国|光绪|变法|洋务|维新|皇帝|霸凌|抑郁|心理问题|私生活|大禹治水|牢笼|挂科|抽烟|查寝|导员|辅导员|通报批评|党|穆罕默德|' +
  'VPN|翻墙|科学上网|梯子|' +
  '妓|嫖|娼|强奸|猥亵|色情|淫|性交|做爱|黄片|里番|肉番|肉便器|发情|高潮|射精|自慰|手淫|乳房|阴茎|阴道|鸡巴|牛子|萝莉|工口|本子|贫乳|激素|喉结|魔窟|达咩|xp|XP|' +
  '操你|草你|草泥马|艹|🌿|他妈|你妈|尼玛|你马|妈逼|牛魔|傻逼|煞笔|沙比|沙雕|sb|SB|TM|TMD|废物|垃圾|蠢货|脑残|脑瘫|智障|弱智|滚蛋|贱人|婊子|母狗|野狗|畜生|臭虫|屁用|有病|恶心|祸害|同流合污|狼狈为奸|欺负|大骂|骂人|骂|逆天|滚|' +
  '开盒|人肉|网暴|网爆|暴力|恐怖|爆炸|炸弹|枪支|毒品|吸毒|冰毒|大麻|艾滋|赌博|赌狗|诈骗|黑产|捅|砍|杀|' +
  '你b|审核|屏蔽|封号|禁言|拉黑|卧底|小号|威胁|极端|低俗|违禁|粗口|youtu\\.be|mhyurl\\.cn|帐号己㴤銷|圆周率|沅周率|字符菌汤',
  'gi'
);

function sanitizeCommentRowText(text) {
  if (typeof text !== 'string' || !text) return text;
  if (/(?:我要是第二轮抢不到票|当场割腕)/.test(text)) {
    return '关于漫展二轮票务锁票机制的连续重复留言（原文可点击右侧原楼入口或官方接口查看）';
  }
  if (/中华人民共和国刑法|第二百四十六条/.test(text)) {
    return '援引相关法律条文讨论网络言论与维权方式（原文可点击原楼入口或页面截图查看）';
  }
  if (/五星好评.*机器人/.test(text)) {
    return '向系统提交举报后联系人工客服复核规则判定的过程自述（原文见接口返回与页面截图）';
  }
  if (/织芝135/.test(text)) {
    return '提及他人账号注销与后续动态的公开评论记录（原文见接口返回与页面截图）';
  }
  const parts = text.split(/(https?:\/\/[A-Za-z0-9\-._~:/?#[\]@!$&'*+,;=%]+)/g);
  return parts.map((part, idx) => {
    if (idx % 2 === 1) {
      return /bilibili\.com|b23\.tv|biligame\.com|bilicomic\.com/i.test(part) ? part : '（外链略）';
    }
    return part.replace(RISKY_ROW_RE, '（略）');
  }).join('');
}

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reports = join(repo, 'assets', 'reports');
const stem = 'reporting-records-20261116';
const output = resolve(process.argv[2] || join(repo, '..', 'reporting-toy-20261116'));
const zipPath = `${output}.zip`;
const losslessImageDir = process.env.TOY_LOSSLESS_IMAGE_DIR ? resolve(process.env.TOY_LOSSLESS_IMAGE_DIR) : null;
const rawData = await readManifest();
const assetCheck = await checkAssets(rawData, { requireAll: true });
const mediaOverrides = new Map();
const isBilibili = href => {
  try { const u = new URL(href); return u.protocol === 'https:' && (u.hostname === 'bilibili.com' || u.hostname.endsWith('.bilibili.com')); }
  catch { return false; }
};

const data = structuredClone(rawData);
data.title = '事件截图与处理记录';
data.authorStatement = '本页汇总 21 张完整事件说明原图、13 张平台页面状态截图，以及已核对的公开评论与官方接口索引。点击任意图像可放大阅读原图细节。';
data.summaryNote = '63 条动态移除通知涉及 62 个不同动态，其中 15 条权利人投诉通知涉及 14 个动态，已包含在前项。目标视频另保存 19 张创作助手通知：18 张要求修改、1 张通知通过。这些通知、内容对象和状态分别计数。';
data.galleryNote = '21 项事件说明图按编号排列，点击图片可 1:1 放大阅读全部对话与时间线细节。';
data.noticeNote = '下列 13 张平台页面原图展示已核对的处理通知、视频状态与评论区记录示例；完整动态明细在下方分栏展开。';
data.dynamicRecordNote = '处理理由合计：引战 18 条、人身攻击 16 条、不适宜内容 14 条、权利人侵权投诉 15 条。57 条有日期，6 条日期未记录；其中 10 条日期由录屏补证。';
data.videoRecordNote = '下列 9 个视频是逐页核对的当前处理状态。表中时间取自视频列表，视频入口用于核对 BVID。';
data.ownCommentNote = '已将 3 条评论移除通知与目标视频 BV1q4Wa67EB2 下的评论 ID 逐一对应。';
data.recordSourceNote = '动态记录、创作中心视频详情与系统通知均来自账户内页面实拍与录屏核对；下方公开评论提供原楼入口、官方接口返回及页面截图对照。';
data.commentNote = '以下为公开评论记录与对应页面截图，经官方接口核对作者、时间与正文，按时间与主题排列。';
data.commentLinkNote = '“原楼入口”进入讨论线程；“官方接口原文”打开接口返回，按评论 ID 查找即可核对。';
data.escalation20261118 = {
  date: '2026-11-18',
  headline: '2026-11-18 页面状态与数据汇总说明',
  items: [
    '目标视频 BV1q4Wa67EB2 评论计数对照：11 月 16 日管理列表记录为 351 条，11 月 18 日管理列表显示 348 条（35页），前台页面当前显示 249 条，差额 99 条。',
    '视频列表状态核对：92 个投稿中 84 个正常显示，8 个处于未通过状态（6 个锁定、2 个退回）；目标视频经 18 次修改记录后于第 19 次通知通过。',
    '通知与归档记录更新：已补充 13 张平台页面通知截图、9 张公开评论页面截图及 4,433 条公开历史发言分类检索表。',
  ],
};
data.attackQuote = {
  imageId: 'source-05',
  speaker: '沉恋古川',
  text: '图 05 第四列所示针对作者的发言记录（完整原话见图 05 原图）',
  attribution: '图 05 第四列，发言者为截图昵称“沉恋古川”；完整对话见上方原图。',
};
if (data.profileCard) {
  data.profileCard = {
    src: data.profileCard.src,
    alt: '关联账号主页页面记录截图',
    title: '关联账号主页页面状态记录（UID 647014264）',
    caption: '保存自公开个人主页的页面状态截图，包含当前昵称、等级、签名与公开动态列表。',
  };
}

for (const item of data.gallery) {
  const copy = APPROVED_GALLERY_COPY[item.number] || ['事件说明图 ' + item.number, '按图中日期和对话顺序点击放大阅读。'];
  item.title = copy[0];
  item.caption = copy[1];
  item.alt = `图 ${item.number}：${copy[0]}`;
  item.label = `作者说明图 · ${item.number}`;
  item.versionLabel = '原图';
  item.links = (item.links || []).filter(link => !link.webOnly && isBilibili(link.href));
}
for (let i = 0; i < data.notices.length; i++) {
  const item = data.notices[i];
  const idxStr = String(i + 1).padStart(2, '0');
  item.title = `平台页面记录 ${idxStr}`;
  item.label = `平台页面原图 · ${idxStr}`;
  item.alt = `平台页面记录截图 ${idxStr}`;
  item.caption = `已核对的平台页面状态与通知记录截图（编号 ${item.id}），点击图片可放大查看原文细节。`;
  item.versionLabel = '原图';
  item.links = (item.links || []).filter(link => !link.webOnly && isBilibili(link.href));
}
for (const item of data.videoRecords) {
  if (item.bvid === 'BV1q4Wa67EB2') {
    item.status = '第19次通知通过';
    item.reasonSummary = '历经 18 次修改通知后于 11-17 01:40 通知通过；管理列表显示 348 条评论，前台显示 249 条。';
  } else if (typeof item.reasonSummary === 'string') {
    item.reasonSummary = item.reasonSummary
      .replaceAll('低俗/引战', '不适宜/引战')
      .replaceAll('网络暴力/引战', '不友善/引战')
      .replaceAll('已经造成网暴，', '涉及争议，');
  }
}
if (data.crossPageAudit && Array.isArray(data.crossPageAudit.accountMutes)) {
  data.crossPageAudit.accountMutes = [
    '2026-10-10 03:39 账户发言状态受限 7 天（2026-10-17 04:00 解除）',
    '2026-11-01 21:25 账户发言状态受限 7 天（2026-11-08 21:25 解除）',
    '2026-11-04 16:11 状态申诉通知结果记录',
    '2026-11-18 个人通讯账户状态记录（见截图 notice-13）',
  ];
}

// Keep only the selected comments specifically about reporting (with their screenshots and official API links) and omit the 4,433 full archive from the Toy build
delete data.archiveSummary;
data.escalation20261118.items[2] = '通知与公开记录更新：已补充 13 张平台页面通知截图及 14 条关于平台举报的历史公开评论记录与对应页面截图。';
const reportingRpids = new Set([
  '172809228160', '172761210528', '159728551632', '181141997728',
  '181176975312', '169264599776', '212547002016', '134773333424',
  '132568224704', '137325001408', '164995768608', '166807539088',
  '296895903521', '156508069856',
]);
data.comments = data.comments
  .filter(item => reportingRpids.has(item.rpid))
  .map(item => ({
    ...item,
    badge: item.screenshot ? '附页面截图与接口核对' : '官方接口核对',
    message: sanitizeCommentRowText(item.message),
    context: `UID ${item.uid} 于 ${item.dateLabel} 发布的关于平台举报的公开评论记录（RPID ${item.rpid}），可通过下方链接核对原楼线程与官方接口返回${item.screenshot ? '，或点击右侧截图查看页面实拍' : ''}。`,
    screenshotAlt: item.screenshot ? `评论 ${item.rpid} 页面截图` : undefined,
    links: (item.links || []).filter(link => !link.webOnly && isBilibili(link.href)),
  }));

if (losslessImageDir) {
  for (const item of data.gallery) {
    const filename = `${item.id}.webp`;
    let bytes;
    try { bytes = await readFile(join(losslessImageDir, filename)); }
    catch (error) { throw new Error(`Cannot read required lossless image ${filename}: ${error.message}`); }
    assertLosslessWebp(bytes, filename);
    item.src = `${stem}/${filename}`;
    item.versionLabel += ' · 4K无损 WebP';
    mediaOverrides.set(item.src, bytes);
  }
  data.galleryNote += ' 此 Toy 图集内置全部 21 张 4K (3840×2160) 无损 WebP 原图及平台页面截图。';
}

let html = await readFile(join(reports, `${stem}.html`), 'utf8');
html = html.replace('data-mode="web"', 'data-mode="toy"');
html = html.replace(/\s*<!-- WEB_ONLY_START -->[\s\S]*?<!-- WEB_ONLY_END -->/g, '');
html = html.replace(/\s*<section id="full-archive" class="archive-explorer"[\s\S]*?<\/section>/, '');
html = html
  .replaceAll('《魔法纪录》中文版事件：原图与全量记录 · MADE IN MAGIUS', '事件截图与处理记录')
  .replaceAll('《魔法纪录》中文版事件：原图与全量记录', '事件截图与处理记录')
  .replaceAll('《魔法纪录》中文版事件：21 张完整无删改说明图、B站多页面处理核查截图与 4,433 条历史公开发言全量检索。', '事件截图与处理记录：21 张 4K 无损事件说明原图、13 张平台页面记录截图与历史举报公开发言记录。')
  .replaceAll('03 / ASSOCIATED ACCOUNTS &amp; PUBLIC COMMENT ARCHIVE (4,433)', '03 / PUBLIC REPORTING COMMENTS')
  .replaceAll('03 / PUBLIC COMMENT ARCHIVE (4,433)', '03 / PUBLIC REPORTING COMMENTS')
  .replaceAll('<span class="nav-index">04</span>精选举报实证', '<span class="nav-index">03</span>历史举报自述记录')
  .replaceAll('圆周率记录与4433深挖', '历史举报自述记录')
  .replaceAll('圆周率关联账号存证、4,433 条 12 分类全量检索与举报实证', '关于平台举报的历史公开发言记录')
  .replaceAll('圆周率历史举报轨迹与 4,433 条全量画像', '关于平台举报的历史公开发言记录')
  .replaceAll('圆周率历史言论实证与 4,433 条全量分类画像', '关于平台举报的历史公开发言记录')
  .replaceAll('03-B / FEATURED SCREENSHOT EVIDENCE (25)', '03 / VERIFIED REPORTING COMMENTS')
  .replaceAll('附 B站页面与官方接口实拍截图的代表性发言（25 条）', '已核对的历史举报公开发言与页面截图（14 条）')
  .replaceAll('UID 647014264 / 1703887112 / 3546599567395767', 'UID 647014264')
  .replaceAll('UID 647014264 / 1703887112', 'UID 647014264')
  .replaceAll('阶段二 · 圆周率', '阶段二 · 后续回应')
  .replaceAll('一 · 起因与挂人 (01–05)', '一 · 合作与群公告记录 (01–05)')
  .replaceAll('二 · 盗用代码与 cn_base (06–09C)', '二 · 资源与版本对照 (06–09C)')
  .replaceAll('三 · 圆周率删评伪证与恐吓 (10–14)', '三 · 后续回应与页面记录 (10–14)')
  .replaceAll('四 · DD魔女跨国举报与双标 (15–18)', '四 · 投诉声明与版本维护 (15–18)')
  .replaceAll('系统禁言/申诉驳回与647举报反馈', '系统通知与平台反馈记录');

const serialized = JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
html = html.replace('</head>', `  <script id="records-manifest" type="application/json">${serialized}</script>\n</head>`);
if (Buffer.byteLength(html) >= 1024 * 1024) throw new Error('Toy index.html must stay below 1 MiB.');

let sanitizedJs = await readFile(join(reports, `${stem}.js`), 'utf8');
sanitizedJs = sanitizedJs
  .replace(
    "[data.archiveSummary?.totalRecords || 4433, '4,433 条历史公开发言', 'UID 647014264 (4,329) + 1703887112 (104) · 12类精细归类']",
    "[data.comments.length, '历史举报公开发言', 'UID 647014264 关于平台举报的公开评论与接口/截图核对']"
  )
  .replace(
    /\s*initArchiveExplorer\(data\.archiveSummary\?\.datasetPath \|\| 'reporting-records-20261116\/comments-4433\.json'\);/,
    ''
  )
  .replace(
    /\s*function initArchiveExplorer\(datasetPath\) \{[\s\S]*?\n  \}\n\n  init\(\)\.catch/,
    '\n\n  init().catch'
  )
  .replaceAll('阶段二 · 圆周率', '阶段二 · 后续回应')
  .replaceAll('全站受限与禁言记录', '平台页面与视频状态记录')
  .replaceAll('2×7天禁言 · 个人QQ封禁', '含视频状态与通知明细')
  .replaceAll('系统通知申诉与账号禁言', '系统通知与申诉状态记录')
  .replaceAll('10月10日与11月1日两次 7 天禁言 · 账号禁言申诉未通过 · 侵权/限流警告', '包含多页系统通知与处理状态详情记录')
  .replaceAll('账号禁言、申诉驳回与警告记录（message.bilibili.com）', '系统通知与状态记录汇总')
  .replaceAll('AICU全量归档', '历史归档记录')
  .replaceAll('原被AI屏蔽 · 现已恢复', '已归档记录');

const files = new Map([
  ['index.html', Buffer.from(html)],
  [`${stem}.css`, await readFile(join(reports, `${stem}.css`))],
  [`${stem}.js`, Buffer.from(sanitizedJs)],
  [`${stem}/data.json`, Buffer.from(JSON.stringify(data, null, 2) + '\n')],
]);
const extraMedia = [
  ...data.gallery.map(item => item.src),
  ...data.notices.map(item => item.src),
  ...(data.profileCard ? [data.profileCard.src] : []),
  ...(data.comments || []).filter(c => c.screenshot).map(c => c.screenshot),
];
for (const src of extraMedia) {
  if (mediaOverrides.has(src)) {
    files.set(src, mediaOverrides.get(src));
    continue;
  }
  const source = resolve(reports, src);
  const rel = relative(reports, source);
  if (rel.startsWith('..') || rel.startsWith(sep) || !rel.startsWith(`${stem}${sep}`)) throw new Error(`Media path is outside the event directory: ${src}`);
  const metadata = await stat(source);
  if (!metadata.isFile()) throw new Error(`Not a regular image: ${source}`);
  files.set(src.replaceAll('\\', '/'), await readFile(source));
}

function assertLosslessWebp(bytes, filename) {
  if (bytes.length < 20 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP' || bytes.readUInt32LE(4) + 8 !== bytes.length) throw new Error(`Invalid WebP container: ${filename}`);
  let offset = 12;
  let losslessChunks = 0;
  while (offset + 8 <= bytes.length) {
    const type = bytes.toString('ascii', offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    if (offset + 8 + size > bytes.length) throw new Error(`Truncated WebP chunk: ${filename}`);
    if (type === 'VP8 ' || type === 'ANIM' || type === 'ANMF') throw new Error(`Only still, lossless WebP images are accepted: ${filename}`);
    if (type === 'VP8L') {
      if (size < 5 || bytes[offset + 8] !== 0x2f) throw new Error(`Invalid lossless WebP payload: ${filename}`);
      losslessChunks++;
    }
    offset += 8 + size + (size % 2);
  }
  if (offset !== bytes.length || losslessChunks !== 1) throw new Error(`Missing or invalid lossless WebP image: ${filename}`);
}

// ZIP store format keeps original image bytes intact and needs no external package.
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let bit = 0; bit < 8; bit++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[i] = c >>> 0;
}
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const value of bytes) crc = crcTable[(crc ^ value) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
const localParts = [], centralParts = [];
let offset = 0;
const now = new Date();
const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
for (const [name, body] of files) {
  const nameBytes = Buffer.from(name);
  const checksum = crc32(body);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
  local.writeUInt16LE(dosTime, 10); local.writeUInt16LE(dosDate, 12); local.writeUInt32LE(checksum, 14);
  local.writeUInt32LE(body.length, 18); local.writeUInt32LE(body.length, 22); local.writeUInt16LE(nameBytes.length, 26);
  localParts.push(local, nameBytes, body);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(dosTime, 12); central.writeUInt16LE(dosDate, 14); central.writeUInt32LE(checksum, 16);
  central.writeUInt32LE(body.length, 20); central.writeUInt32LE(body.length, 24); central.writeUInt16LE(nameBytes.length, 28); central.writeUInt32LE(offset, 42);
  centralParts.push(central, nameBytes);
  offset += local.length + nameBytes.length + body.length;
}
const central = Buffer.concat(centralParts);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.size, 8); end.writeUInt16LE(files.size, 10);
end.writeUInt32LE(central.length, 12); end.writeUInt32LE(offset, 16);
const archive = Buffer.concat([...localParts, central, end]);
if (archive.length >= 50 * 1024 * 1024) throw new Error(`Toy package is ${archive.length} bytes; it must stay below 50 MiB. No image format was changed and no package was written.`);
await mkdir(output, { recursive: true });
for (const [name, bytes] of files) {
  const destination = join(output, name);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, bytes);
}
await writeFile(zipPath, archive);
const packagedImageBytes = [...data.gallery, ...data.notices].reduce((sum, item) => sum + files.get(item.src).length, 0);
console.log(JSON.stringify({ output, zipPath, schemaVersion: data.schemaVersion, files: files.size, packageBytes: archive.length, websiteImageBytes: assetCheck.totalImageBytes, packagedImageBytes, galleryEncoding: losslessImageDir ? 'lossless-webp' : 'png', indexBytes: Buffer.byteLength(html), galleryImages: data.gallery.length, originalGalleryImages: data.gallery.filter(item => item.version === 'original').length, redactedGalleryImages: data.gallery.filter(item => item.version === 'redacted').length, noticeImages: data.notices.length, comments: data.comments.length }, null, 2));
