import { useEffect, useCallback, useState } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  Heart,
  MessageCircle,
  Info,
} from "lucide-react";
import type { EventPhoto } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PhotoLightboxProps {
  photos: EventPhoto[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function PhotoLightbox({ photos, currentIndex, onClose, onNavigate }: PhotoLightboxProps) {
  const [liked, setLiked] = useState(false);
  const [heartAnimating, setHeartAnimating] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const photo = photos[currentIndex];

  // Reset per-photo state on navigation
  useEffect(() => {
    setLiked(false);
    setShowInfo(false);
  }, [currentIndex]);

  /* ------------------------------------------------------------------ */
  /*  Navigation with crossfade transition                               */
  /* ------------------------------------------------------------------ */
  const navigateWithTransition = useCallback(
    (index: number) => {
      setTransitioning(true);
      setTimeout(() => {
        onNavigate(index);
        // Small delay so the new keyed image paints at opacity-0 first
        setTimeout(() => setTransitioning(false), 30);
      }, 150);
    },
    [onNavigate],
  );

  const goNext = useCallback(() => {
    if (currentIndex < photos.length - 1) navigateWithTransition(currentIndex + 1);
  }, [currentIndex, photos.length, navigateWithTransition]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) navigateWithTransition(currentIndex - 1);
  }, [currentIndex, navigateWithTransition]);

  /* ------------------------------------------------------------------ */
  /*  Like with bounce animation                                         */
  /* ------------------------------------------------------------------ */
  const handleLike = useCallback(() => {
    setLiked((v) => !v);
    setHeartAnimating(true);
    setTimeout(() => setHeartAnimating(false), 400);
  }, []);

  /* ------------------------------------------------------------------ */
  /*  Keyboard shortcuts                                                 */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "l" || e.key === "L") handleLike();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, goNext, goPrev, handleLike]);

  /* ------------------------------------------------------------------ */
  /*  Touch swipe (60 px threshold)                                      */
  /* ------------------------------------------------------------------ */
  function handleTouchStart(e: React.TouchEvent) {
    setTouchStart(e.touches[0]?.clientX ?? null);
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStart === null) return;
    const diff = (e.changedTouches[0]?.clientX ?? 0) - touchStart;
    if (diff > 60) goPrev();
    else if (diff < -60) goNext();
    setTouchStart(null);
  }

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                           */
  /* ------------------------------------------------------------------ */
  if (!photo) return null;

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const whatsappText = encodeURIComponent(`${photo.caption ?? "Foto"} — Memoir\n${shareUrl}`);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Intl.DateTimeFormat("pt-PT", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateStr));
  };

  /* ------------------------------------------------------------------ */
  /*  Render                                                            */
  /* ------------------------------------------------------------------ */
  return (
    <div className="fixed inset-0 z-[60] bg-foreground/90 backdrop-blur-xl animate-fade-in">
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 glass rounded-full px-4 py-2 shadow-soft">
        <span className="text-sm font-medium text-background/70 tabular-nums select-none">
          {currentIndex + 1}
          <span className="text-background/40 mx-1">/</span>
          {photos.length}
        </span>

        <div className="w-px h-4 bg-background/20" />

        {/* Info toggle */}
        <button
          onClick={() => setShowInfo((v) => !v)}
          className={cn(
            "grid size-8 place-items-center rounded-full transition-all duration-200",
            showInfo
              ? "bg-background/20 text-background"
              : "text-background/60 hover:text-background hover:bg-background/10",
          )}
          aria-label="Informação"
        >
          <Info className="size-4" />
        </button>

        {/* Close */}
        <button
          onClick={onClose}
          className="grid size-8 place-items-center rounded-full text-background/60 hover:text-background hover:bg-background/10 transition-all duration-200"
          aria-label="Fechar"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* ── Navigation arrows (desktop only) ──────────────────────── */}
      {currentIndex > 0 && (
        <button
          onClick={goPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 hidden sm:grid size-12 place-items-center glass rounded-full text-background/80 hover:text-background hover:scale-110 transition-all duration-200 shadow-soft"
          aria-label="Anterior"
        >
          <ChevronLeft className="size-5" />
        </button>
      )}
      {currentIndex < photos.length - 1 && (
        <button
          onClick={goNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 hidden sm:grid size-12 place-items-center glass rounded-full text-background/80 hover:text-background hover:scale-110 transition-all duration-200 shadow-soft"
          aria-label="Seguinte"
        >
          <ChevronRight className="size-5" />
        </button>
      )}

      {/* ── Main image (touch swipe target) ──────────────────────── */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="film-grain">
          <img
            key={photo.id}
            src={photo.src}
            alt={photo.caption ?? ""}
            className={cn(
              "max-h-[85vh] max-w-[90vw] object-contain select-none rounded-sm",
              "transition-all duration-300 ease-out",
              transitioning ? "opacity-0 scale-95" : "opacity-100 scale-100",
            )}
          />
        </div>
      </div>

      {/* ── Info panel (slides up from bottom) ───────────────────── */}
      <div
        className={cn(
          "absolute bottom-24 left-1/2 -translate-x-1/2 z-20",
          "w-[calc(100%-2rem)] max-w-md glass rounded-2xl shadow-soft",
          "transition-all duration-300 ease-out overflow-hidden",
          showInfo
            ? "opacity-100 translate-y-0 max-h-60 pointer-events-auto"
            : "opacity-0 translate-y-4 max-h-0 pointer-events-none",
        )}
      >
        <div className="p-5 space-y-3 text-background/90">
          {photo.caption && <p className="text-sm leading-relaxed">{photo.caption}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-background/50">
            {photo.uploader_name && (
              <span>
                <span className="font-medium text-background/70">Por </span>
                {photo.uploader_name}
              </span>
            )}
            {formatDate(photo.taken_at) && <span>{formatDate(photo.taken_at)}</span>}
            {photo.width && photo.height && (
              <span>
                {photo.width} × {photo.height}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom toolbar (glass pill) ───────────────────────────── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 glass rounded-full shadow-soft">
        <div className="flex items-center gap-1 px-2 py-1.5">
          {/* Like */}
          <button
            onClick={handleLike}
            className={cn(
              "grid size-10 place-items-center rounded-full transition-all duration-200",
              liked
                ? "bg-red-500/20 text-red-400"
                : "text-background/70 hover:text-background hover:bg-background/10",
            )}
            aria-label="Gosto"
          >
            <Heart
              className={cn(
                "size-[18px] transition-transform duration-300",
                heartAnimating ? "scale-125" : "scale-100",
                liked ? "fill-red-400 text-red-400" : "",
              )}
              style={{
                transitionTimingFunction: heartAnimating
                  ? "cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                  : "ease",
              }}
            />
          </button>

          {/* Download */}
          <a
            href={photo.src}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="grid size-10 place-items-center rounded-full text-background/70 hover:text-background hover:bg-background/10 transition-all duration-200"
            aria-label="Download"
          >
            <Download className="size-[18px]" />
          </a>

          {/* WhatsApp share */}
          <a
            href={`https://api.whatsapp.com/send?text=${whatsappText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="grid size-10 place-items-center rounded-full text-background/70 hover:text-background hover:bg-background/10 transition-all duration-200"
            aria-label="Partilhar no WhatsApp"
          >
            <Share2 className="size-[18px]" />
          </a>

          {/* Comment */}
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent("memoir:open-guestbook"));
              onClose();
            }}
            className="grid size-10 place-items-center rounded-full text-background/70 hover:text-background hover:bg-background/10 transition-all duration-200"
            aria-label="Comentário"
          >
            <MessageCircle className="size-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
