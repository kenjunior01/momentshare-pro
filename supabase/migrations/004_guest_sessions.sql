-- ============================================================
-- MOMENTSHARE PRO — Guest Sessions (Anonymous QR Access)
-- Enables full photo sharing without any login requirement
-- Guests scan QR → optionally type name → view/upload/share
-- ============================================================

-- Guest sessions: created when someone scans a QR code
-- Tracks anonymous visitors without requiring authentication
CREATE TABLE guest_sessions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  qr_id                 UUID REFERENCES qr_codes(id) ON DELETE SET NULL,
  qr_scan_id            UUID REFERENCES qr_scans(id) ON DELETE SET NULL,

  -- Identity (optional — guest can type their name)
  guest_name            TEXT,
  guest_email           TEXT,
  guest_phone           TEXT,

  -- Guest list matching (if event has invite list)
  matched_invite_id     UUID REFERENCES event_invites(id) ON DELETE SET NULL,
  is_matched            BOOLEAN DEFAULT FALSE,

  -- Session tracking
  session_fingerprint   TEXT NOT NULL,          -- browser fingerprint for dedup
  ip_address            INET,
  user_agent            TEXT,
  country_code          CHAR(2),
  city                  TEXT,

  -- Device info (helpful for African market analytics)
  device_type           TEXT,                    -- 'mobile', 'tablet', 'desktop'
  connection_type       TEXT,                    -- 'wifi', '4g', '3g', '2g'

  -- Activity totals (denormalized for fast reads)
  photos_viewed         INT DEFAULT 0,
  photos_uploaded       INT DEFAULT 0,
  photos_shared         INT DEFAULT 0,
  photos_liked          INT DEFAULT 0,
  guestbook_entries     INT DEFAULT 0,
  face_scans_performed  INT DEFAULT 0,

  -- State
  is_active             BOOLEAN DEFAULT TRUE,
  first_seen_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expired_at            TIMESTAMPTZ,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guest_sessions_event ON guest_sessions (event_id);
CREATE INDEX idx_guest_sessions_fingerprint ON guest_sessions (session_fingerprint);
CREATE INDEX idx_guest_sessions_qr ON guest_sessions (qr_id) WHERE qr_id IS NOT NULL;
CREATE INDEX idx_guest_sessions_active ON guest_sessions (event_id, is_active)
  WHERE is_active = TRUE;
CREATE INDEX idx_guest_sessions_invite ON guest_sessions (matched_invite_id)
  WHERE matched_invite_id IS NOT NULL;
CREATE INDEX idx_guest_sessions_last_active ON guest_sessions (last_active_at DESC);

-- Prevent duplicate active sessions for same fingerprint+event
CREATE UNIQUE INDEX idx_guest_sessions_unique_active
  ON guest_sessions (event_id, session_fingerprint)
  WHERE is_active = TRUE;

-- ============================================================
-- RLS: Guest Sessions
-- ============================================================

ALTER TABLE guest_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can create a guest session (this is the entry point after QR scan)
CREATE POLICY "Anyone can create guest sessions"
  ON guest_sessions FOR INSERT
  WITH CHECK (true);

-- Guests can read/update their own session (by fingerprint)
CREATE POLICY "Guests can view own session by fingerprint"
  ON guest_sessions FOR SELECT
  USING (true);  -- Frontend filters by session_fingerprint

-- Guests can update their own session (add name, update activity)
CREATE POLICY "Guests can update own session"
  ON guest_sessions FOR UPDATE
  USING (true);  -- Frontend ensures session_fingerprint match

-- ============================================================
-- Function: Create or get guest session on QR scan
-- Called by the frontend/edge function when a QR code is scanned
-- ============================================================

CREATE OR REPLACE FUNCTION create_guest_session(
  p_event_id           UUID,
  p_qr_id              UUID,
  p_session_fingerprint TEXT,
  p_guest_name         TEXT DEFAULT NULL,
  p_ip_address         INET DEFAULT NULL,
  p_user_agent         TEXT DEFAULT NULL,
  p_country_code       CHAR(2) DEFAULT NULL,
  p_city               TEXT DEFAULT NULL,
  p_device_type        TEXT DEFAULT NULL,
  p_connection_type    TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_session_id    UUID;
  v_is_new        BOOLEAN := FALSE;
  v_invite_id     UUID;
  v_guest_list    JSONB := '[]'::jsonb;
  v_event_name    TEXT;
  v_event_slug    TEXT;
  v_privacy_mode  privacy_mode;
BEGIN
  -- Get event info
  SELECT name, slug, privacy_mode INTO v_event_name, v_event_slug, v_privacy_mode
  FROM events WHERE id = p_event_id;

  IF v_event_name IS NULL THEN
    RETURN jsonb_build_object('error', 'Event not found');
  END IF;

  -- Try to match guest name against invite list
  IF p_guest_name IS NOT NULL THEN
    SELECT id INTO v_invite_id
    FROM event_invites
    WHERE event_id = p_event_id
      AND (LOWER(guest_name) = LOWER(p_guest_name)
           OR LOWER(email) = LOWER(p_guest_name))
      AND rsvp_status IN ('confirmed', 'pending')
    LIMIT 1;
  END IF;

  -- Get the guest list for this event (to show to the guest)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', guest_name,
      'is_confirmed', rsvp_status = 'confirmed'
    )
    ORDER BY guest_name
  ) INTO v_guest_list
  FROM event_invites
  WHERE event_id = p_event_id
    AND rsvp_status IN ('confirmed', 'pending')
    AND guest_name IS NOT NULL
  LIMIT 50;

  -- Upsert: find existing active session or create new one
  SELECT id INTO v_session_id
  FROM guest_sessions
  WHERE event_id = p_event_id
    AND session_fingerprint = p_session_fingerprint
    AND is_active = TRUE
  LIMIT 1;

  IF v_session_id IS NULL THEN
    v_is_new := TRUE;
    INSERT INTO guest_sessions (
      event_id, qr_id, guest_name, session_fingerprint,
      ip_address, user_agent, country_code, city,
      device_type, connection_type,
      matched_invite_id, is_matched
    ) VALUES (
      p_event_id, p_qr_id, p_guest_name, p_session_fingerprint,
      p_ip_address, p_user_agent, p_country_code, p_city,
      p_device_type, p_connection_type,
      v_invite_id, v_invite_id IS NOT NULL
    )
    RETURNING id INTO v_session_id;

    -- Update event guest count (async-safe via trigger)
    UPDATE events SET guest_count = guest_count + 1 WHERE id = p_event_id;
  ELSE
    -- Update existing session with new info
    UPDATE guest_sessions
    SET guest_name = COALESCE(p_guest_name, guest_name),
      matched_invite_id = COALESCE(v_invite_id, matched_invite_id),
      is_matched = is_matched OR (v_invite_id IS NOT NULL),
      last_active_at = NOW(),
      ip_address = COALESCE(p_ip_address, ip_address),
      user_agent = COALESCE(p_user_agent, user_agent)
    WHERE id = v_session_id;
  END IF;

  RETURN jsonb_build_object(
    'session_id', v_session_id,
    'is_new', v_is_new,
    'event_id', p_event_id,
    'event_name', v_event_name,
    'event_slug', v_event_slug,
    'privacy_mode', v_privacy_mode,
    'guest_name', p_guest_name,
    'matched_invite_id', v_invite_id,
    'is_matched', v_invite_id IS NOT NULL,
    'guest_list', COALESCE(v_guest_list, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Function: Register guest name for a session
-- Called when guest types their name or selects from list
-- ============================================================

CREATE OR REPLACE FUNCTION register_guest_name(
  p_session_id         UUID,
  p_guest_name         TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_event_id     UUID;
  v_invite_id    UUID;
  v_result       JSONB;
BEGIN
  -- Update session with guest name
  UPDATE guest_sessions
  SET guest_name = p_guest_name,
      last_active_at = NOW()
  WHERE id = p_session_id
  RETURNING event_id INTO v_event_id;

  IF v_event_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Session not found');
  END IF;

  -- Try to match against invite list
  SELECT id INTO v_invite_id
  FROM event_invites
  WHERE event_id = v_event_id
    AND (LOWER(guest_name) = LOWER(p_guest_name)
         OR LOWER(email) = LOWER(p_guest_name))
    AND rsvp_status IN ('confirmed', 'pending')
    LIMIT 1;

  IF v_invite_id IS NOT NULL THEN
    UPDATE guest_sessions
    SET matched_invite_id = v_invite_id,
        is_matched = TRUE
    WHERE id = p_session_id;

    -- Update RSVP status if pending
    UPDATE event_invites
    SET rsvp_status = 'confirmed', checked_in_at = NOW()
    WHERE id = v_invite_id AND rsvp_status = 'pending';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'guest_name', p_guest_name,
    'matched_invite_id', v_invite_id,
    'is_matched', v_invite_id IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Function: Get guest list for an event (shown to scanning guest)
-- Returns names for the guest to identify themselves
-- ============================================================

CREATE OR REPLACE FUNCTION get_event_guest_list(
  p_event_id UUID,
  p_search_term TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'name', guest_name,
      'is_confirmed', rsvp_status = 'confirmed'
    )
    ORDER BY guest_name
  ) INTO v_result
  FROM event_invites
  WHERE event_id = p_event_id
    AND rsvp_status IN ('confirmed', 'pending')
    AND guest_name IS NOT NULL
    AND (p_search_term IS NULL
         OR guest_name ILIKE '%' || p_search_term || '%'
         OR email ILIKE '%' || p_search_term || '%')
    LIMIT 50;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Function: Increment guest session activity counters
-- Lightweight way to track engagement without auth
-- ============================================================

CREATE OR REPLACE FUNCTION increment_guest_activity(
  p_session_id         UUID,
  p_action             TEXT  -- 'view', 'upload', 'share', 'like', 'guestbook', 'face_scan'
)
RETURNS VOID AS $$
BEGIN
  CASE p_action
    WHEN 'view' THEN
      UPDATE guest_sessions SET photos_viewed = photos_viewed + 1, last_active_at = NOW() WHERE id = p_session_id;
    WHEN 'upload' THEN
      UPDATE guest_sessions SET photos_uploaded = photos_uploaded + 1, last_active_at = NOW() WHERE id = p_session_id;
    WHEN 'share' THEN
      UPDATE guest_sessions SET photos_shared = photos_shared + 1, last_active_at = NOW() WHERE id = p_session_id;
    WHEN 'like' THEN
      UPDATE guest_sessions SET photos_liked = photos_liked + 1, last_active_at = NOW() WHERE id = p_session_id;
    WHEN 'guestbook' THEN
      UPDATE guest_sessions SET guestbook_entries = guestbook_entries + 1, last_active_at = NOW() WHERE id = p_session_id;
    WHEN 'face_scan' THEN
      UPDATE guest_sessions SET face_scans_performed = face_scans_performed + 1, last_active_at = NOW() WHERE id = p_session_id;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Function: Expire old guest sessions (call via cron)
-- ============================================================

CREATE OR REPLACE FUNCTION expire_old_guest_sessions()
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE guest_sessions
  SET is_active = FALSE,
      expired_at = NOW()
  WHERE is_active = TRUE
    AND last_active_at < NOW() - INTERVAL '24 hours'
  RETURNING COUNT(*) INTO v_count;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Updated: get_event_stats to include anonymous guests
-- ============================================================

CREATE OR REPLACE FUNCTION get_event_stats(event_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'photo_count', COALESCE((SELECT COUNT(*) FROM photos WHERE event_id = event_id_param), 0),
    'guest_count', COALESCE((
      SELECT COUNT(DISTINCT CASE WHEN uploader_id IS NOT NULL THEN uploader_id ELSE uploader_guest_name END)
      FROM photos WHERE event_id = event_id_param
    ), 0),
    'unique_faces', COALESCE((SELECT COUNT(*) FROM face_clusters WHERE event_id = event_id_param), 0),
    'total_views', COALESCE((SELECT SUM(view_count) FROM photos WHERE event_id = event_id_param), 0),
    'total_downloads', COALESCE((SELECT SUM(download_count) FROM photos WHERE event_id = event_id_param), 0),
    'total_shares', COALESCE((SELECT SUM(share_count) FROM photos WHERE event_id = event_id_param), 0),
    'total_likes', COALESCE((SELECT SUM(like_count) FROM photos WHERE event_id = event_id_param), 0),
    'guestbook_entries', COALESCE((SELECT COUNT(*) FROM guestbook_entries WHERE event_id = event_id_param AND is_hidden = FALSE), 0),
    'qr_scans', COALESCE((SELECT SUM(scan_count) FROM qr_codes WHERE event_id = event_id_param), 0),
    'face_scans_count', COALESCE((SELECT COUNT(*) FROM face_scans WHERE event_id = event_id_param), 0),
    -- New: anonymous guest session stats
    'active_guest_sessions', COALESCE((SELECT COUNT(*) FROM guest_sessions WHERE event_id = event_id_param AND is_active = TRUE), 0),
    'total_guest_sessions', COALESCE((SELECT COUNT(*) FROM guest_sessions WHERE event_id = event_id_param), 0),
    'anonymous_uploads', COALESCE((SELECT COUNT(*) FROM photos WHERE event_id = event_id_param AND uploader_id IS NULL AND uploader_source = 'guest'), 0),
    'guest_photos_viewed', COALESCE((SELECT SUM(photos_viewed) FROM guest_sessions WHERE event_id = event_id_param), 0)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
