import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Camera,
  ScanFace,
  Users,
  Image as ImageIcon,
  MessageCircle,
  Share2,
  ArrowLeft,
  Clock,
  MapPin,
  Heart,
  WifiOff,
} from "lucide-react";
import {
  fetchPublicEvent,
  fetchPublicPhotos,
  fetchPublicGuestbook,
  addGuestbookEntry,
  uploadGuestPhotos,
  registerView,
  type PublicEvent,
} from "@/lib/db";
import { useGuestSession } from "@/hooks/useGuestSession";
import { useEventRealtime } from "@/hooks/useEventRealtime";
import { GuestNameModal } from "@/components/event/GuestNameModal";
import { AccessCodeGate } from "@/components/event/AccessCodeGate";
import { PhotoGrid } from "@/components/event/PhotoGrid";
import { PhotoLightbox } from "@/components/event/PhotoLightbox";
import { UploadFab } from "@/components/event/UploadFab";
import { GuestbookSection } from "@/components/event/GuestbookSection";
import { LiveGuestCounter } from "@/components/event/LiveGuestCounter";
import { ShareFloatingButton } from "@/components/event/SocialShareBar";
import { ConfettiEffect } from "@/components/event/ConfettiEffect";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export const Route = createFileRoute("/e/$slug")({
  head: () => ({
    meta: [
      { title: "Galeria - Memoir" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#1a1510", media: "(prefers-color-scheme: dark)" },
      { name: "theme-color", content: "#F5F0E8" },
      { property: "og:type", content: "article" },
    ],
  }),
  component: EventGalleryPage,
});

function EventGalleryPage() {
  const { slug } = Route.useParams();
  const queryClient = useQueryClient();
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "my">("all");
  const [showGuestbook, setShowGuestbook] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const [confettiPos, setConfettiPos] = useState({ x: 0, y: 0 });
  const [revealedPhotos, setRevealedPhotos] = useState<Set<string>>(new Set());
  const prevPhotoIdsRef = useRef<Set<string>>(new Set());
  const guestbookSectionRef = useRef<HTMLDivElement>(null);
  const revealedTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const prevPhotoCountRef = useRef(0);
  const heroParallaxRef = useRef<HTMLDivElement>(null);
  const [milestoneText, setMilestoneText] = useState<string | null>(null);

  // ── Guest session (anonymous, fingerprint-based, zero login) ──
  const {
    session: guest,
    showNameModal,
    registerName,
    skipName,
    setShowNameModal,
    fingerprint,
  } = useGuestSession({ eventId: slug });

  // ── Fetch event from Supabase ──
  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["public-event", slug, accessCode],
    queryFn: () => fetchPublicEvent(slug, accessCode),
    enabled: !!slug,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // ── Fetch photos from Supabase ──
  const { data: photos = [] } = useQuery({
    queryKey: ["public-photos", slug, accessCode],
    queryFn: () => fetchPublicPhotos(slug, accessCode),
    enabled: !!event,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  // ── Fetch guestbook from Supabase (only approved entries) ──
  const { data: guestbook = [] } = useQuery({
    queryKey: ["public-guestbook", slug, accessCode],
    queryFn: () => fetchPublicGuestbook(slug, accessCode),
    enabled: !!event && event.guestbook_enabled,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

  // ── Register page view ──
  useEffect(() => {
    if (slug) registerView(slug).catch(() => {});
  }, [slug]);

  // ── REALTIME: new photos & guestbook entries appear instantly ──
  useEventRealtime({
    eventId: event?.id ?? "",
    tables: ["photos", "guestbook_entries"],
    queryKeys: ["public-photos", "public-guestbook", "public-event"],
  });

  // ── Guest photo upload (zero login, just scan QR) ──
  const uploadMutation = useMutation({
    mutationFn: (files: File[]) =>
      uploadGuestPhotos(event!.id, files, guest?.name ?? "Convidado", fingerprint),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-photos"] });
      queryClient.invalidateQueries({ queryKey: ["public-event"] });
      // Trigger confetti celebration
      setConfettiPos({ x: window.innerWidth - 60, y: window.innerHeight - 100 });
      setConfettiActive(true);
      setTimeout(() => setConfettiActive(false), 100);
    },
  });

  // ── Track newly appeared photos for reveal animation ──
  useEffect(() => {
    const currentIds = new Set(photos.map((p) => p.id));
    const prevIds = prevPhotoIdsRef.current;
    if (prevIds.size > 0) {
      // Photos that exist now but didn't before are "new"
      const newIds: string[] = [];
      for (const id of currentIds) {
        if (!prevIds.has(id)) newIds.push(id);
      }
      if (newIds.length > 0) {
        setRevealedPhotos((prev) => {
          const next = new Set(prev);
          for (const id of newIds) next.add(id);
          return next;
        });
        // Remove each after 3 seconds
        for (const id of newIds) {
          if (revealedTimersRef.current.has(id)) clearTimeout(revealedTimersRef.current.get(id));
          revealedTimersRef.current.set(
            id,
            setTimeout(() => {
              setRevealedPhotos((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
              });
              }, 3000),
          );
        }
      }
    }
    prevPhotoIdsRef.current = currentIds;
    return () => {
      // Cleanup timers on unmount
      for (const t of revealedTimersRef.current.values()) clearTimeout(t);
      revealedTimersRef.current.clear();
    };
  }, [photos]);

  // ── Listen for open-guestbook custom event (from lightbox comment button) ──
  useEffect(() => {
    function handleOpenGuestbook() {
      setShowGuestbook(true);
      setActiveTab("all");
      // Scroll to the guestbook section
      setTimeout(() => {
        guestbookSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
    window.addEventListener("memoir:open-guestbook", handleOpenGuestbook);
    return () => window.removeEventListener("memoir:open-guestbook", handleOpenGuestbook);
  }, []);

  // Scroll-aware header + parallax hero
  useEffect(() => {
    const handleScroll = () => {
      setHeaderScrolled(window.scrollY > 60);
      // Parallax: move hero image wrapper at 0.3x scroll rate
      if (heroParallaxRef.current) {
        heroParallaxRef.current.style.transform = `translateY(${window.scrollY * 0.3}px)`;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Photo count milestone celebration (every 25 photos) ──
  useEffect(() => {
    const count = photos.length;
    const prev = prevPhotoCountRef.current;
    prevPhotoCountRef.current = count;
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (prev > 0 && count > prev) {
      // Check if we crossed a milestone boundary
      const prevMilestone = Math.floor(prev / 25);
      const currMilestone = Math.floor(count / 25);
      if (currMilestone > prevMilestone) {
        const milestone = currMilestone * 25;
        setMilestoneText(`📸 ${milestone} momentos capturados!`);
        timer = setTimeout(() => setMilestoneText(null), 2500);
      }
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [photos.length]);

  // Filter photos for "my photos" tab
  const filteredPhotos = useMemo(() => {
    if (activeTab === "all" || !guest) return photos;
    return photos.filter((p) => p.uploader_name === guest.name);
  }, [photos, activeTab, guest]);

  const accentColor = event?.theme_colors.primary;

  function handleAccessCode(code: string) {
    setAccessCode(code);
  }

  // ── Loading skeleton ──
  if (eventLoading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Cover skeleton */}
        <div className="skeleton w-full aspect-video max-h-[65vh]" />
        {/* Content skeleton */}
        <div className="mx-auto max-w-5xl px-4 pt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton rounded-xl aspect-[3/4]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── 404 ──
  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center animate-rise">
          <p className="text-8xl font-display text-foreground/10">404</p>
          <h1 className="mt-2 font-display text-2xl text-foreground">Evento não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este evento não existe ou foi removido.
          </p>
          <a
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-xs font-bold uppercase tracking-widest text-background transition-colors hover:bg-primary"
          >
            <ArrowLeft className="size-3.5" /> Voltar ao início
          </a>
        </div>
      </div>
    );
  }

  // ── Access code gate ──
  if (event.requires_code && !event.authorized && !accessCode) {
    return <AccessCodeGate onSubmit={handleAccessCode} accentColor={accentColor ?? undefined} />;
  }

  const eventTypeLabel =
    event.event_type === "wedding"
      ? "Casamento"
      : event.event_type === "birthday"
        ? "Aniversário"
        : "Evento";

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* ═══════════ HERO COVER ═══════════ */}
      <header className="relative">
        <div className="relative h-[65vh] min-h-[420px] overflow-hidden">
          <div
            ref={heroParallaxRef}
            className="absolute inset-0 will-change-transform ken-burns"
            style={{ transform: "translateY(0px)" }}
          >
            <img
              src={event.cover_url}
              alt={event.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-background/20" />
          <div className="film-grain absolute inset-0 pointer-events-none" />

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4">
            <a
              href="/"
              className="glass grid size-9 place-items-center rounded-full text-foreground/80 hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-4" />
            </a>
            {guest && (
              <button
                onClick={() => setShowNameModal(true)}
                className="glass flex items-center gap-2 rounded-full px-3 py-1.5 text-background/90 hover:text-background transition-colors cursor-pointer"
              >
                <div
                  className="grid size-6 place-items-center rounded-full text-[10px] font-bold"
                  style={{ backgroundColor: accentColor, color: "white" }}
                >
                  {guest.avatar_initials}
                </div>
                <span className="text-xs font-medium">{guest.name}</span>
              </button>
            )}
          </div>

          {/* Event info overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
            <div className="max-w-3xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-foreground/50">
                {eventTypeLabel}
              </p>
              <h1 className="mt-2 font-display text-3xl sm:text-5xl lg:text-6xl text-foreground leading-[1.1] text-balance">
                {event.name}
              </h1>
              {/* Personalized welcome */}
              {guest && guest.name && guest.name !== "Convidado" && (
                <p
                  className="mt-2 text-sm sm:text-base font-display italic text-secondary-foreground animate-fade-in"
                >
                  Bem-vindo(a), {guest.name}! 🎉
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-foreground/50">
                {event.location_name && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3" /> {event.location_name}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3" />{" "}
                  {new Date(event.starts_at).toLocaleDateString("pt-PT", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="size-3" /> {event.photo_count} fotos
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="size-3" /> {event.guest_count} convidados
                </span>
              </div>
              {event.hashtag && (
                <p className="mt-3 text-sm font-semibold" style={{ color: accentColor }}>
                  {event.hashtag}
                </p>
              )}
              {/* Live guest counter & social proof */}
              <div className="mt-4">
                <LiveGuestCounter
                  photoCount={event.photo_count}
                  guestCount={event.guest_count > 0 ? event.guest_count : undefined}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════ STICKY TOOLBAR ═══════════ */}
      <div
        className={`sticky top-0 z-30 transition-all duration-500 ${
          headerScrolled
            ? "glass border-b border-border/30 shadow-soft"
            : "bg-background/80 backdrop-blur-sm border-b border-border/20"
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 flex items-center gap-1 overflow-x-auto scrollbar-hide py-2.5">
          <Chip
            active={activeTab === "all"}
            onClick={() => {
              setActiveTab("all");
              setShowGuestbook(false);
            }}
            accentColor={accentColor}
          >
            Todas ({event.photo_count})
          </Chip>
          {event.face_recognition && (
            <Chip
              active={activeTab === "my"}
              onClick={() => {
                setActiveTab(activeTab === "my" ? "all" : "my");
                setShowGuestbook(false);
              }}
              accentColor={accentColor}
              icon={<ScanFace className="size-3.5" />}
            >
              As minhas fotos
            </Chip>
          )}
          {event.guestbook_enabled && (
            <Chip
              active={showGuestbook}
              onClick={() => {
                setShowGuestbook(!showGuestbook);
                setActiveTab("all");
              }}
              accentColor={accentColor}
              icon={<MessageCircle className="size-3.5" />}
            >
              Mensagens
            </Chip>
          )}
          <div className="flex-1" />
          <ThemeToggle />
          <WifiOff className="size-3.5 text-muted-foreground/30 shrink-0" />
          <button
            onClick={() => {
              navigator.share?.({ url: window.location.href, title: event.name });
            }}
            className="flex items-center gap-1.5 shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold hover:bg-secondary/60 transition-colors"
            style={{ color: accentColor }}
          >
            <Share2 className="size-3.5" /> Partilhar
          </button>
        </div>
      </div>

      {/* ═══════════ MAIN CONTENT ═══════════ */}
      <main className="max-w-5xl mx-auto px-4 pt-6 relative">
        {/* Photo count milestone overlay */}
        {milestoneText && (
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 rounded-full glass px-5 py-2.5 shadow-soft pointer-events-none"
            style={{ animation: "milestone-in-out 2.5s ease forwards" }}
            aria-live="polite"
          >
            <span className="text-sm font-semibold text-foreground whitespace-nowrap">
              {milestoneText}
            </span>
          </div>
        )}
        {showGuestbook && event.guestbook_enabled && guest && (
          <div ref={guestbookSectionRef}>
          <GuestbookSection
            entries={guestbook}
            guestName={guest.name}
            accentColor={accentColor ?? undefined}
            eventId={event.id}
            fingerprint={fingerprint}
          />
          </div>
        )}
        <PhotoGrid photos={filteredPhotos} onPhotoClick={(i) => setLightboxIndex(i)} revealedPhotos={revealedPhotos} />
        {filteredPhotos.length > 0 && (
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-3 rounded-full glass px-5 py-2.5">
              <ImageIcon className="size-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {filteredPhotos.length} {filteredPhotos.length === 1 ? "foto" : "fotos"}
              </span>
              <Heart className="size-3 text-muted-foreground/40" />
            </div>
          </div>
        )}
      </main>

      {/* ═══════════ MODALS & OVERLAYS ═══════════ */}
      <GuestNameModal
        isOpen={showNameModal}
        onClose={() => setShowNameModal(false)}
        onSubmit={registerName}
        guestList={event.guest_list ?? undefined}
        accentColor={accentColor ?? undefined}
      />

      {/* Social share floating button */}
      <ShareFloatingButton url={`/e/${slug}`} eventName={event.name} />

      {/* Confetti celebration on upload */}
      <ConfettiEffect active={confettiActive} x={confettiPos.x} y={confettiPos.y} />

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={filteredPhotos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}

      {/* Upload FAB — guests upload photos by QR, zero registration */}
      {event.guest_upload && guest && (
        <UploadFab
          guestName={guest.name}
          accentColor={accentColor ?? undefined}
          onUpload={uploadMutation.mutateAsync}
        />
      )}
    </div>
  );
}

/* ═══════════ CHIP COMPONENT ═══════════ */

function Chip({
  active,
  onClick,
  accentColor,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  accentColor?: string | undefined;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-300 ${
        active
          ? "text-background shadow-soft"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
      }`}
      style={active ? { backgroundColor: accentColor ?? "var(--color-foreground)" } : undefined}
    >
      {icon}
      {children}
    </button>
  );
}
