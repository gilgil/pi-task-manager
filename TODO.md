# pi-task-manager

## inbox

- [ ] Use the extension in real sessions (installed via `pi install`)
- [ ] Add `session_start` hook: auto-open TODO.md if present in cwd

## someday

- [ ] Add `/tasks` command for quick status
- [ ] Add custom TUI rendering (status bar showing task counts)

## done

- [x] Create project structure with `package.json`
- [x] Port `Task` dataclass → TypeScript tree node (`task.ts`)
- [x] Define TypeBox schemas for each tool (`tools.ts`)
- [x] Port `_parse_task_line` → TypeScript parser (`parser.ts`)
- [x] Port `TaskManager` class → TypeScript (`task-manager.ts`)
- [x] Write tests for parser and task manager (20 tests, `node --test`)
- [x] Create `extension/index.ts` with tool registrations
- [x] Wire tool execute handlers to TaskManager methods
- [x] Test extension in pi (load via `pi -e`)
- [x] Write `README.md`
- [x] Rewrite `SKILL.md` for the tree API
- [x] Test full workflow end-to-end
- [x] Fix `typebox` dependency (`^1.3.7`)
