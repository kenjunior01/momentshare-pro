---
Task ID: 1
Agent: main
Task: Realtime, guestbook moderation & admin panel

Work Log:
- Explored codebase: $slug.tsx, GuestbookSection, types, mock-data, hooks, supabase migrations
- Installed @supabase/supabase-js@2
- Created src/lib/supabase.ts (placeholder client for anonymous guests)
- Created src/hooks/useEventRealtime.ts (Supabase Realtime → TanStack Query invalidation)
- Updated src/routes/e/$slug.tsx: converted useMemo to TanStack React Query (public-photos, public-guestbook), wired useEventRealtime
- Updated src/components/event/GuestbookSection.tsx: added 'mensagem em revisão' notice for pending entries, separated local pendingEntries from server entries
- Created src/lib/moderation.ts: fetchAllGuestbook, approveEntry, editEntry, removeEntry, submitGuestbookMessage helpers
- Created supabase/migrations/005_guestbook_moderation.sql: moderation_status column, trigger, 4 RPC functions (get_pending, approve, edit, remove, get_all)
- Added moderation enum to 001_initial_schema.sql
- Added ModerationStatus type to src/lib/types.ts
- Created src/routes/painel.tsx: full moderation panel with Tabs (all/pending/approved), EntryCard with approve/edit/remove actions, StatusBadge
- Fixed pre-existing TS errors: GuestNameModal useEffect return path, useScrollReveal entry optional, exactOptionalPropertyTypes on 3 component interfaces
- Typecheck: clean (0 errors)
- Build: passes in 648ms
- Committed: `feat: realtime, guestbook moderation & admin panel`
- Push FAILED: GitHub token expired/revoked

Stage Summary:
- All code changes committed locally
- 6 new files: useEventRealtime.ts, supabase.ts, moderation.ts, painel.tsx, 005_guestbook_moderation.sql, .env.local
- Typecheck clean, build passes
- Push blocked by expired token — user needs to provide a new GitHub token or push manually
