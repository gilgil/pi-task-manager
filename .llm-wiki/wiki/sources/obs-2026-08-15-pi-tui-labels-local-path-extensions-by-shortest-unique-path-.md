---
type: source
title: "Observation: pi TUI labels local-path extensions by shortest unique path suffix"
tags:
  - pi
  - extension
  - packaging
  - tui
  - label
status: observation
created: 2026-08-15
updated: 2026-08-15
slug: obs-2026-08-15-pi-tui-labels-local-path-extensions-by-shortest-unique-path-
relevance: high
observed_at: 2026-08-15T12:54:05.849Z
source_context: Fixing pi-task-manager showing as 'extension' in pi's extension list
---

# ⭐ Observation: pi TUI labels local-path extensions by shortest unique path suffix

In pi (v0.84.x), the interactive TUI derives extension display labels differently by source type: npm:/git: sources use the package name + relative entry path, but local path installs (e.g. `pi install /path` → settings.json packages entry) are NOT package sources (isPackageSource only matches npm:/git:). For those, getCompactNonPackageExtensionLabel (dist/modes/interactive/interactive-mode.js) picks the shortest unique suffix of the entry file's display path, with a trailing index.ts/index.js popped. So an entry at extension/index.ts rendered as just "extension". Fix in pi-task-manager: moved entry to package root (index.ts) + lib/ at root, matching the canonical layout in docs/extensions.md — now labels as "pi-task-manager". Commit 00d6f07.

*Relevance: high*
*Context: Fixing pi-task-manager showing as 'extension' in pi's extension list*
*Tags: pi extension packaging tui label*

---
*Observed: 2026-08-15T12:54:05.849Z*
