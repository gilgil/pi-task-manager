# pi-task-manager

A task tree your pi agent grows, in a `TODO.md` file you can still read.

Your pi agent plans and tracks work as a hierarchical tree of tasks, persisted
in plain `TODO.md` in your project directory. The file auto-opens at session
start, so the agent picks up where it left off — and since it's markdown, you
can grep it, read it, or hand-edit it yourself. No server, no database, no
subprocess: 8 `task_*` tools over pure TypeScript.

## In action

```text
you:  "keep track of Sophie's birthday party — the venue is booked,
      order the cake by the 12th, invites go out next week"
pi:   created the party task and three subtasks
```

what lands on disk (auto-saved):

```markdown
- [ ] Plan Sophie's birthday party ⏫ (ID: `Kp7dQ2`)
  - [x] Book venue ✅ 2026-08-30 (ID: `Tm3wZ8`)
  - [>] Order cake 📅 2026-09-12 (ID: `H4nRv6`)
  - [ ] Send invites ⏳ 2026-09-08 📎 [spec](task-Bq9xLc.md) (ID: `Bq9xLc`)
- [ ] Water the plants 🔁 weekly (ID: `Wp5jTn`)
```

## Install

```bash
pi install npm:pi-task-manager
```

Any git source works too: `pi install git:github.com/gilgil/pi-task-manager`,
`pi install https://github.com/gilgil/pi-task-manager`, or
`pi install /local/path`. Pin a tag for stability:
`pi install git:github.com/gilgil/pi-task-manager@v0.1.2`;
`pi update --extensions` reconciles the clone to the pinned ref.

The extension registers the tools and the `task-manager` skill automatically.
If a `TODO.md` exists in the working directory, it is opened automatically at
session start (with a notification).

## Task file format

```markdown
# TODO

- [ ] Buy milk ➕ 2026-08-15 🖊️ 2026-08-15 (ID: `5Tvc0d`)
  - [ ] Organic 📅 2026-08-20 (ID: `VpLDzY`)
  - [x] Oat milk ✅ 2026-08-14 (ID: `Ab3x9Z`)
- [>] Write report ⏳ 2026-08-16 (ID: `Qw7m2K`)
```

- **Indentation** (2 spaces) defines the tree — each task's children are the
  indented lines beneath it.
- **Status** — exactly one character in the checkbox: `[ ]` open ·
  `[x]` done · `[>]` in-progress · `[!]` failed · `[-]` cancelled
- **Emoji annotations** between description and ID:
  `⏳` scheduled · `🛫` start · `📅` due · `✅` done · `❌` cancelled ·
  `➕` created · `🖊️` modified · priorities `⏬` `🔽` `🔼` `⏫` `🔺` ·
  `🔁` recurrence · `⛔` dependencies · `📎 [spec](task-<id>.md)` note file
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
