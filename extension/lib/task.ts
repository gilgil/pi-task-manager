/**
 * Task model — a tree node. The tree (parent/children links) is the
 * single source of truth for hierarchy; depth, position, parent_id, and
 * children_ids are all derived from it.
 */

export interface Task {
	id: string;
	description: string;
	/** ' ' = open, 'x' = done, '>' = in progress, '!' = failed, '-' = cancelled */
	status: string;
	/** lowest | low | normal | medium | high | highest */
	priority: string | null;
	dateCreated: string | null;
	dateModified: string | null;
	dateScheduled: string | null;
	dateStart: string | null;
	dateDue: string | null;
	dateDone: string | null;
	dateCancelled: string | null;
	recurrence: string | null;
	/** keep | delete (null = keep, the default) */
	onCompletion: string | null;
	dependsOn: string[];
	hasSpec: boolean;
	parent: Task | null;
	children: Task[];
}

export function newTask(id: string, description: string): Task {
	return {
		id,
		description,
		status: " ",
		priority: null,
		dateCreated: null,
		dateModified: null,
		dateScheduled: null,
		dateStart: null,
		dateDue: null,
		dateDone: null,
		dateCancelled: null,
		recurrence: null,
		onCompletion: null,
		dependsOn: [],
		hasSpec: false,
		parent: null,
		children: [],
	};
}

/** Depth of a task (0 = top level). */
export function depthOf(task: Task): number {
	let depth = 0;
	for (let p = task.parent; p; p = p.parent) depth++;
	return depth;
}
