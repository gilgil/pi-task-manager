---
type: concept
title: Emoji Annotations
created: 2026-08-14
updated: 2026-08-14
---

# Emoji Annotations

Inline emoji metadata embedded on task lines between the description and `(ID: ...)`.

## Priority

| Emoji | Level | Description |
|-------|-------|-------------|
| ⏬ | lowest | Lowest priority |
| 🔽 | low | Low priority |
| *(none)* | normal | Default |
| 🔼 | medium | Medium priority |
| ⏫ | high | High priority |
| 🔺 | highest | Highest priority |

## Dates

| Emoji | Key | Format | Description |
|-------|-----|--------|-------------|
| ⏳ | scheduled | YYYY-MM-DD | Scheduled date |
| 🛫 | start | YYYY-MM-DD | Start date |
| 📅 | due | YYYY-MM-DD | Due date |
| ✅ | done | YYYY-MM-DD | Completed date (auto-set on status → x) |
| ❌ | cancelled | YYYY-MM-DD | Cancelled date (auto-set on status → -) |
| ➕ | created | YYYY-MM-DD | Creation date (auto-set, immutable) |
| 🖊️ | modified | YYYY-MM-DD | Last modified (auto-updated) |

## Recurrence

| Emoji | Key | Format |
|-------|-----|--------|
| 🔁 | recurrence | `🔁 <rule>` (free-form, e.g. "every weekday") |

## On-Completion

| Emoji | Value | Description |
|-------|-------|-------------|
| 🏁 | keep | Keep task after completion (default) |
| 🗑️ | delete | Remove task after completion |

## Dependencies

| Emoji | Key | Format |
|-------|-----|--------|
| ⛔ | depends_on | `⛔ id1,id2,...` (comma-separated task IDs) |
| 🆔 | task_id | `🆔 <id>` (explicit self-reference) |

## Spec File

| Emoji | Key | Format |
|-------|-----|--------|
| 📎 | spec | `📎 [spec](task-<id>.md)` (link to spec file) |

## Full Example

```
- [ ] Deploy v2.1 🔺 📅 2025-02-01 ⏳ 2025-01-25 ⛔ aB3dE1,fG7hI2 📎 [spec](task-jK9lM4.md) ➕ 2025-01-15 🖊️ 2025-01-20 (ID: `jK9lM4`)
```

## See also

- [[concepts/todomd-format]] — where annotations appear in the file
- [[entities/parser]] — how annotations are extracted
- [[sources/SRC-2026-08-14-002]] — design rationale
