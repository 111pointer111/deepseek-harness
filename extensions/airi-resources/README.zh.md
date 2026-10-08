# DSH 0.2.1 的 AIRI 资源列表

[English](README.md) | 中文

插件在会话顶部增加“资源”入口，并在右侧增加“资源”标签页。每个会话把已加载的工具结果汇总成图片、视频、音频和 PDF 卡片。同一资源重复读取只显示一张卡片，刷新页面后从会话历史重建列表。

HEIC/HEIF 图片使用 AIRI 提供的、受会话授权保护的 JPEG 预览。其他图片优先显示原图，解码失败时回退到对应预览。下载链接保留签名原文件地址。视频使用原生播放控件，不自动播放。

执行 `node build.mjs` 构建，执行 `node --test tests/*.test.mjs` 测试。把本目录安装到 `DSH_HOME/plugins/dsh-airi-resources`，再把包内的 `lib/index.js` 加入 Web profile patch 的 insert 列表。插件使用公开的右侧标签页和会话顶部扩展槽，不替换上游聊天渲染器。

资源列表覆盖已加载的会话历史。图片预览需要 `airi_get` 成功返回预览附件。视频播放取决于浏览器的编码支持，下载仍然可用。连接器与原文件由 AIRI、Immich 和 Paperless 管理。

既有 0.1.2 AIRI 部署应先停止服务，备份完整 home 与服务配置，再执行 `node migrate-profile.mjs <0.2.1-runtime-directory> <DSH_HOME> <legacy-settings-file>`。脚本把模型配置保留到 Web 和 headless，并转换四个原生 Shell 适配器。重复执行会保留已存在的 AIRI 声明。迁移检查使用 `DSH_RUNTIME_TEST_ROOT=<0.2.1-runtime-directory> node --test tests/migration.acceptance.mjs`。正式 UI 和工具验收通过前，保留旧运行时及备份。
