# Memoir — Agent Guidelines

This is a TanStack Start project with React 19, TypeScript, Tailwind CSS 4, and Supabase.

## Key Conventions

- **Language**: Portuguese (PT) by default, English (EN) available via i18n toggle
- **Routing**: TanStack Router file-based routing — do not create routes manually
- **Auth**: Supabase Auth (email + Google OAuth)
- **DB**: Supabase PostgreSQL with RLS policies
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **State**: TanStack React Query for server state

## Development

```sh
bun install
bun run dev
bun run build
```

## Architecture

```
src/
  routes/           # File-based routing (TanStack Router)
  components/
    landing/         # Landing page sections
    event/           # Event gallery components
    ui/              # shadcn/ui components
  integrations/
    supabase/        # Supabase clients (browser + server)
  lib/              # Utilities, types, i18n, DB helpers
  hooks/            # Custom React hooks
```
