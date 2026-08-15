---
type: entity
title: Parser
created: 2026-08-14
updated: 2026-08-14
---

# Parser

Markdown line parser that extracts Task fields from TODO.md lines. Ported from Python `_parse_task_line` and `_parse_annotations`.

## Entry Point

`parseTaskLine(line: string): Partial<Task> | null`

Located at `extension/lib/parser.ts` — currently a stub returning `null`.

## Parsing Steps

1. **Match task line pattern**: `^( *)-\s+\[([ x>!-])\]\s+(.*?)\s*$`
2. **Extract ID**: Regex `\(ID:\s*`([A-Za-z0-9]{6})`\)s*$` from end of line
3. **Parse emoji annotations**: Scan remaining text for known emoji patterns (right-to-left)
4. **Remaining text = description**

## Annotation Parsing Order

The parser processes annotations in this order (to avoid conflicts):

1. 📎 spec link
2. ⛔ depends_on
3. 🗑️ / 🏁 on_completion
4. 🔁 recurrence
5. Date emojis (⏳ 🛫 📅 ✅ ❌ ➕ 🖊️)
6. Priority emojis (⏬ 🔽 🔼 ⏫ 🔺)
7. 🆔 task_id

## File-Level Parsing

`parse_todo_file(content: string): Task[]` — iterates lines, tracks depth/position/parent at each level, builds hierarchy with parent-child relationships.

## TypeScript Location

`extension/lib/parser.ts` — needs full implementation.

## See also

- [[concepts/todomd-format]] — the format being parsed
- [[concepts/emoji-annotations]] — emoji patterns to match
- [[entities/task-data-model]] — output structure
