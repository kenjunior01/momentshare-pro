import { useEffect, useCallback, useState, useRef } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  Heart,
  MessageCircle,
  Info,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import { likePhoto } from "@/lib/db";
import type { EventPhoto } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PhotoLightboxProps {
  photos: EventPhoto[];
  currentIndex: number;
  onClose: () => void;
  /** Whether the organizer allows downloads for this event */
  downloadEnabled?: boolean | undefined;
  /** Event name used in share captions */
  eventName?: string | undefined;

}

const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;
const ZOOM_DOUBLE_TAP = 2.5;

export function PhotoLightbox({ photos, currentIndex, onClose, onNavigate }: PhotoLightboxProps) {
  const [liked, setLiked] = useState(false);
  const [heartAnimating, setHeartAnimating] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  /* ── Zoom & Pan state ────────────────────────────────────────── */
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const lastPinchDistRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const isZoomed = zoom > ZOOM_MIN;

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const photo = photos[currentIndex];

  // Reset per-photo state on navigation
  useEffect(() => {
    setLiked(false);
    setShowInfo(false);
    setShowHelp(false);
    resetZoom();
  }, [currentIndex, resetZoom]);

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
  /*  Like with bounce animation + persistent RPC                       */
  /* ------------------------------------------------------------------ */
  const handleLike = useCallback(() => {
    if (!photo) return;
    const wasLiked = liked;
    setLiked((v) => !v);
    setHeartAnimating(true);
    setTimeout(() => setHeartAnimating(false), 400);

    if (!wasLiked) {
      likePhoto(photo.id)
        .then(() => toast.success("Gostou desta foto! 💛"))
        .catch(() => {
          toast.error("Não foi possível registar o gosto");
          setLiked(false);
        });
    }
  }, [liked, photo?.id]);

  /* ------------------------------------------------------------------ */
  /*  Zoom helpers                                                      */
  /* ------------------------------------------------------------------ */
  const clampZoom = useCallback(
    (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z / ZOOM_STEP) * ZOOM_STEP)),
    [],
  );

  const zoomTo = useCallback(
    (newZoom: number, centerX?: number, centerY?: number) => {
      const container = containerRef.current;
      const img = imgRef.current;
      if (!container || !img) return;

      const rect = container.getBoundingClientRect();
      const cx = centerX ?? rect.width / 2;
      const cy = centerY ?? rect.height / 2;

      const imgRect = img.getBoundingClientRect();
      const imgCenterX = imgRect.left + imgRect.width / 2;
      const imgCenterY = imgRect.top + imgRect.height / 2;

      const scale = newZoom / zoom;
      const newPanX = cx - (cx - (imgCenterX + pan.x)) * scale;
      const newPanY = cy - (cy - (imgCenterY + pan.y)) * scale;

      setZoom(newZoom);
      setPan({ x: newPanX - imgCenterX, y: newPanY - imgCenterY });
    },
    [zoom, pan],
  );

  /* ------------------------------------------------------------------ */
  /*  Wheel zoom (desktop)                                               */
  /* ------------------------------------------------------------------ */
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const direction = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
      zoomTo(clampZoom(zoom + direction), cx, cy);
    },
    [zoom, zoomTo, clampZoom],
  );

  /* ------------------------------------------------------------------ */
  /*  Double-click / double-tap to toggle zoom                           */
  /* ------------------------------------------------------------------ */
  const lastTapRef = useRef(0);
  const handleDoubleClick = useCallback(() => {
    if (isZoomed) {
      resetZoom();
    } else {
      zoomTo(ZOOM_DOUBLE_TAP);
    }
  }, [isZoomed, resetZoom, zoomTo]);

  /* ------------------------------------------------------------------ */
  /*  Pinch zoom (mobile)                                                */
  /* ------------------------------------------------------------------ */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setTouchStart(e.touches[0]?.clientX ?? null);
    }
    if (e.touches.length === 2) {
      // Disable swipe when pinching
      setTouchStart(null);
      const dx = e.touches[0]!.clientX - e.touches[1]!.clientX;
      const dy = e.touches[0]!.clientY - e.touches[1]!.clientY;
      lastPinchDistRef.current = Math.hypot(dx, dy);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && lastPinchDistRef.current !== null) {
        e.preventDefault();
        const dx = e.touches[0]!.clientX - e.touches[1]!.clientX;
        const dy = e.touches[0]!.clientY - e.touches[1]!.clientY;
        const dist = Math.hypot(dx, dy);
        const scale = dist / lastPinchDistRef.current;
        lastPinchDistRef.current = dist;
        zoomTo(clampZoom(zoom * scale));
      }
      if (e.touches.length === 1 && isZoomed && isDragging) {
        e.preventDefault();
        const dx = e.touches[0]!.clientX - dragStartRef.current.x;
        const dy = e.touches[0]!.clientY - dragStartRef.current.y;
        setPan({
          x: panStartRef.current.x + dx,
          y: panStartRef.current.y + dy,
        });
      }
    },
    [zoom, zoomTo, clampZoom, isZoomed, isDragging],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      // Double-tap detection
      if (e.touches.length === 0 && e.changedTouches.length === 1) {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          handleDoubleClick();
        }
        lastTapRef.current = now;
      }

      if (e.touches.length < 2) {
        lastPinchDistRef.current = null;
      }
      if (e.touches.length === 0) {
        setIsDragging(false);
      }

      // Single-finger swipe when not zoomed
      if (touchStart !== null && e.changedTouches.length === 1 && !isZoomed) {
        const diff = (e.changedTouches[0]?.clientX ?? 0) - touchStart;
        if (diff > 60) goPrev();
        else if (diff < -60) goNext();
        setTouchStart(null);
      }
    },
    [touchStart, goPrev, goNext, isZoomed, handleDoubleClick],
  );

  /* ------------------------------------------------------------------ */
  /*  Mouse drag to pan (when zoomed)                                    */
  /* ------------------------------------------------------------------ */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isZoomed) return;
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      panStartRef.current = { ...pan };
    },
    [isZoomed, pan],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPan({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy,
      });
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  /* ------------------------------------------------------------------ */
  /*  Click outside image to reset zoom (when zoomed)                    */
  /* ------------------------------------------------------------------ */
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (isZoomed && e.target === containerRef.current) {
        resetZoom();
      }
    },
    [isZoomed, resetZoom],
  );

  /* ------------------------------------------------------------------ */
  /*  Keyboard shortcuts                                                 */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (isZoomed) {
          resetZoom();
        } else {
          onClose();
        }
      }
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "l" || e.key === "L") handleLike();
      if (e.key === "?" || (e.shiftKey && e.key === "/")) setShowHelp((v) => !v);
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, goNext, goPrev, handleLike, isZoomed, resetZoom, showHelp]);

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

  const imageTransform = `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`;

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

      {/* ── Main image area (touch + zoom + pan target) ──────────── */}
      <div
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
        onClick={handleBackdropClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        <div className="film-grain">
          <img
            ref={imgRef}
            key={photo.id}
            src={photo.src}
            alt={photo.caption ?? ""}
            draggable={false}
            className={cn(
              "max-h-[85vh] max-w-[90vw] object-contain select-none rounded-sm",
              "origin-center",
              transitioning ? "opacity-0 scale-95" : "opacity-100 scale-100",
            )}
            style={{
              transform: imageTransform,
              transition: isDragging ? "none" : "transform 0.2s ease",
              cursor: isDragging
                ? "grabbing"
                : isZoomed
                  ? "grab"
                  : zoom > 1
                    ? "zoom-out"
                    : "zoom-in",
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              handleDoubleClick();
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
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

          {/* Separator before zoom controls */}
          {isZoomed && (
            <>
              <div className="w-px h-5 bg-background/20" />

              {/* Zoom out */}
              <button
                onClick={() => zoomTo(clampZoom(zoom - ZOOM_STEP))}
                className="grid size-10 place-items-center rounded-full text-background/70 hover:text-background hover:bg-background/10 transition-all duration-200"
                aria-label="Reduzir zoom"
              >
                <ZoomOut className="size-[18px]" />
              </button>

              {/* Reset zoom */}
              <button
                onClick={resetZoom}
                className="grid size-10 place-items-center rounded-full text-background/70 hover:text-background hover:bg-background/10 transition-all duration-200"
                aria-label="Repor zoom"
              >
                <ZoomOut className="size-[18px]" style={{ strokeWidth: 3 }} />
              </button>

              {/* Zoom in */}
              <button
                onClick={() => zoomTo(clampZoom(zoom + ZOOM_STEP))}
                className="grid size-10 place-items-center rounded-full text-background/70 hover:text-background hover:bg-background/10 transition-all duration-200"
                aria-label="Ampliar zoom"
              >
                <ZoomIn className="size-[18px]" />
              </button>
            </>
          )}
        </div>
      </div>
      {/* ── Keyboard shortcuts help panel ─────────────────── */}
      {showHelp && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="glass-card w-full max-w-sm rounded-2xl p-6 mx-4 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg text-background mb-4">Atalhos de teclado</h3>
            <ul className="space-y-3 text-sm text-background/80">
              <li className="flex items-center justify-between gap-4">
                <span>Navegar fotos</span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded bg-background/15 px-2 py-0.5 font-mono text-xs text-background/90">
                    ←
                  </kbd>
                  <span className="text-background/40">/</span>
                  <kbd className="rounded bg-background/15 px-2 py-0.5 font-mono text-xs text-background/90">
                    →
                  </kbd>
                </span>
              </li>
              <li className="flex items-center justify-between gap-4">
                <span>Gostar</span>
                <kbd className="rounded bg-background/15 px-2 py-0.5 font-mono text-xs text-background/90">
                  L
                </kbd>
              </li>
              <li className="flex items-center justify-between gap-4">
                <span>Atalhos de teclado</span>
                <kbd className="rounded bg-background/15 px-2 py-0.5 font-mono text-xs text-background/90">
                  ?
                </kbd>
              </li>
              <li className="flex items-center justify-between gap-4">
                <span>Fechar</span>
                <kbd className="rounded bg-background/15 px-2 py-0.5 font-mono text-xs text-background/90">
                  Esc
                </kbd>
              </li>
              <li className="flex items-center justify-between gap-4">
                <span>Zoom</span>
                <kbd className="rounded bg-background/15 px-2 py-0.5 font-mono text-xs text-background/90">
                  Scroll
                </kbd>
              </li>
              <li className="flex items-center justify-between gap-4">
                <span>Zoom</span>
                <kbd className="rounded bg-background/15 px-2 py-0.5 font-mono text-xs text-background/90">
                  Clique duplo
                </kbd>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
