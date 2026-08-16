# pi-task-manager

A pi extension for hierarchical task management. Tasks live in a `TODO.md`
file as an indented tree; the extension exposes 8 `task_*` tools backed by a
pure-TypeScript port of the Python task manager — no subprocess, no Python
dependency.

## Install

```bash
pi install git:github.com/<user>/pi-task-manager
```

Any git source works: `pi install https://github.com/<user>/pi-task-manager`,
`pi install /local/path`, or `pi install npm:@you/pi-task-manager` once
published to npm. Pin a tag with `@v1` (e.g.
`pi install git:github.com/<user>/pi-task-manager@v1`); `pi update --extensions`
reconciles the clone to the pinned ref.

The extension registers the tools and the `task-manager` skill automatically.
If a `TODO.md` exists in the working directory, it is opened automatically at
session start (with a notification).

## Task file format

```markdown
# TODO

- [ ] Buy milk ➕ 2026-08-15 🖊️ 2026-08-15 (ID: `5Tvc0d`)
  - [ ] Organic 📅 2026-08-20 (ID: `VpLDzY`)
  - [x] Oat milk ✅ 2026-08-14 (ID: `Ab3x9Z`)
- [> ] Write report ⏳ 2026-08-16 (ID: `Qw7m2K`)
```

- **Indentation** (2 spaces) defines the tree — each task's children are the
  indented lines beneath it.
- **Status** in the checkbox: ` ` open · `x` done · `>` in-progress ·
  `!` failed · `-` cancelled
- **Emoji annotations** between description and ID:
  `⏳` scheduled · `🛫` start · `📅` due · `✅` done · `❌` cancelled ·
  `➕` created · `🖊️` modified
- **ID**: 6-char base62, stable, referenced by `parent_id`, `depends_on`, etc.
- `depth`, `position`, and `parent_id` are always derived from the tree —
  never stored.

## Tools

| Tool | Purpose |
|------|---------|
| `task_open(path)` | Open `<path>/TODO.md` (created if missing). Call once first. |
| `task_add(description, ...)` | Add a task. Returns the new ID. |
| `task_edit(task_id, ...)` | Change fields; only provided fields change. |
| `task_move(task_id, ...)` | Move a task **with its subtree**. No destination = delete task + subtree. |
| `task_get(task_id)` | Full details of one task. |
| `task_list(...)` | List with optional `parent_id` / `status` / `priority` filters. |
| `task_save()` | Force save (mutations are auto-saved anyway). |
| `task_close()` | Save and close. |

### Hierarchy parameters

- `parent_id` — add/move as **last child** of this task
- `before_id` / `after_id` — insert at the **same level**, before/after that
  sibling (must share the target's parent)
- `task_move` with no `under_id`/`before_id`/`after_id` deletes the task and
  its subtree

### Other fields

- `priority`: `lowest` `low` `normal` `medium` `high` `highest`
- dates (`scheduled`, `start`, `due`): `YYYY-MM-DD`
- `recurrence`: e.g. `weekly`, `every 2 weeks on Monday`
- `depends_on`: list of task IDs (circular dependencies rejected)
- `spec: true` — also create a `task-<id>.md` spec file
- setting status to `x` / `-` stamps `date_done` / `date_cancelled`

## Development

```bash
npm install
node --test tests/parser.test.ts tests/task-manager.test.ts
```

Layout: `index.ts` (tool registration) · `lib/`
(`task.ts` tree node, `parser.ts` line ⇄ tree, `task-manager.ts` mutations,
`tools.ts` TypeBox schemas) · `skills/task-manager/SKILL.md` (LLM usage guide).
