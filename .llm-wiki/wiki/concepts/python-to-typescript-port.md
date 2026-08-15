---
type: concept
title: Python to TypeScript Port
created: 2026-08-14
updated: 2026-08-15
---

# Python to TypeScript Port

The task manager logic is being ported from Python (`~/agent/tools/task_manager.py`) to TypeScript — a pi extension with no subprocess overhead.

## Why Port?

- **No subprocess overhead** — no spawn, no JSON serialization, no process lifecycle
- **Native pi integration** — runs in same process, shares `ctx`, `signal`
- **Simpler debugging** — one language, one runtime, one stack trace
- **Better state management** — singleton `_manager` works naturally (no per-call process restart)
- **No Python dependency** — users don't need Python installed

## What's Ported

| Component | Python | TypeScript | Status |
|-----------|--------|------------|--------|
| Task dataclass | `Task` dataclass | `Task` tree node (`task.ts`) | ✅ Done |
| Parser | `_parse_task_line`, `_parse_annotations` | `parseTaskLine` / `parseTodoFile` | ✅ Done |
| TaskManager | `TaskManager` class | `TaskManager` class | ✅ Done |
| Tool schemas | Monolithic `TASK_MANAGER_TOOL` | Separate TypeBox schemas (8 tools) | ✅ Done |
| Extension entry | N/A | `extension/index.ts` | ✅ Done |
| Skill doc | N/A | `skills/task-manager/SKILL.md` | ✅ Done (rewritten for tree API) |
| Tests | N/A | `tests/` — 20 tests, `node --test` | ✅ Done |

**Port complete.** Verified end-to-end in real pi (2026-08-15): extension loaded
via `pi -e`, local model drove `task_open` → `task_add` (parent + child) →
`task_list` with correct hierarchy and correct `TODO.md` on disk.

## Data model: tree, not flat list

The TypeScript port deliberately diverges from Python's flat list:

- `Task` nodes own `parent: Task | null` + `children: Task[]`; `roots: Task[]`
  is the source of truth, `taskMap` is a rebuilt lookup cache.
- `depth`, `position`, `parent_id`, `children_ids` are **derived**, never stored.
- Serialization is a recursive DFS; parsing builds the tree with a depth stack.
- `before_id`/`after_id` are strict **sibling** semantics (Python's flat-list
  "after the subtree" semantics were dropped).
- `moveTask` detaches then re-attaches; insertion index is computed against the
  post-removal sibling array (prevents an off-by-one order swap).

## Gotchas learned

1. **`typebox` package versioning**: the `typebox` package (used by pi) only has
   1.x versions; `^0.34.0` is an `@sinclair/typebox` version. pi itself pins
   `typebox: 1.3.7` — match that or `npm install` fails.
2. **Extension import resolution**: pi's loader (`dist/core/extensions/loader.js`)
   aliases `typebox`, `@earendil-works/pi-ai`, `@earendil-works/pi-coding-agent`
   to pi's own copies via jiti — so those imports resolve even without local
   `node_modules` entries, but `npm install` of declared deps still works.
3. **Type-checking without installable deps**: use a temp toolchain
   (`tsc --noEmit --strict --allowImportingTsExtensions --typeRoots ...`).
4. **Tests run with `node --test`** (Node 22 native TS type stripping), not vitest.

## Phase Plan

- **Phase 1**: Core — parser, TaskManager skeleton, tests — ✅
- **Phase 2**: Extension — tool registrations, TypeBox schemas, wiring — ✅
- **Phase 3**: Polish — SKILL.md, README.md, end-to-end test — ✅
- **Phase 4**: Optional — TUI rendering, `/tasks` command, `session_start`
  auto-open hook — ⏳ remaining

## See also

- [[entities/taskmanager-class]] — the class being ported
- [[entities/parser]] — the parser being ported
- [[entities/tool-definitions]] — the API surface
