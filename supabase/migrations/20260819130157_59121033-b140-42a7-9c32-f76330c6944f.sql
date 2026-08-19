-- Helper: is this event open to guests (not access-code protected)?
CREATE OR REPLACE FUNCTION public.event_is_open(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = p_event_id AND e.privacy_mode <> 'access_code'
  );
$$;

CREATE OR REPLACE FUNCTION public.event_allows_guest_upload(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = p_event_id AND e.guest_upload AND e.privacy_mode <> 'access_code'
  );
$$;

CREATE OR REPLACE FUNCTION public.event_allows_guestbook(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = p_event_id AND e.guestbook_enabled AND e.privacy_mode <> 'access_code'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_event_owner(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = p_event_id AND e.owner_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.event_is_open(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.event_allows_guest_upload(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.event_allows_guestbook(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_event_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.event_is_open(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.event_allows_guest_upload(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.event_allows_guestbook(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_event_owner(uuid) TO authenticated;

-- Internal trigger-only functions must not be callable from the API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- photos: scoped read access
DROP POLICY IF EXISTS "guests upload photos" ON public.photos;
CREATE POLICY "guests upload photos" ON public.photos
  FOR INSERT TO anon, authenticated
  WITH CHECK (public.event_allows_guest_upload(event_id));

DROP POLICY IF EXISTS "guests read open event photos" ON public.photos;
CREATE POLICY "guests read open event photos" ON public.photos
  FOR SELECT TO anon, authenticated
  USING (public.event_is_open(event_id));

GRANT SELECT, INSERT ON public.photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photos TO authenticated;

-- guestbook: scoped read access (approved only)
DROP POLICY IF EXISTS "guests write guestbook" ON public.guestbook_entries;
CREATE POLICY "guests write guestbook" ON public.guestbook_entries
  FOR INSERT TO anon, authenticated
  WITH CHECK (approved = false AND public.event_allows_guestbook(event_id));

DROP POLICY IF EXISTS "guests read approved guestbook" ON public.guestbook_entries;
CREATE POLICY "guests read approved guestbook" ON public.guestbook_entries
  FOR SELECT TO anon, authenticated
  USING (approved AND public.event_is_open(event_id));

GRANT SELECT, INSERT ON public.guestbook_entries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guestbook_entries TO authenticated;

-- Storage: scope event-photos objects to their event folder
DROP POLICY IF EXISTS "anyone uploads event photos" ON storage.objects;
DROP POLICY IF EXISTS "owners delete event photos" ON storage.objects;
DROP POLICY IF EXISTS "public read event photos" ON storage.objects;

CREATE POLICY "guests upload to open events" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'event-photos'
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND (
      public.event_allows_guest_upload(((storage.foldername(name))[1])::uuid)
      OR public.is_event_owner(((storage.foldername(name))[1])::uuid)
    )
  );

CREATE POLICY "read event photos of open events" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'event-photos'
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND (
      public.event_is_open(((storage.foldername(name))[1])::uuid)
      OR public.is_event_owner(((storage.foldername(name))[1])::uuid)
    )
  );

CREATE POLICY "owners manage event photo files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'event-photos'
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND public.is_event_owner(((storage.foldername(name))[1])::uuid)
  );
