import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  parseISO,
  format,
} from "date-fns";
import type { FrequencyType } from "@/types/app.types";

export function calculateNextDueDate(
  frequencyType: FrequencyType,
  frequencyDays: number,
  fromDate: Date = new Date()
): string {
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
    default:
      next = addDays(fromDate, frequencyDays);
  }
  return format(next, "yyyy-MM-dd");
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
    default:
      return "Custom";
  }
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
