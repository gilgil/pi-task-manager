/**
 * Tool schemas for the task manager (7 tools).
 * Descriptions are kept terse: the parameter schemas dominate the prompt cost.
 * Parameter names are snake_case.
 */

import { StringEnum } from "@earendil-works/pi-ai";
import { Type, type TSchema } from "typebox";

const StatusEnum = StringEnum([" ", "x", ">", "!", "-"] as const);
const PriorityEnum = StringEnum([
	"lowest",
	"low",
	"normal",
	"medium",
	"high",
	"highest",
	"null",
] as const);
const OnCompletionEnum = StringEnum(["keep", "delete", "null"] as const);

const date = (what: string) => Type.Optional(Type.String({ description: what }));

const TaskOpenParams = Type.Object({
	path: Type.String({ description: "Workspace directory" }),
});

const TaskAddParams = Type.Object({
	description: Type.String({ description: "Task description" }),
	parent_id: Type.Optional(Type.String({ description: "Add as child of this task" })),
	before_id: Type.Optional(Type.String({ description: "Insert before this task" })),
	after_id: Type.Optional(Type.String({ description: "Insert after this task" })),
	priority: Type.Optional(PriorityEnum),
	scheduled: date("Scheduled date"),
	start: date("Start date"),
	due: date("Due date"),
	recurrence: Type.Optional(
		Type.String({ description: "Recurrence rule, e.g. 'weekly' or 'every 2 weeks'" }),
	),
	on_completion: Type.Optional(OnCompletionEnum),
	depends_on: Type.Optional(
		Type.Array(Type.String(), { description: "Task IDs this task depends on" }),
	),
	spec: Type.Optional(
		Type.Boolean({
			description: "Also create task-<id>.md for details (keep description short)",
		}),
	),
});

const TaskEditParams = Type.Object({
	task_id: Type.String({ description: "Task ID" }),
	description: Type.Optional(Type.String()),
	status: Type.Optional(StatusEnum),
	priority: Type.Optional(PriorityEnum),
	scheduled: date("Scheduled date"),
	start: date("Start date"),
	due: date("Due date"),
	recurrence: Type.Optional(Type.String()),
	on_completion: Type.Optional(OnCompletionEnum),
	depends_on: Type.Optional(
		Type.Array(Type.String(), { description: "Replaces the whole dependency list" }),
	),
});

const TaskMoveParams = Type.Object({
	task_id: Type.String({ description: "Task ID" }),
	under_id: Type.Optional(
		Type.String({ description: "New parent task (becomes last child)" }),
	),
	before_id: Type.Optional(Type.String({ description: "Place before this task" })),
	after_id: Type.Optional(Type.String({ description: "Place after this task" })),
});

const TaskGetParams = Type.Object({
	task_id: Type.String({ description: "Task ID" }),
});

const TaskListParams = Type.Object({
	parent_id: Type.Optional(Type.String({ description: "Parent task ID" })),
	status: Type.Optional(StatusEnum),
	priority: Type.Optional(PriorityEnum),
	include_subtasks: Type.Optional(
		Type.Boolean({ description: "With parent_id, include the whole subtree" }),
	),
});

const TaskCloseParams = Type.Object({});

export interface ToolDef {
	name: string;
	label: string;
	description: string;
	parameters: TSchema;
}

export const TOOLS: ToolDef[] = [
	{
		name: "task_open",
		label: "Task Open",
		description:
			"Open TODO.md in a workspace directory (created if missing). Call once before other task tools.",
		parameters: TaskOpenParams,
	},
	{
		name: "task_add",
		label: "Task Add",
		description:
			"Add a task. Returns the new 6-char task ID. Dates: YYYY-MM-DD.",
		parameters: TaskAddParams,
	},
	{
		name: "task_edit",
		label: "Task Edit",
		description:
			"Edit a task; only provided fields change. Status 'x' = done, '-' = cancelled. Dates: YYYY-MM-DD. Completing ('x') applies recurrence and on_completion. Note files (task-<id>.md) are edited with the write tool, not here.",
		parameters: TaskEditParams,
	},
	{
		name: "task_move",
		label: "Task Move",
		description:
			"Move a task and its subtree to under_id/before_id/after_id. Omit all three to delete it.",
		parameters: TaskMoveParams,
	},
	{
		name: "task_get",
		label: "Task Get",
		description: "Get full details of one task by ID.",
		parameters: TaskGetParams,
	},
	{
		name: "task_list",
		label: "Task List",
		description:
			"List tasks filtered by parent_id/status/priority. parent_id alone = direct children; with include_subtasks = whole subtree; no parent_id = all tasks. Output is the full tree — no need to read TODO.md.",
		parameters: TaskListParams,
	},
	{
		name: "task_close",
		label: "Task Close",
		description: "Save and close the current task file.",
		parameters: TaskCloseParams,
	},
];
