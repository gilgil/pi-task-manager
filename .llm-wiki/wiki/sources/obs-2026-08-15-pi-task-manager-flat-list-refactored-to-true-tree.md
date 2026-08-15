---
type: source
title: "Observation: pi-task-manager: flat list refactored to true tree"
tags:
  - pi-task-manager
  - tree
  - refactor
  - data-model
status: observation
created: 2026-08-15
updated: 2026-08-15
slug: obs-2026-08-15-pi-task-manager-flat-list-refactored-to-true-tree
relevance: high
observed_at: 2026-08-15T03:31:02.276Z
source_context: Refactoring pi-task-manager from flat list to tree per user direction
---

# ⭐ Observation: pi-task-manager: flat list refactored to true tree

Refactored /home/gil/projects/pi-task-manager so the Task data model is a true tree: Task nodes carry `parent: Task | null` and `children: Task[]`; `roots: Task[]` is the source of truth in TaskManager with a rebuilt `taskMap` cache. depth, position, parent_id, and children_ids are always derived (depthOf(), positionOf()), never stored. Serialization (tasksToMarkdown) is a recursive DFS; parsing (parseTodoFile) builds the tree with a depth stack of most-recent-task-per-depth. addTask/moveTask use resolveInsertion() (returns {parent, ref, before}) plus insertIndex() computed at the call site. moveTask detaches then re-attaches so the index is computed against the post-removal array. Tests: node --test tests/parser.test.ts tests/task-manager.test.ts (20/20 pass; vitest is NOT the runner). Typecheck with strict tsc passes (typescript not installed in-project — registry lacks typebox@^0.34.0, so deps can't npm install; used a /tmp/tscheck toolchain with --typeRoots).

*Relevance: high*
*Context: Refactoring pi-task-manager from flat list to tree per user direction*
*Tags: pi-task-manager tree refactor data-model*

---
*Observed: 2026-08-15T03:31:02.276Z*
