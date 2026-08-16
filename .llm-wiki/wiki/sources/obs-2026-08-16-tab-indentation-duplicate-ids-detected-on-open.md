---
type: source
title: "Observation: Tab indentation + duplicate IDs detected on open"
tags:
  - bugfix
  - parser
  - validation
  - pi-task-manager
status: observation
created: 2026-08-16
updated: 2026-08-16
slug: obs-2026-08-16-tab-indentation-duplicate-ids-detected-on-open
relevance: high
observed_at: 2026-08-16T03:51:54.122Z
source_context: Extending parse-phase validation in pi-task-manager
---

# ⭐ Observation: Tab indentation + duplicate IDs detected on open

Extended pi-task-manager open-time validation (bugs 4AmvH0, 4tN7g6). User confirmed the pattern: structural problems are detected in the parse phase and openFile fails with a message — never normalized/self-healed. Consolidated the orphan check into a single-pass `findTodoIssues(content): TodoIssue[]` in lib/parser.ts (discriminated union: orphan | tab | duplicate). Key finding: tab-indented task lines were silently DROPPED (parser regex `^( *)-\s+\[` only matches spaces, so a tab breaks the match and the line is lost — same data-loss class as orphans). TAB_TASK_RE detects tab-indent task lines. openFile now returns a combined error listing all problems with line numbers + IDs (e.g. "tab indentation on line 4 (x1y2z3), duplicate ID a1b2c3 (lines 3, 5), orphan line 6 (q9w8e7)"). TDD: 2 new red→green tests + valid-nested no-false-positive. All 47 tests pass.

*Relevance: high*
*Context: Extending parse-phase validation in pi-task-manager*
*Tags: bugfix parser validation pi-task-manager*

---
*Observed: 2026-08-16T03:51:54.122Z*
