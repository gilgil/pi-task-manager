---
type: entity
title: Tool Definitions
created: 2026-08-14
updated: 2026-08-14
---

# Tool Definitions

TypeBox schemas and pi extension tool registrations for the task manager.

## Schemas (tools.ts)

Located at `extension/lib/tools.ts`. Defines TypeBox schemas for each tool:

| Schema | Purpose |
|--------|---------|
| `taskOpenSchema` | Open a TODO.md file |
| `taskAddSchema` | Add a new task |
| `taskEditSchema` | Edit an existing task |
| `taskMoveSchema` | Move a task between categories |
| `taskGetSchema` | Get task details |
| `taskListSchema` | List tasks with filters |
| `taskSaveSchema` | Save to disk |
| `taskCloseSchema` | Close the file |

## Python vs TypeScript Tool Design

The Python implementation uses a **single monolithic tool** with an `action` parameter (one function, many actions). The TypeScript version uses **separate pi tools** (one tool per action), which is the pi extension pattern.

| Python Action | TypeScript Tool |
|--------------|----------------|
| `open_file` | `task_open` |
| `add_task` | `task_add` |
| `edit_task` | `task_edit` |
| `move_task` | `task_move` |
| `get_task` | `task_get` |
| `list_tasks` | `task_list` |
| `save` | `task_save` |
| `close_file` | `task_close` |

## Schema Gaps (vs Python)

The TypeScript schemas are simplified compared to the Python API:

- `task_add` is missing: `parent_id`, `before_id`, `after_id`, `scheduled`, `start`, `due`, `recurrence`, `on_completion`, `depends_on`, `spec`
- `task_edit` is missing: `status`, `scheduled`, `start`, `due`, `recurrence`, `on_completion`, `depends_on`
- `task_list` is missing: `parent_id`, `status`, `include_subtasks`

These need to be added to match the Python API surface.

## Extension Entry Point

`extension/index.ts` — currently a stub. Needs to register all tools with `pi.registerTool()`.

## See also

- [[entities/taskmanager-class]] — the class that tools delegate to
