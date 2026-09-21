export const PROGRAMS = {
  home: { subs: [
    { id: 'welcome', label: 'WELCOME', note: '入口' },
    { id: 'programs', label: 'PROGRAMS', note: '工具清单' },
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

function downloadCard(data, project, key, title, subtitle, stablePath) {
  const projectData = data.releases && data.releases.projects ? data.releases.projects[project] : null;
  const item = projectData && projectData.assets ? projectData.assets[key] : null;
  const href = item ? (item.download || item.browser_download_url || stablePath || '#') : '#';
  const target = href.startsWith('http') ? ' target="_blank" rel="noreferrer"' : '';
  return '<article class="download-card">' +
    '<h3>' + escapeHtml(title) + '</h3>' +
    '<p>' + escapeHtml(subtitle) + (item ? ' · ' + formatBytes(item.size) : '') + '</p>' +
    '<a class="download-button" href="' + escapeHtml(href) + '"' + target + '>DOWNLOAD</a>' +
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

export function renderContent(programId, subId, data) {
  if (programId === 'home') {
    if (subId === 'programs') {
      return '<p class="content-kicker">MAGIUS LINK / PROGRAM TABLE</p><h2>PROGRAMS</h2>' +
        '<div class="tool-list">' +
        '<div><b>BILIBILI SNAPSHOT</b><small>粉丝快照、Android 伴侣、userscript</small></div>' +
        '<div><b>NETEASE EXPORTER</b><small>歌单完整曲目与下架记录导出</small></div>' +
        '<div><b>EXEDRA TW / JP</b><small>原版客户端、安装工具与完整教程</small></div>' +
        '</div>';
    }
    if (subId === 'contact') return contactHtml();
    return '<p class="content-kicker">MAGIUS LINK / HOME</p><h2>WELCOME</h2>' +
      '<div class="hero-copy"><div>' +
      '<p class="lead">MadeInMagius 的软件、工具与资料入口。</p>' +
      '<div class="tool-list">' +
      '<div><b>BILIBILI SNAPSHOT</b><small>粉丝快照与 Android 伴侣</small></div>' +
      '<div><b>NETEASE EXPORTER</b><small>歌单与下架记录导出</small></div>' +
      '<div><b>EXEDRA TW / JP</b><small>客户端、安装工具与完整教程</small></div>' +
      '</div>' +
      '</div></div>';
  }

  if (programId === 'bilibili') {
    if (subId === 'android') {
      return '<p class="content-kicker">BILIBILI / ANDROID / v0.1.10</p><h2>粉丝快照伴侣</h2>' +
        '<p>Android 10+ 独立伴侣。无需 root、ADB、Frida 或 Tampermonkey；在伴侣内登录后读取粉丝页并使用同一套快照逻辑。</p>' +
        '<div class="download-stack">' +
        downloadCard(data, 'bilibili', 'android', 'ANDROID APK', '签名 Android 伴侣', './downloads/bilibili/android') +
        '</div>' +
        '<p>打开“应用更新与文件访问”可检查新版并交给系统确认安装；Android 11+ 可手动开启所有文件访问，也可继续用系统选择位置保存 JSON。首次从本页覆盖安装旧版，后续在应用内检查更新。</p>' +
        '<p>安装后可选择保存目录；默认启动备份会把快照、账本及已有比较/待处理 JSON 写入 Download。退出或换号不会删除历史快照和导出文件。</p>';
    }
    if (subId === 'userscript') {
      return '<p class="content-kicker">BILIBILI / USERSCRIPT</p><h2>USERSCRIPT</h2>' +
        '<p>适用于 Chrome、Edge、Firefox 以及支持用户脚本扩展的手机浏览器。</p><div class="download-stack">' +
        downloadCard(data, 'bilibili', 'userscript', 'BILIBILI USERSCRIPT', 'Tampermonkey 用户脚本', './downloads/bilibili/userscript') +
        '</div>' +
        '<p>安装 Tampermonkey 后打开自己的 B站空间，进入“粉丝快照”，完成读取后保存 JSON / CSV；以后可以导入旧快照比较。</p>';
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
        '<button class="terminal-copy-button" type="button" data-copy-url="' + escapeHtml(scriptUrl) + '" data-copy-fallback="' + escapeHtml(textUrl) + '">COPY FULL SCRIPT</button>' +
        '<a href="' + escapeHtml(textUrl) + '" target="_blank" rel="noreferrer">OPEN PLAIN TEXT ↗</a>' +
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
        downloadCard(data, 'netease', 'androidFull', '完整版 APK', 'Android 8.0+ · 推荐', '') +
        '</div>' +
        '<p>打开“应用更新与文件访问”可检查新版并交给系统确认安装；Android 11+ 可手动开启所有文件访问，也可继续用系统选择位置保存 JSON。首次从本页覆盖安装旧版，后续在应用内检查更新。</p>' +
        '<p>完整版可由用户主动启用刷新助手处理长久未打开的歌单。</p>';
    }
    if (subId === 'windows') {
      return '<p class="content-kicker">NETEASE / WINDOWS / v2.5.1</p><h2>WINDOWS X64</h2>' +
        '<p>免安装 ZIP。解压后双击“一键导出.cmd”，或直接运行 bin/NeteaseDelistedExporter.exe；运行程序不依赖本机 Python。</p>' +
        '<div class="download-stack">' +
        downloadCard(data, 'netease', 'windows', 'WINDOWS X64 ZIP', 'Windows x64 · 免安装', '') +
        '</div>';
    }
    if (subId === 'python') {
      return '<p class="content-kicker">NETEASE / PYTHON / v2.5.1</p><h2>PYTHON</h2>' +
        '<p>Windows、macOS、Linux 均可使用。便携 ZIP 解压后安装 requirements.txt；wheel 可直接由 pip 安装。</p>' +
        '<div class="download-stack">' +
        downloadCard(data, 'netease', 'python', 'PYTHON ZIP', 'Python 3 · 跨平台', '') +
        downloadCard(data, 'netease', 'wheel', 'PYTHON WHEEL', 'py3-none-any', '') +
        '</div>';
    }
    if (subId === 'netease-verify') {
      const project = data.releases && data.releases.projects ? data.releases.projects.netease : null;
      const assets = project && project.assets ? project.assets : {};
      function verificationLink(key, label) {
        const item = assets[key];
        if (!item) return '';
        const href = item.download || item.browser_download_url || '#';
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
    '<p>个人项目、工具、研究与发布入口。MAGIUS LINK 作为统一主页继续接入新的程序；旧的独立工具站会逐步并入或重定向到这里。</p>' +
    '<div class="quick-links"><a href="https://github.com/HiiragiNemu" target="_blank" rel="noreferrer">GITHUB ↗</a>' +
    '<a href="https://space.bilibili.com/625821" target="_blank" rel="noreferrer">BILIBILI ↗</a></div>';
}
