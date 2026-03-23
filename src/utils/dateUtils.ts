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
