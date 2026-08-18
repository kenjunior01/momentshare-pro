import { useState, useEffect, useRef, type ReactNode } from "react";

/**
 * Wraps content with a polaroid-reveal animation when `reveal` becomes true.
 * Mimics a Polaroid photo developing in real-time.
 */
export function PhotoReveal({
  children,
  reveal,
  delay = 0,
}: {
  children: ReactNode;
  reveal: boolean;
  delay?: number | undefined;
}) {
  const [phase, setPhase] = useState<"hidden" | "developing" | "visible">("hidden");
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const timer2Ref = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (reveal) {
      timerRef.current = setTimeout(() => {
        setPhase("developing");
        timer2Ref.current = setTimeout(() => {
          setPhase("visible");
        }, 600);
      }, delay);
    } else {
      setPhase("hidden");
    }
    return () => {
      if (timerRef.current !== undefined) clearTimeout(timerRef.current);
      if (timer2Ref.current !== undefined) clearTimeout(timer2Ref.current);
    };
  }, [reveal, delay]);

  return (
    <div
      className={`transition-all duration-700 ease-out ${
        phase === "hidden"
          ? "opacity-0 scale-95 blur-md"
          : phase === "developing"
            ? "opacity-70 scale-[1.02] blur-sm"
            : "opacity-100 scale-100 blur-0"
      }`}
      style={{
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * A floating "NEW" badge that appears on recently added photos.
 */
export function NewPhotoBadge({ show }: { show: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) {
      setVisible(false);
      return undefined;
    }
    const t = setTimeout(() => setVisible(true), 300);
    return () => {
      clearTimeout(t);
    };
  }, [show]);

  if (!visible) return <></>;

  return (
    <span className="animate-bounce absolute -top-2 -right-2 z-10 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground shadow-glow">
      Nova
    </span>
  );
}
