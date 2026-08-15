---
type: source
title: 'Observation: pi-task-manager code review: 19 tasks added under "Investigate & Fix"'
tags:
  - pi-task-manager
  - code-review
  - bugs
status: observation
created: 2026-08-15
updated: 2026-08-15
slug: obs-2026-08-15-pi-task-manager-code-review-19-tasks-added-under-investigate
relevance: high
observed_at: 2026-08-15T17:07:36.645Z
source_context: Code review of pi-task-manager, adding investigation/fix tasks
---

# ⭐ Observation: pi-task-manager code review: 19 tasks added under "Investigate & Fix"

Reviewed pi-task-manager (2026-08-15) and added a top-level "Investigate & Fix (code review 2026-08-15)" task (ID j4MXO6) to TODO.md with 3 sub-parents and 19 leaf tasks. Verified bugs (reproduced with a throwaway script): (1) multiline description drops the entire task on save+reload; (2) annotation emoji in description (e.g. "Fix 🔺 icon") gets stripped and misparsed as priority on reload; (3) invalid date strings accepted by task_edit, silently dropped on reload; (4) invalid priority on task_add silently dropped on reload (addTask doesn't validate, editTask does); (5) date_done/date_cancelled not cleared when status reverted from x/-; (6) orphaned indented lines silently re-parented to root; (7) tab indentation treated as depth 0; (8) duplicate IDs resolve to last occurrence; (9) openFile throws uncaught ENOENT/ENOTDIR on bad path; (10) spec file task-<id>.md orphaned on delete. Unverified-by-test issues also listed: saveToDisk swallows all errors silently, task_list priority "null" matches nothing, unknown parent_id returns empty ok, session_start hook openFile not try/caught, moveTask before/after without under_id requires top-level ref, no concurrency protection, no tsconfig, pi-ai not declared as dependency, no test script, TODO.md.bak/TODO.old.md leftovers. Baseline: 20/20 tests pass.

*Relevance: high*
*Context: Code review of pi-task-manager, adding investigation/fix tasks*
*Tags: pi-task-manager code-review bugs*

---
*Observed: 2026-08-15T17:07:36.645Z*
