---
type: source
title: "Observation: pi-task-manager: input validation added to addTask/editTask (TDD)"
tags:
  - pi-task-manager
  - validation
  - tdd
  - fix
status: observation
created: 2026-08-15
updated: 2026-08-15
slug: obs-2026-08-15-pi-task-manager-input-validation-added-to-addtask-edittask-t
relevance: high
observed_at: 2026-08-15T18:05:17.067Z
source_context: TDD fix for input validation in pi-task-manager addTask/editTask
---

# ⭐ Observation: pi-task-manager: input validation added to addTask/editTask (TDD)

Fixed the input-validation cluster in pi-task-manager lib/task-manager.ts via TDD. Added tests/validation.test.ts (9 tests) FIRST against the buggy code — 7 validation tests failed (red), 2 guard tests passed. Then applied the fix: (1) reject descriptions containing \n or \r in both addTask and editTask ("Description cannot contain newlines"); (2) added module-level DATE_RE=/^\d{4}-\d{2}-\d{2}$/ and validate scheduled/start/due in addTask (loop over the three) and editTask (loop over keys) — errors say "Invalid <field> date: <v>. Use YYYY-MM-DD."; (3) addTask now validates priority against PRIORITY_EMOJI like editTask did (previously stored invalid priority, silently dropped on reload). Key insight: the parser is correct — the defect was that addTask/editTask accepted input the parser can't represent, so reload "lost" it. Fixing validation stops corruption at the source. All 29 tests pass (20 original + 9 new). Marked TODO tasks skwuRU, LxW3x6, OUggp6 done. Remaining in that group: CdqV8G (emoji-in-description needs escaping strategy), hjKhGg (date_done not cleared on status revert), CZuCTj/4AmvH0/4tN7g6 (parser-side: orphan lines, tabs, dup IDs).

*Relevance: high*
*Context: TDD fix for input validation in pi-task-manager addTask/editTask*
*Tags: pi-task-manager validation tdd fix*

---
*Observed: 2026-08-15T18:05:17.067Z*
