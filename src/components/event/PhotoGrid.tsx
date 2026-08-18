import { useState, useCallback, useRef, useEffect } from "react";
import type { EventPhoto } from "@/lib/types";
import { Heart, Play, Eye, Camera } from "lucide-react";
import { PhotoReveal, NewPhotoBadge } from "./PhotoReveal";

interface PhotoGridProps {
  photos: EventPhoto[];
  onPhotoClick: (index: number) => void;
  revealedPhotos?: Set<string> | undefined;
}

function simulatedViews(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((h & 0x7fffffff) % 900) + 100;
}

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function PhotoGrid({ photos, onPhotoClick, revealedPhotos }: PhotoGridProps) {
  const [visibleCount, setVisibleCount] = useState(8);
  const [likedPhotos, setLikedPhotos] = useState<Set<string>>(new Set());
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [bouncing, setBouncing] = useState<Set<string>>(new Set());
  const loaderRef = useRef<HTMLDivElement>(null);

  const visible = photos.slice(0, visibleCount);
  const hasMore = visibleCount < photos.length;

  const onLoad = useCallback((id: string) => {
    setLoadedImages((p) => {
      const n = new Set(p);
      n.add(id);
      return n;
    });
  }, []);

  const toggleLike = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setLikedPhotos((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
    setBouncing((p) => {
      const n = new Set(p);
      n.add(id);
      return n;
    });
    setTimeout(
      () =>
        setBouncing((p) => {
          const n = new Set(p);
          n.delete(id);
          return n;
        }),
      400,
    );
  }, []);

  useEffect(() => {
    const el = loaderRef.current;
    if (!el || !hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setVisibleCount((c) => Math.min(c + 8, photos.length));
      },
      { rootMargin: "400px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, photos.length]);

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground animate-fade-in">
        <div className="grid size-20 place-items-center rounded-full bg-muted">
          <Camera className="size-8 stroke-1" />
        </div>
        <p className="mt-4 text-sm font-medium">Nenhuma foto ainda</p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Seja o primeiro a partilhar um momento
        </p>
      </div>
    );
  }

  return (
    <div className="masonry">
      {visible.map((photo, i) => {
        const loaded = loadedImages.has(photo.id);
        const liked = likedPhotos.has(photo.id);
        const bounce = bouncing.has(photo.id);
        const views = simulatedViews(photo.id);
        const isNew = revealedPhotos?.has(photo.id) ?? false;
        const photoContent = (
          <div
            key={photo.id}
            className="mb-1.5 sm:mb-2 break-inside-avoid cursor-pointer group"
            style={{ animationDelay: `${Math.min(i * 60, 480)}ms` }}
            onClick={() => onPhotoClick(i)}
          >
            <div className="relative overflow-hidden rounded-sm shadow-card light-leak">
              {!loaded && (
                <div
                  className="skeleton w-full"
                  style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
                />
              )}
              <img
                src={photo.src}
                alt={photo.caption ?? ""}
                loading="lazy"
                onLoad={() => onLoad(photo.id)}
                className={
                  "w-full object-cover transition-[filter,transform,opacity] duration-500 ease-out group-hover:scale-[1.03] " +
                  (loaded ? "opacity-100" : "opacity-0 absolute inset-0")
                }
                style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
              />
              {photo.is_video && (
                <div className="absolute inset-0 grid place-items-center pointer-events-none">
                  <div className="relative">
                    <span className="absolute inset-0 grid place-items-center">
                      <span className="size-[72px] rounded-full border border-white/30 animate-[ping_2s_ease-out_infinite]" />
                    </span>
                    <div className="relative grid size-11 place-items-center rounded-full bg-foreground/60 backdrop-blur-sm ring-1 ring-white/20">
                      <Play className="size-4 text-background fill-background ml-0.5" />
                    </div>
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-2.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                {photo.caption && (
                  <span className="text-[11px] text-white/90 leading-tight line-clamp-2 max-w-[65%] drop-shadow-md">
                    {photo.caption}
                  </span>
                )}
                <div className="flex items-center gap-2.5 ml-auto shrink-0">
                  <span className="flex items-center gap-1 text-white/75">
                    <Eye className="size-3.5" />
                    <span className="text-[10px] tabular-nums">{fmt(views)}</span>
                  </span>
                  <button
                    onClick={(e) => toggleLike(e, photo.id)}
                    className="flex items-center gap-1 transition-transform active:scale-90"
                  >
                    <Heart
                      className={
                        "size-4 transition-colors duration-200 " +
                        (liked ? "fill-red-500 text-red-500" : "text-white/80") +
                        (bounce ? " scale-125" : "")
                      }
                    />
                    <span className="text-[10px] text-white/80 tabular-nums">
                      {fmt(photo.likes + (liked ? 1 : 0))}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

        if (isNew) {
          return (
            <div key={photo.id} className="relative mb-1.5 sm:mb-2 break-inside-avoid">
              <PhotoReveal reveal={true}>
                {photoContent}
              </PhotoReveal>
              <NewPhotoBadge show={true} />
            </div>
          );
        }

        return (
          <div key={photo.id} className="animate-fade-in" style={{ animationDelay: `${Math.min(i * 60, 480)}ms` }}>
            {photoContent}
          </div>
        );
      })}
      {hasMore && (
        <div ref={loaderRef} className="flex items-center justify-center py-10">
          <div className="flex flex-col items-center gap-2">
            <div className="size-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-[11px] text-muted-foreground/50">A carregar mais...</span>
          </div>
        </div>
      )}
    </div>
  );
}
