/**
 * pi-task-manager — hierarchical task manager for pi.
 *
 * Registers 7 tools (task_open, task_add, task_edit, task_move, task_get,
 * task_list, task_close) backed by a single TaskManager instance
 * that manages one TODO.md file per session. Mutations auto-save.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { TaskManager } from "./lib/task-manager.ts";
import { format, type Result } from "./lib/render.ts";
import { TOOLS } from "./lib/tools.ts";

const manager = new TaskManager();

const handlers: Record<string, (a: any) => Result> = {
	task_open: (a) => manager.openFile(a.path),
	task_add: (a) =>
		manager.addTask(a.description, {
			parentId: a.parent_id,
			beforeId: a.before_id,
			afterId: a.after_id,
			priority: a.priority,
			scheduled: a.scheduled,
			start: a.start,
			due: a.due,
			recurrence: a.recurrence,
			onCompletion: a.on_completion,
			dependsOn: a.depends_on,
			spec: a.spec,
		}),
	task_edit: (a) =>
		manager.editTask(a.task_id, {
			description: a.description,
			status: a.status,
			priority: a.priority,
			scheduled: a.scheduled,
			start: a.start,
			due: a.due,
			recurrence: a.recurrence,
			onCompletion: a.on_completion,
			dependsOn: a.depends_on,
		}),
	task_move: (a) => manager.moveTask(a.task_id, a.under_id, a.before_id, a.after_id),
	task_get: (a) => manager.getTask(a.task_id),
	task_list: (a) =>
		manager.listTasks(a.parent_id, a.status, a.priority, a.include_subtasks),
	task_close: () => manager.closeFile(),
};

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
