import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { TaskManager } from "../lib/task-manager.ts";

function setup() {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tm-val-"));
	const tm = new TaskManager();
	tm.openFile(dir);
	return { tm, dir };
}

const id = (r: Record<string, unknown>) => r.task_id as string;

// ── addTask validation ────────────────────────────────────────────────

test("addTask: rejects multiline description", () => {
	const { tm } = setup();
	const r = tm.addTask("line1\nline2");
	assert.equal(r.status, "error");
	assert.match(r.error as string, /newline/i);
});

test("addTask: rejects invalid scheduled date", () => {
	const { tm } = setup();
	const r = tm.addTask("A", undefined, undefined, undefined, undefined, "tomorrow");
	assert.equal(r.status, "error");
	assert.match(r.error as string, /scheduled/i);
});

test("addTask: rejects invalid start date", () => {
	const { tm } = setup();
	const r = tm.addTask("A", undefined, undefined, undefined, undefined, undefined, "2026-1-1");
	assert.equal(r.status, "error");
	assert.match(r.error as string, /start/i);
});

test("addTask: rejects invalid due date", () => {
	const { tm } = setup();
	const r = tm.addTask("A", undefined, undefined, undefined, undefined, undefined, undefined, "15/08/2026");
	assert.equal(r.status, "error");
	assert.match(r.error as string, /due/i);
});

test("addTask: rejects invalid priority", () => {
	const { tm } = setup();
	const r = tm.addTask("A", undefined, undefined, undefined, "urgent");
	assert.equal(r.status, "error");
	assert.match(r.error as string, /priority/i);
});

test("addTask: accepts valid dates and priority", () => {
	const { tm } = setup();
	const r = tm.addTask(
		"A",
		undefined,
		undefined,
		undefined,
		"high",
		"2026-09-01",
		"2026-09-02",
		"2026-09-03",
	);
	assert.equal(r.status, "ok");
	const t = tm.getTask(id(r)) as any;
	assert.equal(t.task.priority, "high");
	assert.equal(t.task.date_scheduled, "2026-09-01");
	assert.equal(t.task.date_start, "2026-09-02");
	assert.equal(t.task.date_due, "2026-09-03");
});

// ── editTask validation ───────────────────────────────────────────────

test("editTask: rejects multiline description", () => {
	const { tm } = setup();
	const a = id(tm.addTask("A"));
	const r = tm.editTask(a, "line1\nline2");
	assert.equal(r.status, "error");
	assert.match(r.error as string, /newline/i);
});

test("editTask: rejects invalid dates", () => {
	const { tm } = setup();
	const a = id(tm.addTask("A"));
	assert.equal((tm.editTask(a, undefined, undefined, undefined, "tomorrow") as any).status, "error");
	assert.equal((tm.editTask(a, undefined, undefined, undefined, undefined, "tomorrow") as any).status, "error");
	assert.equal((tm.editTask(a, undefined, undefined, undefined, undefined, undefined, "tomorrow") as any).status, "error");
});

// ── openFile validation: orphaned indented lines ─────────────────────

test("openFile: rejects orphaned indented lines (missing ancestor)", () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tm-val-"));
	const orphan = `# TODO

- [ ] Parent (ID: \`a1b2c3\`)
    - [ ] Orphan at depth 2 (ID: \`x1y2z3\`)
`;
	fs.writeFileSync(path.join(dir, "TODO.md"), orphan);
	const tm = new TaskManager();
	const r = tm.openFile(dir);
	assert.equal(r.status, "error");
	assert.match(r.error as string, /orphan/i);
	assert.equal(tm.isOpen, false);
});

test("openFile: rejects indented line with no root at all", () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tm-val-"));
	const orphan = `# TODO

  - [ ] Indented but no ancestor (ID: \`q1w2e3\`)
`;
	fs.writeFileSync(path.join(dir, "TODO.md"), orphan);
	const tm = new TaskManager();
	const r = tm.openFile(dir);
	assert.equal(r.status, "error");
	assert.match(r.error as string, /orphan/i);
	assert.equal(tm.isOpen, false);
});

test("openFile: rejects tab indentation", () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tm-val-"));
	const tabbed = `# TODO

- [ ] Root (ID: \`a1b2c3\`)
\t- [ ] Tab child (ID: \`x1y2z3\`)
`;
	fs.writeFileSync(path.join(dir, "TODO.md"), tabbed);
	const tm = new TaskManager();
	const r = tm.openFile(dir);
	assert.equal(r.status, "error");
	assert.match(r.error as string, /tab/i);
	assert.equal(tm.isOpen, false);
});

test("openFile: rejects duplicate task IDs", () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tm-val-"));
	const dups = `# TODO

- [ ] A (ID: \`a1b2c3\`)
- [ ] B (ID: \`a1b2c3\`)
`;
	fs.writeFileSync(path.join(dir, "TODO.md"), dups);
	const tm = new TaskManager();
	const r = tm.openFile(dir);
	assert.equal(r.status, "error");
	assert.match(r.error as string, /duplicate/i);
	assert.equal(tm.isOpen, false);
});

test("openFile: accepts properly nested file", () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tm-val-"));
	const valid = `# TODO

- [ ] A (ID: \`a1b2c3\`)
  - [ ] B (ID: \`d4e5f6\`)
    - [ ] C (ID: \`g7h8i9\`)
- [ ] D (ID: \`j1k2l3\`)
`;
	fs.writeFileSync(path.join(dir, "TODO.md"), valid);
	const tm = new TaskManager();
	const r = tm.openFile(dir);
	assert.equal(r.status, "ok");
	assert.equal((r as any).task_count, 4);
	tm.closeFile();
});

// ── round-trip guard: valid data survives save/reopen ─────────────────

test("round-trip: valid dates + priority survive save/reopen", () => {
	const { tm, dir } = setup();
	const a = id(
		tm.addTask(
			"A",
			undefined,
			undefined,
			undefined,
			"high",
			"2026-09-01",
			"2026-09-02",
			"2026-09-03",
		),
	);
	tm.closeFile();
	const tm2 = new TaskManager();
	tm2.openFile(dir);
	const t = tm2.getTask(a) as any;
	assert.equal(t.task.priority, "high");
	assert.equal(t.task.date_scheduled, "2026-09-01");
	assert.equal(t.task.date_start, "2026-09-02");
	assert.equal(t.task.date_due, "2026-09-03");
});
