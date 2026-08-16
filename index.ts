/**
 * pi-task-manager — hierarchical task manager for pi.
 *
 * Registers 8 tools (task_open, task_add, task_edit, task_move, task_get,
 * task_list, task_save, task_close) backed by a single TaskManager instance
 * that manages one TODO.md file per session.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { TaskManager } from "./lib/task-manager.ts";
import { TOOLS } from "./lib/tools.ts";

const manager = new TaskManager();

type Result = Record<string, unknown>;

const handlers: Record<string, (a: any) => Result> = {
	task_open: (a) => manager.openFile(a.path),
	task_add: (a) =>
		manager.addTask(
			a.description,
			a.parent_id,
			a.before_id,
			a.after_id,
			a.priority,
			a.scheduled,
			a.start,
			a.due,
			a.recurrence,
			a.on_completion,
			a.depends_on,
			a.spec,
		),
	task_edit: (a) =>
		manager.editTask(
			a.task_id,
			a.description,
			a.status,
			a.priority,
			a.scheduled,
			a.start,
			a.due,
			a.recurrence,
			a.on_completion,
			a.depends_on,
		),
	task_move: (a) => manager.moveTask(a.task_id, a.under_id, a.before_id, a.after_id),
	task_get: (a) => manager.getTask(a.task_id),
	task_list: (a) =>
		manager.listTasks(a.parent_id, a.status, a.priority, a.include_subtasks),
	task_save: () => manager.save(),
	task_close: () => manager.closeFile(),
};

function format(result: Result): string {
	if (result.status === "error") return `Error: ${result.error}`;
	return JSON.stringify(result, null, 2);
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", (_event, ctx) => {
		const todoPath = join(ctx.cwd, "TODO.md");
		if (!existsSync(todoPath)) return;
		const result = manager.openFile(ctx.cwd);
		if (!ctx.hasUI) return;
		if (result.status === "ok")
			ctx.ui.notify(`Tasks: opened ${todoPath} (${result.task_count} tasks)`, "info");
		else
			ctx.ui.notify(`Tasks: failed to open ${todoPath}: ${result.error}`, "warning");
	});

	for (const tool of TOOLS) {
		pi.registerTool({
			name: tool.name,
			label: tool.label,
			description: tool.description,
			parameters: tool.parameters,
			execute: async (_toolCallId, params: any) => {
				const result = handlers[tool.name](params ?? {});
				return {
					content: [{ type: "text" as const, text: format(result) }],
					details: result,
				};
			},
		});
	}
}
