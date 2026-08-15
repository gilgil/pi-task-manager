import { test } from "node:test";
import assert from "node:assert/strict";
import {
	parseTaskLine,
	parseTodoFile,
	buildTaskLine,
	tasksToMarkdown,
} from "../lib/parser.ts";
import { depthOf, type Task } from "../lib/task.ts";

/** Flatten a tree to DFS order (for assertions). */
function flatten(roots: Task[]): Task[] {
	const out: Task[] = [];
	const walk = (tasks: Task[]): void => {
		for (const t of tasks) {
			out.push(t);
			walk(t.children);
		}
	};
	walk(roots);
	return out;
}

test("parse simple task line", () => {
	const t = parseTaskLine("- [ ] Buy milk (ID: `abc123`)")!;
	assert.equal(t.id, "abc123");
	assert.equal(t.description, "Buy milk");
	assert.equal(t.status, " ");
	assert.equal(t.parent, null);
	assert.deepEqual(t.children, []);
});

test("parse indented task line", () => {
	const t = parseTaskLine("  - [x] Done thing (ID: `def456`)")!;
	assert.equal(t.id, "def456");
	assert.equal(t.status, "x");
});

test("parse all annotations", () => {
	const line =
		"- [>] Roof 🔺 ⏳ 2026-01-01 🛫 2026-01-02 📅 2026-01-03 ✅ 2026-01-04 ❌ 2026-01-05 🔁 weekly 🗑️ ⛔ abc123,def456 📎 [spec](task-ghi789.md) ➕ 2026-01-01 🖊️ 2026-01-02 (ID: `ghi789`)";
	const t = parseTaskLine(line)!;
	assert.equal(t.description, "Roof");
	assert.equal(t.priority, "highest");
	assert.equal(t.dateScheduled, "2026-01-01");
	assert.equal(t.dateStart, "2026-01-02");
	assert.equal(t.dateDue, "2026-01-03");
	assert.equal(t.dateDone, "2026-01-04");
	assert.equal(t.dateCancelled, "2026-01-05");
	assert.equal(t.recurrence, "weekly");
	assert.equal(t.onCompletion, "delete");
	assert.deepEqual(t.dependsOn, ["abc123", "def456"]);
	assert.equal(t.hasSpec, true);
	assert.equal(t.dateCreated, "2026-01-01");
	assert.equal(t.dateModified, "2026-01-02");
});

test("recurrence rule extends to next emoji", () => {
	const t = parseTaskLine("- [ ] Meet 🔁 every 2 weeks on Monday 📅 2026-02-01 (ID: `abc123`)")!;
	assert.equal(t.recurrence, "every 2 weeks on Monday");
	assert.equal(t.dateDue, "2026-02-01");
});

test("invalid lines return null", () => {
	assert.equal(parseTaskLine("- [ ] No id here"), null);
	assert.equal(parseTaskLine("- [q] Bad status (ID: `abc123`)"), null);
	assert.equal(parseTaskLine("# comment"), null);
	assert.equal(parseTaskLine(""), null);
});

test("hierarchy: depth, parent, children", () => {
	const content = [
		"# TODO",
		"",
		"- [ ] A (ID: `aaaaaa`)",
		"  - [ ] B (ID: `bbbbbb`)",
		"    - [ ] C (ID: `cccccc`)",
		"  - [ ] D (ID: `dddddd`)",
		"- [ ] E (ID: `eeeeee`)",
		"",
	].join("\n");
	const roots = parseTodoFile(content);
	assert.deepEqual(roots.map((t) => t.id), ["aaaaaa", "eeeeee"]);
	const byId = Object.fromEntries(flatten(roots).map((t) => [t.id, t]));
	assert.equal(byId["bbbbbb"].parent?.id, "aaaaaa");
	assert.equal(depthOf(byId["bbbbbb"]), 1);
	assert.equal(byId["cccccc"].parent?.id, "bbbbbb");
	assert.equal(depthOf(byId["cccccc"]), 2);
	assert.equal(byId["dddddd"].parent?.id, "aaaaaa");
	assert.equal(byId["aaaaaa"].children.indexOf(byId["dddddd"]), 1);
	assert.deepEqual(byId["aaaaaa"].children.map((c) => c.id), [
		"bbbbbb",
		"dddddd",
	]);
	assert.deepEqual(byId["bbbbbb"].children.map((c) => c.id), ["cccccc"]);
});

test("round-trip: parse -> build -> parse is stable", () => {
	const content = [
		"# TODO",
		"",
		"- [ ] A ⏫ ⏳ 2026-09-01 📅 2026-12-01 ➕ 2026-08-14 🖊️ 2026-08-14 (ID: `aaaaaa`)",
		"  - [>] B 🔺 🔁 monthly 🗑️ ⛔ aaaaaa ➕ 2026-08-14 🖊️ 2026-08-14 (ID: `bbbbbb`)",
		"",
	].join("\n");
	const once = parseTodoFile(content);
	const rebuilt = tasksToMarkdown(once);
	assert.equal(rebuilt, content);
	const twice = parseTodoFile(rebuilt);
	assert.deepEqual(
		flatten(twice).map((t) => t.id),
		flatten(once).map((t) => t.id),
	);
	assert.equal(tasksToMarkdown(twice), content);
});

test("buildTaskLine: no annotations", () => {
	const t = parseTaskLine("- [ ] Plain (ID: `aaaaaa`)")!;
	assert.equal(buildTaskLine(t), "- [ ] Plain (ID: `aaaaaa`)");
});
