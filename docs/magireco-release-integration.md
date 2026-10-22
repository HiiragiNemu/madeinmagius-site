# 魔法纪录中文化私服发布对接

页面：`/#home/magireco-private-server`。HOME 网站和报告分区独立保留。

## 双通道来源

共同元数据主机：`https://magireco-personal-release.pages.dev/`。
共同 APK 来源：`HiiragiNemu/ProgettoMagius-1` 的 `latest` Release。

| 优先级 | 元数据路径 | 精确 GitHub APK 资产名 | 最低修复版本 |
| --- | --- | --- | --- |
| 正式通道 | `magireco-current-legacy-client.version.json` | `magireco-current-legacy-client.apk` | 1.3.4 |
| 兼容备用 | `magireco-compat-legacy-client.version.json` | `magireco-latest-legacy-client.apk` | 1.2.4 |

只有发布方验收并正式投送的侧车元数据、APK 名称、地址、大小和 GitHub SHA-256 全部匹配时，网站才显示下载。两通道独立校验；有效正式通道优先，只有它不可用时才显示明确标注的兼容备用包。低于修复门槛的 1.2.3 不再作备用。更高版本归档不会仅因上传而自动晋升。

`legacy/config.json` 及个人发布站的 `magireco-latest-legacy-client.apk` 是旧用户的固定 1.1.11 升级桥，不属于网站正常下载来源。网站不读取、不修改、不撤销这条桥接链。兼容元数据使用明确的 `compat` 路径，避免把桥接 APK 地址当作新包。

`GET /api/magireco` 返回所选版本及 `source=current|compatibility`。侧车中的签名 payload 与顶层身份字段须一致；本服务做一致性校验，不代替客户端密码学验签。

`GET /downloads/magireco/android` 按已经核对的 GitHub 资产 ID 流式传输，支持 HEAD 和 Range。页面携带 `?sha256=...`；所选包变化时旧链接返回 409，提示重新检查，不静默替换为另一包。两通道均不匹配时返回 503 而不是旧 APK。凭据仅发送到 GitHub API。

## GitHub Pages 与自动更新

GitHub Pages 没有 Functions；`serviceUrl()` 将元数据及下载请求发送至现有 Cloudflare 服务，保留 CORS。报告、静态文件及其余页面仍从各自主机读取。

打开 APK 分区或点击“重新检查版本”会重新读取。发布方以后沿用上述双通道即可自动投送新版本，不需逐版改网站。首次启用本补丁须等待两个已验收 APK 和元数据正式发布，再按最终交付的版本、大小、摘要、URL 核对。禁止提前部署仍指向 1.2.3 的发布窗口。

回归：`node scripts/test-magireco-release.mjs` 覆盖两个通道、未来更新、旧页面哈希绑定、同步故障、无旧桥回退、GET/HEAD/Range 与两站链接。
