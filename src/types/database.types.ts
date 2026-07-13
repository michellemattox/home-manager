export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      completed_checklist_items: {
        Row: {
          assigned_member_id: string | null
          checklist_name: string
          completed_at: string | null
          completed_by: string | null
          due_date: string | null
          id: string
          original_task_id: string | null
          source_id: string
          source_type: string
          title: string
        }
        Insert: {
          assigned_member_id?: string | null
          checklist_name?: string
          completed_at?: string | null
          completed_by?: string | null
          due_date?: string | null
          id?: string
          original_task_id?: string | null
          source_id: string
          source_type: string
          title: string
        }
        Update: {
          assigned_member_id?: string | null
          checklist_name?: string
          completed_at?: string | null
          completed_by?: string | null
          due_date?: string | null
          id?: string
          original_task_id?: string | null
          source_id?: string
          source_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "completed_checklist_items_assigned_member_id_fkey"
            columns: ["assigned_member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "completed_checklist_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string | null
          expo_push_token: string
          id: string
          platform: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expo_push_token: string
          id?: string
          platform: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expo_push_token?: string
          id?: string
          platform?: string
          user_id?: string
        }
        Relationships: []
      }
      garden_advisor_recommendations: {
        Row: {
          action_label: string | null
          action_type: string
          created_at: string | null
          details: string | null
          generated_date: string
          household_id: string
          id: string
          priority: string
          recommendation: string
          status: string
        }
        Insert: {
          action_label?: string | null
          action_type?: string
          created_at?: string | null
          details?: string | null
          generated_date?: string
          household_id: string
          id?: string
          priority?: string
          recommendation: string
          status?: string
        }
        Update: {
          action_label?: string | null
          action_type?: string
          created_at?: string | null
          details?: string | null
          generated_date?: string
          household_id?: string
          id?: string
          priority?: string
          recommendation?: string
          status?: string
        }
        Relationships: []
      }
      garden_amendments: {
        Row: {
          amendment_type: string
          amount: number | null
          application_date: string
          created_at: string
          household_id: string
          id: string
          notes: string | null
          plot_id: string
          product_name: string
          unit: string | null
          zone_id: string | null
        }
        Insert: {
          amendment_type?: string
          amount?: number | null
          application_date?: string
          created_at?: string
          household_id: string
          id?: string
          notes?: string | null
          plot_id: string
          product_name: string
          unit?: string | null
          zone_id?: string | null
        }
        Update: {
          amendment_type?: string
          amount?: number | null
          application_date?: string
          created_at?: string
          household_id?: string
          id?: string
          notes?: string | null
          plot_id?: string
          product_name?: string
          unit?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "garden_amendments_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garden_amendments_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "garden_plots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garden_amendments_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "garden_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      garden_cells: {
        Row: {
          col: number
          created_at: string
          household_id: string
          id: string
          plot_id: string
          row: number
          zone_id: string | null
        }
        Insert: {
          col: number
          created_at?: string
          household_id: string
          id?: string
          plot_id: string
          row: number
          zone_id?: string | null
        }
        Update: {
          col?: number
          created_at?: string
          household_id?: string
          id?: string
          plot_id?: string
          row?: number
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "garden_cells_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garden_cells_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "garden_plots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garden_cells_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "garden_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      garden_harvests: {
        Row: {
          created_at: string
          date: string
          household_id: string
          id: string
          notes: string | null
          planting_id: string
          plot_id: string
          quantity_unit: string | null
          quantity_value: number | null
        }
        Insert: {
          created_at?: string
          date?: string
          household_id: string
          id?: string
          notes?: string | null
          planting_id: string
          plot_id: string
          quantity_unit?: string | null
          quantity_value?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          household_id?: string
          id?: string
          notes?: string | null
          planting_id?: string
          plot_id?: string
          quantity_unit?: string | null
          quantity_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "garden_harvests_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garden_harvests_planting_id_fkey"
            columns: ["planting_id"]
            isOneToOne: false
            referencedRelation: "garden_plantings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garden_harvests_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "garden_plots"
            referencedColumns: ["id"]
          },
        ]
      }
      garden_journal_entries: {
        Row: {
          body: string
          created_at: string
          entry_date: string
          household_id: string
          id: string
          planting_id: string | null
          plot_id: string | null
          tags: string[]
          title: string | null
          zone_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          entry_date?: string
          household_id: string
          id?: string
          planting_id?: string | null
          plot_id?: string | null
          tags?: string[]
          title?: string | null
          zone_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          entry_date?: string
          household_id?: string
          id?: string
          planting_id?: string | null
          plot_id?: string | null
          tags?: string[]
          title?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "garden_journal_entries_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garden_journal_entries_planting_id_fkey"
            columns: ["planting_id"]
            isOneToOne: false
            referencedRelation: "garden_plantings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garden_journal_entries_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "garden_plots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garden_journal_entries_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "garden_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      garden_pest_logs: {
        Row: {
          ai_identification: Json | null
          created_at: string | null
          household_id: string
          id: string
          log_type: string
          name: string
          notes: string | null
          observation_date: string
          photo_url: string | null
          planting_id: string | null
          plot_id: string
          resolved: boolean
          severity: number | null
          treatment: string | null
          zone_id: string | null
        }
        Insert: {
          ai_identification?: Json | null
          created_at?: string | null
          household_id: string
          id?: string
          log_type?: string
          name: string
          notes?: string | null
          observation_date?: string
          photo_url?: string | null
          planting_id?: string | null
          plot_id: string
          resolved?: boolean
          severity?: number | null
          treatment?: string | null
          zone_id?: string | null
        }
        Update: {
          ai_identification?: Json | null
          created_at?: string | null
          household_id?: string
          id?: string
          log_type?: string
          name?: string
          notes?: string | null
          observation_date?: string
          photo_url?: string | null
          planting_id?: string | null
          plot_id?: string
          resolved?: boolean
          severity?: number | null
          treatment?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "garden_pest_logs_planting_id_fkey"
            columns: ["planting_id"]
            isOneToOne: false
            referencedRelation: "garden_plantings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garden_pest_logs_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "garden_plots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garden_pest_logs_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "garden_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      garden_plantings: {
        Row: {
          created_at: string
          date_planted: string | null
          date_removed: string | null
          germination_date: string | null
          germination_notes: string | null
          household_id: string
          id: string
          notes: string | null
          plant_family: string | null
          plant_name: string
          plot_id: string
          season_year: number
          seedlings_emerged: number | null
          start_type: string | null
          variety: string | null
          zone_id: string | null
        }
        Insert: {
          created_at?: string
          date_planted?: string | null
          date_removed?: string | null
          germination_date?: string | null
          germination_notes?: string | null
          household_id: string
          id?: string
          notes?: string | null
          plant_family?: string | null
          plant_name: string
          plot_id: string
          season_year?: number
          seedlings_emerged?: number | null
          start_type?: string | null
          variety?: string | null
          zone_id?: string | null
        }
        Update: {
          created_at?: string
          date_planted?: string | null
          date_removed?: string | null
          germination_date?: string | null
          germination_notes?: string | null
          household_id?: string
          id?: string
          notes?: string | null
          plant_family?: string | null
          plant_name?: string
          plot_id?: string
          season_year?: number
          seedlings_emerged?: number | null
          start_type?: string | null
          variety?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "garden_plantings_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garden_plantings_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "garden_plots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garden_plantings_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "garden_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      garden_plots: {
        Row: {
          cols: number
          created_at: string
          description: string | null
          household_id: string
          id: string
          name: string
          rows: number
          sun_exposure: string | null
        }
        Insert: {
          cols?: number
          created_at?: string
          description?: string | null
          household_id: string
          id?: string
          name: string
          rows?: number
          sun_exposure?: string | null
        }
        Update: {
          cols?: number
          created_at?: string
          description?: string | null
          household_id?: string
          id?: string
          name?: string
          rows?: number
          sun_exposure?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "garden_plots_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      garden_seed_inventory: {
        Row: {
          created_at: string | null
          expiry_year: number | null
          germination_rate: number | null
          household_id: string
          id: string
          notes: string | null
          plant_family: string | null
          plant_name: string
          purchase_year: number | null
          quantity_seeds: number | null
          supplier: string | null
          variety: string | null
        }
        Insert: {
          created_at?: string | null
          expiry_year?: number | null
          germination_rate?: number | null
          household_id: string
          id?: string
          notes?: string | null
          plant_family?: string | null
          plant_name: string
          purchase_year?: number | null
          quantity_seeds?: number | null
          supplier?: string | null
          variety?: string | null
        }
        Update: {
          created_at?: string | null
          expiry_year?: number | null
          germination_rate?: number | null
          household_id?: string
          id?: string
          notes?: string | null
          plant_family?: string | null
          plant_name?: string
          purchase_year?: number | null
          quantity_seeds?: number | null
          supplier?: string | null
          variety?: string | null
        }
        Relationships: []
      }
      garden_watering_logs: {
        Row: {
          amount_gal: number | null
          created_at: string
          duration_min: number | null
          household_id: string
          id: string
          method: string
          notes: string | null
          plot_id: string | null
          water_date: string
          zone_id: string | null
        }
        Insert: {
          amount_gal?: number | null
          created_at?: string
          duration_min?: number | null
          household_id: string
          id?: string
          method?: string
          notes?: string | null
          plot_id?: string | null
          water_date?: string
          zone_id?: string | null
        }
        Update: {
          amount_gal?: number | null
          created_at?: string
          duration_min?: number | null
          household_id?: string
          id?: string
          method?: string
          notes?: string | null
          plot_id?: string | null
          water_date?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "garden_watering_logs_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garden_watering_logs_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "garden_plots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garden_watering_logs_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "garden_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      garden_weather_logs: {
        Row: {
          condition_desc: string | null
          condition_main: string | null
          created_at: string
          household_id: string
          icon: string | null
          id: string
          log_date: string
          rainfall_mm: number | null
          temp_high_f: number | null
          temp_low_f: number | null
          zip_code: string
        }
        Insert: {
          condition_desc?: string | null
          condition_main?: string | null
          created_at?: string
          household_id: string
          icon?: string | null
          id?: string
          log_date?: string
          rainfall_mm?: number | null
          temp_high_f?: number | null
          temp_low_f?: number | null
          zip_code: string
        }
        Update: {
          condition_desc?: string | null
          condition_main?: string | null
          created_at?: string
          household_id?: string
          icon?: string | null
          id?: string
          log_date?: string
          rainfall_mm?: number | null
          temp_high_f?: number | null
          temp_low_f?: number | null
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "garden_weather_logs_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      garden_zones: {
        Row: {
          color: string
          created_at: string
          household_id: string
          id: string
          name: string
          plot_id: string
          zone_type: string
        }
        Insert: {
          color?: string
          created_at?: string
          household_id: string
          id?: string
          name: string
          plot_id: string
          zone_type?: string
        }
        Update: {
          color?: string
          created_at?: string
          household_id?: string
          id?: string
          name?: string
          plot_id?: string
          zone_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "garden_zones_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garden_zones_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "garden_plots"
            referencedColumns: ["id"]
          },
        ]
      }
      gifts: {
        Row: {
          added_by_member_id: string | null
          bought: boolean
          bought_at: string | null
          bought_by_member_id: string | null
          color_material: string | null
          created_at: string | null
          gift_date: string | null
          household_id: string
          id: string
          link: string | null
          name: string | null
          price: number | null
          priority: string | null
          recipient_member_id: string | null
          set_name: string | null
          size: string | null
          store: string | null
          totals_cleared_at: string | null
        }
        Insert: {
          added_by_member_id?: string | null
          bought?: boolean
          bought_at?: string | null
          bought_by_member_id?: string | null
          color_material?: string | null
          created_at?: string | null
          gift_date?: string | null
          household_id: string
          id?: string
          link?: string | null
          name?: string | null
          price?: number | null
          priority?: string | null
          recipient_member_id?: string | null
          set_name?: string | null
          size?: string | null
          store?: string | null
          totals_cleared_at?: string | null
        }
        Update: {
          added_by_member_id?: string | null
          bought?: boolean
          bought_at?: string | null
          bought_by_member_id?: string | null
          color_material?: string | null
          created_at?: string | null
          gift_date?: string | null
          household_id?: string
          id?: string
          link?: string | null
          name?: string | null
          price?: number | null
          priority?: string | null
          recipient_member_id?: string | null
          set_name?: string | null
          size?: string | null
          store?: string | null
          totals_cleared_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gifts_added_by_member_id_fkey"
            columns: ["added_by_member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gifts_bought_by_member_id_fkey"
            columns: ["bought_by_member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gifts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gifts_recipient_member_id_fkey"
            columns: ["recipient_member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_updates: {
        Row: {
          author_id: string | null
          body: string
          created_at: string | null
          goal_id: string
          household_id: string
          id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string | null
          goal_id: string
          household_id: string
          id?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string | null
          goal_id?: string
          household_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_updates_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_updates_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_updates_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          frequency_days: number | null
          frequency_type: string | null
          household_id: string
          id: string
          is_recurring: boolean | null
          member_id: string | null
          reminder_frequency: string | null
          status: string
          title: string
          user_type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          frequency_days?: number | null
          frequency_type?: string | null
          household_id: string
          id?: string
          is_recurring?: boolean | null
          member_id?: string | null
          reminder_frequency?: string | null
          status?: string
          title: string
          user_type?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          frequency_days?: number | null
          frequency_type?: string | null
          household_id?: string
          id?: string
          is_recurring?: boolean | null
          member_id?: string | null
          reminder_frequency?: string | null
          status?: string
          title?: string
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
        ]
      }
      household_invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          household_id: string
          id: string
          invited_by: string | null
          name: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          household_id: string
          id?: string
          invited_by?: string | null
          name?: string
          role?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          household_id?: string
          id?: string
          invited_by?: string | null
          name?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_invites_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          color_hex: string
          display_name: string
          household_id: string
          id: string
          invite_token: string | null
          joined_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          color_hex?: string
          display_name: string
          household_id: string
          id?: string
          invite_token?: string | null
          joined_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          color_hex?: string
          display_name?: string
          household_id?: string
          id?: string
          invite_token?: string | null
          joined_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          zip_code: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          zip_code?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      idea_topics: {
        Row: {
          color_hex: string
          created_at: string | null
          household_id: string
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          color_hex?: string
          created_at?: string | null
          household_id: string
          id?: string
          sort_order?: number
          title: string
        }
        Update: {
          color_hex?: string
          created_at?: string | null
          household_id?: string
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_topics_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas: {
        Row: {
          author_id: string | null
          body: string
          converted_to_id: string | null
          converted_to_type: string | null
          created_at: string | null
          description: string | null
          id: string
          is_pinned: boolean
          status: string
          subject: string | null
          topic_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          converted_to_id?: string | null
          converted_to_type?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_pinned?: boolean
          status?: string
          subject?: string | null
          topic_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          converted_to_id?: string | null
          converted_to_type?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_pinned?: boolean
          status?: string
          subject?: string | null
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideas_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          due_soon_enabled: boolean
          household_id: string
          last_digest_sent_at: string | null
          member_id: string
          notifications_enabled: boolean
          notify_member_ids: Json
          overdue_enabled: boolean
          reminder_frequency: string
          reminder_hour: number
          updated_at: string
        }
        Insert: {
          due_soon_enabled?: boolean
          household_id: string
          last_digest_sent_at?: string | null
          member_id: string
          notifications_enabled?: boolean
          notify_member_ids?: Json
          overdue_enabled?: boolean
          reminder_frequency?: string
          reminder_hour?: number
          updated_at?: string
        }
        Update: {
          due_soon_enabled?: boolean
          household_id?: string
          last_digest_sent_at?: string | null
          member_id?: string
          notifications_enabled?: boolean
          notify_member_ids?: Json
          overdue_enabled?: boolean
          reminder_frequency?: string
          reminder_hour?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
        ]
      }
      packing_template_items: {
        Row: {
          created_at: string | null
          id: string
          sort_order: number
          template_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          sort_order?: number
          template_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          sort_order?: number
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "packing_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "packing_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      packing_templates: {
        Row: {
          created_at: string | null
          household_id: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string | null
          household_id: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string | null
          household_id?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "packing_templates_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      preferred_vendors: {
        Row: {
          created_at: string | null
          household_id: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          rating: number | null
          service_type: string | null
        }
        Insert: {
          created_at?: string | null
          household_id: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          service_type?: string | null
        }
        Update: {
          created_at?: string | null
          household_id?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          service_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preferred_vendors_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      project_owners: {
        Row: {
          member_id: string
          project_id: string
        }
        Insert: {
          member_id: string
          project_id: string
        }
        Update: {
          member_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_owners_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_owners_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          assigned_member_id: string | null
          checklist_name: string
          completed_at: string | null
          created_at: string | null
          due_date: string | null
          id: string
          is_completed: boolean
          notes: string | null
          project_id: string
          sort_order: number
          title: string
        }
        Insert: {
          assigned_member_id?: string | null
          checklist_name?: string
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean
          notes?: string | null
          project_id: string
          sort_order?: number
          title: string
        }
        Update: {
          assigned_member_id?: string | null
          checklist_name?: string
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean
          notes?: string | null
          project_id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_assigned_member_id_fkey"
            columns: ["assigned_member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_updates: {
        Row: {
          author_id: string | null
          body: string
          created_at: string | null
          id: string
          project_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string | null
          id?: string
          project_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string | null
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_updates_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          category: string | null
          completed_at: string | null
          contractor_name: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          estimated_cost_cents: number
          expected_date: string | null
          frequency: string | null
          household_id: string
          id: string
          notes: string | null
          primary_vendor_id: string | null
          priority: string
          status: string
          title: string
          total_cost_cents: number
          uses_vendor: boolean
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          contractor_name?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          estimated_cost_cents?: number
          expected_date?: string | null
          frequency?: string | null
          household_id: string
          id?: string
          notes?: string | null
          primary_vendor_id?: string | null
          priority?: string
          status?: string
          title: string
          total_cost_cents?: number
          uses_vendor?: boolean
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          contractor_name?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          estimated_cost_cents?: number
          expected_date?: string | null
          frequency?: string | null
          household_id?: string
          id?: string
          notes?: string | null
          primary_vendor_id?: string | null
          priority?: string
          status?: string
          title?: string
          total_cost_cents?: number
          uses_vendor?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_primary_vendor_id_fkey"
            columns: ["primary_vendor_id"]
            isOneToOne: false
            referencedRelation: "preferred_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_task_completions: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          id: string
          notes: string | null
          recurring_task_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          notes?: string | null
          recurring_task_id: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          notes?: string | null
          recurring_task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_task_completions_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_task_completions_recurring_task_id_fkey"
            columns: ["recurring_task_id"]
            isOneToOne: false
            referencedRelation: "recurring_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_tasks: {
        Row: {
          anchor_date: string
          assigned_member_id: string | null
          category: string | null
          created_at: string | null
          days_of_week: number[] | null
          description: string | null
          frequency_days: number
          frequency_type: string
          household_id: string
          id: string
          is_active: boolean
          is_personal: boolean
          last_completed_at: string | null
          linked_event_id: string | null
          linked_event_type: string | null
          next_due_date: string
          nth_week: number | null
          nth_weekday: number | null
          time_of_day: string | null
          title: string
        }
        Insert: {
          anchor_date: string
          assigned_member_id?: string | null
          category?: string | null
          created_at?: string | null
          days_of_week?: number[] | null
          description?: string | null
          frequency_days?: number
          frequency_type: string
          household_id: string
          id?: string
          is_active?: boolean
          is_personal?: boolean
          last_completed_at?: string | null
          linked_event_id?: string | null
          linked_event_type?: string | null
          next_due_date: string
          nth_week?: number | null
          nth_weekday?: number | null
          time_of_day?: string | null
          title: string
        }
        Update: {
          anchor_date?: string
          assigned_member_id?: string | null
          category?: string | null
          created_at?: string | null
          days_of_week?: number[] | null
          description?: string | null
          frequency_days?: number
          frequency_type?: string
          household_id?: string
          id?: string
          is_active?: boolean
          is_personal?: boolean
          last_completed_at?: string | null
          linked_event_id?: string | null
          linked_event_type?: string | null
          next_due_date?: string
          nth_week?: number | null
          nth_weekday?: number | null
          time_of_day?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_tasks_assigned_member_id_fkey"
            columns: ["assigned_member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_tasks_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      service_records: {
        Row: {
          cost_cents: number
          created_at: string | null
          event_id: string | null
          event_type: string | null
          frequency: string | null
          household_id: string
          id: string
          notes: string | null
          receipt_url: string | null
          service_date: string
          service_type: string
          vendor_name: string
        }
        Insert: {
          cost_cents?: number
          created_at?: string | null
          event_id?: string | null
          event_type?: string | null
          frequency?: string | null
          household_id: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          service_date: string
          service_type: string
          vendor_name: string
        }
        Update: {
          cost_cents?: number
          created_at?: string | null
          event_id?: string | null
          event_type?: string | null
          frequency?: string | null
          household_id?: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          service_date?: string
          service_type?: string
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_records_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_member_id: string | null
          completed_at: string | null
          created_at: string | null
          due_date: string | null
          due_time: string | null
          household_id: string
          id: string
          is_completed: boolean
          is_personal: boolean
          linked_event_id: string | null
          linked_event_type: string | null
          notes: string | null
          title: string
        }
        Insert: {
          assigned_member_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          due_time?: string | null
          household_id: string
          id?: string
          is_completed?: boolean
          is_personal?: boolean
          linked_event_id?: string | null
          linked_event_type?: string | null
          notes?: string | null
          title: string
        }
        Update: {
          assigned_member_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          due_time?: string | null
          household_id?: string
          id?: string
          is_completed?: boolean
          is_personal?: boolean
          linked_event_id?: string | null
          linked_event_type?: string | null
          notes?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_member_id_fkey"
            columns: ["assigned_member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_task_owners: {
        Row: {
          member_id: string
          trip_task_id: string
        }
        Insert: {
          member_id: string
          trip_task_id: string
        }
        Update: {
          member_id?: string
          trip_task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_task_owners_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_task_owners_trip_task_id_fkey"
            columns: ["trip_task_id"]
            isOneToOne: false
            referencedRelation: "trip_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_tasks: {
        Row: {
          assigned_member_id: string | null
          checklist_name: string
          completed_at: string | null
          due_date: string | null
          id: string
          is_completed: boolean
          sort_order: number
          title: string
          trip_id: string
        }
        Insert: {
          assigned_member_id?: string | null
          checklist_name?: string
          completed_at?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean
          sort_order?: number
          title: string
          trip_id: string
        }
        Update: {
          assigned_member_id?: string | null
          checklist_name?: string
          completed_at?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean
          sort_order?: number
          title?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_tasks_assigned_member_id_fkey"
            columns: ["assigned_member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_tasks_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_updates: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          trip_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          trip_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_updates_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_updates_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          created_by: string | null
          departure_date: string
          destination: string
          household_id: string
          id: string
          notes: string | null
          primary_vendor_id: string | null
          return_date: string
          title: string
          uses_vendor: boolean
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          departure_date: string
          destination: string
          household_id: string
          id?: string
          notes?: string | null
          primary_vendor_id?: string | null
          return_date: string
          title: string
          uses_vendor?: boolean
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          departure_date?: string
          destination?: string
          household_id?: string
          id?: string
          notes?: string | null
          primary_vendor_id?: string | null
          return_date?: string
          title?: string
          uses_vendor?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "trips_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_primary_vendor_id_fkey"
            columns: ["primary_vendor_id"]
            isOneToOne: false
            referencedRelation: "preferred_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_business_reviews: {
        Row: {
          generated_at: string
          household_id: string
          id: string
          snapshot: Json
          week_start: string
        }
        Insert: {
          generated_at?: string
          household_id: string
          id?: string
          snapshot: Json
          week_start: string
        }
        Update: {
          generated_at?: string
          household_id?: string
          id?: string
          snapshot?: Json
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_business_reviews_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      wow_updates: {
        Row: {
          created_at: string | null
          household_id: string
          id: string
          source_id: string | null
          source_tab: string
          source_type: string
          summary: string
          title: string
          week_start: string
        }
        Insert: {
          created_at?: string | null
          household_id: string
          id?: string
          source_id?: string | null
          source_tab: string
          source_type: string
          summary: string
          title: string
          week_start: string
        }
        Update: {
          created_at?: string | null
          household_id?: string
          id?: string
          source_id?: string | null
          source_tab?: string
          source_type?: string
          summary?: string
          title?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "wow_updates_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_household_with_member: {
        Args: {
          p_color_hex?: string
          p_display_name: string
          p_name: string
          p_user_id: string
          p_zip_code: string
        }
        Returns: {
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          zip_code: string | null
        }
        SetofOptions: {
          from: "*"
          to: "households"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_household_member: { Args: { hid: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
