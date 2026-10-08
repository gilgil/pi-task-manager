import { test } from "node:test";
import assert from "node:assert/strict";
import { TOOLS } from "../lib/tools.ts";

// Tool definitions are sent on every request, so their size is a real cost.
// Measured live (llama-server prompt_tokens differencing, 2026-10-08):
//   8 tools = 4592 wire chars = 1450 prompt tokens
//   7 tools = 3832 wire chars = 1269 prompt tokens
function wire(defs: { name: string; description: string; parameters: unknown }[]) {
	return JSON.stringify(
		defs.map((t) => ({
			type: "function",
			function: {
				name: t.name,
				description: t.description,
				parameters: t.parameters,
				strict: false,
			},
		})),
	);
}

test("exposes exactly the 7 task tools, unique names, all described", () => {
	const names = TOOLS.map((t) => t.name);
	assert.deepEqual(names, [
		"task_open",
		"task_add",
		"task_edit",
		"task_move",
		"task_get",
		"task_list",
		"task_close",
	]);
	assert.equal(new Set(names).size, names.length);
	for (const t of TOOLS) assert.ok(t.description.length > 0, `${t.name} has no description`);
});

test("no task_save tool: every mutation already auto-saves", () => {
	assert.equal(TOOLS.some((t) => t.name === "task_save"), false);
});

test("tool wire JSON stays under budget", () => {
	const chars = wire(TOOLS).length;
	assert.ok(chars <= 4000, `tool definitions grew to ${chars} wire chars (budget 4000)`);
});
