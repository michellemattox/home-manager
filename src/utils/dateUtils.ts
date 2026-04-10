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

export function isDueSoon(dateStr: string, withinDays = 7): boolean {
  const todayPT = getTodayPT();
  const todayParts = todayPT.split("-").map(Number);
  const limitDate = new Date(todayParts[0], todayParts[1] - 1, todayParts[2] + withinDays);
  const limitStr = format(limitDate, "yyyy-MM-dd");
  return dateStr >= todayPT && dateStr <= limitStr;
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
 * Format a compact date + optional time for task badges.
 * Examples: "4/9 @ 9am", "4/11 @ 10am", "4/15"
 */
export function formatDateCompact(dateStr: string, timeOfDay?: string | null): string {
  const d = parseISO(dateStr);
  const datePart = format(d, "M/d");
  if (timeOfDay) return `${datePart} @ ${timeOfDay}`;
  return datePart;
}

/**
 * Build the full badge label for a task, including status prefix + date + time.
 * Examples: "Overdue · 4/9 @ 9am", "Due Soon · 4/11", "4/15 @ 2pm"
 */
export function taskBadgeLabel(dateStr: string, timeOfDay?: string | null): string {
  const compact = formatDateCompact(dateStr, timeOfDay);
  if (isOverdue(dateStr)) return `Overdue · ${compact}`;
  if (isDueSoon(dateStr)) return `Due Soon · ${compact}`;
  return compact;
}
