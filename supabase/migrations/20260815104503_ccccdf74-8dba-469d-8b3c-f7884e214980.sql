
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL DEFAULT 'other',
  description TEXT,
  cover_url TEXT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  location_name TEXT,
  privacy_mode TEXT NOT NULL DEFAULT 'public',
  access_code TEXT,
  theme_colors JSONB NOT NULL DEFAULT '{"primary":"#C08552","secondary":"#F5F0E8"}'::jsonb,
  guest_upload BOOLEAN NOT NULL DEFAULT true,
  guestbook_enabled BOOLEAN NOT NULL DEFAULT true,
  live_wall_enabled BOOLEAN NOT NULL DEFAULT true,
  face_recognition BOOLEAN NOT NULL DEFAULT false,
  download_enabled BOOLEAN NOT NULL DEFAULT true,
  hashtag TEXT,
  guest_list TEXT[] NOT NULL DEFAULT '{}',
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages events" ON public.events FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TABLE public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  storage_path TEXT,
  src TEXT NOT NULL,
  width INTEGER NOT NULL DEFAULT 800,
  height INTEGER NOT NULL DEFAULT 800,
  caption TEXT,
  is_video BOOLEAN NOT NULL DEFAULT false,
  uploader_name TEXT,
  guest_fingerprint TEXT,
  likes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX photos_event_idx ON public.photos(event_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photos TO authenticated;
GRANT SELECT, INSERT ON public.photos TO anon;
GRANT ALL ON public.photos TO service_role;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages photos" ON public.photos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.owner_id = auth.uid()));
CREATE POLICY "guests upload photos" ON public.photos FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.guest_upload));

CREATE TABLE public.guestbook_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX guestbook_event_idx ON public.guestbook_entries(event_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guestbook_entries TO authenticated;
GRANT SELECT, INSERT ON public.guestbook_entries TO anon;
GRANT ALL ON public.guestbook_entries TO service_role;
ALTER TABLE public.guestbook_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages guestbook" ON public.guestbook_entries FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.owner_id = auth.uid()));
CREATE POLICY "guests write guestbook" ON public.guestbook_entries FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.guestbook_enabled));

CREATE OR REPLACE FUNCTION public.get_public_event(p_slug TEXT, p_code TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID, name TEXT, slug TEXT, event_type TEXT, description TEXT, cover_url TEXT,
  starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ, location_name TEXT, privacy_mode TEXT,
  theme_colors JSONB, guest_upload BOOLEAN, guestbook_enabled BOOLEAN, live_wall_enabled BOOLEAN,
  face_recognition BOOLEAN, download_enabled BOOLEAN, hashtag TEXT, guest_list TEXT[],
  view_count INTEGER, photo_count BIGINT, guest_count BIGINT, requires_code BOOLEAN, authorized BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.events%ROWTYPE; ok BOOLEAN;
BEGIN
  SELECT * INTO e FROM public.events WHERE public.events.slug = p_slug;
  IF NOT FOUND THEN RETURN; END IF;
  ok := (e.privacy_mode <> 'access_code')
        OR (p_code IS NOT NULL AND e.access_code IS NOT NULL AND upper(trim(p_code)) = upper(trim(e.access_code)));
  RETURN QUERY SELECT e.id, e.name, e.slug, e.event_type,
    CASE WHEN ok THEN e.description END, e.cover_url, e.starts_at, e.ends_at,
    CASE WHEN ok THEN e.location_name END, e.privacy_mode,
    e.theme_colors, e.guest_upload, e.guestbook_enabled, e.live_wall_enabled,
    e.face_recognition, e.download_enabled, e.hashtag,
    CASE WHEN ok THEN e.guest_list ELSE '{}'::TEXT[] END, e.view_count,
    (SELECT count(*) FROM public.photos p WHERE p.event_id = e.id),
    (SELECT count(DISTINCT p.uploader_name) FROM public.photos p WHERE p.event_id = e.id),
    (e.privacy_mode = 'access_code'), ok;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_public_event(TEXT, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_photos(p_slug TEXT, p_code TEXT DEFAULT NULL)
RETURNS SETOF public.photos
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.events%ROWTYPE;
BEGIN
  SELECT * INTO e FROM public.events WHERE public.events.slug = p_slug;
  IF NOT FOUND THEN RETURN; END IF;
  IF e.privacy_mode = 'access_code' AND (p_code IS NULL OR e.access_code IS NULL OR upper(trim(p_code)) <> upper(trim(e.access_code))) THEN RETURN; END IF;
  RETURN QUERY SELECT * FROM public.photos p WHERE p.event_id = e.id ORDER BY p.created_at DESC;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_public_photos(TEXT, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_guestbook(p_slug TEXT, p_code TEXT DEFAULT NULL)
RETURNS SETOF public.guestbook_entries
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.events%ROWTYPE;
BEGIN
  SELECT * INTO e FROM public.events WHERE public.events.slug = p_slug;
  IF NOT FOUND THEN RETURN; END IF;
  IF e.privacy_mode = 'access_code' AND (p_code IS NULL OR e.access_code IS NULL OR upper(trim(p_code)) <> upper(trim(e.access_code))) THEN RETURN; END IF;
  RETURN QUERY SELECT * FROM public.guestbook_entries g WHERE g.event_id = e.id ORDER BY g.created_at DESC;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_public_guestbook(TEXT, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_event_views(p_slug TEXT)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.events SET view_count = view_count + 1 WHERE slug = p_slug;
$$;
GRANT EXECUTE ON FUNCTION public.increment_event_views(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.like_photo(p_photo_id UUID)
RETURNS INTEGER LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.photos SET likes = likes + 1 WHERE id = p_photo_id RETURNING likes;
$$;
GRANT EXECUTE ON FUNCTION public.like_photo(UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER events_touch BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "public read event photos" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'event-photos');
CREATE POLICY "anyone uploads event photos" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'event-photos');
CREATE POLICY "owners delete event photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'event-photos');
