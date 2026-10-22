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

## 本次发布门槛

当前仅本地准备。最终输入由生产任务交付：`C:\MAGIA LOCAL\verification\offline-continuation-m369\single-line-publication\website-inputs.json`。

收到明确 `FINAL_RELEASE_READY` 且核对最终真实 version/code/SHA/size/源码/URL 后才部署。禁止使用从未发布的 M368125/135 哈希或把本地合成测试当作最终 APK 身份。

回归：`node scripts/test-magireco-release.mjs`、`node scripts/test-mirror-downloads.mjs`。测试使用合成字节，不预填尚未交付的 APK 摘要。
