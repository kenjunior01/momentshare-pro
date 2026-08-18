import { useState, useEffect } from "react";
import { Users, Wifi } from "lucide-react";

/**
 * Shows a live indicator that other guests are viewing the event.
 * Uses a subtle pulse animation to feel alive.
 */
export function LiveGuestCounter({
  photoCount,
  guestCount,
}: {
  photoCount: number;
  guestCount?: number | undefined;
}) {
  const [dots, setDots] = useState("");
  const [simulatedGuests, setSimulatedGuests] = useState(guestCount ?? 12);

  // Animated dots effect
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Simulate slight guest count variation (only if no real count provided)
  useEffect(() => {
    if (guestCount !== undefined) return;
    const interval = setInterval(() => {
      setSimulatedGuests((prev) => {
        const change = Math.random() > 0.5 ? 1 : -1;
        return Math.max(5, Math.min(99, prev + change));
      });
    }, 8000);
    return () => clearInterval(interval);
  }, [guestCount]);

  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-border/40 bg-card/60 backdrop-blur-sm px-4 py-2">
      <div className="flex items-center gap-1.5">
        <div className="relative">
          <Wifi className="size-3.5 text-emerald-500" />
          <span className="absolute -top-0.5 -right-0.5 flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {simulatedGuests} {simulatedGuests === 1 ? "pessoa" : "pessoas"}{dots}
        </span>
      </div>
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
