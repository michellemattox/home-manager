/**
 * Foster-puppy potty projections.
 *
 * Two things get predicted, from the same history:
 *   1. `predictNext`  — "likely #1 around 2:45pm" for the log dialog.
 *   2. `typicalDayWindows` — a typical-day timeline for the report.
 *
 * The model is deliberately simple and explainable: median gaps between events,
 * plus clustering of times-of-day, bounded by the age-based bladder rule. Every
 * prediction carries the basis it was derived from so the UI can say *why*.
 *
 * All day/time bucketing is Pacific Time, matching the rest of the app.
 */
import type { FosterPottyLog, FosterFeedingLog, PottyKind } from "@/types/app.types";

const PT = "America/Los_Angeles";
const MIN = 60000;

/** Nothing is projected until there are at least this many distinct logged days. */
export const MIN_DAYS_FOR_PREDICTION = 3;

export type PredictTarget = "pee" | "poop";

/** A #3 counts as both a #1 and a #2 for modelling purposes. */
function matchesTarget(kind: PottyKind, target: PredictTarget): boolean {
  return kind === target || kind === "both";
}

/**
 * Whether an entry records something actually coming out. A #0 is a trip
 * outside where the puppy didn't go — worth logging, but it is not evidence
 * about elimination timing, so it stays out of every count the model uses.
 */
function isElimination(kind: PottyKind): boolean {
  return kind !== "nothing";
}

// ── Pacific-time helpers ─────────────────────────────────────────────────────

const partsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: PT,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** { day: "2026-08-25", minutes: minutes past PT midnight } */
export function ptDayAndMinutes(iso: string | Date): { day: string; minutes: number } {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const p = partsFmt.formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "0";
  // en-CA renders midnight as hour "24"; fold it back to 0.
  const hour = Number(get("hour")) % 24;
  return {
    day: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: hour * 60 + Number(get("minute")),
  };
}

export function ptDay(iso: string | Date): string {
  return ptDayAndMinutes(iso).day;
}

/**
 * How far Pacific Time sits behind UTC at a given instant, in minutes (420 for
 * PDT, 480 for PST). Derived from Intl rather than a fixed constant so DST is
 * handled without a date library.
 */
function ptOffsetMinutes(d: Date): number {
  const p = partsFmt.formatToParts(d);
  const get = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0);
  const wallAsUTC = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute")
  );
  // Round to the minute — the instant may carry seconds the wall clock doesn't.
  return Math.round((d.getTime() - wallAsUTC) / 60000);
}

/**
 * Turn a Pacific wall-clock date + minutes-past-midnight into a UTC instant.
 * Used when an entry's time is edited by hand: the user types a local time and
 * it has to land on the right absolute moment.
 *
 * The offset is resolved twice because the first guess can fall on the far side
 * of a DST boundary from the answer.
 */
export function ptWallTimeToISO(day: string, minutesOfDay: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const hh = Math.floor(minutesOfDay / 60);
  const mm = minutesOfDay % 60;
  const wallAsUTC = Date.UTC(y, m - 1, d, hh, mm);
  let instant = wallAsUTC + ptOffsetMinutes(new Date(wallAsUTC)) * 60000;
  const settled = wallAsUTC + ptOffsetMinutes(new Date(instant)) * 60000;
  if (settled !== instant) instant = settled;
  return new Date(instant).toISOString();
}

/** 545 → "9:05am" */
export function formatMinutes(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60);
  const mm = m % 60;
  const suffix = h24 < 12 ? "am" : "pm";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return mm === 0 ? `${h12}${suffix}` : `${h12}:${String(mm).padStart(2, "0")}${suffix}`;
}

export function formatClock(iso: string | Date): string {
  return formatMinutes(ptDayAndMinutes(iso).minutes);
}

/** "in 25 min" / "in 1h 10m" / "8 min ago" */
export function formatRelative(target: Date, now: Date = new Date()): string {
  const diff = Math.round((target.getTime() - now.getTime()) / MIN);
  const abs = Math.abs(diff);
  const body =
    abs < 60 ? `${abs} min` : `${Math.floor(abs / 60)}h ${abs % 60}m`.replace(/ 0m$/, "");
  if (diff <= 0) return `${body} ago`;
  return `in ${body}`;
}

// ── Age ──────────────────────────────────────────────────────────────────────

export interface PuppyAge {
  months: number;
  /** "11 weeks" under 3 months, "4 mo" after. */
  label: string;
}

export function computeAge(dob: string | null, now: Date = new Date()): PuppyAge | null {
  if (!dob) return null;
  // Anchored at Pacific noon so a device in another timezone still reports
  // the same age, and so DST shifts can never move it across a day boundary.
  const born = new Date(ptWallTimeToISO(dob, 12 * 60));
  const days = (now.getTime() - born.getTime()) / 86400000;
  if (days < 0) return null;
  const months = days / 30.44;
  const label =
    months < 3
      ? `${Math.max(1, Math.round(days / 7))} weeks`
      : months < 24
        ? `${Math.round(months)} mo`
        : `${(months / 12).toFixed(1)} yr`;
  return { months, label };
}

/**
 * The standard fostering rule of thumb: a puppy can hold its bladder roughly one
 * hour per month of age, floor 1h, and past about 8 months it stops being the
 * binding constraint. Used only as an upper bound on a predicted gap — never to
 * invent a prediction where there's no data.
 */
export function bladderHoursForAge(months: number | null): number | null {
  if (months == null) return null;
  return Math.min(Math.max(months, 1), 8);
}

// ── Small stats helpers ──────────────────────────────────────────────────────

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

// ── Daily report ─────────────────────────────────────────────────────────────

export interface DaySummary {
  day: string;            // YYYY-MM-DD (PT)
  entries: FosterPottyLog[]; // chronological
  feedings: FosterFeedingLog[];
  pee: number;            // #1 + #3
  poop: number;           // #2 + #3
  nothing: number;        // #0 — trips out with no result
  accidents: number;      // an elimination with location === "inside"
}

/**
 * The last `days` calendar days (PT), most recent first. Days with no entries
 * are included as empty rows so a gap in the week is visible rather than hidden.
 */
export function buildDaySummaries(
  pottyLogs: FosterPottyLog[],
  feedingLogs: FosterFeedingLog[],
  days = 7,
  now: Date = new Date()
): DaySummary[] {
  const byDay = new Map<string, FosterPottyLog[]>();
  for (const log of pottyLogs) {
    const d = ptDay(log.occurred_at);
    (byDay.get(d) ?? byDay.set(d, []).get(d)!).push(log);
  }
  const feedByDay = new Map<string, FosterFeedingLog[]>();
  for (const log of feedingLogs) {
    const d = ptDay(log.occurred_at);
    (feedByDay.get(d) ?? feedByDay.set(d, []).get(d)!).push(log);
  }

  const out: DaySummary[] = [];
  for (let i = 0; i < days; i++) {
    const day = ptDay(new Date(now.getTime() - i * 86400000));
    const entries = (byDay.get(day) ?? []).sort(
      (a, b) => +new Date(a.occurred_at) - +new Date(b.occurred_at)
    );
    const feedings = (feedByDay.get(day) ?? []).sort(
      (a, b) => +new Date(a.occurred_at) - +new Date(b.occurred_at)
    );
    out.push({
      day,
      entries,
      feedings,
      pee: entries.filter((e) => matchesTarget(e.kind, "pee")).length,
      poop: entries.filter((e) => matchesTarget(e.kind, "poop")).length,
      nothing: entries.filter((e) => e.kind === "nothing").length,
      accidents: entries.filter(
        (e) => e.location === "inside" && isElimination(e.kind)
      ).length,
    });
  }
  return out;
}

/** Whole days since the last inside accident. `null` = no accident on record. */
export function daysSinceLastAccident(
  pottyLogs: FosterPottyLog[],
  now: Date = new Date()
): number | null {
  const last = pottyLogs
    .filter((l) => l.location === "inside" && isElimination(l.kind))
    .sort((a, b) => +new Date(b.occurred_at) - +new Date(a.occurred_at))[0];
  if (!last) return null;
  const a = ptDay(last.occurred_at);
  const b = ptDay(now);
  return Math.round(
    (Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000
  );
}

/**
 * Distinct PT days with at least one *elimination* — the model's sample size.
 * A day of nothing-but-#0 entries carries no information about when the puppy
 * goes, so counting it would dilute every rate computed against it.
 */
export function loggedDayCount(pottyLogs: FosterPottyLog[]): number {
  return new Set(
    pottyLogs.filter((l) => isElimination(l.kind)).map((l) => ptDay(l.occurred_at))
  ).size;
}

// ── Typical-day windows ──────────────────────────────────────────────────────

export interface TypicalWindow {
  target: PredictTarget;
  /** Minutes past PT midnight. */
  startMin: number;
  endMin: number;
  centerMin: number;
  /** Days this window fired on, out of days observed. */
  hits: number;
  daysObserved: number;
}

/** Events more than this far apart in the day belong to different windows. */
const CLUSTER_GAP_MIN = 75;
/** A cluster has to show up on at least this share of days to be a "window". */
const MIN_HIT_RATE = 0.4;

/**
 * Cluster event times-of-day into recurring windows. Times near midnight are not
 * wrapped — an overnight cluster straddling 12am shows as two windows, which is
 * honest enough for a report and keeps the maths readable.
 */
export function typicalDayWindows(
  pottyLogs: FosterPottyLog[],
  target: PredictTarget
): TypicalWindow[] {
  const events = pottyLogs
    .filter((l) => matchesTarget(l.kind, target))
    .map((l) => ({ ...ptDayAndMinutes(l.occurred_at) }));
  const daysObserved = loggedDayCount(pottyLogs);
  if (daysObserved < MIN_DAYS_FOR_PREDICTION || events.length === 0) return [];

  const sorted = [...events].sort((a, b) => a.minutes - b.minutes);
  const clusters: (typeof sorted)[] = [];
  let current: typeof sorted = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].minutes - sorted[i - 1].minutes <= CLUSTER_GAP_MIN) {
      current.push(sorted[i]);
    } else {
      clusters.push(current);
      current = [sorted[i]];
    }
  }
  clusters.push(current);

  return clusters
    .map((c) => {
      const mins = c.map((e) => e.minutes);
      const center = mean(mins);
      // Half-width tracks how tight the cluster is, floored at 20 min so a
      // window is never narrower than the precision of hand-logged times.
      const half = Math.max(20, Math.min(75, stdev(mins) || 20));
      const hits = new Set(c.map((e) => e.day)).size;
      return {
        target,
        centerMin: center,
        startMin: Math.max(0, center - half),
        endMin: Math.min(1439, center + half),
        hits,
        daysObserved,
      };
    })
    .filter((w) => w.hits / w.daysObserved >= MIN_HIT_RATE)
    .sort((a, b) => a.centerMin - b.centerMin);
}

// ── Next-likely prediction ───────────────────────────────────────────────────

export type Confidence = "low" | "medium" | "high";

export interface Prediction {
  target: PredictTarget;
  at: Date;
  confidence: Confidence;
  /** Plain-language reason, e.g. "typical gap 2h 10m · 5 days of data". */
  basis: string;
  /** True when the age rule, not the history, set the time. */
  cappedByAge: boolean;
  /** Already past — "overdue for a trip out". */
  overdue: boolean;
}

/**
 * Plausible gap between two consecutive events, per target. A #1 gap is a
 * bladder interval — minutes to a few hours. A #2 gap is routinely overnight, so
 * it needs a much wider ceiling or every real gap gets discarded. The floors
 * drop double-taps (one trip logged twice).
 */
const GAP_BOUNDS: Record<PredictTarget, { min: number; max: number }> = {
  pee: { min: 10, max: 8 * 60 },
  poop: { min: 20, max: 20 * 60 },
};

/** Median gap between consecutive same-target events, in minutes. */
function medianGapMin(pottyLogs: FosterPottyLog[], target: PredictTarget): number | null {
  const times = sortedTimes(pottyLogs, target);
  if (times.length < 3) return null;
  const { min: lo, max: hi } = GAP_BOUNDS[target];
  const gaps: number[] = [];
  for (let i = 1; i < times.length; i++) {
    const g = (times[i] - times[i - 1]) / MIN;
    if (g >= lo && g <= hi) gaps.push(g);
  }
  return gaps.length >= 2 ? median(gaps) : null;
}

/**
 * Event times for a target, ascending, with anything in the future dropped.
 * Back-dating can only move an entry earlier, so a future timestamp is bad data
 * (a device clock askew) and would otherwise anchor every prediction to it.
 */
function sortedTimes(
  pottyLogs: FosterPottyLog[],
  target: PredictTarget,
  now: Date = new Date()
): number[] {
  return pottyLogs
    .filter((l) => matchesTarget(l.kind, target))
    .map((l) => +new Date(l.occurred_at))
    .filter((t) => t <= now.getTime())
    .sort((a, b) => a - b);
}

/**
 * The next time a recurring window comes round after `now` — used when there is
 * no usable interval (common for #2 early on) and to give an overdue prediction
 * somewhere to land. Rolls into tomorrow when every window has already passed.
 */
function nextWindowAfter(
  windows: TypicalWindow[],
  now: Date
): { at: Date; window: TypicalWindow } | null {
  if (windows.length === 0) return null;
  const { minutes: nowMin } = ptDayAndMinutes(now);
  const upcoming = windows.find((w) => w.centerMin > nowMin);
  const target = upcoming ?? windows[0];
  const deltaMin = upcoming
    ? target.centerMin - nowMin
    : 1440 - nowMin + target.centerMin;
  return { at: new Date(now.getTime() + deltaMin * MIN), window: target };
}

/** Median lag from a meal to the next #2, when both are being logged. */
function medianMealToPoopMin(
  pottyLogs: FosterPottyLog[],
  feedingLogs: FosterFeedingLog[]
): number | null {
  const nowMs = Date.now();
  const meals = feedingLogs
    .filter((f) => f.kind === "food" || f.kind === "both")
    .map((f) => +new Date(f.occurred_at))
    .filter((t) => t <= nowMs)
    .sort((a, b) => a - b);
  const poops = sortedTimes(pottyLogs, "poop");
  if (meals.length < 3 || poops.length < 3) return null;

  const lags: number[] = [];
  for (const m of meals) {
    const next = poops.find((p) => p > m);
    if (next == null) continue;
    const lag = (next - m) / MIN;
    // A poop more than 3h after the meal is probably not that meal's.
    if (lag <= 180) lags.push(lag);
  }
  return lags.length >= 3 ? median(lags) : null;
}

function confidenceFor(days: number, samples: number): Confidence {
  if (days >= 7 && samples >= 20) return "high";
  if (days >= 5 && samples >= 10) return "medium";
  return "low";
}

function fmtGap(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/**
 * Best guess at the next #1 and #2. Returns `[]` until there are
 * MIN_DAYS_FOR_PREDICTION days of history — the UI shows a "keep logging" note
 * instead of a number it can't stand behind.
 */
export function predictNext(
  pottyLogs: FosterPottyLog[],
  feedingLogs: FosterFeedingLog[],
  dobMonths: number | null,
  now: Date = new Date()
): Prediction[] {
  const days = loggedDayCount(pottyLogs);
  if (days < MIN_DAYS_FOR_PREDICTION) return [];

  const out: Prediction[] = [];
  for (const target of ["pee", "poop"] as PredictTarget[]) {
    const times = sortedTimes(pottyLogs, target, now);
    const lastAt = times.length > 0 ? times[times.length - 1] : null;
    const windows = typicalDayWindows(pottyLogs, target);
    const gap = medianGapMin(pottyLogs, target);

    // Don't predict another trip right on the heels of one that just happened:
    // no prediction lands sooner than half the usual gap after the last event.
    const refractoryMin = gap != null ? gap / 2 : GAP_BOUNDS[target].min;
    const earliest = new Date(
      Math.max(now.getTime(), (lastAt ?? 0) + refractoryMin * MIN)
    );

    let at: Date | null = null;
    let basis = "";

    // ── 1. A settled routine beats an average gap ───────────────────────────
    // Twice-a-day #2 is the clear case: gaps alternate ~10h and ~14h, so their
    // median points at 3am — while the actual habit is 7am and 5pm, every day.
    const strongWindows = windows.filter((w) => w.hits / w.daysObserved >= 0.6);
    const next = nextWindowAfter(strongWindows, earliest);
    if (next) {
      at = next.at;
      basis = `usual ${formatMinutes(next.window.centerMin)} window · ${next.window.hits} of ${next.window.daysObserved} days`;
    }

    // ── 2. Otherwise extrapolate from the last event ────────────────────────
    if (at == null && gap != null && lastAt != null) {
      at = new Date(lastAt + gap * MIN);
      basis = `typical gap ${fmtGap(gap)} · ${days} days of data`;
      // Snap onto a weaker window if the guess lands inside one.
      const { minutes: predMin } = ptDayAndMinutes(at);
      const hit = windows.find((w) => predMin >= w.startMin && predMin <= w.endMin);
      if (hit) {
        at = new Date(at.getTime() + (hit.centerMin - predMin) * MIN);
        basis = `usual ${formatMinutes(hit.centerMin)} window · ${hit.hits} of ${hit.daysObserved} days`;
      }
    }

    // ── 3. Meals move #2 more than the clock does ───────────────────────────
    if (target === "poop") {
      const lag = medianMealToPoopMin(pottyLogs, feedingLogs);
      const lastMeal = feedingLogs
        .filter((f) => f.kind === "food" || f.kind === "both")
        .map((f) => +new Date(f.occurred_at))
        .filter((t) => t <= now.getTime())
        .sort((a, b) => b - a)[0];
      if (lag != null && lastMeal != null) {
        const fromMeal = new Date(lastMeal + lag * MIN);
        // Only when that meal hasn't already been answered by a #2, and it
        // points sooner than whatever the routine or the gap suggested.
        if ((lastAt == null || +fromMeal > lastAt) && (at == null || fromMeal < at)) {
          at = fromMeal;
          basis = `${fmtGap(lag)} after a meal · ${days} days of data`;
        }
      }
    }

    if (at == null) continue;

    // ── 4. Age bound on #1 — bladder capacity, not bowel timing ─────────────
    // Applied last so it clamps whichever estimate won above.
    let cappedByAge = false;
    if (target === "pee" && lastAt != null) {
      const capHours = bladderHoursForAge(dobMonths);
      if (capHours != null && +at > lastAt + capHours * 60 * MIN) {
        at = new Date(lastAt + capHours * 60 * MIN);
        cappedByAge = true;
        basis = `capped at ${fmtGap(capHours * 60)} by age (1 hr per month old)`;
      }
    }

    out.push({
      target,
      at,
      confidence: confidenceFor(days, times.length),
      basis,
      cappedByAge,
      overdue: at <= now,
    });
  }
  return out.sort((a, b) => +a.at - +b.at);
}
