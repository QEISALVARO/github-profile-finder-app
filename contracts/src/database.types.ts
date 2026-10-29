// contracts/src/database.types.ts
// Generated Database Types for Supabase / Postgres Schema v2.2
// Generated from local Supabase migrations (20261001000001 - 20261001000017)
// Regenerasi: npx supabase gen types typescript --local > contracts/src/database.types.ts
// Terakhir diverifikasi: 29 Okt 2026 (Postgres 17 + CI drift check)

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
export type Database = {
  "public": {
          Tables: {
            "abuse_reports": {
                  Row: {
                    "created_at": string | null,"id": string,"reason": string | null,"reporter_id": string | null,"target_id": string | null,"target_type": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"id"?: string,"reason"?: string | null,"reporter_id"?: string | null,"target_id"?: string | null,"target_type"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"id"?: string,"reason"?: string | null,"reporter_id"?: string | null,"target_id"?: string | null,"target_type"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "abuse_reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"analyses": {
                  Row: {
                    "authenticity": number,"breakdown": NonNullable<Json>,"confidence": number,"created_at": string,"expires_at": string | null,"facts": NonNullable<Json>,"frameworks": (string)[] | null,"github_login": string,"heatmap": (number)[] | null,"id": string,"inferred_role": string | null,"is_lookup": boolean,"language_stats": Json | null,"metrics": Json | null,"primary_language": string | null,"score_version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "authenticity": number,"breakdown": NonNullable<Json>,"confidence": number,"created_at"?: string,"expires_at"?: string | null,"facts"?: NonNullable<Json>,"frameworks"?: (string)[] | null,"github_login": string,"heatmap"?: (number)[] | null,"id"?: string,"inferred_role"?: string | null,"is_lookup"?: boolean,"language_stats"?: Json | null,"metrics"?: Json | null,"primary_language"?: string | null,"score_version": number
                  }
                  Update: {
                    "authenticity"?: number,"breakdown"?: NonNullable<Json>,"confidence"?: number,"created_at"?: string,"expires_at"?: string | null,"facts"?: NonNullable<Json>,"frameworks"?: (string)[] | null,"github_login"?: string,"heatmap"?: (number)[] | null,"id"?: string,"inferred_role"?: string | null,"is_lookup"?: boolean,"language_stats"?: Json | null,"metrics"?: Json | null,"primary_language"?: string | null,"score_version"?: number
                  }
                  Relationships: [
                  ]
                },"blocks": {
                  Row: {
                    "blocked_id": string,"blocker_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blocked_id": string,"blocker_id": string
                  }
                  Update: {
                    "blocked_id"?: string,"blocker_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "blocks_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "blocks_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"cities": {
                  Row: {
                    "aliases": (string)[],"country_code": string,"id": number,"name": string,"population": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "aliases"?: (string)[],"country_code": string,"id": number,"name": string,"population"?: number | null
                  }
                  Update: {
                    "aliases"?: (string)[],"country_code"?: string,"id"?: number,"name"?: string,"population"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "cities_country_code_fkey"
      columns: ["country_code"]
isOneToOne: false
      referencedRelation: "countries"
      referencedColumns: ["iso2"]
    }
                  ]
                },"conversations": {
                  Row: {
                    "context_label": string | null,"created_at": string,"developer_id": string,"id": string,"last_message_at": string | null,"project_id": string | null,"recruiter_id": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "context_label"?: string | null,"created_at"?: string,"developer_id": string,"id"?: string,"last_message_at"?: string | null,"project_id"?: string | null,"recruiter_id": string,"status"?: string
                  }
                  Update: {
                    "context_label"?: string | null,"created_at"?: string,"developer_id"?: string,"id"?: string,"last_message_at"?: string | null,"project_id"?: string | null,"recruiter_id"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversations_developer_id_fkey"
      columns: ["developer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_recruiter_id_fkey"
      columns: ["recruiter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"countries": {
                  Row: {
                    "aliases": (string)[],"iso2": string,"name": string,"name_local": string | null,"region": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "aliases"?: (string)[],"iso2": string,"name": string,"name_local"?: string | null,"region"?: string | null
                  }
                  Update: {
                    "aliases"?: (string)[],"iso2"?: string,"name"?: string,"name_local"?: string | null,"region"?: string | null
                  }
                  Relationships: [
                  ]
                },"developer_settings": {
                  Row: {
                    "availability": Database["public"]['Enums']["availability"],"headline": string | null,"listed": boolean,"open_to_messages": boolean,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "availability"?: Database["public"]['Enums']["availability"],"headline"?: string | null,"listed"?: boolean,"open_to_messages"?: boolean,"user_id": string
                  }
                  Update: {
                    "availability"?: Database["public"]['Enums']["availability"],"headline"?: string | null,"listed"?: boolean,"open_to_messages"?: boolean,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "developer_settings_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"github_snapshots": {
                  Row: {
                    "etag_repos": string | null,"etag_user": string | null,"expires_at": string | null,"fetched_at": string,"github_id": number | null,"login": string,"repos_json": NonNullable<Json>,"user_json": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "etag_repos"?: string | null,"etag_user"?: string | null,"expires_at"?: string | null,"fetched_at"?: string,"github_id"?: number | null,"login": string,"repos_json": NonNullable<Json>,"user_json": NonNullable<Json>
                  }
                  Update: {
                    "etag_repos"?: string | null,"etag_user"?: string | null,"expires_at"?: string | null,"fetched_at"?: string,"github_id"?: number | null,"login"?: string,"repos_json"?: NonNullable<Json>,"user_json"?: NonNullable<Json>
                  }
                  Relationships: [
                  ]
                },"keyword_aliases": {
                  Row: {
                    "alias": string,"expands": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "alias": string,"expands": (string)[]
                  }
                  Update: {
                    "alias"?: string,"expands"?: (string)[]
                  }
                  Relationships: [
                  ]
                },"messages": {
                  Row: {
                    "body": string,"conversation_id": string,"created_at": string,"delivered_at": string | null,"id": string,"read_at": string | null,"sender_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"conversation_id": string,"created_at"?: string,"delivered_at"?: string | null,"id"?: string,"read_at"?: string | null,"sender_id": string
                  }
                  Update: {
                    "body"?: string,"conversation_id"?: string,"created_at"?: string,"delivered_at"?: string | null,"id"?: string,"read_at"?: string | null,"sender_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"pipeline_entries": {
                  Row: {
                    "github_login": string,"id": string,"note": string | null,"recruiter_id": string,"stage": Database["public"]['Enums']["pipeline_stage"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "github_login": string,"id"?: string,"note"?: string | null,"recruiter_id": string,"stage"?: Database["public"]['Enums']["pipeline_stage"],"updated_at"?: string
                  }
                  Update: {
                    "github_login"?: string,"id"?: string,"note"?: string | null,"recruiter_id"?: string,"stage"?: Database["public"]['Enums']["pipeline_stage"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pipeline_entries_recruiter_id_fkey"
      columns: ["recruiter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"bio": string | null,"city": string | null,"country_code": string | null,"country_confidence": number | null,"country_source": string | null,"created_at": string,"github_id": number,"github_login": string,"id": string,"location_text": string | null,"login": string,"name": string | null,"roles": (Database["public"]['Enums']["user_role"])[]
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"bio"?: string | null,"city"?: string | null,"country_code"?: string | null,"country_confidence"?: number | null,"country_source"?: string | null,"created_at"?: string,"github_id": number,"github_login": string,"id": string,"location_text"?: string | null,"login": string,"name"?: string | null,"roles"?: (Database["public"]['Enums']["user_role"])[]
                  }
                  Update: {
                    "avatar_url"?: string | null,"bio"?: string | null,"city"?: string | null,"country_code"?: string | null,"country_confidence"?: number | null,"country_source"?: string | null,"created_at"?: string,"github_id"?: number,"github_login"?: string,"id"?: string,"location_text"?: string | null,"login"?: string,"name"?: string | null,"roles"?: (Database["public"]['Enums']["user_role"])[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_country_code_fkey"
      columns: ["country_code"]
isOneToOne: false
      referencedRelation: "countries"
      referencedColumns: ["iso2"]
    }
                  ]
                },"projects": {
                  Row: {
                    "active": boolean,"country_code": string | null,"created_at": string,"demo_url": string | null,"demo_verified": boolean,"description": string | null,"github_repo_id": number,"id": string,"is_hidden": boolean,"name": string,"owner_id": string,"published": boolean,"pushed_at": string | null,"role": string,"score": number | null,"search": unknown,"stack": NonNullable<Json>,"stars": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"country_code"?: string | null,"created_at"?: string,"demo_url"?: string | null,"demo_verified"?: boolean,"description"?: string | null,"github_repo_id": number,"id"?: string,"is_hidden"?: boolean,"name": string,"owner_id": string,"published"?: boolean,"pushed_at"?: string | null,"role": string,"score"?: number | null,"search"?: unknown,"stack"?: NonNullable<Json>,"stars"?: number
                  }
                  Update: {
                    "active"?: boolean,"country_code"?: string | null,"created_at"?: string,"demo_url"?: string | null,"demo_verified"?: boolean,"description"?: string | null,"github_repo_id"?: number,"id"?: string,"is_hidden"?: boolean,"name"?: string,"owner_id"?: string,"published"?: boolean,"pushed_at"?: string | null,"role"?: string,"score"?: number | null,"search"?: unknown,"stack"?: NonNullable<Json>,"stars"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "projects_country_code_fkey"
      columns: ["country_code"]
isOneToOne: false
      referencedRelation: "countries"
      referencedColumns: ["iso2"]
    },{
      foreignKeyName: "projects_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"push_tokens": {
                  Row: {
                    "platform": string | null,"token": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "platform"?: string | null,"token": string,"user_id": string
                  }
                  Update: {
                    "platform"?: string | null,"token"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_tokens_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"rate_limits": {
                  Row: {
                    "count": number,"key": string,"user_id": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "count"?: number,"key": string,"user_id": string,"window_start": string
                  }
                  Update: {
                    "count"?: number,"key"?: string,"user_id"?: string,"window_start"?: string
                  }
                  Relationships: [
                  ]
                },"recruiter_profiles": {
                  Row: {
                    "company": string,"hiring_status": string,"target_countries": (string)[],"title": string | null,"user_id": string,"verified": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "company": string,"hiring_status"?: string,"target_countries"?: (string)[],"title"?: string | null,"user_id": string,"verified"?: boolean
                  }
                  Update: {
                    "company"?: string,"hiring_status"?: string,"target_countries"?: (string)[],"title"?: string | null,"user_id"?: string,"verified"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "recruiter_profiles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "analysis_id": string,"created_at": string,"id": string,"recruiter_id": string,"storage_path": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "analysis_id": string,"created_at"?: string,"id"?: string,"recruiter_id": string,"storage_path"?: string | null
                  }
                  Update: {
                    "analysis_id"?: string,"created_at"?: string,"id"?: string,"recruiter_id"?: string,"storage_path"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_analysis_id_fkey"
      columns: ["analysis_id"]
isOneToOne: false
      referencedRelation: "analyses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_recruiter_id_fkey"
      columns: ["recruiter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "check_rate_limit":
{ Args: { "p_key": string,"p_max": number,"p_user": string,"p_window": string }; Returns: {
              "allowed": boolean,"retry_after": number
            }[]
                           },
"complete_onboarding":
{ Args: { "p_city"?: string,"p_company"?: string,"p_country_code"?: string,"p_roles": (Database["public"]['Enums']["user_role"])[],"p_target_countries"?: (string)[],"p_title"?: string }; Returns: undefined
                           },
"finish":
{ Args: Record<PropertyKey, never>; Returns: string[]
                           },
"is_empty":
{ Args: { "msg": string,"q": string }; Returns: string
                           },
"isnt_empty":
{ Args: { "msg": string,"q": string }; Returns: string
                           },
"lives_ok":
{ Args: { "msg": string,"q": string }; Returns: string
                           },
"normalize_location":
{ Args: { "p_location": string }; Returns: {
              "city": string,"confidence": number,"country_code": string
            }[]
                           },
"ok":
{ Args: { "b": boolean,"msg": string }; Returns: string
                           },
"plan":
{ Args: { "n": number }; Returns: string
                           },
"purge_expired_lookups":
{ Args: Record<PropertyKey, never>; Returns: {
              "deleted_analyses": number,"deleted_rate_limits": number,"deleted_snapshots": number
            }[]
                           },
"results_eq":
{ Args: { "expected": unknown,"msg": string,"q": string }; Returns: string
                           },
"row_security_active":
{ Args: { "t": string }; Returns: string
                           },
"set_country":
{ Args: { "p_city"?: string,"p_country_code": string }; Returns: undefined
                           },
"throws_ok":
{ Args: { "expcode": string,"msg": string,"q": string }; Returns: string
                           } |
{ Args: { "msg": string,"q": string }; Returns: string
                           },
"update_developer_settings":
{ Args: { "p_availability"?: Database["public"]['Enums']["availability"],"p_headline"?: string,"p_listed"?: boolean,"p_open_to_messages"?: boolean }; Returns: undefined
                           },
"update_recruiter_profile":
{ Args: { "p_company"?: string,"p_hiring_status"?: string,"p_target_countries"?: (string)[],"p_title"?: string }; Returns: undefined
                           }
          }
          Enums: {
            "availability": "open_to_work"|"freelance"|"not_available","pipeline_stage": "saved"|"interviewing"|"hired","user_role": "developer"|"recruiter"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}
type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never
export const Constants = {
  "public": {
          Enums: {
            "availability": ["open_to_work", "freelance", "not_available"],"pipeline_stage": ["saved", "interviewing", "hired"],"user_role": ["developer", "recruiter"]
          }
        }
} as const
