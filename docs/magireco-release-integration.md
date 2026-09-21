# 魔法纪录中文化私服发布对接

页面：`/#home/magireco-private-server`。HOME 四个网站链接保留在 `/#home/welcome`，与 APK 分区独立。

## 生产接口

- 最终发布门槛：`https://magireco-personal-release.pages.dev/legacy/config.json` 的 `client.version / apk_url / size / sha256`。
- APK：`HiiragiNemu/magireco-cn-patch` 的 `latest` Release 中 `magireco-latest-legacy-client.apk`。
- 生产端 `.github/workflows/publish-verified-client.yml` 在成功构建后发布 APK 与 sidecar，再更新上述客户端门槛。站点不修改构建、签名、资源包或生产工作流。

`GET /api/magireco` 每次获取最终门槛和 GitHub Release 资产，要求 SHA-256 与字节数一致才公布版本。使用内置语义版本，不使用 Android manifest 的历史 versionName。

`GET /downloads/magireco/android` 提供当前正式包。页面带 `?sha256=...` 绑定所显示的版本；旧页面碰到新版本返回 409，提示重新检查。下载时按已校验的 GitHub 资产 ID 流式传输，支持 HEAD 和 Range，不重打包。密钥只用于 GitHub API，绝不转发给 Pages 或资产 CDN。

生产包和清单处于更替窗口、摘要不一致或接口失败时，返回 503，不拿旧版本标签配新包，也不硬编码回退到某个固定版本。

## 自动更新行为

打开 APK 分区、刷新页面、或点击“重新检查版本”都会读取最新正式发布信息。生产端每次沿用既有正式发布流程，网站无需新提交或重新部署；没有新增定时任务。

验证：`node scripts/test-magireco-release.mjs` 包含连续两个模拟版本、旧页面点击、非原子发布窗口、上游故障、下载字节与教程渲染测试。
