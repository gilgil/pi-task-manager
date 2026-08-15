---
type: concept
title: Task Hierarchy
created: 2026-08-14
updated: 2026-08-14
---

# Task Hierarchy

Tasks are organized in a tree structure with parent-child relationships, up to 8 levels deep.

## Structure

- **Root tasks**: `depth = 0`, `parent_id = null`
- **Child tasks**: `depth = parent.depth + 1`, `parent_id` points to parent
- **Max depth**: 8 (enforced on add and move)
- **Siblings**: Tasks with the same `parent_id`, ordered by `position`

## Indentation

Each nesting level adds 2 spaces of indentation:

```markdown
- [ ] Root task (depth 0)
  - [ ] Child task (depth 1)
    - [ ] Grandchild task (depth 2)
```

## Operations

- **Add**: Can specify `parent_id`, `before_id`, or `after_id` for insertion point
- **Move**: Carries all descendants with it; rejects self-referential moves
- **Delete**: Cascade deletes all descendants
- **Depth check**: Rejects any operation that would exceed max depth 8

## Position Tracking

`position` is the 0-indexed position among siblings (same `parent_id`). Recomputed on every mutation via `_compute_positions()`.

## See also

- [[entities/task-data-model]] — the Task class with hierarchy fields
- [[entities/taskmanager-class]] — operations that maintain the hierarchy
- [[concepts/todomd-format]] — how hierarchy is serialized
