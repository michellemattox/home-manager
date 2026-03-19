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
          category: string | null;
          estimated_cost_cents: number;
          notes: string | null;
          contractor_name: string | null;
          total_cost_cents: number;
          uses_vendor: boolean;
          primary_vendor_id: string | null;
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
          category?: string | null;
          estimated_cost_cents?: number;
          notes?: string | null;
          contractor_name?: string | null;
          total_cost_cents?: number;
          uses_vendor?: boolean;
          primary_vendor_id?: string | null;
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
          category?: string | null;
          estimated_cost_cents?: number;
          notes?: string | null;
          contractor_name?: string | null;
          total_cost_cents?: number;
          uses_vendor?: boolean;
          primary_vendor_id?: string | null;
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
      project_tasks: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          is_completed: boolean;
          completed_at: string | null;
          sort_order: number;
          created_at: string;
          checklist_name: string;
          assigned_member_id: string | null;
          due_date: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          is_completed?: boolean;
          completed_at?: string | null;
          sort_order?: number;
          created_at?: string;
          checklist_name?: string;
          assigned_member_id?: string | null;
          due_date?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          is_completed?: boolean;
          completed_at?: string | null;
          sort_order?: number;
          created_at?: string;
          checklist_name?: string;
          assigned_member_id?: string | null;
          due_date?: string | null;
          notes?: string | null;
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
          uses_vendor: boolean;
          primary_vendor_id: string | null;
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
          uses_vendor?: boolean;
          primary_vendor_id?: string | null;
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
          uses_vendor?: boolean;
          primary_vendor_id?: string | null;
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
          checklist_name: string;
          assigned_member_id: string | null;
          due_date: string | null;
        };
        Insert: {
          id?: string;
          trip_id: string;
          title: string;
          is_completed?: boolean;
          completed_at?: string | null;
          sort_order?: number;
          checklist_name?: string;
          assigned_member_id?: string | null;
          due_date?: string | null;
        };
        Update: {
          id?: string;
          trip_id?: string;
          title?: string;
          is_completed?: boolean;
          completed_at?: string | null;
          sort_order?: number;
          checklist_name?: string;
          assigned_member_id?: string | null;
          due_date?: string | null;
        };
        Relationships: Rel;
      };
      completed_checklist_items: {
        Row: {
          id: string;
          source_type: "project" | "trip";
          source_id: string;
          original_task_id: string | null;
          title: string;
          checklist_name: string;
          assigned_member_id: string | null;
          due_date: string | null;
          completed_by: string | null;
          completed_at: string;
        };
        Insert: {
          id?: string;
          source_type: "project" | "trip";
          source_id: string;
          original_task_id?: string | null;
          title: string;
          checklist_name?: string;
          assigned_member_id?: string | null;
          due_date?: string | null;
          completed_by?: string | null;
          completed_at?: string;
        };
        Update: {
          id?: string;
          source_type?: "project" | "trip";
          source_id?: string;
          original_task_id?: string | null;
          title?: string;
          checklist_name?: string;
          assigned_member_id?: string | null;
          due_date?: string | null;
          completed_by?: string | null;
          completed_at?: string;
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
          linked_event_type: "project" | "activity" | null;
          linked_event_id: string | null;
          time_of_day: string | null;
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
          linked_event_type?: "project" | "activity" | null;
          linked_event_id?: string | null;
          time_of_day?: string | null;
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
          linked_event_type?: "project" | "activity" | null;
          linked_event_id?: string | null;
          time_of_day?: string | null;
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
          event_type: "project" | "activity" | null;
          event_id: string | null;
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
          event_type?: "project" | "activity" | null;
          event_id?: string | null;
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
          event_type?: "project" | "activity" | null;
          event_id?: string | null;
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
          subject: string | null;
          description: string | null;
          status: "new" | "waitlisted" | "converted";
          converted_to_type: "task" | "project" | "activity" | null;
          converted_to_id: string | null;
        };
        Insert: {
          id?: string;
          topic_id: string;
          body?: string;
          author_id: string;
          is_pinned?: boolean;
          created_at?: string;
          subject?: string | null;
          description?: string | null;
          status?: "new" | "waitlisted" | "converted";
          converted_to_type?: "task" | "project" | "activity" | null;
          converted_to_id?: string | null;
        };
        Update: {
          id?: string;
          topic_id?: string;
          body?: string;
          author_id?: string;
          is_pinned?: boolean;
          created_at?: string;
          subject?: string | null;
          description?: string | null;
          status?: "new" | "waitlisted" | "converted";
          converted_to_type?: "task" | "project" | "activity" | null;
          converted_to_id?: string | null;
        };
        Relationships: Rel;
      };
      tasks: {
        Row: {
          id: string;
          household_id: string;
          title: string;
          notes: string | null;
          due_date: string | null;
          due_time: string | null;
          assigned_member_id: string | null;
          linked_event_type: "project" | "activity" | null;
          linked_event_id: string | null;
          is_completed: boolean;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          title: string;
          notes?: string | null;
          due_date?: string | null;
          due_time?: string | null;
          assigned_member_id?: string | null;
          linked_event_type?: "project" | "activity" | null;
          linked_event_id?: string | null;
          is_completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          title?: string;
          notes?: string | null;
          due_date?: string | null;
          due_time?: string | null;
          assigned_member_id?: string | null;
          linked_event_type?: "project" | "activity" | null;
          linked_event_id?: string | null;
          is_completed?: boolean;
          completed_at?: string | null;
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
      preferred_vendors: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          service_type: string | null;
          phone: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          service_type?: string | null;
          phone?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          service_type?: string | null;
          phone?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: Rel;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
