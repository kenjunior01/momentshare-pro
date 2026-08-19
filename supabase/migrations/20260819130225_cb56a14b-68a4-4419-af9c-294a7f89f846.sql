CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.event_is_open(p_event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.events e WHERE e.id = p_event_id AND e.privacy_mode <> 'access_code');
$$;

CREATE OR REPLACE FUNCTION private.event_allows_guest_upload(p_event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.events e WHERE e.id = p_event_id AND e.guest_upload AND e.privacy_mode <> 'access_code');
$$;

CREATE OR REPLACE FUNCTION private.event_allows_guestbook(p_event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.events e WHERE e.id = p_event_id AND e.guestbook_enabled AND e.privacy_mode <> 'access_code');
$$;

CREATE OR REPLACE FUNCTION private.is_event_owner(p_event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.events e WHERE e.id = p_event_id AND e.owner_id = auth.uid());
$$;

GRANT EXECUTE ON FUNCTION private.event_is_open(uuid), private.event_allows_guest_upload(uuid), private.event_allows_guestbook(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_event_owner(uuid) TO authenticated;

-- Recreate policies against the private helpers
DROP POLICY IF EXISTS "guests upload photos" ON public.photos;
CREATE POLICY "guests upload photos" ON public.photos
  FOR INSERT TO anon, authenticated
  WITH CHECK (private.event_allows_guest_upload(event_id));

DROP POLICY IF EXISTS "guests read open event photos" ON public.photos;
CREATE POLICY "guests read open event photos" ON public.photos
  FOR SELECT TO anon, authenticated
  USING (private.event_is_open(event_id));

DROP POLICY IF EXISTS "guests write guestbook" ON public.guestbook_entries;
CREATE POLICY "guests write guestbook" ON public.guestbook_entries
  FOR INSERT TO anon, authenticated
  WITH CHECK (approved = false AND private.event_allows_guestbook(event_id));

DROP POLICY IF EXISTS "guests read approved guestbook" ON public.guestbook_entries;
CREATE POLICY "guests read approved guestbook" ON public.guestbook_entries
  FOR SELECT TO anon, authenticated
  USING (approved AND private.event_is_open(event_id));

DROP POLICY IF EXISTS "guests upload to open events" ON storage.objects;
CREATE POLICY "guests upload to open events" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'event-photos'
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND (private.event_allows_guest_upload(((storage.foldername(name))[1])::uuid)
         OR private.is_event_owner(((storage.foldername(name))[1])::uuid))
  );

DROP POLICY IF EXISTS "read event photos of open events" ON storage.objects;
CREATE POLICY "read event photos of open events" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'event-photos'
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND (private.event_is_open(((storage.foldername(name))[1])::uuid)
         OR private.is_event_owner(((storage.foldername(name))[1])::uuid))
  );

DROP POLICY IF EXISTS "owners manage event photo files" ON storage.objects;
CREATE POLICY "owners manage event photo files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'event-photos'
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND private.is_event_owner(((storage.foldername(name))[1])::uuid)
  );

DROP FUNCTION IF EXISTS public.event_is_open(uuid);
DROP FUNCTION IF EXISTS public.event_allows_guest_upload(uuid);
DROP FUNCTION IF EXISTS public.event_allows_guestbook(uuid);
DROP FUNCTION IF EXISTS public.is_event_owner(uuid);
