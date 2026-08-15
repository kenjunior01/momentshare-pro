import matplotlib
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch
import numpy as np

fm.fontManager.addfont('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
plt.rcParams['font.sans-serif'] = ['DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

# Color palette (Morandi Warm - matches Memoir brand)
C_BG = '#FAF8F4'
C_TEXT = '#2C2420'
C_MUTED = '#8B7355'
C_PRIMARY = '#D4A574'

# Domain colors
DOMAIN_COLORS = {
    'users':      {'bg': '#F0EDE6', 'header': '#E2DDD3', 'border': '#C8BFA8'},
    'events':     {'bg': '#EDE8DF', 'header': '#DDD5C8', 'border': '#C4B89C'},
    'photos':     {'bg': '#E8E3DA', 'header': '#D8D0C3', 'border': '#BFB393'},
    'face':       {'bg': '#E5DFD5', 'header': '#D5CDBE', 'border': '#B8A98A'},
    'qr':         {'bg': '#F2EFEB', 'header': '#E6E0D8', 'border': '#CFC5B5'},
    'payments':   {'bg': '#EAE5DC', 'header': '#DAD3C7', 'border': '#C2B594'},
    'engagement': {'bg': '#F1EDE7', 'header': '#E3DDD4', 'border': '#CCC2B0'},
    'analytics':  {'bg': '#EDEAE5', 'header': '#DFD9D0', 'border': '#C8BEB0'},
    'system':     {'bg': '#F4F1ED', 'header': '#E8E3DB', 'border': '#D1C9BC'},
}

# ── Table definitions grouped by domain ──
SCHEMA = [
    {
        'group': 'Users & Auth',
        'domain': 'users',
        'tables': [
            ('users', ['id PK', 'email UNIQUE', 'phone', 'full_name', 'role ENUM', 'country_code', 'timezone', 'metadata JSONB']),
            ('user_identities', ['id PK', 'user_id FK → users', 'provider', 'provider_user_id', 'access_token', 'refresh_token']),
            ('user_preferences', ['user_id PK → users', 'locale', 'email_notifications', 'whatsapp_opt_in', 'face_recognition_opt_in']),
        ]
    },
    {
        'group': 'Organizations',
        'domain': 'users',
        'tables': [
            ('organizations', ['id PK', 'name', 'slug UNIQUE', 'owner_id FK → users', 'plan ENUM', 'logo_url', 'metadata JSONB']),
            ('organization_members', ['id PK', 'org_id FK', 'user_id FK → users', 'role ENUM', 'joined_at']),
        ]
    },
    {
        'group': 'Events',
        'domain': 'events',
        'tables': [
            ('events', ['id PK', 'org_id FK → orgs', 'creator_id FK → users', 'name', 'slug', 'event_type ENUM',
                        'starts_at', 'ends_at', 'privacy_mode ENUM', 'access_code UNIQUE',
                        'live_wall_enabled', 'face_recognition', 'guest_upload',
                        'location_point GEOGRAPHY', 'photo_count', 'view_count', 'metadata JSONB']),
            ('event_collaborators', ['id PK', 'event_id FK → events', 'user_id FK → users', 'role ENUM', 'can_upload', 'can_delete', 'can_edit']),
            ('event_invites', ['id PK', 'event_id FK → events', 'email', 'phone', 'name', 'invite_code UNIQUE', 'accepted_at']),
        ]
    },
    {
        'group': 'Photos',
        'domain': 'photos',
        'tables': [
            ('photos', ['id PK', 'event_id FK → events', 'uploader_id FK → users', 'original_url',
                        'thumbnail_urls JSONB', 'blurhash', 'width', 'height', 'file_size_bytes',
                        'exif_data JSONB', 'face_detection ENUM', 'face_count',
                        'ai_tags TEXT[]', 'ai_description', 'quality_score',
                        'is_flagged', 'is_favorite', 'is_featured',
                        'view_count', 'download_count', 'share_count', 'like_count']),
            ('photo_likes', ['id PK', 'photo_id FK → photos', 'user_id FK → users', 'session_fingerprint', 'created_at']),
            ('photo_comments', ['id PK', 'photo_id FK → photos', 'user_id FK → users', 'message', 'parent_id FK self']),
        ]
    },
    {
        'group': 'Face Recognition (AI)',
        'domain': 'face',
        'tables': [
            ('face_clusters', ['id PK', 'event_id FK → events', 'label', 'representative_photo_id FK',
                               'centroid_embedding VECTOR(128)', 'embedding_version',
                               'sample_count', 'confidence_score',
                               'guest_claimed_by FK → users', 'photo_count']),
            ('face_detections', ['id PK', 'photo_id FK → photos', 'cluster_id FK → clusters',
                                'embedding VECTOR(128)', 'bounding_box JSONB',
                                'confidence', 'landmark_points JSONB',
                                'face_quality', 'is_verified', 'reviewed_by FK']),
            ('face_scans', ['id PK', 'event_id FK → events', 'user_id FK → users',
                           'session_fingerprint', 'query_embedding VECTOR(128)',
                           'matched_cluster_id FK', 'match_confidence', 'photos_returned']),
        ]
    },
    {
        'group': 'QR Codes & Sharing',
        'domain': 'qr',
        'tables': [
            ('qr_codes', ['id PK', 'event_id FK → events', 'code UNIQUE', 'short_url UNIQUE', 'full_url',
                        'placement_type', 'label', 'scan_count', 'unique_scans', 'customization JSONB']),
            ('qr_scans', ['id PK', 'qr_id FK → qr_codes', 'event_id FK → events', 'user_id FK → users',
                        'ip_address INET', 'user_agent', 'country_code', 'city', 'referred_by']),
            ('photo_shares', ['id PK', 'photo_id FK → photos', 'event_id FK → events', 'user_id FK → users',
                            'platform ENUM', 'share_token UNIQUE', 'click_count']),
        ]
    },
    {
        'group': 'Guestbook & Live Wall',
        'domain': 'engagement',
        'tables': [
            ('guestbook_entries', ['id PK', 'event_id FK → events', 'user_id FK → users', 'guest_name',
                                  'message', 'sentiment ENUM', 'sentiment_score', 'language', 'ai_summary']),
            ('guestbook_reactions', ['id PK', 'entry_id FK → guestbook', 'user_id FK → users', 'reaction_type']),
            ('live_wall_sessions', ['id PK', 'event_id FK → events', 'display_name', 'started_by FK → users',
                                   'settings JSONB', 'is_active', 'current_photo_id FK', 'viewer_count']),
            ('upload_queue', ['id PK', 'user_id FK → users', 'event_id FK → events', 'file_name',
                             'status ENUM', 'retry_count', 'error_message', 'photo_id FK → photos']),
        ]
    },
    {
        'group': 'Payments & Subscriptions',
        'domain': 'payments',
        'tables': [
            ('subscriptions', ['id PK', 'user_id FK → users', 'org_id FK → orgs', 'plan ENUM', 'status ENUM',
                              'current_period_start DATE', 'current_period_end DATE',
                              'payment_provider ENUM', 'provider_subscription_id UNIQUE',
                              'event_limit', 'photos_per_event', 'storage_limit_mb', 'features JSONB']),
            ('event_purchases', ['id PK', 'event_id FK → events', 'buyer_id FK → users', 'plan ENUM',
                                'amount DECIMAL', 'currency CHAR(3)', 'tax_amount', 'total_amount GENERATED',
                                'payment_provider ENUM', 'provider_payment_id', 'status ENUM', 'receipt_url']),
            ('payment_methods', ['id PK', 'user_id FK → users', 'type ENUM', 'provider_token',
                                'last4 CHAR(4)', 'expiry_month', 'expiry_year', 'is_default']),
        ]
    },
    {
        'group': 'Analytics & System',
        'domain': 'analytics',
        'tables': [
            ('event_analytics_daily', ['id PK', 'event_id FK → events', 'date DATE',
                                       'page_views', 'unique_visitors',
                                       'photo_uploads', 'photo_downloads', 'photo_shares',
                                       'face_scans', 'qr_scans', 'new_photos', 'new_guests',
                                       'guestbook_entries', 'live_wall_viewers', 'revenue DECIMAL']),
            ('photo_analytics_daily', ['id PK', 'photo_id FK → photos', 'event_id FK', 'date DATE',
                                       'views', 'downloads', 'shares', 'likes']),
            ('notifications', ['id PK', 'user_id FK → users', 'event_id FK → events',
                              'type ENUM', 'title', 'message', 'data JSONB',
                              'delivered_in_app', 'delivered_push', 'delivered_email', 'delivered_whatsapp', 'read_at']),
            ('activity_log', ['id PK', 'user_id FK → users', 'event_id FK → events',
                             'action', 'entity_type', 'entity_id', 'metadata JSONB',
                             'ip_address INET', 'user_agent', 'country_code']),
            ('webhook_endpoints', ['id PK', 'user_id FK → users', 'event_id FK → events',
                                  'url', 'secret', 'events TEXT[]', 'is_active',
                                  'failure_count', 'last_triggered']),
            ('event_timeline', ['id PK', 'event_id FK → events', 'photo_id FK → photos',
                               'moment_label', 'moment_order', 'start_time', 'end_time',
                               'cover_photo_id FK', 'description']),
        ]
    },
]


# ── Layout constants ──
COL_W = 280
ROW_H = 19
HEADER_H = 28
TABLE_PAD = 3
GROUP_PAD_X = 14
GROUP_PAD_Y = 10
COL_GAP = 35
ROW_GAP = 50

fig_w = 1500

def draw_table(ax, x, y, name, fields, domain):
    """Draw a single table box at (x, y) returning its bounding box."""
    colors = DOMAIN_COLORS[domain]
    n = len(fields)
    h = HEADER_H + n * ROW_H + TABLE_PAD * 2
    w = COL_W

    # Shadow
    shadow = FancyBboxPatch(
        (x + 2, y - h - 2), w, h,
        boxstyle="round,pad=1.5", facecolor='#00000006', edgecolor='none', zorder=1
    )
    ax.add_patch(shadow)

    # Table body
    body = FancyBboxPatch(
        (x, y - h), w, h,
        boxstyle="round,pad=1.5", facecolor=colors['bg'],
        edgecolor=colors['border'], linewidth=1.0, zorder=2
    )
    ax.add_patch(body)

    # Header
    header = FancyBboxPatch(
        (x + 0.5, y - HEADER_H - 0.5), w - 1, HEADER_H,
        boxstyle="round,pad=1", facecolor=colors['header'],
        edgecolor=colors['border'], linewidth=0.6, zorder=3
    )
    ax.add_patch(header)

    # Table name
    ax.text(x + w / 2, y - HEADER_H / 2, name,
            ha='center', va='center', fontsize=8.5, fontweight='bold',
            color=C_TEXT, zorder=4)

    # Fields
    for i, field in enumerate(fields):
        fy = y - HEADER_H - TABLE_PAD - (i + 0.5) * ROW_H
        is_pk = 'PK' in field
        is_fk = 'FK' in field

        if is_pk:
            color = '#8B6914'
            fw = 'bold'
        elif is_fk:
            color = '#4A6E8C'
            fw = 'normal'
        else:
            color = '#5A5347'
            fw = 'normal'

        ax.text(x + 10, fy, field, ha='left', va='center',
                fontsize=6.2, fontfamily='monospace', color=color, fontweight=fw, zorder=4)

    return (x, y - h, x + w, y)  # (x1, y1, x2, y2)


def draw_group(ax, x, y, w, h, title, domain):
    """Draw a domain group background."""
    colors = DOMAIN_COLORS[domain]

    bg = FancyBboxPatch(
        (x, y - h), w, h,
        boxstyle="round,pad=3", facecolor=colors['bg'] + '25',
        edgecolor=colors['border'] + '50', linewidth=0.8,
        linestyle='--', zorder=0
    )
    ax.add_patch(bg)

    ax.text(x + 6, y - 5, title, ha='left', va='bottom',
            fontsize=9, fontweight='bold', color=C_MUTED,
            style='italic', zorder=5)


def draw_relationship_arrow(ax, fx, fy, tx, ty, color='#B8A98A'):
    """Draw a curved arrow from (fx,fy) to (tx,ty)."""
    mid_y = (fy + ty) / 2
    ax.annotate('', xy=(tx, ty), xytext=(fx, fy),
                arrowprops=dict(arrowstyle='->', color=color, lw=0.9,
                                connectionstyle='arc3,rad=0.15', linestyle='-'),
                zorder=1)


# ── Main drawing ──
fig, ax = plt.subplots(1, 1, figsize=(fig_w / 100, 28), dpi=150)
ax.set_xlim(0, fig_w)
ax.set_ylim(2800, 0)
ax.set_aspect('equal')
ax.axis('off')
fig.patch.set_facecolor(C_BG)
ax.set_facecolor(C_BG)

# Title area
ax.text(fig_w / 2, 45, 'MomentShare Pro (Memoir)', ha='center', va='center',
        fontsize=26, fontweight='bold', color=C_TEXT, zorder=10)
ax.text(fig_w / 2, 78, 'Complete Database Schema  ·  27 Tables  ·  PostgreSQL + pgvector + PostGIS',
        ha='center', va='center', fontsize=11, color=C_MUTED, zorder=10)

# ── Calculate group heights and assign to columns ──
start_y = 130
COLS = 3
col_width = (fig_w - 60) / COLS

group_infos = []
for group in SCHEMA:
    max_rows = max(len(t[1]) for t in group['tables'])
    table_h = HEADER_H + max_rows * ROW_H + TABLE_PAD * 2
    n_tables = len(group['tables'])
    group_h = 30 + n_tables * (table_h + 10) + GROUP_PAD_Y * 2
    group_infos.append({**group, 'calc_h': group_h, 'table_h': table_h})

# Assign groups to columns (balance heights)
col_heights = [0, 0, 0]
col_assignments = []
for gi in group_infos:
    min_col = min(range(COLS), key=lambda c: col_heights[c])
    col_assignments.append((min_col, gi))
    col_heights[min_col] += gi['calc_h'] + ROW_GAP

# Draw groups and tables
table_bboxes = {}

for col_idx, gi in col_assignments:
    x_base = 30 + col_idx * col_width
    y_cursor = start_y
    group_w = col_width - 15
    domain = gi['domain']

    # Calculate actual group height
    tables_total = sum(HEADER_H + len(t[1]) * ROW_H + TABLE_PAD * 2 + 10 for t in gi['tables'])
    actual_h = 30 + tables_total + GROUP_PAD_Y * 2

    # Draw group background
    draw_group(ax, x_base, y_cursor, group_w, actual_h, gi['group'], domain)

    # Draw tables
    ty = y_cursor - 30 - GROUP_PAD_Y
    for table_name, fields in gi['tables']:
        bb = draw_table(ax, x_base + GROUP_PAD_X, ty, table_name, fields, domain)
        table_bboxes[table_name] = bb
        n = len(fields)
        th = HEADER_H + n * ROW_H + TABLE_PAD * 2
        ty -= (th + 10)

# ── Draw relationship arrows ──
relationships = [
    ('users', 'events'),
    ('users', 'organizations'),
    ('events', 'photos'),
    ('events', 'face_clusters'),
    ('events', 'event_collaborators'),
    ('events', 'qr_codes'),
    ('events', 'guestbook_entries'),
    ('events', 'live_wall_sessions'),
    ('events', 'upload_queue'),
    ('events', 'event_invites'),
    ('events', 'event_timeline'),
    ('events', 'event_analytics_daily'),
    ('events', 'event_purchases'),
    ('photos', 'face_detections'),
    ('photos', 'photo_likes'),
    ('photos', 'photo_comments'),
    ('photos', 'photo_analytics_daily'),
    ('photos', 'photo_shares'),
    ('face_detections', 'face_clusters'),
    ('users', 'subscriptions'),
    ('users', 'notifications'),
    ('users', 'activity_log'),
    ('users', 'payment_methods'),
    ('users', 'webhook_endpoints'),
    ('organizations', 'subscriptions'),
    ('organizations', 'organization_members'),
    ('qr_codes', 'qr_scans'),
    ('guestbook_entries', 'guestbook_reactions'),
]

for from_t, to_t in relationships:
    if from_t not in table_bboxes or to_t not in table_bboxes:
        continue
    fbb = table_bboxes[from_t]
    tbb = table_bboxes[to_t]
    fx = (fbb[0] + fbb[2]) / 2
    fy = fbb[1]  # bottom
    tx = (tbb[0] + tbb[2]) / 2
    ty = tbb[3]  # top
    draw_relationship_arrow(ax, fx, fy, tx, ty)

# ── Legend ──
max_y = max(col_heights) + start_y + 40
ax.text(40, max_y, 'Legend:', fontsize=9, fontweight='bold', color=C_TEXT)
legend_items = [
    ('PK  Primary Key', '#8B6914', 'bold'),
    ('FK  Foreign Key', '#4A6E8C', 'normal'),
    ('VECTOR(128)  Face Embedding', '#7A6B55', 'normal'),
    ('JSONB  Flexible Data', '#7A6B55', 'normal'),
    ('GEOGRAPHY  Location', '#7A6B55', 'normal'),
]
for i, (label, color, fw) in enumerate(legend_items):
    lx = 40 + (i % 3) * 480
    ly = max_y + 22 + (i // 3) * 18
    ax.text(lx, ly, label, fontsize=7.5, color=color, fontweight=fw)

# Adjust canvas
final_h = max_y + 70
ax.set_ylim(final_h, 0)
fig.set_size_inches(fig_w / 100, final_h / 100)

plt.savefig('/home/z/my-project/download/momentshare-pro-er-diagram.png',
            dpi=150, bbox_inches='tight', facecolor=C_BG, edgecolor='none')
plt.close()
print(f'ER diagram saved successfully. Canvas: {fig_w}x{int(final_h)}px')
