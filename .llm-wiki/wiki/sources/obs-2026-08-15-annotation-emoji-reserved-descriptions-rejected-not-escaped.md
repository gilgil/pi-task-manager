---
type: source
title: "Observation: Annotation emoji reserved: descriptions rejected, not escaped"
tags:
  - pi-task-manager
  - parser
  - validation
  - design
status: observation
created: 2026-08-15
updated: 2026-08-15
slug: obs-2026-08-15-annotation-emoji-reserved-descriptions-rejected-not-escaped
relevance: high
observed_at: 2026-08-15T18:56:52.961Z
source_context: Fixing code-review bugs in pi-task-manager (round-trip data loss + API robustness)
---

# ⭐ Observation: Annotation emoji reserved: descriptions rejected, not escaped

In pi-task-manager, the decision for the emoji-in-description bug (CdqV8G) was to REJECT rather than escape: addTask/editTask now error when a description contains any of the 19 annotation emojis (⏬🔽🔼⏫🔺⏳🛫📅✅❌➕🖊️🔁🗑️🏁⛔📎🆔), exported as ANNOTATION_EMOJIS + findAnnotationEmoji() in lib/parser.ts. Rationale: consistent with the earlier newline-rejection fix, zero format changes, and the error message names the offending emoji. Non-annotation emoji (e.g. 🐛) round-trip fine and are accepted. Same TDD pattern: tests/robustness.test.ts (10 tests, 9 red → green). Also in this batch: openFile now returns error Result on ENOENT/ENOTDIR/EISDIR (state only committed on success — resolves Kb3lE5 too), and saveToDisk returns an error message: mutations add a `warning` field, save() returns error, closeFile keeps the file open on failure. 39 tests total.

*Relevance: high*
*Context: Fixing code-review bugs in pi-task-manager (round-trip data loss + API robustness)*
*Tags: pi-task-manager parser validation design*

---
*Observed: 2026-08-15T18:56:52.961Z*
