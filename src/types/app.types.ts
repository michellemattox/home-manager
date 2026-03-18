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

export type PreferredVendor = Database["public"]["Tables"]["preferred_vendors"]["Row"];
