import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CalendarDays,
  Camera,
  Copy,
  Loader2,
  LogOut,
  MapPin,
  Pencil,
  Plus,
  QrCode,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  createEvent,
  deleteEvent,
  deletePhoto,
  listEventPhotos,
  listMyEvents,
  slugify,
  type EventInput,
  updateEvent,
} from "@/lib/db";

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

/* ── Zod schema for the edit event form ────────────────────────────── */

const editEventSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  event_type: z.string().min(1, "Tipo de evento é obrigatório"),
  starts_at: z.string().min(1, "Data é obrigatória"),
  location_name: z.string(),
  description: z.string(),
  hashtag: z.string(),
  privacy_mode: z.string().min(1, "Modo de privacidade é obrigatório"),
  access_code: z.string(),
  guest_upload: z.boolean(),
  guestbook_enabled: z.boolean(),
  live_wall_enabled: z.boolean(),
  download_enabled: z.boolean(),
  guest_list: z.string(),
});

type EditEventFormValues = z.infer<typeof editEventSchema>;

/* ── Type for the editing event data ───────────────────────────────── */

interface EditingEventData {
  id: string;
  name: string;
  event_type: string;
  starts_at: string;
  location_name: string | null;
  description: string | null;
  hashtag: string | null;
  privacy_mode: string;
  access_code: string | null;
  guest_upload: boolean;
  guestbook_enabled: boolean;
  live_wall_enabled: boolean;
  download_enabled: boolean;
  guest_list: string[];
}

/* ── Dashboard component ───────────────────────────────────────────── */

function DashboardPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedPhotosEventId, setExpandedPhotosEventId] = useState<string | null>(null);
  const [confirmDeletePhotoId, setConfirmDeletePhotoId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<EditingEventData | null>(null);

  const eventsQuery = useQuery({ queryKey: ["my-events"], queryFn: listMyEvents });

  /* ── Photos query (only when a panel is expanded) ───────────────── */
  const photosQuery = useQuery({
    queryKey: ["event-photos", expandedPhotosEventId],
    queryFn: () => listEventPhotos(expandedPhotosEventId!),
    enabled: !!expandedPhotosEventId,
  });

  /* ── Edit form ──────────────────────────────────────────────────── */
  const form = useForm<EditEventFormValues>({
    resolver: zodResolver(editEventSchema),
    defaultValues: {
      name: "",
      event_type: "other",
      starts_at: "",
      location_name: "",
      description: "",
      hashtag: "",
      privacy_mode: "public",
      access_code: "",
      guest_upload: true,
      guestbook_enabled: true,
      live_wall_enabled: true,
      download_enabled: true,
      guest_list: "",
    },
  });

  /* ── Mutations ──────────────────────────────────────────────────── */
  const createMutation = useMutation({
    mutationFn: (input: EventInput) => createEvent(input),
    onSuccess: () => {
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["my-events"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-events"] });
      setConfirmDeleteId(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EventInput> }) => updateEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-events"] });
      setEditingEvent(null);
      toast.success("Evento atualizado! ✨");
    },
    onError: () => {
      toast.error("Erro ao atualizar evento");
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (photoId: string) => deletePhoto(photoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-photos", expandedPhotosEventId] });
      setConfirmDeletePhotoId(null);
      toast.success("Foto apagada");
    },
    onError: () => {
      toast.error("Erro ao apagar foto");
    },
  });

  /* ── Handlers ───────────────────────────────────────────────────── */
  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const privacy = String(fd.get("privacy_mode") ?? "public");
    const code = String(fd.get("access_code") ?? "")
      .trim()
      .toUpperCase();
    const guests = String(fd.get("guest_list") ?? "")
      .split(/[\n,]/)
      .map((g) => g.trim())
      .filter(Boolean);

    createMutation.mutate({
      name,
      slug: `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`,
      event_type: String(fd.get("event_type") ?? "other"),
      description: String(fd.get("description") ?? "") || null,
      starts_at: new Date(String(fd.get("starts_at") || Date.now())).toISOString(),
      location_name: String(fd.get("location_name") ?? "") || null,
      privacy_mode: privacy,
      access_code: privacy === "access_code" ? code || null : null,
      theme_colors: { primary: "#C08552", secondary: "#F5F0E8" },
      guest_upload: true,
      guestbook_enabled: true,
      live_wall_enabled: true,
      download_enabled: true,
      hashtag: String(fd.get("hashtag") ?? "") || null,
      guest_list: guests,
    });
  }

  function copyLink(slug: string) {
    const url = `${window.location.origin}/e/${slug}`;
    navigator.clipboard?.writeText(url);
    setCopied(slug);
    setTimeout(() => setCopied(null), 1800);
  }

  function handleDeleteClick(id: string) {
    setConfirmDeleteId(id);
  }

  function handleDeleteConfirm(id: string) {
    deleteMutation.mutate(id);
  }

  function handleDeleteCancel() {
    setConfirmDeleteId(null);
  }

  function togglePhotos(eventId: string) {
    setConfirmDeletePhotoId(null);
    setExpandedPhotosEventId((prev) => (prev === eventId ? null : eventId));
  }

  function openEditModal(ev: (typeof eventsQuery.data extends (infer T)[] | undefined ? T : never)) {
    const startsAtLocal = new Date(ev.starts_at).toISOString().slice(0, 16);
    setEditingEvent({
      id: ev.id,
      name: ev.name,
      event_type: ev.event_type,
      starts_at: ev.starts_at,
      location_name: ev.location_name ?? null,
      description: ev.description ?? null,
      hashtag: ev.hashtag ?? null,
      privacy_mode: ev.privacy_mode,
      access_code: ev.access_code ?? null,
      guest_upload: ev.guest_upload,
      guestbook_enabled: ev.guestbook_enabled,
      live_wall_enabled: ev.live_wall_enabled,
      download_enabled: ev.download_enabled,
      guest_list: ev.guest_list ?? [],
    });
    form.reset({
      name: ev.name,
      event_type: ev.event_type,
      starts_at: startsAtLocal,
      location_name: ev.location_name ?? "",
      description: ev.description ?? "",
      hashtag: ev.hashtag ?? "",
      privacy_mode: ev.privacy_mode,
      access_code: ev.access_code ?? "",
      guest_upload: ev.guest_upload,
      guestbook_enabled: ev.guestbook_enabled,
      live_wall_enabled: ev.live_wall_enabled,
      download_enabled: ev.download_enabled,
      guest_list: (ev.guest_list ?? []).join("\n"),
    });
  }

  function handleEditSubmit(values: EditEventFormValues) {
    if (!editingEvent) return;
    const payload: Partial<EventInput> = {
      name: values.name,
      event_type: values.event_type,
      starts_at: new Date(values.starts_at).toISOString(),
      location_name: values.location_name || null,
      description: values.description || null,
      hashtag: values.hashtag || null,
      privacy_mode: values.privacy_mode,
      access_code: values.privacy_mode === "access_code" ? values.access_code || null : null,
      guest_upload: values.guest_upload,
      guestbook_enabled: values.guestbook_enabled,
      live_wall_enabled: values.live_wall_enabled,
      download_enabled: values.download_enabled,
      guest_list: values.guest_list
        .split(/[\n,]/)
        .map((g) => g.trim())
        .filter(Boolean),
    };
    updateMutation.mutate({ id: editingEvent.id, data: payload });
  }

  /* ── Toggle switch render helper ────────────────────────────────── */
  const renderToggle = (
    field: "guest_upload" | "guestbook_enabled" | "live_wall_enabled" | "download_enabled",
    label: string,
  ) => {
    const val = form.watch(field);
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={val}
          onClick={() => form.setValue(field, !val, { shouldValidate: true })}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors",
            val ? "bg-primary" : "bg-muted-foreground/30",
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block size-4 translate-y-0.5 rounded-full bg-white shadow-sm transition-transform",
              val ? "translate-x-4" : "translate-x-0.5",
            )}
          />
        </button>
        <span className="text-sm text-foreground">{label}</span>
      </div>
    );
  };

  const inputCls = "rounded-sm border border-input bg-background px-4 py-3 text-sm";
  const inputFullCls = cn(inputCls, "sm:col-span-2");

  return (
    <div className="min-h-screen bg-background px-6 py-10 animate-fade-in">
      <div className="mx-auto max-w-5xl">
        {/* ── Header ──────────────────────────────────────────────── */}
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

        {/* ── Title + create button ───────────────────────────────── */}
        <div className="mt-10 flex items-center justify-between">
          <h1 className="font-display text-2xl text-foreground">Os meus eventos</h1>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="btn-glow inline-flex items-center gap-2 rounded-sm bg-foreground px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-background transition-colors hover:bg-primary"
          >
            <Plus className="size-3.5" /> Novo evento
          </button>
        </div>

        {/* ── Smooth height transition wrapper for the create form ── */}
        <div
          className="overflow-hidden transition-[max-height,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            maxHeight: showForm ? "800px" : "0px",
            opacity: showForm ? 1 : 0,
          }}
        >
          <form
            onSubmit={handleCreate}
            className="glass-card mt-6 grid gap-3 rounded-xl p-5 sm:grid-cols-2"
          >
            <input name="name" required placeholder="Nome do evento" className={inputFullCls} />
            <select name="event_type" className={inputCls}>
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <input name="starts_at" type="datetime-local" className={inputCls} />
            <input name="location_name" placeholder="Local" className={inputCls} />
            <input name="hashtag" placeholder="#hashtag" className={inputCls} />
            <select name="privacy_mode" className={inputCls}>
              <option value="public">Público (por link)</option>
              <option value="access_code">Com código de acesso</option>
            </select>
            <input
              name="access_code"
              placeholder="Código de acesso (se aplicável)"
              className={cn(inputCls, "uppercase")}
            />
            <textarea
              name="description"
              placeholder="Descrição"
              rows={2}
              className={inputFullCls}
            />
            <textarea
              name="guest_list"
              placeholder="Lista de convidados (um por linha)"
              rows={3}
              className={inputFullCls}
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
        </div>

        {/* ── Event cards ─────────────────────────────────────────── */}
        <div className="mt-8 space-y-4">
          {eventsQuery.isLoading && <p className="text-sm text-muted-foreground">A carregar…</p>}
          {eventsQuery.data?.length === 0 && !showForm && (
            <p className="text-sm text-muted-foreground">Ainda não tem eventos. Crie o primeiro.</p>
          )}
          {eventsQuery.data?.map((ev, i) => (
            <div key={ev.id}>
              <div
                className="glass-card rounded-xl p-5 animate-slide-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
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
                    {/* ── Photos button ──────────────────────────────── */}
                    <button
                      onClick={() => togglePhotos(ev.id)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-sm border px-3 py-2 text-xs font-semibold transition-colors",
                        expandedPhotosEventId === ev.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-foreground hover:bg-secondary/60",
                      )}
                    >
                      <Camera className="size-3.5" /> Fotos
                    </button>
                    {/* ── Edit button ─────────────────────────────────── */}
                    <button
                      onClick={() => openEditModal(ev)}
                      className="inline-flex items-center gap-2 rounded-sm border border-border px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary/60"
                    >
                      <Pencil className="size-3.5" /> Editar
                    </button>
                    {/* ── Delete button ──────────────────────────────── */}
                    {confirmDeleteId === ev.id ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-xs text-destructive font-medium">Tem certeza?</span>
                        <button
                          onClick={() => handleDeleteConfirm(ev.id)}
                          disabled={deleteMutation.isPending}
                          className="inline-flex items-center gap-1.5 rounded-sm bg-destructive px-3 py-2 text-xs font-semibold text-destructive-foreground transition-colors hover:opacity-90 disabled:opacity-50"
                        >
                          {deleteMutation.isPending ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : null}
                          Sim, apagar
                        </button>
                        <button
                          onClick={handleDeleteCancel}
                          className="inline-flex items-center rounded-sm border border-border px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary/60"
                        >
                          Cancelar
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleDeleteClick(ev.id)}
                        className="grid size-9 place-items-center rounded-sm border border-border text-muted-foreground transition-colors hover:text-destructive"
                        aria-label="Eliminar evento"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
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
                    <QrCode className="size-3.5" /> Imprima este código para os convidados acederem
                    à galeria.
                  </p>
                </div>
              </div>

              {/* ── Photo management panel ──────────────────────────── */}
              {expandedPhotosEventId === ev.id && (
                <div className="mt-2 glass-card rounded-xl p-5 animate-slide-up">
                  <h3 className="mb-4 font-display text-base text-foreground">
                    {photosQuery.isLoading
                      ? "A carregar fotos…"
                      : `${(photosQuery.data ?? []).length} fotos`}
                  </h3>

                  {photosQuery.isLoading && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {Array.from({ length: 8 }).map((_, idx) => (
                        <div key={idx} className="space-y-1.5">
                          <div className="skeleton size-20 rounded-sm" />
                          <div className="skeleton h-3 w-14 rounded-sm" />
                        </div>
                      ))}
                    </div>
                  )}

                  {!photosQuery.isLoading && (photosQuery.data ?? []).length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                      <Camera className="size-8" />
                      <p className="text-sm">Nenhuma foto ainda</p>
                    </div>
                  )}

                  {!photosQuery.isLoading && (photosQuery.data ?? []).length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {photosQuery.data!.map((photo) => (
                        <div key={photo.id} className="group relative">
                          <div className="relative size-20 overflow-hidden rounded-sm bg-muted">
                            <img
                              src={photo.display}
                              alt={photo.caption ?? ""}
                              loading="lazy"
                              className="size-full object-cover"
                            />
                          </div>
                          <p className="mt-1 max-w-[80px] truncate text-[11px] text-muted-foreground">
                            {photo.caption || "Sem legenda"}
                          </p>
                          {/* Delete photo */}
                          {confirmDeletePhotoId === photo.id ? (
                            <span className="mt-1 inline-flex items-center gap-1">
                              <span className="text-[10px] text-destructive font-medium">
                                Apagar?
                              </span>
                              <button
                                onClick={() => deletePhotoMutation.mutate(photo.id)}
                                disabled={deletePhotoMutation.isPending}
                                className="rounded-sm bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground disabled:opacity-50"
                              >
                                Sim
                              </button>
                              <button
                                onClick={() => setConfirmDeletePhotoId(null)}
                                className="rounded-sm border border-border px-1.5 py-0.5 text-[10px] font-semibold text-foreground"
                              >
                                Não
                              </button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setConfirmDeletePhotoId(photo.id)}
                              className="absolute top-0.5 right-0.5 grid size-6 place-items-center rounded-full bg-foreground/60 text-background opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive"
                              aria-label="Apagar foto"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Edit event modal ──────────────────────────────────────── */}
      {editingEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setEditingEvent(null)}
        >
          <form
            onSubmit={form.handleSubmit(handleEditSubmit)}
            className="glass-card w-full max-w-lg rounded-xl p-6 mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl text-foreground">Editar evento</h2>
              <button
                type="button"
                onClick={() => setEditingEvent(null)}
                className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary/60"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                {...form.register("name")}
                placeholder="Nome do evento"
                className={cn(inputFullCls, form.formState.errors.name && "border-destructive")}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive sm:col-span-2">
                  {form.formState.errors.name.message}
                </p>
              )}

              <select {...form.register("event_type")} className={inputCls}>
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>

              <input
                {...form.register("starts_at")}
                type="datetime-local"
                className={cn(inputCls, form.formState.errors.starts_at && "border-destructive")}
              />
              {form.formState.errors.starts_at && (
                <p className="text-xs text-destructive sm:col-span-2">
                  {form.formState.errors.starts_at.message}
                </p>
              )}

              <input {...form.register("location_name")} placeholder="Local" className={inputCls} />
              <input {...form.register("hashtag")} placeholder="#hashtag" className={inputCls} />

              <select {...form.register("privacy_mode")} className={inputCls}>
                <option value="public">Público (por link)</option>
                <option value="access_code">Com código de acesso</option>
              </select>

              <input
                {...form.register("access_code")}
                placeholder="Código de acesso"
                className={cn(inputCls, "uppercase")}
              />

              <textarea
                {...form.register("description")}
                placeholder="Descrição"
                rows={2}
                className={inputFullCls}
              />
              <textarea
                {...form.register("guest_list")}
                placeholder="Lista de convidados (um por linha)"
                rows={3}
                className={inputFullCls}
              />

              {/* Toggle switches */}
              <div className="space-y-3 sm:col-span-2">
                {renderToggle("guest_upload", "Upload de convidados")}
                {renderToggle("guestbook_enabled", "Livro de visitas")}
                {renderToggle("live_wall_enabled", "Mural em direto")}
                {renderToggle("download_enabled", "Download permitido")}
              </div>

              {updateMutation.isError && (
                <p className="text-xs text-destructive sm:col-span-2">
                  Não foi possível atualizar o evento.
                </p>
              )}

              <div className="flex items-center gap-3 sm:col-span-2">
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-5 py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-50"
                >
                  {updateMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                  Guardar alterações
                </button>
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="inline-flex items-center rounded-sm border border-border px-5 py-3 text-xs font-semibold text-foreground transition-colors hover:bg-secondary/60"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
