import { useState, useEffect, useCallback } from "react";
import type { GuestSession } from "@/lib/types";

/**
 * Generates a lightweight browser fingerprint for anonymous guest tracking.
 * Uses canvas, screen, navigator, and timezone — no external deps.
 * This replaces auth.uid() for anonymous QR code guests.
 */
async function generateFingerprint(): Promise<string> {
  const components: string[] = [];

  // Screen info
  components.push(`${screen.width}x${screen.height}`);
  components.push(`${screen.colorDepth}`);
  components.push(`${devicePixelRatio}`);

  // Navigator info
  components.push(navigator.language ?? "");
  components.push(navigator.hardwareConcurrency?.toString() ?? "");
  components.push(navigator.maxTouchPoints?.toString() ?? "");

  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Canvas fingerprint (lightweight)
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillStyle = "#f60";
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = "#069";
      ctx.fillText("Memoir", 2, 15);
      ctx.fillStyle = "rgba(102,204,0,0.7)";
      ctx.fillText("Memoir", 4, 17);
      components.push(canvas.toDataURL().slice(-50));
    }
  } catch {
    // Canvas not available
  }

  // Simple hash
  const raw = components.join("|");
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36);
}

const STORAGE_PREFIX = "memoir-guest-";

interface UseGuestSessionOptions {
  eventId: string;
  /** Show name modal immediately even if session exists */
  forceRename?: boolean;
}

/**
 * Manages anonymous guest sessions for QR-code-reached events.
 * Handles: fingerprint generation, localStorage persistence, name registration.
 *
 * Flow:
 * 1. Guest scans QR → page loads
 * 2. Hook generates fingerprint, checks localStorage
 * 3. If no session → showNameModal = true
 * 4. If session exists → restore it, showNameModal = false
 * 5. Guest can optionally type name or select from guest list
 * 6. Session is saved to localStorage for returning visitors
 */
export function useGuestSession({ eventId, forceRename }: UseGuestSessionOptions) {
  const [session, setSession] = useState<GuestSession | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [fingerprint, setFingerprint] = useState<string>("");
  const [isReady, setIsReady] = useState(false);

  // Generate fingerprint on mount
  useEffect(() => {
    generateFingerprint().then((fp) => {
      setFingerprint(fp);

      // Check for existing session in localStorage
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${eventId}`);
      if (stored && !forceRename) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.event_id === eventId && parsed.name) {
            setSession(parsed);
            setIsReady(true);
            return;
          }
        } catch {
          // Corrupted data, show modal
        }
      }

      // No valid session → show name modal
      setShowNameModal(true);
      setIsReady(true);
    });
  }, [eventId, forceRename]);

  const registerName = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (trimmed.length < 2) return;

      const newSession: GuestSession = {
        name: trimmed,
        event_id: eventId,
        joined_at: new Date().toISOString(),
        avatar_initials: trimmed
          .split(" ")
          .map((w) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 2),
      };

      setSession(newSession);
      localStorage.setItem(`${STORAGE_PREFIX}${eventId}`, JSON.stringify(newSession));
      setShowNameModal(false);

      // In production, this would call:
      // supabase.rpc('create_guest_session', { ... })
      // supabase.rpc('register_guest_name', { ... })
      console.log("[Memoir] Guest session registered:", {
        fingerprint,
        eventName: trimmed,
        eventId,
      });
    },
    [eventId, fingerprint],
  );

  const skipName = useCallback(() => {
    registerName("Convidado");
  }, [registerName]);

  const rename = useCallback(() => {
    setShowNameModal(true);
  }, []);

  return {
    session,
    fingerprint,
    showNameModal,
    isReady,
    registerName,
    skipName,
    rename,
    setShowNameModal,
  };
}
