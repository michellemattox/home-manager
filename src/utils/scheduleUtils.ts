import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  parseISO,
  format,
} from "date-fns";
import type { FrequencyType } from "@/types/app.types";

export interface ScheduleRule {
  daysOfWeek?: number[] | null;   // 0..6 (Sun..Sat), multi-select for day-of-week rule
  nthWeek?: number | null;         // 1..4, for "Nth weekday of month" rule
  nthWeekday?: number | null;      // 0..6 (Sun..Sat), paired with nthWeek
}

function nextMatchingDayOfWeek(from: Date, daysOfWeek: number[]): Date {
  const sorted = Array.from(new Set(daysOfWeek)).sort((a, b) => a - b);
  for (let i = 1; i <= 7; i++) {
    const candidate = addDays(from, i);
    if (sorted.includes(candidate.getDay())) return candidate;
  }
  return addDays(from, 7);
}

// Nth (1..4) occurrence of a weekday (0..6) in a given year/month. If the
// Nth slot doesn't exist in that month (e.g., 5th Monday), falls back to the
// last occurrence of that weekday in the month.
function nthWeekdayInMonth(year: number, month: number, nthWeek: number, nthWeekday: number): Date {
  const first = new Date(year, month, 1);
  let offset = nthWeekday - first.getDay();
  if (offset < 0) offset += 7;
  const target = 1 + offset + 7 * (nthWeek - 1);
  const maxDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, target <= maxDay ? target : target - 7);
}

function nthWeekdayOfNextMonth(from: Date, nthWeek: number, nthWeekday: number): Date {
  const nextMonth = addMonths(new Date(from.getFullYear(), from.getMonth(), 1), 1);
  return nthWeekdayInMonth(nextMonth.getFullYear(), nextMonth.getMonth(), nthWeek, nthWeekday);
}

export function calculateNextDueDate(
  frequencyType: FrequencyType,
  frequencyDays: number,
  fromDate: Date = new Date(),
  rule: ScheduleRule = {}
): string {
  // Rule-aware paths override plain frequency addition so Mon+Wed+Fri cycles
  // correctly and "3rd Tue of month" jumps to the next month's 3rd Tuesday
  // rather than adding a fixed 30 days.
  if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
    return format(nextMatchingDayOfWeek(fromDate, rule.daysOfWeek), "yyyy-MM-dd");
  }
  if (rule.nthWeek != null && rule.nthWeekday != null) {
    return format(nthWeekdayOfNextMonth(fromDate, rule.nthWeek, rule.nthWeekday), "yyyy-MM-dd");
  }

  let next: Date;
  switch (frequencyType) {
    case "daily":
      next = addDays(fromDate, 1);
      break;
    case "weekly":
      next = addWeeks(fromDate, 1);
      break;
    case "monthly":
      next = addMonths(fromDate, 1);
      break;
    case "yearly":
      next = addYears(fromDate, 1);
      break;
    case "custom":
      next = addDays(fromDate, frequencyDays);
      break;
    case "no_repeat":
    default:
      next = fromDate;
  }
  return format(next, "yyyy-MM-dd");
}

// First occurrence of the rule on or after `today`. Used to compute the
// initial next_due_date when a rule-based task is created.
export function firstOccurrenceOnOrAfter(rule: ScheduleRule, today: Date = new Date()): string {
  const todayStr = format(today, "yyyy-MM-dd");

  if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
    if (rule.daysOfWeek.includes(today.getDay())) return todayStr;
    return format(nextMatchingDayOfWeek(today, rule.daysOfWeek), "yyyy-MM-dd");
  }
  if (rule.nthWeek != null && rule.nthWeekday != null) {
    const thisMonth = nthWeekdayInMonth(
      today.getFullYear(),
      today.getMonth(),
      rule.nthWeek,
      rule.nthWeekday
    );
    const thisMonthStr = format(thisMonth, "yyyy-MM-dd");
    if (thisMonthStr >= todayStr) return thisMonthStr;
    return format(nthWeekdayOfNextMonth(today, rule.nthWeek, rule.nthWeekday), "yyyy-MM-dd");
  }
  return todayStr;
}

export function frequencyLabel(
  frequencyType: FrequencyType,
  frequencyDays: number
): string {
  switch (frequencyType) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    case "yearly":
      return "Yearly";
    case "custom":
      return `Every ${frequencyDays} days`;
    case "no_repeat":
      return "No Repeat";
    default:
      return "Custom";
  }
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEK_ORDINAL = ["", "1st", "2nd", "3rd", "4th"];

// Produce a human label that reflects the actual rule, not just the base type.
export function frequencyLabelFromRule(
  frequencyType: FrequencyType,
  frequencyDays: number,
  rule: ScheduleRule
): string {
  if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
    const names = rule.daysOfWeek
      .slice()
      .sort((a, b) => a - b)
      .map((d) => DAY_NAMES[d]);
    return `Weekly on ${names.join(", ")}`;
  }
  if (rule.nthWeek != null && rule.nthWeekday != null) {
    return `Monthly on ${WEEK_ORDINAL[rule.nthWeek]} ${DAY_NAMES[rule.nthWeekday]}`;
  }
  return frequencyLabel(frequencyType, frequencyDays);
}

export function frequencyToDays(frequencyType: FrequencyType): number {
  switch (frequencyType) {
    case "daily":
      return 1;
    case "weekly":
      return 7;
    case "monthly":
      return 30;
    case "yearly":
      return 365;
    default:
      return 30;
  }
}
