// contracts/src/database.types.ts
// Generated Database Types for Supabase / Postgres Schema v2.1
// Generated from local Supabase migrations (20261001000001 - 20261001000013)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "developer" | "recruiter";
export type Availability = "open_to_work" | "freelance" | "not_available";
export type PipelineStage = "saved" | "interviewing" | "hired";
export type ConversationStatus = "active" | "declined" | "blocked";

export interface Database {
  public: {
    Tables: {
      countries: {
        Row: {
          iso2: string;
          name: string;
          name_local: string | null;
          region: string | null;
          aliases: string[];
          created_at: string;
        };
        Insert: {
          iso2: string;
          name: string;
          name_local?: string | null;
          region?: string | null;
          aliases?: string[];
          created_at?: string;
        };
        Update: {
          iso2?: string;
          name?: string;
          name_local?: string | null;
          region?: string | null;
          aliases?: string[];
          created_at?: string;
        };
      };
      cities: {
        Row: {
          id: number;
          country_code: string;
          name: string;
          name_ascii: string | null;
          population: number | null;
          latitude: number | null;
          longitude: number | null;
          timezone: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          country_code: string;
          name: string;
          name_ascii?: string | null;
          population?: number | null;
          latitude?: number | null;
          longitude?: number | null;
          timezone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          country_code?: string;
          name?: string;
          name_ascii?: string | null;
          population?: number | null;
          latitude?: number | null;
          longitude?: number | null;
          timezone?: string | null;
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          github_id: number | null;
          github_login: string;
          name: string | null;
          avatar_url: string | null;
          location_raw: string | null;
          country_code: string | null;
          city: string | null;
          country_source: string;
          country_confidence: number | null;
          roles: UserRole[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          github_id?: number | null;
          github_login: string;
          name?: string | null;
          avatar_url?: string | null;
          location_raw?: string | null;
          country_code?: string | null;
          city?: string | null;
          country_source?: string;
          country_confidence?: number | null;
          roles?: UserRole[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          github_id?: number | null;
          github_login?: string;
          name?: string | null;
          avatar_url?: string | null;
          location_raw?: string | null;
          country_code?: string | null;
          city?: string | null;
          country_source?: string;
          country_confidence?: number | null;
          roles?: UserRole[];
          created_at?: string;
          updated_at?: string;
        };
      };
      developer_settings: {
        Row: {
          user_id: string;
          listed: boolean;
          open_to_messages: boolean;
          availability: Availability;
          headline: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          listed?: boolean;
          open_to_messages?: boolean;
          availability?: Availability;
          headline?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          listed?: boolean;
          open_to_messages?: boolean;
          availability?: Availability;
          headline?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      recruiter_profiles: {
        Row: {
          user_id: string;
          company: string;
          title: string | null;
          hiring_status: string;
          target_countries: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          company: string;
          title?: string | null;
          hiring_status?: string;
          target_countries?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          company?: string;
          title?: string | null;
          hiring_status?: string;
          target_countries?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      github_snapshots: {
        Row: {
          login: string;
          github_id: number | null;
          user_json: Json;
          repos_json: Json;
          fetched_at: string;
          expires_at: string | null;
          etag_repos: string | null;
        };
        Insert: {
          login: string;
          github_id?: number | null;
          user_json: Json;
          repos_json: Json;
          fetched_at?: string;
          expires_at?: string | null;
          etag_repos?: string | null;
        };
        Update: {
          login?: string;
          github_id?: number | null;
          user_json?: Json;
          repos_json?: Json;
          fetched_at?: string;
          expires_at?: string | null;
          etag_repos?: string | null;
        };
      };
      analyses: {
        Row: {
          id: string;
          github_login: string;
          score: number;
          authenticity: number;
          confidence: number;
          tier: string;
          score_version: number;
          breakdown_json: Json;
          metrics_json: Json;
          heatmap_arr: number[];
          repos_json: Json;
          inferred_role: string | null;
          primary_language: string | null;
          facts: Json;
          is_lookup: boolean;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          github_login: string;
          score: number;
          authenticity: number;
          confidence: number;
          tier?: string;
          score_version?: number;
          breakdown_json: Json;
          metrics_json: Json;
          heatmap_arr: number[];
          repos_json: Json;
          inferred_role?: string | null;
          primary_language?: string | null;
          facts?: Json;
          is_lookup?: boolean;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          github_login?: string;
          score?: number;
          authenticity?: number;
          confidence?: number;
          tier?: string;
          score_version?: number;
          breakdown_json?: Json;
          metrics_json?: Json;
          heatmap_arr?: number[];
          repos_json?: Json;
          inferred_role?: string | null;
          primary_language?: string | null;
          facts?: Json;
          is_lookup?: boolean;
          expires_at?: string | null;
          created_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          owner_id: string;
          repo_id: number;
          repo_name: string;
          description: string | null;
          language: string | null;
          stack_json: Json;
          score: number;
          active: boolean;
          demo_url: string | null;
          demo_verified: boolean;
          stars: number;
          forks: number;
          published: boolean;
          is_hidden: boolean;
          country_code: string | null;
          city: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          repo_id: number;
          repo_name: string;
          description?: string | null;
          language?: string | null;
          stack_json?: Json;
          score?: number;
          demo_url?: string | null;
          demo_verified?: boolean;
          stars?: number;
          forks?: number;
          published?: boolean;
          is_hidden?: boolean;
          country_code?: string | null;
          city?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          repo_id?: number;
          repo_name?: string;
          description?: string | null;
          language?: string | null;
          stack_json?: Json;
          score?: number;
          demo_url?: string | null;
          demo_verified?: boolean;
          stars?: number;
          forks?: number;
          published?: boolean;
          is_hidden?: boolean;
          country_code?: string | null;
          city?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      keyword_aliases: {
        Row: {
          alias: string;
          canonical: string;
          confidence: number;
          created_at: string;
        };
        Insert: {
          alias: string;
          canonical: string;
          confidence?: number;
          created_at?: string;
        };
        Update: {
          alias?: string;
          canonical?: string;
          confidence?: number;
          created_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          recruiter_id: string;
          developer_id: string;
          project_id: string | null;
          context_label: string | null;
          status: ConversationStatus;
          last_message_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          recruiter_id: string;
          developer_id: string;
          project_id?: string | null;
          context_label?: string | null;
          status?: ConversationStatus;
          last_message_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          recruiter_id?: string;
          developer_id?: string;
          project_id?: string | null;
          context_label?: string | null;
          status?: ConversationStatus;
          last_message_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          created_at: string;
          delivered_at: string | null;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          created_at?: string;
          delivered_at?: string | null;
          read_at?: string | null;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          body?: string;
          created_at?: string;
          delivered_at?: string | null;
          read_at?: string | null;
        };
      };
      pipeline_entries: {
        Row: {
          id: string;
          recruiter_id: string;
          github_login: string;
          stage: PipelineStage;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          recruiter_id: string;
          github_login: string;
          stage?: PipelineStage;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          recruiter_id?: string;
          github_login?: string;
          stage?: PipelineStage;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_user_id: string;
          reason: string;
          details: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          target_user_id: string;
          reason: string;
          details?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          target_user_id?: string;
          reason?: string;
          details?: string | null;
          created_at?: string;
        };
      };
      push_tokens: {
        Row: {
          user_id: string;
          token: string;
          platform: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          token: string;
          platform: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          token?: string;
          platform?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      blocks: {
        Row: {
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
        Insert: {
          blocker_id: string;
          blocked_id: string;
          created_at?: string;
        };
        Update: {
          blocker_id?: string;
          blocked_id?: string;
          created_at?: string;
        };
      };
      abuse_reports: {
        Row: {
          id: string;
          reporter_id: string;
          subject_type: string;
          subject_id: string;
          reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          subject_type: string;
          subject_id: string;
          reason: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          subject_type?: string;
          subject_id?: string;
          reason?: string;
          created_at?: string;
        };
      };
      rate_limits: {
        Row: {
          user_id: string;
          key: string;
          window_start: string;
          count: number;
        };
        Insert: {
          user_id: string;
          key: string;
          window_start: string;
          count?: number;
        };
        Update: {
          user_id?: string;
          key?: string;
          window_start?: string;
          count?: number;
        };
      };
    };
    Functions: {
      check_rate_limit: {
        Args: {
          p_user: string;
          p_key: string;
          p_max: number;
          p_window: string;
        };
        Returns: {
          allowed: boolean;
          retry_after: number;
        }[];
      };
      purge_expired_lookups: {
        Args: Record<PropertyKey, never>;
        Returns: {
          deleted_snapshots: number;
          deleted_analyses: number;
          deleted_rate_limits: number;
        }[];
      };
      normalize_location: {
        Args: { p_location: string };
        Returns: {
          country_code: string | null;
          city: string | null;
          confidence: number;
        }[];
      };
      complete_onboarding: {
        Args: {
          p_roles: UserRole[];
          p_country_code?: string | null;
          p_city?: string | null;
          p_company?: string | null;
          p_title?: string | null;
          p_target_countries?: string[] | null;
        };
        Returns: void;
      };
      set_country: {
        Args: {
          p_country_code: string;
          p_city?: string | null;
        };
        Returns: void;
      };
      update_developer_settings: {
        Args: {
          p_listed?: boolean | null;
          p_open_to_messages?: boolean | null;
          p_availability?: Availability | null;
          p_headline?: string | null;
        };
        Returns: void;
      };
      update_recruiter_profile: {
        Args: {
          p_company?: string | null;
          p_title?: string | null;
          p_hiring_status?: string | null;
          p_target_countries?: string[] | null;
        };
        Returns: void;
      };
    };
  };
}
