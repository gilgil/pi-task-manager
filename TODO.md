# pi-task-manager

## inbox

- [ ] Port `_parse_task_line` → TypeScript parser function (`parser.ts`)
- [ ] Port `TaskManager` class → TypeScript (`task-manager.ts`)
- [ ] Write basic tests for parser
- [ ] Create `extension/index.ts` with tool registrations
- [ ] Wire tool execute handlers to TaskManager methods
- [ ] Test extension in pi (load via `pi -e`)
- [ ] Add `resources_discover` handler for skill auto-discovery
- [ ] Write `README.md`
- [ ] Test full workflow end-to-end
- [ ] Add custom TUI rendering (status bar showing task counts)
- [ ] Add `/tasks` command for quick status
- [ ] Add `session_start` hook to auto-open TODO.md if present in cwd

## today

- [ ] Create project structure with `package.json`
- [ ] Port `Task` dataclass → TypeScript interface
- [ ] Define TypeBox schemas for each tool

## someday

- [ ] (none yet)

## done

- [x] Create project structure with `package.json`
- [x] Port `Task` dataclass → TypeScript interface
- [x] Define TypeBox schemas for each tool
- [x] Create `skills/task-manager/SKILL.md` with usage instructions
