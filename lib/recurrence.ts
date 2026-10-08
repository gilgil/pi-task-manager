/**
 * Recurrence rules and the date arithmetic they imply.
 *
 * Accepted forms: `daily`, `weekly`, `monthly`, `yearly`,
 * `every N day|week|month|year(s)`, optionally `... on <Weekday>`.
 * Dates are handled as UTC calendar days so DST never shifts an interval.
 */

export type Unit = "day" | "week" | "month" | "year";
export type Rule = { n: number; unit: Unit; weekday?: number };

const DAY_MS = 86400000;
const BARE: Record<string, Unit> = {
	daily: "day",
	weekly: "week",
	monthly: "month",
	yearly: "year",
};
const WEEKDAYS = [
	"sunday",
	"monday",
	"tuesday",
	"wednesday",
	"thursday",
	"friday",
	"saturday",
];

export function parseRecurrence(rec: string): Rule | null {
	const s = rec.trim().toLowerCase().replace(/\s+/g, " ");
	if (!s) return null;

	// `on <Weekday>` is a suffix on any form: `weekly on Monday`,
	// `every 2 weeks on Monday`.
	let body = s;
	let weekday: number | undefined;
	const on = /\s+on\s+([a-z]+)$/.exec(s);
	if (on) {
		const w = WEEKDAYS.indexOf(on[1]);
		if (w < 0) return null;
		weekday = w;
		body = s.slice(0, on.index).trim();
	}

	if (BARE[body])
		return weekday === undefined
			? { n: 1, unit: BARE[body] }
			: { n: 1, unit: BARE[body], weekday };

	const m = /^(?:every\s+)?(\d+)\s+(day|days|week|weeks|month|months|year|years)$/.exec(
		body,
	);
	if (!m) return null;

	const rule: Rule = {
		n: Math.max(1, parseInt(m[1], 10)),
		unit: m[2].replace(/s$/, "") as Unit,
	};
	if (weekday !== undefined) rule.weekday = weekday;
	return rule;
}

/** The first date strictly after `base` (YYYY-MM-DD) that the rule allows. */
export function nextDate(base: string, rule: Rule): string {
	const d = new Date(`${base}T00:00:00Z`);

	if (rule.unit === "month" || rule.unit === "year") {
		const months = rule.unit === "month" ? rule.n : rule.n * 12;
		const day = d.getUTCDate();
		const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
		const lastDay = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
		t.setUTCDate(Math.min(day, lastDay));
		return anchor(t, rule, d);
	}

	const days = rule.unit === "day" ? rule.n : rule.n * 7;
	return anchor(new Date(d.getTime() + days * DAY_MS), rule, d);
}

/** Optional `on <Weekday>`: the nearest such day to the interval point, never
 *  landing on or before the date we are recursing from. */
function anchor(d: Date, rule: Rule, base: Date): string {
	if (rule.weekday !== undefined) {
		const back = (d.getUTCDay() - rule.weekday + 7) % 7;
		const fwd = (rule.weekday - d.getUTCDay() + 7) % 7;
		const earlier = new Date(d.getTime() - back * DAY_MS);
		if (earlier.getTime() > base.getTime()) d = earlier;
		else d = new Date(d.getTime() + fwd * DAY_MS);
	}
	return d.toISOString().slice(0, 10);
}
