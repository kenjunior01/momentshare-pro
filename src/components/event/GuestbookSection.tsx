import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Send, Heart, Clock } from "lucide-react";
import { addGuestbookEntry } from "@/lib/db";
import type { GuestBookEntry } from "@/lib/types";

interface GuestbookSectionProps {
  entries: GuestBookEntry[];
  guestName: string;
  accentColor?: string | undefined;
  /** Event ID for submitting to Supabase */
  eventId: string;
  /** Guest fingerprint for anonymous tracking */
  fingerprint: string;
}

export function GuestbookSection({
  entries,
  guestName,
  accentColor,
  eventId,
  fingerprint,
}: GuestbookSectionProps) {
  const [message, setMessage] = useState("");
  const [localPending, setLocalPending] = useState<GuestBookEntry[]>([]);
  const [reactions, setReactions] = useState<Record<string, Set<string>>>({});
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const submitTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const queryClient = useQueryClient();

  // Scroll to top when a new pending message is added
  useEffect(() => {
    if (localPending.length > 0 && listRef.current) {
      listRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [localPending.length]);

  // Merge server-approved entries with local pending entries
  const visibleEntries = [...localPending, ...entries];

  // Submit to Supabase — new entries go to moderation first
  const submitMutation = useMutation({
    mutationFn: (msg: string) => addGuestbookEntry(eventId, guestName, msg),
    onSuccess: () => {
      // Invalidate so the organizer's moderation panel refreshes
      queryClient.invalidateQueries({ queryKey: ["public-guestbook"] });
    },
    onError: (err) => {
      console.error("[guestbook] submit error:", err);
      // Remove from local pending on failure
      setLocalPending((prev) => prev.slice(1));
    },
  });

  const triggerCelebration = useCallback(() => {
    if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
    setJustSubmitted(true);
    setShowToast(true);
    submitTimerRef.current = setTimeout(() => {
      setJustSubmitted(false);
      setShowToast(false);
    }, 2000);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
    };
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || submitMutation.isPending) return;

    const newEntry: GuestBookEntry = {
      id: `gb-local-${Date.now()}`,
      guest_name: guestName,
      message: message.trim(),
      created_at: new Date().toISOString(),
      moderation_status: "pending",
    };

    // Show immediately for the sender (with "em revisão" badge)
    setLocalPending((prev) => [newEntry, ...prev]);
    setMessage("");

    // Trigger celebratory feedback
    triggerCelebration();

    // Persist to Supabase (goes through moderation)
    submitMutation.mutate(message.trim());
  }

  function toggleReaction(entryId: string) {
    setReactions((prev) => {
      const next = { ...prev };
      const s = new Set(next[entryId] ?? []);
      if (s.has(guestName)) s.delete(guestName);
      else s.add(guestName);
      next[entryId] = s;
      return next;
    });
  }

  return (
    <section className="mt-16 border-t border-border/40 pt-10 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        <h2 className="font-display text-2xl text-foreground whitespace-nowrap">
          Mensagens dos convidados
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      <form onSubmit={handleSubmit} className="mb-10">
        <p className="text-xs text-muted-foreground mb-3">
          Escrevendo como <span className="font-semibold text-foreground">{guestName}</span>
        </p>
        <div className="glass-card rounded-xl p-1 flex gap-2 items-end animate-slide-up">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Deixe uma mensagem para os noivos..."
            rows={2}
            className="flex-1 bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none"
          />
          <div className="relative shrink-0">
            {/* Heart burst celebration */}
            {justSubmitted && (
              <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2" aria-hidden="true">
                <span className="absolute text-red-400 text-xs" style={{ animation: "heart-float-1 0.9s ease-out forwards" }}>♥</span>
                <span className="absolute text-red-300 text-[10px]" style={{ animation: "heart-float-2 1s ease-out 0.1s forwards", opacity: 0 }}>♥</span>
                <span className="absolute text-red-500 text-sm" style={{ animation: "heart-float-3 1.1s ease-out 0.15s forwards", opacity: 0 }}>♥</span>
                <span className="absolute text-pink-400 text-[10px]" style={{ animation: "heart-float-4 0.8s ease-out 0.25s forwards", opacity: 0 }}>♥</span>
              </span>
            )}
            <button
              type="submit"
              disabled={!message.trim() || submitMutation.isPending}
              className="grid size-11 place-items-center rounded-xl transition-all duration-300 disabled:opacity-20 hover:scale-105"
              style={{ backgroundColor: accentColor ?? "var(--color-foreground)" }}
              aria-label="Enviar"
            >
              <Send
                className="size-4"
                style={{ color: accentColor ? "white" : "var(--color-background)" }}
              />
            </button>
          </div>
        </div>

        {/* Toast message */}
        {showToast && (
          <div
            className="mt-3 rounded-xl glass-card px-4 py-2.5 text-center"
            style={{ animation: "toast-in-out 2s ease forwards" }}
            role="status"
            aria-live="polite"
          >
            <p className="text-sm text-foreground">
              Obrigado! A sua mensagem será revisada.
            </p>
          </div>
        )}
      </form>

      <div ref={listRef} className="space-y-4">
        {visibleEntries.map((entry, i) => {
          const isPending =
            entry.moderation_status === "pending" || entry.id.startsWith("gb-local");
          const hasReacted = reactions[entry.id]?.has(guestName) ?? false;
          const reactionCount = reactions[entry.id]?.size ?? 0;

          return (
            <div
              key={entry.id}
              className={
                "glass-card rounded-xl p-5 animate-fade-in" +
                (isPending ? " ring-1 ring-amber-400/30" : "")
              }
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className="grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold shadow-soft"
                  style={{
                    backgroundColor: `${accentColor}18`,
                    color: accentColor ?? "var(--color-primary)",
                  }}
                >
                  {entry.guest_name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-semibold text-card-foreground">
                      {entry.guest_name}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">
                      {new Date(entry.created_at).toLocaleDateString("pt-PT", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {entry.message}
                  </p>

                  {/* Pending review notice — only visible to the sender */}
                  {isPending && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                      <Clock className="size-3.5 shrink-0" />
                      <span>Mensagem em revisão — aparecerá para todos após aprovação.</span>
                    </div>
                  )}

                  <button
                    onClick={() => toggleReaction(entry.id)}
                    className="mt-3 flex items-center gap-1.5 text-xs transition-all duration-200 hover:scale-105"
                  >
                    <Heart
                      className={
                        "size-3.5 transition-colors duration-200 " +
                        (hasReacted
                          ? "fill-red-400 text-red-400"
                          : "text-muted-foreground/40 hover:text-muted-foreground")
                      }
                    />
                    <span
                      className={
                        hasReacted ? "text-red-400 font-medium" : "text-muted-foreground/40"
                      }
                    >
                      {reactionCount > 0 ? reactionCount : ""}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
