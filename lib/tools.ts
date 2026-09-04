/**
 * Tool schemas for the task manager (8 tools).
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

const date = (what: string) =>
	Type.Optional(Type.String({ description: `${what}, YYYY-MM-DD` }));

const TaskOpenParams = Type.Object({
	path: Type.String({
		description: "Workspace directory containing TODO.md (created if missing)",
	}),
});

const TaskAddParams = Type.Object({
	description: Type.String({ description: "Task description" }),
	parent_id: Type.Optional(
		Type.String({ description: "Add as last child of this task" }),
	),
	before_id: Type.Optional(
		Type.String({ description: "Insert before this task (same level)" }),
	),
	after_id: Type.Optional(
		Type.String({
			description: "Insert after this task (same level)",
		}),
	),
	priority: Type.Optional(PriorityEnum),
	scheduled: date("Scheduled date"),
	start: date("Start date"),
	due: date("Due date"),
	recurrence: Type.Optional(
		Type.String({
			description: "Recurrence rule, e.g. 'weekly' or 'every 2 weeks on Monday'",
		}),
	),
	on_completion: Type.Optional(OnCompletionEnum),
	depends_on: Type.Optional(
		Type.Array(Type.String(), {
			description: "IDs of tasks this task depends on",
		}),
	),
	spec: Type.Optional(
		Type.Boolean({
			description:
				"Create a task-<id>.md note file for detailed findings (audits, decisions, research). Keep the task description short; put details in the note.",
		}),
	),
});

const TaskEditParams = Type.Object({
	task_id: Type.String({ description: "ID of the task to edit" }),
	description: Type.Optional(Type.String()),
	status: Type.Optional(StatusEnum),
	priority: Type.Optional(PriorityEnum),
	scheduled: date("Scheduled date"),
	start: date("Start date"),
	due: date("Due date"),
	recurrence: Type.Optional(Type.String()),
	on_completion: Type.Optional(OnCompletionEnum),
	depends_on: Type.Optional(
		Type.Array(Type.String(), {
			description: "New full dependency list (replaces existing)",
		}),
	),
});

const TaskMoveParams = Type.Object({
	task_id: Type.String({ description: "ID of the task to move" }),
	under_id: Type.Optional(
		Type.String({
			description: "Make this task a child of the target (last child)",
		}),
	),
	before_id: Type.Optional(
		Type.String({ description: "Place before this task (same level)" }),
	),
	after_id: Type.Optional(
		Type.String({
			description: "Place after this task (same level)",
		}),
	),
});

const TaskGetParams = Type.Object({
	task_id: Type.String({ description: "ID of the task to fetch" }),
});

const TaskListParams = Type.Object({
	parent_id: Type.Optional(
		Type.String({ description: "Only tasks under this parent" }),
	),
	status: Type.Optional(StatusEnum),
	priority: Type.Optional(PriorityEnum),
	include_subtasks: Type.Optional(
		Type.Boolean({
			description: "With parent_id: include the whole subtree",
		}),
	),
});

const TaskSaveParams = Type.Object({});
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
			"Open a TODO.md task file in a workspace directory. Call once before other task tools.",
		parameters: TaskOpenParams,
	},
	{
		name: "task_add",
		label: "Task Add",
		description:
			"Add a task. Hierarchy: parent_id (last child), before_id/after_id (sibling placement). Returns the new 6-char task ID. Use spec:true to create a note file (task-<id>.md) for detailed findings.",
		parameters: TaskAddParams,
	},
	{
		name: "task_edit",
		label: "Task Edit",
		description:
			"Edit fields of an existing task. Only provided fields change. Status 'x' stamps date_done, '-' stamps date_cancelled. Note files (task-<id>.md) are NOT managed here — edit them directly with the write tool.",
		parameters: TaskEditParams,
	},
	{
		name: "task_move",
		label: "Task Move",
		description:
			"Move a task (with its subtree) under/before/after another task. Omit all destinations to delete the task and its subtree.",
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
			"List tasks, optionally filtered by parent, status, or priority. include_subtasks=true returns the whole subtree under parent_id.",
		parameters: TaskListParams,
	},
	{
		name: "task_save",
		label: "Task Save",
		description:
			"Force a save of the task file to disk (changes are also auto-saved after each mutation).",
		parameters: TaskSaveParams,
	},
	{
		name: "task_close",
		label: "Task Close",
		description: "Save and close the current task file.",
		parameters: TaskCloseParams,
	},
];
