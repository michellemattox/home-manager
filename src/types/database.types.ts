export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Rel = { foreignKeyName: string; columns: string[]; isOneToOne?: boolean; referencedRelation: string; referencedColumns: string[] }[];

export interface Database {
  public: {
    Tables: {
      households: {
        Row: {
          id: string;
          name: string;
          zip_code: string | null;
          latitude: number | null;
          longitude: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          zip_code?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          zip_code?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          created_at?: string;
        };
        Relationships: Rel;
      };
      household_members: {
        Row: {
          id: string;
          household_id: string;
          user_id: string;
          display_name: string;
          role: "admin" | "member";
          color_hex: string;
          invite_token: string | null;
          joined_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          user_id: string;
          display_name: string;
          role?: "admin" | "member";
          color_hex?: string;
          invite_token?: string | null;
          joined_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          user_id?: string;
          display_name?: string;
          role?: "admin" | "member";
          color_hex?: string;
          invite_token?: string | null;
          joined_at?: string;
        };
        Relationships: Rel;
      };
      projects: {
        Row: {
          id: string;
          household_id: string;
          title: string;
          description: string | null;
          status: "planned" | "in_progress" | "completed" | "on_hold" | "finished";
          priority: "low" | "medium" | "high";
          expected_date: string | null;
          completed_at: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          title: string;
          description?: string | null;
          status?: "planned" | "in_progress" | "completed" | "on_hold" | "finished";
          priority?: "low" | "medium" | "high";
          expected_date?: string | null;
          completed_at?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          title?: string;
          description?: string | null;
          status?: "planned" | "in_progress" | "completed" | "on_hold" | "finished";
          priority?: "low" | "medium" | "high";
          expected_date?: string | null;
          completed_at?: string | null;
          created_by?: string;
          created_at?: string;
        };
        Relationships: Rel;
      };
      project_owners: {
        Row: { project_id: string; member_id: string };
        Insert: { project_id: string; member_id: string };
        Update: { project_id?: string; member_id?: string };
        Relationships: Rel;
      };
      project_updates: {
        Row: {
          id: string;
          project_id: string;
          author_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          author_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          author_id?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: Rel;
      };
      trips: {
        Row: {
          id: string;
          household_id: string;
          title: string;
          destination: string;
          departure_date: string;
          return_date: string;
          notes: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          title: string;
          destination: string;
          departure_date: string;
          return_date: string;
          notes?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          title?: string;
          destination?: string;
          departure_date?: string;
          return_date?: string;
          notes?: string | null;
          created_by?: string;
          created_at?: string;
        };
        Relationships: Rel;
      };
      trip_tasks: {
        Row: {
          id: string;
          trip_id: string;
          title: string;
          is_completed: boolean;
          completed_at: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          trip_id: string;
          title: string;
          is_completed?: boolean;
          completed_at?: string | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          trip_id?: string;
          title?: string;
          is_completed?: boolean;
          completed_at?: string | null;
          sort_order?: number;
        };
        Relationships: Rel;
      };
      trip_task_owners: {
        Row: { trip_task_id: string; member_id: string };
        Insert: { trip_task_id: string; member_id: string };
        Update: { trip_task_id?: string; member_id?: string };
        Relationships: Rel;
      };
      recurring_tasks: {
        Row: {
          id: string;
          household_id: string;
          title: string;
          description: string | null;
          category: string | null;
          frequency_type: "daily" | "weekly" | "monthly" | "yearly" | "custom";
          frequency_days: number;
          anchor_date: string;
          next_due_date: string;
          last_completed_at: string | null;
          assigned_member_id: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          title: string;
          description?: string | null;
          category?: string | null;
          frequency_type: "daily" | "weekly" | "monthly" | "yearly" | "custom";
          frequency_days: number;
          anchor_date: string;
          next_due_date: string;
          last_completed_at?: string | null;
          assigned_member_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          title?: string;
          description?: string | null;
          category?: string | null;
          frequency_type?: "daily" | "weekly" | "monthly" | "yearly" | "custom";
          frequency_days?: number;
          anchor_date?: string;
          next_due_date?: string;
          last_completed_at?: string | null;
          assigned_member_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: Rel;
      };
      recurring_task_completions: {
        Row: {
          id: string;
          recurring_task_id: string;
          completed_by: string;
          completed_at: string;
          notes: string | null;
        };
        Insert: {
          id?: string;
          recurring_task_id: string;
          completed_by: string;
          completed_at?: string;
          notes?: string | null;
        };
        Update: {
          id?: string;
          recurring_task_id?: string;
          completed_by?: string;
          completed_at?: string;
          notes?: string | null;
        };
        Relationships: Rel;
      };
      service_records: {
        Row: {
          id: string;
          household_id: string;
          vendor_name: string;
          service_type: string;
          service_date: string;
          cost_cents: number;
          notes: string | null;
          receipt_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          vendor_name: string;
          service_type: string;
          service_date: string;
          cost_cents: number;
          notes?: string | null;
          receipt_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          vendor_name?: string;
          service_type?: string;
          service_date?: string;
          cost_cents?: number;
          notes?: string | null;
          receipt_url?: string | null;
          created_at?: string;
        };
        Relationships: Rel;
      };
      idea_topics: {
        Row: {
          id: string;
          household_id: string;
          title: string;
          color_hex: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          title: string;
          color_hex?: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          title?: string;
          color_hex?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: Rel;
      };
      ideas: {
        Row: {
          id: string;
          topic_id: string;
          body: string;
          author_id: string;
          is_pinned: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          topic_id: string;
          body: string;
          author_id: string;
          is_pinned?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          topic_id?: string;
          body?: string;
          author_id?: string;
          is_pinned?: boolean;
          created_at?: string;
        };
        Relationships: Rel;
      };
      device_tokens: {
        Row: {
          id: string;
          user_id: string;
          expo_push_token: string;
          platform: "ios" | "android";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          expo_push_token: string;
          platform: "ios" | "android";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          expo_push_token?: string;
          platform?: "ios" | "android";
          created_at?: string;
        };
        Relationships: Rel;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
