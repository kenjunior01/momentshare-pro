import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  CalendarDays,
  Copy,
  Loader2,
  LogOut,
  MapPin,
  Plus,
  QrCode,
  Trash2,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createEvent, deleteEvent, listMyEvents, slugify, type EventInput } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel do organizador - Memoir" },
      {
        name: "description",
        content:
          "Crie e faça a gestão das galerias dos seus eventos: QR code, privacidade, fotos e mensagens.",
      },
      { property: "og:title", content: "Painel do organizador - Memoir" },
      {
        property: "og:description",
        content: "Faça a gestão das galerias dos seus eventos no Memoir.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

const EVENT_TYPES = [
  { value: "wedding", label: "Casamento" },
  { value: "birthday", label: "Aniversário" },
  { value: "corporate", label: "Corporativo" },
  { value: "other", label: "Outro" },
];

function DashboardPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const eventsQuery = useQuery({ queryKey: ["my-events"], queryFn: listMyEvents });

  const createMutation = useMutation({
    mutationFn: (input: EventInput) => createEvent(input),
    onSuccess: () => {
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["my-events"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-events"] }),
  });

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const privacy = String(form.get("privacy_mode") ?? "public");
    const code = String(form.get("access_code") ?? "")
      .trim()
      .toUpperCase();
    const guests = String(form.get("guest_list") ?? "")
      .split(/[\n,]/)
      .map((g) => g.trim())
      .filter(Boolean);

    createMutation.mutate({
      name,
      slug: `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`,
      event_type: String(form.get("event_type") ?? "other"),
      description: String(form.get("description") ?? "") || null,
      starts_at: new Date(String(form.get("starts_at") || Date.now())).toISOString(),
      location_name: String(form.get("location_name") ?? "") || null,
      privacy_mode: privacy,
      access_code: privacy === "access_code" ? code || null : null,
      theme_colors: { primary: "#C08552", secondary: "#F5F0E8" },
      guest_upload: true,
      guestbook_enabled: true,
      live_wall_enabled: true,
      download_enabled: true,
      hashtag: String(form.get("hashtag") ?? "") || null,
      guest_list: guests,
    });
  }

  function copyLink(slug: string) {
    const url = `${window.location.origin}/e/${slug}`;
    navigator.clipboard?.writeText(url);
    setCopied(slug);
    setTimeout(() => setCopied(null), 1800);
  }

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/" className="font-display text-3xl italic text-foreground">
              Memoir
            </Link>
            <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
              Painel do organizador
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 rounded-sm border border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut className="size-3.5" /> Sair
          </button>
        </div>

        <div className="mt-10 flex items-center justify-between">
          <h1 className="font-display text-2xl text-foreground">Os meus eventos</h1>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="btn-glow inline-flex items-center gap-2 rounded-sm bg-foreground px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-background transition-colors hover:bg-primary"
          >
            <Plus className="size-3.5" /> Novo evento
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="glass-card mt-6 grid gap-3 rounded-xl p-5 sm:grid-cols-2"
          >
            <input
              name="name"
              required
              placeholder="Nome do evento"
              className="rounded-sm border border-input bg-background px-4 py-3 text-sm sm:col-span-2"
            />
            <select
              name="event_type"
              className="rounded-sm border border-input bg-background px-4 py-3 text-sm"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <input
              name="starts_at"
              type="datetime-local"
              className="rounded-sm border border-input bg-background px-4 py-3 text-sm"
            />
            <input
              name="location_name"
              placeholder="Local"
              className="rounded-sm border border-input bg-background px-4 py-3 text-sm"
            />
            <input
              name="hashtag"
              placeholder="#hashtag"
              className="rounded-sm border border-input bg-background px-4 py-3 text-sm"
            />
            <select
              name="privacy_mode"
              className="rounded-sm border border-input bg-background px-4 py-3 text-sm"
            >
              <option value="public">Público (por link)</option>
              <option value="access_code">Com código de acesso</option>
            </select>
            <input
              name="access_code"
              placeholder="Código de acesso (se aplicável)"
              className="rounded-sm border border-input bg-background px-4 py-3 text-sm uppercase"
            />
            <textarea
              name="description"
              placeholder="Descrição"
              rows={2}
              className="rounded-sm border border-input bg-background px-4 py-3 text-sm sm:col-span-2"
            />
            <textarea
              name="guest_list"
              placeholder="Lista de convidados (um por linha)"
              rows={3}
              className="rounded-sm border border-input bg-background px-4 py-3 text-sm sm:col-span-2"
            />
            {createMutation.isError && (
              <p className="text-xs text-destructive sm:col-span-2">
                Não foi possível criar o evento.
              </p>
            )}
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-5 py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-50 sm:col-span-2"
            >
              {createMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Criar galeria
            </button>
          </form>
        )}

        <div className="mt-8 space-y-4">
          {eventsQuery.isLoading && <p className="text-sm text-muted-foreground">A carregar…</p>}
          {eventsQuery.data?.length === 0 && !showForm && (
            <p className="text-sm text-muted-foreground">Ainda não tem eventos. Crie o primeiro.</p>
          )}
          {eventsQuery.data?.map((ev) => (
            <div key={ev.id} className="glass-card rounded-xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl text-foreground">{ev.name}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="size-3" />
                      {new Date(ev.starts_at).toLocaleDateString("pt-PT")}
                    </span>
                    {ev.location_name && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="size-3" /> {ev.location_name}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Users className="size-3" /> {ev.view_count} visitas
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-xs text-muted-foreground/70">
                    /e/{ev.slug}
                    {ev.privacy_mode === "access_code" && ev.access_code
                      ? ` · código ${ev.access_code}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/e/${ev.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-sm border border-border px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary/60"
                  >
                    Abrir galeria
                  </a>
                  <button
                    onClick={() => copyLink(ev.slug)}
                    className="inline-flex items-center gap-2 rounded-sm border border-border px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary/60"
                  >
                    <Copy className="size-3.5" /> {copied === ev.slug ? "Copiado" : "Link"}
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(ev.id)}
                    className="grid size-9 place-items-center rounded-sm border border-border text-muted-foreground transition-colors hover:text-destructive"
                    aria-label="Eliminar evento"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-4 border-t border-border/40 pt-5">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    typeof window !== "undefined"
                      ? `${window.location.origin}/e/${ev.slug}`
                      : `/e/${ev.slug}`,
                  )}`}
                  alt={`QR code para ${ev.name}`}
                  loading="lazy"
                  className="size-24 rounded-sm bg-white p-1"
                />
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <QrCode className="size-3.5" /> Imprima este código para os convidados acederem à
                  galeria.
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
