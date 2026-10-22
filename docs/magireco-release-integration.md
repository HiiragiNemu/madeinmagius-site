# 魔法纪录中文化私服单版本发布对接

页面：`/#home/magireco-private-server`。两站仅展示同一个正式 APK；其他作品、历史证据报告和资源 delta 保留。

## 唯一发布来源

- 侧车元数据：`https://magireco-personal-release.pages.dev/magireco-current-legacy-client.version.json`。
- 精确 APK 资产：`HiiragiNemu/ProgettoMagius-1` 的 `latest` Release 下 `magireco-latest-legacy-client.apk`。
- 版本只接受 `1.2.x`，补丁号至少 5；Android `version_code` 必须是整数且大于 `1713000864`，避免旧未发布候选混入迁移包。
- 元数据中的文件名、GitHub URL、SHA-256、字节数及签名 payload 身份必须一致，并与唯一已上传 GitHub 资产相符。网站做身份一致性校验，客户端仍负责密码学验签。

上游 current/latest 两份侧车完全相同，签名 payload 的 `apk_urls` 只包含 GitHub Release 的 `magireco-latest-legacy-client.apk` 地址，以保留旧 1.2.3 更新器准入。网站读取 current metadata，但按该唯一签名 canonical 地址绑定 latest 资产 ID，不要求 payload 指向同名 current APK，也不添加签名 URL。current APK 仅是同字节别名，不作为网站下载资产。若该来源正在同步或资产不匹配，返回 503 并保留重新检查入口，不转向旧主版、兼容版、手动归档或桥接包。

个人发布站 `magireco-latest-legacy-client.apk` 仍是固定 1.1.11 升级桥；它与 GitHub Release 下同名文件不是同一分发语义。网站严格按 GitHub 主机及完整路径选择 canonical latest，不读取个人 relay 同名 latest；不修改、不推荐该固定桥作为正常新版。

## 一次覆盖迁移

此前标为 1.3.4 的用户，下载本页正式 1.2.5 或后续 1.2.x，使用同包名、原签名及更高 Android versionCode 做一次覆盖迁移；不先卸载，不清数据。之后统一使用 1.2.x 更新。网站不负责构建、重签 APK 或改变资源 delta。

## 两站下载行为

`GET /api/magireco` 返回单一版本，`source=current`。`GET /downloads/magireco/android?sha256=...` 通过已核对的 GitHub 资产 ID 流式下载，保留 HEAD、Range 和页面摘要绑定。页面所选包发生变化时返回 409，不静默换包。

GitHub Pages 的 `serviceUrl()` 继续把 API 与下载请求送到现有 Cloudflare 服务，保留 CORS。图标、按钮、布局、报告和历史 1.1.1 证据下载不变。

对应源码链接使用同一正式版本的 `magireco-legacy-client-{version}-corresponding-source.zip`，不使用可变分支源码 ZIP。发布脚本先核对该精确 GitHub 资产的 SHA-256、大小和已上传状态；网站不修改上游 APK 或源码资产。

## 1.2.6 发布对接

本版说明只展示生产任务交付的六项：行动盘外观进入原生战斗、游玩 LOG、离线结算匹配与商店文字、移除 Awaken 多余“醒”字、单版本升级、恢复未完成战斗提示的紧凑横向比例。只在正式元数据为 1.2.6 时显示该版说明；不把 AP 石、504、福袋等后续反馈列为已修复。

本版真实 APK 为 1.2.6 / `1713000868`，大小 `462776881` 字节，SHA-256 `2a66516a4c765e1a3749bd38e404d19657b7ce633a537408317f6a4a9eca60e5`。源码 ZIP 为 `126341510` 字节，SHA-256 `764df553546a1ff89b7c98bd95441cdc59b8e4e5417297c94bd7898a8649c3d1`。页面版本和下载摘要仍读取动态元数据，不将此摘要固定为后续版本。

最终输入由生产任务交付：`C:\MAGIA LOCAL\verification\offline-continuation-m370\single-line-publication-c\website-inputs.json`。准备阶段记录在同目录 `root-inputs.json`。收到明确 `FINAL_RELEASE_READY` / GO 且上游 APK 与源码已发布后再部署两站；不提前发布死链。部署回执和线上版本读回后停止，人工体验验收由用户完成，不追加浏览器或设备测试。

回归：`node scripts/test-magireco-release.mjs`、`node scripts/test-mirror-downloads.mjs`。测试使用合成字节，不预填尚未交付的 APK 摘要。

## 旧 1.3.4 发现序号兼容支持

此处是向后兼容的消费者支持，不表示 1.2.7 已发布。当前正式 1.2.6 的公告、元数据、APK 和升级指引保持不变；生产任务验收并切换上游后再同步新版说明。

仅接受明确签名的 `version=1.3.127` → `display_version=1.2.7` 映射。`release_version` 如存在仍是发现序号 `1.3.127`，不是显示字段。`compatibility_discovery` 的 schema 为 1、安装版本为 1.2.7、构建号必须与签名顶层一致且大于 1713000868、`same_published_apk=true`、`separate_client_release=false`。`single_line_migration` 必须与生产任务 `127-migration-contract.json` 的完整 schema 2 契约一致。首条签名说明须以“实际安装版本：1.2.7”开头，并在前 160 个字符内包含 `1.3.127`。

兼容分支用现有 APK 固定公钥验签：RSA-3072 / PKCS#1 v1.5 / SHA-256，消息为 `MAGIACN-APK-UPDATE-V1\n` 加原始 payload UTF-8 字节；不重序列化、不改签名内容，不允许运行时覆盖公钥。顶层与签名中的映射、身份、SHA、大小、构建号、唯一 canonical APK URL 必须一致；同版本源码资产也要匹配已上传 GitHub 文件的摘要和大小。

校验成功后，网站公共 `version`、APK 下载文件名、`X-Client-Version`、源码 ZIP 名和公告索引统一使用真实 `1.2.7`。不展示第二个 APK，也不从兼容序号字符串推算真实版本。普通 1.2.x 元数据继续保留既有一致性校验行为，schema 2 和新的构建号下限只作用于该兼容分支。

测试使用独立临时 RSA 签名、公钥及合成资产；只在测试进程替换 WebCrypto 的 importKey 返回值，实际 verify 运算不替换，也不访问生产签名私钥。涵盖旧 1.2.6、127 正向映射、签名/域/字段篡改、冲突映射、GET/HEAD/Range、旧 SHA 的 409、真实版本显示和源码链接；不等同于旧 1.3.4 真机升级验收。

### 实际 1.2.7 发布同步

实际客户端为 `1.2.7 / 1713000870`，签名发现序号 `1.3.127` 仅用于旧 1.3.4 检查更新，不是第二份 APK。网站按服务端输出的真实版本选择六条公告和对应源码；福袋说明使用生产方原文“本地免费模拟买钻”，不涉及真实充值。仅在读到正式 1.2.7 或后续版本时显示新版旧客户端更新指引，仍读到 1.2.6 时保留原迁移说明；元数据加载或报错时不预告已发布版本。

最终发布身份以生产方 `single-line-ui-final/root-inputs.json` 和明确 GO 后的线上资产为准；网站只更新公告和既定入口，不写客户端发布资产。页面与下载体验由用户人工验收。
