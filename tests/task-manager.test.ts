import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { TaskManager } from "../lib/task-manager.ts";

function setup() {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tm-test-"));
	const tm = new TaskManager();
	tm.openFile(dir);
	return { tm, dir };
}

const id = (r: Record<string, unknown>) => r.task_id as string;

test("open creates TODO.md", () => {
	const { tm, dir } = setup();
	assert.ok(fs.existsSync(path.join(dir, "TODO.md")));
	assert.equal(tm.isOpen, true);
	tm.closeFile();
});

test("add: hierarchy and positions", () => {
	const { tm } = setup();
	const a = id(tm.addTask("A"));
	const b = id(tm.addTask("B", { parentId: a }));
	const c = id(tm.addTask("C", { parentId: a, beforeId: b }));
	const d = id(tm.addTask("D", { parentId: a }));
	const e = id(tm.addTask("E"));
	const list = tm.listTasks() as any;
	assert.deepEqual(
		list.tasks.map((t: any) => t.id),
		[a, c, b, d, e],
	);
	const byId = Object.fromEntries(list.tasks.map((t: any) => [t.id, t]));
	assert.equal(byId[b].parent_id, a);
	assert.equal(byId[b].depth, 1);
	assert.equal(byId[c].position, 0);
	assert.equal(byId[b].position, 1);
});

test("add: invalid parent", () => {
	const { tm } = setup();
	const r = tm.addTask("X", { parentId: "nope12" });
	assert.equal(r.status, "error");
});

test("edit: no fields is an error", () => {
	const { tm } = setup();
	const a = id(tm.addTask("A"));
	const r = tm.editTask(a);
	assert.equal(r.status, "error");
	assert.equal(r.error, "No fields to edit.");
});

test("edit: invalid status and priority", () => {
	const { tm } = setup();
	const a = id(tm.addTask("A"));
	assert.equal((tm.editTask(a, { status: "z" }) as any).status, "error");
	assert.equal((tm.editTask(a, { priority: "urgent" }) as any).status, "error");
	const ok = tm.editTask(a, { description: "A2", status: "x", priority: "null" }) as any;
	assert.equal(ok.status, "ok");
	assert.equal(ok.task.description, "A2");
	assert.equal(ok.task.status, "x");
	assert.equal(ok.task.priority, null);
	assert.ok(ok.task.date_done);
});

test("edit: circular dependency rejected", () => {
	const { tm } = setup();
	const a = id(tm.addTask("A"));
	const b = id(tm.addTask("B"));
	tm.editTask(b, { dependsOn: [a] });
	const r = tm.editTask(a, { dependsOn: [b] });
	assert.equal(r.status, "error");
	assert.match(r.error as string, /Circular/);
});

test("move: under own descendant rejected", () => {
	const { tm } = setup();
	const a = id(tm.addTask("A"));
	const b = id(tm.addTask("B", { parentId: a }));
	const r = tm.moveTask(a, b);
	assert.equal(r.status, "error");
});

test("move: before later sibling keeps order", () => {
	const { tm } = setup();
	const a = id(tm.addTask("A"));
	const b = id(tm.addTask("B", { parentId: a }));
	const c = id(tm.addTask("C", { parentId: a }));
	// b already sits before c; re-inserting "before c" must not swap them
	// (the index must be computed after detaching b).
	const r = tm.moveTask(b, a, c);
	assert.equal(r.status, "ok");
	const ids = (tm.listTasks().tasks as any[]).map((t) => t.id);
	assert.deepEqual(ids, [a, b, c]);
});

test("move: with subtree, positions recomputed", () => {
	const { tm } = setup();
	const a = id(tm.addTask("A"));
	const b = id(tm.addTask("B"));
	const c = id(tm.addTask("C", { parentId: b }));
	const d = id(tm.addTask("D"));
	tm.moveTask(b, a);
	const list = tm.listTasks() as any;
	assert.deepEqual(
		list.tasks.map((t: any) => t.id),
		[a, b, c, d],
	);
	const byId = Object.fromEntries(list.tasks.map((t: any) => [t.id, t]));
	assert.equal(byId[b].parent_id, a);
	assert.equal(byId[c].parent_id, b);
	assert.equal(byId[c].depth, 2);
});

test("move: no destination deletes task and subtree", () => {
	const { tm } = setup();
	const a = id(tm.addTask("A"));
	const b = id(tm.addTask("B", { parentId: a }));
	const c = id(tm.addTask("C", { parentId: b }));
	const r = tm.moveTask(a);
	assert.equal(r.status, "ok");
	assert.match(r.message as string, /2 sub-task/);
	const list = tm.listTasks() as any;
	assert.equal(list.count, 0);
});

test("list: filters", () => {
	const { tm } = setup();
	const a = id(tm.addTask("A", { priority: "high" }));
	tm.addTask("B");
	tm.editTask(a, { status: "x" });
	const byStatus = tm.listTasks(undefined, "x") as any;
	assert.equal(byStatus.count, 1);
	assert.equal(byStatus.tasks[0].id, a);
	const byPriority = tm.listTasks(undefined, undefined, "high") as any;
	assert.equal(byPriority.count, 1);
	const subtree = tm.listTasks(a, undefined, undefined, true) as any;
	assert.equal(subtree.count, 1);
	assert.equal(subtree.tasks[0].id, a);
});

test("save and close", () => {
	const { tm, dir } = setup();
	tm.addTask("A");
	const s = tm.save() as any;
	assert.equal(s.status, "ok");
	assert.equal(s.task_count, 1);
	const c = tm.closeFile() as any;
	assert.equal(c.status, "ok");
	assert.equal(tm.isOpen, false);
	const r = tm.save();
	assert.equal(r.status, "error");
	assert.ok(fs.existsSync(path.join(dir, "TODO.md.bak")));
});

test("addTask reports where the task landed", () => {
	const { tm } = setup();
	const group = tm.addTask("Group").task_id as string;
	const a = tm.addTask("A", { parentId: group }).task_id as string;
	tm.addTask("B", { parentId: group });
	const r = tm.addTask("C", { afterId: a });
	assert.equal(r.parent_id, group);
	assert.equal(r.depth, 1);
	assert.equal(r.position, 1);
	const top = tm.addTask("Top");
	assert.equal(top.parent_id, null);
	assert.equal(top.depth, 0);
});
