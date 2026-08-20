import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import {
  ShieldCheck,
  ArrowLeft,
  Check,
  Pencil,
  Trash2,
  Clock,
  AlertTriangle,
  X,
  MessageSquare,
  Loader2,
  Lock,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useEventRealtime } from "@/hooks/useEventRealtime";
import {
  listMyEvents,
  listEventGuestbook,
  setGuestbookApproval,
  updateGuestbookMessage,
  deleteGuestbookEntry,
  type ModeratedEntry,
} from "@/lib/db";


export const Route = createFileRoute("/moderacao")({
  head: () => ({
    meta: [
      { title: "Moderação - Memoir" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
  }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: ModerationPanel,
});

function ModerationPanel() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["my-events"],
    queryFn: listMyEvents,
  });

  const currentEventId = selectedEventId ?? events[0]?.id ?? null;

  useEventRealtime({
    eventId: currentEventId ?? "",
    tables: ["guestbook_entries"],
    queryKeys: ["moderation-guestbook"],
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["moderation-guestbook", currentEventId],
    queryFn: () => listEventGuestbook(currentEventId!),
    enabled: !!currentEventId,
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  });


  const approveMut = useMutation({
    mutationFn: (id: string) => setGuestbookApproval(id, true),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["moderation-guestbook"] }),
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) => setGuestbookApproval(id, false),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["moderation-guestbook"] }),
  });

  const editMut = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      updateGuestbookMessage(id, message),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["moderation-guestbook"] }),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => deleteGuestbookEntry(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["moderation-guestbook"] }),
  });

  const pending = entries.filter((e) => !e.approved);
  const approved = entries.filter((e) => e.approved);
  const busy =
    approveMut.isPending || rejectMut.isPending || editMut.isPending || removeMut.isPending;

  const filtered =
    activeTab === "all" ? entries : activeTab === "pending" ? pending : approved;

  return (
    <div className="min-h-screen bg-background">
      <header className="glass border-b border-border/30 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 flex items-center gap-4 h-16">
          <a
            href="/"
            className="grid size-9 place-items-center rounded-full hover:bg-secondary/60 transition-colors"
          >
            <ArrowLeft className="size-4 text-foreground/70" />
          </a>
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-lg bg-primary/10">
              <ShieldCheck className="size-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground leading-tight">
                Moderação do Guestbook
              </h1>
              <p className="text-[10px] text-muted-foreground">
                {pending.length > 0
                  ? `${pending.length} pendente${pending.length !== 1 ? "s" : ""}`
                  : "Sem mensagens pendentes"}
              </p>
            </div>
          </div>
          <div className="flex-1" />
          <Lock className="size-3.5 text-muted-foreground/40" />
          <a href="/painel">
            <Button variant="outline" size="sm" className="text-xs">
              Painel
            </Button>
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {!eventsLoading && events.length === 0 && (
          <div className="text-center py-20">
            <p className="text-sm text-muted-foreground">
              Ainda não tens eventos. Cria um no painel para moderar mensagens.
            </p>
          </div>
        )}

        {events.length > 0 && (
          <div className="mb-6">
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Evento
            </label>
            <select
              value={currentEventId ?? ""}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full sm:w-80 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 w-full sm:w-auto">

            <TabsTrigger value="all" className="gap-1.5 text-xs">
              <MessageSquare className="size-3" /> Todas ({entries.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-1.5 text-xs">
              <Clock className="size-3" /> Pendentes ({pending.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-1.5 text-xs">
              <Check className="size-3" /> Aprovadas ({approved.length})
            </TabsTrigger>
          </TabsList>

          {isLoading && (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="size-5 animate-spin mr-2" />
              <span className="text-sm">A carregar mensagens...</span>
            </div>
          )}

          {!isLoading && entries.length === 0 && (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center size-16 rounded-full bg-muted mb-4">
                <MessageSquare className="size-7 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">
                Nenhuma mensagem no guestbook ainda.
              </p>
            </div>
          )}

          {!isLoading && entries.length > 0 && filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">
                Nenhuma mensagem nesta categoria.
              </p>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="space-y-3">
              {filtered.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  onApprove={(id) => approveMut.mutate(id)}
                  onReject={(id) => rejectMut.mutate(id)}
                  onEdit={(id, msg) => editMut.mutate({ id, message: msg })}
                  onRemove={(id) => removeMut.mutate(id)}
                  busy={busy}
                />
              ))}
            </div>
          )}
        </Tabs>
      </main>
    </div>
  );
}

function EntryCard({
  entry,
  onApprove,
  onReject,
  onEdit,
  onRemove,
  busy,
}: {
  entry: ModeratedEntry;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (id: string, newMessage: string) => void;
  onRemove: (id: string) => void;
  busy: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(entry.message);
  const isPending = !entry.approved;

  function handleSave() {
    if (!editValue.trim() || editValue.trim() === entry.message) {
      setEditing(false);
      return;
    }
    onEdit(entry.id, editValue.trim());
    setEditing(false);
  }

  function handleCancel() {
    setEditValue(entry.message);
    setEditing(false);
  }

  return (
    <Card className={isPending ? "ring-1 ring-amber-400/40" : ""}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div
            className="grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold"
            style={{
              backgroundColor: isPending ? "#fbbf2420" : "#34d39920",
              color: isPending ? "#b45309" : "#047857",
            }}
          >
            {entry.guest_name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{entry.guest_name}</span>
              <StatusBadge approved={entry.approved} />
              <span className="text-[10px] text-muted-foreground/50 ml-auto">
                {new Date(entry.created_at).toLocaleDateString("pt-PT", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            {editing ? (
              <div className="mt-3 space-y-2">
                <Textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} disabled={busy} className="text-xs">
                    <Check className="size-3 mr-1" /> Guardar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={busy}
                    className="text-xs"
                  >
                    <X className="size-3 mr-1" /> Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{entry.message}</p>
            )}

            {!editing && (
              <div className="mt-3 flex flex-wrap gap-2">
                {isPending && (
                  <Button
                    size="sm"
                    onClick={() => onApprove(entry.id)}
                    disabled={busy}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Check className="size-3 mr-1" /> Aprovar
                  </Button>
                )}
                {!isPending && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onReject(entry.id)}
                    disabled={busy}
                    className="text-xs"
                  >
                    <AlertTriangle className="size-3 mr-1" /> Rejeitar
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(true)}
                  disabled={busy}
                  className="text-xs"
                >
                  <Pencil className="size-3 mr-1" /> Editar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onRemove(entry.id)}
                  disabled={busy}
                  className="text-xs"
                >
                  <Trash2 className="size-3 mr-1" /> Remover
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ approved }: { approved: boolean }) {
  if (approved) {
    return (
      <Badge
        variant="outline"
        className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
      >
        <Check className="size-2.5 mr-1" /> Aprovada
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800"
    >
      <Clock className="size-2.5 mr-1" /> Pendente
    </Badge>
  );
}
