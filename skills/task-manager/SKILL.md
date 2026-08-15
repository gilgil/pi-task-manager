---
name: task-manager
description: Manage tasks in a TODO.md tree using the task_* tools (task_open, task_add, task_edit, task_move, task_list, task_get, task_save, task_close). Use when tracking TODOs or tasks in a pi session.
---

# Task Manager

Manage tasks in a `TODO.md` tree using the `task_*` tools.

## Workflow

1. `task_open(path)` — open `<path>/TODO.md` (created if missing). Call once before anything else.
2. `task_list()` — see what exists.
3. `task_add(description, ...)` — add tasks. Returns the new 6-char ID.
4. `task_edit(task_id, ...)` — change fields (only provided fields).
5. `task_move(task_id, ...)` — reposition a task (with its subtree).
6. `task_save()` / `task_close()` — save and close when done.

Mutations auto-save; `task_save` is a manual force-save.

## Hierarchy

Tasks form a tree via indentation. Placement parameters:

- `parent_id` — add/move as **last child** of that task
- `before_id` / `after_id` — insert at the **same level**, before/after that
  sibling (it must share the target's parent)
- `task_move` with **no** destination deletes the task and its subtree

Example: add "Organic" under task `5Tvc0d`:
`task_add("Organic", parent_id: "5Tvc0d")`

## Fields

- Descriptions must be single-line and must not contain the annotation
  emojis (⏬🔽🔼⏫🔺⏳🛫📅✅❌➕🖊️🔁🗑️🏁⛔📎🆔) — they are reserved for metadata.
- `priority`: `lowest` `low` `normal` `medium` `high` `highest`
- `status`: ` ` open · `x` done · `>` in-progress · `!` failed · `-` cancelled
  (setting `x` / `-` stamps `date_done` / `date_cancelled`)
- dates `scheduled` / `start` / `due`: `YYYY-MM-DD`
- `recurrence`: e.g. `weekly`, `every 2 weeks on Monday`
- `depends_on`: list of task IDs (circular dependencies are rejected)
- `spec: true` on add — also create a `task-<id>.md` spec file

## Tips

- Always `task_open` first; `task_list` before adding to find `parent_id`s.
- Use `task_list(parent_id, include_subtasks: true)` to inspect a subtree.
- `task_get(task_id)` for full details of one task.
- IDs are stable 6-char strings — reuse them across calls in a session.
