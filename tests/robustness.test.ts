import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { TaskManager } from "../lib/task-manager.ts";

function setup() {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tm-rob-"));
	const tm = new TaskManager();
	tm.openFile(dir);
	return { tm, dir };
}

const id = (r: Record<string, unknown>) => r.task_id as string;

// ── annotation emoji in descriptions (CdqV8G) ─────────────────────────

test("addTask: rejects description containing priority emoji", () => {
	const { tm } = setup();
	const r = tm.addTask("Fix 🔺 icon");
	assert.equal(r.status, "error");
	assert.match(r.error as string, /emoji/i);
});

test("addTask: rejects description containing date emoji", () => {
	const { tm } = setup();
	const r = tm.addTask("done ✅ today");
	assert.equal(r.status, "error");
	assert.match(r.error as string, /emoji/i);
});

test("addTask: rejects description containing recurrence emoji", () => {
	const { tm } = setup();
	const r = tm.addTask("repeats 🔁 forever");
	assert.equal(r.status, "error");
	assert.match(r.error as string, /emoji/i);
});

test("editTask: rejects description containing annotation emoji", () => {
	const { tm } = setup();
	const a = id(tm.addTask("A"));
	const r = tm.editTask(a, { description: "Fix 🔺 icon" });
	assert.equal(r.status, "error");
	assert.match(r.error as string, /emoji/i);
});

test("addTask: accepts description with non-annotation emoji (round-trips)", () => {
	const { tm, dir } = setup();
	const a = id(tm.addTask("Fix the 🐛 bug"));
	tm.closeFile();
	const tm2 = new TaskManager();
	tm2.openFile(dir);
	const t = tm2.getTask(a) as any;
	assert.equal(t.task.description, "Fix the 🐛 bug");
});

// ── status revert (hjKhGg) ───────────────────────────────────────────────────

test("editTask: reverting status from x clears date_done", () => {
	const { tm } = setup();
	const a = id(tm.addTask("A"));
	tm.editTask(a, { status: "x" });
	assert.ok((tm.getTask(a) as any).task.date_done, "date_done stamped on x");
	tm.editTask(a, { status: " " });
	assert.equal((tm.getTask(a) as any).task.date_done, null);
});

test("editTask: reverting status from - clears date_cancelled", () => {
	const { tm } = setup();
	const a = id(tm.addTask("A"));
	tm.editTask(a, { status: "-" });
	assert.ok((tm.getTask(a) as any).task.date_cancelled, "date_cancelled stamped on -");
	tm.editTask(a, { status: " " });
	assert.equal((tm.getTask(a) as any).task.date_cancelled, null);
});

test("editTask: x to - clears date_done and stamps date_cancelled", () => {
	const { tm } = setup();
	const a = id(tm.addTask("A"));
	tm.editTask(a, { status: "x" });
	tm.editTask(a, { status: "-" });
	const t = (tm.getTask(a) as any).task;
	assert.equal(t.date_done, null);
	assert.ok(t.date_cancelled);
});

// ── openFile error handling (3Dqwgr) ──────────────────────────────────

test("openFile: bad path returns error Result instead of throwing", () => {
	const tm = new TaskManager();
	const r = tm.openFile("/nonexistent/definitely/missing");
	assert.equal(r.status, "error");
	assert.match(r.error as string, /open/i);
	assert.equal(tm.isOpen, false);
});

test("openFile: path is a file, not a directory → error Result", () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tm-rob-"));
	const file = path.join(dir, "notadir");
	fs.writeFileSync(file, "hi");
	const tm = new TaskManager();
	const r = tm.openFile(file);
	assert.equal(r.status, "error");
	assert.equal(tm.isOpen, false);
});

// ── save failure surfacing (gtoVfN) ───────────────────────────────────

test("save: returns error when directory is read-only", () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tm-rob-"));
	const tm = new TaskManager();
	tm.openFile(dir);
	const a = id(tm.addTask("A"));
	fs.chmodSync(dir, 0o555);
	try {
		const r = tm.save();
		assert.equal(r.status, "error");
		assert.match(r.error as string, /save/i);
	} finally {
		fs.chmodSync(dir, 0o755);
	}
});

test("addTask: reports warning when auto-save fails", () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tm-rob-"));
	const tm = new TaskManager();
	tm.openFile(dir);
	id(tm.addTask("A"));
	fs.chmodSync(dir, 0o555);
	try {
		const r = tm.addTask("B");
		assert.equal(r.status, "ok");
		assert.match(r.warning as string, /save failed/i);
	} finally {
		fs.chmodSync(dir, 0o755);
	}
});

test("closeFile: save failure returns error and keeps file open", () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tm-rob-"));
	const tm = new TaskManager();
	tm.openFile(dir);
	fs.chmodSync(dir, 0o555);
	try {
		tm.addTask("A"); // auto-save fails, stays dirty
		const r = tm.closeFile();
		assert.equal(r.status, "error");
		assert.match(r.error as string, /save/i);
		assert.equal(tm.isOpen, true);
	} finally {
		fs.chmodSync(dir, 0o755);
	}
});

test("listTasks: unknown parent_id errors like every other tool", () => {
	const { tm } = setup();
	const r = tm.listTasks("zzzzzz");
	assert.equal(r.status, "error");
	assert.match(String(r.error), /Task not found: zzzzzz/);
});

test("listTasks: priority 'null' matches tasks with no priority", () => {
	const { tm } = setup();
	tm.addTask("Prioritized", { priority: "high" });
	const plain = tm.addTask("No priority").task_id as string;
	const r = tm.listTasks(null, null, "null");
	assert.equal(r.count, 1);
	assert.equal((r.tasks as any[])[0].id, plain);
});

test("deleteTask: prunes depends_on left dangling in survivors", () => {
	const { tm, dir } = setup();
	const dep = tm.addTask("Dependency").task_id as string;
	const holder = tm.addTask("Holder", { dependsOn: [dep] }).task_id as string;
	const r = tm.moveTask(dep);
	assert.equal(r.status, "ok");
	assert.equal(r.pruned_dependencies, 1);
	assert.deepEqual((tm.getTask(holder).task as any).depends_on, []);
	// and it stays pruned after reload
	const tm2 = new TaskManager();
	tm2.openFile(dir);
	assert.deepEqual((tm2.getTask(holder).task as any).depends_on, []);
});

test("deleteTask: pruning covers the whole deleted subtree", () => {
	const { tm } = setup();
	const parent = tm.addTask("Parent").task_id as string;
	const child = tm.addTask("Child", { parentId: parent }).task_id as string;
	const holder = tm.addTask("Holder", { dependsOn: [child] }).task_id as string;
	const r = tm.moveTask(parent);
	assert.equal(r.pruned_dependencies, 1);
	assert.deepEqual((tm.getTask(holder).task as any).depends_on, []);
});

test("deleteTask: removes the task's spec file", () => {
	const { tm, dir } = setup();
	const id = tm.addTask("With note", { spec: true }).task_id as string;
	const spec = path.join(dir, `task-${id}.md`);
	assert.ok(fs.existsSync(spec));
	const r = tm.moveTask(id);
	assert.equal(r.status, "ok");
	assert.equal(r.removed_spec_files, 1);
	assert.equal(fs.existsSync(spec), false);
});

test("addTask: after_id of a nested task implies that task's parent", () => {
	const { tm } = setup();
	const group = tm.addTask("Group").task_id as string;
	const a = tm.addTask("A", { parentId: group }).task_id as string;
	const b = tm.addTask("B", { parentId: group }).task_id as string;
	const c = tm.addTask("C", { afterId: a }).task_id as string;
	const tree = tm.listTasks(group).tasks as any[];
	assert.deepEqual(tree.map((t) => [t.id, t.depth]), [
		[a, 1],
		[c, 1],
		[b, 1],
	]);
});

test("addTask: before_id of a nested task implies that task's parent", () => {
	const { tm } = setup();
	const group = tm.addTask("Group").task_id as string;
	const a = tm.addTask("A", { parentId: group }).task_id as string;
	const c = tm.addTask("C", { beforeId: a }).task_id as string;
	const tree = tm.listTasks(group).tasks as any[];
	assert.deepEqual(tree.map((t) => t.id), [c, a]);
});

test("moveTask: after_id alone moves the task to the reference's level", () => {
	const { tm } = setup();
	const group = tm.addTask("Group").task_id as string;
	const a = tm.addTask("A", { parentId: group }).task_id as string;
	const loose = tm.addTask("Loose").task_id as string;
	const r = tm.moveTask(loose, undefined, undefined, a);
	assert.equal(r.status, "ok");
	assert.equal(r.parent_id, group);
	assert.equal(r.depth, 1);
});

test("addTask: an explicit parent_id still rejects a non-sibling reference", () => {
	const { tm } = setup();
	const g1 = tm.addTask("Group 1").task_id as string;
	const g2 = tm.addTask("Group 2").task_id as string;
	const inside = tm.addTask("Inside", { parentId: g2 }).task_id as string;
	const r = tm.addTask("New", { parentId: g1, afterId: inside });
	assert.equal(r.status, "error");
	assert.match(String(r.error), /must be a sibling/);
});

test("moveTask: cannot be placed after its own descendant", () => {
	const { tm } = setup();
	const parent = tm.addTask("Parent").task_id as string;
	const child = tm.addTask("Child", { parentId: parent }).task_id as string;
	const r = tm.moveTask(parent, undefined, undefined, child);
	assert.equal(r.status, "error");
	assert.match(String(r.error), /descendant/);
});

test("an unedited task carries no 🖊️ in TODO.md", () => {
	const { tm, dir } = setup();
	const id = tm.addTask("Fresh").task_id as string;
	tm.editTask(id, { description: "Fresh (renamed)" });
	const file = fs.readFileSync(path.join(dir, "TODO.md"), "utf8");
	assert.match(file, /➕ \d{4}-\d{2}-\d{2}/);
	assert.ok(!file.includes("🖊️"), file);
	const t = tm.getTask(id).task as any;
	assert.equal(t.date_created, t.date_modified);
});

test("editTask: depends_on [] clears the list, null means 'not provided'", () => {
	const { tm } = setup();
	const dep = tm.addTask("Dependency").task_id as string;
	const holder = tm.addTask("Holder", { dependsOn: [dep] }).task_id as string;
	tm.editTask(holder, { dependsOn: null });
	assert.deepEqual((tm.getTask(holder).task as any).depends_on, [dep]);
	assert.equal(tm.editTask(holder, { dependsOn: [] }).status, "ok");
	assert.deepEqual((tm.getTask(holder).task as any).depends_on, []);
});

test("addTask: the not-open error names the real tool (task_open)", () => {
	const r = new TaskManager().addTask("Orphan");
	assert.equal(r.status, "error");
	assert.match(String(r.error), /task_open/);
});
