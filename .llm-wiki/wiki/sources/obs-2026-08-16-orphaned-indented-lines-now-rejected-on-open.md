---
type: source
title: "Observation: Orphaned indented lines now rejected on open"
tags:
  - bugfix
  - parser
  - validation
  - pi-task-manager
status: observation
created: 2026-08-16
updated: 2026-08-16
slug: obs-2026-08-16-orphaned-indented-lines-now-rejected-on-open
relevance: high
observed_at: 2026-08-16T03:25:34.694Z
source_context: Fixing verified round-trip bugs in pi-task-manager
---

# ⭐ Observation: Orphaned indented lines now rejected on open

Fixed pi-task-manager bug CZuCTj: orphaned indented lines (manual edit deleting an intermediate line) were silently re-parented to root by parseTodoFile because `parent = stack[depth-1] ?? null`. Added `findOrphanLines(content)` to lib/parser.ts (mirrors the parse scan; flags a line at depth d where stack[d-1] is undefined) and wired it into TaskManager.openFile to return an error listing line numbers + task IDs instead of opening. Chose "validate on open" over "attach to nearest ancestor" (user decision). session_start hook already surfaces the error Result as a warning notification. TDD: 3 regression tests in tests/validation.test.ts (2 orphan-rejection red→green, 1 valid-nested no-false-positive). All 45 tests pass.

*Relevance: high*
*Context: Fixing verified round-trip bugs in pi-task-manager*
*Tags: bugfix parser validation pi-task-manager*

---
*Observed: 2026-08-16T03:25:34.694Z*
