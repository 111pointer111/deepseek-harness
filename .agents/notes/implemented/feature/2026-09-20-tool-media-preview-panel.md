# Agent Note: Tool image resource preview panel

Status: implemented

English | [中文](2026-09-20-tool-media-preview-panel.zh.md)

## Problem

Tool results could persist an image attachment while Chat showed only the Tool call text. Users had no visible path from a connector result to its preview or browser download.

## Decision

Chat detects the newest settled Tool result containing an image and opens the existing resizable Details column for that call. The Details entry declares `conversation.details.media`; `ui-attachment` fills it with the shared authorized image gallery, so Tool resources reuse the same cache, loading, retry, and lightbox behavior as message and Trajectory images. The lightbox exposes the resolved blob URL through a native download link using the attachment name.

## Alternatives considered

**Add a second drawer and resource store.** The existing Details column already expands leftward, collapses, resizes, and follows the selected Tool call; duplicating those responsibilities would create competing panel state.

**Expose connector URLs directly to the browser.** This would bypass the session-authorized attachment loader and leak connector authentication concerns into presentation code.

## Consequences

Image-bearing connector results open a dismissible resource panel and support preview and download without a new transport or cache. The core content vocabulary still represents only raster image attachments, so audio, video, and arbitrary files require a separate durable attachment contract before they can use this surface.
