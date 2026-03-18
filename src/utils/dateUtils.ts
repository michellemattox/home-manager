import { format, isAfter, isBefore, addDays, parseISO, differenceInDays } from "date-fns";

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
  return isBefore(parseISO(dateStr), new Date());
}

export function isDueSoon(dateStr: string, withinDays = 7): boolean {
  const due = parseISO(dateStr);
  const now = new Date();
  return isAfter(due, now) && isBefore(due, addDays(now, withinDays));
}

export function daysUntilDue(dateStr: string): number {
  return differenceInDays(parseISO(dateStr), new Date());
}

export function toISODateString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}
