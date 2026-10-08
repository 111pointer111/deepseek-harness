# Agent Note: AIRI resources in the 0.2.1 sidebar

Status: implemented

English | [中文](2026-10-08-airi-resource-sidebar.zh.md)

## Problem

HEIC originals fail to decode in Chromium even when AIRI supplies a JPEG preview. The 0.2.1 UI replaces the earlier Details panel, while its persona and Shell APIs also differ from the deployed 0.1.2 preset.

## Decision

The standalone `extensions/airi-resources` plugin registers a Resources tab and a conversation-header action through public slots. Each loaded tool result keeps its original and preview together; stable resource references deduplicate the session list. HEIC uses the authorized preview, other images fall back on decode failure, and native video controls use the original stream with a preview poster. Original downloads keep their signed URL.

The migration script declares the existing AIRI preset in the profile, converts persona text to prefix, preserves model profiles, selects the official Messages endpoint, and converts native Shell calls to execute/result. It preserves the legacy settings file under the imported marker so the runtime importer cannot overwrite the converted endpoint.

## Alternatives considered

**Port the earlier Chat renderer fork.** Its Details panel does not exist in 0.2.1. Public sidebar registrations keep this extension independent from the upstream chat layout.

**Convert original images in the resource service.** Existing JPEG attachments already solve display compatibility without changing original bytes, adding a decoder, or increasing server memory use.

## Consequences

The list follows loaded session history and reconstructs after reload. Browser codec support still limits video playback. Focused tests cover resource association, deduplication, origin checks, registration disposal, and migration idempotence. Real Chromium acceptance on the deployed Tailnet URL covers HEIC/JPEG rendering, native video playback, original HEIC download, reload recovery, and a 390-pixel viewport.
