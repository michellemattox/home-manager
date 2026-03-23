import { format, addDays, differenceInDays } from "date-fns";

// ── Zone 8b / Seattle frost dates ─────────────────────────────────────────────
export const LAST_SPRING_FROST = { month: 2, day: 15 }; // March 15 (month is 0-indexed)
export const FIRST_FALL_FROST  = { month: 10, day: 15 }; // November 15

export function getFrostDates(year: number) {
  return {
    lastSpringFrost: new Date(year, LAST_SPRING_FROST.month, LAST_SPRING_FROST.day),
    firstFallFrost:  new Date(year, FIRST_FALL_FROST.month,  FIRST_FALL_FROST.day),
  };
}

// ── Data types ────────────────────────────────────────────────────────────────
export interface SuccessionCrop {
  id: string;
  name: string;
  family: string;
  daysToMaturity: [number, number];
  startIndoorsWeeks: number | null;
  directSowSpring: { weeksOffset: number; afterFrost: boolean; label: string } | null;
  directSowFall: { weeksBeforeFallFrost: number; label: string } | null;
  successionIntervalDays: number | null;
  maxSuccessions: number | null;
  zone8bNotes: string;
}

export interface SuccessionDate {
  number: number;
  sowDate: Date;
  harvestStart: Date;
  harvestEnd: Date;
}

export type CropStatus =
  | "start_indoors_now"
  | "start_indoors_soon"
  | "direct_sow_now"
  | "direct_sow_soon"
  | "fall_sow_now"
  | "fall_sow_soon"
  | "in_season"
  | "past_season"
  | "dormant";

// ── Crop data — Zone 8b (Seattle) ─────────────────────────────────────────────
export const SUCCESSION_CROPS: SuccessionCrop[] = [
  {
    id: "tomato",
    name: "Tomato",
    family: "Solanaceae",
    daysToMaturity: [60, 85],
    startIndoorsWeeks: 7,
    directSowSpring: null,
    directSowFall: null,
    successionIntervalDays: null,
    maxSuccessions: null,
    zone8bNotes: "Start indoors Feb 1–15. Transplant after last frost once soil ≥60°F. Indeterminate varieties produce until November frost. In 8b you often get a summer harvest and a Sept/Oct flush. Choose shorter-season varieties (Early Girl, Stupice) for reliability.",
  },
  {
    id: "pepper",
    name: "Pepper",
    family: "Solanaceae",
    daysToMaturity: [70, 90],
    startIndoorsWeeks: 9,
    directSowSpring: null,
    directSowFall: null,
    successionIntervalDays: null,
    maxSuccessions: null,
    zone8bNotes: "Start indoors Jan 15–Feb 1. Peppers need warmth; don't transplant until soil ≥65°F (late Mar–Apr). Use row cover to boost heat in Seattle's cooler summers. Harvest through October.",
  },
  {
    id: "potato",
    name: "Potato",
    family: "Solanaceae",
    daysToMaturity: [70, 120],
    startIndoorsWeeks: null,
    directSowSpring: { weeksOffset: 0, afterFrost: true, label: "Plant tubers at last frost (mid-Mar)" },
    directSowFall: null,
    successionIntervalDays: 14,
    maxSuccessions: 2,
    zone8bNotes: "Plant seed potatoes Mar 15–Apr 15. Earlies mature by July, main crop Aug–Sept. A second planting 2 weeks after the first staggers harvest. Avoid rotating into beds previously used for tomatoes/peppers.",
  },
  {
    id: "peas_snap",
    name: "Peas (Snap & Snow)",
    family: "Leguminosae",
    daysToMaturity: [55, 70],
    startIndoorsWeeks: null,
    directSowSpring: { weeksOffset: 6, afterFrost: false, label: "6–8 wks before last frost (late Jan–Feb)" },
    directSowFall: { weeksBeforeFallFrost: 12, label: "12 wks before fall frost (mid-Aug)" },
    successionIntervalDays: 14,
    maxSuccessions: 3,
    zone8bNotes: "Seattle's most reliable spring crop. Sow Jan 15–Mar 1 for spring harvest Apr–June. Fall sow mid-Aug for Oct harvest. Peas stop producing when temps consistently exceed 80°F. Inoculate seeds with rhizobium in new beds.",
  },
  {
    id: "kale",
    name: "Kale",
    family: "Brassicaceae",
    daysToMaturity: [50, 65],
    startIndoorsWeeks: 6,
    directSowSpring: { weeksOffset: 4, afterFrost: false, label: "4–6 wks before last frost (Feb)" },
    directSowFall: { weeksBeforeFallFrost: 8, label: "8 wks before fall frost (mid-Sept)" },
    successionIntervalDays: 21,
    maxSuccessions: null,
    zone8bNotes: "Nearly year-round in Zone 8b. Sow Feb–Mar for summer production, Aug–Sept for overwintering. Lacinato (Tuscan) kale is especially cold-hardy. Flavor improves after frost. Harvest outer leaves continuously for ongoing production.",
  },
  {
    id: "lettuce",
    name: "Lettuce",
    family: "Asteraceae",
    daysToMaturity: [45, 60],
    startIndoorsWeeks: 4,
    directSowSpring: { weeksOffset: 4, afterFrost: false, label: "4–6 wks before last frost (Feb–Mar)" },
    directSowFall: { weeksBeforeFallFrost: 10, label: "10 wks before fall frost (Sept 1)" },
    successionIntervalDays: 14,
    maxSuccessions: null,
    zone8bNotes: "Perfect succession crop for Seattle. Sow every 2 weeks Feb through Apr for continuous spring harvest. Bolts in summer heat (July–Aug); pause and resume Aug–Sept for fall. Butterhead and looseleaf varieties are most heat-tolerant.",
  },
  {
    id: "arugula",
    name: "Arugula",
    family: "Brassicaceae",
    daysToMaturity: [35, 45],
    startIndoorsWeeks: null,
    directSowSpring: { weeksOffset: 6, afterFrost: false, label: "6 wks before last frost (Feb 1)" },
    directSowFall: { weeksBeforeFallFrost: 8, label: "8 wks before fall frost (mid-Sept)" },
    successionIntervalDays: 14,
    maxSuccessions: null,
    zone8bNotes: "Fast-maturing and cold-hardy. One of the easiest succession crops for Seattle. Sow Feb through March for spring, Aug–Sept for fall. Bolts quickly in summer heat. Can overwinter under row cover.",
  },
  {
    id: "beets",
    name: "Beets",
    family: "Chenopodiaceae",
    daysToMaturity: [50, 70],
    startIndoorsWeeks: null,
    directSowSpring: { weeksOffset: 4, afterFrost: false, label: "4 wks before last frost (mid-Feb)" },
    directSowFall: { weeksBeforeFallFrost: 10, label: "10 wks before fall frost (Sept 1)" },
    successionIntervalDays: 21,
    maxSuccessions: 3,
    zone8bNotes: "Direct sow Feb 15–Apr 15 for spring/summer harvest. Sow again Aug–Sept for fall/winter roots — beets store well in the ground. Thin to 3 inches; use thinnings as greens. Both roots and tops are edible.",
  },
  {
    id: "onion_bulbing",
    name: "Onion (Bulbing)",
    family: "Alliaceae",
    daysToMaturity: [100, 120],
    startIndoorsWeeks: 11,
    directSowSpring: { weeksOffset: -4, afterFrost: true, label: "Plant sets/transplants Feb–Mar 15" },
    directSowFall: null,
    successionIntervalDays: null,
    maxSuccessions: null,
    zone8bNotes: "Seattle is long-day country (>14 hrs). Use long-day varieties: Walla Walla, Yellow Granex, Red Wing. Start indoors Jan 1–15 or plant sets Feb–Mar. Harvest July–Aug when tops fall. Cure 2–4 weeks before storage.",
  },
  {
    id: "green_onion",
    name: "Green Onion / Scallion",
    family: "Alliaceae",
    daysToMaturity: [60, 70],
    startIndoorsWeeks: null,
    directSowSpring: { weeksOffset: 6, afterFrost: false, label: "6 wks before last frost (Feb 1)" },
    directSowFall: { weeksBeforeFallFrost: 8, label: "8 wks before fall frost (mid-Sept)" },
    successionIntervalDays: 21,
    maxSuccessions: null,
    zone8bNotes: "Fast, easy succession crop. Sow directly Feb–Apr and Aug–Sept. Hardy enough to overwinter in 8b. Harvest at any size. Sow every 3 weeks for a continuous supply.",
  },
  {
    id: "shallots",
    name: "Shallots",
    family: "Alliaceae",
    daysToMaturity: [90, 120],
    startIndoorsWeeks: null,
    directSowSpring: { weeksOffset: 4, afterFrost: false, label: "Plant sets Feb 15–Mar 15" },
    directSowFall: { weeksBeforeFallFrost: 26, label: "Plant sets in Oct for overwintered crop" },
    successionIntervalDays: null,
    maxSuccessions: null,
    zone8bNotes: "Plant sets Feb–Mar for summer harvest (July–Aug). OR plant in Oct for an overwintered crop harvested in June — fall planting often yields larger bulbs. Cure like onions: 2 weeks in a warm, dry location.",
  },
  {
    id: "carrots",
    name: "Carrots",
    family: "Apiaceae",
    daysToMaturity: [70, 80],
    startIndoorsWeeks: null,
    directSowSpring: { weeksOffset: 4, afterFrost: false, label: "4 wks before last frost (Feb 15)" },
    directSowFall: { weeksBeforeFallFrost: 12, label: "12 wks before fall frost (mid-Aug)" },
    successionIntervalDays: 21,
    maxSuccessions: 4,
    zone8bNotes: "Sow every 3 weeks Feb through June for staggered harvest. Fall sow mid-Aug — carrots left in ground through frost taste sweeter. Keep well-weeded and consistently watered to prevent forking. Use loose, deep soil.",
  },
  {
    id: "beans",
    name: "Beans (Bush & Pole)",
    family: "Leguminosae",
    daysToMaturity: [50, 65],
    startIndoorsWeeks: null,
    directSowSpring: { weeksOffset: 2, afterFrost: true, label: "2 wks after last frost, soil ≥60°F (Apr 1+)" },
    directSowFall: null,
    successionIntervalDays: 14,
    maxSuccessions: 4,
    zone8bNotes: "Do not sow until soil is consistently 60°F+ (usually Apr 1 in Seattle). Succession sow every 2 weeks through mid-May. Pole beans are more productive per square foot; bush beans faster to first harvest. Frost-sensitive — cover if late frost threatens.",
  },
  {
    id: "cucumber",
    name: "Cucumber",
    family: "Cucurbitaceae",
    daysToMaturity: [55, 65],
    startIndoorsWeeks: 3,
    directSowSpring: { weeksOffset: 2, afterFrost: true, label: "Direct sow Apr 1+ or transplant late Mar" },
    directSowFall: null,
    successionIntervalDays: 21,
    maxSuccessions: 2,
    zone8bNotes: "Seattle summers are marginal for cucumbers — use row cover early season and choose short-season varieties (Marketmore 76, Spacemaster). Start indoors mid-Feb in peat pots; transplant after last frost. A second sowing 3 weeks later extends harvest into September.",
  },
  {
    id: "squash",
    name: "Squash & Zucchini",
    family: "Cucurbitaceae",
    daysToMaturity: [45, 55],
    startIndoorsWeeks: 3,
    directSowSpring: { weeksOffset: 1, afterFrost: true, label: "Direct sow or transplant after last frost (late Mar)" },
    directSowFall: null,
    successionIntervalDays: null,
    maxSuccessions: null,
    zone8bNotes: "Zucchini is extremely productive in 8b — one or two plants is typically enough. Start indoors late Feb, transplant after last frost. Winter squash (Delicata, Butternut) direct sow May 1; they need 90–110 frost-free days, which 8b can just barely provide.",
  },
  {
    id: "spinach",
    name: "Spinach",
    family: "Chenopodiaceae",
    daysToMaturity: [37, 50],
    startIndoorsWeeks: null,
    directSowSpring: { weeksOffset: 6, afterFrost: false, label: "6–8 wks before last frost (Jan 15–Feb 1)" },
    directSowFall: { weeksBeforeFallFrost: 8, label: "8 wks before fall frost (mid-Sept)" },
    successionIntervalDays: 14,
    maxSuccessions: null,
    zone8bNotes: "One of Seattle's first spring crops — extremely cold-hardy. Sow Jan–Feb under row cover, harvest Mar–May. Bolts fast in heat; stop sowing by May. Resume Aug–Sept for fall crop that often overwinters. Bloomsdale Long Standing and Tyee are heat-tolerant varieties.",
  },
  {
    id: "chard",
    name: "Swiss Chard",
    family: "Chenopodiaceae",
    daysToMaturity: [50, 60],
    startIndoorsWeeks: 4,
    directSowSpring: { weeksOffset: 4, afterFrost: false, label: "4 wks before last frost (Feb 15)" },
    directSowFall: { weeksBeforeFallFrost: 8, label: "8 wks before fall frost (mid-Sept)" },
    successionIntervalDays: null,
    maxSuccessions: null,
    zone8bNotes: "Extremely reliable in Zone 8b — tolerates both cold and moderate heat. One sowing can produce for 6–8 months with regular harvesting of outer leaves. Overwinters reliably in 8b with light protection.",
  },
  {
    id: "radish",
    name: "Radish",
    family: "Brassicaceae",
    daysToMaturity: [22, 30],
    startIndoorsWeeks: null,
    directSowSpring: { weeksOffset: 6, afterFrost: false, label: "6 wks before last frost (Feb 1)" },
    directSowFall: { weeksBeforeFallFrost: 6, label: "6 wks before fall frost (Oct 1)" },
    successionIntervalDays: 10,
    maxSuccessions: null,
    zone8bNotes: "Fastest crop in the garden — harvest in 3–4 weeks. Sow Feb 1 every 10 days through April, pause for summer heat, resume Sept–Oct. Use as row markers between slower crops. Watermelon radish and daikon are great fall/winter varieties.",
  },
  {
    id: "broccoli",
    name: "Broccoli",
    family: "Brassicaceae",
    daysToMaturity: [60, 80],
    startIndoorsWeeks: 7,
    directSowSpring: { weeksOffset: 4, afterFrost: false, label: "Transplant 4 wks before last frost (Feb 15)" },
    directSowFall: { weeksBeforeFallFrost: 14, label: "Start indoors early July, transplant Aug 1" },
    successionIntervalDays: null,
    maxSuccessions: null,
    zone8bNotes: "Start indoors Jan 15–Feb 1 for spring transplant. The fall crop is more reliable in Seattle — start indoors early July and transplant Aug 1. Fall broccoli benefits from cool, damp autumn; heads are tighter and sweeter. Side shoots continue after main head harvest.",
  },
  {
    id: "cabbage",
    name: "Cabbage",
    family: "Brassicaceae",
    daysToMaturity: [70, 120],
    startIndoorsWeeks: 8,
    directSowSpring: { weeksOffset: 4, afterFrost: false, label: "Transplant Feb 15–Mar 15" },
    directSowFall: { weeksBeforeFallFrost: 16, label: "Start indoors early July, transplant Aug 1" },
    successionIntervalDays: null,
    maxSuccessions: null,
    zone8bNotes: "Early varieties (Golden Acre, Parel) mature in 70 days. Storage types (Late Flat Dutch) take 120 days. Seattle fall/winter cabbage is outstanding — plant July starts for Nov–Jan harvest. Savoy types are most frost-tolerant.",
  },
  {
    id: "celery",
    name: "Celery",
    family: "Apiaceae",
    daysToMaturity: [100, 130],
    startIndoorsWeeks: 11,
    directSowSpring: null,
    directSowFall: null,
    successionIntervalDays: null,
    maxSuccessions: null,
    zone8bNotes: "Start indoors Jan 1–15 for transplant late March. Demands consistently moist, fertile soil. Blanch stalks 2 weeks before harvest by mounding soil or wrapping in cardboard. Cutting celery (leaf celery) is much easier to grow.",
  },
];

// ── Calculation helpers ───────────────────────────────────────────────────────

export function getStartIndoorsWindow(crop: SuccessionCrop, today: Date): { earliest: Date; latest: Date; label: string } | null {
  if (!crop.startIndoorsWeeks) return null;
  const { lastSpringFrost } = getFrostDates(today.getFullYear());
  const target = addDays(lastSpringFrost, -(crop.startIndoorsWeeks * 7));
  return {
    earliest: addDays(target, -7),
    latest:   addDays(target, 7),
    label: format(target, "MMM d"),
  };
}

export function getDirectSowSpringWindow(crop: SuccessionCrop, today: Date): { earliest: Date; latest: Date; label: string } | null {
  if (!crop.directSowSpring) return null;
  const { lastSpringFrost } = getFrostDates(today.getFullYear());
  const offsetDays = crop.directSowSpring.afterFrost
    ? crop.directSowSpring.weeksOffset * 7
    : -(crop.directSowSpring.weeksOffset * 7);
  const target = addDays(lastSpringFrost, offsetDays);
  return {
    earliest: addDays(target, -7),
    latest:   addDays(target, 14),
    label: format(target, "MMM d"),
  };
}

export function getDirectSowFallWindow(crop: SuccessionCrop, today: Date): { earliest: Date; latest: Date; label: string } | null {
  if (!crop.directSowFall) return null;
  const { firstFallFrost } = getFrostDates(today.getFullYear());
  const target = addDays(firstFallFrost, -(crop.directSowFall.weeksBeforeFallFrost * 7));
  return {
    earliest: addDays(target, -7),
    latest:   addDays(target, 7),
    label: format(target, "MMM d"),
  };
}

export function getSuccessionSchedule(crop: SuccessionCrop, today: Date, startDate: Date): SuccessionDate[] {
  if (!crop.successionIntervalDays) return [];
  const { firstFallFrost } = getFrostDates(today.getFullYear());
  const results: SuccessionDate[] = [];
  let sow = startDate;
  let n = 0;
  const maxN = crop.maxSuccessions ?? 20;

  while (n < maxN) {
    const harvestStart = addDays(sow, crop.daysToMaturity[0]);
    const harvestEnd   = addDays(sow, crop.daysToMaturity[1]);
    // Stop if harvest wouldn't complete before fall frost
    if (harvestStart > firstFallFrost) break;
    results.push({ number: n + 1, sowDate: sow, harvestStart, harvestEnd });
    sow = addDays(sow, crop.successionIntervalDays);
    n++;
  }
  return results;
}

export function getCropStatus(crop: SuccessionCrop, today: Date): CropStatus {
  const indoors = getStartIndoorsWindow(crop, today);
  const spring  = getDirectSowSpringWindow(crop, today);
  const fall    = getDirectSowFallWindow(crop, today);

  const inWindow = (w: { earliest: Date; latest: Date } | null) =>
    w && today >= w.earliest && today <= w.latest;
  const soonWindow = (w: { earliest: Date; latest: Date } | null) =>
    w && today < w.earliest && differenceInDays(w.earliest, today) <= 21;

  if (inWindow(indoors))  return "start_indoors_now";
  if (soonWindow(indoors)) return "start_indoors_soon";
  if (inWindow(spring))   return "direct_sow_now";
  if (soonWindow(spring)) return "direct_sow_soon";
  if (inWindow(fall))     return "fall_sow_now";
  if (soonWindow(fall))   return "fall_sow_soon";

  const { lastSpringFrost, firstFallFrost } = getFrostDates(today.getFullYear());
  if (today >= lastSpringFrost && today <= firstFallFrost) return "in_season";
  if (today > firstFallFrost) return "past_season";
  return "dormant";
}

export const CROP_STATUS_LABELS: Record<CropStatus, { label: string; color: string; bg: string }> = {
  start_indoors_now:  { label: "Start Indoors Now",    color: "#16a34a", bg: "#f0fdf4" },
  start_indoors_soon: { label: "Start Indoors Soon",   color: "#0891b2", bg: "#ecfeff" },
  direct_sow_now:     { label: "Direct Sow Now",       color: "#16a34a", bg: "#f0fdf4" },
  direct_sow_soon:    { label: "Direct Sow Soon",      color: "#0891b2", bg: "#ecfeff" },
  fall_sow_now:       { label: "Fall Sow Now",         color: "#d97706", bg: "#fffbeb" },
  fall_sow_soon:      { label: "Fall Sow Soon",        color: "#ca8a04", bg: "#fefce8" },
  in_season:          { label: "In Season",            color: "#7c3aed", bg: "#f5f3ff" },
  past_season:        { label: "Past Season",          color: "#6b7280", bg: "#f9fafb" },
  dormant:            { label: "Off Season",           color: "#9ca3af", bg: "#f9fafb" },
};
