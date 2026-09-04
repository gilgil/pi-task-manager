/**
 * TaskManager — hierarchical TODO.md manager.
 *
 * The in-memory data structure is a tree of Task nodes (roots + parent/
 * children links). Serialization is a recursive DFS; de-serialization is
 * a series of appends (see parseTodoFile). depth, position, parent_id,
 * and children_ids are always derived, never stored.
 *
 * Every mutation auto-saves (temp file + rename, with .bak backup);
 * save() is a deterministic checkpoint.
 */

import fs from "node:fs";
import path from "node:path";
import { randomInt } from "node:crypto";
import {
	MAX_DEPTH,
	TODO_FILENAME,
	BASE62_CHARS,
	PRIORITY_EMOJI,
	STATUS_CHARS,
	findAnnotationEmoji,
	findTodoIssues,
	parseTodoFile,
	tasksToMarkdown,
	type TodoIssue,
} from "./parser.ts";
import { depthOf, newTask, type Task } from "./task.ts";

export type Result = Record<string, unknown>;

/** null/undefined tool args mean "not provided". */
const provided = (v: unknown): boolean => v !== undefined && v !== null;

/** Dates must be YYYY-MM-DD to round-trip through the parser. */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Human-readable description of a structural problem found in TODO.md. */
function describeIssue(issue: TodoIssue): string {
	switch (issue.kind) {
		case "orphan":
			return `orphan line ${issue.line} (${issue.id}) — no ancestor at its indent level`;
		case "tab":
			return `tab indentation on line ${issue.line} (${issue.id})`;
		case "duplicate":
			return `duplicate ID ${issue.id} (lines ${issue.firstLine}, ${issue.line})`;
	}
}

export class TaskManager {
	private roots: Task[] = [];
	private taskMap = new Map<string, Task>();
	private path: string | null = null;
	private dirty = false;

	get isOpen(): boolean {
		return this.path !== null;
	}

	get filePath(): string | null {
		return this.path;
	}

	// ─── internal helpers ──────────────────────────────────────────────

	private rebuildMap(): void {
		this.taskMap = new Map();
		const walk = (tasks: Task[]): void => {
			for (const t of tasks) {
				this.taskMap.set(t.id, t);
				walk(t.children);
			}
		};
		walk(this.roots);
	}

	private today(): string {
		return new Date().toISOString().slice(0, 10);
	}

	private findTask(taskId: string): Task {
		const task = this.taskMap.get(taskId);
		if (!task) throw new Error(`Task not found: ${taskId}`);
		return task;
	}

	private positionOf(task: Task): number {
		return task.parent
			? task.parent.children.indexOf(task)
			: this.roots.indexOf(task);
	}

	private getDescendants(task: Task): Task[] {
		const result: Task[] = [];
		for (const child of task.children)
			result.push(child, ...this.getDescendants(child));
		return result;
	}

	private taskCount(): number {
		let count = 0;
		const visit = (tasks: Task[]): void => {
			for (const t of tasks) {
				count++;
				visit(t.children);
			}
		};
		visit(this.roots);
		return count;
	}

	/** True if taskId is the task itself or inside its subtree. */
	private isSelfOrDescendant(taskId: string, otherId: string): boolean {
		let current: Task | null | undefined = this.taskMap.get(otherId);
		while (current) {
			if (current.id === taskId) return true;
			current = current.parent;
		}
		return false;
	}

	/** Check if adding newDeps to taskId would create a circular dependency. */
	private wouldCreateCycle(taskId: string, newDeps: string[]): boolean {
		const visited = new Set<string>();
		const stack = [...newDeps];
		while (stack.length > 0) {
			const current = stack.pop()!;
			if (current === taskId) return true;
			if (visited.has(current)) continue;
			visited.add(current);
			const depTask = this.taskMap.get(current);
			if (depTask) stack.push(...depTask.dependsOn);
		}
		return false;
	}

	private generateId(): string {
		while (true) {
			let id = "";
			for (let i = 0; i < 6; i++) id += BASE62_CHARS[randomInt(62)];
			if (!this.taskMap.has(id)) return id;
		}
	}

	/** Atomic save: temp file + backup + rename. Returns error message on failure. */
	private saveToDisk(): string | null {
		if (!this.path) return null;
		try {
			const content = tasksToMarkdown(this.roots);
			const dir = path.dirname(this.path);
			const tmp = path.join(
				dir,
				`.${path.basename(this.path)}.${process.pid}.tmp`,
			);
			fs.writeFileSync(tmp, content, "utf-8");
			if (fs.existsSync(this.path)) {
				fs.copyFileSync(this.path, this.path + ".bak");
			}
			fs.renameSync(tmp, this.path);
			this.dirty = false;
			return null;
		} catch (e) {
			return (e as Error).message;
		}
	}

	/** Mutate state, then save. Returns save error message, or null. */
	private commit(): string | null {
		this.rebuildMap();
		this.dirty = true;
		return this.saveToDisk();
	}

	private taskToDict(task: Task): Record<string, unknown> {
		return {
			id: task.id,
			description: task.description,
			status: task.status,
			depth: depthOf(task),
			position: this.positionOf(task),
			parent_id: task.parent?.id ?? null,
			children_ids: task.children.map((c) => c.id),
			date_created: task.dateCreated,
			date_modified: task.dateModified,
			priority: task.priority,
			date_scheduled: task.dateScheduled,
			date_start: task.dateStart,
			date_due: task.dateDue,
			date_done: task.dateDone,
			date_cancelled: task.dateCancelled,
			recurrence: task.recurrence,
			on_completion: task.onCompletion,
			depends_on: [...task.dependsOn],
			has_spec: task.hasSpec,
		};
	}

	private taskSummary(task: Task): Record<string, unknown> {
		return {
			id: task.id,
			description: task.description,
			status: task.status,
			depth: depthOf(task),
			position: this.positionOf(task),
			priority: task.priority,
			date_due: task.dateDue,
			date_scheduled: task.dateScheduled,
			date_done: task.dateDone,
			parent_id: task.parent?.id ?? null,
			children_count: task.children.length,
		};
	}

	/**
	 * Resolve the parent task and the sibling reference (before/after) for
	 * an insertion. The index itself is computed at the call site against
	 * the current children array (so moves can detach first).
	 */
	private resolveInsertion(
		parentId?: string | null,
		beforeId?: string | null,
		afterId?: string | null,
	): {
		status: "error";
		error: string;
	} | { status: "ok"; parent: Task | null; ref: Task | null; before: boolean } {
		let parent: Task | null = null;
		if (parentId) {
			if (!this.taskMap.has(parentId))
				return {
					status: "error",
					error: `Parent task not found: ${parentId}`,
				};
			parent = this.taskMap.get(parentId)!;
		}

		const refId = beforeId ?? afterId ?? null;
		let ref: Task | null = null;
		if (refId) {
			const label = beforeId ? "before_id" : "after_id";
			if (!this.taskMap.has(refId))
				return { status: "error", error: `${label} task not found: ${refId}` };
			ref = this.taskMap.get(refId)!;
			if (ref.parent !== parent)
				return {
					status: "error",
					error: `${label} must be a sibling of the new task (child of ${
						parentId ?? "top level"
					}).`,
				};
		}

		return { status: "ok", parent, ref, before: !!beforeId };
	}

	private insertIndex(
		parent: Task | null,
		ref: Task | null,
		before: boolean,
	): number {
		const siblings = parent ? parent.children : this.roots;
		return ref ? siblings.indexOf(ref) + (before ? 0 : 1) : siblings.length;
	}

	// ─── public API ────────────────────────────────────────────────────

	/** Open a TODO.md file in a workspace directory. */
	openFile(workspacePath: string): Result {
		const workspace = path.resolve(workspacePath);
		const todoPath = path.join(workspace, TODO_FILENAME);

		let content: string;
		try {
			if (fs.existsSync(todoPath)) {
				content = fs.readFileSync(todoPath, "utf-8");
			} else {
				fs.writeFileSync(todoPath, "# TODO\n\n", "utf-8");
				content = "# TODO\n\n";
			}
		} catch (e) {
			return {
				status: "error",
				error: `Cannot open ${todoPath}: ${(e as Error).message}`,
			};
		}

		const issues = findTodoIssues(content);
		if (issues.length > 0)
			return {
				status: "error",
				error: `TODO.md has structural problems: ${issues
					.map(describeIssue)
					.join(", ")}. Fix the file and reopen.`,
			};

		this.path = todoPath;
		this.roots = parseTodoFile(content);
		this.rebuildMap();
		this.dirty = false;

		return { status: "ok", path: todoPath, task_count: this.taskCount() };
	}

	closeFile(): Result {
		if (!this.isOpen) return { status: "error", error: "No file open" };
		if (this.dirty) {
			const err = this.saveToDisk();
			if (err)
				return {
					status: "error",
					error: `Close failed, file left open (save error): ${err}`,
				};
			}
		this.path = null;
		this.roots = [];
		this.taskMap = new Map();
		this.dirty = false;
		return { status: "ok", message: "File closed." };
	}

	addTask(
		description: string,
		parentId?: string | null,
		beforeId?: string | null,
		afterId?: string | null,
		priority?: string | null,
		scheduled?: string | null,
		start?: string | null,
		due?: string | null,
		recurrence?: string | null,
		onCompletion?: string | null,
		dependsOn?: string[] | null,
		spec = false,
	): Result {
		if (!this.isOpen)
			return { status: "error", error: "No file open. Call open_file first." };
		if (!description || !description.trim())
			return { status: "error", error: "Description cannot be empty." };

		const desc = description.trim();

		if (desc.includes("\n") || desc.includes("\r"))
			return {
				status: "error",
				error: "Description cannot contain newlines.",
			};

		const badEmoji = findAnnotationEmoji(desc);
		if (badEmoji)
			return {
				status: "error",
				error: `Description contains annotation emoji ${badEmoji}, which is reserved for task metadata.`,
			};

		for (const [label, value] of [
			["scheduled", scheduled],
			["start", start],
			["due", due],
		] as const) {
			if (value !== undefined && value !== null && !DATE_RE.test(value))
				return {
					status: "error",
					error: `Invalid ${label} date: ${value}. Use YYYY-MM-DD.`,
				};
		}

		let prio: string | null = null;
		if (priority && priority !== "normal" && priority !== "null") {
			if (!(priority in PRIORITY_EMOJI))
				return { status: "error", error: `Invalid priority: ${priority}` };
			prio = priority;
		}

		if (dependsOn) {
			for (const depId of dependsOn) {
				if (!this.taskMap.has(depId))
					return {
						status: "error",
						error: `Dependency task not found: ${depId}`,
					};
			}
		}

		const resolved = this.resolveInsertion(parentId, beforeId, afterId);
		if (resolved.status === "error") return resolved;
		const { parent, ref, before } = resolved;

		const newDepth = parent ? depthOf(parent) + 1 : 0;
		if (newDepth > MAX_DEPTH)
			return {
				status: "error",
				error: `Adding as child would exceed max depth (${MAX_DEPTH}).`,
			};

		const today = this.today();
		const task = newTask(this.generateId(), desc);
		task.parent = parent;
		task.dateCreated = today;
		task.dateModified = today;
		task.priority = prio;
		task.dateScheduled = scheduled ?? null;
		task.dateStart = start ?? null;
		task.dateDue = due ?? null;
		task.recurrence = recurrence ?? null;
		task.onCompletion = onCompletion ?? null;
		task.dependsOn = dependsOn ? [...dependsOn] : [];
		task.hasSpec = !!spec;

		(parent ? parent.children : this.roots).splice(
			this.insertIndex(parent, ref, before),
			0,
			task,
		);

		if (spec && this.path) {
			const specPath = path.join(path.dirname(this.path), `task-${task.id}.md`);
			try {
				fs.writeFileSync(
					specPath,
					`# Task Specification: ${desc}\n\n**ID:** \`${task.id}\`\n\n## Description\n\n${desc}\n\n## Acceptance Criteria\n\n- [ ] \n\n## Notes\n\n`,
					"utf-8",
				);
			} catch {
				task.hasSpec = false;
			}
		}

		const saveError = this.commit();
		const result: Result = {
			status: "ok",
			task_id: task.id,
			description: task.description,
		};
		if (saveError) result.warning = `Task added but save failed: ${saveError}`;
		return result;
	}

	editTask(
		taskId: string,
		description?: string | null,
		status?: string | null,
		priority?: string | null,
		scheduled?: string | null,
		start?: string | null,
		due?: string | null,
		recurrence?: string | null,
		onCompletion?: string | null,
		dependsOn?: string[] | null,
	): Result {
		if (!this.isOpen) return { status: "error", error: "No file open." };

		let task: Task;
		try {
			task = this.findTask(taskId);
		} catch (e) {
			return { status: "error", error: (e as Error).message };
		}

		const changes: Record<string, unknown> = {};
		if (provided(description)) changes.description = description;
		if (provided(status)) changes.status = status;
		if (provided(priority)) changes.priority = priority;
		if (provided(scheduled)) changes.scheduled = scheduled;
		if (provided(start)) changes.start = start;
		if (provided(due)) changes.due = due;
		if (provided(recurrence)) changes.recurrence = recurrence;
		if (provided(onCompletion)) changes.on_completion = onCompletion;
		if (provided(dependsOn)) changes.depends_on = dependsOn;

		if (Object.keys(changes).length === 0)
			return { status: "error", error: "No fields to edit." };

		if ("description" in changes) {
			const d = changes.description as string;
			if (!d.trim())
				return { status: "error", error: "Description cannot be empty." };
			if (d.includes("\n") || d.includes("\r"))
				return { status: "error", error: "Description cannot contain newlines." };
			const badEmoji = findAnnotationEmoji(d.trim());
			if (badEmoji)
				return {
					status: "error",
					error: `Description contains annotation emoji ${badEmoji}, which is reserved for task metadata.`,
				};
			task.description = d.trim();
		}

		if ("status" in changes) {
			const newStatus = changes.status as string;
			if (!STATUS_CHARS.includes(newStatus))
				return {
					status: "error",
					error: `Invalid status: ${newStatus}. Must be one of: ${STATUS_CHARS.join(", ")}`,
				};
			task.status = newStatus;
			if (newStatus === "x" && !task.dateDone) task.dateDone = this.today();
			else if (newStatus !== "x") task.dateDone = null;
			if (newStatus === "-" && !task.dateCancelled)
				task.dateCancelled = this.today();
			else if (newStatus !== "-") task.dateCancelled = null;
		}

		if ("priority" in changes) {
			const p = changes.priority as string;
			if (p === "null" || p === "normal") task.priority = null;
			else if (p in PRIORITY_EMOJI) task.priority = p;
			else return { status: "error", error: `Invalid priority: ${p}` };
		}

		for (const key of ["scheduled", "start", "due"] as const) {
			if (key in changes) {
				const v = changes[key] as string;
				if (!DATE_RE.test(v))
					return {
						status: "error",
						error: `Invalid ${key} date: ${v}. Use YYYY-MM-DD.`,
					};
				if (key === "scheduled") task.dateScheduled = v;
				else if (key === "start") task.dateStart = v;
				else task.dateDue = v;
			}
		}
		if ("recurrence" in changes) task.recurrence = changes.recurrence as string;

		if ("on_completion" in changes) {
			const oc = changes.on_completion as string;
			if (oc === "null") task.onCompletion = null;
			else if (oc === "keep" || oc === "delete") task.onCompletion = oc;
			else return { status: "error", error: `Invalid on_completion: ${oc}` };
		}

		if ("depends_on" in changes) {
			const deps = changes.depends_on as string[];
			if (deps === null) {
				task.dependsOn = [];
			} else {
				for (const depId of deps) {
					if (!this.taskMap.has(depId))
						return {
							status: "error",
							error: `Dependency task not found: ${depId}`,
						};
				}
				if (this.wouldCreateCycle(taskId, deps))
					return {
						status: "error",
						error: "Circular dependency detected.",
					};
				task.dependsOn = [...deps];
			}
		}

		task.dateModified = this.today();
		const saveError = this.commit();
		const result: Result = { status: "ok", task: this.taskToDict(task) };
		if (saveError)
			result.warning = `Task updated but save failed: ${saveError}`;
		return result;
	}

	/** Move a task (with its subtree). No destination = delete. */
	moveTask(
		taskId: string,
		underId?: string | null,
		beforeId?: string | null,
		afterId?: string | null,
	): Result {
		if (!this.isOpen) return { status: "error", error: "No file open." };

		if (!underId && !beforeId && !afterId) return this.deleteTask(taskId);

		let task: Task;
		try {
			task = this.findTask(taskId);
		} catch (e) {
			return { status: "error", error: (e as Error).message };
		}

		for (const [label, destId] of [
			["under_id", underId],
			["before_id", beforeId],
			["after_id", afterId],
		] as const) {
			if (!destId) continue;
			if (!this.taskMap.has(destId))
				return { status: "error", error: `${label} task not found: ${destId}` };
			if (destId === taskId)
				return {
					status: "error",
					error: `Cannot move task ${label === "under_id" ? "under" : label.startsWith("before") ? "before" : "after"} itself.`,
				};
			if (this.isSelfOrDescendant(taskId, destId))
				return {
					status: "error",
					error: `Cannot move task ${label === "under_id" ? "under" : label.startsWith("before") ? "before" : "after"} its own descendant.`,
				};
		}

		const resolved = this.resolveInsertion(underId, beforeId, afterId);
		if (resolved.status === "error") return resolved;
		const { parent: newParent, ref, before } = resolved;

		const oldDepth = depthOf(task);
		const newDepth = newParent ? depthOf(newParent) + 1 : 0;
		const depthDiff = newDepth - oldDepth;
		for (const desc of this.getDescendants(task)) {
			if (depthOf(desc) + depthDiff > MAX_DEPTH)
				return {
					status: "error",
					error: `Moving task would exceed max depth (${MAX_DEPTH}).`,
				};
		}

		// Detach (subtree moves with the task), then re-attach.
		// The insertion index is computed after removal so positions are
		// correct when the task sits before its reference sibling.
		const oldSiblings = task.parent
			? task.parent.children
			: this.roots;
		oldSiblings.splice(oldSiblings.indexOf(task), 1);
		task.parent = newParent;
		(newParent ? newParent.children : this.roots).splice(
			this.insertIndex(newParent, ref, before),
			0,
			task,
		);

		const saveError = this.commit();
		const result: Result = {
			status: "ok",
			message: `Task ${taskId} moved.`,
			task_id: taskId,
			parent_id: task.parent?.id ?? null,
			depth: depthOf(task),
		};
		if (saveError) result.warning = `Task moved but save failed: ${saveError}`;
		return result;
	}

	getTask(taskId: string): Result {
		if (!this.isOpen) return { status: "error", error: "No file open." };
		try {
			return { status: "ok", task: this.taskToDict(this.findTask(taskId)) };
		} catch (e) {
			return { status: "error", error: (e as Error).message };
		}
	}

	listTasks(
		parentId?: string | null,
		status?: string | null,
		priority?: string | null,
		includeSubtasks = false,
	): Result {
		if (!this.isOpen) return { status: "error", error: "No file open." };

		let start: Task[] = this.roots;
		if (parentId) {
			const parent = this.taskMap.get(parentId);
			if (!parent) return { status: "ok", tasks: [], count: 0 };
			start = includeSubtasks ? [parent] : parent.children;
		}

		const results: Record<string, unknown>[] = [];
		const visit = (tasks: Task[]): void => {
			for (const task of tasks) {
				if (
					(!status || task.status === status) &&
					(!priority || task.priority === priority)
				)
					results.push(this.taskSummary(task));
				visit(task.children);
			}
		};
		visit(start);

		return { status: "ok", tasks: results, count: results.length };
	}

	save(): Result {
		if (!this.isOpen || !this.path)
			return { status: "error", error: "No file open." };
		const err = this.saveToDisk();
		if (err) return { status: "error", error: `Save failed: ${err}` };
		return {
			status: "ok",
			message: `Saved to ${this.path}`,
			task_count: this.taskCount(),
		};
	}

	// ─── move/delete helpers ───────────────────────────────────────────

	private deleteTask(taskId: string): Result {
		let task: Task;
		try {
			task = this.findTask(taskId);
		} catch (e) {
			return { status: "error", error: (e as Error).message };
		}

		const subCount = this.getDescendants(task).length;
		const siblings = task.parent ? task.parent.children : this.roots;
		siblings.splice(siblings.indexOf(task), 1);

		const saveError = this.commit();
		const result: Result = {
			status: "ok",
			message: `Deleted task ${taskId} and ${subCount} sub-task(s).`,
		};
		if (saveError) result.warning = `Task deleted but save failed: ${saveError}`;
		return result;
	}
}
