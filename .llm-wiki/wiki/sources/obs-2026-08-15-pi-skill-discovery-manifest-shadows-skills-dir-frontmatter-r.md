---
type: source
title: "Observation: pi skill discovery: manifest shadows skills/ dir; frontmatter required"
tags:
  - pi
  - extension
  - skills
  - package-manifest
status: observation
created: 2026-08-15
updated: 2026-08-15
slug: obs-2026-08-15-pi-skill-discovery-manifest-shadows-skills-dir-frontmatter-r
relevance: high
observed_at: 2026-08-15T19:45:49.134Z
source_context: Debugging why task-manager skill was missing from pi's opening message
---

# ⭐ Observation: pi skill discovery: manifest shadows skills/ dir; frontmatter required

pi-task-manager's task-manager skill was silently not loaded. Two independent causes: (1) package.json has a `pi` manifest declaring only `extensions`, and per pi packages docs the conventional `skills/` directory is only auto-discovered when NO manifest is present — so the skill dir was never scanned. (2) skills/task-manager/SKILL.md had no YAML frontmatter (no name/description); pi docs state skills with missing description are NOT loaded. Fix: add `"skills": ["./skills"]` to the pi manifest AND add frontmatter (name: task-manager + description). Verified by running `pi -p` and grepping the session jsonl for `<name>task-manager</name>` in the system prompt. Commit a75cf13.

*Relevance: high*
*Context: Debugging why task-manager skill was missing from pi's opening message*
*Tags: pi extension skills package-manifest*

---
*Observed: 2026-08-15T19:45:49.134Z*
