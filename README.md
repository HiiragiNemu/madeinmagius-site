# MadeInMagius / MAGIUS LINK 个人软件与作品中心

统一的个人下载网站、使用指南与作品导航，保留 CRT 终端风格，并适配桌面和手机。

- [Cloudflare 主站](https://madeinmagius-site.pages.dev/)
- [GitHub Pages 镜像](https://hiiraginemu.github.io/madeinmagius-site/)

## 网站提供什么

- **B站粉丝快照伴侣**：Android APK、Tampermonkey 用户脚本、F12 Console 及使用指南。
- **网易云音乐歌单完整曲名导出器**：Android 完整版、Windows x64、Python ZIP / wheel、清单与验签文件及使用指南。
- **Magia Exedra TW / JP**：客户端下载、安装工具、完整教程与校验信息。
- **魔法纪录中文化私服**：APK 与教程入口。
- **相关作品导航**：Reader、角色称呼与身高查询、3D Viewer、Live2D / ADV；这些项目由各自仓库维护。
- 作者介绍、联系、自愿支持与 QQ 群 `928098518`。支持与否不影响下载功能。

截至 2026-10-04 核对的发布组合：B站 Android **v0.1.14**、用户脚本 **v0.2.11**；网易云 Android **v2.5.5**，Windows / Python / wheel 仍为 **v2.5.1**。不同平台独立标注实际版本，不把 Android 版本套到桌面资产上。后续版本以在线发布元数据及源项目清单为准。

### 发布版本与应用更新

Android 标题与功能说明跟随发布元数据。B站 v0.1.11 起显示保存与滚动比较修复，v0.1.12 起显示启动更新提醒；网易云 v2.5.3 起显示启动更新提醒。旧版或未知元数据不会提前宣称新版行为。新用户安装本页正式 APK 后，后续启动可检查新版；用户确认下载、校验并经 Android 确认后覆盖安装。这是签名 APK 更新，不是静默替换应用代码。旧用户首次升级不要先卸载或清除数据。B站 v0.1.14 和网易云 v2.5.5 修正更新页高对比度、系统栏安全区域、固定返回入口，以及已安装版本与检查结果分区；不改变更新网络或原签名。

## 仓库职责与资产来源

本仓库负责首页、产品导航、指南、响应式布局、下载代理、更新元数据和静态镜像，不复制或修改各应用的业务源码。

B站和网易云的正式包由各自源仓库维护：

- `HiiragiNemu/Bilibili-Follower-Snapshot`（PRIVATE）
- `HiiragiNemu/netease-cloudmusic-delisted-exporter`（PRIVATE）

网站仓库本身目前公开；两个工具源码仓库保持私有，普通下载不要求访客拥有仓库权限。Cloudflare Functions 在服务端读取允许的 Release 资产，浏览器使用网站 HTTPS 下载路径，而不是私有 GitHub 下载链接。

公开更新与下载以源 Release、`RELEASE_MANIFEST.json`、文件大小、SHA-256 和签名约束为依据；`data/pinned-assets.*`、`data/releases.json` 等承担静态显示和已验证回退。不要仅修改版本文本而沿用另一个版本的文件，也不要用旧回退包替代已经确认的新版。

主程序下载区只展示当前正式分发组合；历史商店 APK、AAB、source tar 等按其自身版本和归档清单处理，不假定每次 Android 更新都会重发所有变体。

## 主要服务入口

| 路径 | 用途 |
| --- | --- |
| `/api/releases` | 两个工具及 Exedra 的公开发布元数据 |
| `/downloads/bilibili/android` | B站正式 Android APK |
| `/downloads/bilibili/userscript` | B站用户脚本下载 |
| `/downloads/bilibili-follower-snapshot.user.js` | 用户脚本安装及自动更新的兼容入口 |
| `/downloads/bilibili-follower-snapshot-console.js` / `.txt` | F12 脚本及可复制文本 |
| `/downloads/netease/android-full` | 网易云正式完整版 APK |
| `/downloads/netease/windows` / `python` / `wheel` | 网易云各平台文件 |
| `/downloads/netease/manifest` / `sums` / `cert` / `signature` | 清单、SHA-256、公开证书与验签记录 |
| `/updates/bilibili/android.json` | B站 APP 更新元数据 |
| `/updates/netease/android.json` | 网易云 APP 更新元数据 |

GitHub Pages 只提供静态页面，不运行 Pages Functions；涉及私有资产、实时发布和 APK 更新的请求转到 Cloudflare 服务。新增下载种类需要同步允许列表、页面入口、清单和测试，不能只在页面中拼接一个 URL。

## 源码结构

- `assets/`、`index.html`：终端 UI、导航、内容和视觉效果。
- `functions/`：发布 API、允许列表下载与 Android 更新路由。
- `data/`：发布快照、固定资产信息、完整性数据和教程资料。
- `lib/`：特定项目的发布解析。
- `scripts/`：构建、下载/更新校验和回归测试。
- `docs/`：托管、迁移和集成记录；早期迁移文档中的旧版本、临时入口与待办属于当时状态，不代表当前生产组合。
- `dist/`：构建输出，不是独立源码仓库。

## 本地检查与构建

使用 Node.js 24。核心构建与检查脚本使用 Node 内置模块，无需安装运行时依赖：

```sh
npm run check
npm run build
```

`check` 覆盖语法、构建契约、下载与更新路由、用户脚本、首页和相关项目集成。它不等同于线上验收；页面或下载逻辑变更后，还要验证实际 HTTPS 响应、MIME、文件大小/hash 及手机/桌面交互。

静态预览可在构建后用任意本地静态服务器打开 `dist/`；该方式不模拟 Functions。服务端联调需使用支持 Pages Functions 的环境。

## 托管与发布

- **GitHub Pages**：现有 [pages.yml](.github/workflows/pages.yml) 在 `main` 推送或手动触发时运行检查、构建并部署 `dist/`；文档提交也可能触发该网页工作流，不会生成新的应用 Release。
- **Cloudflare Pages**：现有 `madeinmagius-site` 项目通过 GitHub 集成追踪 `main`，构建命令 `npm run build`，输出 `dist/`，同时部署当前 `functions/`。不要另建替代项目或只上传缺少服务路由的静态副本。
- 应用发新版后，动态路由在满足校验规则时读取源 Release；静态发布快照和固定回退仍应按实际验收结果维护，不假定所有镜像元数据都会自动更新。
- 仅改 README 不需要重新生成/上传 APK，也不需要重新创建应用标签或 Release。

发布前保留当前生产部署标识和对应的已验证构建。回滚应恢复匹配的静态文件与 Functions，复查下载和更新路由；不要只回退首页而混用不同代服务端逻辑。

## 凭据与隐私

`GITHUB_RELEASES_TOKEN` 仅放在 Cloudflare 加密 secret 中，并限于所需源仓库的只读权限。本地联调若使用 `.dev.vars`，只存于已忽略的本机文件；示例中只放占位值。Token、Cookie、签名私钥、密码、用户导出和私有备份均不进入浏览器、提交或公开下载。

旧独立下载站的迁移记录保留在 [MIGRATION.md](docs/MIGRATION.md)；新增维护从本仓库继续，不恢复废弃站点为第二套发布来源。

## 不依赖私有仓库 Actions 额度的发布方式

- 两个应用源码仓库保持 PRIVATE，由各自 Cloudflare Git 构建项目执行 Android 测试、编译、原证书签名，再通过 GitHub API 发布完整 Release。无需启动 GitHub Actions，也无需维护者电脑在线。
- 本下载站通过 Cloudflare Git 集成直接验证、构建和部署；应用下载与更新接口动态读取已验证的正式 Release。Cloudflare 自身构建次数和时长限制仍适用。
- 重复的浏览器/更新路由/字体维护 Actions 改为仅手动。原 GitHub Pages 镜像保留其公开仓库的标准 Ubuntu 发布任务；它不消耗私有仓库的 Actions 分钟额度，且不是 APK 或 Cloudflare 主站发布的前置依赖。
- 不为额度改变任何应用仓库可见性。密钥和发布凭据只在 Cloudflare production 加密环境中，preview 不配置密钥。
