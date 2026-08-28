/**
 * Builds the printable "Foster Report Card" — a self-contained HTML document
 * handed to the browser's print dialog, where "Save as PDF" produces the file.
 *
 * Everything here is presentation. All figures come from puppyPredict so the
 * printout and the on-screen report can never disagree.
 */
import {
  buildDaySummaries,
  handoffStats,
  typicalDayWindows,
  typicalMealWindows,
  mergeRoutine,
  routineSpread,
  predictNext,
  loggedDayCount,
  computeAge,
  bladderHoursForAge,
  formatClock,
  formatMinutes,
  formatDuration,
  ptDay,
  MIN_DAYS_FOR_PREDICTION,
  type RoutineSlot,
} from "./puppyPredict";
import {
  POTTY_KINDS,
  POTTY_LOCATIONS,
  FEEDING_KINDS,
  HANDOFF_FIELDS,
  type FosterPuppy,
  type FosterPottyLog,
  type FosterFeedingLog,
} from "@/types/app.types";

const KIND = Object.fromEntries(POTTY_KINDS.map((k) => [k.value, k]));
const LOC = Object.fromEntries(POTTY_LOCATIONS.map((l) => [l.value, l]));
const FEED = Object.fromEntries(FEEDING_KINDS.map((f) => [f.value, f]));

/** Escape for HTML text content — puppy names and notes are free text. */
function esc(v: string | null | undefined): string {
  return String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}

function longDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** "April 20, 2026" from a YYYY-MM-DD calendar date. */
function calendarDate(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function dayHeading(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "numeric",
    day: "numeric",
  });
}

function slotRows(slots: RoutineSlot[]): string {
  return slots
    .map(
      (s) => `<tr>
        <td class="slot-time"><strong>${formatMinutes(s.startMin)} – ${formatMinutes(s.endMin)}</strong></td>
        <td class="slot-what">${s.parts.map((p) => esc(p.label)).join(" &amp; ")}</td>
        <td class="muted slot-freq">${s.parts
          .map((p) =>
            s.parts.length > 1
              ? `${esc(p.label.replace(/ .*/, ""))} ${p.hits}/${p.daysObserved}`
              : `${p.hits} of ${p.daysObserved} days`
          )
          .join(" · ")}</td>
      </tr>`
    )
    .join("");
}

/** Honest one-liner for a target with no identifiable windows. */
function spreadLine(pottyLogs: FosterPottyLog[], target: "pee" | "poop", name: string): string {
  const sp = routineSpread(pottyLogs, target);
  const what = target === "pee" ? "#1" : "#2";
  if (!sp) return `<p class="muted">No ${what} logged yet.</p>`;
  return `<p class="muted"><strong>${what}:</strong> about ${sp.perDay.toFixed(1)} a day, but at no
    settled time yet — logged anywhere between ${formatMinutes(sp.earliestMin)} and
    ${formatMinutes(sp.latestMin)} across ${sp.days} day${sp.days === 1 ? "" : "s"}.
    Watch ${esc(name)} rather than the clock for this one.</p>`;
}

/** Ruled space for the next foster to write in. */
function writeIn(lines = 3): string {
  return `<div class="writein">${Array(lines).fill('<div class="rule"></div>').join("")}</div>`;
}

export function buildReportCardHtml(opts: {
  puppy: FosterPuppy;
  pottyLogs: FosterPottyLog[];
  feedingLogs: FosterFeedingLog[];
  days: number;
  now?: Date;
}): string {
  const { puppy, pottyLogs, feedingLogs, days } = opts;
  const now = opts.now ?? new Date();

  const age = computeAge(puppy.dob, now);
  const stats = handoffStats(pottyLogs, days, now);
  const summaries = buildDaySummaries(pottyLogs, feedingLogs, days, now);
  const peeWindows = typicalDayWindows(pottyLogs, "pee", { relaxed: true });
  const poopWindows = typicalDayWindows(pottyLogs, "poop", { relaxed: true });
  const mealWindows = typicalMealWindows(feedingLogs);
  const predictions = predictNext(pottyLogs, feedingLogs, age?.months ?? null, now);
  const modelDays = loggedDayCount(pottyLogs);
  const capHours = bladderHoursForAge(age?.months ?? null);

  const withUs = Math.max(
    1,
    Math.round(
      (now.getTime() - Date.parse(`${puppy.arrival_date}T12:00:00Z`)) / 86400000
    )
  );

  const filledHandoff = HANDOFF_FIELDS.filter(
    (f) => ((puppy as any)[f.key] as string | null)?.trim()
  );

  const trendLabel = {
    improving: "improving — fewer accidents recently than earlier in the period",
    worsening: "more accidents recently than earlier in the period",
    steady: "roughly steady across the period",
    none: "no accidents recorded",
  }[stats.accidentTrend];

  // ── Sections ───────────────────────────────────────────────────────────────

  // One chronological day, #1 / #2 / meals merged — a trip where the puppy does
  // both reads as a single row rather than the same time listed twice.
  const slots = mergeRoutine([
    { label: "#1 Pee", windows: peeWindows },
    { label: "#2 Poop", windows: poopWindows },
    { label: "Meal", windows: mealWindows },
  ]);

  // A target with no window — or only a weak one — gets a plain-language line, so
  // #2 is never silently absent and a 2-of-6 window is never mistaken for the
  // whole picture.
  const weak = (windows: { hits: number; daysObserved: number }[]) =>
    windows.length === 0 ||
    Math.max(...windows.map((w) => w.hits / w.daysObserved)) < 0.6;
  const missing = [
    weak(peeWindows) ? spreadLine(pottyLogs, "pee", puppy.name) : "",
    weak(poopWindows) ? spreadLine(pottyLogs, "poop", puppy.name) : "",
    mealWindows.length === 0
      ? `<p class="muted"><strong>Meals:</strong> not enough logged yet to show a regular schedule.</p>`
      : "",
  ].join("");

  const routine =
    slots.length === 0
      ? `<p class="muted">Not enough logged days yet to identify a repeating routine
         (needs ${MIN_DAYS_FOR_PREDICTION}, has ${modelDays}).</p>${missing}`
      : `<table class="routine">${slotRows(slots)}</table>
         ${missing}
         <p class="muted">The times ${esc(puppy.name)} usually goes, measured across
         ${modelDays} logged days. This is the part that travels with the puppy —
         the clock times further down do not.</p>`;

  const predictionRows = predictions.length
    ? predictions
        .map(
          (p) => `<tr>
            <td><strong>${p.target === "pee" ? "#1 · Pee" : "#2 · Poop"}</strong></td>
            <td>${formatClock(p.at)}${p.overdue ? " <em>(already due)</em>" : ""}</td>
            <td class="muted">${esc(p.basis)}</td>
          </tr>`
        )
        .join("")
    : `<tr><td colspan="3" class="muted">Not enough data yet to project
        (needs ${MIN_DAYS_FOR_PREDICTION} logged days, has ${modelDays}).</td></tr>`;

  const logSections = summaries
    .map((d) => {
      if (d.timeline.length === 0) {
        return `<div class="day"><h3>${dayHeading(d.day)}</h3>
          <p class="muted">No entries.</p></div>`;
      }
      const rows = d.timeline
        .map((ev) => {
          if (ev.type === "potty") {
            const e = ev.log;
            const loc = LOC[e.location];
            const accident = e.location === "inside";
            return `<tr>
              <td class="time">${formatClock(e.occurred_at)}</td>
              <td>${esc(KIND[e.kind]?.label ?? e.kind)}</td>
              <td class="${accident ? "accident" : ""}">${esc(loc?.label ?? e.location)}</td>
            </tr>`;
          }
          const f = ev.log;
          return `<tr class="meal">
            <td class="time">${formatClock(f.occurred_at)}</td>
            <td>${esc(FEED[f.kind]?.label ?? f.kind)}</td>
            <td>${esc(f.amount ?? "")}</td>
          </tr>`;
        })
        .join("");
      return `<div class="day">
        <h3>${dayHeading(d.day)}
          <span class="counts">${d.pee} pee · ${d.poop} poop${
            d.nothing ? ` · ${d.nothing} nothing` : ""
          }${d.accidents ? ` · ${d.accidents} accident${d.accidents > 1 ? "s" : ""}` : ""}</span>
        </h3>
        <table class="log">${rows}</table>
      </div>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(puppy.name)} — Foster Report Card</title>
<style>
  @page { margin: 14mm; }
  * { box-sizing: border-box; }
  body { font: 11pt/1.45 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
         color: #111827; margin: 0; }
  h1 { font-size: 22pt; margin: 0 0 2px; }
  h2 { font-size: 13pt; margin: 0 0 8px; padding-bottom: 4px;
       border-bottom: 2px solid #111827; }
  h3 { font-size: 11pt; margin: 12px 0 4px; }
  ul { margin: 4px 0; padding-left: 20px; }
  li { margin: 2px 0; }
  p { margin: 6px 0; }
  .muted { color: #6b7280; font-size: 9.5pt; }
  section { margin-bottom: 20px; }
  /* Keep a section intact across a page break where the browser allows it. */
  section, .day { break-inside: avoid; }
  header { border-bottom: 3px solid #111827; padding-bottom: 10px; margin-bottom: 16px; }
  .sub { color: #374151; font-size: 10.5pt; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 10px 0; }
  .stat { border: 1px solid #d1d5db; border-radius: 6px; padding: 8px; text-align: center; }
  .stat b { display: block; font-size: 16pt; }
  .stat span { font-size: 8.5pt; color: #6b7280; text-transform: uppercase;
               letter-spacing: .03em; }
  table { width: 100%; border-collapse: collapse; }
  table.log td { padding: 3px 6px; border-bottom: 1px solid #f3f4f6; font-size: 10pt;
                 vertical-align: top; }
  td.time { width: 68px; color: #6b7280; white-space: nowrap; }
  tr.meal td { color: #6b7280; font-style: italic; }
  .accident { color: #b91c1c; font-weight: 600; }
  .counts { float: right; font-weight: 400; color: #6b7280; font-size: 9.5pt; }
  .day { margin-bottom: 12px; }
  table.routine td { padding: 5px 6px; border-bottom: 1px solid #f3f4f6; font-size: 10.5pt;
                     vertical-align: top; }
  td.slot-time { width: 130px; white-space: nowrap; }
  td.slot-what { font-weight: 600; }
  td.slot-freq { text-align: right; white-space: nowrap; }
  table.pred td { padding: 4px 6px; border-bottom: 1px solid #f3f4f6; font-size: 10pt; }
  .field { margin-bottom: 10px; }
  .field .label { font-size: 8.5pt; text-transform: uppercase; letter-spacing: .04em;
                  color: #6b7280; font-weight: 700; }
  .field .value { white-space: pre-wrap; }
  .writein .rule { border-bottom: 1px solid #d1d5db; height: 20px; }
  .note { background: #f9fafb; border-left: 3px solid #9ca3af; padding: 8px 10px;
          font-size: 9.5pt; color: #374151; }
  .pagebreak { break-before: page; }
  footer { margin-top: 18px; padding-top: 8px; border-top: 1px solid #d1d5db;
           font-size: 8.5pt; color: #6b7280; }
</style>
</head>
<body>

<header>
  <h1>${esc(puppy.name)}</h1>
  <div class="sub">
    Foster Report Card${age ? ` · ${esc(age.label)} old${puppy.dob_is_estimate ? " (estimated)" : ""}` : ""}
    ${puppy.dob ? ` · born ${calendarDate(puppy.dob)}` : ""}
  </div>
  <div class="sub">
    With us since ${calendarDate(puppy.arrival_date)} (${withUs} day${withUs === 1 ? "" : "s"})
    · Report covers the last ${days} days · Prepared ${longDate(now)}
  </div>
</header>

<section>
  <h2>House-training at a glance</h2>
  <div class="grid">
    <div class="stat"><b>${stats.peePerDay.toFixed(1)}</b><span>#1 per day</span></div>
    <div class="stat"><b>${stats.poopPerDay.toFixed(1)}</b><span>#2 per day</span></div>
    <div class="stat"><b>${stats.totalAccidents}</b><span>accidents</span></div>
    <div class="stat"><b>${
      stats.daysSinceAccident == null ? "—" : stats.daysSinceAccident
    }</b><span>days since last accident</span></div>
  </div>
  <p>Accidents are <strong>${trendLabel}</strong>.
  ${
    stats.longestGapMin != null
      ? `Longest stretch without needing out was <strong>${formatDuration(
          stats.longestGapMin
        )}</strong> (${stats.longestGapFrom} → ${stats.longestGapTo}).`
      : ""
  }</p>
  <p class="muted">Based on ${stats.daysCovered} logged day${
    stats.daysCovered === 1 ? "" : "s"
  } out of the last ${days}. ${stats.totalNothing} trip${
    stats.totalNothing === 1 ? " was" : "s were"
  } logged where nothing happened.</p>
</section>

<section>
  <h2>Expected daily routine</h2>
  ${routine}
</section>

<section>
  <h2>Next expected trips out</h2>
  <table class="pred">${predictionRows}</table>
  <p class="note">
    <strong>These clock times were current as of ${formatClock(now)} on ${longDate(now)}
    and go stale quickly.</strong> They are projected from ${modelDays} logged day${
      modelDays === 1 ? "" : "s"
    } of history —
    the typical gap between trips, the times of day ${esc(puppy.name)} usually goes,
    how long after a meal a #2 tends to follow${
      capHours != null
        ? `, and an age limit of about ${formatDuration(
            capHours * 60
          )} between #1s (roughly one hour per month of age)`
        : ""
    }.
    Because each one counts forward from the last logged trip, they stop being
    meaningful once ${esc(puppy.name)} moves. <strong>Use the “Expected daily
    routine” above instead — that carries over.</strong>
  </p>
</section>

<section>
  <h2>Care &amp; handoff notes</h2>
  ${
    filledHandoff.length
      ? filledHandoff
          .map(
            (f) => `<div class="field">
              <div class="label">${esc(f.label)}</div>
              <div class="value">${esc((puppy as any)[f.key])}</div>
            </div>`
          )
          .join("")
      : `<p class="muted">No handoff notes recorded yet — add them on the puppy's
         profile and reprint, or write them in below.</p>`
  }
  ${HANDOFF_FIELDS.filter((f) => !filledHandoff.includes(f))
    .map(
      (f) => `<div class="field"><div class="label">${esc(f.label)}</div>${writeIn(2)}</div>`
    )
    .join("")}
</section>

<section>
  <h2>Notes from the new foster</h2>
  ${writeIn(6)}
</section>

<section class="pagebreak">
  <h2>Full log — last ${days} days</h2>
  <p class="muted">Newest first. Meals shown in italics.</p>
  ${logSections}
</section>

<footer>
  ${esc(puppy.name)} · Foster Report Card · generated ${longDate(now)} at ${formatClock(now)}
  · all times Pacific
</footer>

</body>
</html>`;
}

/** Day range the printed report covers (also the query's retention limit). */
export const REPORT_CARD_DAYS = 21;

/** Today, PT — used to name the saved file. */
export function reportCardFilename(puppy: FosterPuppy, now = new Date()): string {
  const slug = puppy.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "puppy";
  return `${slug}-foster-report-${ptDay(now)}`;
}
