---
type: source
title: "Observation: session_start hook added to pi-task-manager"
tags:
  - pi-task-manager
  - extension
  - session_start
  - hook
status: observation
created: 2026-08-15
updated: 2026-08-15
slug: obs-2026-08-15-session-start-hook-added-to-pi-task-manager
relevance: high
observed_at: 2026-08-15T14:37:40.975Z
source_context: Implementing session_start auto-open hook in pi-task-manager
---

# ⭐ Observation: session_start hook added to pi-task-manager

Added `session_start` hook to pi-task-manager (index.ts): on session start, checks `join(ctx.cwd, "TODO.md")` with `existsSync`, and if present calls the shared `manager.openFile(ctx.cwd)` (TaskManager.openFile takes a workspace DIRECTORY, not a file path — it appends TODO.md itself). Notifies via `ctx.ui.notify(msg, "info")` guarded by `ctx.hasUI` (false in print/JSON modes). Fires for all reasons: startup, reload, new, resume, fork. Task iEuD9e marked done 2026-08-15. 20/20 tests pass; hook type-checks clean against pi's d.ts.

*Relevance: high*
*Context: Implementing session_start auto-open hook in pi-task-manager*
*Tags: pi-task-manager extension session_start hook*

---
*Observed: 2026-08-15T14:37:40.975Z*
