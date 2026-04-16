import { format, parseISO, differenceInDays } from "date-fns";

// Returns today's date string (YYYY-MM-DD) in Pacific Time (Seattle/US West Coast)
function getTodayPT(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), "MMM d, yyyy");
}

export function formatDateShort(dateStr: string): string {
  return format(parseISO(dateStr), "MMM d");
}

export function formatDateTime(dateStr: string): string {
  return format(parseISO(dateStr), "MMM d, yyyy 'at' h:mm a");
}

export function isOverdue(dateStr: string): boolean {
  return dateStr < getTodayPT();
}

export function isDueToday(dateStr: string): boolean {
  return dateStr === getTodayPT();
}

export function isDueTomorrow(dateStr: string): boolean {
  const todayPT = getTodayPT();
  const parts = todayPT.split("-").map(Number);
  const tomorrow = new Date(parts[0], parts[1] - 1, parts[2] + 1);
  return dateStr === format(tomorrow, "yyyy-MM-dd");
}

export function isDueSoon(dateStr: string, withinDays = 7): boolean {
  const todayPT = getTodayPT();
  const todayParts = todayPT.split("-").map(Number);
  const limitDate = new Date(todayParts[0], todayParts[1] - 1, todayParts[2] + withinDays);
  const limitStr = format(limitDate, "yyyy-MM-dd");
  return dateStr >= todayPT && dateStr <= limitStr;
}

/** Returns the 4-tier due status for a date string */
export function dueTier(dateStr: string): "overdue" | "due_today" | "due_tomorrow" | "due_soon" | null {
  if (isOverdue(dateStr)) return "overdue";
  if (isDueToday(dateStr)) return "due_today";
  if (isDueTomorrow(dateStr)) return "due_tomorrow";
  if (isDueSoon(dateStr)) return "due_soon";
  return null;
}

export function daysUntilDue(dateStr: string): number {
  const todayPT = getTodayPT();
  const todayParts = todayPT.split("-").map(Number);
  const dueParts = dateStr.split("-").map(Number);
  const todayDate = new Date(todayParts[0], todayParts[1] - 1, todayParts[2]);
  const dueDate = new Date(dueParts[0], dueParts[1] - 1, dueParts[2]);
  return differenceInDays(dueDate, todayDate);
}

export function toISODateString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Parse a free-form time string (e.g. "9am", "10pm", "2:30pm") into
 * minutes since midnight for sorting. Returns Infinity if no time
 * so items without a time sort to the top of their date group.
 */
export function parseTimeToMinutes(time?: string | null): number {
  if (!time) return -1; // no time → sort before timed items
  const m = time.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return -1;
  let hours = parseInt(m[1], 10);
  const mins = m[2] ? parseInt(m[2], 10) : 0;
  const ampm = (m[3] || "").toLowerCase();
  if (ampm === "pm" && hours < 12) hours += 12;
  if (ampm === "am" && hours === 12) hours = 0;
  return hours * 60 + mins;
}

/**
 * Normalize a time string to 12-hour AM/PM format.
 * Handles: "18:00" → "6pm", "09:00" → "9am", "2:30pm" → "2:30pm", "9am" → "9am"
 */
export function normalizeTimeTo12h(time: string): string {
  // Already in 12-hour format (has am/pm)?
  if (/am|pm/i.test(time)) return time;
  // Try to parse as 24-hour "HH:MM" or "H:MM"
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return time;
  let hours = parseInt(m[1], 10);
  const mins = parseInt(m[2], 10);
  const suffix = hours >= 12 ? "pm" : "am";
  if (hours === 0) hours = 12;
  else if (hours > 12) hours -= 12;
  return mins === 0 ? `${hours}${suffix}` : `${hours}:${m[2]}${suffix}`;
}

/**
 * Format a compact date + optional time for task badges.
 * Examples: "4/9 @ 9am", "4/11 @ 10am", "4/15"
 */
export function formatDateCompact(dateStr: string, timeOfDay?: string | null): string {
  const d = parseISO(dateStr);
  const datePart = format(d, "M/d");
  if (timeOfDay) return `${datePart} @ ${normalizeTimeTo12h(timeOfDay)}`;
  return datePart;
}

/**
 * Build the full badge label for a task, including status prefix + date + time.
 * Examples: "Overdue · 4/9 @ 9am", "Due Soon · 4/11", "4/15 @ 2pm"
 */
export function taskBadgeLabel(dateStr: string, timeOfDay?: string | null): string {
  const compact = formatDateCompact(dateStr, timeOfDay);
  const tier = dueTier(dateStr);
  if (tier === "overdue") return `Overdue · ${compact}`;
  if (tier === "due_today") return `Due Today · ${compact}`;
  if (tier === "due_tomorrow") return `Due Tomorrow · ${compact}`;
  if (tier === "due_soon") return `Due Soon · ${compact}`;
  return compact;
}
