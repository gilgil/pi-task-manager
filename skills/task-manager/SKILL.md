# Task Manager

Manage tasks in TODO.md files using the `task_*` tools.

## Workflow

1. **Open** a TODO.md file: `task_open(path)`
2. **List** tasks: `task_list()` or `task_list(category: "inbox")`
3. **Add** tasks: `task_add(text, category?, priority?)`
4. **Edit** tasks: `task_edit(id, changes...)`
5. **Move** tasks between categories: `task_move(id, category)`
6. **Get** task details: `task_get(id)`
7. **Save** when done: `task_save()`
8. **Close** when finished: `task_close()`

## Categories

- `inbox` — unsorted new tasks
- `today` — tasks to do today
- `someday` — tasks for later
- `done` — completed tasks

## Priorities

- `high` — urgent
- `medium` — normal
- `low` — nice to have

## Tips

- Always `task_open` before other actions
- Always `task_save` before `task_close`
- Use `task_list` with filters to find tasks quickly
- Use `task_move` to organize tasks into categories
