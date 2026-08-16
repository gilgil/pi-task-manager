/**
 * TODO.md parser and serializer — ported from task_manager.py.
 *
 * Line format:
 *   - [x] Description (ID: `abc123`)
 *   - [ ] Setup ⏳ 2026-01-15 📅 2026-01-20 🔁 weekly (ID: `abc456`)
 *
 * 2 spaces of indent per hierarchy level. Annotations are inline emoji.
 */

import { newTask, type Task } from "./task.ts";

export const MAX_DEPTH = 8;
export const TODO_FILENAME = "TODO.md";

export const BASE62_CHARS =
	"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Priority emoji mapping (normal = no emoji, stored as null) */
export const PRIORITY_EMOJI: Record<string, string> = {
	lowest: "⏬",
	low: "🔽",
	medium: "🔼",
	high: "⏫",
	highest: "🔺",
};

export const PRIORITY_FROM_EMOJI: Record<string, string> = Object.fromEntries(
	Object.entries(PRIORITY_EMOJI).map(([k, v]) => [v, k]),
);

/** Date emoji mapping */
export const DATE_EMOJI: Record<string, string> = {
	scheduled: "⏳",
	start: "🛫",
	due: "📅",
	done: "✅",
	cancelled: "❌",
	created: "➕",
	modified: "🖊️",
};

type DateKey =
	| "scheduled"
	| "start"
	| "due"
	| "done"
	| "cancelled"
	| "created"
	| "modified";

export const DATE_FROM_EMOJI: Record<string, DateKey> = Object.fromEntries(
	Object.entries(DATE_EMOJI).map(([k, v]) => [v, k] as [string, DateKey]),
);

/** Status characters: ' '=open, 'x'=done, '>'=in-progress, '!'=failed, '-'=cancelled */
export const STATUS_CHARS = [" ", "x", ">", "!", "-"];

/**
 * All emojis the parser treats as annotations. Descriptions must not
 * contain them, or they get stripped/misparsed on reload.
 */
export const ANNOTATION_EMOJIS: string[] = [
	...Object.values(PRIORITY_EMOJI),
	...Object.values(DATE_EMOJI),
	"🔁",
	"🗑️",
	"🏁",
	"⛔",
	"📎",
	"🆔",
];

/** Returns the first annotation emoji found in text, or null. */
export function findAnnotationEmoji(text: string): string | null {
	for (const e of ANNOTATION_EMOJIS) if (text.includes(e)) return e;
	return null;
}

const TASK_LINE_RE = /^( *)-\s+\[([ x>!-])\]\s+(.*?)\s*$/;
const ID_RE = /\(ID:\s*`([A-Za-z0-9]{6})`\)\s*$/;
const SPEC_RE = /📎\s*\[spec\]\(task-[A-Za-z0-9]+\.md\)\s*/;
const DEPS_RE = /⛔\s*([A-Za-z0-9]+(?:,[A-Za-z0-9]+)*)\s*/;
const RECUR_BEFORE_RE =
	/🔁\s+(.+?)(?=\s+(?:⏬|🔽|🔼|⏫|🔺|⏳|🛫|📅|✅|❌|➕|🖊️|🗑️|🏁|⛔|📎|🆔))/;
const RECUR_END_RE = /🔁\s+(.+?)(?=\s+$)/;
const ID_REF_RE = /🆔\s*([A-Za-z0-9]+)\s*/;

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type Annotations = {
	priority?: string;
	scheduled?: string;
	start?: string;
	due?: string;
	done?: string;
	cancelled?: string;
	created?: string;
	modified?: string;
	recurrence?: string;
	on_completion?: string;
	depends_on?: string[];
	spec?: boolean;
};

/** Parse emoji annotations from the end of a task line. */
export function parseAnnotations(text: string): [Annotations, string] {
	const annotations: Annotations = {};
	let remaining = text;

	// 📎 spec link
	const specMatch = remaining.match(SPEC_RE);
	if (specMatch) {
		annotations.spec = true;
		remaining =
			remaining.slice(0, specMatch.index) +
			remaining.slice((specMatch.index ?? 0) + specMatch[0].length);
	}

	// ⛔ depends_on
	const depMatch = remaining.match(DEPS_RE);
	if (depMatch) {
		annotations.depends_on = depMatch[1].split(",");
		remaining =
			remaining.slice(0, depMatch.index) +
			remaining.slice((depMatch.index ?? 0) + depMatch[0].length);
	}

	// 🗑️ / 🏁 on_completion
	if (remaining.includes("🗑️")) {
		annotations.on_completion = "delete";
		remaining = remaining.replace("🗑️", "").trim();
	}
	if (remaining.includes("🏁")) {
		annotations.on_completion = "keep";
		remaining = remaining.replace("🏁", "").trim();
	}

	// 🔁 recurrence (rule extends to the next emoji or end of text)
	let recurMatch = remaining.match(RECUR_BEFORE_RE);
	if (!recurMatch) recurMatch = remaining.match(RECUR_END_RE);
	if (recurMatch) {
		annotations.recurrence = recurMatch[1].trim();
		remaining =
			remaining.slice(0, recurMatch.index) +
			remaining.slice((recurMatch.index ?? 0) + recurMatch[0].length);
	}

	// Date emojis followed by YYYY-MM-DD (in DATE_EMOJI order)
	for (const [emoji, key] of Object.entries(DATE_FROM_EMOJI)) {
		const re = new RegExp(`${escapeRegExp(emoji)}\\s*(\\d{4}-\\d{2}-\\d{2})\\s*`);
		const m = remaining.match(re);
		if (m) {
			annotations[key] = m[1];
			remaining =
				remaining.slice(0, m.index) +
				remaining.slice((m.index ?? 0) + m[0].length);
		}
	}

	// Priority emojis
	for (const [emoji, priority] of Object.entries(PRIORITY_FROM_EMOJI)) {
		if (remaining.includes(emoji)) {
			annotations.priority = priority;
			remaining = remaining.replace(emoji, "").trim();
		}
	}

	// 🆔 self-reference (informational only)
	const idRef = remaining.match(ID_REF_RE);
	if (idRef) {
		remaining =
			remaining.slice(0, idRef.index) +
			remaining.slice((idRef.index ?? 0) + idRef[0].length);
	}

	return [annotations, remaining.trim()];
}

/** Parse a single task line. Returns null if the line is not a valid task. */
export function parseTaskLine(line: string): Task | null {
	const m = line.match(TASK_LINE_RE);
	if (!m) return null;

	const status = m[2];
	let rest = m[3];

	const idMatch = rest.match(ID_RE);
	if (!idMatch) return null;
	const id = idMatch[1];
	rest = rest.slice(0, idMatch.index).trim();

	const [annotations, description] = parseAnnotations(rest);

	const task = newTask(id, description);
	task.status = status;
	if (annotations.priority) task.priority = annotations.priority;
	if (annotations.scheduled) task.dateScheduled = annotations.scheduled;
	if (annotations.start) task.dateStart = annotations.start;
	if (annotations.due) task.dateDue = annotations.due;
	if (annotations.done) task.dateDone = annotations.done;
	if (annotations.cancelled) task.dateCancelled = annotations.cancelled;
	if (annotations.created) task.dateCreated = annotations.created;
	if (annotations.modified) task.dateModified = annotations.modified;
	if (annotations.recurrence) task.recurrence = annotations.recurrence;
	if (annotations.on_completion) task.onCompletion = annotations.on_completion;
	if (annotations.depends_on) task.dependsOn = annotations.depends_on;
	if (annotations.spec) task.hasSpec = true;

	return task;
}

/**
 * Parse entire TODO.md content into a tree of tasks (returns the roots).
 * Hierarchy comes from indentation: each task is appended as a child of
 * the most recent task at one shallower depth.
 */
export function parseTodoFile(content: string): Task[] {
	const roots: Task[] = [];
	const stack: (Task | null)[] = []; // stack[d] = most recent task at depth d

	for (const line of content.split("\n")) {
		const stripped = line.trim();
		if (!stripped || stripped.startsWith("#") || !stripped.startsWith("-"))
			continue;

		const match = line.match(/^( *)-\s+\[/);
		if (!match) continue;

		const depth = Math.floor(match[1].length / 2);
		if (depth > MAX_DEPTH) continue;

		const task = parseTaskLine(line);
		if (!task) continue;

		const parent = depth === 0 ? null : stack[depth - 1] ?? null;
		task.parent = parent;
		(parent ? parent.children : roots).push(task);
		stack[depth] = task;
		stack.length = depth + 1;
	}

	return roots;
}

export type OrphanLine = { line: number; id: string; depth: number };

/**
 * Find task lines whose indentation has no ancestor at the expected level
 * (e.g. a manual edit deleted an intermediate line). A line at depth d is
 * orphaned when no task at depth d-1 has been seen since the last shallower
 * line. Returns 1-based line numbers and task IDs for each orphan.
 */
export function findOrphanLines(content: string): OrphanLine[] {
	const orphans: OrphanLine[] = [];
	const stack: (Task | null)[] = [];

	content.split("\n").forEach((line, i) => {
		const stripped = line.trim();
		if (!stripped || stripped.startsWith("#") || !stripped.startsWith("-"))
			return;
		const match = line.match(/^( *)-\s+\[/);
		if (!match) return;
		const depth = Math.floor(match[1].length / 2);
		if (depth > MAX_DEPTH) return;
		const task = parseTaskLine(line);
		if (!task) return;
		if (depth > 0 && !stack[depth - 1]) {
			orphans.push({ line: i + 1, id: task.id, depth });
		}
		stack[depth] = task;
		stack.length = depth + 1;
	});

	return orphans;
}

/** Serialize a task back to a markdown line (conventional annotation order). */
export function buildTaskLine(task: Task, depth: number = 0): string {
	const indent = "  ".repeat(depth);
	const annotations: string[] = [];

	if (task.priority && task.priority in PRIORITY_EMOJI)
		annotations.push(PRIORITY_EMOJI[task.priority]);
	if (task.dateScheduled) annotations.push(`⏳ ${task.dateScheduled}`);
	if (task.dateStart) annotations.push(`🛫 ${task.dateStart}`);
	if (task.dateDue) annotations.push(`📅 ${task.dateDue}`);
	if (task.dateDone) annotations.push(`✅ ${task.dateDone}`);
	if (task.dateCancelled) annotations.push(`❌ ${task.dateCancelled}`);
	if (task.recurrence) annotations.push(`🔁 ${task.recurrence}`);
	if (task.onCompletion === "delete") annotations.push("🗑️");
	else if (task.onCompletion === "keep") annotations.push("🏁");
	if (task.dependsOn.length > 0)
		annotations.push(`⛔ ${task.dependsOn.join(",")}`);
	if (task.hasSpec) annotations.push(`📎 [spec](task-${task.id}.md)`);
	if (task.dateCreated) annotations.push(`➕ ${task.dateCreated}`);
	if (task.dateModified) annotations.push(`🖊️ ${task.dateModified}`);

	const annotationStr = annotations.join(" ");
	if (annotationStr)
		return `${indent}- [${task.status}] ${task.description} ${annotationStr} (ID: \`${task.id}\`)`;
	return `${indent}- [${task.status}] ${task.description} (ID: \`${task.id}\`)`;
}

/** Convert a task tree to TODO.md markdown content (recursive DFS). */
export function tasksToMarkdown(roots: Task[]): string {
	const lines: string[] = ["# TODO", ""];
	const walk = (tasks: Task[], depth: number): void => {
		for (const task of tasks) {
			lines.push(buildTaskLine(task, depth));
			walk(task.children, depth + 1);
		}
	};
	walk(roots, 0);
	lines.push("");
	return lines.join("\n");
}
