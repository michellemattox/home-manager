import type { Database } from "./database.types";

export type Household = Database["public"]["Tables"]["households"]["Row"];
export type HouseholdMember =
  Database["public"]["Tables"]["household_members"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectOwner = Database["public"]["Tables"]["project_owners"]["Row"];
export type ProjectUpdate =
  Database["public"]["Tables"]["project_updates"]["Row"];
export type Trip = Database["public"]["Tables"]["trips"]["Row"];
export type TripTask = Database["public"]["Tables"]["trip_tasks"]["Row"];
export type TripTaskOwner =
  Database["public"]["Tables"]["trip_task_owners"]["Row"];
export type RecurringTask =
  Database["public"]["Tables"]["recurring_tasks"]["Row"];
export type RecurringTaskCompletion =
  Database["public"]["Tables"]["recurring_task_completions"]["Row"];
export type ServiceRecord =
  Database["public"]["Tables"]["service_records"]["Row"];
export type IdeaTopic = Database["public"]["Tables"]["idea_topics"]["Row"];
export type Idea = Database["public"]["Tables"]["ideas"]["Row"];
export type DeviceToken = Database["public"]["Tables"]["device_tokens"]["Row"];
export type ProjectTask = Database["public"]["Tables"]["project_tasks"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type PreferredVendor = Database["public"]["Tables"]["preferred_vendors"]["Row"];
export type HouseholdInvite = Database["public"]["Tables"]["household_invites"]["Row"];
export type Goal = Database["public"]["Tables"]["goals"]["Row"];
export type GoalUpdate = Database["public"]["Tables"]["goal_updates"]["Row"];

export type ProjectStatus = Project["status"];
export type ProjectPriority = Project["priority"];
export type FrequencyType = RecurringTask["frequency_type"];
export type MemberRole = HouseholdMember["role"];

export interface ProjectWithOwners extends Project {
  owners: HouseholdMember[];
  updates: ProjectUpdate[];
  project_owners: { member_id: string }[];
  project_updates: ProjectUpdate[];
  project_tasks: ProjectTask[];
}

export interface TripWithTasks extends Trip {
  tasks: TripTaskWithOwners[];
}

export interface TripTaskWithOwners extends TripTask {
  owners: HouseholdMember[];
}

export interface RecurringTaskWithMember extends RecurringTask {
  assigned_member: HouseholdMember | null;
}

export interface IdeaWithAuthor extends Idea {
  author: HouseholdMember | null;
}

export interface IdeaTopicWithIdeas extends IdeaTopic {
  ideas: IdeaWithAuthor[];
}

export interface GoalWithUpdates extends Goal {
  goal_updates: GoalUpdate[];
}

export const PROJECT_CATEGORIES = [
  "General",
  "Kitchen",
  "Bathroom",
  "HVAC",
  "Plumbing",
  "Electrical",
  "Landscaping",
  "Exterior",
  "Flooring",
  "Painting",
  "Structural",
  "Other",
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export const TASK_CATEGORIES = [
  "HVAC",
  "Plumbing",
  "Electrical",
  "Landscaping",
  "Cleaning",
  "Pest Control",
  "Appliances",
  "Roofing",
  "Gutters",
  "Other",
] as const;

export const SERVICE_TYPES = [
  "HVAC",
  "Plumbing",
  "Electrical",
  "Landscaping",
  "Window Cleaning",
  "Pest Control",
  "Appliance Repair",
  "Roofing",
  "Gutters",
  "Painting",
  "Moving",
  "Other",
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

// ── Garden ────────────────────────────────────────────────────────────────────
export type GardenPlot = Database["public"]["Tables"]["garden_plots"]["Row"];
export type GardenZone = Database["public"]["Tables"]["garden_zones"]["Row"];
export type GardenCell = Database["public"]["Tables"]["garden_cells"]["Row"];
export type GardenPlanting = Database["public"]["Tables"]["garden_plantings"]["Row"];
export type GardenHarvest = Database["public"]["Tables"]["garden_harvests"]["Row"];
export type GardenWeatherLog = Database["public"]["Tables"]["garden_weather_logs"]["Row"];
export type GardenAmendment = Database["public"]["Tables"]["garden_amendments"]["Row"];
export type AmendmentType = GardenAmendment["amendment_type"];

export const AMENDMENT_TYPES: { value: AmendmentType; label: string; emoji: string; color: string }[] = [
  { value: "fertilizer",   label: "Fertilizer",   emoji: "🌿", color: "#16a34a" },
  { value: "compost",      label: "Compost",       emoji: "♻️", color: "#92400e" },
  { value: "lime",         label: "Lime",          emoji: "🪨", color: "#6b7280" },
  { value: "mulch",        label: "Mulch",         emoji: "🍂", color: "#b45309" },
  { value: "pest_control", label: "Pest Control",  emoji: "🐛", color: "#dc2626" },
  { value: "foliar",       label: "Foliar Spray",  emoji: "💧", color: "#0891b2" },
  { value: "other",        label: "Other",         emoji: "🔧", color: "#7c3aed" },
];

export const AMENDMENT_UNITS = ["cups", "tablespoons", "lbs", "oz", "gallons", "bags", "applications"];

// Weather data shapes returned from the garden-weather Edge Function
export interface WeatherCurrent {
  temp: number;
  feelsLike: number;
  tempMin: number;
  tempMax: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  description: string;
  icon: string;
  cityName: string;
  sunrise: number;
  sunset: number;
  rainfallMm: number;
  dt: number;
}

export interface WeatherForecastDay {
  date: string;       // "YYYY-MM-DD"
  tempMin: number;
  tempMax: number;
  humidity: number;
  precipMm: number;
  condition: string;
  description: string;
  icon: string;
}

export interface WeatherResponse {
  current: WeatherCurrent;
  forecast: WeatherForecastDay[];
  loggedToday: boolean;
}

export interface GardenZoneWithCells extends GardenZone {
  cells: GardenCell[];
  plantings: GardenPlanting[];
}

export interface GardenPlotWithZones extends GardenPlot {
  zones: GardenZoneWithCells[];
  cells: GardenCell[];
}

// Plant family → rotation color mapping
export const PLANT_FAMILIES: Record<string, { label: string; color: string; bg: string }> = {
  Solanaceae:     { label: "Solanaceae",     color: "#ea580c", bg: "#fff7ed" }, // tomato, pepper, potato
  Brassicaceae:   { label: "Brassicaceae",   color: "#2563eb", bg: "#eff6ff" }, // kale, broccoli, arugula
  Leguminosae:    { label: "Leguminosae",    color: "#16a34a", bg: "#f0fdf4" }, // peas, beans
  Alliaceae:      { label: "Alliaceae",      color: "#7c3aed", bg: "#f5f3ff" }, // onion, garlic, shallot
  Asteraceae:     { label: "Asteraceae",     color: "#ca8a04", bg: "#fefce8" }, // lettuce, sunflower
  Chenopodiaceae: { label: "Chenopodiaceae", color: "#db2777", bg: "#fdf2f8" }, // beets, spinach, chard
  Cucurbitaceae:  { label: "Cucurbitaceae",  color: "#d97706", bg: "#fffbeb" }, // cucumber, squash, melon
  Apiaceae:       { label: "Apiaceae",       color: "#0891b2", bg: "#ecfeff" }, // carrot, dill, parsley
  Other:          { label: "Other",          color: "#6b7280", bg: "#f9fafb" },
};

export type GardenPestLog = Database["public"]["Tables"]["garden_pest_logs"]["Row"];
export type GardenSeedInventory = Database["public"]["Tables"]["garden_seed_inventory"]["Row"];
export type PestLogType = GardenPestLog["log_type"];

export const PEST_LOG_TYPES: { value: PestLogType; label: string; emoji: string; color: string; bg: string }[] = [
  { value: "pest",        label: "Pest",        emoji: "🐛", color: "#dc2626", bg: "#fef2f2" },
  { value: "disease",     label: "Disease",     emoji: "🍄", color: "#9333ea", bg: "#faf5ff" },
  { value: "deficiency",  label: "Deficiency",  emoji: "🌿", color: "#d97706", bg: "#fffbeb" },
  { value: "observation", label: "Observation", emoji: "👁", color: "#0891b2", bg: "#ecfeff" },
];

// ── Garden Journal + Watering (migration 038) ─────────────────────────────────

export interface GardenJournalEntry {
  id: string;
  household_id: string;
  plot_id: string | null;
  zone_id: string | null;
  planting_id: string | null;
  entry_date: string;
  title: string | null;
  body: string;
  tags: string[];
  created_at: string;
}

export type WateringMethod = "hand" | "drip" | "overhead" | "soaker";

export interface GardenWateringLog {
  id: string;
  household_id: string;
  plot_id: string | null;
  zone_id: string | null;
  water_date: string;
  duration_min: number | null;
  amount_gal: number | null;
  method: WateringMethod;
  notes: string | null;
  created_at: string;
}

export const WATERING_METHODS: { value: WateringMethod; label: string; emoji: string }[] = [
  { value: "hand",     label: "Hand",     emoji: "🪣" },
  { value: "drip",     label: "Drip",     emoji: "💧" },
  { value: "overhead", label: "Overhead", emoji: "🚿" },
  { value: "soaker",   label: "Soaker",   emoji: "🌊" },
];

export const SEVERITY_LABELS = ["", "Minimal", "Low", "Moderate", "High", "Severe"];
export const SEVERITY_COLORS = ["", "#16a34a", "#65a30d", "#d97706", "#ea580c", "#dc2626"];

// Guess plant family from plant name
export function guessFamilyFromName(name: string): string {
  const n = name.toLowerCase();
  if (/tomato|pepper|potato|eggplant|tomatillo/.test(n)) return "Solanaceae";
  if (/kale|broccoli|cabbage|cauliflower|arugula|radish|turnip|bok choy|kohlrabi|brussels/.test(n)) return "Brassicaceae";
  if (/pea|bean|lentil|soybean|clover|vetch/.test(n)) return "Leguminosae";
  if (/onion|garlic|shallot|leek|chive|scallion|green onion|walla/.test(n)) return "Alliaceae";
  if (/lettuce|sunflower|artichoke|chicory|endive|radicchio/.test(n)) return "Asteraceae";
  if (/beet|spinach|chard|quinoa|amaranth/.test(n)) return "Chenopodiaceae";
  if (/cucumber|squash|zucchini|pumpkin|melon|gourd|watermelon/.test(n)) return "Cucurbitaceae";
  if (/carrot|dill|parsley|cilantro|fennel|parsnip|celery/.test(n)) return "Apiaceae";
  return "Other";
}
