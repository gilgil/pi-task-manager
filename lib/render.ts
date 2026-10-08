/**
 * Model-facing rendering of tool results.
 *
 * Tool results stay in the transcript for the rest of the session, so they are
 * rendered compactly. Measured on a real 53-task TODO.md (live model, prompt
 * tokens): task_list as pretty-printed JSON = 6957 tokens; as tree lines =
 * 1980. task_get as pretty JSON = 128 tokens; lean JSON = 73.
 *
 * The full structured result is still returned separately in `details` for UI
 * and programmatic consumers.
 */

export type Result = Record<string, unknown>;

function taskLine(t: Record<string, any>): string {
	const pr = t.priority && t.priority !== "null" ? ` (${t.priority})` : "";
	const due = t.date_due ? ` due ${t.date_due}` : "";
	return `${"  ".repeat(t.depth)}- [${t.status}] ${t.description} (${t.id})${pr}${due}`;
}

/** Absence means "not set": drop nulls, empty lists, and false, recursively. */
export function lean(v: unknown): unknown {
	if (Array.isArray(v)) return v.map(lean);
	if (v && typeof v === "object")
		return Object.fromEntries(
			Object.entries(v)
				.filter(
					([, x]) => x !== null && x !== false && !(Array.isArray(x) && x.length === 0),
				)
				.map(([k, x]) => [k, lean(x)]),
		);
	return v;
}

export function format(result: Result): string {
	if (result.status === "error") return `Error: ${result.error}`;
	if (Array.isArray(result.tasks)) {
		const n = (result.count as number) ?? result.tasks.length;
		if (!result.tasks.length) return `${n} tasks`;
		return `${n} task${n === 1 ? "" : "s"}\n` + result.tasks.map(taskLine).join("\n");
	}
	return JSON.stringify(lean(result));
}
