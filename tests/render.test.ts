import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { TaskManager } from "../lib/task-manager.ts";
import { format, lean } from "../lib/render.ts";

function setup() {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tm-render-"));
	const tm = new TaskManager();
	tm.openFile(dir);
	return { tm, dir };
}

test("task_list renders an indented tree, not JSON", () => {
	const { tm } = setup();
	const parent = tm.addTask("Parent", { priority: "high" }).task_id as string;
	const child = tm.addTask("Child", { parentId: parent, due: "2026-12-31" }).task_id as string;
	const out = format(tm.listTasks() as any);
	assert.deepEqual(out.split("\n"), [
		"2 tasks",
		`- [ ] Parent (${parent}) (high)`,
		`  - [ ] Child (${child}) due 2026-12-31`,
	]);
});

test("empty task list is one short line", () => {
	const { tm } = setup();
	const parent = tm.addTask("Parent").task_id as string;
	assert.equal(format(tm.listTasks(parent) as any), "0 tasks");
});

test("errors stay plain text", () => {
	assert.equal(format({ status: "error", error: "Task not found: zzzzzz" }), "Error: Task not found: zzzzzz");
});

test("lean drops nulls, empty arrays, and false recursively", () => {
	assert.deepEqual(
		lean({ a: 1, b: null, c: [], d: false, e: { f: null, g: [1, 2], h: { i: null } } }),
		{ a: 1, e: { g: [1, 2], h: {} } },
	);
});

test("single-task result is compact JSON with unset fields omitted", () => {
	const { tm } = setup();
	const id = tm.addTask("Only").task_id as string;
	const out = format(tm.getTask(id) as any);
	assert.equal(out.includes("date_due"), false);
	assert.equal(out.includes("depends_on"), false);
	assert.ok(out.length < 200, `expected compact output, got ${out.length} chars`);
});

test("list output is far smaller than pretty-printed JSON", () => {
	const { tm } = setup();
	const parent = tm.addTask("Parent").task_id as string;
	for (let i = 0; i < 50; i++) tm.addTask(`Task number ${i} with a realistic description`, { parentId: parent });
	const rendered = format(tm.listTasks() as any);
	const pretty = JSON.stringify(tm.listTasks(), null, 2).length;
	assert.ok(rendered.length * 3 < pretty, `rendered ${rendered.length} vs pretty ${pretty}: expected >3x smaller`);
});
