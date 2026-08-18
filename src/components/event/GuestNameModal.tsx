import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, ArrowRight, Sparkles, Users, UserPlus } from "lucide-react";

interface GuestNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  guestList?: string[] | undefined;
  accentColor?: string | undefined;
}

type Tab = "search" | "write";

export function GuestNameModal({
  isOpen,
  onClose,
  onSubmit,
  guestList,
  accentColor,
}: GuestNameModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>(
    guestList && guestList.length > 0 ? "search" : "write",
  );
  const [searchInput, setSearchInput] = useState("");
  const [writeInput, setWriteInput] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const writeRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const filtered = useCallback((): string[] => {
    if (!guestList || !searchInput.trim()) return guestList ?? [];
    const q = searchInput.toLowerCase();
    return guestList.filter((n) => n.toLowerCase().includes(q));
  }, [guestList, searchInput]);

  useEffect(() => {
    if (!isOpen) return;
    setSearchInput("");
    setWriteInput("");
    setActiveTab(guestList && guestList.length > 0 ? "search" : "write");
    const timeout = setTimeout(() => {
      if (guestList && guestList.length > 0) {
        searchRef.current?.focus();
      } else {
        writeRef.current?.focus();
      }
    }, 200);
    return () => clearTimeout(timeout);
  }, [isOpen, guestList]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  function handleSubmit(name: string) {
    const trimmed = name.trim();
    if (trimmed.length >= 2) {
      onSubmit(trimmed);
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      const results = filtered();
      if (results.length === 1 && results[0]) {
        handleSubmit(results[0]);
      }
    }
  }

  function handleWriteKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSubmit(writeInput);
  }

  if (!isOpen) return null;

  const hasGuestList = guestList && guestList.length > 0;
  const accent = accentColor ?? "var(--color-foreground)";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/50 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />

      {/* Modal Card */}
      <div
        ref={modalRef}
        className="relative z-10 w-full max-w-lg mx-4 mb-4 sm:mb-0 rounded-xl shadow-polaroid animate-slide-up sm:animate-rise glass overflow-hidden"
      >
        <div className="p-6 sm:p-8">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 grid size-8 place-items-center rounded-full hover:bg-foreground/10 transition-colors"
            aria-label="Fechar"
          >
            <X className="size-4 text-foreground/60" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div
              className="mx-auto mb-4 grid size-14 place-items-center rounded-full"
              style={{ backgroundColor: `${accent}18` }}
            >
              <Sparkles className="size-6 animate-pulse" style={{ color: accent }} />
            </div>
            <h2 className="font-display text-2xl text-card-foreground">Bem-vindo à galeria</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Identifique-se para uma experiência personalizada
            </p>
          </div>

          {/* Tabs */}
          {hasGuestList && (
            <div className="flex gap-1 mb-6 p-1 rounded-lg bg-foreground/5">
              <button
                onClick={() => {
                  setActiveTab("search");
                  setTimeout(() => searchRef.current?.focus(), 100);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all duration-300 ${
                  activeTab === "search"
                    ? "glass shadow-soft text-card-foreground"
                    : "text-muted-foreground hover:text-foreground/70"
                }`}
              >
                <Users className="size-4" />
                Encontre o seu nome
              </button>
              <button
                onClick={() => {
                  setActiveTab("write");
                  setTimeout(() => writeRef.current?.focus(), 100);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all duration-300 ${
                  activeTab === "write"
                    ? "glass shadow-soft text-card-foreground"
                    : "text-muted-foreground hover:text-foreground/70"
                }`}
              >
                <UserPlus className="size-4" />
                Escrever o nome
              </button>
            </div>
          )}

          {/* ── Search Tab ── */}
          {activeTab === "search" && hasGuestList && (
            <div>
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Pesquisar o seu nome..."
                  className="w-full rounded-full bg-background/50 backdrop-blur-sm border border-border/40 pl-11 pr-10 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-border/60 transition-all"
                  autoComplete="off"
                />
                {searchInput && (
                  <button
                    onClick={() => {
                      setSearchInput("");
                      searchRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 grid size-6 place-items-center rounded-full hover:bg-foreground/10 transition-colors"
                    aria-label="Limpar"
                  >
                    <X className="size-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Guest list */}
              <div className="mt-3 max-h-56 overflow-y-auto space-y-2 scrollbar-hide pr-1">
                {filtered().map((name, i) => (
                  <button
                    key={name}
                    onClick={() => handleSubmit(name)}
                    className="w-full glass-card rounded-lg px-4 py-3 flex items-center gap-3 group cursor-pointer"
                    style={{
                      animationDelay: `${i * 40}ms`,
                      animation: `slide-up 0.4s cubic-bezier(0.22,1,0.36,1) ${i * 40}ms both`,
                    }}
                  >
                    {/* Avatar */}
                    <span
                      className="grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: accent }}
                    >
                      {name.charAt(0).toUpperCase()}
                    </span>

                    {/* Name */}
                    <span className="flex-1 text-left text-sm font-medium text-card-foreground truncate">
                      {name}
                    </span>

                    {/* Badge */}
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        backgroundColor: `${accent}18`,
                        color: accent,
                      }}
                    >
                      <ArrowRight className="size-3" />
                    </span>
                  </button>
                ))}
                {filtered().length === 0 && searchInput.trim() && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Nenhum nome encontrado para &ldquo;{searchInput}&rdquo;
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Write Tab ── */}
          {activeTab === "write" && (
            <div>
              <div className="relative">
                <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <input
                  ref={writeRef}
                  type="text"
                  value={writeInput}
                  onChange={(e) => setWriteInput(e.target.value)}
                  onKeyDown={handleWriteKeyDown}
                  placeholder="O seu nome completo"
                  className="w-full rounded-full bg-background/50 backdrop-blur-sm border border-border/40 pl-11 pr-4 py-4 text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-border/60 transition-all"
                  autoComplete="off"
                />
              </div>
            </div>
          )}

          {/* Submit button (only in write tab or when no guest list) */}
          {activeTab === "write" && (
            <>
              <button
                onClick={() => handleSubmit(writeInput)}
                disabled={writeInput.trim().length < 2}
                className="mt-4 w-full btn-glow inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: accent,
                  color: "var(--color-background)",
                }}
              >
                Entrar na galeria
                <ArrowRight className="size-4" />
              </button>

              {/* Skip */}
              <button
                onClick={() => handleSubmit("Convidado")}
                className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                Continuar sem nome
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
