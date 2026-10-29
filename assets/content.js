// Static GitHub Pages has no Functions. Keep static files local, but route
// release metadata and files to the existing Cloudflare download service.
export function serviceUrl(path, page = typeof location === 'undefined' ? null : location) {
  if (page?.hostname === 'hiiraginemu.github.io' && /^(?:\.\/|\/)?(?:api|downloads)\//.test(path)) {
    return 'https://madeinmagius-site.pages.dev/' + path.replace(/^(?:\.\/|\/)/, '');
  }
  return path;
}

// Add future website entries here; keep the existing HOME hash routes stable.
export const HOME_WEBSITES = [
  { title: 'MAGIREADER', description: '魔法纪录剧情中日双语阅读网站', url: 'https://magireader.pages.dev/' },
  { title: '角色称呼与身高查询', description: '魔法少女称呼关系搜索与身高对比网站', url: 'https://magireco-call-search-cn.pages.dev/' },
  { title: 'MAGIUS 3D VIEWER', description: 'Magia Exedra 3D 网站', url: 'https://magius3dviewer.pages.dev/' },
  { title: 'LIVE2D / ADV', description: '魔法纪录 / Magia Exedra Live2D 和战斗小人网站，含剧情播放功能', url: 'https://magiaexedralive2dviewer.pages.dev/' },
];

export const PROGRAMS = {
  home: { subs: [
    { id: 'welcome', label: '魔法纪录相关网站', note: '作品导航' },
    { id: 'magireco-private-server', label: '魔法纪录中文化私服', note: 'APK / 教程' },
    { id: 'universal-adv-reader', label: '通用 ADV 阅读网站', note: 'Narcissu / KANA' },
    { id: 'programs', label: '资源比对与证据记录', note: '报告' },
    { id: 'contact', label: 'CONTACT', note: '联系' }
  ]},
  bilibili: { subs: [
    { id: 'android', label: 'ANDROID APK', note: '伴侣应用' },
    { id: 'userscript', label: 'USERSCRIPT', note: '浏览器脚本' },
    { id: 'console', label: 'F12 CONSOLE', note: '桌面临时运行' },
    { id: 'bili-guide', label: 'USAGE', note: '完整使用说明' }
  ]},
  netease: { subs: [
    { id: 'android-full', label: 'ANDROID', note: '完整版 APK' },
    { id: 'windows', label: 'WINDOWS X64', note: '免安装 ZIP' },
    { id: 'python', label: 'PYTHON', note: 'ZIP / wheel' },
    { id: 'netease-verify', label: 'VERIFY', note: '清单 / 签名' },
    { id: 'netease-guide', label: 'USAGE', note: '完整使用说明' }
  ]},
  exedra: { subs: [
    { id: 'exedra-downloads', label: 'DOWNLOADS', note: 'TW / JP / 工具' },
    { id: 'tw-mumu', label: 'TW · WINDOWS / MUMU', note: '完整教程' },
    { id: 'tw-phone', label: 'TW · ANDROID PHONE', note: '完整教程' },
    { id: 'jp-android', label: 'JP · ANDROID / MUMU', note: '完整教程' },
    { id: 'steam', label: 'STEAM WINDOWS', note: '安装与网络' },
    { id: 'tw-client-113', label: 'TW CLIENT 1.1.3', note: '版本说明' },
    { id: 'tw-mumu-en', label: 'TW · WINDOWS / MUMU (EN)', note: 'English guide' },
    { id: 'tw-phone-en', label: 'TW · ANDROID PHONE (EN)', note: 'English guide' },
    { id: 'integrity', label: 'INTEGRITY / HASHES', note: '校验与验证记录' },
    { id: 'troubleshoot', label: 'TROUBLESHOOT', note: '常见问题' }
  ]},
  about: { subs: [
    { id: 'profile', label: 'PROFILE', note: 'MadeInMagius' },
    { id: 'contact-about', label: 'CONTACT', note: '外部入口' }
  ]}
};

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return 'SIZE UNKNOWN';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return (value >= 10 || unit === 0 ? value.toFixed(0) : value.toFixed(1)) + ' ' + units[unit];
}

function resolveDocHref(docPath, href) {
  if (/^(https?:|mailto:|#)/i.test(href)) return href;
  const base = docPath.split('/');
  base.pop();
  href.split('/').forEach(function(part) {
    if (!part || part === '.') return;
    if (part === '..') base.pop();
    else base.push(part);
  });
  return 'https://github.com/HiiragiNemu/MagiaExedraTWTools/blob/main/' + base.map(encodeURIComponent).join('/');
}

function inlineMarkdown(text, docPath) {
  let value = escapeHtml(text);
  value = value.replace(/&lt;(https?:\/\/[^&]+)&gt;/g, function(_, href) {
    return '<a href="' + href + '" target="_blank" rel="noreferrer">' + href + '</a>';
  });
  value = value.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function(_, label, href) {
    const resolved = resolveDocHref(docPath, href.replaceAll('&amp;', '&'));
    return '<a href="' + escapeHtml(resolved) + '" target="_blank" rel="noreferrer">' + label + '</a>';
  });
  value = value.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  value = value.replace(new RegExp('\\x60([^\\x60]+)\\x60', 'g'), '<code>$1</code>');
  return value;
}

export function renderMarkdown(markdown, docPath) {
  const lines = String(markdown || '').replaceAll('\r', '').split('\n');
  const fence = String.fromCharCode(96).repeat(3);
  let html = '';
  let inCode = false;
  let code = [];
  let listType = null;

  function closeList() {
    if (listType) html += '</' + listType + '>';
    listType = null;
  }

  lines.forEach(function(line) {
    if (line.startsWith(fence)) {
      closeList();
      if (inCode) {
        html += '<pre><code>' + escapeHtml(code.join('\n')) + '</code></pre>';
        code = [];
        inCode = false;
      } else {
        inCode = true;
      }
      return;
    }
    if (inCode) {
      code.push(line);
      return;
    }
    if (!line.trim()) {
      closeList();
      return;
    }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = Math.min(4, heading[1].length + 1);
      html += '<h' + level + '>' + inlineMarkdown(heading[2], docPath) + '</h' + level + '>';
      return;
    }
    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      closeList();
      html += '<blockquote>' + inlineMarkdown(quote[1], docPath) + '</blockquote>';
      return;
    }
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    if (ordered || unordered) {
      const nextType = ordered ? 'ol' : 'ul';
      if (listType !== nextType) {
        closeList();
        listType = nextType;
        html += '<' + listType + '>';
      }
      html += '<li>' + inlineMarkdown((ordered || unordered)[1], docPath) + '</li>';
      return;
    }
    if (/^---+$/.test(line.trim())) {
      closeList();
      html += '<hr>';
      return;
    }
    closeList();
    html += '<p>' + inlineMarkdown(line, docPath) + '</p>';
  });

  closeList();
  if (inCode) html += '<pre><code>' + escapeHtml(code.join('\n')) + '</code></pre>';
  return html;
}

function downloadCard(data, project, key, title, subtitle, stablePath, installPath) {
  const projectData = data.releases && data.releases.projects ? data.releases.projects[project] : null;
  const item = projectData && projectData.assets ? projectData.assets[key] : null;
  const rawHref = installPath || item?.download || item?.browser_download_url || stablePath;
  const href = serviceUrl(rawHref);
  const target = (rawHref || '').startsWith('http') ? ' target="_blank" rel="noreferrer"' : '';
  return '<article class="download-card">' +
    '<h3>' + escapeHtml(title) + '</h3>' +
    '<p>' + escapeHtml(subtitle) + (item ? ' · ' + formatBytes(item.size) : '') + '</p>' +
    (href ? '<a class="download-button" href="' + escapeHtml(href) + '"' + target + '>' + (installPath ? '安装到油猴' : 'DOWNLOAD') + '</a>' : '<p role="status">下载信息尚未就绪，请稍后重试。</p>') +
    (installPath ? '<p><a href="' + escapeHtml(serviceUrl(stablePath)) + '">下载脚本文件</a></p>' : '') +
    '<p class="meta-line">' + (item && item.digest ? escapeHtml(item.digest) : 'release metadata loading') + '</p>' +
    '</article>';
}

function contactHtml() {
  return '<p class="content-kicker">MAGIUS LINK / CONTACT</p>' +
    '<h2>CONTACT</h2>' +
    '<div class="contact-grid">' +
    '<a href="https://space.bilibili.com/625821" target="_blank" rel="noreferrer">BILIBILI</a>' +
    '<a href="https://github.com/HiiragiNemu" target="_blank" rel="noreferrer">GITHUB</a>' +
    '<a href="https://pd.qq.com/qqweb/qunpro/share?_wv=3&amp;_wwv=128&amp;appChannel=share&amp;inviteCode=2oaXZG3lL1g&amp;attaContentID=e5616861ea2047e3820bf63bb854aa8e&amp;businessType=9&amp;from=181074&amp;biz=ka&amp;mainSourceId=share&amp;subSourceId=others&amp;b=9" target="_blank" rel="noopener noreferrer">加入群858083286</a>' +
    '<a href="https://www.ifdian.net/a/madeinmagius" target="_blank" rel="noreferrer">爱发电</a>' +
    '</div>';
}

const MAGIRECO_RELEASE_NOTES = {
  "1.3.9": [
  "实际安装版本：1.3.9；1.3.139 为旧客户端兼容更新发现序号。覆盖安装保留存档与已安装资源。",
  "修复全解锁档案的记忆加载；完善存档隔离、复制以及导入导出，保留不同档案各自的本地状态。",
  "修复初次安装的基础资源包处理与重复热更新循环，继续使用现行 Pack17 v4 与 delta58 资源。",
  "已匹配的下载镜像优先使用 R2，缺失镜像继续使用原线路或 GitHub 回退；基础包仅部分分流，并非全部资源已迁移。",
  "大存档卡顿仅作部分优化，完整延迟修复列入 1.4 P0；独立 native error 110 尚未解决。"
],
  "1.3.8": [
  "实际安装版本：1.3.8；1.3.138 为更新发现序号。覆盖安装保留存档与已安装资源。",
  "修复教程抽卡后的编队引导被遗留筛选条件锁住：引导中显示已拥有角色，完成引导后保留原筛选偏好。",
  "修复教程战斗准备记录与原生教程类型不一致导致的恢复409，保留原战斗、奖励和重复提交校验。",
  "保留1.3.7的本地助战、心魔结算、存储容量与活动修复，以及启动和手动更新双选界面。",
  "支持后续个人发行的1.4、2.0及更高版本升级；仅信任MadeInMagius个人频道、固定发行仓库与发行签名，不接入组织或其他仓库的同名版本。升级仍按APK构建号判断，保留旧客户端的签名更新发现兼容。"
],
  "1.3.7": [
  "实际安装版本：1.3.7；1.3.137 为更新发现序号。覆盖安装保留存档与已安装资源。",
  "修复公告归档加载内存过高，以及固定存档分片被64命名空间额度拒绝引发的清档失败和战斗入口409。",
  "修正心魔结算对原生伤害统计的错误校验，保留真实奖励与重复提交校验；识别开战保存失败留下的准备记录，提供明确退出准备入口，避免残留记录阻挡后续战斗。",
  "修复档案好友列表覆盖本地助战、导致部分主线助战全灰的问题；助战显示与开战统一按所选游玩日期校验，保留剧情指定助战。",
  "修复已确认的敌方Doppel动画编号、御魂特训助战与再战周回、编队字段及海边缎带等活动的掉落映射。",
  "启动与手动检查使用同一更新界面：热更新与APK可独立勾选，可用项默认全选；可查看当期及历史说明，双选先完成资源再更新APK。",
  "本地游玩新增普通活动不激活选项，镜层和心魔独立选择；保留既有下载签名、完整性校验与离线导入。",
  "修正多期卡池原图绑定，并按已核实原始资料补齐对应概率和十连保证；未确认的历史逐项权重及特殊阶梯规则继续单列。"
],
  "1.3.6": [
    "实际安装版本：1.3.6；1.3.136 为兼容旧客户端的更新发现序号。覆盖安装保留存档与已安装资源。",
    "修复1号 scenario 与2号 JS 热更新在重试、重下和资源恢复时丢失发行签名身份，导致下载完成后安装失败的问题。",
    "保留签名与完整性校验、断点续传及已完成资源复用；保留用户离线导入，不修改玩法和第17资源包。"
  ],
  "1.3.5": [
    "实际安装版本：1.3.5；更新发现编号为 1.3.135，版本代码 1713000889，覆盖此前误发版本号，不清除现有存档。",
    "精简客户端至约 131 MB；离线资源改为第 17 包 cn_offline_update.zip，首次下载后复用，后续按包更新。",
    "新增第 17 包签名、完整性检查及安装复用；中文公告资源包含 CN018。",
    "修正选关场景误用战斗 BGM 的配置与切换逻辑；实际听感及剩余玩法由玩家继续测试。",
    "每个仓库仅新增一份固定版本 APK，兼容下载入口转发；对应源码随版本提供。"
  ],
  "1.3.2": [
    "实际安装版本：1.3.2；1.3.132为兼容旧客户端的更新发现序号。覆盖安装保留存档与已安装资源。",
    "修复旧档限时任务资料不完整引起的首页异常；调整战斗恢复确认和明确放弃流程，保留未成功放弃的战斗现场与已扣费用。",
    "补齐第5章已核实关卡的结算数据，修正百祸挑战同分区错误前置条件，保留普通挑战和跨分区的原有门槛。",
    "恢复部分活动的原版入口图片和已核实的选关角色；保留现有中文图片及原始剧情文本。",
    "补入首次环彩羽特训的14项累计任务，按实际完成次数记录进度，并防止重复结算或领奖。",
    "筛选按钮随可用宽度铺满整行；压缩游玩日志顶部及按钮留白，扩大日志正文区域；调整长关卡标题显示。",
    "修正取消下载后的任务锁释放和首次连接失败的重试衔接，保留断点续传与完整性校验。",
    "修正已通关关卡的自动战斗开关，普通AUTO不再误用三任务全完成门槛；自动周回继续按原条件判断。",
    "恢复6家历史活动商店的259项商品及对应时间和库存，补齐两期活动共92个关卡的缺失代币掉落。",
    "修复阿莉娜工作室3期活动的可能性因子扭蛋图标路径，使用同活动原始图标。",
    "纳入resource54已核实的角色台词名称修订。"
  ],
  "1.3.1": [
    "实际安装版本：1.3.1；1.3.131为兼容旧客户端的更新发现序号。覆盖安装保留存档与已安装资源，无需卸载。",
    "镜层与心魔入口取消独立关闭选项；旧档案中的关闭选择恢复为跟随档案时间，档期未开放时仍保持原开放条件。常驻默认与已保存的手动入口保留。",
    "恢复旧格式档案的镜层、心魔常驻默认选择；未解锁时可先保存常驻偏好，并显示所需主线条件。已保存的手动选择保持不变。",
    "修复切换历史活动后旧限时任务定义丢失、导致首页及其他入口报错的问题；保留原任务进度与奖励。",
    "活动与卡池筛选按钮自适应排列，消除中间大块留白，保留字号和按钮高度。",
    "修复角色复活后战斗结算409，以及付费续关后丢失战斗现场、恢复再结算时的计数冲突；保留已扣费用与重复提交校验。",
    "补齐结果页所需的助战资料，修复相关结算页面异常；补全角色剧情的主线前置条件提示。",
    "资源和热更新下载跟随系统代理，备用下载引擎同步采用所选代理；保留分片、断点续传与完整性校验。",
    "延长启动切换的排队等待，修复设备繁忙时进入本地游玩失败的问题。",
    "完善游玩日志的默认记录、跨重启保留与导出，优化更新提示和版本检查。",
    "修正部分镜界排行商店数据及原生界面文字、自动设置显示。"
  ],
  "1.3.0": [
    "实际安装版本：1.3.0；1.3.130为兼容旧版检查更新的发现序号。覆盖安装保留存档和已安装资源，无需卸载。",
    "修复部分档案容量过大时战斗、巡逻和普通扭蛋请求失败的问题，以及未完成普通战斗期间保存后续编队时的请求冲突；保留费用和重复提交校验。",
    "修复未完成战斗恢复时的数据衔接，保留已扣费用和关卡进度。",
    "调整部分活动在战斗期与兑换期的入口衔接，保留原有开放时间和战斗限制。",
    "补充部分塔型活动关卡的固定助战配置。"
  ],
  "1.2.9": [
    "实际安装版本：1.2.9；1.3.129仅为旧版检查更新的兼容发现序号。覆盖安装保留存档与已安装资源，无需卸载。",
    "修复升级、材料兑换、编队保存及巡逻等操作因执行时间限制而出现的504，保留已完成操作的重试回执，避免重复扣除。",
    "降低全解锁档和图鉴魔法少女页面的响应内存峰值，保留完整角色与库存数据。",
    "减少页面切换、编队和战斗入口的重复计算，不缩短请求超时。",
    "修复部分活动战斗消耗魔法石复活时的409，兼容更新前未结束的战斗，重试不重复扣石。",
    "修复全解锁档部分章节与关卡完成标记不一致导致的409，保留首通奖励状态。",
    "修复商店限购数量跨期刷新和记忆结晶编队保存后的显示。",
    "修复角色个人介绍中的换行控制符显示，保留现有中文文本。"
  ],
  "1.2.8": [
    "实际安装版本：1.2.8；1.3.128仅为旧版检查更新的兼容发现序号。同签名覆盖更新保留档案与资源标记，已完整安装的固定资源无需重新下载。",
    "优化结算504相关超时预算与重复回执处理，减少重复整档读取和序列化。",
    "修复切换属性分页选择关卡NPC助战时的409，并兼容已完成新手流程但遗失旧标记的档案。",
    "修复属性强化材料名称与消耗数量的配对，保留材料不足、扣除及重复操作校验。",
    "修复全解锁档的记忆结晶库存显示与容量同步，普通档不增发库存。",
    "修复无限购商品购买后的累计购买数、库存与持有数刷新，保留限购及跨月重置规则。",
    "将已选卡图和行动盘外观传递到原生战斗，保留角色实际星级、等级与战斗数值。",
    "支持按档案选择活动类型与期次，补入35期登录剧情及2036心魔战和商店。"
  ],
  "1.2.7": [
      "实际安装版本：1.2.7；1.3.127仅为兼容旧1.3.4检查更新的发现序号，安装包只有一份，覆盖安装保留存档与资源。",
      "接通魔法石回复AP按钮，按5颗魔法石、免费优先的规则扣款并保存AP。",
      "修复排队与实际执行共用超时导致的结算成功响应丢失；保留真正超时提示和重复结算回执。",
      "修复商店首购、多商品库存及持有数刷新，兼容旧档Android魔法石余额。",
      "恢复2020新年三档福袋：通过本地免费模拟买钻购买，不涉及真实充值；打通383/384自选券、385券及28种记忆兑换。",
      "补齐福袋记忆兑换券的原版小图，调整礼包说明为两行，避免与价格重叠。"
  ],
  "1.2.6": [
    "补齐行动盘外观到原生战斗的传递：卡图与SD选择作用于新发起的战斗，角色属性与战斗小人不变。",
    "LOG新增手动游玩记录、上一次错误与跨重启查看、复制、分享和导出。",
    "补全离线结算台词的换行匹配与角色名，修正商店兑换券文字布局。",
    "移除觉醒特效旧资源中重复的“醒”字轨道，保留原版Awaken文字。",
    "延续1.2.x单一版本线；从旧1.3.4覆盖安装时保留同签名与更高内部构建号，不卸载、不清档。",
    "恢复未完成战斗提示改用原版紧凑横向弹窗，完整显示说明和按钮，去除底部大块空白。"
  ]
};

function magirecoClientHtml(current) {
  let download = '<p role="status">正在读取最新正式版本…</p>';
  let releaseNotes = '';
  const ready = current?.state === 'ready';
  const discoveryUpgrade = ready && releaseAtLeast(current.version, 1, 2, 7);
  const upgradeNotice = discoveryUpgrade
    ? '<p><strong>已安装 1.3.4？可以使用旧版“检查更新”接收新版安装包，也可下载本页 APK 覆盖更新。</strong>兼容发现序号只用于旧版识别，并非另一份安装包；实际安装版本以本页为准。不要卸载或清除数据。</p>'
    : ready
      ? '<p><strong>已安装 1.3.4？旧版“检查更新”会因版本号比较误报已是最新版，请手动下载下方的 1.2.6 或后续 1.2.x 安装包。</strong>同签名、更高构建号可直接覆盖安装一次；不要卸载或清除数据。自 1.2.5 起按签名构建号检查后续更新。</p>'
      : '<p>旧版本用户可使用应用内“检查更新”，或待本页读取正式发布信息后下载同签名安装包覆盖更新；不要卸载或清除数据。</p>';
  const upgradeStep = discoveryUpgrade
    ? '<li>此前显示为 1.3.4 的用户，可在旧版检查更新或下载本页 APK 覆盖升级。实际安装版本为 ' + escapeHtml(current.version) + '，不再区分主版与兼容版。</li>'
    : ready
      ? '<li>此前显示为 1.3.4 的用户，请下载本页的 1.2.6 或后续 1.2.x 安装包，完成一次覆盖迁移。之后统一使用 1.2.x 更新，不再区分主版与兼容版。</li>'
      : '<li>使用应用内“检查更新”或本页正式安装包更新；实际版本以发布信息为准。</li>';
  if (current?.state === 'ready') {
    const notes = MAGIRECO_RELEASE_NOTES[current.version] || [];
    releaseNotes = notes.length ? '<h3>' + escapeHtml(current.version) + ' 更新内容</h3><ul>' + notes.map(note => '<li>' + escapeHtml(note) + '</li>').join('') + '</ul>' : '';
    const directMirrors = {
      '1.3.8': { sha256:'f140fd086be89b03e9ac65a47fc0cee1daa57561fb49dead6440bd34b9620e0c', size:134530376 },
      '1.3.9': { sha256:'fa5a29fb3a861573e92b322b3827cbb5398ee1d4cd510f181cec406560701220', size:134604104 },
    };
    const directMirror = directMirrors[current.version];
    const verifiedDirectMirror = directMirror && current.sha256 === directMirror.sha256 && current.size === directMirror.size;
    const fixedApkName = 'magireco-legacy-client-' + encodeURIComponent(current.version) + '.apk';
    download = '<p><strong>客户端版本 ' + escapeHtml(current.version) + '</strong> · ' + formatBytes(current.size) + '</p>' +
      (verifiedDirectMirror ? '<a class="download-button" href="https://pub-121ae9980b3149dcbc4a1f88ad7a58b9.r2.dev/release-mirrors/sha256/' + directMirror.sha256 + '/' + fixedApkName + '">R2 直连下载 APK</a> ' +
        '<a class="download-button" href="https://github.com/HiiragiNemu/ProgettoMagius-1/releases/download/latest/' + fixedApkName + '">GitHub 备用 APK</a> ' : '') +
      '<a class="download-button" href="' + escapeHtml(serviceUrl(current.download)) + '">下载 APK</a>' +
      (current.version === '1.3.9' && verifiedDirectMirror
        ? '<p><a href="https://github.com/HiiragiNemu/ProgettoMagius-1/releases/download/latest/magireco-legacy-client-1.3.9-corresponding-source-current-r4.zip">下载 1.3.9 对应源码（r4）</a> · 385,379,111 字节 · <a href="./assets/magireco-source-1.3.9-r4.html">源码范围、校验与构建说明</a></p>'
        : '<p>源码交付方式调整中。该版本的完整对应源码入口待恢复。</p>') +
      '<p class="meta-line">SHA-256: ' + escapeHtml(current.sha256) + '</p>';
  } else if (current?.state === 'error') {
    download = '<p role="status">发布信息正在同步或暂时不可用，请稍后重新检查。</p>';
  }
  return '<p class="content-kicker">MAGIRECO / ANDROID</p><h2>魔法纪录中文化私服</h2>' +
    '<p>魔法纪录汉化客户端（Android）。无需 Root；安装包不包含随后下载的全部游戏资源。</p>' +
    (!ready || current.version === '1.3.8' || current.version === '1.3.9' ? '<p><strong>下载线路拥堵或中断？</strong><a href="./assets/magireco-direct-downloads-20261029.html">打开固定 1.3.9 与部分资源的备用直连下载</a>（不经过下载 Worker）。原地址和 GitHub 备用保留。</p>' : '') +
    upgradeNotice +
    '<div class="download-stack"><article class="download-card"><h3>ANDROID APK</h3>' + download +
    '<p><button class="terminal-copy-button" type="button" data-magireco-refresh' +
    (current?.state === 'loading' ? ' disabled' : '') + '>重新检查版本</button></p></article></div>' +
    '<p>这里自动读取正式发布版本，版本、文件大小和摘要以当前发布信息为准。</p>' +
    releaseNotes +
    '<h3>初次安装</h3><ol>' +
    '<li>点击“下载 APK”，下载完成后打开文件。</li>' +
    '<li>如系统询问，允许当前浏览器或文件管理器安装未知来源应用，再按提示完成安装。</li>' +
    '<li>打开客户端。资源服务器地址已经内置，无需手工填写。</li>' +
    '<li>在应用内下载资源，保持联网并预留下载与解压空间，以界面的进度和空间提示为准。完成后按“进入游戏”或界面启动提示继续。</li></ol>' +
    '<h3>下载资源与线路</h3>' +
    '<p>网络较慢但进度仍在增加时，可以继续等待。低速提示中的“关闭”和“继续下载”都会保留当前任务；Logo 右侧的“线路”可手动选择下载线路。</p>' +
    '<p>资源行中的“重下”表示从头下载，不是继续当前下载。已有兼容下载内容会保留断点。</p>' +
    '<h3>已有客户端如何更新</h3><ol>' +
    upgradeStep +
    '<li>同来源、同签名的版本可以直接安装新版覆盖更新，不要先卸载或清除数据。</li>' +
    '<li>更新后打开客户端，保留已有资源与本地状态，并按版本检查下载所需更新。</li>' +
    '<li>若系统提示安装冲突，先核对旧包来源、包名和签名并保留原数据，不要用卸载作为通用解决办法。</li></ol>' +
    '<h3>文件权限</h3>' +
    '<p>正常资源下载使用应用目录，无需开启所有文件访问。只有需要读写共享存储时，再使用 Logo 右侧的“文件权限”，手动进入系统设置授权。</p>';
}

// Feature copy follows the released APK, including fallback and loading states.
function releaseAtLeast(tag, major, minor, patch) {
  const match = String(tag || '').match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return false;
  const actual = match.slice(1).map(Number);
  const required = [major, minor, patch];
  for (let i = 0; i < required.length; i += 1) {
    if (actual[i] !== required[i]) return actual[i] > required[i];
  }
  return true;
}

function androidUpdateGuide(tag, project) {
  const hasStartupCheck = project === 'bilibili'
    ? releaseAtLeast(tag, 0, 1, 12) : releaseAtLeast(tag, 2, 5, 3);
  const hasManualCheck = project === 'bilibili'
    ? releaseAtLeast(tag, 0, 1, 10) : releaseAtLeast(tag, 2, 5, 2);
  if (hasStartupCheck) {
    return '<p>新用户直接安装本页正式 APK。同意隐私说明后，应用启动时会静默检查新版；发现兼容新版后可选“暂不更新”或“下载并校验”，失败不阻塞使用。下载后核对大小、SHA-256、包名、递增版本和原签名，再由 Android 确认安装，不会静默覆盖。</p>' +
      '<p>“应用更新与文件访问”仍保留手动检查。旧用户首次升级请安装同签名新版覆盖原应用，不要先卸载或清除数据；旧 APK 不会自动获得新版的启动检查能力。</p>';
  }
  if (hasManualCheck) {
    return '<p>此版本使用“应用更新与文件访问”手动检查新版，尚无启动更新提醒。首次升级到支持启动检查的正式版，请在应用内手动检查或从本页下载同签名新版覆盖安装，不要先卸载或清除数据。</p>';
  }
  return '<p>首次安装或从旧版升级，请从本页下载正式 APK；升级时使用同签名覆盖安装，不要先卸载或清除数据。更新能力以实际安装的版本为准。</p>';
}

export function renderContent(programId, subId, data) {
  if (programId === 'home') {
    if (subId === 'magireco-private-server') return magirecoClientHtml(data.magireco);
    if (subId === 'universal-adv-reader') return '<p class="content-kicker">UNIVERSAL ADV READER</p><h2>通用 ADV 阅读网站</h2>' +
      '<p>Narcissu 系列与 KANA 的中文／日文剧情阅读、原生章节导航、语音、全文检索与汉化修订。</p>' +
      '<article class="download-card"><h3>UNIVERSAL ADV READER</h3><p class="meta-line">universal-adv-reader.pages.dev</p>' +
      '<a class="download-button" href="https://universal-adv-reader.pages.dev/apps/web" target="_blank" rel="noopener noreferrer">打开通用阅读网站 ↗</a></article>';
    if (subId === 'programs') {
      return '<p class="content-kicker">MAGIUS LINK / EVIDENCE</p><h2>资源比对与证据记录</h2>' +
        '<p>资源、客户端修改与已发布产出的比对报告。</p>' +
        '<div class="evidence-report-grid"><article class="download-card">' +
        '<p class="meta-line">2026-10-17 · 个人版 1.1.1 复核</p><h3>资源与客户端比对报告</h3>' +
        '<p>本报告记录：17 个分发包中有 10 个与参考包的全部分块匹配；196 个反编译补丁类文件一致；72 条资源命中对应 70 个受检文件。</p>' +
        '<p>客户端参考：MadeInMagius 个人版 1.1.1。下列 APK 是历史比对基准，不替换玩家最新版。</p>' +
        '<a class="evidence-thumbnail" href="./assets/reports/resource-client-comparison-20261017-image.html" target="_blank" rel="noopener noreferrer" aria-label="查看资源与客户端比对报告完整长图">' +
        '<img src="./assets/reports/resource-client-comparison-20261017-thumbnail.webp" loading="lazy" decoding="async" alt="第一份报告长图缩略图，个人版 1.1.1 复核"></a>' +
        '<a class="download-button" href="./assets/reports/resource-comparison-20261014.html" target="_blank" rel="noopener noreferrer">阅读完整报告 ↗</a>' +
        '<div class="quick-links"><a href="./assets/reports/resource-client-comparison-20261017.png" download="resource-client-comparison-20261017.png">下载报告长图</a>' +
        '<a href="./assets/reports/resource-client-comparison-20261017.pdf" download="resource-client-comparison-20261017.pdf">下载 PDF</a>' +
        '<a href="' + escapeHtml(serviceUrl('./downloads/pinned/magireco/1.1.1-evidence')) + '">历史 1.1.1 APK</a>' +
        '<span>源码交付方式调整中。</span>' +
        '<a href="./assets/reports/client-111-reproduce.html" target="_blank" rel="noopener noreferrer">复现方法与工具 ↗</a></div>' +
        '</article><article class="download-card">' +
        '<p class="meta-line">2026-10-17 · 个人版 1.1.1 复核</p><h3>原报告长图（匿名版）</h3>' +
        '<a class="evidence-thumbnail" href="./assets/reports/forensic-report-20261017-image.html" target="_blank" rel="noopener noreferrer" aria-label="打开完整报告长图，可滚动阅读和下载">' +
        '<img src="./assets/reports/forensic-report-20261017-thumbnail.webp" width="600" height="600" loading="lazy" decoding="async" alt="原报告长图（匿名版）缩略图，点击展开完整正文"></a>' +
        '<div class="quick-links"><a href="./assets/reports/forensic-report-20261017-image.html" target="_blank" rel="noopener noreferrer">展开长图 ↗</a>' +
        '<a href="./assets/reports/forensic-report-20261017.html" target="_blank" rel="noopener noreferrer">阅读文字报告 ↗</a>' +
        '<a href="./assets/reports/forensic-report-20261017.png" download="forensic-report-20261017.png">下载完整报告长图</a>' +
        '<a href="./assets/reports/forensic-report-20261017.pdf" download="forensic-report-20261017.pdf">下载 PDF</a>' +
        '<a href="./assets/reports/forensic-report-20261017.txt" download="forensic-report-20261017.txt">下载文字版</a></div>' +
        '</article></div><article class="download-card evidence-response-card">' +
        '<p class="meta-line">2026-10-14 · 回应长图</p><h3>项目回应长图</h3>' +
        '<a class="evidence-thumbnail" href="./assets/reports/project-response-20261017-image.html" target="_blank" rel="noopener noreferrer" aria-label="打开项目回应完整长图" style="max-width:360px;margin:1rem auto">' +
        '<img src="./assets/reports/project-response-20261017-thumbnail.webp" loading="lazy" decoding="async" alt="项目回应长图缩略图，点击展开全文"></a>' +
        '<div class="quick-links"><a href="./assets/reports/project-response-20261017-image.html" target="_blank" rel="noopener noreferrer">展开长图 ↗</a>' +
        '<a href="./assets/reports/project-response-20261017.html" target="_blank" rel="noopener noreferrer">阅读文字版 ↗</a>' +
        '<a href="./assets/reports/project-response-20261017.png" download="project-response-20261017.png">保存图片</a>' +
        '<a href="./assets/reports/project-response-20261017.pdf" download="project-response-20261017.pdf">下载 PDF</a>' +
        '<a href="./assets/reports/project-response-20261017.txt" download="project-response-20261017.txt">下载文字版</a></div>' +
        '</article>';
    }
    if (subId === 'contact') return contactHtml();
    return '<p class="content-kicker">MAGIUS LINK / WEBSITES</p><h2>魔法纪录相关网站</h2>' +
      '<div class="download-stack">' + HOME_WEBSITES.map(function(site) {
        return '<article class="download-card">' +
          '<h3>' + escapeHtml(site.title) + '</h3>' +
          '<p>' + escapeHtml(site.description) + '</p>' +
          '<p class="meta-line">' + escapeHtml(new URL(site.url).hostname) + '</p>' +
          '<a class="download-button" href="' + escapeHtml(site.url) + '" target="_blank" rel="noopener noreferrer">打开网站 ↗</a>' +
          '</article>';
      }).join('') + '</div>';
  }

  if (programId === 'bilibili') {
    if (subId === 'android') {
      const project = data.releases?.projects?.bilibili;
      const releaseTag = project?.tag || 'LATEST';
      const knownVersion = /^v?\d+\.\d+\.\d+$/.test(releaseTag);
      const androidBehavior = releaseAtLeast(releaseTag, 0, 1, 11)
        ? '<p>默认 Download 始终优先使用 Android MediaStore；Android 11+ 的所有文件访问仅在 MediaStore 失败时作为兼容回退，系统选择位置保存 JSON 不依赖该权限。</p>' +
          '<p>完整扫描会把本轮快照推进为下一轮比较基线；历史待处理变化单独保留，不再覆盖最新一轮 N-1 → N 比较。退出或换号不会删除历史快照和导出文件。</p>'
        : knownVersion
          ? '<p>当前公开正式 APK 为 ' + escapeHtml(releaseTag) + '。该版本仍保持原有 Download 存储分流和比较状态行为；0.1.11 的 MediaStore-first、原生保存超时恢复与 N-1 → N 滚动比较修复，需要安装同签名的 0.1.11 或更高正式 APK 后才生效。</p>'
          : '<p>正在读取当前正式 APK 版本。版本信息就绪前，不提前宣称特定版本的修复已经生效。</p>';
      return '<p class="content-kicker">BILIBILI / ANDROID / ' + escapeHtml(releaseTag) + '</p><h2>粉丝快照伴侣</h2>' +
        '<p>Android 10+ 独立伴侣。无需 root、ADB、Frida 或 Tampermonkey；在伴侣内登录后读取粉丝页并使用同一套快照逻辑。</p>' +
        '<div class="download-stack">' +
        downloadCard(data, 'bilibili', 'android', 'ANDROID APK', '签名 Android 伴侣', './downloads/bilibili/android') +
        '</div>' +
        androidBehavior + androidUpdateGuide(releaseTag, 'bilibili');
    }
    if (subId === 'userscript') {
      return '<p class="content-kicker">BILIBILI / USERSCRIPT</p><h2>USERSCRIPT</h2>' +
        '<p>适用于 Chrome、Edge、Firefox 以及支持用户脚本扩展的手机浏览器。</p><div class="download-stack">' +
        downloadCard(data, 'bilibili', 'userscript', 'BILIBILI USERSCRIPT', 'Tampermonkey 用户脚本', './downloads/bilibili/userscript', './downloads/bilibili-follower-snapshot.user.js') +
        '</div>' +
        '<p>已安装并启用 Tampermonkey？点击“安装到油猴”，在插件打开的确认页点击“安装”。安装完成后打开自己的 B站空间，进入“粉丝快照”，读取并保存 JSON / CSV；以后可以导入旧快照比较。</p>' +
        '<p>若只显示代码或下载文件，请检查油猴已启用并获准访问本站；Chrome / Edge 用户还需在扩展设置中允许用户脚本运行。也可用“下载脚本文件”，在油猴管理面板中导入。</p>';
    }
    if (subId === 'console') {
      const project = data.releases && data.releases.projects ? data.releases.projects.bilibili : null;
      const assets = project && project.assets ? project.assets : {};
      const scriptUrl = assets.consoleScript
        ? (assets.consoleScript.download || assets.consoleScript.browser_download_url)
        : './downloads/bilibili-follower-snapshot-console.js';
      const textUrl = assets.consoleText
        ? (assets.consoleText.download || assets.consoleText.browser_download_url)
        : './downloads/bilibili-follower-snapshot-console.txt';
      return '<p class="content-kicker">BILIBILI / F12 CONSOLE</p><h2>F12 CONSOLE</h2>' +
        '<p>桌面浏览器临时运行入口，不安装扩展。先登录 B站并打开自己的个人空间，再打开开发者工具的 Console。</p>' +
        '<div class="quick-links">' +
        '<button class="terminal-copy-button" type="button" data-copy-url="' + escapeHtml(serviceUrl(scriptUrl)) + '" data-copy-fallback="' + escapeHtml(serviceUrl(textUrl)) + '">COPY FULL SCRIPT</button>' +
        '<a href="' + escapeHtml(serviceUrl(textUrl)) + '" target="_blank" rel="noreferrer">OPEN PLAIN TEXT ↗</a>' +
        '</div>' +
        '<ol><li>按 F12，切换到 Console。</li><li>复制完整脚本并粘贴后回车运行。</li><li>读取并保存快照；需要比较时导入旧记录。</li></ol>';
    }
    return '<p class="content-kicker">BILIBILI / USAGE</p><h2>使用说明</h2>' +
      '<h3>v0.1.9 新操作方式</h3>' +
      '<ol>' +
      '<li><strong>底部固定面板。</strong>右下角“粉丝快照 ↑”随时展开，“向下收起 ↓”随时折叠；名单单独滚动，读取、保存、导入按钮固定可见。</li>' +
      '<li><strong>名单直接操作。</strong>点击昵称打开对方主页；每条记录均可复制 UID 或主页链接。Android 优先打开官方 B站 APP，未接收时打开网页。</li>' +
      '<li><strong>默认启动备份。</strong>每次启动读取一次，并依次把快照、账本及已有比较/待处理 JSON 保存到 Download。设置中可关闭，或选择仅手动、每日一次。手动保存仍遵循原选定目录。</li>' +
      '<li><strong>保留完整性判断。</strong>部分读取照常保存，但不把未返回的账号判为消失；只有已确认候选标记为关系消失。</li>' +
      '</ol>' +
      '<h3>Android 伴侣</h3><ol><li>安装并打开，首次进入可先选择保存目录。</li><li>使用应用提供的登录入口登录账号。</li><li>在快照面板读取，查看覆盖与完整性状态，保存本次结果或导入旧记录比较。</li></ol>' +
      '<h3>油猴脚本</h3><ol><li>启用 Tampermonkey 并安装脚本。</li><li>保持登录并打开自己的 B站空间。</li><li>读取后保存 JSON / CSV；以后导入旧快照比较。</li></ol>' +
      '<h3>F12 Console</h3><ol><li>桌面浏览器登录 B站并打开自己的个人空间。</li><li>按 F12 切换到 Console。</li><li>粘贴完整脚本并回车运行。</li></ol>' +
      '<p><strong>比较结果：</strong>只有两份快照都通过完整性检查时才输出精确差集。覆盖存在缺口时，未返回账号保持“未分类”，不会直接判定关系消失；超过 1000 人同样按实际唯一 UID 与接口报告总数判断。</p>' +
      '<div class="quick-links"><a href="#bilibili/android">ANDROID</a><a href="#bilibili/userscript">USERSCRIPT</a></div>';
  }

  if (programId === 'netease') {
    if (subId === 'android-full') {
      const releaseTag = data.releases?.projects?.netease?.tag || 'LATEST';
      return '<p class="content-kicker">NETEASE / ANDROID / ' + escapeHtml(releaseTag) + '</p><h2>ANDROID</h2>' +
        '<p>Android 8.0+ 完整版。日常登录、选择、比较和导出不需要电脑、Root 或 ADB。</p>' +
        '<div class="download-stack">' +
        downloadCard(data, 'netease', 'androidFull', '完整版 APK', 'Android 8.0+ · 推荐', './downloads/netease/android-full') +
        '</div>' +
        androidUpdateGuide(releaseTag, 'netease') +
        '<p>Android 11+ 可手动开启所有文件访问，也可继续用系统选择位置保存文件。</p>' +
        '<p>完整版可由用户主动启用刷新助手处理长久未打开的歌单。</p>';
    }
    if (subId === 'windows') {
      return '<p class="content-kicker">NETEASE / WINDOWS / v2.5.1</p><h2>WINDOWS X64</h2>' +
        '<p>免安装 ZIP。解压后双击“一键导出.cmd”，或直接运行 bin/NeteaseDelistedExporter.exe；运行程序不依赖本机 Python。</p>' +
        '<div class="download-stack">' +
        downloadCard(data, 'netease', 'windows', 'WINDOWS X64 ZIP', 'Windows x64 · 免安装', './downloads/netease/windows') +
        '</div>';
    }
    if (subId === 'python') {
      return '<p class="content-kicker">NETEASE / PYTHON / v2.5.1</p><h2>PYTHON</h2>' +
        '<p>Windows、macOS、Linux 均可使用。便携 ZIP 解压后安装 requirements.txt；wheel 可直接由 pip 安装。</p>' +
        '<div class="download-stack">' +
        downloadCard(data, 'netease', 'python', 'PYTHON ZIP', 'Python 3 · 跨平台', './downloads/netease/python') +
        downloadCard(data, 'netease', 'wheel', 'PYTHON WHEEL', 'py3-none-any', './downloads/netease/wheel') +
        '</div>';
    }
    if (subId === 'netease-verify') {
      const project = data.releases && data.releases.projects ? data.releases.projects.netease : null;
      const assets = project && project.assets ? project.assets : {};
      function verificationLink(key, label) {
        const item = assets[key];
        if (!item) return '';
        const href = serviceUrl(item.download || item.browser_download_url);
        if (!href) return '';
        return '<a href="' + escapeHtml(href) + '" target="_blank" rel="noreferrer">' + escapeHtml(label) + ' ↗</a>';
      }
      return '<p class="content-kicker">NETEASE / VERIFY / ANDROID ' + escapeHtml(data.releases?.projects?.netease?.tag || 'LATEST') + '</p><h2>清单与签名</h2>' +
        '<p>公开资料只包含发布清单、SHA-256 与公钥/验证记录，不包含签名私钥或密码。</p>' +
        '<div class="quick-links">' +
        verificationLink('manifest','RELEASE_MANIFEST.json') +
        verificationLink('sums','SHA256SUMS.txt') +
        verificationLink('cert','公开上传证书') +
        verificationLink('signature','签名验证记录') +
        '</div>';
    }
    return '<p class="content-kicker">NETEASE / USAGE</p><h2>使用说明</h2>' +
      '<p>TXT 按来源歌单分组：歌单名称只写一次，下面只列完整曲名；CSV / JSON 保留完整字段。支持 Android、Windows、Python、固定基准和仅新增下架。</p>' +
      '<h3>Android：日常无需 Root / ADB</h3><ol>' +
      '<li>普通用户安装完整版 APK；日常登录、选择、比较和导出不需要电脑、Root 或 ADB。</li>' +
      '<li>打开“网易云登录页”，完成登录后返回工具并点“检查登录”。</li>' +
      '<li>选择歌单范围、曲目范围与重复策略；默认精确去重并保留全部来源歌单。</li>' +
      '<li>勾选 TXT、CSV、JSON，选择普通文件、ZIP 或两者，并确认保存位置。</li>' +
      '</ol>' +
      '<h3>Windows x64</h3><ol>' +
      '<li>解压 ZIP 并保留目录结构。</li><li>双击“一键导出.cmd”，或运行 bin/NeteaseDelistedExporter.exe。</li>' +
      '<li>按菜单选择歌单、曲目、重复策略和 baseline 模式；直接回车采用默认去重。</li>' +
      '<li>完整刷新已下架侧栏时需要连接 Android 并启用 ADB；仅读取当前曲目或缓存时可不连接。</li>' +
      '</ol>' +
      '<h3>Python ZIP / wheel</h3><ol>' +
      '<li>ZIP：python -m pip install -r requirements.txt，然后 python run.py。</li>' +
      '<li>wheel：python -m pip install 下载的 .whl，然后使用 netease-playlist-exporter。</li>' +
      '' +
      '</ol>' +
      '<h3>v2.5.1 基准版本</h3><ol>' +
      '<li>“对比设置”列出每一次完整结果，并标注“上次完整”和“默认固定”。</li>' +
      '<li>可选择任意完整版本作为本次比较基准，也可导出所选基准 JSON。</li>' +
      '<li>设为默认固定后，日常完整运行不会覆盖它，直到再次明确设置。</li>' +
      '<li>可只导出相对所选或默认固定基准的新下架曲目。</li>' +
      '</ol>' +
      '<p><strong>完整性保护：</strong>不完整采集不会新增完整版本，也不会替换“上次完整”或默认固定基准。</p>';
  }

  function renderIntegrityBlock(label, manifest, verification, sums) {
    if (!manifest || !manifest.releases || !manifest.releases.length) return '';
    const latest = manifest.releases.find(function(item) {
      return item.versionName === manifest.latestVersion;
    }) || manifest.releases[0];
    const splitRows = Object.entries(latest.splits || {}).map(function(entry) {
      const name = entry[0];
      const item = entry[1];
      return '<tr><td>' + escapeHtml(name) + '</td><td>' + escapeHtml(String(item.length || '')) + '</td><td><code>' + escapeHtml(item.sha256 || '') + '</code></td></tr>';
    }).join('');
    return '<section class="integrity-block">' +
      '<h3>' + escapeHtml(label) + '</h3>' +
      '<p><strong>PACKAGE</strong> ' + escapeHtml(manifest.packageName || '') + '</p>' +
      '<p><strong>VERSION</strong> ' + escapeHtml(latest.versionName || '') + ' / ' + escapeHtml(String(latest.versionCode || '')) + '</p>' +
      '<p><strong>XAPK</strong> ' + escapeHtml(String(latest.length || '')) + ' bytes</p>' +
      '<p class="integrity-hash"><strong>SHA-256</strong> <code>' + escapeHtml(latest.sha256 || '') + '</code></p>' +
      (latest.signingCertificateSha256 ? '<p class="integrity-hash"><strong>SIGNING CERT</strong> <code>' + escapeHtml(latest.signingCertificateSha256) + '</code></p>' : '') +
      '<div class="integrity-table-wrap"><table class="integrity-table"><thead><tr><th>SPLIT</th><th>BYTES</th><th>SHA-256</th></tr></thead><tbody>' + splitRows + '</tbody></table></div>' +
      (verification ? '<details class="terminal-details"><summary>VERIFICATION RECORD</summary><pre><code>' + escapeHtml(JSON.stringify(verification, null, 2)) + '</code></pre></details>' : '') +
      (sums ? '<details class="terminal-details"><summary>SHA256SUMS</summary><pre><code>' + escapeHtml(sums) + '</code></pre></details>' : '') +
      '</section>';
  }

  if (programId === 'exedra') {
    if (subId === 'exedra-downloads') {
      return '<p class="content-kicker">EXEDRA TW / JP / DOWNLOADS</p><h2>原版客户端与安装工具</h2>' +
        '<p>旧的独立 Exedra 下载站并入 MAGIUS LINK。原有客户端下载、安装工具和教程全部保留。</p>' +
        '<div class="download-stack">' +
        downloadCard(data, 'exedra', 'twXapk', 'TW 1.1.3 XAPK', '台服原版完整 XAPK', './downloads/exedra/tw-xapk') +
        downloadCard(data, 'exedra', 'jpXapk', 'JP 3.21.0 XAPK', '日服原版完整 XAPK', './downloads/exedra/jp-xapk') +
        downloadCard(data, 'exedra', 'tools', 'TW / JP TOOLS v1.4.1', '安装与升级工具', './downloads/exedra/tools') +
        '</div><div class="quick-links">' +
        '' +
        '<a href="https://mme.so-net.tw/" target="_blank" rel="noreferrer">TW OFFICIAL ↗</a>' +
        '<a href="https://www.madoka-exedra.com/" target="_blank" rel="noreferrer">JP OFFICIAL ↗</a>' +
        '</div>';
    }
    if (subId === 'integrity') {
      const files = data.integrity && data.integrity.files ? data.integrity.files : {};
      return '<p class="content-kicker">EXEDRA / INTEGRITY</p><h2>校验与验证记录</h2>' +
        '<p>这里保留旧 Exedra 下载站使用的版本清单、完整 XAPK SHA-256、每个 split 的固定哈希与验证记录。</p>' +
        renderIntegrityBlock('TW ORIGINAL CLIENT', files.twManifest && files.twManifest.content, files.twVerification && files.twVerification.content, files.twSums && files.twSums.content) +
        renderIntegrityBlock('JP ORIGINAL CLIENT', files.jpManifest && files.jpManifest.content, files.jpVerification && files.jpVerification.content, files.jpSums && files.jpSums.content) +
        '<div class="quick-links"><a href="./data/exedra-integrity.json" target="_blank" rel="noreferrer">RAW INTEGRITY JSON ↗</a></div>';
    }
    if (subId === 'troubleshoot') {
      return '<p class="content-kicker">EXEDRA / HELP</p><h2>TROUBLESHOOT</h2>' +
        '<h3>没有台区或日区 Google 账号，也能下载安装吗？</h3>' +
        '<p>公开下载与原版 split 安装不要求 Google Play 账号改区。TW 与 JP 都从发布资产获取完整 XAPK；游戏登录和服务状态在启动后单独判断。</p>' +
        '<h3>游戏提示“应用程序已推出新版本”</h3>' +
        '<p>这是 Android 客户端升级提示。下载当前 XAPK 后原位升级，不要重新安装旧版，也不要先清除游戏资料。</p>' +
        '<h3>以前教程的 GitHub 链接为什么显示 404？</h3>' +
        '<p>历史阶段仓库曾有可见性变化；当前教程与发布入口以 MAGIUS LINK 和源仓库现状为准。旧收藏链接不会自动更新到新版本。</p>' +
        '<h3>安装失败、签名冲突或 split 缺失</h3>' +
        '<p>使用完整的同版本 XAPK，一次安装全部三个 APK。若显示 INSTALL_FAILED_UPDATE_INCOMPATIBLE，先检查现有客户端签名来源，不要通过卸载来试错。</p>' +
        '<h3>向导找不到设备，或同时连接多个模拟器</h3>' +
        '<p>确认 MuMu 已开启 ADB 调试。没有自动发现时输入实例设置显示的 ADB 地址；多个实例必须明确选择目标。也可用 TW_ADB 指定 adb.exe 路径。</p>' +
        '<h3>安装成功之后仍有网络或登录问题</h3>' +
        '<p>安装、网络与账号登录需要分别判断。保留错误文字与版本信息；工具不会修改 VPN、代理、DNS 或游戏账号，也不读取密码、引继码或会话资料。</p>';
    }
    const doc = data.docs.get(subId);
    if (!doc) return '<p>DOCUMENT LOADING...</p>';
    return '<p class="content-kicker">EXEDRA / GUIDE / ' + escapeHtml(subId.toUpperCase()) + '</p>' +
      renderMarkdown(doc.content, doc.path);
  }

  if (subId === 'contact-about') return contactHtml();
  return '<p class="content-kicker">OPERATOR / PROFILE</p><h2>MadeInMagius</h2>' +
    '<p>我进行插画、角色创作和 Cosplay以及程序开发。我会把自己喜欢的作品从单纯的游戏内容进一步制作成可以阅读、搜索、互动和长期保存的数字项目。</p><p>目前主要围绕《魔法纪录》《Magia Exedra》等作品进行开发。也在逐渐尝试把这些项目中积累的经验扩展到更多游戏和作品上。</p><p>在《魔法纪录》相关项目中，我制作了基于美服私服的中文化国服， L2D 网站，并整合 ADV 剧情播放。同时开发角色称呼、身高等资料查询、角色剧情搜索、角色同时出场统计以及魔女文字 OCR 等功能，并将这些系统互相连接，让搜索到的内容可以直接进入剧情阅读、游戏剧情播放。剧情阅读部分也在逐渐从一个单独作品的网站，发展成更通用的 ADV 浏览器，也在尝试兼容不同作品，并继续完善这套通用的保存与播放框架。</p><p>在《Magia Exedra》相关项目中，我正在制作 3D 角色互动系统，计划实现舞台调度、关键帧时间轴和完整的实时演出系统。</p><p>我也会制作其他独立工具，例如网易云下架音乐歌单导出工具、Bilibili 粉丝取关记录与查询工具等。</p>' +
    '<div class="quick-links"><a href="https://github.com/HiiragiNemu" target="_blank" rel="noreferrer">GITHUB ↗</a>' +
    '<a href="https://space.bilibili.com/625821" target="_blank" rel="noreferrer">BILIBILI ↗</a></div>';
}
