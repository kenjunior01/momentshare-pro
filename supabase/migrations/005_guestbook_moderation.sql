-- ============================================================
-- 005_guestbook_moderation.sql
-- Adds moderation status, helper functions, and updated RLS
-- ============================================================

-- 1) Add moderation status column
ALTER TABLE guestbook_entries
  ADD COLUMN IF NOT EXISTS moderation_status moderation DEFAULT 'approved';

-- 2) Index for pending entries (organizer view)
CREATE INDEX IF NOT EXISTS idx_guestbook_pending
  ON guestbook_entries (event_id, created_at DESC)
  WHERE moderation_status = 'pending';

-- 3) Update visible index to also respect moderation_status
DROP INDEX IF EXISTS idx_guestbook_visible;
CREATE INDEX idx_guestbook_visible
  ON guestbook_entries (event_id, created_at DESC)
  WHERE is_hidden = FALSE AND moderation_status = 'approved';

-- 4) Helper: get pending guestbook entries for an event
CREATE OR REPLACE FUNCTION get_pending_guestbook(p_event_id UUID)
RETURNS TABLE (
  id UUID,
  guest_name TEXT,
  message TEXT,
  sentiment TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    ge.id, ge.guest_name, ge.message, ge.sentiment, ge.created_at
  FROM guestbook_entries ge
  WHERE ge.event_id = p_event_id
    AND ge.moderation_status = 'pending'
    AND ge.is_hidden = FALSE
  ORDER BY ge.created_at DESC;
$$;

-- 5) Helper: approve a guestbook entry
CREATE OR REPLACE FUNCTION approve_guestbook_entry(p_entry_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE guestbook_entries
    SET moderation_status = 'approved'
  WHERE id = p_entry_id
    AND moderation_status = 'pending';

  RETURN FOUND;
END;
$$;

-- 6) Helper: update text of a guestbook entry (moderation edit)
CREATE OR REPLACE FUNCTION edit_guestbook_entry(
  p_entry_id UUID,
  p_new_message TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE guestbook_entries
    SET message = p_new_message
  WHERE id = p_entry_id;

  RETURN FOUND;
END;
$$;

-- 7) Helper: remove (soft-delete / hide) a guestbook entry
CREATE OR REPLACE FUNCTION remove_guestbook_entry(p_entry_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE guestbook_entries
    SET is_hidden = TRUE
  WHERE id = p_entry_id;

  RETURN FOUND;
END;
$$;

-- 8) Helper: get all guestbook entries (pending + approved) for organizer
CREATE OR REPLACE FUNCTION get_all_guestbook(p_event_id UUID)
RETURNS TABLE (
  id UUID,
  guest_name TEXT,
  message TEXT,
  sentiment TEXT,
  moderation_status TEXT,
  is_hidden BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    ge.id, ge.guest_name, ge.message, ge.sentiment,
    ge.moderation_status::TEXT, ge.is_hidden, ge.created_at
  FROM guestbook_entries ge
  WHERE ge.event_id = p_event_id
    AND ge.is_hidden = FALSE
  ORDER BY
    CASE WHEN ge.moderation_status = 'pending' THEN 0 ELSE 1 END,
    ge.created_at DESC;
$$;

-- 9) Insert trigger: new guest entries default to 'pending' moderation
CREATE OR REPLACE FUNCTION set_pending_moderation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If inserted by a guest (no user_id) and no status specified, mark pending
  IF NEW.user_id IS NULL AND NEW.moderation_status IS NULL THEN
    NEW.moderation_status := 'pending'::moderation;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guestbook_moderation ON guestbook_entries;
CREATE TRIGGER trg_guestbook_moderation
  BEFORE INSERT ON guestbook_entries
  FOR EACH ROW EXECUTE FUNCTION set_pending_moderation();
