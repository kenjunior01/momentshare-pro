export interface EventPhoto {
  id: string;
  event_id: string;
  src: string;
  thumbnail: string;
  width: number;
  height: number;
  blurhash?: string;
  caption?: string | undefined;
  is_video?: boolean;
  duration?: number;
  taken_at?: string;
  uploader_name?: string | undefined;
  likes: number;
}

export interface GuestEvent {
  id: string;
  name: string;
  slug: string;
  event_type: string;
  description?: string;
  cover_url: string;
  starts_at: string;
  ends_at?: string;
  location_name?: string;
  privacy_mode: "public" | "access_code" | "invite_only";
  theme_colors: {
    primary: string;
    secondary: string;
    accent?: string;
    bg?: string;
  };
  guest_upload: boolean;
  guestbook_enabled: boolean;
  live_wall_enabled: boolean;
  face_recognition: boolean;
  photo_count: number;
  guest_count: number;
  view_count: number;
  download_enabled: boolean;
  guest_list?: string[];
  hashtag?: string;
}

export type ModerationStatus = "pending" | "approved" | "rejected";

export interface GuestBookEntry {
  id: string;
  guest_name: string;
  message: string;
  created_at: string;
  sentiment?: string;
  moderation_status?: ModerationStatus;
}

export interface GuestSession {
  name: string;
  event_id: string;
  joined_at: string;
  avatar_initials: string;
}
