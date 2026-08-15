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
	const r = tm.editTask(a, "Fix 🔺 icon");
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
	tm.editTask(a, undefined, "x");
	assert.ok((tm.getTask(a) as any).task.date_done, "date_done stamped on x");
	tm.editTask(a, undefined, " ");
	assert.equal((tm.getTask(a) as any).task.date_done, null);
});

test("editTask: reverting status from - clears date_cancelled", () => {
	const { tm } = setup();
	const a = id(tm.addTask("A"));
	tm.editTask(a, undefined, "-");
	assert.ok((tm.getTask(a) as any).task.date_cancelled, "date_cancelled stamped on -");
	tm.editTask(a, undefined, " ");
	assert.equal((tm.getTask(a) as any).task.date_cancelled, null);
});

test("editTask: x to - clears date_done and stamps date_cancelled", () => {
	const { tm } = setup();
	const a = id(tm.addTask("A"));
	tm.editTask(a, undefined, "x");
	tm.editTask(a, undefined, "-");
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
