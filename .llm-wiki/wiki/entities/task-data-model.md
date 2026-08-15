---
type: entity
title: Task data model
created: 2026-08-14
updated: 2026-08-14
---

# Task Data Model

The core data structure representing a single task in the hierarchy. Ported from Python `Task` dataclass to TypeScript interface.

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | 6-char base62 unique ID (e.g. `aB3dE1`) |
| `description` | `string` | Human-readable task title |
| `status` | `string` | `' '` (open), `'x'` (done), `'>'` (in-progress), `'!'` (failed), `'-'` (blocked) |
| `depth` | `int` | Nesting level (0 = root, max 8) |
| `position` | `int` | Position among siblings (0-indexed) |
| `parent_id` | `string \| null` | Parent task ID; null for root tasks |
| `children_ids` | `string[]` | Direct child task IDs |
| `date_created` | `string \| null` | ➕ YYYY-MM-DD (auto-set, immutable) |
| `date_modified` | `string \| null` | 🖊️ YYYY-MM-DD (auto-updated on every edit) |
| `priority` | `string \| null` | lowest, low, normal, medium, high, highest |
| `date_scheduled` | `string \| null` | ⏳ YYYY-MM-DD |
| `date_start` | `string \| null` | 🛫 YYYY-MM-DD |
| `date_due` | `string \| null` | 📅 YYYY-MM-DD |
| `date_done` | `string \| null` | ✅ YYYY-MM-DD (auto-set on status → x) |
| `date_cancelled` | `string \| null` | ❌ YYYY-MM-DD (auto-set on status → -) |
| `recurrence` | `string \| null` | 🔁 free-form rule (e.g. "every weekday") |
| `on_completion` | `string \| null` | 🏁 keep or 🗑️ delete |
| `depends_on` | `string[]` | ⛔ list of dependency task IDs |
| `has_spec` | `boolean` | 📎 whether task-<id>.md exists |

## TypeScript Interface

Located at `extension/lib/task.ts`. Currently a stub — needs to match the Python dataclass fields exactly.

## See also

- [[entities/taskmanager-class]] — the class that operates on Task objects
- [[concepts/todomd-format]] — how Tasks are serialized to disk
- [[concepts/emoji-annotations]] — emoji metadata encoding
