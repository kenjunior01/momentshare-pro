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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      events: {
        Row: {
          access_code: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          download_enabled: boolean
          ends_at: string | null
          event_type: string
          face_recognition: boolean
          guest_list: string[]
          guest_upload: boolean
          guestbook_enabled: boolean
          hashtag: string | null
          id: string
          live_wall_enabled: boolean
          location_name: string | null
          name: string
          owner_id: string
          privacy_mode: string
          slug: string
          starts_at: string
          theme_colors: Json
          updated_at: string
          view_count: number
        }
        Insert: {
          access_code?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          download_enabled?: boolean
          ends_at?: string | null
          event_type?: string
          face_recognition?: boolean
          guest_list?: string[]
          guest_upload?: boolean
          guestbook_enabled?: boolean
          hashtag?: string | null
          id?: string
          live_wall_enabled?: boolean
          location_name?: string | null
          name: string
          owner_id: string
          privacy_mode?: string
          slug: string
          starts_at?: string
          theme_colors?: Json
          updated_at?: string
          view_count?: number
        }
        Update: {
          access_code?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          download_enabled?: boolean
          ends_at?: string | null
          event_type?: string
          face_recognition?: boolean
          guest_list?: string[]
          guest_upload?: boolean
          guestbook_enabled?: boolean
          hashtag?: string | null
          id?: string
          live_wall_enabled?: boolean
          location_name?: string | null
          name?: string
          owner_id?: string
          privacy_mode?: string
          slug?: string
          starts_at?: string
          theme_colors?: Json
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      guestbook_entries: {
        Row: {
          approved: boolean
          created_at: string
          event_id: string
          guest_name: string
          id: string
          message: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          event_id: string
          guest_name: string
          id?: string
          message: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          event_id?: string
          guest_name?: string
          id?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "guestbook_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          caption: string | null
          created_at: string
          event_id: string
          guest_fingerprint: string | null
          height: number
          id: string
          is_video: boolean
          likes: number
          src: string
          storage_path: string | null
          uploader_name: string | null
          width: number
        }
        Insert: {
          caption?: string | null
          created_at?: string
          event_id: string
          guest_fingerprint?: string | null
          height?: number
          id?: string
          is_video?: boolean
          likes?: number
          src: string
          storage_path?: string | null
          uploader_name?: string | null
          width?: number
        }
        Update: {
          caption?: string | null
          created_at?: string
          event_id?: string
          guest_fingerprint?: string | null
          height?: number
          id?: string
          is_video?: boolean
          likes?: number
          src?: string
          storage_path?: string | null
          uploader_name?: string | null
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      event_allows_guest_upload: {
        Args: { p_event_id: string }
        Returns: boolean
      }
      event_allows_guestbook: { Args: { p_event_id: string }; Returns: boolean }
      event_is_open: { Args: { p_event_id: string }; Returns: boolean }
      get_public_event: {
        Args: { p_code?: string; p_slug: string }
        Returns: {
          authorized: boolean
          cover_url: string
          description: string
          download_enabled: boolean
          ends_at: string
          event_type: string
          face_recognition: boolean
          guest_count: number
          guest_list: string[]
          guest_upload: boolean
          guestbook_enabled: boolean
          hashtag: string
          id: string
          live_wall_enabled: boolean
          location_name: string
          name: string
          photo_count: number
          privacy_mode: string
          requires_code: boolean
          slug: string
          starts_at: string
          theme_colors: Json
          view_count: number
        }[]
      }
      get_public_guestbook: {
        Args: { p_code?: string; p_slug: string }
        Returns: {
          approved: boolean
          created_at: string
          event_id: string
          guest_name: string
          id: string
          message: string
        }[]
        SetofOptions: {
          from: "*"
          to: "guestbook_entries"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_public_photos: {
        Args: { p_code?: string; p_slug: string }
        Returns: {
          caption: string | null
          created_at: string
          event_id: string
          guest_fingerprint: string | null
          height: number
          id: string
          is_video: boolean
          likes: number
          src: string
          storage_path: string | null
          uploader_name: string | null
          width: number
        }[]
        SetofOptions: {
          from: "*"
          to: "photos"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      increment_event_views: { Args: { p_slug: string }; Returns: undefined }
      is_event_owner: { Args: { p_event_id: string }; Returns: boolean }
      like_photo: { Args: { p_photo_id: string }; Returns: number }
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
