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
    { id: 'programs', label: '未来将添加更多网站', note: '预留' },
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
    '<a href="https://www.ifdian.net/a/madeinmagius" target="_blank" rel="noreferrer">爱发电</a>' +
    '</div>';
}

function magirecoClientHtml(current) {
  let download = '<p role="status">正在读取最新正式版本…</p>';
  if (current?.state === 'ready') {
    download = '<p><strong>客户端版本 ' + escapeHtml(current.version) + '</strong> · ' + formatBytes(current.size) + '</p>' +
      '<a class="download-button" href="' + escapeHtml(serviceUrl(current.download)) + '">下载 APK</a>' +
      '<p class="meta-line">SHA-256: ' + escapeHtml(current.sha256) + '</p>';
  } else if (current?.state === 'error') {
    download = '<p role="status">发布信息正在同步或暂时不可用，请稍后重新检查。</p>';
  }
  return '<p class="content-kicker">MAGIRECO / ANDROID</p><h2>魔法纪录中文化私服</h2>' +
    '<p>魔法纪录汉化客户端（Android）。无需 Root；安装包不包含随后下载的全部游戏资源。</p>' +
    '<div class="download-stack"><article class="download-card"><h3>ANDROID APK</h3>' + download +
    '<p><button class="terminal-copy-button" type="button" data-magireco-refresh' +
    (current?.state === 'loading' ? ' disabled' : '') + '>重新检查版本</button></p></article></div>' +
    '<p>这里自动读取正式发布版本。本页显示客户端内置版本，可能与系统安装详情中的版本号不同。</p>' +
    '<h3>初次安装</h3><ol>' +
    '<li>点击“下载 APK”，下载完成后打开文件。</li>' +
    '<li>如系统询问，允许当前浏览器或文件管理器安装未知来源应用，再按提示完成安装。</li>' +
    '<li>打开客户端。资源服务器地址已经内置，无需手工填写。</li>' +
    '<li>在应用内下载资源，保持联网并预留下载与解压空间，以界面的进度和空间提示为准。完成后按“进入游戏”或界面启动提示继续。</li></ol>' +
    '<h3>下载资源与线路</h3>' +
    '<p>网络较慢但进度仍在增加时，可以继续等待。低速提示中的“关闭”和“继续下载”都会保留当前任务；Logo 右侧的“线路”可手动选择下载线路。</p>' +
    '<p>资源行中的“重下”表示从头下载，不是继续当前下载。已有兼容下载内容会保留断点。</p>' +
    '<h3>已有客户端如何更新</h3><ol>' +
    '<li>同来源、同签名的版本可以直接安装新版覆盖更新，不要先卸载或清除数据。</li>' +
    '<li>更新后打开客户端，保留已有资源与本地状态，并按版本检查下载所需更新。</li>' +
    '<li>若系统提示安装冲突，先核对旧包来源、包名和签名并保留原数据，不要用卸载作为通用解决办法。</li></ol>' +
    '<h3>文件权限</h3>' +
    '<p>正常资源下载使用应用目录，无需开启所有文件访问。只有需要读写共享存储时，再使用 Logo 右侧的“文件权限”，手动进入系统设置授权。</p>';
}

export function renderContent(programId, subId, data) {
  if (programId === 'home') {
    if (subId === 'magireco-private-server') return magirecoClientHtml(data.magireco);
    if (subId === 'programs') {
      return '<p class="content-kicker">MAGIUS LINK / UPCOMING</p><h2>未来将添加更多网站</h2>' +
        '<p>这里预留给未来的更多项目。新的网站与作品会陆续加入 HOME。</p>';
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
      return '<p class="content-kicker">BILIBILI / ANDROID / ' + escapeHtml(releaseTag) + '</p><h2>粉丝快照伴侣</h2>' +
        '<p>Android 10+ 独立伴侣。无需 root、ADB、Frida 或 Tampermonkey；在伴侣内登录后读取粉丝页并使用同一套快照逻辑。</p>' +
        '<div class="download-stack">' +
        downloadCard(data, 'bilibili', 'android', 'ANDROID APK', '签名 Android 伴侣', './downloads/bilibili/android') +
        '</div>' +
        '<p>打开“应用更新与文件访问”可检查新版并交给系统确认安装。默认 Download 始终优先使用 Android MediaStore；Android 11+ 的所有文件访问仅在 MediaStore 失败时作为兼容回退，系统选择位置保存 JSON 不依赖该权限。</p>' +
        '<p>完整扫描会把本轮快照推进为下一轮比较基线；历史待处理变化单独保留，不再覆盖最新一轮 N-1 → N 比较。退出或换号不会删除历史快照和导出文件。</p>';
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
      return '<p class="content-kicker">NETEASE / ANDROID / v2.5.2</p><h2>ANDROID</h2>' +
        '<p>Android 8.0+ 完整版。日常登录、选择、比较和导出不需要电脑、Root 或 ADB。</p>' +
        '<div class="download-stack">' +
        downloadCard(data, 'netease', 'androidFull', '完整版 APK', 'Android 8.0+ · 推荐', './downloads/netease/android-full') +
        '</div>' +
        '<p>打开“应用更新与文件访问”可检查新版并交给系统确认安装；Android 11+ 可手动开启所有文件访问，也可继续用系统选择位置保存 JSON。首次从本页覆盖安装旧版，后续在应用内检查更新。</p>' +
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
      return '<p class="content-kicker">NETEASE / VERIFY / ANDROID v2.5.2</p><h2>清单与签名</h2>' +
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
        downloadCard(data, 'exedra', 'jpXapk', 'JP 3.18.0 XAPK', '日服原版完整 XAPK', './downloads/exedra/jp-xapk') +
        downloadCard(data, 'exedra', 'tools', 'TW / JP TOOLS v1.4.0', '安装与升级工具', './downloads/exedra/tools') +
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
