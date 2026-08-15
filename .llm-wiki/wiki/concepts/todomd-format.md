---
type: concept
title: TODO.md Format
created: 2026-08-14
updated: 2026-08-14
---

# TODO.md Format

Single-file hierarchical task storage using GitHub-flavored markdown task lists with inline emoji annotations.

## Task Line Format

```
<indent>- [STATUS] Description <emoji-annotations> (ID: `XXXXXX`)
```

- **`<indent>`**: Two spaces per nesting level (0, 2, 4, 6, 8, 10, 12, 14)
- **`[STATUS]`**: Single char — ` ` (open), `x` (done), `>` (in-progress), `!` (failed), `-` (blocked)
- **Description**: Free-form text
- **`<emoji-annotations>`**: Space-separated emoji metadata
- **`(ID: \`XXXXXX\`)`**: 6-char base62 ID in backticks, always at end

## Annotation Order

Priority → Dates (scheduled, start, due, done, cancelled) → Recurrence → On-completion → Dependencies → Spec → Created → Modified

## Example

```markdown
# TODO

- [ ] Implement authentication 🔺 📅 2025-02-01 📎 [spec](task-aB3dE1.md) ➕ 2025-01-15 🖊️ 2025-01-15 (ID: `aB3dE1`)
  - [x] Design login API ✅ 2025-01-15 ➕ 2025-01-15 🖊️ 2025-01-15 (ID: `fG7hI2`)
  - [>] Implement JWT tokens 🔼 ⏳ 2025-01-20 ⛔ fG7hI2 ➕ 2025-01-15 🖊️ 2025-01-15 (ID: `jK9lM4`)
```

## Constraints

- Max nesting depth: 8
- One file per workspace
- One file open at a time
- Emoji annotations per task: one per type

## See also

- [[concepts/emoji-annotations]] — full emoji reference
- [[entities/parser]] — how lines are parsed
- [[entities/task-data-model]] — internal representation
