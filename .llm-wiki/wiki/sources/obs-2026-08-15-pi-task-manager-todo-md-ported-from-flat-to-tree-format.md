---
type: source
title: "Observation: pi-task-manager TODO.md ported from flat to tree format"
tags:
  - pi-task-manager
  - todo
  - port
status: observation
created: 2026-08-15
updated: 2026-08-15
slug: obs-2026-08-15-pi-task-manager-todo-md-ported-from-flat-to-tree-format
relevance: medium
observed_at: 2026-08-15T12:05:17.857Z
source_context: Porting legacy TODO.md to pi-task-manager tree format
---

# 🔍 Observation: pi-task-manager TODO.md ported from flat to tree format

In /home/gil/projects/pi-task-manager, the old flat-format TODO.md (sections: inbox/someday/done, no IDs) was moved to TODO.old.md and re-created via task_open + task_add/task_edit. The 3 sections became parent tasks (Inbox s3NmoJ, Someday NvBnuj, Done il8e3W) with 17 children total (4 open, 13 done, stamped ✅ 2026-08-15). Port was done entirely through the extension's own task_* tools in a live pi session — this also completes the inbox task "Use the extension in real sessions".

*Relevance: medium*
*Context: Porting legacy TODO.md to pi-task-manager tree format*
*Tags: pi-task-manager todo port*

---
*Observed: 2026-08-15T12:05:17.857Z*
