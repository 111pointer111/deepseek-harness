# AIRI resources for DSH 0.2.1

English | [中文](README.zh.md)

The extension adds a Resources action to the conversation header and a Resources tab to the right sidebar. Each session shows its loaded tool results as image, video, audio, and PDF cards. Repeated reads of one resource share a card. Reloading reconstructs the list from the session history.

HEIC/HEIF images use the session-authorized JPEG preview supplied by AIRI. Other images try their original and fall back to that preview if decoding fails. The download link retains the signed original URL. Videos have native playback controls and do not autoplay.

Build with `node build.mjs` and test with `node --test tests/*.test.mjs`. Install the directory under `DSH_HOME/plugins/dsh-airi-resources`, then add its `lib/index.js` to the Web profile patch's insert list. The extension uses the public right-sidebar tab and conversation-header slots; it does not replace the upstream chat renderer.

The resource list covers loaded history. Image previews require a successful `airi_get` preview attachment. Video playback depends on the browser's codec support; downloading remains available. Connectors and original files stay in AIRI/Immich/Paperless.

For an existing 0.1.2 AIRI deployment, stop the service and back up the complete home and service configuration before running `node migrate-profile.mjs <0.2.1-runtime-directory> <DSH_HOME> <legacy-settings-file>`. The script preserves model profiles in both Web and headless configurations and converts the four native Shell adapters. Re-running it keeps an existing AIRI declaration. Run its integration check with `DSH_RUNTIME_TEST_ROOT=<0.2.1-runtime-directory> node --test tests/migration.acceptance.mjs`. Retain the earlier runtime and backup until the deployed UI and tools pass acceptance.
