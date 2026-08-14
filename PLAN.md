# pi-task-manager — Plan

A pi extension that provides task/todo management via custom tools, with the task logic ported from Python to TypeScript.

## Architecture

**TypeScript extension** that registers tools with TypeBox schemas. The task management logic (parsing, editing, saving) is ported from `task_manager.py` to TypeScript — no Python subprocess needed.

### Why migrate to TypeScript instead of wrapping Python?

- **No subprocess overhead** — no spawn, no JSON serialization, no process lifecycle management
- **Native pi integration** — runs in the same process, shares `ctx`, `signal`, etc.
- **Simpler debugging** — one language, one runtime, one stack trace
- **Better state management** — the singleton `_manager` pattern works naturally in TypeScript (no per-call process restart)
- **No Python dependency** — users don't need Python installed

## Project Structure

```
pi-task-manager/
├── package.json            # pi package manifest + dependencies
├── README.md               # User-facing docs
├── PLAN.md                 # This file
├── extension/
│   ├── index.ts            # Extension entry: register tools, commands
│   └── lib/
│       ├── task-manager.ts # Core TaskManager class (ported from Python)
│       ├── task.ts         # Task class / dataclass equivalent
│       ├── parser.ts       # Markdown line parser (ported from _parse_task_line)
│       └── tools.ts        # Tool definitions with TypeBox schemas
└── skills/
    └── task-manager/
        └── SKILL.md        # Usage instructions for the LLM
```

## Porting from Python

### Source files to reference

- `~/agent/tools/task_manager.py` — Main implementation (TaskManager class, Task dataclass, parsing)
- `~/agent/tools/task_manager_design.md` — Design rationale
- `~/agent/tools/tasks_emojis_format.md` — Emoji conventions for tasks

### Key Python constructs to port

1. **Task dataclass** → TypeScript class/interface with fields:
   - `id`, `text`, `completed`, `emoji`, `category`, `priority`, `project`, `context`, `tags`, `due`, `created`, `modified`, `indent`

2. **TaskManager class** → TypeScript class with methods:
   - `openFile(path)`, `addTask()`, `editTask()`, `moveTask()`, `getTask()`, `listTasks()`, `save()`, `closeFile()`

3. **_parse_task_line** → TypeScript function returning parsed Task fields from a markdown line

4. **Emoji handling** → Same emoji map, just TypeScript objects

## Tool Definitions

Each Python action maps to a pi tool:

| Tool Name | Action | Description |
|-----------|--------|-------------|
| `task_open` | `open_file` | Open a TODO.md file for editing |
| `task_add` | `add_task` | Add a new task |
| `task_edit` | `edit_task` | Edit an existing task |
| `task_move` | `move_task` | Move a task to a different category |
| `task_get` | `get_task` | Get details of a single task |
| `task_list` | `list_tasks` | List tasks (with filters) |
| `task_save` | `save` | Save current state to disk |
| `task_close` | `close_file` | Close the current file |

## Implementation Steps

### Phase 1: Core (Day 1)

1. Create project structure with `package.json`
2. Port `Task` dataclass → TypeScript interface
3. Port `_parse_task_line` → TypeScript parser function
4. Port `TaskManager` class → TypeScript (core methods only)
5. Write basic tests for parser

### Phase 2: Extension (Day 2)

6. Create `extension/index.ts` with tool registrations
7. Define TypeBox schemas for each tool
8. Wire tool execute handlers to TaskManager methods
9. Test extension in pi (load via `pi -e`)

### Phase 3: Polish (Day 3)

10. Create `skills/task-manager/SKILL.md` with usage instructions
11. Add `resources_discover` handler for skill auto-discovery
12. Write `README.md`
13. Test full workflow end-to-end

### Phase 4: Optional

14. Add custom TUI rendering (status bar showing task counts)
15. Add `/tasks` command for quick status
16. Add `session_start` hook to auto-open TODO.md if present in cwd

## Design Decisions

- **State management**: The TaskManager singleton persists across tool calls within a session. `open_file` sets the active file, subsequent actions operate on it, `close_file` clears it. This matches the Python behavior.
- **No subprocess**: Pure TypeScript, no Python dependency.
- **TypeBox schemas**: Use `Type.Object()` for parameters, `StringEnum` for fixed choices (category, priority).
- **Skill + Extension**: The extension provides the tools; the skill provides the LLM with usage instructions and conventions.
