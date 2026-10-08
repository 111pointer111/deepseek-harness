# Agent Note: 0.2.1 侧栏中的 AIRI 资源

Status: implemented

[English](2026-10-08-airi-resource-sidebar.md) | 中文

## Problem

即使 AIRI 已提供 JPEG 预览，HEIC 原图仍无法在 Chromium 中解码。0.2.1 UI 替换了原有详情栏，人格与 Shell API 也不同于已部署的 0.1.2 预设。

## Decision

独立的 `extensions/airi-resources` 插件通过公开槽位注册资源标签页与会话顶部入口。每个已加载的工具结果保留原件及对应预览，稳定资源引用负责会话列表去重。HEIC 使用授权预览，其他图片解码失败时回退；原生视频控件读取原件流并使用预览封面。原件下载保留签名地址。

迁移脚本在 profile 中声明既有 AIRI 预设，把人格 text 转为 prefix，保留模型配置，选择官方 Messages 地址，并把原生 Shell 调用转为 execute/result。旧设置文件保留在 imported 标记下，避免运行时导入器覆盖已转换的地址。

## Alternatives considered

**移植旧版 Chat 渲染器分支。** 0.2.1 已没有原来的详情栏。公开的侧栏注册机制使扩展独立于上游聊天布局。

**在资源服务中转换原图。** 既有 JPEG 附件即可解决显示兼容，无须改变原件字节、新增解码器或增加服务器内存占用。

## Consequences

列表覆盖已加载的会话历史，刷新后可重建。视频播放仍受浏览器编码支持限制。相关测试覆盖资源配对、去重、来源检查、注册清理及迁移幂等性。正式 Tailnet 地址上的真实 Chromium 验收覆盖 HEIC/JPEG 显示、原生视频播放、HEIC 原件下载、刷新恢复及 390 像素视图。
