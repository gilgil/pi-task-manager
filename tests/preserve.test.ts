import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { docToMarkdown, parseTodoDoc } from "../lib/parser.ts";
import { TaskManager } from "../lib/task-manager.ts";
import type { Task } from "../lib/task.ts";

function setup() {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tm-preserve-"));
	const tm = new TaskManager();
	tm.openFile(dir);
	return { tm, dir };
}

const id = (r: Record<string, unknown>) => r.task_id as string;

/** A file with content the task parser cannot represent as tasks. */
function handEditedFile(): string {
	return [
		"# TODO",
		"",
		"- [ ] Real task (ID: `aaaaaa`)",
		"  - [ ] Hand-written subtask, no ID",
		"",
		"## Notes",
		"Some prose the user wrote by hand.",
		"- a plain bullet that is not a task",
		"- [ ] Deep (ID: `b11111`)",
		"  - [ ] L1 (ID: `b22222`)",
		"    - [ ] L2 (ID: `b33333`)",
		"      - [ ] L3 (ID: `b44444`)",
		"        - [ ] L4 (ID: `b55555`)",
		"          - [ ] L5 (ID: `b66666`)",
		"            - [ ] L6 (ID: `b77777`)",
		"              - [ ] L7 (ID: `b88888`)",
		"                - [ ] L8 (ID: `b99999`)",
		"                  - [ ] L9 beyond MAX_DEPTH (ID: `cc9999`)",
		"",
	].join("\n");
}

// ── parser: non-task content is preserved, not dropped ────────────────

test("parseTodoDoc: keeps preamble, epilogue, and non-task lines verbatim", () => {
	const content = [
		"# TODO",
		"",
		"- [ ] A (ID: `aaaaaa`)",
		"  - [ ] B (ID: `bbbbbb`)",
		"prose after B",
		"  - [ ] C (ID: `cccccc`)",
		"- [ ] D (ID: `dddddd`)",
		"trailing note",
		"",
	].join("\n");
	const doc = parseTodoDoc(content);
	assert.deepEqual(doc.preamble, ["# TODO", ""]);
	assert.deepEqual(doc.roots.map((t) => t.id), ["aaaaaa", "dddddd"]);
	assert.deepEqual(doc.roots[0].children.map((c) => c.id), ["bbbbbb", "cccccc"]);
	assert.deepEqual(doc.roots[0].children[0].extraLines, ["prose after B"]);
	assert.deepEqual(doc.roots[1].extraLines, []);
	assert.deepEqual(doc.epilogue, ["trailing note"]);
});

test("docToMarkdown: hand-edited file round-trips byte-for-byte", () => {
	const content = handEditedFile();
	assert.equal(docToMarkdown(parseTodoDoc(content)), content);
});

test("parseTodoDoc: lines beyond MAX_DEPTH are preserved, not dropped", () => {
	const doc = parseTodoDoc(handEditedFile());
	const byId = (id: string): Task => {
		let found: Task | undefined;
		const walk = (tasks: Task[]): void => {
			for (const t of tasks) {
				if (t.id === id) found = t;
				walk(t.children);
			}
		};
		walk(doc.roots);
		return found!;
	};
	const deepest = byId("b99999");
	assert.equal(deepest.children.length, 0);
	assert.deepEqual(deepest.extraLines, []);
	assert.deepEqual(doc.epilogue, [
		"                  - [ ] L9 beyond MAX_DEPTH (ID: `cc9999`)",
	]);
});

// ── TaskManager: a mutation must not destroy hand-written content ─────

test("openFile + one mutation preserves all hand-written content", () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tm-preserve-"));
	const before = handEditedFile();
	fs.writeFileSync(path.join(dir, "TODO.md"), before);
	const tm = new TaskManager();
	const opened = tm.openFile(dir);
	assert.equal(opened.status, "ok");
	tm.addTask("One mutation");
	const after = fs.readFileSync(path.join(dir, "TODO.md"), "utf-8");
	for (const line of before.split("\n"))
		assert.ok(after.includes(line), `lost line: ${JSON.stringify(line)}`);
});

test("addTask on a fresh file: header block intact, single trailing newline", () => {
	const { tm, dir } = setup();
	tm.addTask("A");
	const content = fs.readFileSync(path.join(dir, "TODO.md"), "utf-8");
	assert.ok(content.startsWith("# TODO\n\n- [ ] A "), JSON.stringify(content.slice(0, 20)));
	assert.ok(content.endsWith("\n") && !content.endsWith("\n\n"));
});

test("round-trip: tool-generated file is stable across reopen", () => {
	const { tm, dir } = setup();
	const a = id(tm.addTask("A", { priority: "high" }));
	tm.addTask("B", { parentId: a });
	tm.addTask("C", { recurrence: "weekly" });
	tm.closeFile();
	const first = fs.readFileSync(path.join(dir, "TODO.md"), "utf-8");
	const tm2 = new TaskManager();
	tm2.openFile(dir);
	tm2.save();
	assert.equal(fs.readFileSync(path.join(dir, "TODO.md"), "utf-8"), first);
});

// ── recurrence validation (free text written verbatim into the line) ──

test("addTask: rejects recurrence containing a newline", () => {
	const { tm, dir } = setup();
	const r = tm.addTask("A", { recurrence: "weekly\n- [ ] PHANTOM (ID: `zzzzzz`)" });
	assert.equal(r.status, "error");
	assert.match(r.error as string, /newline/i);
	assert.equal(fs.readFileSync(path.join(dir, "TODO.md"), "utf-8"), "# TODO\n\n");
});

test("editTask: rejects recurrence containing a newline", () => {
	const { tm, dir } = setup();
	const a = id(tm.addTask("A"));
	const r = tm.editTask(a, { recurrence: "daily\n- [ ] EVIL (ID: `evil01`)" });
	assert.equal(r.status, "error");
	assert.match(r.error as string, /newline/i);
	const tm2 = new TaskManager();
	tm2.openFile(dir);
	assert.deepEqual((tm2.listTasks().tasks as any[]).map((t) => t.id), [a]);
});

test("addTask: rejects recurrence containing an annotation emoji", () => {
	const { tm } = setup();
	const r = tm.addTask("A", { recurrence: "every 📅 2030-01-01" });
	assert.equal(r.status, "error");
	assert.match(r.error as string, /emoji/i);
});

test("editTask: rejects recurrence containing an annotation emoji", () => {
	const { tm } = setup();
	const a = id(tm.addTask("A"));
	const r = tm.editTask(a, { recurrence: "weekly 🔁" });
	assert.equal(r.status, "error");
	assert.match(r.error as string, /emoji/i);
});

test("editTask: empty recurrence clears the field", () => {
	const { tm, dir } = setup();
	const a = id(tm.addTask("A", { recurrence: "weekly" }));
	tm.editTask(a, { recurrence: "" });
	tm.closeFile();
	const tm2 = new TaskManager();
	tm2.openFile(dir);
	assert.equal((tm2.getTask(a) as any).task.recurrence, null);
});

// ── task_list: include_subtasks actually limits the result ────────────

test("task_list: parent_id without include_subtasks returns direct children only", () => {
	const { tm } = setup();
	const a = id(tm.addTask("A"));
	const a1 = id(tm.addTask("A1", { parentId: a }));
	tm.addTask("A11", { parentId: a1 });
	const direct = tm.listTasks(a) as any;
	assert.deepEqual(direct.tasks.map((t: any) => t.id), [a1]);
	assert.equal(direct.count, 1);
});

test("task_list: include_subtasks returns the whole subtree including the parent", () => {
	const { tm } = setup();
	const a = id(tm.addTask("A"));
	const a1 = id(tm.addTask("A1", { parentId: a }));
	const a11 = id(tm.addTask("A11", { parentId: a1 }));
	const sub = tm.listTasks(a, undefined, undefined, true) as any;
	assert.deepEqual(sub.tasks.map((t: any) => t.id), [a, a1, a11]);
});

test("task_list: no parent_id still lists the whole tree", () => {
	const { tm } = setup();
	const a = id(tm.addTask("A"));
	const a1 = id(tm.addTask("A1", { parentId: a }));
	tm.addTask("A11", { parentId: a1 });
	assert.equal((tm.listTasks() as any).count, 3);
});

test("task_list: filters apply to the subtree when recursing", () => {
	const { tm } = setup();
	const a = id(tm.addTask("A", { priority: "high" }));
	const a1 = id(tm.addTask("A1", { parentId: a, priority: "high" }));
	tm.addTask("A11", { parentId: a1, priority: "low" });
	const r = tm.listTasks(a, undefined, "high", true) as any;
	assert.deepEqual(r.tasks.map((t: any) => t.id), [a, a1]);
});
