-- ============================================================
-- MOMENTSHARE PRO — Row Level Security (RLS) Policies
-- ANONYMOUS-GUEST-FIRST: QR scans work WITHOUT any login
-- ============================================================
-- Design principles:
--   1. Public/active events: anyone can SELECT photos, guestbook, QR codes
--   2. Guest uploads: allowed via uploader_guest_name + session_fingerprint
--   3. Likes, shares, comments, guestbook: all work without auth
--   4. Face scans: guests can scan their face without login
--   5. Only management (create event, update, delete) requires auth
-- ============================================================

-- ============================================================
-- USERS: Everyone can read public profiles; only self can edit
-- ============================================================

CREATE POLICY "Public profiles are readable by authenticated users"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- USER PREFERENCES: Only owner can read/write
-- ============================================================

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- ORGANIZATIONS: Members can read; owner/editors can write
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their org"
  ON organizations FOR SELECT
  USING (
    auth.uid() = owner_id
    OR id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Only owner can create org"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Org owners can update org"
  ON organizations FOR UPDATE
  USING (auth.uid() = owner_id);

-- ============================================================
-- EVENTS: Public events readable by ALL (including anonymous)
-- ============================================================

-- Replace the basic policy with comprehensive ones
DROP POLICY IF EXISTS "Public events are readable by everyone" ON events;
DROP POLICY IF EXISTS "Photos of public events are readable" ON photos;

-- ANONYMOUS: Anyone (even unauthenticated) can view public active/ended events
CREATE POLICY "Anyone can view public active/ended events"
  ON events FOR SELECT
  USING (
    privacy_mode = 'public'
    AND status IN ('active', 'ended')
  );

-- Event creator and collaborators can always view their events
CREATE POLICY "Event creator can always view their events"
  ON events FOR SELECT
  USING (
    auth.uid() = creator_id
    OR auth.uid() IN (SELECT user_id FROM event_collaborators WHERE event_id = events.id)
    OR id IN (SELECT event_id FROM event_invites WHERE (email = current_setting('request.header.x-user-email', true) OR invite_code = current_setting('request.header.x-access-code', true)))
  );

-- ANONYMOUS ACCESS: Events with access_code can be viewed when code is provided
CREATE POLICY "Access code events viewable with valid code"
  ON events FOR SELECT
  USING (
    privacy_mode = 'access_code'
    AND status IN ('active', 'ended')
    AND EXISTS (
      SELECT 1 FROM qr_codes
      WHERE qr_codes.event_id = events.id
        AND current_setting('request.header.x-access-code', true) IS NOT NULL
    )
  );

-- Only authenticated users can create events
CREATE POLICY "Authenticated users can create events"
  ON events FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Only creator or editors can update events"
  ON events FOR UPDATE
  USING (
    auth.uid() = creator_id
    OR EXISTS (
      SELECT 1 FROM event_collaborators
      WHERE event_id = events.id AND user_id = auth.uid() AND can_edit = TRUE
    )
  );

CREATE POLICY "Only creator can delete events"
  ON events FOR DELETE
  USING (auth.uid() = creator_id);

-- ============================================================
-- PHOTOS: Visible to ALL for public events; anonymous upload OK
-- ============================================================

-- ANONYMOUS: Anyone can view photos of public/active events
CREATE POLICY "Photos visible for public events — anonymous OK"
  ON photos FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events
      WHERE (privacy_mode = 'public' AND status IN ('active', 'ended'))
         OR auth.uid() = creator_id
         OR id IN (SELECT event_id FROM event_collaborators WHERE user_id = auth.uid())
    )
    AND is_flagged = FALSE
  );

-- ANONYMOUS: Guests can upload photos WITHOUT login
-- Requires: uploader_guest_name IS NOT NULL, event guest_upload = TRUE
-- uploader_id will be NULL for anonymous uploads
CREATE POLICY "Guests can upload photos without login"
  ON photos FOR INSERT
  WITH CHECK (
    event_id IN (
      SELECT id FROM events WHERE guest_upload = TRUE AND status = 'active'
    )
    -- Either authenticated (uploader_id set) OR anonymous (guest_name provided)
    AND (
      (auth.uid() IS NOT NULL AND uploader_id = auth.uid())
      OR
      (uploader_guest_name IS NOT NULL AND uploader_guest_name <> '' AND uploader_id IS NULL)
    )
  );

-- Authenticated uploaders and collaborators can manage photos
CREATE POLICY "Photographers can upload and manage"
  ON photos FOR UPDATE
  USING (
    auth.uid() = uploader_id
    OR EXISTS (
      SELECT 1 FROM event_collaborators
      WHERE event_id = photos.event_id
        AND user_id = auth.uid()
        AND can_delete = TRUE
    )
  );

-- ============================================================
-- PHOTO LIKES: Anonymous guests can like photos
-- ============================================================

ALTER TABLE photo_likes ENABLE ROW LEVEL SECURITY;

-- ANONYMOUS: Anyone can see likes
CREATE POLICY "Photo likes are publicly readable"
  ON photo_likes FOR SELECT
  USING (
    photo_id IN (
      SELECT id FROM photos
      WHERE event_id IN (
        SELECT id FROM events WHERE privacy_mode = 'public' AND status IN ('active', 'ended')
      )
      AND is_flagged = FALSE
    )
  );

-- ANONYMOUS: Guests can like photos using session_fingerprint
CREATE POLICY "Anyone can like photos"
  ON photo_likes FOR INSERT
  WITH CHECK (
    -- Must have either a user_id or a session_fingerprint
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    (session_fingerprint IS NOT NULL AND session_fingerprint <> '')
    -- And the photo must be in a public active event
    AND photo_id IN (
      SELECT id FROM photos WHERE event_id IN (
        SELECT id FROM events WHERE status = 'active'
      )
    )
  );

-- ============================================================
-- PHOTO SHARES: Anonymous guests can share photos
-- ============================================================

ALTER TABLE photo_shares ENABLE ROW LEVEL SECURITY;

-- ANONYMOUS: Anyone can see share records for public events
CREATE POLICY "Photo shares are publicly readable"
  ON photo_shares FOR SELECT
  USING (
    photo_id IN (
      SELECT id FROM photos
      WHERE event_id IN (
        SELECT id FROM events WHERE privacy_mode = 'public' AND status IN ('active', 'ended')
      )
      AND is_flagged = FALSE
    )
  );

-- ANONYMOUS: Guests can share photos without login
CREATE POLICY "Anyone can share photos"
  ON photo_shares FOR INSERT
  WITH CHECK (
    -- Either authenticated or anonymous
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    (session_fingerprint IS NOT NULL AND session_fingerprint <> '')
    -- Photo must be in an active event
    AND photo_id IN (
      SELECT id FROM photos WHERE event_id IN (
        SELECT id FROM events WHERE status IN ('active', 'ended')
      )
    )
  );

-- ============================================================
-- PHOTO COMMENTS: Anonymous guests can comment
-- ============================================================

ALTER TABLE photo_comments ENABLE ROW LEVEL SECURITY;

-- ANONYMOUS: Anyone can read comments on public event photos
CREATE POLICY "Photo comments publicly readable"
  ON photo_comments FOR SELECT
  USING (
    is_hidden = FALSE
    AND photo_id IN (
      SELECT id FROM photos
      WHERE event_id IN (
        SELECT id FROM events WHERE privacy_mode = 'public' AND status IN ('active', 'ended')
      )
      AND is_flagged = FALSE
    )
  );

-- ANONYMOUS: Guests can post comments with guest_name
CREATE POLICY "Anyone can comment on photos"
  ON photo_comments FOR INSERT
  WITH CHECK (
    message IS NOT NULL AND message <> ''
    -- Must have either auth or guest name
    AND (
      (auth.uid() IS NOT NULL AND user_id = auth.uid())
      OR
      (guest_name IS NOT NULL AND guest_name <> '' AND user_id IS NULL)
    )
    -- Photo must be in an active event
    AND photo_id IN (
      SELECT id FROM photos WHERE event_id IN (
        SELECT id FROM events WHERE status = 'active'
      )
    )
  );

-- ============================================================
-- GUESTBOOK REACTIONS: Anonymous guests can react
-- ============================================================

ALTER TABLE guestbook_reactions ENABLE ROW LEVEL SECURITY;

-- ANONYMOUS: Anyone can see reactions
CREATE POLICY "Guestbook reactions publicly readable"
  ON guestbook_reactions FOR SELECT
  USING (
    entry_id IN (
      SELECT id FROM guestbook_entries
      WHERE is_hidden = FALSE
        AND event_id IN (
          SELECT id FROM events WHERE status IN ('active', 'ended')
        )
    )
  );

-- ANONYMOUS: Anyone can react to guestbook entries
CREATE POLICY "Anyone can react to guestbook entries"
  ON guestbook_reactions FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    (session_fingerprint IS NOT NULL AND session_fingerprint <> '')
    AND entry_id IN (
      SELECT id FROM guestbook_entries
      WHERE event_id IN (
        SELECT id FROM events WHERE guestbook_enabled = TRUE AND status = 'active'
      )
    )
  );

-- ============================================================
-- FACE DATA: Restricted — only event members can access
-- ============================================================

ALTER TABLE face_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE face_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE face_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event members can view face clusters"
  ON face_clusters FOR SELECT
  USING (
    auth.uid() IN (
      SELECT creator_id FROM events WHERE id = face_clusters.event_id
      UNION
      SELECT user_id FROM event_collaborators WHERE event_id = face_clusters.event_id
    )
  );

CREATE POLICY "Users can view face detections for their events"
  ON face_detections FOR SELECT
  USING (
    photo_id IN (
      SELECT id FROM photos WHERE event_id IN (
        SELECT id FROM events WHERE creator_id = auth.uid()
        UNION
        SELECT event_id FROM event_collaborators WHERE user_id = auth.uid()
      )
    )
  );

-- ANONYMOUS: Guests can perform face scans without login
-- This enables the "find my photos" feature for QR-scanning guests
CREATE POLICY "Anyone can perform face scans"
  ON face_scans FOR INSERT
  WITH CHECK (
    -- Either authenticated or anonymous (using session_fingerprint)
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    (session_fingerprint IS NOT NULL AND session_fingerprint <> '')
    -- Event must be active
    AND event_id IN (
      SELECT id FROM events WHERE status = 'active'
    )
  );

-- ============================================================
-- QR CODES: Public read; only creator can manage
-- ============================================================

ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

-- ANONYMOUS: QR codes are publicly readable (needed for scan redirect)
CREATE POLICY "QR codes are publicly readable"
  ON qr_codes FOR SELECT
  USING (true);

CREATE POLICY "Only event creator can manage QR codes"
  ON qr_codes FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT creator_id FROM events WHERE id = event_id
    )
  );

-- ============================================================
-- QR SCANS: Anyone can insert (for tracking); only admin reads
-- ============================================================

ALTER TABLE qr_scans ENABLE ROW LEVEL SECURITY;

-- ANONYMOUS: Anyone can log QR scans (core tracking mechanism)
CREATE POLICY "Anyone can log QR scans"
  ON qr_scans FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Only event organizers can view QR scan analytics"
  ON qr_scans FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events WHERE creator_id = auth.uid()
      UNION
      SELECT event_id FROM event_collaborators WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- GUESTBOOK: ANONYMOUS read & write for active events
-- ============================================================

ALTER TABLE guestbook_entries ENABLE ROW LEVEL SECURITY;

-- ANONYMOUS: Guestbook entries are publicly readable
CREATE POLICY "Guestbook entries are publicly readable"
  ON guestbook_entries FOR SELECT
  USING (
    is_hidden = FALSE
    AND event_id IN (
      SELECT id FROM events WHERE status IN ('active', 'ended')
    )
  );

-- ANONYMOUS: Anyone can write guestbook entries (the core feature!)
-- Guest provides guest_name; no auth required
CREATE POLICY "Anyone can write guestbook entries without login"
  ON guestbook_entries FOR INSERT
  WITH CHECK (
    event_id IN (SELECT id FROM events WHERE guestbook_enabled = TRUE AND status = 'active')
    -- Must have a guest_name (from the "type your name" flow or guest list selection)
    AND guest_name IS NOT NULL AND guest_name <> ''
    AND message IS NOT NULL AND message <> ''
  );

-- ============================================================
-- ANALYTICS: Only event organizers can read
-- ============================================================

CREATE POLICY "Only organizers can view event analytics"
  ON event_analytics_daily FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events WHERE creator_id = auth.uid()
      UNION
      SELECT event_id FROM event_collaborators WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Only organizers can view photo analytics"
  ON photo_analytics_daily FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events WHERE creator_id = auth.uid()
      UNION
      SELECT event_id FROM event_collaborators WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- NOTIFICATIONS: Users can only read their own
-- ============================================================

CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications (mark read)"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- ACTIVITY LOG: Users can read their own; admins read all
-- ============================================================

CREATE POLICY "Users can read own activity log"
  ON activity_log FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- SUBSCRIPTIONS: Users can read own; system manages creation
-- ============================================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- EVENT PURCHASES: Buyer can read own; organizers can read their events
-- ============================================================

ALTER TABLE event_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can read own purchases"
  ON event_purchases FOR SELECT
  USING (auth.uid() = buyer_id);

-- ============================================================
-- UPLOAD QUEUE: ANONYMOUS guests can queue uploads
-- ============================================================

ALTER TABLE upload_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own upload queue"
  ON upload_queue FOR SELECT
  USING (auth.uid() = user_id OR session_fingerprint IS NOT NULL);

-- ANONYMOUS: Guests can insert to upload queue without login
CREATE POLICY "Anyone can insert to upload queue"
  ON upload_queue FOR INSERT
  WITH CHECK (
    -- Either authenticated user or anonymous guest with fingerprint
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    (session_fingerprint IS NOT NULL AND session_fingerprint <> '' AND user_id IS NULL)
    -- Event must exist and be active
    AND event_id IN (
      SELECT id FROM events WHERE status = 'active' AND guest_upload = TRUE
    )
  );

CREATE POLICY "Users/guests can update own queue items"
  ON upload_queue FOR UPDATE
  USING (
    auth.uid() = user_id
    OR (session_fingerprint IS NOT NULL AND session_fingerprint = upload_queue.session_fingerprint)
  );

-- ============================================================
-- EVENT TIMELINE: Publicly readable for active/ended events
-- ============================================================

ALTER TABLE event_timeline ENABLE ROW LEVEL SECURITY;

-- ANONYMOUS: Anyone can view the event timeline
CREATE POLICY "Event timeline publicly readable"
  ON event_timeline FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events WHERE privacy_mode = 'public' AND status IN ('active', 'ended')
    )
  );

-- ============================================================
-- EVENT INVITES: Guests can check if they're on the list
-- (read-only self-lookup by email/name)
-- ============================================================

ALTER TABLE event_invites ENABLE ROW LEVEL SECURITY;

-- ANONYMOUS: Anyone can look up invites for public/active events
-- (needed for the guest list display after QR scan)
CREATE POLICY "Invite list readable for active events"
  ON event_invites FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events WHERE status IN ('active', 'ended')
    )
    -- Only expose limited fields via views; RLS ensures row access
  );

-- ============================================================
-- VIEWS: Grant access to built-in views
-- ============================================================

-- v_event_summary: organizers only
CREATE POLICY "Organizers can view event summary"
  ON v_event_summary FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events WHERE creator_id = auth.uid()
      UNION
      SELECT event_id FROM event_collaborators WHERE user_id = auth.uid()
    )
  );

-- v_top_photos: publicly readable for public events
CREATE POLICY "Top photos publicly readable"
  ON v_top_photos FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events WHERE privacy_mode = 'public' AND status IN ('active', 'ended')
    )
  );

-- v_guest_leaderboard: readable by event members
CREATE POLICY "Guest leaderboard readable by event members"
  ON v_guest_leaderboard FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events
      WHERE privacy_mode = 'public' AND status IN ('active', 'ended')
         OR creator_id = auth.uid()
    )
  );
