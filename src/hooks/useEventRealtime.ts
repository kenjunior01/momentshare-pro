import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to Supabase Realtime changes for a specific event.
 * Invalidates the given query-keys whenever a relevant row is
 * INSERTed, UPDATEd or DELETEd — so the UI refreshes instantly.
 *
 * Usage:
 *   useEventRealtime({
 *     eventId,
 *     tables: ["photos", "guestbook_entries"],
 *     queryKeys: ["public-photos", "public-guestbook"],
 *   });
 */
interface UseEventRealtimeOptions {
  eventId: string;
  /** DB tables to listen on (must match Supabase table names) */
  tables: string[];
  /** TanStack Query keys to invalidate when a change fires */
  queryKeys: string[];
  /** Optional: schema (default "public") */
  schema?: string;
  /** Optional: filter string, e.g. "event_id=eq.123" */
  filter?: string;
}

export function useEventRealtime({
  eventId,
  tables,
  queryKeys,
  schema = "public",
  filter,
}: UseEventRealtimeOptions) {
  const queryClient = useQueryClient();
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);

  useEffect(() => {
    if (!eventId) return;

    const defaultFilter = `event_id=eq.${eventId}`;
    const rowFilter = filter ?? defaultFilter;

    for (const table of tables) {
      const channel = supabase
        .channel(`rt:${schema}:${table}:${eventId}`)
        .on("postgres_changes", { event: "*", schema, table, filter: rowFilter }, () => {
          for (const key of queryKeys) {
            queryClient.invalidateQueries({ queryKey: [key] });
          }
        })
        .subscribe();

      channelsRef.current.push(channel);
    }

    return () => {
      for (const ch of channelsRef.current) {
        supabase.removeChannel(ch);
      }
      channelsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, schema, filter]);
}
