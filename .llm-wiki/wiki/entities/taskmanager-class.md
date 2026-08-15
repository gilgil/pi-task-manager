---
type: entity
title: TaskManager class
created: 2026-08-14
updated: 2026-08-14
---

# TaskManager Class

Singleton class that manages a single `TODO.md` file per workspace. Ported from Python `TaskManager` class.

## State

- `_path: string | null` — path to the open TODO.md file
- `_tasks: Task[]` — in-memory task list (document order, DFS)
- `_task_map: Map<string, Task>` — ID → Task lookup
- `_dirty: boolean` — whether changes need to be saved

## Public Methods

| Method | Description |
|--------|-------------|
| `openFile(path)` | Open a TODO.md file for editing |
| `addTask(description, parent_id?, before_id?, after_id?, priority?, ...)` | Add a new task |
| `editTask(task_id, description?, status?, priority?, ...)` | Edit an existing task |
| `moveTask(task_id, under_id?, before_id?, after_id?)` | Move or delete a task |
| `getTask(task_id)` | Retrieve a single task |
| `listTasks(parent_id?, status?, priority?, include_subtasks?)` | List/filter tasks |
| `save()` | Persist to disk |
| `closeFile()` | Save and close |

## Key Behaviors

- **Auto-save**: Every mutation calls `_save_to_disk()` automatically (atomic write via temp file + rename)
- **Auto-dates**: `date_created` set on creation; `date_modified` updated on every edit; `date_done`/`date_cancelled` auto-set on status change
- **Cycle detection**: `_would_create_cycle()` prevents circular dependencies
- **Depth constraint**: Max depth of 8 enforced on add and move
- **Cascade delete**: Deleting a task removes all descendants
- **File locking**: Only one file open at a time

## TypeScript Location

`extension/lib/task-manager.ts` — currently a skeleton with TODO stubs.

## See also

- [[entities/task-data-model]] — the Task class operated on
- [[concepts/todomd-format]] — serialization format
- [[entities/parser]] — markdown line parsing
- [[entities/tool-definitions]] — API surface exposed to the LLM
