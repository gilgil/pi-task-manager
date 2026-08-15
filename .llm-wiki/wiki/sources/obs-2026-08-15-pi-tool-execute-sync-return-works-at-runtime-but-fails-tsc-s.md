---
type: source
title: "Observation: pi tool execute: sync return works at runtime but fails tsc strict"
tags:
  - pi
  - extension
  - typecheck
  - tsc
status: observation
created: 2026-08-15
updated: 2026-08-15
slug: obs-2026-08-15-pi-tool-execute-sync-return-works-at-runtime-but-fails-tsc-s
relevance: medium
observed_at: 2026-08-15T14:37:40.990Z
source_context: Type-checking pi-task-manager index.ts after adding session_start hook
---

# 🔍 Observation: pi tool execute: sync return works at runtime but fails tsc strict

In pi (v0.84.x) the ExtensionContext/ToolDefinition types declare tool `execute` must return `Promise<AgentToolResult>`, but pi-task-manager's existing handlers return a plain object synchronously and work fine at runtime (tools function in live sessions). Running `tsc --noEmit --strict` against pi's dist d.ts (via paths mapping to `@earendil-works/pi-coding-agent/dist/index.d.ts` and pi-ai under its node_modules) flags this as TS2322. Pre-existing in index.ts line ~78; left unfixed deliberately (surgical changes). To type-check pi extensions outside pi: map both pi packages via tsconfig `paths` since they're not npm-installed in the project.

*Relevance: medium*
*Context: Type-checking pi-task-manager index.ts after adding session_start hook*
*Tags: pi extension typecheck tsc*

---
*Observed: 2026-08-15T14:37:40.990Z*
