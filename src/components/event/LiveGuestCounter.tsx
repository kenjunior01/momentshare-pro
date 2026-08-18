import { useState, useEffect, useRef } from "react";
import { Users, Wifi } from "lucide-react";

/**
 * Shows a live indicator that other guests are viewing the event.
 * When no real count is available, shows a waiting state.
 * When count is real (>0), shows the count with a gentle number animation.
 */
export function LiveGuestCounter({
  photoCount,
  guestCount,
}: {
  photoCount: number;
  guestCount?: number | undefined;
}) {
  const isReal = guestCount !== undefined && guestCount > 0;
  const [displayedCount, setDisplayedCount] = useState(guestCount ?? 0);
  const targetRef = useRef(guestCount ?? 0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const target = guestCount ?? 0;
    targetRef.current = target;

    function step() {
      const current = targetRef.current;
      setDisplayedCount((prev) => {
        if (prev === current) return prev;
        const diff = current - prev;
        const stepVal = diff > 0 ? Math.max(1, Math.floor(diff / 4)) : Math.min(-1, Math.ceil(diff / 4));
        const next = prev + stepVal;
        if (Math.abs(next - current) <= 1) return current;
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    }

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [guestCount]);

  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-border/40 bg-card/60 backdrop-blur-sm px-4 py-2">
      {isReal ? (
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <Wifi className="size-3.5 text-emerald-500" />
            <span className="absolute -top-0.5 -right-0.5 flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {displayedCount} {displayedCount === 1 ? "pessoa" : "pessoas"} a ver este evento
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <Wifi className="size-3.5 text-muted-foreground/40 animate-pulse" />
          <span className="text-xs text-muted-foreground/60 animate-pulse">
            Aguardando convidados...
          </span>
        </div>
      )}
      {photoCount > 0 && (
        <>
          <div className="h-3 w-px bg-border/60" />
          <div className="flex items-center gap-1.5">
            <Users className="size-3.5 text-primary" />
            <span className="text-xs text-muted-foreground">
              {photoCount} {photoCount === 1 ? "foto" : "fotos"}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
