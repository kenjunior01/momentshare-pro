ALTER TABLE public.guestbook_entries
  ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT false;

-- existing entries stay visible
UPDATE public.guestbook_entries SET approved = true WHERE created_at < now();

DROP POLICY IF EXISTS "guests write guestbook" ON public.guestbook_entries;
CREATE POLICY "guests write guestbook" ON public.guestbook_entries
FOR INSERT TO anon, authenticated
WITH CHECK (
  approved = false
  AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = guestbook_entries.event_id AND e.guestbook_enabled)
);

CREATE OR REPLACE FUNCTION public.get_public_guestbook(p_slug text, p_code text DEFAULT NULL::text)
 RETURNS SETOF guestbook_entries
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE e public.events%ROWTYPE;
BEGIN
  SELECT * INTO e FROM public.events WHERE public.events.slug = p_slug;
  IF NOT FOUND THEN RETURN; END IF;
  IF e.privacy_mode = 'access_code' AND (p_code IS NULL OR e.access_code IS NULL OR upper(trim(p_code)) <> upper(trim(e.access_code))) THEN RETURN; END IF;
  RETURN QUERY SELECT * FROM public.guestbook_entries g WHERE g.event_id = e.id AND g.approved ORDER BY g.created_at DESC;
END; $function$;

ALTER TABLE public.photos REPLICA IDENTITY FULL;
ALTER TABLE public.guestbook_entries REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.photos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guestbook_entries;