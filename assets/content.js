export const PROGRAMS = {
  home: { subs: [
    { id: 'welcome', label: 'WELCOME', note: '入口' },
    { id: 'programs', label: 'PROGRAMS', note: '工具清单' },
    { id: 'contact', label: 'CONTACT', note: '联系' }
  ]},
  bilibili: { subs: [
    { id: 'android', label: 'ANDROID APK', note: '伴侣应用' },
    { id: 'userscript', label: 'USERSCRIPT', note: '浏览器脚本' },
    { id: 'bili-guide', label: 'USAGE', note: '使用说明' }
  ]},
  netease: { subs: [
    { id: 'windows', label: 'WINDOWS X64', note: '免安装包' },
    { id: 'python', label: 'PYTHON', note: '跨平台' },
    { id: 'netease-guide', label: 'USAGE', note: '使用说明' }
  ]},
  exedra: { subs: [
    { id: 'exedra-downloads', label: 'DOWNLOADS', note: 'TW / JP / 工具' },
    { id: 'tw-mumu', label: 'TW · WINDOWS / MUMU', note: '完整教程' },
    { id: 'tw-phone', label: 'TW · ANDROID PHONE', note: '完整教程' },
    { id: 'jp-android', label: 'JP · ANDROID / MUMU', note: '完整教程' },
    { id: 'steam', label: 'STEAM WINDOWS', note: '安装与网络' },
    { id: 'tw-client-113', label: 'TW CLIENT 1.1.3', note: '版本说明' },
    { id: 'tw-demo', label: 'MUMU DEMO SCRIPT', note: '演示脚本' },
    { id: 'tw-mumu-en', label: 'TW · WINDOWS / MUMU (EN)', note: 'English guide' },
    { id: 'tw-phone-en', label: 'TW · ANDROID PHONE (EN)', note: 'English guide' },
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
      '<p class="lead">这里是 MadeInMagius 的统一工具入口。左侧选择程序，连接线会点亮该程序的子系统；在子系统中选择下载、工具或教程，内容会在这里打开。</p>' +
      '<p>下载、教程和工具本身就是界面。</p>' +
      '</div></div>';
  }

  if (programId === 'bilibili') {
    if (subId === 'android') {
      return '<p class="content-kicker">BILIBILI / ANDROID</p><h2>粉丝快照伴侣</h2>' +
        '<p>Android 伴侣保留完整快照、比较与导出能力。APK 下载入口已恢复。</p>' +
        '<div class="download-stack">' +
        downloadCard(data, 'bilibili', 'android', 'ANDROID APK', 'B站粉丝快照伴侣', './downloads/bilibili/android') +
        '</div><div class="quick-links"><a href="https://github.com/HiiragiNemu/Bilibili-Follower-Snapshot" target="_blank" rel="noreferrer">SOURCE ↗</a></div>';
    }
    if (subId === 'userscript') {
      return '<p class="content-kicker">BILIBILI / USERSCRIPT</p><h2>USERSCRIPT</h2>' +
        '<p>浏览器用户脚本入口。</p><div class="download-stack">' +
        downloadCard(data, 'bilibili', 'userscript', 'BILIBILI USERSCRIPT', '浏览器脚本', './downloads/bilibili/userscript') +
        '</div>';
    }
    return '<p class="content-kicker">BILIBILI / USAGE</p><h2>使用说明</h2>' +
      '<p>安装用户脚本或 Android 伴侣后，在 B站粉丝页读取当前粉丝列表并保存快照。后续读取可与旧快照比较，查看新增与关系消失候选。</p>' +
      '<p>Android 伴侣支持启动备份、保存快照与结果查看。</p>' +
      '<div class="quick-links"><a href="https://github.com/HiiragiNemu/Bilibili-Follower-Snapshot#readme" target="_blank" rel="noreferrer">完整 README ↗</a></div>';
  }

  if (programId === 'netease') {
    if (subId === 'windows') {
      return '<p class="content-kicker">NETEASE / WINDOWS</p><h2>WINDOWS X64</h2>' +
        '<p>免安装 Windows 包，支持完整曲目、已下架记录、历史差异与断点续跑。</p>' +
        '<div class="download-stack">' +
        downloadCard(data, 'netease', 'windows', 'WINDOWS X64 ZIP', 'Windows 免安装包', './downloads/netease/windows') +
        '</div>';
    }
    if (subId === 'python') {
      return '<p class="content-kicker">NETEASE / PYTHON</p><h2>PYTHON</h2>' +
        '<p>跨平台 Python 包，适合 Android / Termux、macOS、Linux 与已有 Python 环境。</p>' +
        '<div class="download-stack">' +
        downloadCard(data, 'netease', 'python', 'PYTHON ZIP', '跨平台 Python 发行包', './downloads/netease/python') +
        '</div>';
    }
    return '<p class="content-kicker">NETEASE / USAGE</p><h2>使用说明</h2>' +
      '<p>工具可导出自建与收藏歌单中的完整歌曲，包含已下架项目；支持 TXT / CSV、去重、历史快照、差异报告和中断后继续。</p>' +
      '<div class="quick-links"><a href="https://github.com/HiiragiNemu/netease-cloudmusic-delisted-exporter#readme" target="_blank" rel="noreferrer">完整 README ↗</a></div>';
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
        '<a href="https://github.com/HiiragiNemu/MagiaExedraTWTools" target="_blank" rel="noreferrer">SOURCE ↗</a>' +
        '<a href="https://mme.so-net.tw/" target="_blank" rel="noreferrer">TW OFFICIAL ↗</a>' +
        '<a href="https://www.madoka-exedra.com/" target="_blank" rel="noreferrer">JP OFFICIAL ↗</a>' +
        '</div>';
    }
    if (subId === 'troubleshoot') {
      return '<p class="content-kicker">EXEDRA / HELP</p><h2>TROUBLESHOOT</h2>' +
        '<h3>没有台区或日区 Google 账号，也能下载安装吗？</h3>' +
        '<p>可以。公开下载与原版 split 安装不要求 Google Play 账号改区。TW 与 JP 都从发布资产获取完整 XAPK；游戏登录和服务状态在启动后单独判断。</p>' +
        '<h3>游戏提示“应用程序已推出新版本”</h3>' +
        '<p>这是 Android 客户端升级提示。下载当前 XAPK 后原位升级，不要先卸载或清除游戏资料。</p>' +
        '<h3>安装失败、签名冲突或 split 缺失</h3>' +
        '<p>使用完整的同版本 XAPK，一次安装全部三个 APK。若显示 INSTALL_FAILED_UPDATE_INCOMPATIBLE，先检查现有客户端签名来源，不要通过卸载来试错。</p>' +
        '<h3>安装成功之后仍有网络或登录问题</h3>' +
        '<p>安装、网络与账号登录需要分别判断。保留错误文字与版本信息；工具不会修改 VPN、代理、DNS 或游戏账号。</p>';
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
