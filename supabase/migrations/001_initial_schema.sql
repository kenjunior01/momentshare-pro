-- ============================================================
-- MOMENTSHARE PRO (MEMOIR) — Complete Database Schema
-- PostgreSQL / Supabase Migration
-- Designed for: Event Photo Sharing SaaS (African Market)
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";          -- pgvector for face embeddings
CREATE EXTENSION IF NOT EXISTS "postgis";         -- geolocation for events
CREATE EXTENSION IF NOT EXISTS "pg_trgm";         -- fuzzy text search
CREATE EXTENSION IF NOT EXISTS "btree_gin";       -- GIN indexes on JSONB

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('guest', 'organizer', 'photographer', 'admin');
CREATE TYPE event_type AS ENUM ('wedding', 'birthday', 'corporate', 'party', 'graduation', 'festival', 'religious', 'other');
CREATE TYPE event_status AS ENUM ('draft', 'upcoming', 'active', 'ended', 'archived');
CREATE TYPE privacy_mode AS ENUM ('public', 'access_code', 'invite_only');
CREATE TYPE upload_source AS ENUM ('organizer', 'photographer', 'guest', 'auto_import');
CREATE TYPE payment_provider AS ENUM ('stripe', 'mpesa', 'pix', 'paypal');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
CREATE TYPE subscription_plan AS ENUM ('free', 'premium', 'professional');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'paused');
CREATE TYPE notification_type AS ENUM (
  'event_created', 'photo_uploaded', 'photo_tagged', 'face_matched',
  'guest_joined', 'live_wall_started', 'payment_received', 'subscription_expiring',
  'event_ending_soon', 'new_guestbook_entry', 'system'
);
CREATE TYPE collaborator_role AS ENUM ('owner', 'photographer', 'editor', 'viewer');
CREATE TYPE face_detection_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE watermark_position AS ENUM ('bottom_left', 'bottom_right', 'center', 'bottom_center');
CREATE TYPE share_platform AS ENUM ('whatsapp', 'facebook', 'instagram', 'twitter', 'link_copy', 'other');
CREATE TYPE moderation AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE upload_queue_status AS ENUM ('pending', 'uploading', 'completed', 'failed', 'paused');
CREATE TYPE sentiment AS ENUM ('positive', 'neutral', 'negative', 'mixed');

-- ============================================================
-- 1. USERS & AUTHENTICATION
-- ============================================================

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT UNIQUE,
  phone           TEXT,
  phone_verified  BOOLEAN DEFAULT FALSE,
  password_hash   TEXT,                   -- bcrypt hash (Supabase Auth manages this)
  full_name       TEXT NOT NULL,
  avatar_url      TEXT,
  role            user_role NOT NULL DEFAULT 'guest',
  locale          TEXT NOT NULL DEFAULT 'pt' CHECK (locale IN ('pt', 'en')),
  country_code    CHAR(2),                 -- ISO 3166-1 alpha-2 (MZ, AO, BR, PT)
  timezone        TEXT NOT NULL DEFAULT 'Africa/Maputo',
  metadata        JSONB DEFAULT '{}',
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_phone ON users (phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_country ON users (country_code);
CREATE INDEX idx_users_created ON users (created_at DESC);

-- User social auth providers (Google, etc.)
CREATE TABLE user_identities (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider          TEXT NOT NULL,          -- 'google', 'apple', 'phone'
  provider_user_id  TEXT NOT NULL,
  provider_email    TEXT,
  access_token      TEXT,
  refresh_token     TEXT,
  expires_at        TIMESTAMPTZ,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_user_id)
);

CREATE INDEX idx_identities_user ON user_identities (user_id);

-- User preferences
CREATE TABLE user_preferences (
  user_id          UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  default_locale   TEXT NOT NULL DEFAULT 'pt',
  default_country  CHAR(2),
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications  BOOLEAN DEFAULT TRUE,
  whatsapp_opt_in    BOOLEAN DEFAULT FALSE,
  auto_download      BOOLEAN DEFAULT FALSE,
  face_recognition_opt_in BOOLEAN DEFAULT TRUE,
  preferences       JSONB DEFAULT '{}',
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. ORGANIZATIONS (for pro accounts / agencies)
-- ============================================================

CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  logo_url      TEXT,
  owner_id      UUID NOT NULL REFERENCES users(id),
  plan          subscription_plan NOT NULL DEFAULT 'free',
  country_code  CHAR(2),
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orgs_owner ON organizations (owner_id);
CREATE INDEX idx_orgs_plan ON organizations (plan);
CREATE INDEX idx_orgs_slug ON organizations (slug);

CREATE TABLE organization_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        collaborator_role NOT NULL DEFAULT 'viewer',
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, user_id)
);

-- ============================================================
-- 3. EVENTS (Core Entity)
-- ============================================================

CREATE TABLE events (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              UUID REFERENCES organizations(id) ON DELETE SET NULL,
  creator_id          UUID NOT NULL REFERENCES users(id),

  -- Basic Info
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL,
  event_type          event_type NOT NULL DEFAULT 'other',
  description         TEXT,
  cover_photo_id      UUID,  -- self-ref to photos table

  -- Scheduling
  starts_at           TIMESTAMPTZ,
  ends_at             TIMESTAMPTZ,
  timezone            TEXT NOT NULL DEFAULT 'Africa/Maputo',

  -- Theming
  theme_name          TEXT DEFAULT 'classic_wedding',  -- preset theme key
  theme_colors        JSONB DEFAULT '{}',               -- {primary, secondary, accent, bg}
  custom_css          TEXT,                              -- optional custom CSS

  -- Privacy
  privacy_mode        privacy_mode NOT NULL DEFAULT 'public',
  access_code         TEXT UNIQUE CHECK (access_code IS NULL OR length(access_code) >= 4),

  -- Branding (Pro plan)
  custom_domain       TEXT UNIQUE,
  brand_logo_url      TEXT,
  brand_text          TEXT,

  -- Features toggles
  live_wall_enabled   BOOLEAN DEFAULT FALSE,
  video_enabled       BOOLEAN DEFAULT FALSE,
  guestbook_enabled   BOOLEAN DEFAULT TRUE,
  face_recognition    BOOLEAN DEFAULT TRUE,
  guest_upload        BOOLEAN DEFAULT TRUE,
  download_enabled    BOOLEAN DEFAULT TRUE,
  watermark_enabled   BOOLEAN DEFAULT FALSE,
  watermark_text      TEXT,
  watermark_position  watermark_position DEFAULT 'bottom_right',
  watermark_opacity   DECIMAL(3,2) DEFAULT 0.70 CHECK (watermark_opacity BETWEEN 0 AND 1),

  -- Limits
  max_photos          INT DEFAULT 50,
  max_video_mb        INT DEFAULT 500,
  storage_used_mb     DECIMAL(10,2) DEFAULT 0,

  -- Status
  status              event_status NOT NULL DEFAULT 'draft',

  -- Geolocation (PostGIS)
  location_name       TEXT,
  location_address    TEXT,
  location_point      GEOGRAPHY(POINT, 4326),

  -- SEO
  og_image_url        TEXT,
  meta_title          TEXT,
  meta_description    TEXT,

  -- Counters (denormalized for performance)
  photo_count         INT DEFAULT 0,
  guest_count         INT DEFAULT 0,
  view_count          INT DEFAULT 0,
  download_count      INT DEFAULT 0,
  share_count         INT DEFAULT 0,

  metadata            JSONB DEFAULT '{}',
  published_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (creator_id, slug)
);

CREATE INDEX idx_events_creator ON events (creator_id);
CREATE INDEX idx_events_org ON events (org_id) WHERE org_id IS NOT NULL;
CREATE INDEX idx_events_status ON events (status);
CREATE INDEX idx_events_type ON events (event_type);
CREATE INDEX idx_events_dates ON events (starts_at, ends_at);
CREATE INDEX idx_events_privacy ON events (privacy_mode);
CREATE INDEX idx_events_slug ON events (slug);
CREATE INDEX idx_events_location ON events USING GIST (location_point);
CREATE INDEX idx_events_search ON events USING GIN (
  (to_tsvector('portuguese', coalesce(name, '')) || to_tsvector('english', coalesce(name, '')))
);
CREATE INDEX idx_events_metadata ON events USING GIN (metadata);

-- Event collaborators (photographers, co-organizers)
CREATE TABLE event_collaborators (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        collaborator_role NOT NULL DEFAULT 'viewer',
  can_upload  BOOLEAN DEFAULT TRUE,
  can_delete  BOOLEAN DEFAULT FALSE,
  can_edit    BOOLEAN DEFAULT FALSE,
  invited_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE (event_id, user_id)
);

CREATE INDEX idx_collabs_event ON event_collaborators (event_id);
CREATE INDEX idx_collabs_user ON event_collaborators (user_id);

-- Event invite list (for invite_only mode)
CREATE TABLE event_invites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  phone       TEXT,
  email       TEXT,
  name        TEXT,
  invite_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
  sent_at     TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

CREATE INDEX idx_invites_event ON event_invites (event_id);
CREATE INDEX idx_invites_code ON event_invites (invite_code);
CREATE INDEX idx_invites_email ON event_invites (email) WHERE email IS NOT NULL;

-- ============================================================
-- 4. PHOTOS (Core Entity)
-- ============================================================

CREATE TABLE photos (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Who uploaded
  uploader_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  uploader_source     upload_source NOT NULL DEFAULT 'guest',
  uploader_guest_name TEXT,  -- for unauthenticated guests

  -- File Storage (Supabase Storage paths)
  storage_bucket       TEXT NOT NULL DEFAULT 'event-photos',
  storage_path        TEXT NOT NULL,      -- path in bucket
  original_url        TEXT NOT NULL,      -- public CDN URL
  thumbnail_urls      JSONB NOT NULL DEFAULT '{}',
  -- {"sm": "...", "md": "...", "lg": "...", "blurhash": "..."}

  -- Image metadata
  width               INT,
  height              INT,
  file_size_bytes     BIGINT,
  mime_type           TEXT NOT NULL DEFAULT 'image/jpeg',
  blurhash            TEXT,                -- for placeholder rendering
  dominant_color      CHAR(7),             -- hex color
  aspect_ratio        DECIMAL(5,3),
  orientation         SMALLINT,            -- EXIF orientation (1-8)

  -- EXIF Data (extracted)
  exif_data           JSONB DEFAULT '{}',
  -- {camera_make, camera_model, lens, focal_length, aperture, iso,
  --  shutter_speed, gps_lat, gps_lng, taken_at, ...}

  -- AI Processing
  face_detection       face_detection_status DEFAULT 'pending',
  face_count          INT DEFAULT 0,
  ai_tags             TEXT[] DEFAULT '{}',
  ai_description      TEXT,                -- AI-generated caption
  quality_score       DECIMAL(3,2),         -- 0.00-1.00 aesthetic quality

  -- Content
  caption             TEXT,
  is_flagged          BOOLEAN DEFAULT FALSE,
  flag_reason         TEXT,
  is_favorite         BOOLEAN DEFAULT FALSE,
  is_featured         BOOLEAN DEFAULT FALSE,  -- shown on live wall
  sort_order          INT DEFAULT 0,

  -- Counters
  view_count          INT DEFAULT 0,
  download_count      INT DEFAULT 0,
  share_count         INT DEFAULT 0,
  like_count          INT DEFAULT 0,

  -- Timing
  taken_at            TIMESTAMPTZ,          -- from EXIF or user-set
  uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at        TIMESTAMPTZ,

  -- Video support
  duration_seconds    DECIMAL(8,2),
  video_thumbnail_time DECIMAL(5,2),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_photos_event ON photos (event_id);
CREATE INDEX idx_photos_uploader ON photos (uploader_id) WHERE uploader_id IS NOT NULL;
CREATE INDEX idx_photos_taken ON photos (taken_at DESC) WHERE taken_at IS NOT NULL;
CREATE INDEX idx_photos_uploaded ON photos (uploaded_at DESC);
CREATE INDEX idx_photos_featured ON photos (event_id, is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_photos_favorite ON photos (event_id, is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX idx_photos_flagged ON photos (is_flagged) WHERE is_flagged = TRUE;
CREATE INDEX idx_photos_ai_tags ON photos USING GIN (ai_tags);
CREATE INDEX idx_photos_exif ON photos USING GIN (exif_data);
CREATE INDEX idx_photos_quality ON photos (event_id, quality_score DESC NULLS LAST);

-- ============================================================
-- 5. FACE RECOGNITION (Innovative Core)
-- ============================================================

-- Face clusters = unique people in an event
CREATE TABLE face_clusters (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Identity
  label                 TEXT,               -- name given by user ("Ana", "Noivo")
  representative_photo_id UUID REFERENCES photos(id) ON DELETE SET NULL,

  -- ML Data
  centroid_embedding    vector(128),         -- average embedding of this person
  embedding_version     TEXT NOT NULL DEFAULT 'v1',
  sample_count         INT DEFAULT 0,
  confidence_score     DECIMAL(3,2),         -- cluster consistency 0-1

  -- Guest self-identification
  guest_claimed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  claimed_at           TIMESTAMPTZ,

  -- Stats
  photo_count          INT DEFAULT 0,

  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clusters_event ON face_clusters (event_id);
CREATE INDEX idx_clusters_claimed ON face_clusters (guest_claimed_by) WHERE guest_claimed_by IS NOT NULL;

-- Individual face detections in photos
CREATE TABLE face_detections (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id        UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  cluster_id      UUID REFERENCES face_clusters(id) ON DELETE SET NULL,

  -- ML Detection data
  embedding       vector(128) NOT NULL,
  bounding_box    JSONB NOT NULL,            -- {x, y, width, height} normalized 0-1
  confidence      DECIMAL(3,2) NOT NULL,     -- detection confidence 0-1
  landmark_points JSONB,                    -- {left_eye, right_eye, nose, mouth_left, mouth_right}
  face_quality    DECIMAL(3,2),              -- blur/exposure check

  -- Clustering status
  is_verified     BOOLEAN DEFAULT FALSE,    -- confirmed by a human
  reviewed_by     UUID REFERENCES users(id),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_detections_photo ON face_detections (photo_id);
CREATE INDEX idx_detections_cluster ON face_detections (cluster_id) WHERE cluster_id IS NOT NULL;
CREATE INDEX idx_detections_unassigned ON face_detections (photo_id)
  WHERE cluster_id IS NULL;

-- IVFFlat index for fast approximate nearest-neighbor face search
CREATE INDEX idx_face_embedding ON face_detections
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- HNSW index for higher quality search (alternative, uncomment to use)
-- CREATE INDEX idx_face_embedding_hnsw ON face_detections
--   USING hnsw (embedding vector_cosine_ops);

-- Guest face scans (audit log of who searched for their face)
CREATE TABLE face_scans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  session_fingerprint TEXT,                 -- for anonymous guests
  query_embedding vector(128),
  matched_cluster_id UUID REFERENCES face_clusters(id),
  match_confidence DECIMAL(3,2),
  photos_returned INT DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scans_event ON face_scans (event_id);
CREATE INDEX idx_scans_user ON face_scans (user_id) WHERE user_id IS NOT NULL;

-- ============================================================
-- 6. QR CODES & SHARING
-- ============================================================

CREATE TABLE qr_codes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  code            TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
  short_url       TEXT UNIQUE NOT NULL,      -- e.g. memoir.app/e/abc123
  full_url        TEXT NOT NULL,

  -- Placement tracking
  placement_type  TEXT,                      -- 'invitation', 'table', 'screen', 'poster'
  label           TEXT,                      -- custom label like "Table 5"

  -- Analytics
  scan_count      INT DEFAULT 0,
  unique_scans    INT DEFAULT 0,
  last_scanned_at TIMESTAMPTZ,

  -- Customization
  foreground_color CHAR(7) DEFAULT '#1a1a2e',
  background_color CHAR(7) DEFAULT '#ffffff',
  logo_url        TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_qr_event ON qr_codes (event_id);
CREATE INDEX idx_qr_code ON qr_codes (code);
CREATE INDEX idx_qr_short ON qr_codes (short_url);

-- QR scan analytics (individual scans for tracking)
CREATE TABLE qr_scans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_id           UUID NOT NULL REFERENCES qr_codes(id),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  session_fingerprint TEXT,
  ip_address      INET,
  user_agent      TEXT,
  country_code    CHAR(2),
  city            TEXT,
  referred_by     TEXT,                      -- 'direct', 'whatsapp', 'instagram', etc.
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_qrscans_qr ON qr_scans (qr_id);
CREATE INDEX idx_qrscans_event ON qr_scans (event_id);
CREATE INDEX idx_qrscans_time ON qr_scans (created_at DESC);

-- Photo/social sharing tracking
CREATE TABLE photo_shares (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id        UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  platform        share_platform NOT NULL,
  share_token     TEXT UNIQUE,                -- trackable link
  click_count     INT DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shares_photo ON photo_shares (photo_id);
CREATE INDEX idx_shares_event ON photo_shares (event_id);
CREATE INDEX idx_shares_token ON photo_shares (share_token) WHERE share_token IS NOT NULL;

-- ============================================================
-- 7. GUEST BOOK
-- ============================================================

CREATE TABLE guestbook_entries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  guest_name      TEXT NOT NULL,
  guest_photo_url TEXT,
  message         TEXT NOT NULL,

  -- AI Analysis
  sentiment       sentiment,
  sentiment_score DECIMAL(3,2),              -- -1.0 to 1.0
  language        TEXT,                      -- detected language
  ai_summary      TEXT,                      -- AI summary of entry

  -- Moderation
  is_hidden       BOOLEAN DEFAULT FALSE,
  flag_reason     TEXT,

  -- Reactions
  like_count      INT DEFAULT 0,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guestbook_event ON guestbook_entries (event_id);
CREATE INDEX idx_guestbook_visible ON guestbook_entries (event_id, created_at DESC)
  WHERE is_hidden = FALSE;
CREATE INDEX idx_guestbook_sentiment ON guestbook_entries (sentiment) WHERE sentiment IS NOT NULL;

-- ============================================================
-- 8. LIVE WALL
-- ============================================================

CREATE TABLE live_wall_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  display_name    TEXT,                      -- e.g. "Main Screen", "VIP Area"
  started_by      UUID NOT NULL REFERENCES users(id),

  -- Settings (JSONB for flexibility)
  settings        JSONB DEFAULT '{
    "transition": "ken_burns",
    "duration_seconds": 5,
    "show_event_name": true,
    "show_hashtag": true,
    "show_qr_overlay": true,
    "filter": "all",
    "sound_enabled": true,
    "auto_play": true
  }'::jsonb,

  -- State
  is_active       BOOLEAN DEFAULT TRUE,
  current_photo_id UUID REFERENCES photos(id),
  viewer_count    INT DEFAULT 0,

  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_livewall_event ON live_wall_sessions (event_id);
CREATE INDEX idx_livewall_active ON live_wall_sessions (event_id, is_active)
  WHERE is_active = TRUE;

-- ============================================================
-- 9. UPLOAD QUEUE (Offline Support)
-- ============================================================

CREATE TABLE upload_queue (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_fingerprint TEXT,

  -- File info (stored temporarily)
  file_name       TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type       TEXT,
  checksum        TEXT,                      -- SHA-256 for dedup

  -- Status
  status          upload_queue_status NOT NULL DEFAULT 'pending',
  retry_count     INT DEFAULT 0,
  max_retries     INT DEFAULT 3,
  error_message   TEXT,

  -- Result
  photo_id        UUID REFERENCES photos(id),  -- set when upload completes

  -- Timing
  queued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_uploadq_user ON upload_queue (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_uploadq_event ON upload_queue (event_id);
CREATE INDEX idx_uploadq_status ON upload_queue (status);
CREATE INDEX idx_uploadq_pending ON upload_queue (status, queued_at)
  WHERE status IN ('pending', 'failed');

-- ============================================================
-- 10. SUBSCRIPTIONS & PAYMENTS
-- ============================================================

CREATE TABLE subscriptions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id                  UUID REFERENCES organizations(id) ON DELETE SET NULL,
  plan                    subscription_plan NOT NULL,
  status                  subscription_status NOT NULL DEFAULT 'active',

  -- Billing
  current_period_start    DATE NOT NULL,
  current_period_end      DATE NOT NULL,
  trial_end               DATE,
  cancel_at               DATE,

  -- Provider
  payment_provider        payment_provider,
  provider_subscription_id TEXT UNIQUE,

  -- Limits
  event_limit             INT DEFAULT 1,
  photos_per_event        INT DEFAULT 50,
  storage_limit_mb        INT DEFAULT 500,
  features                JSONB DEFAULT '{}',  -- {live_wall: true, video: false, ...}

  metadata                JSONB DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subs_user ON subscriptions (user_id);
CREATE INDEX idx_subs_org ON subscriptions (org_id) WHERE org_id IS NOT NULL;
CREATE INDEX idx_subs_status ON subscriptions (status);
CREATE INDEX idx_subs_end ON subscriptions (current_period_end);

-- Per-event purchases (alternative to subscription)
CREATE TABLE event_purchases (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  buyer_id              UUID NOT NULL REFERENCES users(id),

  -- Product
  plan                  subscription_plan NOT NULL,
  description           TEXT,

  -- Money
  amount                DECIMAL(10,2) NOT NULL,
  currency              CHAR(3) NOT NULL DEFAULT 'USD',
  tax_amount            DECIMAL(10,2) DEFAULT 0,
  total_amount          DECIMAL(10,2) GENERATED ALWAYS AS (amount + tax_amount) STORED,

  -- Provider
  payment_provider      payment_provider NOT NULL,
  provider_payment_id   TEXT,
  provider_checkout_url TEXT,

  -- Status
  status                payment_status NOT NULL DEFAULT 'pending',
  paid_at               TIMESTAMPTZ,
  refunded_at           TIMESTAMPTZ,
  refund_reason         TEXT,

  -- Receipt
  receipt_url           TEXT,
  invoice_number        TEXT,

  metadata              JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchases_event ON event_purchases (event_id);
CREATE INDEX idx_purchases_buyer ON event_purchases (buyer_id);
CREATE INDEX idx_purchases_status ON event_purchases (status);

-- Saved payment methods
CREATE TABLE payment_methods (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type              payment_provider NOT NULL,
  provider_token    TEXT NOT NULL,
  last4             CHAR(4),
  expiry_month      INT,
  expiry_year       INT,
  billing_name      TEXT,
  is_default        BOOLEAN DEFAULT FALSE,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_paymethods_user ON payment_methods (user_id);

-- ============================================================
-- 11. ANALYTICS (Aggregated)
-- ============================================================

-- Daily event analytics
CREATE TABLE event_analytics_daily (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  date            DATE NOT NULL,

  -- Traffic
  page_views      INT DEFAULT 0,
  unique_visitors INT DEFAULT 0,

  -- Engagement
  photo_uploads   INT DEFAULT 0,
  photo_downloads INT DEFAULT 0,
  photo_shares    INT DEFAULT 0,
  photo_likes     INT DEFAULT 0,
  face_scans      INT DEFAULT 0,
  qr_scans        INT DEFAULT 0,

  -- Content
  new_photos      INT DEFAULT 0,
  new_guests      INT DEFAULT 0,
  guestbook_entries INT DEFAULT 0,
  live_wall_viewers INT DEFAULT 0,

  -- Revenue
  revenue         DECIMAL(10,2) DEFAULT 0,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, date)
);

CREATE INDEX idx_analytics_event_date ON event_analytics_daily (event_id, date DESC);

-- Individual photo daily analytics
CREATE TABLE photo_analytics_daily (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id        UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  views           INT DEFAULT 0,
  downloads       INT DEFAULT 0,
  shares          INT DEFAULT 0,
  likes           INT DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (photo_id, date)
);

CREATE INDEX idx_panalytics_photo ON photo_analytics_daily (photo_id, date DESC);

-- ============================================================
-- 12. NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id        UUID REFERENCES events(id) ON DELETE CASCADE,

  type            notification_type NOT NULL,
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  data            JSONB DEFAULT '{}',      -- {photo_id, guest_name, ...}

  -- Delivery channels
  delivered_in_app  BOOLEAN DEFAULT FALSE,
  delivered_push    BOOLEAN DEFAULT FALSE,
  delivered_email   BOOLEAN DEFAULT FALSE,
  delivered_whatsapp BOOLEAN DEFAULT FALSE,

  -- Read status
  read_at         TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifs_user ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifs_unread ON notifications (user_id, read_at)
  WHERE read_at IS NULL;
CREATE INDEX idx_notifs_event ON notifications (event_id) WHERE event_id IS NOT NULL;

-- ============================================================
-- 13. ACTIVITY LOG (Audit Trail)
-- ============================================================

CREATE TABLE activity_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  event_id        UUID REFERENCES events(id) ON DELETE SET NULL,

  action          TEXT NOT NULL,            -- 'photo.uploaded', 'event.created', etc.
  entity_type     TEXT NOT NULL,            -- 'photo', 'event', 'user'
  entity_id       UUID,

  metadata        JSONB DEFAULT '{}',
  ip_address      INET,
  user_agent      TEXT,
  country_code    CHAR(2),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_user ON activity_log (user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_activity_event ON activity_log (event_id, created_at DESC) WHERE event_id IS NOT NULL;
CREATE INDEX idx_activity_entity ON activity_log (entity_type, entity_id);
CREATE INDEX idx_activity_time ON activity_log (created_at DESC);

-- ============================================================
-- 14. PHOTO LIKES (for guest engagement)
-- ============================================================

CREATE TABLE photo_likes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id        UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  session_fingerprint TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (photo_id, coalesce(user_id, session_fingerprint))
);

CREATE INDEX idx_likes_photo ON photo_likes (photo_id);

-- ============================================================
-- 15. GUESTBOOK REACTIONS
-- ============================================================

CREATE TABLE guestbook_reactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id        UUID NOT NULL REFERENCES guestbook_entries(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  session_fingerprint TEXT,
  reaction_type   TEXT NOT NULL DEFAULT 'like',  -- 'like', 'heart', 'emoji'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entry_id, coalesce(user_id, session_fingerprint))
);

-- ============================================================
-- 16. PHOTO COMMENTS (optional per-photo discussion)
-- ============================================================

CREATE TABLE photo_comments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id        UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  guest_name      TEXT,
  message         TEXT NOT NULL,
  parent_id       UUID REFERENCES photo_comments(id) ON DELETE CASCADE,  -- replies
  is_hidden       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_photo ON photo_comments (photo_id, created_at);

-- ============================================================
-- 17. WEBHOOK ENDPOINTS (for pro integrations)
-- ============================================================

CREATE TABLE webhook_endpoints (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id        UUID REFERENCES events(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  secret          TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  events          TEXT[] NOT NULL DEFAULT '{}',  -- which events trigger this webhook
  is_active       BOOLEAN DEFAULT TRUE,
  last_triggered  TIMESTAMPTZ,
  failure_count   INT DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhooks_user ON webhook_endpoints (user_id);

-- ============================================================
-- 18. STORAGE & CACHING TABLES
-- ============================================================

-- Event timeline (reconstructed from photo EXIF for storytelling)
CREATE TABLE event_timeline (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  photo_id        UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  moment_label    TEXT,                      -- AI-generated: "Cerimónia", "Primeira Dança"
  moment_order    INT NOT NULL,
  start_time      TIMESTAMPTZ,
  end_time        TIMESTAMPTZ,
  cover_photo_id  UUID REFERENCES photos(id),
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_timeline_event ON event_timeline (event_id, moment_order);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Supabase Security
-- ============================================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE face_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE face_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE guestbook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Public events: anyone can read
CREATE POLICY "Public events are readable by everyone"
  ON events FOR SELECT
  USING (privacy_mode = 'public' AND status IN ('active', 'ended'));

-- Event photos: readable based on event privacy
CREATE POLICY "Photos of public events are readable"
  ON photos FOR SELECT
  USING (event_id IN (
    SELECT id FROM events WHERE privacy_mode = 'public' AND status IN ('active', 'ended')
  ));

-- Users can read their own data
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Organizers can manage their events
CREATE POLICY "Organizers can update their events"
  ON events FOR UPDATE
  USING (auth.uid() = creator_id OR auth.uid() IN (
    SELECT user_id FROM event_collaborators WHERE event_id = events.id AND can_edit = TRUE
  ));

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_events_updated BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_photos_updated BEFORE UPDATE ON photos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_clusters_updated BEFORE UPDATE ON face_clusters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_subscriptions_updated BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_event_purchases_updated BEFORE UPDATE ON event_purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Maintain photo_count on events
CREATE OR REPLACE FUNCTION update_event_photo_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE events SET photo_count = photo_count + 1 WHERE id = NEW.event_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE events SET photo_count = photo_count - 1 WHERE id = OLD.event_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_photo_count AFTER INSERT OR DELETE ON photos
  FOR EACH ROW EXECUTE FUNCTION update_event_photo_count();

-- Maintain face_count on photos
CREATE OR REPLACE FUNCTION update_photo_face_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE photos SET face_count = face_count + 1 WHERE id = NEW.photo_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE photos SET face_count = face_count - 1 WHERE id = OLD.photo_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_face_count AFTER INSERT OR DELETE ON face_detections
  FOR EACH ROW EXECUTE FUNCTION update_photo_face_count();

-- ============================================================
-- VIEWS (Analytics & Reporting)
-- ============================================================

-- Event summary view (for dashboards)
CREATE OR REPLACE VIEW v_event_summary AS
SELECT
  e.id AS event_id,
  e.name,
  e.slug,
  e.event_type,
  e.status,
  e.privacy_mode,
  e.starts_at,
  e.ends_at,
  e.photo_count,
  e.guest_count,
  e.view_count,
  e.download_count,
  e.share_count,
  e.created_at,
  u.full_name AS creator_name,
  u.email AS creator_email,
  o.name AS org_name,
  o.plan AS org_plan,
  -- Aggregate analytics
  COALESCE(SUM(a.page_views), 0) AS total_page_views,
  COALESCE(SUM(a.unique_visitors), 0) AS total_unique_visitors,
  COALESCE(SUM(a.photo_uploads), 0) AS total_uploads,
  COALESCE(SUM(a.photo_downloads), 0) AS total_downloads,
  COALESCE(SUM(a.face_scans), 0) AS total_face_scans,
  COALESCE(SUM(a.qr_scans), 0) AS total_qr_scans,
  COALESCE(SUM(a.revenue), 0) AS total_revenue,
  -- Face recognition stats
  COALESCE(fc.cluster_count, 0) AS unique_faces_detected,
  COALESCE(gb.entry_count, 0) AS guestbook_entries,
  -- Collaborator count
  COALESCE(ec.collab_count, 0) AS collaborator_count
FROM events e
LEFT JOIN users u ON e.creator_id = u.id
LEFT JOIN organizations o ON e.org_id = o.id
LEFT JOIN event_analytics_daily a ON a.event_id = e.id
LEFT JOIN (SELECT event_id, COUNT(*) AS cluster_count FROM face_clusters GROUP BY event_id) fc ON fc.event_id = e.id
LEFT JOIN (SELECT event_id, COUNT(*) AS entry_count FROM guestbook_entries WHERE is_hidden = FALSE GROUP BY event_id) gb ON gb.event_id = e.id
LEFT JOIN (SELECT event_id, COUNT(*) AS collab_count FROM event_collaborators GROUP BY event_id) ec ON ec.event_id = e.id
GROUP BY e.id, e.name, e.slug, e.event_type, e.status, e.privacy_mode, e.starts_at, e.ends_at,
  e.photo_count, e.guest_count, e.view_count, e.download_count, e.share_count, e.created_at,
  u.full_name, u.email, o.name, o.plan, fc.cluster_count, gb.entry_count, ec.collab_count;

-- Top photos per event (by engagement)
CREATE OR REPLACE VIEW v_top_photos AS
SELECT
  p.id,
  p.event_id,
  p.original_url,
  p.thumbnail_urls,
  p.caption,
  p.uploaded_at,
  p.view_count,
  p.download_count,
  p.share_count,
  p.like_count,
  p.quality_score,
  p.is_featured,
  (p.view_count * 1 + p.download_count * 5 + p.share_count * 3 + p.like_count * 2) AS engagement_score
FROM photos p
WHERE p.is_flagged = FALSE AND p.published_at IS NOT NULL
ORDER BY engagement_score DESC;

-- Face cluster summary with representative photos
CREATE OR REPLACE VIEW v_face_clusters_summary AS
SELECT
  fc.id AS cluster_id,
  fc.event_id,
  fc.label,
  fc.photo_count,
  fc.confidence_score,
  fc.created_at,
  p.thumbnail_urls->>'sm' AS representative_thumbnail,
  p.original_url AS representative_photo_url,
  u.full_name AS claimed_by_name
FROM face_clusters fc
LEFT JOIN photos p ON fc.representative_photo_id = p.id
LEFT JOIN users u ON fc.guest_claimed_by = u.id
ORDER BY fc.photo_count DESC;

-- Guest engagement leaderboard per event
CREATE OR REPLACE VIEW v_guest_leaderboard AS
SELECT
  p.uploader_id AS user_id,
  COALESCE(p.uploader_guest_name, u.full_name) AS name,
  p.event_id,
  COUNT(DISTINCT p.id) AS photos_uploaded,
  COALESCE(SUM(p.like_count), 0) AS total_likes_received,
  COALESCE(SUM(p.share_count), 0) AS total_shares,
  COALESCE(SUM(p.view_count), 0) AS total_views
FROM photos p
LEFT JOIN users u ON p.uploader_id = u.id
WHERE p.uploader_source = 'guest'
GROUP BY p.event_id, p.uploader_id, p.uploader_guest_name, u.full_name
ORDER BY photos_uploaded DESC;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Generate unique event slug
CREATE OR REPLACE FUNCTION generate_event_slug(base_slug TEXT)
RETURNS TEXT AS $$
DECLARE
  final_slug TEXT := base_slug;
  counter INT := 0;
BEGIN
  -- Normalize slug
  final_slug := lower(regexp_replace(final_slug, '[^a-z0-9]+', '-', 'g'));
  final_slug := regexp_replace(final_slug, '^-|-$', '', 'g');

  -- Check uniqueness and append counter if needed
  WHILE EXISTS (SELECT 1 FROM events WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Find similar faces using cosine similarity
CREATE OR REPLACE FUNCTION find_similar_faces(
  query_embedding vector(128),
  event_id_param UUID,
  threshold DECIMAL DEFAULT 0.6
)
RETURNS TABLE (
  detection_id UUID,
  photo_id UUID,
  cluster_id UUID,
  confidence DECIMAL,
  thumbnail_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    fd.id AS detection_id,
    fd.photo_id,
    fd.cluster_id,
    (1 - (fd.embedding <=> query_embedding))::DECIMAL(3,2) AS confidence,
    p.thumbnail_urls->>'sm' AS thumbnail_url
  FROM face_detections fd
  JOIN photos p ON fd.photo_id = p.id
  WHERE p.event_id = event_id_param
    AND p.is_flagged = FALSE
    AND (1 - (fd.embedding <=> query_embedding)) >= threshold
  ORDER BY fd.embedding <=> query_embedding
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- Get event stats for dashboard
CREATE OR REPLACE FUNCTION get_event_stats(event_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'photo_count', COALESCE((SELECT COUNT(*) FROM photos WHERE event_id = event_id_param), 0),
    'guest_count', COALESCE((SELECT COUNT(DISTINCT uploader_id) FROM photos WHERE event_id = event_id_param AND uploader_id IS NOT NULL), 0),
    'unique_faces', COALESCE((SELECT COUNT(*) FROM face_clusters WHERE event_id = event_id_param), 0),
    'total_views', COALESCE((SELECT SUM(view_count) FROM photos WHERE event_id = event_id_param), 0),
    'total_downloads', COALESCE((SELECT SUM(download_count) FROM photos WHERE event_id = event_id_param), 0),
    'total_shares', COALESCE((SELECT SUM(share_count) FROM photos WHERE event_id = event_id_param), 0),
    'guestbook_entries', COALESCE((SELECT COUNT(*) FROM guestbook_entries WHERE event_id = event_id_param AND is_hidden = FALSE), 0),
    'qr_scans', COALESCE((SELECT SUM(scan_count) FROM qr_codes WHERE event_id = event_id_param), 0),
    'face_scans_count', COALESCE((SELECT COUNT(*) FROM face_scans WHERE event_id = event_id_param), 0)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
