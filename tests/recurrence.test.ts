import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { TaskManager } from "../lib/task-manager.ts";
import { nextDate, parseRecurrence } from "../lib/recurrence.ts";

function setup() {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tm-rec-"));
	const tm = new TaskManager();
	tm.openFile(dir);
	return { tm, dir };
}

test("parseRecurrence accepts the documented forms", () => {
	assert.deepEqual(parseRecurrence("weekly"), { n: 1, unit: "week" });
	assert.deepEqual(parseRecurrence("daily"), { n: 1, unit: "day" });
	assert.deepEqual(parseRecurrence("every 3 days"), { n: 3, unit: "day" });
	assert.deepEqual(parseRecurrence("2 weeks"), { n: 2, unit: "week" });
	assert.deepEqual(parseRecurrence("weekly on Monday"), {
		n: 1,
		unit: "week",
		weekday: 1,
	});
	assert.deepEqual(parseRecurrence("every 2 weeks on Monday"), {
		n: 2,
		unit: "week",
		weekday: 1,
	});
});

test("parseRecurrence rejects anything else", () => {
	for (const bad of ["", "often", "every", "every 2 fortnights", "weekly on mondayy", "on Monday", "weekly on Twesday"])
		assert.equal(parseRecurrence(bad), null, `should reject: ${bad}`);
});

test("nextDate advances by the rule", () => {
	assert.equal(nextDate("2026-10-08", parseRecurrence("daily")!), "2026-10-09");
	assert.equal(nextDate("2026-10-08", parseRecurrence("weekly")!), "2026-10-15");
	assert.equal(nextDate("2026-10-08", parseRecurrence("monthly")!), "2026-11-08");
	assert.equal(nextDate("2026-01-31", parseRecurrence("monthly")!), "2026-02-28");
	assert.equal(nextDate("2024-02-29", parseRecurrence("yearly")!), "2025-02-28");
});

test("an 'on <Weekday>' rule lands on the nearest matching day after the base", () => {
	// Tue 2026-10-06 + weekly on Monday -> the Monday of the next week, not the
	// one after that.
	assert.equal(nextDate("2026-10-06", parseRecurrence("weekly on Monday")!), "2026-10-12");
	// Already a Monday: strictly after the base.
	assert.equal(nextDate("2026-10-12", parseRecurrence("weekly on Monday")!), "2026-10-19");
	// Thu 2026-10-08 + every 2 weeks -> Thu 2026-10-22, nearest Monday.
	assert.equal(nextDate("2026-10-08", parseRecurrence("every 2 weeks on Monday")!), "2026-10-19");
	// Daily on a weekday still never returns the base date.
	assert.equal(nextDate("2026-10-12", parseRecurrence("daily on Monday")!), "2026-10-19");
});

test("completing a recurring task creates the next instance", () => {
	const { tm } = setup();
	const id = tm.addTask("Standup", { due: "2026-10-08", recurrence: "weekly" }).task_id as string;
	const r = tm.editTask(id, { status: "x" });
	assert.equal(r.status, "ok");
	assert.ok(r.next_task_id, "expected a next_task_id");
	const next = tm.getTask(r.next_task_id as string).task as any;
	assert.equal(next.description, "Standup");
	assert.equal(next.status, " ");
	assert.equal(next.date_due, "2026-10-15");
	assert.equal(next.recurrence, "weekly");
	// placed as the following sibling, same parent
	assert.deepEqual((tm.listTasks().tasks as any[]).map((t) => t.id), [id, r.next_task_id]);
});

test("a recurring task with no dates recurs from today", () => {
	const { tm } = setup();
	const id = tm.addTask("Standup", { recurrence: "weekly" }).task_id as string;
	const r = tm.editTask(id, { status: "x" });
	const next = tm.getTask(r.next_task_id as string).task as any;
	assert.ok(next.date_due, "expected a due date on the new instance");
});

test("completing a task without recurrence creates nothing", () => {
	const { tm } = setup();
	const id = tm.addTask("One-off").task_id as string;
	const r = tm.editTask(id, { status: "x" });
	assert.equal(r.next_task_id, undefined);
	assert.equal((tm.listTasks().tasks as any[]).length, 1);
});

test("re-opening a recurring task does not spawn another instance", () => {
	const { tm } = setup();
	const id = tm.addTask("Standup", { recurrence: "weekly" }).task_id as string;
	tm.editTask(id, { status: "x" });
	const r = tm.editTask(id, { status: " " });
	assert.equal(r.next_task_id, undefined);
});

test("on_completion: delete removes the task when it is completed", () => {
	const { tm } = setup();
	const id = tm.addTask("Chore", { onCompletion: "delete" }).task_id as string;
	const r = tm.editTask(id, { status: "x" });
	assert.equal(r.status, "ok");
	assert.equal(r.task, undefined);
	assert.match(String(r.message), /deleted/);
	assert.equal((tm.listTasks().tasks as any[]).length, 0);
});

test("on_completion: delete is skipped when the task has sub-tasks", () => {
	const { tm } = setup();
	const id = tm.addTask("Parent", { onCompletion: "delete" }).task_id as string;
	tm.addTask("Child", { parentId: id });
	const r = tm.editTask(id, { status: "x" });
	assert.match(String(r.warning), /has sub-tasks/);
	assert.equal((tm.listTasks().tasks as any[]).length, 2);
});

test("recurrence + on_completion: delete replaces the task with its next instance", () => {
	const { tm } = setup();
	const id = tm.addTask("Standup", { due: "2026-10-08", recurrence: "weekly", onCompletion: "delete" }).task_id as string;
	const r = tm.editTask(id, { status: "x" });
	const tasks = tm.listTasks().tasks as any[];
	assert.equal(tasks.length, 1);
	assert.equal(tasks[0].id, r.next_task_id);
	assert.equal(tasks[0].date_due, "2026-10-15");
});

test("invalid recurrence is rejected on add and on edit", () => {
	const { tm } = setup();
	const add = tm.addTask("Bad", { recurrence: "fortnightly" });
	assert.equal(add.status, "error");
	assert.match(String(add.error), /Invalid recurrence rule/);
	const id = tm.addTask("Good").task_id as string;
	const edit = tm.editTask(id, { recurrence: "fortnightly" });
	assert.equal(edit.status, "error");
	assert.match(String(edit.error), /Invalid recurrence rule/);
});

test("the next instance survives a reload", () => {
	const { tm, dir } = setup();
	const id = tm.addTask("Standup", { due: "2026-10-08", recurrence: "weekly" }).task_id as string;
	const next = tm.editTask(id, { status: "x" }).next_task_id as string;
	const tm2 = new TaskManager();
	tm2.openFile(dir);
	const reloaded = tm2.getTask(next).task as any;
	assert.equal(reloaded.description, "Standup");
	assert.equal(reloaded.date_due, "2026-10-15");
	assert.equal(reloaded.recurrence, "weekly");
});

test("a real-world 'weekly on Monday' task recurs to the next Monday", () => {
	const { tm, dir } = setup();
	fs.writeFileSync(
		path.join(dir, "TODO.md"),
		"# TODO\n\n- [ ] Withdraw money from Kraken 🔁 weekly on Monday 📅 2026-10-06 ➕ 2026-09-25 🖊️ 2026-10-06 (ID: `vAwNkB`)\n",
	);
	const tm2 = new TaskManager();
	const open = tm2.openFile(dir);
	assert.equal(open.status, "ok");
	const loaded = tm2.getTask("vAwNkB").task as any;
	assert.equal(loaded.recurrence, "weekly on Monday");
	assert.equal(loaded.date_modified, "2026-10-06"); // differs from created -> kept
	const r = tm2.editTask("vAwNkB", { status: "x" });
	const next = tm2.getTask(r.next_task_id as string).task as any;
	assert.equal(next.date_due, "2026-10-12");
	assert.equal(next.recurrence, "weekly on Monday");
});
