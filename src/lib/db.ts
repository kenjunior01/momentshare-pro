import { supabase } from "@/integrations/supabase/client";
import type { EventPhoto, GuestBookEntry, GuestEvent } from "./types";

export const BUCKET = "event-photos";

export interface PublicEvent extends GuestEvent {
  requires_code: boolean;
  authorized: boolean;
}

/** Resolve a storage path (or absolute URL) into a displayable URL. */
export async function signUrls(paths: string[]): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const toSign = paths.filter(
    (p) => p && !p.startsWith("http") && !p.startsWith("/") && !p.startsWith("data:"),
  );
  paths.forEach((p) => {
    if (!toSign.includes(p)) map[p] = p;
  });
  if (toSign.length) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrls(toSign, 60 * 60 * 6);
    data?.forEach((d) => {
      if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
    });
  }
  return map;
}

export async function fetchPublicEvent(
  slug: string,
  code?: string | null,
): Promise<PublicEvent | null> {
  const { data, error } = await supabase.rpc("get_public_event", {
    p_slug: slug,
    ...(code ? { p_code: code } : {}),
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;

  const theme = (row.theme_colors ?? {}) as { primary?: string; secondary?: string };
  const signed = row.cover_url ? await signUrls([row.cover_url]) : {};

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    event_type: row.event_type,
    description: row.description ?? undefined,
    cover_url: (row.cover_url ? signed[row.cover_url] : "") ?? "",
    starts_at: row.starts_at,
    ends_at: row.ends_at ?? undefined,
    location_name: row.location_name ?? undefined,
    privacy_mode: row.privacy_mode as GuestEvent["privacy_mode"],
    theme_colors: {
      primary: theme.primary ?? "#C08552",
      secondary: theme.secondary ?? "#F5F0E8",
    },
    guest_upload: row.guest_upload,
    guestbook_enabled: row.guestbook_enabled,
    live_wall_enabled: row.live_wall_enabled,
    face_recognition: row.face_recognition,
    photo_count: Number(row.photo_count ?? 0),
    guest_count: Number(row.guest_count ?? 0),
    view_count: Number(row.view_count ?? 0),
    download_enabled: row.download_enabled,
    guest_list: row.guest_list ?? [],
    hashtag: row.hashtag ?? undefined,
    requires_code: row.requires_code,
    authorized: row.authorized,
  };
}

export async function fetchPublicPhotos(slug: string, code?: string | null): Promise<EventPhoto[]> {
  const { data, error } = await supabase.rpc("get_public_photos", {
    p_slug: slug,
    ...(code ? { p_code: code } : {}),
  });
  if (error) throw error;
  const rows = data ?? [];
  const signed = await signUrls(rows.map((r) => r.src));
  return rows.map((r) => ({
    id: r.id,
    event_id: r.event_id,
    src: signed[r.src] ?? r.src,
    thumbnail: signed[r.src] ?? r.src,
    width: r.width,
    height: r.height,
    caption: r.caption ?? undefined,
    is_video: r.is_video,
    taken_at: r.created_at,
    uploader_name: r.uploader_name ?? undefined,
    likes: r.likes,
  }));
}

export async function fetchPublicGuestbook(
  slug: string,
  code?: string | null,
): Promise<GuestBookEntry[]> {
  const { data, error } = await supabase.rpc("get_public_guestbook", {
    p_slug: slug,
    ...(code ? { p_code: code } : {}),
  });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    guest_name: r.guest_name,
    message: r.message,
    created_at: r.created_at,
  }));
}

export async function addGuestbookEntry(eventId: string, guestName: string, message: string) {
  const { error } = await supabase
    .from("guestbook_entries")
    .insert({ event_id: eventId, guest_name: guestName, message });
  if (error) throw error;
}

function readDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) return resolve({ width: 800, height: 800 });
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: 800, height: 800 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export async function uploadEventFile(eventId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${eventId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    ...(file.type ? { contentType: file.type } : {}),
  });
  if (error) throw error;
  return path;
}

export async function uploadGuestPhotos(
  eventId: string,
  files: File[],
  uploaderName: string,
  fingerprint?: string,
) {
  for (const file of files) {
    const path = await uploadEventFile(eventId, file);
    const { width, height } = await readDimensions(file);
    const { error } = await supabase.from("photos").insert({
      event_id: eventId,
      storage_path: path,
      src: path,
      width,
      height,
      is_video: file.type.startsWith("video/"),
      uploader_name: uploaderName,
      guest_fingerprint: fingerprint ?? null,
    });
    if (error) throw error;
  }
}

export async function likePhoto(photoId: string) {
  const { data, error } = await supabase.rpc("like_photo", { p_photo_id: photoId });
  if (error) throw error;
  return data as number;
}

export async function registerView(slug: string) {
  await supabase.rpc("increment_event_views", { p_slug: slug });
}

/* ─────────── Organizer (authenticated) ─────────── */

export async function listMyEvents() {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const covers = await signUrls((data ?? []).map((e) => e.cover_url ?? "").filter(Boolean));
  return (data ?? []).map((e) => ({
    ...e,
    cover_display: e.cover_url ? (covers[e.cover_url] ?? "") : "",
  }));
}

export async function getMyEvent(id: string) {
  const { data, error } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export interface EventInput {
  name: string;
  slug: string;
  event_type: string;
  description?: string | null;
  cover_url?: string | null;
  starts_at: string;
  location_name?: string | null;
  privacy_mode: string;
  access_code?: string | null;
  theme_colors: { primary: string; secondary: string };
  guest_upload: boolean;
  guestbook_enabled: boolean;
  live_wall_enabled: boolean;
  download_enabled: boolean;
  hashtag?: string | null;
  guest_list: string[];
}

export async function createEvent(input: EventInput) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Sessão expirada");
  const { data, error } = await supabase
    .from("events")
    .insert({ ...input, owner_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEvent(id: string, input: Partial<EventInput>) {
  const { error } = await supabase.from("events").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteEvent(id: string) {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
}

export async function listEventPhotos(eventId: string) {
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const signed = await signUrls((data ?? []).map((p) => p.src));
  return (data ?? []).map((p) => ({ ...p, display: signed[p.src] ?? p.src }));
}

export async function deletePhoto(id: string) {
  const { error } = await supabase.from("photos").delete().eq("id", id);
  if (error) throw error;
}

/* ─────────── Guestbook moderation (owner) ─────────── */

export interface ModeratedEntry {
  id: string;
  event_id: string;
  guest_name: string;
  message: string;
  approved: boolean;
  created_at: string;
}

export async function listEventGuestbook(eventId: string): Promise<ModeratedEntry[]> {
  const { data, error } = await supabase
    .from("guestbook_entries")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ModeratedEntry[];
}

export async function setGuestbookApproval(id: string, approved: boolean) {
  const { error } = await supabase.from("guestbook_entries").update({ approved }).eq("id", id);
  if (error) throw error;
}

export async function updateGuestbookMessage(id: string, message: string) {
  const { error } = await supabase.from("guestbook_entries").update({ message }).eq("id", id);
  if (error) throw error;
}

export async function deleteGuestbookEntry(id: string) {
  const { error } = await supabase.from("guestbook_entries").delete().eq("id", id);
  if (error) throw error;
}
