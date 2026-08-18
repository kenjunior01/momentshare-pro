import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";

function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {(["pt", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`relative rounded-sm px-2.5 py-1 transition-all duration-300 ${
            lang === l
              ? "text-foreground after:absolute after:inset-0 after:rounded-sm after:bg-foreground/8"
              : "hover:text-foreground"
          }`}
        >
          <span className="relative z-10">{l === "pt" ? "PT" : "EN"}</span>
        </button>
      ))}
    </div>
  );
}

export function SiteHeader() {
  const { t } = useLang();
  const { session } = useAuth();
  const isPt = t("navStart") === "Criar galeria";
  const ctaHref = session ? "/painel" : "/auth";
  const ctaLabel = session ? (isPt ? "Painel" : "Dashboard") : isPt ? "Entrar" : "Sign in";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const links = [
    { href: "#how", label: t("howKicker") },
    { href: "#features", label: t("navFeatures") },
    { href: "#pricing", label: t("navPricing") },
    { href: "#stories", label: t("navStories") },
  ];

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? "glass border-b border-border/40 shadow-soft" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:py-5">
        <a href="/" className="group flex items-center gap-2">
          <span className="font-display text-2xl italic text-foreground transition-[letter-spacing] duration-300 group-hover:tracking-wide">
            Memoir
          </span>
          <span className="hidden text-[10px] font-semibold uppercase tracking-widest text-primary/60 sm:inline">
            MZN
          </span>
        </a>

        <div className="flex items-center gap-6">
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground lg:flex">
            {links.map((l, i) => (
              <a
                key={l.href}
                href={l.href}
                className="relative transition-colors duration-300 hover:text-foreground after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-primary after:transition-all after:duration-300 hover:after:w-full"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-4 border-l border-border/40 pl-6 lg:flex">
            <LangToggle />
            <a
              href={ctaHref}
              className="text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              {ctaLabel}
            </a>
            <a
              href={session ? "/painel" : "/auth"}
              className="btn-glow btn-magnetic rounded-sm bg-foreground px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-background transition-colors hover:bg-primary"
            >
              {t("navStart")}
            </a>
          </div>
          <button
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
            className="grid size-10 place-items-center rounded-sm border border-border/40 backdrop-blur-sm transition-colors hover:border-primary/30 lg:hidden"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu — glass panel slide down */}
      <div
        className={`overflow-hidden border-b border-border/40 bg-background/90 backdrop-blur-xl transition-all duration-400 lg:hidden ${
          open ? "max-h-80 opacity-100" : "max-h-0 opacity-0 border-b-0"
        }`}
      >
        <nav className="flex flex-col gap-4 px-6 py-5 text-sm font-semibold text-muted-foreground">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center justify-between border-t border-border/40 px-6 py-4">
          <LangToggle />
          <div className="flex items-center gap-4">
            {session && (
              <a
                href="/painel"
                onClick={() => setOpen(false)}
                className="text-xs font-bold uppercase tracking-widest text-muted-foreground"
              >
                {isPt ? "Painel" : "Dashboard"}
              </a>
            )}
            <a
              href={session ? "/painel" : "/auth"}
              onClick={() => setOpen(false)}
              className="btn-glow rounded-sm bg-foreground px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-background"
            >
              {t("navStart")}
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
