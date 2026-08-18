-- ============================================================
-- MOMENTSHARE PRO — Seed Data
-- Dados iniciais para desenvolvimento e demonstração
-- ============================================================

-- ============================================================
-- 1. DEMO USERS
-- ============================================================

-- Admin
INSERT INTO users (id, email, phone, full_name, role, locale, country_code, timezone, avatar_url, metadata)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@memoir.app',
  '+258840000001',
  'Memoir Admin',
  'admin',
  'pt',
  'MZ',
  'Africa/Maputo',
  'https://api.dicebear.com/9.x/initials/svg?seed=MA&backgroundColor=d4a574',
  '{"department": "engineering"}'::jsonb
);

-- Organizer 1 — Wedding planner in Maputo
INSERT INTO users (id, email, phone, full_name, role, locale, country_code, timezone, avatar_url, metadata)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  'ana.silva@email.com',
  '+258840000010',
  'Ana Silva',
  'organizer',
  'pt',
  'MZ',
  'Africa/Maputo',
  'https://api.dicebear.com/9.x/initials/svg?seed=AS&backgroundColor=d4a574',
  '{"company": "Momentos Perfeitos Lda", "bio": "Wedding planner com 8 anos de experiência"}'::jsonb
);

-- Organizer 2 — Event producer in Luanda
INSERT INTO users (id, email, phone, full_name, role, locale, country_code, timezone, avatar_url, metadata)
VALUES (
  '00000000-0000-0000-0000-000000000011',
  'kelvin.dosantos@email.com',
  '+244920000011',
  'Kelvin Dos Santos',
  'organizer',
  'pt',
  'AO',
  'Africa/Luanda',
  'https://api.dicebear.com/9.x/initials/svg?seed=KS&backgroundColor=d4a574',
  '{"company": "Luanda Events", "bio": "Produtor de eventos corporativos e festas"}'::jsonb
);

-- Photographer 1
INSERT INTO users (id, email, phone, full_name, role, locale, country_code, timezone, avatar_url, metadata)
VALUES (
  '00000000-0000-0000-0000-000000000020',
  'bia.ferreira@email.com',
  '+5511900000020',
  'Bia Ferreira',
  'photographer',
  'pt',
  'BR',
  'America/Sao_Paulo',
  'https://api.dicebear.com/9.x/initials/svg?seed=BF&backgroundColor=d4a574',
  '{"company": "Bia Ferreira Fotografia", "specialty": "weddings", "portfolio_url": "https://biaferreira.com"}'::jsonb
);

-- Photographer 2
INSERT INTO users (id, email, phone, full_name, role, locale, country_code, timezone, avatar_url, metadata)
VALUES (
  '00000000-0000-0000-0000-000000000021',
  'nuno.costa@email.com',
  '+351910000021',
  'Nuno Costa',
  'photographer',
  'pt',
  'PT',
  'Europe/Lisbon',
  'https://api.dicebear.com/9.x/initials/svg?seed=NC&backgroundColor=d4a574',
  '{"company": "Nuno Costa Studio", "specialty": "events,portraits", "portfolio_url": "https://nunocosta.pt"}'::jsonb
);

-- Regular guests
INSERT INTO users (id, email, phone, full_name, role, locale, country_code, timezone) VALUES
  ('00000000-0000-0000-0000-000000000030', 'maria@email.com',    '+258840000030', 'Maria João',    'guest', 'pt', 'MZ', 'Africa/Maputo'),
  ('00000000-0000-0000-0000-000000000031', 'pedro@email.com',    '+258840000031', 'Pedro Machava', 'guest', 'pt', 'MZ', 'Africa/Maputo'),
  ('00000000-0000-0000-0000-000000000032', 'luana@email.com',    '+244920000032', 'Luana Domingos','guest', 'pt', 'AO', 'Africa/Luanda'),
  ('00000000-0000-0000-0000-000000000033', 'carlos@email.com',   '+551190000033', 'Carlos Mendes', 'guest', 'pt', 'BR', 'America/Sao_Paulo'),
  ('00000000-0000-0000-0000-000000000034', 'sofia@email.com',    '+351910000034', 'Sofia Santos', 'guest', 'pt', 'PT', 'Europe/Lisbon'),
  ('00000000-0000-0000-0000-000000000035', 'joao@email.com',     '+258840000035', 'João Mondlane', 'guest', 'pt', 'MZ', 'Africa/Maputo');

-- User preferences for demo users
INSERT INTO user_preferences (user_id, default_locale, default_country, email_notifications, push_notifications) VALUES
  ('00000000-0000-0000-0000-000000000010', 'pt', 'MZ', TRUE, TRUE),
  ('00000000-0000-0000-0000-000000000011', 'pt', 'AO', TRUE, FALSE),
  ('00000000-0000-0000-0000-000000000020', 'pt', 'BR', TRUE, TRUE),
  ('00000000-0000-0000-0000-000000000021', 'pt', 'PT', TRUE, TRUE);

-- ============================================================
-- 2. ORGANIZATIONS
-- ============================================================

INSERT INTO organizations (id, name, slug, logo_url, owner_id, plan, country_code, metadata)
VALUES (
  '00000000-0000-0000-0000-100000000001',
  'Momentos Perfeitos Lda',
  'momentos-perfeitos',
  'https://api.dicebear.com/9.x/initials/svg?seed=MP&backgroundColor=2C2420&textColor=F5F0E8',
  '00000000-0000-0000-0000-000000000010',
  'professional',
  'MZ',
  '{"website": "https://momentosperfeitos.mz", "instagram": "@momentosperfeitosmz"}'::jsonb
);

INSERT INTO organizations (id, name, slug, owner_id, plan, country_code)
VALUES (
  '00000000-0000-0000-0000-100000000002',
  'Luanda Events',
  'luanda-events',
  '00000000-0000-0000-0000-000000000011',
  'premium',
  'AO'
);

-- Organization members
INSERT INTO organization_members (org_id, user_id, role) VALUES
  ('00000000-0000-0000-0000-100000000001', '00000000-0000-0000-0000-000000000010', 'owner'),
  ('00000000-0000-0000-0000-100000000001', '00000000-0000-0000-0000-000000000020', 'photographer'),
  ('00000000-0000-0000-0000-100000000002', '00000000-0000-0000-0000-000000000011', 'owner'),
  ('00000000-0000-0000-0000-100000000002', '00000000-0000-0000-0000-000000000021', 'photographer');

-- ============================================================
-- 3. DEMO EVENTS
-- ============================================================

-- Event 1: Wedding in Maputo (active, public)
INSERT INTO events (
  id, org_id, creator_id, name, slug, event_type, description,
  starts_at, ends_at, timezone,
  theme_name, theme_colors,
  privacy_mode, status,
  live_wall_enabled, video_enabled, guestbook_enabled, face_recognition, guest_upload, download_enabled,
  max_photos, watermark_enabled, watermark_text,
  location_name, location_address,
  photo_count, guest_count, view_count, download_count, share_count,
  published_at
) VALUES (
  '00000000-0000-0000-0000-200000000001',
  '00000000-0000-0000-0000-100000000001',
  '00000000-0000-0000-0000-000000000010',
  'Casamento Ana & Nuno',
  'casamento-ana-nuno-2024',
  'wedding',
  'O grande dia da Ana e do Nuno. Uma celebração de amor na terra natal, rodeada de família e amigos.',
  '2024-12-15 14:00:00+02:00',
  '2024-12-16 04:00:00+02:00',
  'Africa/Maputo',
  'classic_wedding',
  '{"primary": "#d4a853", "secondary": "#f8e8e0", "accent": "#2C2420", "bg": "#1a1a2e"}'::jsonb,
  'public',
  'active',
  TRUE, FALSE, TRUE, TRUE, TRUE, TRUE,
  5000,
  TRUE, 'Ana & Nuno 2024',
  'Hotel Polana Serena',
  'Av. Julius Nyerere, 1238, Maputo',
  347, 89, 5420, 1890, 734,
  '2024-12-14 10:00:00+02:00'
);

-- Event 2: Birthday in Luanda (active, access_code)
INSERT INTO events (
  id, org_id, creator_id, name, slug, event_type, description,
  starts_at, ends_at, timezone,
  theme_name, theme_colors,
  privacy_mode, access_code, status,
  live_wall_enabled, video_enabled, guestbook_enabled, face_recognition, guest_upload, download_enabled,
  max_photos,
  location_name,
  photo_count, guest_count, view_count, download_count, share_count,
  published_at
) VALUES (
  '00000000-0000-0000-0000-200000000002',
  '00000000-0000-0000-0000-100000000002',
  '00000000-0000-0000-0000-000000000011',
  'Aniversário Kelvin 30',
  'aniversario-kelvin-30',
  'birthday',
  'Trinta anos de vida! Vem celebrar comigo numa noite inesquecível em Luanda.',
  '2025-02-20 20:00:00+01:00',
  '2025-02-21 05:00:00+01:00',
  'Africa/Luanda',
  'fun_party',
  '{"primary": "#FF6B35", "secondary": "#004E89", "accent": "#F5F0E8", "bg": "#1a1a2e"}'::jsonb,
  'access_code',
  'KELVIN30',
  'active',
  TRUE, TRUE, TRUE, TRUE, TRUE, TRUE,
  2000,
  'Clube Luanda',
  156, 45, 2130, 870, 412,
  '2025-02-18 15:00:00+01:00'
);

-- Event 3: Corporate event (draft)
INSERT INTO events (
  id, org_id, creator_id, name, slug, event_type, description,
  starts_at, ends_at, timezone,
  theme_name,
  privacy_mode, status,
  max_photos,
  location_name
) VALUES (
  '00000000-0000-0000-0000-200000000003',
  '00000000-0000-0000-0000-100000000001',
  '00000000-0000-0000-0000-000000000010',
  'Gala Empresarial 2025 — Vodacom',
  'gala-empresarial-vodacom-2025',
  'corporate',
  'Gala anual da Vodacom Moçambique para reconhecimento de colaboradores.',
  '2025-06-15 19:00:00+02:00',
  '2025-06-16 02:00:00+02:00',
  'Africa/Maputo',
  'modern_minimal',
  'invite_only',
  'draft',
  10000,
  'CCM — Centro de Convenções de Maputo'
);

-- Event collaborators
INSERT INTO event_collaborators (event_id, user_id, role, can_upload, can_delete, can_edit, accepted_at) VALUES
  ('00000000-0000-0000-0000-200000000001', '00000000-0000-0000-0000-000000000020', 'photographer', TRUE, TRUE, FALSE, '2024-12-10 08:00:00+02:00'),
  ('00000000-0000-0000-0000-200000000001', '00000000-0000-0000-0000-000000000021', 'photographer', TRUE, FALSE, FALSE, '2024-12-12 14:00:00+02:00'),
  ('00000000-0000-0000-0000-200000000002', '00000000-0000-0000-0000-000000000021', 'photographer', TRUE, TRUE, TRUE, '2025-02-15 10:00:00+01:00');

-- ============================================================
-- 4. QR CODES
-- ============================================================

INSERT INTO qr_codes (event_id, code, short_url, full_url, placement_type, label, scan_count, unique_scans, last_scanned_at) VALUES
  ('00000000-0000-0000-0000-200000000001',
   'a1b2c3d4', 'memoir.app/e/a1b2c3d4', 'https://memoir.app/e/a1b2c3d4',
   'invitation', 'Convite Digital', 234, 178, '2024-12-16 01:30:00+02:00'),
  ('00000000-0000-0000-0000-200000000001',
   'e5f6g7h8', 'memoir.app/e/e5f6g7h8', 'https://memoir.app/e/e5f6g7h8',
   'table', 'Mesa 5', 45, 32, '2024-12-15 22:15:00+02:00'),
  ('00000000-0000-0000-0000-200000000001',
   'i9j0k1l2', 'memoir.app/e/i9j0k1l2', 'https://memoir.app/e/i9j0k1l2',
   'screen', 'Ecrã Principal', 567, 412, '2024-12-16 02:45:00+02:00'),
  ('00000000-0000-0000-0000-200000000002',
   'm3n4o5p6', 'memoir.app/e/m3n4o5p6', 'https://memoir.app/e/m3n4o5p6',
   'invitation', 'WhatsApp', 189, 156, '2025-02-21 03:00:00+01:00');

-- ============================================================
-- 5. SUBSCRIPTIONS
-- ============================================================

INSERT INTO subscriptions (
  id, user_id, org_id, plan, status,
  current_period_start, current_period_end,
  payment_provider, provider_subscription_id,
  event_limit, photos_per_event, storage_limit_mb,
  features
) VALUES
  ('00000000-0000-0000-0000-300000000001',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-100000000001',
   'professional', 'active',
   '2025-01-01', '2025-12-31',
   'stripe', 'sub_prof_001',
   999, 50000, 50000,
   '{"live_wall": true, "video": true, "custom_branding": true, "analytics": true, "priority_support": true}'::jsonb),
  ('00000000-0000-0000-0000-300000000002',
   '00000000-0000-0000-0000-000000000011',
   '00000000-0000-0000-0000-100000000002',
   'premium', 'active',
   '2025-02-01', '2026-01-31',
   'stripe', 'sub_prem_002',
   50, 10000, 20000,
   '{"live_wall": true, "video": false, "custom_branding": false, "analytics": false, "priority_support": false}'::jsonb);

-- ============================================================
-- 6. SAMPLE ANALYTICS (last 7 days for wedding event)
-- ============================================================

INSERT INTO event_analytics_daily (event_id, date, page_views, unique_visitors, photo_uploads, photo_downloads, photo_shares, photo_likes, face_scans, qr_scans, new_photos, new_guests, guestbook_entries, live_wall_viewers, revenue) VALUES
  ('00000000-0000-0000-0000-200000000001', '2024-12-15', 1840, 520, 198, 410, 120, 89, 67, 234, 198, 45, 23, 340, 0),
  ('00000000-0000-0000-0000-200000000001', '2024-12-16', 2100, 680, 149, 580, 190, 134, 89, 312, 149, 44, 45, 520, 0),
  ('00000000-0000-0000-0000-200000000001', '2024-12-17', 890, 310, 0, 420, 180, 67, 34, 89, 0, 0, 67, 0, 0),
  ('00000000-0000-0000-0000-200000000001', '2024-12-18', 590, 210, 0, 280, 110, 45, 23, 56, 0, 0, 34, 0, 0),
  ('00000000-0000-0000-0000-200000000001', '2024-12-19', 340, 145, 0, 130, 67, 23, 12, 34, 0, 0, 12, 0, 0),
  ('00000000-0000-0000-0000-200000000001', '2024-12-20', 210, 98, 0, 70, 45, 12, 8, 23, 0, 0, 8, 0, 0),
  ('00000000-0000-0000-0000-200000000001', '2024-12-21', 150, 67, 0, 40, 22, 8, 5, 12, 0, 0, 5, 0, 0);

-- ============================================================
-- 7. SAMPLE GUESTBOOK ENTRIES
-- ============================================================

INSERT INTO guestbook_entries (event_id, user_id, guest_name, message, sentiment, sentiment_score, language) VALUES
  ('00000000-0000-0000-0000-200000000001', '00000000-0000-0000-0000-000000000030',
   'Maria João', 'Que casamento mais lindo! A Ana estava radiante. Parabéns ao casal! Que sejam muito felizes juntos.', 'positive', 0.95, 'pt'),
  ('00000000-0000-0000-0000-200000000001', '00000000-0000-0000-0000-000000000031',
   'Pedro Machava', 'A festa foi incrível! O mural ao vivo foi a melhor parte. Nunca vi nada assim em Maputo.', 'positive', 0.92, 'pt'),
  ('00000000-0000-0000-0000-200000000001', NULL,
   'Tia Beatriz', 'Meus sobrinhos, que Deus os abençoe. A cerimónia foi perfeita. Estou muito orgulhosa de vocês!', 'positive', 0.97, 'pt'),
  ('00000000-0000-0000-0000-200000000001', '00000000-0000-0000-0000-000000000032',
   'Luana Domingos', 'Vim de Luanda especialmente para este casamento e valeu cada minuto. O reconhecimento facial encontrou todas as minhas fotos em segundos. Incrível!', 'positive', 0.94, 'pt'),
  ('00000000-0000-0000-0000-200000000001', NULL,
   'Carlos (amigo do Nuno)', 'Nuno, meu irmão! Finalmente casaste! A melhor festa que já fui. Vamos repetir no aniversário!', 'positive', 0.88, 'pt');

-- ============================================================
-- 8. SAMPLE NOTIFICATIONS
-- ============================================================

INSERT INTO notifications (user_id, event_id, type, title, message, data, delivered_in_app, read_at) VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-200000000001',
   'photo_uploaded', 'Nova foto adicionada',
   'Bia Ferreira adicionou 23 novas fotos ao evento "Casamento Ana & Nuno".',
   '{"photographer_id": "00000000-0000-0000-0000-000000000020", "photo_count": 23}'::jsonb,
   TRUE, '2024-12-15 16:30:00+02:00'),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-200000000001',
   'face_matched', 'Reconhecimento facial activo',
   '12 convidados já usaram o reconhecimento facial para encontrar as suas fotos.',
   '{"scan_count": 12, "unique_faces": 8}'::jsonb,
   TRUE, NULL),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-200000000001',
   'new_guestbook_entry', 'Nova mensagem no livro de visitas',
   'Maria João deixou uma mensagem no livro de visitas do evento "Casamento Ana & Nuno".',
   '{"entry_id": "00000000-0000-0000-0000-000000000030"}'::jsonb,
   TRUE, NULL),
  ('00000000-0000-0000-0000-000000000010', NULL,
   'subscription_expiring', 'Subscrição expira em 30 dias',
   'A sua subscrição Professional expira em 30 de Janeiro de 2025. Renove para manter todas as funcionalidades.',
   '{"expiry_date": "2025-01-31"}'::jsonb,
   TRUE, NULL);

-- ============================================================
-- 9. LIVE WALL SESSION
-- ============================================================

INSERT INTO live_wall_sessions (id, event_id, display_name, started_by, is_active, viewer_count, started_at, ended_at) VALUES
  ('00000000-0000-0000-0000-600000000001', '00000000-0000-0000-0000-200000000001',
   'Ecrã Principal — Salão',
   '00000000-0000-0000-0000-000000000010',
   FALSE, 0,
   '2024-12-15 18:00:00+02:00', '2024-12-16 03:00:00+02:00');

-- ============================================================
-- 10. SAMPLE EVENT INVITES (for draft corporate event)
-- ============================================================

INSERT INTO event_invites (event_id, email, name, invite_code, sent_at) VALUES
  ('00000000-0000-0000-0000-200000000003', 'ceo@vodacom.co.mz', 'CEO Vodacom', 'vodam2025ceo', NOW()),
  ('00000000-0000-0000-0000-200000000003', 'hr@vodacom.co.mz', 'Departamento RH', 'vodam2025hr', NOW()),
  ('00000000-0000-0000-0000-200000000003', 'marketing@vodacom.co.mz', 'Equipa Marketing', 'vodam2025mkt', NOW());
