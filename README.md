# MomentShare Pro

Build "SnapShare" — a modern, mobile-first event photo sharing SaaS platform designed for the African market (Mozambique, Angola, Brazil, Portugal). The platform allows event organizers, photographers, and guests to share event photos via QR codes and AI face recognition. Think of it as a blend of GUESTPIX + SnapSeek + Kululu, but with unique African market differentiators.

CORE CONCEPT:

A PWA (Progressive Web App) where event organizers create an event, get a unique QR code, share it with guests (printed on invitations, displayed at the venue, or sent via WhatsApp). Guests scan the QR with their phone camera (NO app download needed), access the event gallery, upload their own photos, take a selfie to find all photos of themselves using face recognition, and download or share photos on social media.

DESIGN DIRECTION:

- Modern, clean, and elegant design

- Dark mode default with warm accent colors (gold/amber for weddings, vibrant colors for parties)

- Mobile-first: 90% of users will access via phone

- Smooth animations and micro-interactions

- Use Inter font for body, Playfair Display for headings (elegant feel for weddings)

- Color palette: Deep charcoal background (#1a1a2e), Gold accent (#d4a853), White text (#f5f5f5), Soft pink for wedding vibe (#f8e8e0)

- Glassmorphism cards and subtle gradients

- Fully responsive (mobile, tablet, desktop)

- Installable PWA with offline support

LANDING PAGE (Public):

- Hero section with a beautiful mockup of a wedding photo gallery on a phone

- Tagline: "As suas memórias, partilhadas instantaneamente" (with English toggle)

- Language switcher: Portuguese / English

- Features section with icons:

  1. QR Code Sharing (icon: qr-code)

  2. AI Face Recognition (icon: scan-face)

  3. Offline Mode (icon: wifi-off)

  4. WhatsApp Delivery (icon: message-circle)

  5. Live Photo Wall (icon: tv)

  6. Local Payments - M-Pesa, PIX (icon: credit-card)

- Pricing section (3 tiers):

  - Free: 1 event, 50 photos, 7-day access, watermarked

  - Premium ($29/event or $19/month): Unlimited photos, 90-day access, no watermark, face recognition, live wall

  - Professional ($99/event or $59/month): Everything in Premium + custom branding, photographer access, analytics, video uploads, priority support

- Testimonials carousel with wedding/event photos

- Footer with links, social media, language toggle

EVENT CREATION FLOW (Auth required):

- Clean multi-step form (step wizard):

  Step 1: Event type (Wedding, Birthday, Corporate, Party, Other) + Event name + Date + Time

  Step 2: Cover photo upload + Event theme color picker (pre-built themes: Classic Wedding, Modern Minimal, Tropical, Elegant Gold, Fun Party)

  Step 3: Privacy settings (Public gallery / Private with access code / Invite-only)

  Step 4: Optional upgrades (Live Wall, Video uploads, Custom domain)

- After creation: Show the unique event page URL + QR Code (downloadable as PNG/SVG) + WhatsApp share button + Embed code for websites

- Dashboard with all events listed (cards with cover, name, date, photo count, views, status)

EVENT GALLERY PAGE (Guest view - accessed via QR or link):

- Beautiful full-screen hero with event cover photo + event name + date

- "Scan your face to find your photos" button (prominent, with camera icon)

- Photo grid (masonry layout) with lazy loading

- Upload button (floating action button, bottom-right) for guests to add their photos

- Filter by: All photos / My photos / Videos

- Search by face: After selfie, show only photos with that person

- Photo lightbox: Full-screen view with prev/next, download, share to WhatsApp/Facebook/Instagram, like button

- Guest book section: Text messages from guests (like a digital guestbook)

- Live Wall section (if enabled): Real-time slideshow of all uploaded photos

- Event countdown timer (if event hasn't happened yet)

- Access code input (if private event)

FACE RECOGNITION FLOW:

- Button "Encontrar as minhas fotos" (Find my photos)

- Opens camera for selfie (use browser getUserMedia API)

- Show scanning animation (face outline scanning effect)

- After detection: filter gallery to show only photos with that person

- Cache face embedding in localStorage so returning guests don't need to scan again

- Show confidence percentage

- If no match: "No photos found yet. They may be uploaded later!"

PHOTO UPLOAD FLOW (Guest):

- Click upload FAB button

- Select photos from gallery or take new photo

- Optional: Add caption/tag

- Upload progress bar (resumable uploads)

- Show success toast "Photo added to [Event Name]!"

- For offline: Queue uploads and sync when online (service worker)

PHOTOGRAPHER DASHBOARD:

- Professional upload panel (drag & drop, bulk upload)

- Batch watermarking (event name/logo)

- Photo organization: All / Favorites / Flagged

- Download all photos as ZIP

- Share gallery link with client

- Photography credit on all photos (configurable)

- Analytics: Views, downloads, shares per photo

LIVE PHOTO WALL (for display at events):

- Full-screen slideshow mode

- Auto-play with smooth transitions (Ken Burns effect)

- New photos appear automatically with notification sound

- Show event name + hashtag at bottom

- QR code overlay (small, corner) for guests to join

- Control panel: Play/pause, speed, filter recent/featured

- Works on any TV/monitor via browser

ADMIN DASHBOARD:

- Overview: Total events, photos uploaded, active users, revenue

- Event management: All events with stats, ability to feature/delete

- User management: View users, plans, activity

- Revenue analytics: Charts showing MRR, event purchases, growth

- Settings: Platform name, logo, default theme, payment gateways, email templates

AUTHENTICATION:

- Email + password sign up/in

- Google OAuth

- Phone number (SMS verification) — important for Africa

- "Continue as guest" option for quick event access

- Password reset via email

PAYMENTS:

- Stripe integration (international cards)

- PayPal

- M-Pesa integration placeholder (API structure ready)

- PIX integration placeholder (API structure ready)

- Pricing: Per-event purchase OR monthly subscription

- Free trial: 3 free events for new users

TECHNICAL REQUIREMENTS:

- Build with React + TypeScript + Vite + Tailwind CSS + shadcn/ui

- Use Supabase for: Auth, Database (PostgreSQL), Storage (photos), Real-time (live wall)

- PWA: Service worker for offline support, installable, push notifications

- Image optimization: Compress on upload, generate thumbnails (multiple sizes), WebP format

- Face recognition: Use a client-side face-api.js or similar lightweight library for initial version

- QR Code: Generate using qrcode library

- Responsive: Mobile-first, works on any screen size

- Performance: Lazy loading, virtual scrolling for large galleries, CDN-ready image URLs

- SEO: Meta tags, Open Graph images for event sharing

NAVIGATION:

- Public pages: Landing, Event Gallery, Pricing

- Auth pages: Login, Register, Forgot Password

- App pages (auth required): Dashboard, Create Event, My Events, Event Detail, Photographer Panel, Settings, Billing

IMPORTANT NOTES:

- The entire UI must be in Portuguese (pt-MO / pt-BR) by default with English toggle

- Mobile-first design: 90% of users will be on phones

- Offline-capable: Photos queue when offline and upload when back online

- WhatsApp integration: Share event links, deliver photos via WhatsApp message

- Keep the code clean, modular, and well-organized

- Use skeleton loading states for all data fetching

- Add subtle animations (page transitions, hover effects, upload progress)

- Make it feel premium and elegant — this is for weddings and special moments

## Development

You need Node.js and Bun — install Bun via [bun.sh](https://bun.sh).

```sh
git clone https://github.com/kenjunior01/momentshare-pro.git
cd momentshare-pro
bun install
bun run dev
```

## Deploy

```sh
bun run build
bun run preview
```
