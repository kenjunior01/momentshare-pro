-- ============================================================
-- MOMENTSHARE PRO — Analytics Aggregation Functions
-- These functions power the dashboard and reporting features
-- ============================================================

-- ============================================================
-- Daily Analytics Rollup (call via pg_cron at midnight)
-- ============================================================

CREATE OR REPLACE FUNCTION refresh_daily_analytics(target_date DATE DEFAULT CURRENT_DATE - 1)
RETURNS VOID AS $$
DECLARE
  rec RECORD;
  photo_stats JSONB;
BEGIN
  -- For each active event, compute daily stats
  FOR rec IN SELECT id FROM events WHERE status IN ('active', 'ended') LOOP

    -- Aggregate photo activity for the day
    SELECT jsonb_build_object(
      'uploads',   COALESCE((SELECT COUNT(*) FROM photos WHERE event_id = rec.id AND uploaded_at::date = target_date), 0),
      'downloads', COALESCE((SELECT SUM(download_count) FROM photo_analytics_daily WHERE event_id = rec.id AND date = target_date), 0),
      'shares',    COALESCE((SELECT SUM(share_count) FROM photo_analytics_daily WHERE event_id = rec.id AND date = target_date), 0),
      'likes',     COALESCE((SELECT SUM(like_count) FROM photo_analytics_daily WHERE event_id = rec.id AND date = target_date), 0)
    ) INTO photo_stats;

    -- Upsert daily analytics
    INSERT INTO event_analytics_daily (
      event_id, date, page_views, unique_visitors,
      photo_uploads, photo_downloads, photo_shares, photo_likes,
      face_scans, qr_scans, new_photos, new_guests,
      guestbook_entries, live_wall_viewers, revenue
    ) VALUES (
      rec.id, target_date,
      0, 0,  -- page_views and unique_visitors come from app-level tracking
      (photo_stats->>'uploads')::INT,
      (photo_stats->>'downloads')::INT,
      (photo_stats->>'shares')::INT,
      (photo_stats->>'likes')::INT,
      COALESCE((SELECT COUNT(*) FROM face_scans WHERE event_id = rec.id AND created_at::date = target_date), 0),
      COALESCE((SELECT COUNT(*) FROM qr_scans WHERE event_id = rec.id AND created_at::date = target_date), 0),
      (photo_stats->>'uploads')::INT,
      COALESCE((SELECT COUNT(DISTINCT uploader_id) FROM photos WHERE event_id = rec.id AND uploaded_at::date = target_date AND uploader_id IS NOT NULL), 0),
      COALESCE((SELECT COUNT(*) FROM guestbook_entries WHERE event_id = rec.id AND created_at::date = target_date AND is_hidden = FALSE), 0),
      COALESCE((SELECT MAX(viewer_count) FROM live_wall_sessions WHERE event_id = rec.id AND started_at::date = target_date), 0),
      COALESCE((SELECT COALESCE(SUM(amount), 0) FROM event_purchases WHERE event_id = rec.id AND paid_at::date = target_date AND status = 'completed'), 0)
    )
    ON CONFLICT (event_id, date)
    DO UPDATE SET
      photo_uploads   = EXCLUDED.photo_uploads,
      photo_downloads = EXCLUDED.photo_downloads,
      photo_shares    = EXCLUDED.photo_shares,
      photo_likes     = EXCLUDED.photo_likes,
      face_scans      = EXCLUDED.face_scans,
      qr_scans        = EXCLUDED.qr_scans,
      new_photos      = EXCLUDED.new_photos,
      new_guests      = EXCLUDED.new_guests,
      guestbook_entries = EXCLUDED.guestbook_entries,
      live_wall_viewers = EXCLUDED.live_wall_viewers,
      revenue         = EXCLUDED.revenue;

    -- Reset per-photo daily counters (they accumulate from app events)
    INSERT INTO photo_analytics_daily (photo_id, event_id, date, views, downloads, shares, likes)
    SELECT p.id, p.event_id, target_date, 0, 0, 0, 0
    FROM photos p
    WHERE p.event_id = rec.id
    ON CONFLICT (photo_id, date) DO NOTHING;

  END LOOP;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- Revenue Analytics (for admin dashboard)
-- ============================================================

CREATE OR REPLACE FUNCTION get_revenue_stats(
  start_date DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
  end_date   DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_revenue     DECIMAL,
  subscription_rev  DECIMAL,
  event_purchase_rev DECIMAL,
  total_transactions INT,
  avg_transaction    DECIMAL,
  top_country        CHAR(2),
  top_plan           TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(ep.total_amount), 0),
    0, -- subscription revenue would come from Stripe
    COALESCE(SUM(ep.total_amount), 0),
    COUNT(*),
    COALESCE(AVG(ep.total_amount), 0),
    'MZ', -- placeholder, would need join with users
    'professional'
  FROM event_purchases ep
  WHERE ep.paid_at::date BETWEEN start_date AND end_date
    AND ep.status = 'completed';
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- Engagement Score Calculator
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_event_engagement(event_id_param UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  total_photos    INT;
  total_views     INT;
  total_downloads INT;
  total_shares    INT;
  total_faces     INT;
  total_guestbook INT;
  qr_scans_total  INT;
  guest_count     INT;
  score           DECIMAL(3,2);
BEGIN
  SELECT
    photo_count, view_count, download_count, share_count, guest_count
  INTO total_photos, total_views, total_downloads, total_shares, guest_count
  FROM events WHERE id = event_id_param;

  total_faces := COALESCE((SELECT COUNT(*) FROM face_clusters WHERE event_id = event_id_param), 0);
  total_guestbook := COALESCE((SELECT COUNT(*) FROM guestbook_entries WHERE event_id = event_id_param AND is_hidden = FALSE), 0);
  qr_scans_total := COALESCE((SELECT SUM(scan_count) FROM qr_codes WHERE event_id = event_id_param), 0);

  -- Weighted engagement score (0-1)
  score := LEAST(1.0, (
    (total_views::DECIMAL * 0.1)
    + (total_downloads::DECIMAL * 0.25)
    + (total_shares::DECIMAL * 0.3)
    + (total_faces::DECIMAL * 0.15)
    + (total_guestbook::DECIMAL * 0.1)
    + (qr_scans_total::DECIMAL * 0.05)
    + (guest_count::DECIMAL * 0.05)
  ) / GREATEST(total_photos, 1) / 50.0);

  RETURN score;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- Popular Events Leaderboard
-- ============================================================

CREATE OR REPLACE VIEW v_popular_events AS
SELECT
  e.id,
  e.name,
  e.slug,
  e.event_type,
  e.status,
  e.starts_at,
  e.photo_count,
  e.guest_count,
  e.view_count,
  e.download_count,
  e.share_count,
  e.country_code,
  -- Engagement rate
  CASE WHEN e.view_count > 0
    THEN ROUND((e.download_count + e.share_count)::DECIMAL / e.view_count * 100, 1)
    ELSE 0
  END AS engagement_rate_pct,
  -- Face adoption rate
  CASE WHEN e.guest_count > 0
    THEN ROUND(COALESCE(fc.cluster_count, 0)::DECIMAL / e.guest_count * 100, 1)
    ELSE 0
  END AS face_adoption_pct
FROM events e
LEFT JOIN (
  SELECT event_id, COUNT(*) AS cluster_count
  FROM face_clusters GROUP BY event_id
) fc ON fc.event_id = e.id
WHERE e.status IN ('active', 'ended')
  AND e.photo_count > 0
ORDER BY e.view_count DESC;


-- ============================================================
-- Storage Usage Tracker
-- ============================================================

CREATE OR REPLACE FUNCTION get_storage_usage(user_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_mb', COALESCE(SUM(e.storage_used_mb), 0),
    'limit_mb', COALESCE(s.storage_limit_mb, 500),
    'usage_pct', LEAST(100, ROUND(COALESCE(SUM(e.storage_used_mb), 0)::DECIMAL / GREATEST(s.storage_limit_mb, 1) * 100, 1)),
    'by_event', COALESCE(jsonb_agg(
      jsonb_build_object(
        'event_id', e.id,
        'event_name', e.name,
        'storage_mb', e.storage_used_mb,
        'photo_count', e.photo_count
      )
    ), '[]'::jsonb)
  ) INTO result
  FROM events e
  LEFT JOIN subscriptions s ON s.user_id = user_id_param AND s.status = 'active'
  WHERE e.creator_id = user_id_param
  GROUP BY s.storage_limit_mb;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
