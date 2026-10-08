---
name: task-manager
description: Manage tasks in a TODO.md tree with the task_* tools. Use when the user asks to track, plan, organize, or close TODOs and tasks in a pi session.
---

# Task Manager

Tasks live in `TODO.md` as an indented tree. Use the `task_*` tools — never edit `TODO.md` with `write`/`edit`; the task tools preserve the prose and headings around the tasks.

## Workflow

1. `task_open(path)` — open `<path>/TODO.md`. The directory must already exist; only the file is created. Call once before the other tools.
2. `task_list()` — read the tree. Every line ends with the task's `(id)`.
3. `task_add` / `task_edit` / `task_move` — mutate; each call saves immediately.
4. `task_close()` — close the file when finished.

Take IDs from `task_list` or from the `task_id` a call returned. Never invent an ID — an unknown one is an error.

## Placement

- `parent_id` — add/move as **last child** of that task
- `before_id` / `after_id` — insert at that task's **level and position**; its parent is implied. If you also pass `parent_id`, the reference must be a child of it.
- `task_move(task_id)` with no destination — **delete** the task, its subtree, its note file, and any `depends_on` references to it

## Fields

- Descriptions are single-line and must not contain the annotation emojis (⏬🔽🔼⏫🔺⏳🛫📅✅❌➕🖊️🔁🗑️🏁⛔📎🆔) — they encode metadata.
- `status`: ` ` open · `x` done · `>` in-progress · `!` failed · `-` cancelled. Setting `x`/`-` stamps `date_done`/`date_cancelled`; reverting clears them.
- `priority`: `lowest` … `highest`, or `null` to clear.
- `depends_on` replaces the whole list (`[]` clears it); circular dependencies are rejected.
- `recurrence`: `daily` / `weekly` / `monthly` / `yearly`, or `every N days|weeks|months|years`, optionally `… on Monday`. Completing the task creates the next instance as the following sibling, with its `due` advanced (or `start`, if the task used `start` instead of `due`).
- `on_completion`: `delete` removes the task when it is completed (skipped if it has sub-tasks); `keep` leaves it.

## Note files

`task-<id>.md` (next to `TODO.md`) holds what does not fit in one line: audit results, decisions and rationale, findings.

- `task_add(..., spec: true)` creates it; fill it with the `write` tool.
- `task_edit` never touches it. Deleting the task deletes the note file.
- Keep the description to one short action line; put the detail in the note.

## Reading the tree

`task_list` returns lines indented by depth — that is the whole tree:

```
53 tasks
- [ ] Investigate & Fix (j4MXO6) (high)
  - [x] Fixed thing (B2MUfE) due 2026-10-07
```

`task_list(parent_id)` = its children (`include_subtasks: true` for the whole subtree); `task_get(id)` = one task's full fields.
