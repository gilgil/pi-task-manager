---
type: source
title: "Observation: pi-task-manager installed and verified in real pi"
tags:
  - pi-task-manager
  - install
  - done
status: observation
created: 2026-08-15
updated: 2026-08-15
slug: obs-2026-08-15-pi-task-manager-installed-and-verified-in-real-pi
relevance: high
observed_at: 2026-08-15T10:10:40.846Z
source_context: "Finishing pi-task-manager: commit, docs, install, verify"
---

# ⭐ Observation: pi-task-manager installed and verified in real pi

pi-task-manager is now installed via `pi install /home/gil/projects/pi-task-manager` (user settings, appears in `pi list`). Verified end-to-end through the installed auto-discovery path (not just `pi -e`): local model (Qwen3.8-27B via llama-server at https://llm.assayag.top:8443) called task_open/task_add and TODO.md was written correctly. Commits: 1febb9b (tree refactor + tests + docs), 4ca95f9 (typebox ^1.3.7 fix), 224ce53 (.llm-wiki vault). Working tree clean. Remaining Phase 4 items in project TODO.md: session_start auto-open hook (inbox), /tasks command + TUI status bar (someday).

*Relevance: high*
*Context: Finishing pi-task-manager: commit, docs, install, verify*
*Tags: pi-task-manager install done*

---
*Observed: 2026-08-15T10:10:40.846Z*
