---
type: entity
title: ID Generation
created: 2026-08-14
updated: 2026-08-14
---

# ID Generation

6-character base62 unique IDs for tasks.

## Algorithm

1. Generate random bytes via `secrets.token_urlsafe(8)` (Python) or `crypto.randomUUID()` (TypeScript)
2. Filter to base62 chars: `A-Za-z0-9`
3. Take first 6 characters
4. Check against existing IDs; regenerate on collision

## Collision Probability

~1 in 56 billion (56,800,235,584 possible values) — negligible for practical use.

## Examples

`aB3dE1`, `Xk9mPq`, `R2vN7w`, `dcf64c`, `0h17ye`

## Regex Pattern

```
[A-Za-z0-9]{6}
```

## See also

- [[entities/task-data-model]] — where IDs are stored
- [[concepts/todomd-format]] — how IDs appear in markdown
