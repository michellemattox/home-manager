/**
 * Growth math for the foster weigh-in log.
 *
 * Deliberately separate from puppyPredict: weight does NOT feed the potty
 * projections (bladder capacity there stays age-based). This module is purely
 * descriptive — it reports what the scale said and how fast that changed. It
 * makes no claim about whether a weight is healthy for a given breed or age;
 * that's a vet's call, not the app's.
 *
 * Both the report screen and the printed report card read from here so the two
 * can never disagree.
 */
import type { FosterWeightLog, FosterPuppy } from "@/types/app.types";

/** Whole days between two YYYY-MM-DD calendar dates (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round(
    (Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000
  );
}

/** "4.4 lbs" / "0.75 lb" — trims trailing zeros so whole pounds read cleanly. */
export function formatLbs(lbs: number): string {
  const n = Math.round(lbs * 100) / 100;
  // toFixed(2) then strip trailing zeros — avoids 4.4 * 10 % 1 float noise.
  const s = n.toFixed(2).replace(/\.?0+$/, "");
  return `${s} ${Math.abs(n) === 1 ? "lb" : "lbs"}`;
}

/** "+0.4 lbs" / "−0.2 lbs" / "no change". Uses a real minus sign for display. */
export function formatDelta(lbs: number): string {
  if (Math.abs(lbs) < 0.005) return "no change";
  return `${lbs > 0 ? "+" : "−"}${formatLbs(Math.abs(lbs))}`;
}

export interface WeightChange {
  /** Signed pounds gained since the previous weigh-in. */
  deltaLbs: number;
  /** Days elapsed since the previous weigh-in (0 if same date). */
  days: number;
  /** true when the puppy lost weight or held completely flat between weigh-ins. */
  flagged: boolean;
}

export interface GrowthSummary {
  /** Newest weigh-in, or null when nothing is logged. */
  latest: FosterWeightLog | null;
  /** Oldest weigh-in — the baseline the "since arrival" figures measure from. */
  first: FosterWeightLog | null;
  /** Signed pounds between first and latest. null with fewer than 2 weigh-ins. */
  totalGainLbs: number | null;
  /** Days between the first and latest weigh-in. */
  spanDays: number;
  /** Average pounds per week across the span. null if the span is under a day. */
  perWeekLbs: number | null;
  /** Change from the weigh-in before the latest one. null if only one exists. */
  sinceLast: WeightChange | null;
  /** Change against the immediately older entry, keyed by weigh-in id. */
  changes: Record<string, WeightChange>;
  /** Weigh-ins newest first (the order they're rendered in). */
  entries: FosterWeightLog[];
}

/**
 * Sort newest first, tie-breaking same-date entries by created_at, matching the
 * DB index and the query's ordering.
 */
function sortNewestFirst(logs: FosterWeightLog[]): FosterWeightLog[] {
  return [...logs].sort((a, b) => {
    if (a.weighed_on !== b.weighed_on) return a.weighed_on < b.weighed_on ? 1 : -1;
    return a.created_at < b.created_at ? 1 : -1;
  });
}

export function summarizeGrowth(logs: FosterWeightLog[]): GrowthSummary {
  const entries = sortNewestFirst(logs);
  const latest = entries[0] ?? null;
  const first = entries.length ? entries[entries.length - 1] : null;

  // Each entry compared against the next-older one (entries are newest first,
  // so the older neighbour is at i + 1).
  const changes: Record<string, WeightChange> = {};
  for (let i = 0; i < entries.length - 1; i++) {
    const cur = entries[i];
    const prev = entries[i + 1];
    const deltaLbs = cur.weight_lbs - prev.weight_lbs;
    changes[cur.id] = {
      deltaLbs,
      days: daysBetween(prev.weighed_on, cur.weighed_on),
      // A drop is worth surfacing; so is a dead-flat reading, which on a growing
      // puppy usually means a missed meal week or a scale problem.
      flagged: deltaLbs <= 0,
    };
  }

  const hasTwo = !!latest && !!first && latest.id !== first.id;
  const totalGainLbs = hasTwo ? latest!.weight_lbs - first!.weight_lbs : null;
  const spanDays = hasTwo ? daysBetween(first!.weighed_on, latest!.weighed_on) : 0;

  return {
    latest,
    first,
    totalGainLbs,
    spanDays,
    // Under a day of span can't support a rate — two weigh-ins on the same day
    // would otherwise divide by zero and report an absurd lbs/week.
    perWeekLbs: totalGainLbs != null && spanDays >= 1 ? (totalGainLbs / spanDays) * 7 : null,
    sinceLast: latest ? (changes[latest.id] ?? null) : null,
    changes,
    entries,
  };
}

/**
 * One plain-language line for the profile card and the report header.
 * Never diagnostic — it states the number and, when weight went down or stayed
 * flat, says so plainly and suggests the vet as the next step.
 */
export function growthHeadline(g: GrowthSummary, puppy: FosterPuppy): string {
  if (!g.latest) return "No weigh-ins logged yet.";
  const cur = formatLbs(g.latest.weight_lbs);
  if (g.totalGainLbs == null) {
    return `${cur} — first weigh-in. Log another to see the trend.`;
  }
  const rate = g.perWeekLbs != null ? `, about ${formatDelta(g.perWeekLbs)}/week` : "";
  if (g.sinceLast?.flagged) {
    const what =
      g.sinceLast.deltaLbs < 0
        ? `down ${formatLbs(Math.abs(g.sinceLast.deltaLbs))}`
        : "flat";
    return `${cur} — ${what} since the last weigh-in. Worth mentioning to the vet if it continues.`;
  }
  // Two weigh-ins on the same day have no span to report a rate over.
  if (g.spanDays === 0) {
    return `${cur} — ${formatDelta(g.totalGainLbs)} from an earlier weigh-in the same day.`;
  }
  return `${cur} — ${formatDelta(g.totalGainLbs)} over ${g.spanDays} day${
    g.spanDays === 1 ? "" : "s"
  }${rate}.`;
}

/** "9/8" style short date from a YYYY-MM-DD calendar date, no timezone shift. */
export function shortDate(day: string): string {
  const [, m, d] = day.split("-");
  return `${Number(m)}/${Number(d)}`;
}
