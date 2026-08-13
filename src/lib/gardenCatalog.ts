// Garden Map v2 — client-side catalogs & geometry helpers.
// Spacing defaults are Zone 8b (Seattle/PNW) rules of thumb, all editable per
// placement in the UI. Kept client-side (not in the DB) to stay nimble.

export type SupportType =
  | "teepee" | "bean_tower" | "a_frame" | "trellis"
  | "obelisk" | "arch" | "cage" | "stake" | "other";

export type HardscapeMaterial =
  | "gravel" | "wood_chips" | "pavers" | "flagstone" | "mulch" | "other";

export type FootprintShape = "rect" | "circle" | "line" | "polygon";

// ── Crop catalog ────────────────────────────────────────────────────────────
export interface CropDef {
  name: string;
  emoji: string;
  family: string | null;
  /** In-ground spacing between plants, inches. */
  spacingIn: number;
  /** Whether it commonly wants a vertical support. */
  climbs?: boolean;
}

export const CROP_CATALOG: CropDef[] = [
  { name: "Tomato", emoji: "🍅", family: "Solanaceae", spacingIn: 24 },
  { name: "Pepper", emoji: "🌶️", family: "Solanaceae", spacingIn: 18 },
  { name: "Eggplant", emoji: "🍆", family: "Solanaceae", spacingIn: 18 },
  { name: "Potato", emoji: "🥔", family: "Solanaceae", spacingIn: 12 },
  { name: "Cucumber", emoji: "🥒", family: "Cucurbitaceae", spacingIn: 12, climbs: true },
  { name: "Zucchini", emoji: "🥒", family: "Cucurbitaceae", spacingIn: 24 },
  { name: "Summer Squash", emoji: "🎃", family: "Cucurbitaceae", spacingIn: 24 },
  { name: "Delicata Squash", emoji: "🎃", family: "Cucurbitaceae", spacingIn: 30, climbs: true },
  { name: "Winter Squash", emoji: "🎃", family: "Cucurbitaceae", spacingIn: 36, climbs: true },
  { name: "Pumpkin", emoji: "🎃", family: "Cucurbitaceae", spacingIn: 36 },
  { name: "Melon", emoji: "🍈", family: "Cucurbitaceae", spacingIn: 24, climbs: true },
  { name: "Pole Bean", emoji: "🫘", family: "Fabaceae", spacingIn: 6, climbs: true },
  { name: "Bush Bean", emoji: "🫘", family: "Fabaceae", spacingIn: 4 },
  { name: "Pea", emoji: "🫛", family: "Fabaceae", spacingIn: 3, climbs: true },
  { name: "Carrot", emoji: "🥕", family: "Apiaceae", spacingIn: 3 },
  { name: "Parsnip", emoji: "🥕", family: "Apiaceae", spacingIn: 4 },
  { name: "Beet", emoji: "🫜", family: "Amaranthaceae", spacingIn: 4 },
  { name: "Chard", emoji: "🥬", family: "Amaranthaceae", spacingIn: 10 },
  { name: "Spinach", emoji: "🥬", family: "Amaranthaceae", spacingIn: 4 },
  { name: "Lettuce", emoji: "🥬", family: "Asteraceae", spacingIn: 8 },
  { name: "Arugula", emoji: "🥬", family: "Brassicaceae", spacingIn: 4 },
  { name: "Kale", emoji: "🥬", family: "Brassicaceae", spacingIn: 18 },
  { name: "Broccoli", emoji: "🥦", family: "Brassicaceae", spacingIn: 18 },
  { name: "Broccolini", emoji: "🥦", family: "Brassicaceae", spacingIn: 12 },
  { name: "Broccoli Rabe", emoji: "🥬", family: "Brassicaceae", spacingIn: 6 },
  { name: "Brussels Sprouts", emoji: "🥬", family: "Brassicaceae", spacingIn: 24 },
  { name: "Bok Choy", emoji: "🥬", family: "Brassicaceae", spacingIn: 8 },
  { name: "Cabbage", emoji: "🥬", family: "Brassicaceae", spacingIn: 18 },
  { name: "Cauliflower", emoji: "🥦", family: "Brassicaceae", spacingIn: 18 },
  { name: "Kohlrabi", emoji: "🥬", family: "Brassicaceae", spacingIn: 6 },
  { name: "Radish", emoji: "🫜", family: "Brassicaceae", spacingIn: 2 },
  { name: "Turnip", emoji: "🫜", family: "Brassicaceae", spacingIn: 4 },
  { name: "Onion", emoji: "🧅", family: "Amaryllidaceae", spacingIn: 4 },
  { name: "Garlic", emoji: "🧄", family: "Amaryllidaceae", spacingIn: 4 },
  { name: "Leek", emoji: "🧅", family: "Amaryllidaceae", spacingIn: 6 },
  { name: "Corn", emoji: "🌽", family: "Poaceae", spacingIn: 12 },
  { name: "Strawberry", emoji: "🍓", family: "Rosaceae", spacingIn: 12 },
  { name: "Basil", emoji: "🌿", family: "Lamiaceae", spacingIn: 10 },
  { name: "Cilantro", emoji: "🌿", family: "Apiaceae", spacingIn: 6 },
  { name: "Parsley", emoji: "🌿", family: "Apiaceae", spacingIn: 8 },
  { name: "Dill", emoji: "🌿", family: "Apiaceae", spacingIn: 10 },
  { name: "Mint", emoji: "🌿", family: "Lamiaceae", spacingIn: 12 },
  { name: "Marigold", emoji: "🌼", family: "Asteraceae", spacingIn: 8 },
  { name: "Nasturtium", emoji: "🌼", family: "Tropaeolaceae", spacingIn: 10 },
  { name: "Sunflower", emoji: "🌻", family: "Asteraceae", spacingIn: 12 },
];

const cropIndex: Record<string, CropDef> = Object.fromEntries(
  CROP_CATALOG.map((c) => [normalizeCropKey(c.name), c])
);

/** Normalized lookup key for a crop name (used for the carry-over prompt too). */
export function normalizeCropKey(name: string): string {
  return name.trim().toLowerCase();
}

export function findCrop(name: string): CropDef | undefined {
  return cropIndex[normalizeCropKey(name)];
}

export function cropEmoji(name: string): string {
  return findCrop(name)?.emoji ?? "🌱";
}

/** Default spacing (inches) for a crop, falling back to a safe 12". */
export function cropSpacingIn(name: string): number {
  return findCrop(name)?.spacingIn ?? 12;
}

// ── Vertical support catalog ────────────────────────────────────────────────
export interface SupportDef {
  type: SupportType;
  label: string;
  /** Icon key the UI maps to an SVG glyph. */
  icon: SupportType;
  footprint: FootprintShape;
  /** Prefilled, editable dimensions in feet. */
  defaultWidthFt: number;
  defaultLengthFt: number;
  defaultHeightFt: number;
  /** Spacing between plants attached to this support, inches. */
  defaultSpacingIn: number;
  /** How plants arrange on it — drives the fill layout. */
  arrangement: "ring" | "row" | "double_row" | "single";
  hint: string;
}

export const SUPPORT_CATALOG: SupportDef[] = [
  { type: "teepee", label: "Teepee / Tripod", icon: "teepee", footprint: "circle",
    defaultWidthFt: 3, defaultLengthFt: 3, defaultHeightFt: 6, defaultSpacingIn: 6,
    arrangement: "ring", hint: "Cucumbers, delicata, pole beans — ringed around the base" },
  { type: "bean_tower", label: "Bean tower", icon: "bean_tower", footprint: "circle",
    defaultWidthFt: 2.5, defaultLengthFt: 2.5, defaultHeightFt: 7, defaultSpacingIn: 6,
    arrangement: "ring", hint: "Round base with rope rows up to a top hub" },
  { type: "a_frame", label: "A-frame trellis", icon: "a_frame", footprint: "rect",
    defaultWidthFt: 3, defaultLengthFt: 6, defaultHeightFt: 5, defaultSpacingIn: 12,
    arrangement: "double_row", hint: "Two panels leaning together — squash, cukes" },
  { type: "trellis", label: "Flat trellis / netting", icon: "trellis", footprint: "line",
    defaultWidthFt: 6, defaultLengthFt: 0.3, defaultHeightFt: 6, defaultSpacingIn: 12,
    arrangement: "row", hint: "Vertical panel — peas, beans, cucumbers along a line" },
  { type: "obelisk", label: "Obelisk", icon: "obelisk", footprint: "rect",
    defaultWidthFt: 1.5, defaultLengthFt: 1.5, defaultHeightFt: 6, defaultSpacingIn: 8,
    arrangement: "ring", hint: "Four-sided decorative tower" },
  { type: "arch", label: "Arch / Arbor", icon: "arch", footprint: "rect",
    defaultWidthFt: 4, defaultLengthFt: 2, defaultHeightFt: 7, defaultSpacingIn: 12,
    arrangement: "double_row", hint: "Spans a path; climbers up both sides" },
  { type: "cage", label: "Tomato cage", icon: "cage", footprint: "circle",
    defaultWidthFt: 1.5, defaultLengthFt: 1.5, defaultHeightFt: 4, defaultSpacingIn: 0,
    arrangement: "single", hint: "Supports a single plant" },
  { type: "stake", label: "Stake", icon: "stake", footprint: "circle",
    defaultWidthFt: 0.3, defaultLengthFt: 0.3, defaultHeightFt: 6, defaultSpacingIn: 0,
    arrangement: "single", hint: "Single stake support" },
];

const supportIndex: Record<string, SupportDef> = Object.fromEntries(
  SUPPORT_CATALOG.map((s) => [s.type, s])
);

export function findSupport(type: string): SupportDef | undefined {
  return supportIndex[type];
}

// ── Hardscape material catalog ──────────────────────────────────────────────
export interface MaterialDef {
  material: HardscapeMaterial;
  label: string;
}
export const MATERIAL_CATALOG: MaterialDef[] = [
  { material: "gravel", label: "Gravel" },
  { material: "wood_chips", label: "Wood chips" },
  { material: "pavers", label: "Pavers" },
  { material: "flagstone", label: "Flagstone" },
  { material: "mulch", label: "Bark mulch" },
  { material: "other", label: "Other" },
];

// ── Watering schedule ───────────────────────────────────────────────────────
// Target: water every 3 days, tightening to every 2 when it's been hot (>85°F).
// Significant rain counts as a watering for every garden. All editable here.
export const WATERING = {
  intervalDays: 3,
  hotIntervalDays: 2,
  hotThresholdF: 85,
  rainWateringMm: 5,
  /** Look back this many days of weather to decide if it's "been hot". */
  hotLookbackDays: 3,
};

type Weatherish = { log_date: string; rainfall_mm: number | null; temp_high_f: number | null };

const dayMs = 86400000;
const parseDay = (d: string) => new Date(d + "T12:00:00");
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const daysBetween = (from: string, to: string) =>
  Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / dayMs);
export const addDaysISO = (d: string, n: number) =>
  new Date(parseDay(d).getTime() + n * dayMs).toISOString().slice(0, 10);

/** Dates (YYYY-MM-DD) where rainfall was heavy enough to count as a watering. */
export function significantRainDates(weather: Weatherish[]): string[] {
  return weather.filter((w) => (w.rainfall_mm ?? 0) >= WATERING.rainWateringMm).map((w) => w.log_date);
}

/** Has a recent day hit the hot threshold? (tightens the interval to 2 days) */
export function isHotRecently(weather: Weatherish[], today = todayISO()): boolean {
  return weather.some(
    (w) => (w.temp_high_f ?? 0) >= WATERING.hotThresholdF && daysBetween(w.log_date, today) <= WATERING.hotLookbackDays && daysBetween(w.log_date, today) >= 0
  );
}

export type WaterStatus = {
  lastWatered: string | null;
  intervalDays: number;
  nextDue: string | null;
  /** >0 overdue by N days, 0 due today, <0 days remaining. 999 = never watered. */
  daysOverdue: number;
  due: boolean;
  hot: boolean;
};

/** Compute a garden's watering status from its own waterings + shared rain days. */
export function computeWaterStatus(
  areaWaterDates: string[], rainDates: string[], hot: boolean, today = todayISO()
): WaterStatus {
  const intervalDays = hot ? WATERING.hotIntervalDays : WATERING.intervalDays;
  const all = [...areaWaterDates, ...rainDates].filter(Boolean).sort();
  const lastWatered = all.length ? all[all.length - 1] : null;
  if (!lastWatered) return { lastWatered: null, intervalDays, nextDue: null, daysOverdue: 999, due: true, hot };
  const nextDue = addDaysISO(lastWatered, intervalDays);
  const daysOverdue = daysBetween(nextDue, today);
  return { lastWatered, intervalDays, nextDue, daysOverdue, due: daysOverdue >= 0, hot };
}

// ── Geometry / capacity helpers ─────────────────────────────────────────────
export const inchesToFeet = (inch: number) => inch / 12;
export const feetToInches = (ft: number) => ft * 12;

/** Area of a bed footprint in square feet (rect/circle; polygon via shoelace). */
export function bedAreaSqFt(bed: {
  shape: string; width_ft: number | null; length_ft: number | null;
  points?: { x: number; y: number }[] | null;
}): number {
  if (bed.shape === "circle") {
    const r = (bed.width_ft ?? 0) / 2;
    return Math.PI * r * r;
  }
  if (bed.shape === "polygon" && bed.points && bed.points.length >= 3) {
    let a = 0;
    const p = bed.points;
    for (let i = 0; i < p.length; i++) {
      const j = (i + 1) % p.length;
      a += p[i].x * p[j].y - p[j].x * p[i].y;
    }
    return Math.abs(a) / 2;
  }
  return (bed.width_ft ?? 0) * (bed.length_ft ?? 0);
}

/**
 * Rough "how many fit" for a bed given a crop spacing (inches). Square-grid
 * estimate: one plant per (spacing × spacing) cell, 90% packing allowance.
 */
export function plantsThatFit(areaSqFt: number, spacingIn: number): number {
  const s = inchesToFeet(Math.max(spacingIn, 1));
  return Math.max(0, Math.floor((areaSqFt / (s * s)) * 0.9));
}

/** How many plants fit along a straight run (feet) at a given spacing (inches). */
export function fitAlongRow(lengthFt: number, spacingIn: number): number {
  if (spacingIn <= 0) return 1;
  return Math.max(1, Math.floor(feetToInches(lengthFt) / spacingIn) + 1);
}

/** Ray-casting point-in-polygon test. `poly` is a ring of {x,y} in feet. */
export function pointInPolygon(x: number, y: number, poly: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    const intersect = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Axis-aligned bounding box of a set of points. */
export function pointsBBox(pts: { x: number; y: number }[]) {
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
}

/** How many plants ring a circular support of the given diameter (feet). */
export function fitAroundRing(diameterFt: number, spacingIn: number): number {
  if (spacingIn <= 0) return 1;
  const circumferenceIn = Math.PI * feetToInches(diameterFt);
  return Math.max(1, Math.floor(circumferenceIn / spacingIn));
}

/** Capacity of a support, based on its arrangement + dimensions. */
export function supportCapacity(s: {
  support_type: string; width_ft: number | null; length_ft: number | null;
  default_spacing_in: number | null;
}): number {
  const def = findSupport(s.support_type);
  const spacing = s.default_spacing_in ?? def?.defaultSpacingIn ?? 6;
  const arrangement = def?.arrangement ?? "row";
  const w = s.width_ft ?? def?.defaultWidthFt ?? 3;
  const l = s.length_ft ?? def?.defaultLengthFt ?? 3;
  switch (arrangement) {
    case "single": return 1;
    case "ring": return fitAroundRing(w, spacing);
    case "row": return fitAlongRow(w, spacing);
    case "double_row": return fitAlongRow(l, spacing) * 2;
    default: return fitAlongRow(w, spacing);
  }
}
