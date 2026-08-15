# Task Manager Tool — Design Document

## 1. Overview

A slim task and sub-task management tool that stores data in a single `TODO.md` file per workspace. The file uses standard GitHub-flavored markdown task list syntax (`- [ ]`, `- [x]`, etc.). Each task is assigned a unique 6-character base62 ID. The tool provides a programmatic API for adding, editing, moving, and managing tasks in a hierarchical structure (max depth: 8). Tasks support rich metadata via inline emoji annotations for dates, priorities, recurrence, on-completion behavior, dependencies, and spec-file attachments.

---

## 2. Storage Format

### 2.1 File Structure

A single `TODO.md` file per workspace/folder. The agent opens one file at a time via an `open` action. All metadata is inline on the task line — no separate metadata blocks.

```markdown
# TODO

- [ ] Root task description ⏫ 📅 2025-01-20 ➕ 2025-01-15 🖊️ 2025-01-15 (ID: `aB3dE1`)
  - [x] Completed sub-task ✅ 2025-01-15 ➕ 2025-01-15 🖊️ 2025-01-15 (ID: `fG7hI2`)
  - [>] In-progress sub-task 🔽 ⏳ 2025-01-18 ➕ 2025-01-15 🖊️ 2025-01-15 (ID: `jK9lM4`)
```

### 2.2 Task Line Format

Each task is a single markdown list item:

```
<indent>- [STATUS] Description <emoji-annotations> (ID: `XXXXXX`)
```

| Component           | Details                                                      |
|---------------------|--------------------------------------------------------------|
| `<indent>`          | Two spaces per nesting level (0, 2, 4, 6, 8, 10, 12, 14)    |
| `[STATUS]`          | Single status character (see §3)                              |
| Description         | Free-form text; the task's human-readable title               |
| `<emoji-annotations>`| Zero or more emoji signifiers (see §4), space-separated     |
| `(ID: \`XXXXXX\`)`  | Unique 6-char base62 ID in backticks, always at end of line  |

Emoji annotations appear **between** the description and the `(ID: ...)`. Multiple annotations are separated by single spaces. The conventional ordering is: **priority**, then **dates** (scheduled, start, due, done, cancelled), then **recurrence**, then **on-completion**, then **dependencies**, then **attachment**, then **created**, then **modified**.

---

## 3. Status Characters

| Status       | Char | Markdown | Description                          |
|-------------|------|----------|--------------------------------------|
| Open        | ` `  | `[ ]`    | Default; task not yet started        |
| Complete    | `x`  | `[x]`    | Task finished successfully           |
| In Progress | `>`  | `[>]`    | Work is actively being done          |
| Failed      | `!`  | `[!]`    | Task could not be completed          |
| Blocked     | `-`  | `[-]`    | Waiting on external dependency       |

---

## 4. Emoji Annotations

Emoji signifiers are embedded inline on the task line, between the description and the `(ID: ...)`. They encode rich metadata: dates, priorities, recurrence, on-completion behavior, dependencies, and spec-file attachments.

### 4.1 Date Emojis

| Emoji | Key         | Format      | Description                              |
|-------|-------------|-------------|------------------------------------------|
| ⏳     | `scheduled` | `YYYY-MM-DD`| Date the task is scheduled for           |
| 🛫     | `start`     | `YYYY-MM-DD`| Date work should begin                   |
| 📅     | `due`       | `YYYY-MM-DD`| Deadline for the task                    |
| ✅     | `done`      | `YYYY-MM-DD`| Date the task was completed              |
| ❌     | `cancelled` | `YYYY-MM-DD`| Date the task was cancelled              |
| ➕     | `created`   | `YYYY-MM-DD`| Date the task was created (auto-set)     |
| 🖊️     | `modified`  | `YYYY-MM-DD`| Date the task was last modified (auto-set) |

**Examples:**

```
- [ ] Review PR 📅 2025-02-01 ⏳ 2025-01-28 ➕ 2025-01-20 🖊️ 2025-01-20 (ID: `aB3dE1`)
- [x] Fix login bug ✅ 2025-01-15 ➕ 2025-01-10 🖊️ 2025-01-15 (ID: `fG7hI2`)
- [-] Deprecated feature ❌ 2025-01-18 ➕ 2025-01-01 🖊️ 2025-01-18 (ID: `jK9lM4`)
```

**Notes:**
- `✅ done` and `❌ cancelled` dates are auto-set when the task status changes to `x` or `-` respectively, if not already present.
- `➕ created` is auto-set on task creation and never changes.
- `🖊️ modified` is auto-updated on every edit.
- Date format is always `YYYY-MM-DD` (no time component).

### 4.2 Priority Emojis

| Emoji | Priority Level | Description                      |
|-------|---------------|----------------------------------|
| ⏬     | lowest        | Lowest priority                  |
| 🔽     | low           | Low priority                     |
| *(none)* | normal      | Default; no emoji needed         |
| 🔼     | medium        | Medium priority                  |
| ⏫     | high          | High priority                    |
| 🔺     | highest       | Highest priority                 |

**Examples:**

```
- [ ] Urgent security fix 🔺 📅 2025-01-20 (ID: `aB3dE1`)
- [ ] Nice-to-have refactor ⏬ (ID: `fG7hI2`)
- [ ] Standard task (ID: `jK9lM4`)
```

**Notes:**
- Only one priority emoji per task. Setting a new priority replaces the old one.
- Absence of a priority emoji implies **normal** priority.

### 4.3 Recurrence

| Emoji | Key          | Format                        | Description                        |
|-------|-------------|-------------------------------|------------------------------------|
| 🔁    | `recurrence`| `🔁 <rule>`                   | Recurring task rule               |

The `<rule>` is a free-form text string describing the recurrence pattern (e.g., `every day`, `every week on Monday`, `monthly on the 15th`).

**Examples:**

```
- [ ] Standup notes 🔁 every weekday (ID: `aB3dE1`)
- [ ] Monthly report 🔁 every month on the 1st (ID: `fG7hI2`)
```

**Notes:**
- When a recurring task is completed, a new instance is created according to the rule (unless on-completion is set to `delete`).

### 4.4 On-Completion Behavior

| Emoji | Key              | Meaning     | Description                                  |
|-------|-----------------|-------------|----------------------------------------------|
| 🏁     | `on_completion` | `keep`      | Keep the task in the list after completion   |
| 🗑️     | `on_completion` | `delete`    | Remove the task after completion              |

**Examples:**

```
- [ ] Daily backup 🗑️ (ID: `aB3dE1`)
- [ ] Review checklist 🏁 (ID: `fG7hI2`)
- [ ] Default behavior task (ID: `jK9lM4`)
```

**Notes:**
- Default behavior (no emoji) is **keep** — completed tasks remain visible.
- 🏁 explicitly means **keep** after completion.
- 🗑️ means **delete** the task after it is completed.
- For recurring tasks with 🗑️, the completed instance is removed but the recurrence continues.

### 4.5 Dependencies

| Emoji | Key              | Format                  | Description                                |
|-------|-----------------|-------------------------|--------------------------------------------|
| 🆔     | `task_id`       | `🆔 <id>`              | The task's own ID (explicit reference)     |
| ⛔     | `depends_on`    | `⛔ <id>,<id>,...`      | This task depends on the listed task IDs   |

**Examples:**

```
- [ ] Design database schema 🆔 dcf64c (ID: `dcf64c`)
- [ ] Implement models ⛔ dcf64c (ID: `0h17ye`)
- [ ] Write API endpoints ⛔ dcf64c,0h17ye (ID: `xY9zW2`)
```

**Notes:**
- `⛔` lists the IDs of tasks that must be completed before this task can proceed.
- Multiple dependency IDs are comma-separated with no spaces.
- `🆔` can be used to explicitly annotate a task's own ID (useful for cross-references).

### 4.6 Spec File Attachment

| Emoji | Key            | Format                                    | Description                                      |
|-------|---------------|---------------------------------------------|--------------------------------------------------|
| 📎     | `spec`         | `📎 [spec](task-<id>.md)`                   | Link to a detailed specification markdown file   |

Each task may have an accompanying `task-<id>.md` file in the same workspace directory, containing a longer specification, notes, or acceptance criteria.

**Examples:**

```
- [ ] Design authentication flow 📎 [spec](task-aB3dE1.md) 🔺 📅 2025-02-01 (ID: `aB3dE1`)
- [ ] Write unit tests 📎 [spec](task-fG7hI2.md) (ID: `fG7hI2`)
```

**Notes:**
- The spec file is named `task-<id>.md` where `<id>` is the task's 6-character ID.
- The spec file lives in the same directory as `TODO.md`.
- The 📎 annotation includes a markdown link for easy navigation.
- The spec file is optional; its absence simply means no detailed spec exists.
- Creating, updating, or deleting the spec file is a separate file operation; the tool only manages the 📎 annotation in the task line.

### 4.7 Full Annotation Example

```markdown
- [ ] Deploy v2.1 🔺 📅 2025-02-01 ⏳ 2025-01-25 ⛔ aB3dE1,fG7hI2 📎 [spec](task-jK9lM4.md) ➕ 2025-01-15 🖊️ 2025-01-20 (ID: `jK9lM4`)
```

This task has:
- **Priority**: highest (🔺)
- **Due date**: 2025-02-01 (📅)
- **Scheduled date**: 2025-01-25 (⏳)
- **Dependencies**: must wait for `aB3dE1` and `fG7hI2` (⛔)
- **Spec file**: `task-jK9lM4.md` (📎)
- **Created**: 2025-01-15 (➕)
- **Modified**: 2025-01-20 (🖊️)

---

## 5. ID Generation

- **Algorithm**: 6 characters from `A-Za-z0-9` (base62), via `secrets.token_urlsafe(8)[:6]`
- **Collision handling**: Check against existing IDs; regenerate on collision (extremely rare: ~1 in 56 billion)
- **Examples**: `aB3dE1`, `Xk9mPq`, `R2vN7w`

---

## 6. Constraints

| Constraint        | Value  |
|------------------|--------|
| Max nesting depth | 8      |
| File per workspace | 1 (`TODO.md`) |
| File opened at a time | 1 (via `open` action) |
| Emoji annotations per task | Unbounded (one per type; dates may have multiple) |
| Spec file per task | 0 or 1 (`task-<id>.md`) |

---

## 7. Actions (API)

### 7.0 `open_file`

Open a `TODO.md` file for the agent to work with.

**Parameters:**
| Parameter | Required | Type   | Description                                    |
|----------|----------|--------|------------------------------------------------|
| `path`   | Yes      | string | Absolute path to the directory containing `TODO.md` |

**Behavior:**
- If `TODO.md` exists → load it into memory.
- If `TODO.md` does not exist → create a new empty file with `# TODO` header.
- Only one file can be open at a time. Opening a new file automatically closes the previous one.
- File-level locking acquired on open, released on close or write.

**Returns:** Confirmation with file path and task count.

---

### 7.1 `close_file`

Close the currently open `TODO.md` file.

**Parameters:** None (operates on the currently open file).

**Behavior:**
- Saves any unsaved changes to disk.
- Releases file lock.
- Clears the in-memory task state.

**Returns:** Confirmation.

---

### 7.2 `add_task`

Add a new task to the hierarchy.

**Parameters:**
| Parameter     | Required | Type   | Description                                          |
|--------------|----------|--------|------------------------------------------------------|
| `description`| Yes      | string | The task description/title                           |
| `parent_id`  | No       | string | Add as sub-task under this task                      |
| `before_id`  | No       | string | Insert before this task (same level)                 |
| `after_id`   | No       | string | Insert after this task (same level)                  |
| `priority`   | No       | string | Priority level: `lowest`, `low`, `normal`, `medium`, `high`, `highest` |
| `scheduled`  | No       | string | Scheduled date (`YYYY-MM-DD`)                        |
| `start`      | No       | string | Start date (`YYYY-MM-DD`)                            |
| `due`        | No       | string | Due date (`YYYY-MM-DD`)                              |
| `recurrence` | No       | string | Recurrence rule (e.g., `every day`, `weekly`)        |
| `on_completion` | No   | string | `keep` or `delete`                                   |
| `depends_on` | No       | list[string] | List of task IDs this task depends on          |
| `spec`       | No       | bool   | Create an empty `task-<id>.md` spec file (default: false) |

**Rules:**
- If none of `parent_id`, `before_id`, `after_id` → add as new **root task** (append at end).
- If `parent_id` → add as **last child** of that task.
- If `before_id` or `after_id` → insert at that position on the **same level**.
- `before_id` and `after_id` are mutually exclusive; if both provided, `after_id` wins.
- `parent_id` can be combined with `before_id`/`after_id` → insert as child of parent, at specified sibling position.
- **Rejects** if nesting depth would exceed 8.
- **Rejects** if any `depends_on` ID does not exist.
- Auto-generates ID, ➕ created date, and 🖊️ modified date.
- If `spec=true`, creates an empty `task-<id>.md` file with a template header.

**Returns:** The new task's ID.

---

### 7.3 `edit_task`

Modify any aspect of an existing task.

**Parameters:**
| Parameter         | Required | Type   | Description                                          |
|------------------|----------|--------|------------------------------------------------------|
| `task_id`        | Yes      | string | The task to edit                                     |
| `description`    | No       | string | New description                                      |
| `status`         | No       | string | New status char (` `, `x`, `>`, `!`, `-`)            |
| `priority`       | No       | string | Priority: `lowest`, `low`, `normal`, `medium`, `high`, `highest`, or `null` to remove |
| `scheduled`      | No       | string | Scheduled date (`YYYY-MM-DD`) or `null` to remove    |
| `start`          | No       | string | Start date (`YYYY-MM-DD`) or `null` to remove        |
| `due`            | No       | string | Due date (`YYYY-MM-DD`) or `null` to remove          |
| `recurrence`     | No       | string | Recurrence rule or `null` to remove                  |
| `on_completion`  | No       | string | `keep`, `delete`, or `null` to remove                |
| `depends_on`     | No       | list[string] | New dependency list, or `null` to remove       |

**Notes:**
- Setting `status` to `x` auto-sets the ✅ done date to today if not already present.
- Setting `status` to `-` auto-sets the ❌ cancelled date to today if not already present.
- 🖊️ modified date is auto-updated on any edit.
- At least one editable field must be provided.
- Passing `null` for an emoji field removes that annotation.

**Returns:** Updated task representation.

---

### 7.4 `move_task`

Move a task to a new position in the hierarchy.

**Parameters:**
| Parameter    | Required | Type   | Description                                          |
|-------------|----------|--------|------------------------------------------------------|
| `task_id`   | Yes      | string | The task to move                                     |
| `under_id`  | No       | string | Move as last child of this task                      |
| `before_id` | No       | string | Insert before this task (same level)                 |
| `after_id`  | No       | string | Insert after this task (same level)                  |

**Rules:**
- If **no** destination params → **DELETE** the task and all its sub-tasks.
- If `under_id` → detach and attach as child of new parent.
- If `before_id`/`after_id` → move to that sibling position.
- Moving a task carries all its sub-tasks with it.
- **Rejects** self-referential moves (cannot move task under itself or its descendants).
- **Rejects** if new depth would exceed 8.

**Returns:** Confirmation with new position, or deletion confirmation.

---

### 7.5 `get_task`

Retrieve a single task by ID.

**Parameters:**
| Parameter  | Required | Type   | Description              |
|-----------|----------|--------|---------------------------|
| `task_id` | Yes      | string | The task to retrieve      |

**Returns:** Task with ID, description, status, dates, children IDs, parent ID, depth, and all emoji annotation fields.

---

### 7.6 `list_tasks`

List all tasks or filter by criteria.

**Parameters:**
| Parameter      | Required | Type   | Description                                          |
|---------------|----------|--------|------------------------------------------------------|
| `parent_id`   | No       | string | List only direct children of this task               |
| `status`      | No       | string | Filter by status char                                |
| `priority`    | No       | string | Filter by priority level                             |
| `include_subtasks` | No  | bool   | Recursively include all descendants (default: false) |

**Returns:** List of task summaries (ID, description, status, depth, priority, dates).

---

### 7.7 `save`

Explicitly save the current file to disk.

**Parameters:** None.

**Behavior:**
- Writes current in-memory state to `TODO.md`.
- Creates a backup of the previous version (`TODO.md.bak`).
- Atomic write: write to temp file, then rename.

**Returns:** Confirmation.

---

## 8. Internal Task Representation

```python
@dataclass
class Task:
    # Core identity
    id: str                    # 6-char base62 ID
    description: str           # Human-readable title
    status: str                # ' ', 'x', '>', '!', '-'

    # Hierarchy
    depth: int                 # Nesting level (0 = root, max 8)
    position: int              # Position among siblings (0-indexed)
    parent_id: str | None      # Parent task ID, None for roots
    children_ids: list[str]    # Direct child task IDs

    # Timestamps (inline emoji dates, YYYY-MM-DD)
    date_created: str | None   # ➕ YYYY-MM-DD (auto-set on creation, immutable)
    date_modified: str | None  # 🖊️ YYYY-MM-DD (auto-updated on every edit)

    # Emoji Annotations
    priority: str | None       # 'lowest', 'low', 'normal', 'medium', 'high', 'highest'
    date_scheduled: str | None # ⏳ YYYY-MM-DD
    date_start: str | None     # 🛫 YYYY-MM-DD
    date_due: str | None       # 📅 YYYY-MM-DD
    date_done: str | None      # ✅ YYYY-MM-DD
    date_cancelled: str | None # ❌ YYYY-MM-DD
    recurrence: str | None     # 🔁 rule description
    on_completion: str | None  # 🏁='keep' or 🗑️='delete'
    depends_on: list[str]      # ⛔ list of dependency task IDs
    has_spec: bool             # 📎 whether task-<id>.md exists
```

---

## 9. File I/O Example

```markdown
# TODO

- [ ] Implement authentication 🔺 📅 2025-02-01 📎 [spec](task-aB3dE1.md) ➕ 2025-01-15 🖊️ 2025-01-15 (ID: `aB3dE1`)
  - [x] Design login API ✅ 2025-01-15 ➕ 2025-01-15 🖊️ 2025-01-15 (ID: `fG7hI2`)
  - [>] Implement JWT tokens 🔼 ⏳ 2025-01-20 ⛔ fG7hI2 ➕ 2025-01-15 🖊️ 2025-01-15 (ID: `jK9lM4`)
  - [ ] Add rate limiting ➕ 2025-01-15 🖊️ 2025-01-15 (ID: `nO5pQ6`)
- [ ] Update dashboard 🔁 every sprint 🏁 ➕ 2025-01-15 🖊️ 2025-01-15 (ID: `rS8tU3`)
- [-] Database migration ❌ 2025-01-15 ⏬ ➕ 2025-01-15 🖊️ 2025-01-15 (ID: `dE3fG9`)
- [ ] Daily standup notes 🔁 every weekday 🗑️ ➕ 2025-01-15 🖊️ 2025-01-15 (ID: `pQ2rS5`)
```

---

## 10. Edge Cases & Safeguards

| Scenario                     | Behavior                                              |
|-----------------------------|-------------------------------------------------------|
| Move task under itself       | **Reject** with error                                 |
| Move task under its descendant | **Reject** with error                              |
| Exceed max depth (8)         | **Reject** add/move with error                        |
| Empty description            | **Reject** with error                                 |
| Task ID not found            | **Return error**                                      |
| No file open                 | **Return error** on any task action                   |
| File write failure           | **Fallback** to `.bak` file                           |
| Duplicate ID on generation   | **Regenerate** (loop until unique)                    |
| Delete task with children    | **Cascade delete** all sub-tasks                      |
| Dependency on non-existent ID | **Reject** add/edit with error                      |
| Circular dependency          | **Reject** — detect cycles in dependency graph        |
| Setting status to `x`        | Auto-set ✅ done date to today if absent              |
| Setting status to `-`        | Auto-set ❌ cancelled date to today if absent         |
| Recurring task completed     | Create next instance per recurrence rule (unless 🗑️)  |
| Spec file creation fails     | Task is still created; 📎 annotation omitted          |

---

## 11. Actions Summary

| Action       | Purpose                                  | Key Params                                                                                      |
|-------------|------------------------------------------|-------------------------------------------------------------------------------------------------|
| `open_file` | Open a TODO.md file                      | `path`                                                                                          |
| `close_file`| Close and save the current file          | —                                                                                               |
| `add_task`  | Add a new task                           | `description`, `parent_id?`, `before_id?`, `after_id?`, `priority?`, `scheduled?`, `start?`, `due?`, `recurrence?`, `on_completion?`, `depends_on?`, `spec?` |
| `edit_task` | Edit any task field                      | `task_id`, `description?`, `status?`, `priority?`, `scheduled?`, `start?`, `due?`, `recurrence?`, `on_completion?`, `depends_on?` |
| `move_task` | Move or delete a task                    | `task_id`, `under_id?`, `before_id?`, `after_id?`                                               |
| `get_task`  | Get a single task                        | `task_id`                                                                                       |
| `list_tasks`| List/filter tasks                       | `parent_id?`, `status?`, `priority?`, `include_subtasks?`                                       |
| `save`      | Persist changes to disk                  | —                                                                                               |

