import {
  QrCode,
  ScanFace,
  WifiOff,
  MessageCircle,
  Tv,
  CreditCard,
  ArrowRight,
  Star,
  Check,
  Sparkles,
  Camera,
  Zap,
  Upload,
  Eye,
} from "lucide-react";
import { useLang } from "@/lib/i18n";
import { useScrollReveal, useParallax, useCounter } from "@/hooks/useScrollReveal";
import hero1 from "@/assets/memoir/hero-1.jpg";
import hero2 from "@/assets/memoir/hero-2.jpg";
import hero3 from "@/assets/memoir/hero-3.jpg";
import hero4 from "@/assets/memoir/hero-4.jpg";

/* ------------------------------------------------------------------ */
/*  Polaroid – local component (not exported)                         */
/* ------------------------------------------------------------------ */

interface PolaroidProps {
  src: string;
  alt: string;
  caption: string;
  aspect: string;
  rotate: string;
  delay: string;
  floatDuration?: string;
}

function Polaroid({
  src,
  alt,
  caption,
  aspect,
  rotate,
  delay,
  floatDuration = "6s",
}: PolaroidProps) {
  return (
    <div
      className={`polaroid animate-float-gentle transform ${rotate} transition-all duration-700 hover:rotate-0 hover:scale-[1.03] cursor-pointer group animate-rise light-leak`}
      style={
        {
          animationDelay: delay,
          "--rotation": rotate.includes("-") ? "-2deg" : "2deg",
          "--float-duration": floatDuration,
        } as React.CSSProperties
      }
    >
      <div className="overflow-hidden">
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={`w-full ${aspect} object-cover grayscale-[20%] group-hover:grayscale-0 sepia-[15%] group-hover:sepia-0 transition-all duration-700 ken-burns`}
        />
      </div>
      {caption && (
        <p className="mt-3 text-center font-display text-[10px] italic text-muted-foreground">
          {caption}
        </p>
      )}
    </div>
  );
}

const polaroids = [
  {
    src: hero1,
    alt: "Noiva a rir num casamento em Maputo",
    caption: "Maputo, Outono 2023",
    aspect: "aspect-[3/4]",
    rotate: "-rotate-2",
    delay: "0ms",
    floatDuration: "7s",
  },
  {
    src: hero4,
    alt: "Brinde com champanhe numa celebração elegante",
    caption: "",
    aspect: "aspect-square",
    rotate: "rotate-1",
    delay: "150ms",
    floatDuration: "8s",
  },
  {
    src: hero2,
    alt: "Convidados a dançar numa celebração em Luanda",
    caption: "",
    aspect: "aspect-square",
    rotate: "rotate-3",
    delay: "300ms",
    floatDuration: "6.5s",
  },
  {
    src: hero3,
    alt: "Amigos abraçados ao pôr do sol",
    caption: "Cascais, Verão 2024",
    aspect: "aspect-[3/4]",
    rotate: "-rotate-1",
    delay: "450ms",
    floatDuration: "9s",
  },
] as const;

/* ------------------------------------------------------------------ */
/*  Hero                                                              */
/* ------------------------------------------------------------------ */

function StatCounter({
  target,
  suffix,
  label,
  start,
}: {
  target: number;
  suffix: string;
  label: string;
  start: boolean;
}) {
  const count = useCounter(target, 2200, start);
  return (
    <div className="text-center">
      <p className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
        {count.toLocaleString()}
        {suffix}
      </p>
      <p className="mt-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

export function Hero() {
  const { t } = useLang();
  const parallaxOffset = useParallax(0.15);
  const [statsRef, statsVisible] = useScrollReveal<HTMLDivElement>({ threshold: 0.3 });

  return (
    <section className="gradient-mesh relative overflow-hidden px-6 pb-20 pt-32 md:px-12 md:pb-28 md:pt-40">
      {/* Subtle noise texture overlay */}
      <div className="noise-overlay pointer-events-none absolute inset-0 z-0" />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-12 lg:gap-20">
        {/* Narrative Column */}
        <div className="animate-rise lg:col-span-5">
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">
              Est. 2025
            </span>
            <h1 className="font-display text-5xl italic leading-none text-foreground md:text-7xl lg:text-8xl">
              Memoir
            </h1>
          </div>

          <div className="mt-8 space-y-6">
            <h2 className="font-display text-2xl leading-tight text-foreground md:text-4xl text-balance">
              {t("heroTitle")}
            </h2>
            <p className="max-w-md text-base leading-relaxed text-muted-foreground md:text-lg text-balance">
              {t("heroSub")}
            </p>
          </div>

          {/* No-app highlight */}
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-4 py-2 backdrop-blur-sm">
            <Zap className="size-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">{t("heroNoApp")}</span>
          </div>
          <p className="-mt-2 ml-1 max-w-xs pl-6 text-xs leading-relaxed text-muted-foreground">
            {t("heroNoAppSub")}
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <a
              href="/auth"
              className="btn-glow inline-flex items-center justify-center gap-2 rounded-sm bg-foreground px-8 py-4 text-xs font-bold uppercase tracking-widest text-background shadow-soft transition-colors hover:bg-primary"
            >
              {t("heroCta")} <ArrowRight className="size-4" />
            </a>
            <a
              href="#features"
              className="inline-flex items-center justify-center gap-2 border-b border-primary px-2 py-4 text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:text-muted-foreground"
            >
              {t("heroCta2")}
            </a>
          </div>

          {/* Social proof strip */}
          <div className="mt-12 flex items-center gap-6 border-t border-border/50 pt-8">
            <div className="flex -space-x-3">
              <div className="grid size-12 place-items-center rounded-full border-4 border-background bg-primary text-[10px] font-bold text-primary-foreground">
                AI
              </div>
              <div className="size-12 overflow-hidden rounded-full border-4 border-background bg-secondary">
                <img
                  src={hero2}
                  alt="Convidado sorridente"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("navStart") === "Criar galeria"
                ? "Correspondência inteligente"
                : "Intelligent matching"}
              <br />
              {t("navStart") === "Criar galeria" ? "Privado por design" : "Private by design"}
            </p>
          </div>
        </div>

        {/* Analog Masonry Grid – parallax */}
        <div
          className="relative lg:col-span-7"
          style={{ transform: `translateY(${parallaxOffset}px)` }}
        >
          <div className="grid grid-cols-2 gap-4 md:gap-8">
            <div className="space-y-4 md:space-y-8">
              <Polaroid {...polaroids[0]} />
              <Polaroid {...polaroids[1]} />
            </div>
            <div className="space-y-4 md:space-y-8 pt-12">
              <Polaroid {...polaroids[2]} />
              <Polaroid {...polaroids[3]} />
            </div>
          </div>
          {/* Decorative border frame */}
          <div className="pointer-events-none absolute -z-10 top-1/2 left-1/2 h-[80%] w-[120%] -translate-x-1/2 -translate-y-1/2 border border-border/30" />
        </div>
      </div>

      {/* Animated Stats Bar */}
      <div
        ref={statsRef}
        className={`relative z-10 mx-auto mt-20 max-w-4xl rounded-sm border border-border/50 bg-card/60 backdrop-blur-md p-8 md:p-10 transition-all duration-1000 ${statsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      >
        <div className="flex flex-col items-center justify-center gap-8 md:flex-row md:gap-0">
          <StatCounter target={2400} suffix="+" label={t("heroStat1Label")} start={statsVisible} />
          <div className="hidden md:block stat-divider mx-10 h-12 w-px" />
          <StatCounter target={850} suffix="K+" label={t("heroStat2Label")} start={statsVisible} />
          <div className="hidden md:block stat-divider mx-10 h-12 w-px" />
          <StatCounter target={4} suffix="" label={t("heroStat3Label")} start={statsVisible} />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  How It Works (Stripe-style 3-step)                                */
/* ------------------------------------------------------------------ */

export function HowItWorks() {
  const { t } = useLang();
  const [headerRef, headerVisible] = useScrollReveal<HTMLDivElement>();
  const [stepsRef, stepsVisible] = useScrollReveal<HTMLDivElement>({ threshold: 0.2 });

  const steps = [
    {
      num: "01",
      icon: QrCode,
      title: t("howStep1Title"),
      desc: t("howStep1Desc"),
    },
    {
      num: "02",
      icon: Camera,
      title: t("howStep2Title"),
      desc: t("howStep2Desc"),
    },
    {
      num: "03",
      icon: Upload,
      title: t("howStep3Title"),
      desc: t("howStep3Desc"),
    },
  ];

  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20 md:px-12 md:py-28">
      {/* Header */}
      <div
        ref={headerRef}
        className={`reveal max-w-2xl transition-all duration-700 ${headerVisible ? "is-visible" : ""}`}
      >
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
          {t("howKicker")}
        </p>
        <h2 className="mt-4 font-display text-3xl text-foreground md:text-5xl text-balance">
          {t("howTitle")}
        </h2>
      </div>

      {/* Steps */}
      <div
        ref={stepsRef}
        className={`stagger mt-16 transition-all duration-700 ${stepsVisible ? "is-visible" : ""}`}
      >
        <div className="relative grid gap-10 md:grid-cols-3 md:gap-8">
          {/* Connecting line – desktop only */}
          <div className="pointer-events-none absolute top-10 left-[16.6%] right-[16.6%] hidden h-px md:block">
            <div className="h-full w-full border-t-2 border-dashed border-border/60" />
          </div>

          {steps.map((step) => (
            <div key={step.num} className="reveal relative flex flex-col items-center text-center">
              {/* Numbered circle */}
              <div className="relative z-10 grid size-20 place-items-center rounded-full border-2 border-border bg-card shadow-card">
                <span className="font-display text-sm font-bold tracking-widest text-muted-foreground">
                  {step.num}
                </span>
                <step.icon className="absolute -bottom-1 -right-1 size-7 rounded-full bg-primary p-1.5 text-primary-foreground shadow-glow" />
              </div>

              <h3 className="mt-6 font-display text-xl text-foreground">{step.title}</h3>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Features (Linear / Vercel card style)                             */
/* ------------------------------------------------------------------ */

export function Features() {
  const { t } = useLang();
  const [headerRef, headerVisible] = useScrollReveal<HTMLDivElement>();
  const [gridRef, gridVisible] = useScrollReveal<HTMLDivElement>({ threshold: 0.1 });

  const items = [
    { icon: QrCode, title: t("f1t"), desc: t("f1d") },
    { icon: ScanFace, title: t("f2t"), desc: t("f2d") },
    { icon: WifiOff, title: t("f3t"), desc: t("f3d") },
    { icon: MessageCircle, title: t("f4t"), desc: t("f4d") },
    { icon: Tv, title: t("f5t"), desc: t("f5d") },
    { icon: CreditCard, title: t("f6t"), desc: t("f6d") },
  ];

  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20 md:px-12 md:py-28">
      {/* Header */}
      <div
        ref={headerRef}
        className={`reveal max-w-2xl transition-all duration-700 ${headerVisible ? "is-visible" : ""}`}
      >
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
          {t("featuresKicker")}
        </p>
        <h2 className="mt-4 font-display text-3xl text-foreground md:text-5xl">
          {t("featuresTitle")}
        </h2>
      </div>

      {/* Cards Grid */}
      <div
        ref={gridRef}
        className={`stagger mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 transition-all duration-700 ${gridVisible ? "is-visible" : ""}`}
      >
        {items.map((it) => (
          <article key={it.title} className="glass-card group">
            <span className="grid size-11 place-items-center rounded-full bg-secondary text-primary transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
              <it.icon className="size-5" />
            </span>
            <h3 className="mt-5 font-display text-xl text-card-foreground">{it.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{it.desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Pricing (MZN)                                                     */
/* ------------------------------------------------------------------ */

export function Pricing() {
  const { lang, t } = useLang();
  const [headerRef, headerVisible] = useScrollReveal<HTMLDivElement>();
  const [cardsRef, cardsVisible] = useScrollReveal<HTMLDivElement>({ threshold: 0.1 });

  const plans = [
    {
      name: t("planFree"),
      price: "0",
      unit: "MZN",
      period: t("perEvent"),
      alt: "",
      features:
        lang === "pt"
          ? ["1 evento", "50 fotos", "Acesso 7 dias", "Marca de água"]
          : ["1 event", "50 photos", "7-day access", "Watermarked"],
      cta: t("startFree"),
      highlight: false,
    },
    {
      name: t("planPremium"),
      price: "1.890",
      unit: "MZN",
      period: t("perEvent"),
      alt: `1.190 MZN${t("perMonth")}`,
      features:
        lang === "pt"
          ? [
              "Fotos ilimitadas",
              "Acesso 90 dias",
              "Sem marca de água",
              "Reconhecimento facial",
              "Mural ao vivo",
            ]
          : ["Unlimited photos", "90-day access", "No watermark", "Face recognition", "Live wall"],
      cta: t("choose"),
      highlight: true,
    },
    {
      name: t("planPro"),
      price: "6.340",
      unit: "MZN",
      period: t("perEvent"),
      alt: `3.780 MZN${t("perMonth")}`,
      features:
        lang === "pt"
          ? [
              "Tudo do Premium",
              "Marca personalizada",
              "Acesso para fotógrafo",
              "Analytics",
              "Vídeos",
              "Suporte prioritário",
            ]
          : [
              "Everything in Premium",
              "Custom branding",
              "Photographer access",
              "Analytics",
              "Video uploads",
              "Priority support",
            ],
      cta: t("choose"),
      highlight: false,
    },
  ];

  return (
    <section id="pricing" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20 md:px-12 md:py-28">
      {/* Header */}
      <div
        ref={headerRef}
        className={`reveal max-w-2xl transition-all duration-700 ${headerVisible ? "is-visible" : ""}`}
      >
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
          {t("pricingKicker")}
        </p>
        <h2 className="mt-4 font-display text-3xl text-foreground md:text-5xl">
          {t("pricingTitle")}
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">{t("pricingSub")}</p>
        <span className="mt-3 inline-block rounded-full border border-border/60 bg-card/60 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground backdrop-blur-sm">
          {t("pricingMZN")}
        </span>
      </div>

      {/* Cards */}
      <div
        ref={cardsRef}
        className={`stagger mt-14 grid gap-6 lg:grid-cols-3 transition-all duration-700 ${cardsVisible ? "is-visible" : ""}`}
      >
        {plans.map((p, idx) => (
          <article
            key={p.name}
            className={`reveal-scale relative flex flex-col rounded-sm border p-8 transition-all duration-500 hover:-translate-y-1 ${
              p.highlight
                ? "pricing-highlight border-foreground/20 bg-card"
                : "glass-card border-border bg-card/80"
            }`}
            style={{ transitionDelay: `${idx * 120}ms` }}
          >
            {p.highlight && (
              <span className="absolute -top-3 left-8 flex items-center gap-1.5 bg-foreground px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-background">
                <Sparkles className="size-3" />
                {t("popular")}
              </span>
            )}

            <h3 className="font-display text-2xl text-card-foreground">{p.name}</h3>

            <p className="mt-5 flex items-baseline gap-1">
              <span className="font-display text-4xl text-foreground">{p.price}</span>
              <span className="text-sm font-medium text-muted-foreground">{p.unit}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{p.period}</p>
            {p.alt && <p className="mt-1 text-xs text-primary/80 font-medium">{p.alt}</p>}

            <ul className="mt-8 flex-1 space-y-3 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-muted-foreground">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  {f}
                </li>
              ))}
            </ul>

            <a
              href="/auth"
              className={`btn-magnetic mt-9 inline-flex items-center justify-center rounded-sm px-6 py-3.5 text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
                p.highlight
                  ? "btn-glow bg-foreground text-background hover:bg-primary"
                  : "border border-foreground text-foreground hover:bg-foreground hover:text-background"
              }`}
            >
              {p.cta}
              <ArrowRight className="ml-1.5 size-3.5" />
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Testimonials                                                      */
/* ------------------------------------------------------------------ */

export function Testimonials() {
  const { lang, t } = useLang();
  const [headerRef, headerVisible] = useScrollReveal<HTMLDivElement>();
  const [cardsRef, cardsVisible] = useScrollReveal<HTMLDivElement>({ threshold: 0.1 });

  const items =
    lang === "pt"
      ? [
          {
            q: "Recebemos 900 fotos dos convidados antes do bolo ser cortado. Mágico.",
            n: "Ana & Nuno",
            e: "Casamento, Maputo",
          },
          {
            q: "O mural ao vivo foi a estrela da festa. Toda a gente queria aparecer.",
            n: "Kelvin Dos Santos",
            e: "Aniversário, Luanda",
          },
          {
            q: "Entrego galerias aos clientes em minutos, sem WeTransfer.",
            n: "Bia Ferreira",
            e: "Fotógrafa, São Paulo",
          },
        ]
      : [
          {
            q: "We got 900 guest photos before the cake was cut. Magical.",
            n: "Ana & Nuno",
            e: "Wedding, Maputo",
          },
          {
            q: "The live wall was the star of the party. Everyone wanted to be on it.",
            n: "Kelvin Dos Santos",
            e: "Birthday, Luanda",
          },
          {
            q: "I deliver client galleries in minutes, no WeTransfer.",
            n: "Bia Ferreira",
            e: "Photographer, São Paulo",
          },
        ];

  return (
    <section id="stories" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20 md:px-12 md:py-28">
      {/* Header */}
      <div
        ref={headerRef}
        className={`reveal max-w-2xl transition-all duration-700 ${headerVisible ? "is-visible" : ""}`}
      >
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
          {t("testiKicker")}
        </p>
        <h2 className="mt-4 font-display text-3xl text-foreground md:text-5xl">
          {t("testiTitle")}
        </h2>
      </div>

      {/* Cards */}
      <div
        ref={cardsRef}
        className={`stagger mt-14 grid gap-6 md:grid-cols-3 transition-all duration-700 ${cardsVisible ? "is-visible" : ""}`}
      >
        {items.map((i) => (
          <figure key={i.n} className="glass-card relative overflow-hidden rounded-sm p-8">
            {/* Star area with light-leak glow */}
            <div className="light-leak relative flex gap-1">
              {Array.from({ length: 5 }).map((_, k) => (
                <Star key={k} className="size-4 fill-primary text-primary" />
              ))}
            </div>
            <blockquote className="mt-5 font-display text-lg leading-snug text-card-foreground">
              &ldquo;{i.q}&rdquo;
            </blockquote>
            <figcaption className="mt-5 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{i.n}</span> · {i.e}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Final CTA                                                         */
/* ------------------------------------------------------------------ */

export function FinalCta() {
  const { t } = useLang();
  const [ref, isVisible] = useScrollReveal<HTMLDivElement>();

  return (
    <section className="mx-auto max-w-6xl px-6 pb-20 md:px-12">
      <div
        ref={ref}
        className={`gradient-mesh relative overflow-hidden rounded-sm border border-border/60 bg-secondary px-6 py-16 text-center md:px-12 md:py-24 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}
      >
        <div className="noise-overlay pointer-events-none absolute inset-0" />
        <div className="relative z-10 mx-auto max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground backdrop-blur-sm">
            <Eye className="size-3.5 text-primary" />
            {t("howKicker")}
          </div>
          <h2 className="font-display text-3xl text-foreground md:text-5xl text-balance">
            {t("ctaTitle")}
          </h2>
          <p className="mt-4 text-muted-foreground text-balance">{t("ctaSub")}</p>
          <a
            href="/auth"
            className="btn-glow mt-8 inline-flex items-center gap-2 rounded-sm bg-foreground px-8 py-4 text-xs font-bold uppercase tracking-widest text-background shadow-soft transition-colors hover:bg-primary"
          >
            {t("heroCta")} <ArrowRight className="size-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Footer                                                            */
/* ------------------------------------------------------------------ */

export function SiteFooter() {
  const { t } = useLang();

  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:px-12 md:grid-cols-[1.4fr_1fr_1fr]">
        {/* Brand column */}
        <div>
          <p className="font-display text-2xl italic text-foreground">Memoir</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
            {t("footerTag")}
          </p>
          <p className="mt-4 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">
            {t("footerMZN")}
          </p>
        </div>

        {/* Product column */}
        <div className="text-sm">
          <p className="font-semibold text-foreground">{t("footerProduct")}</p>
          <ul className="mt-4 space-y-3 text-muted-foreground">
            <li>
              <a href="#features" className="transition-colors hover:text-foreground">
                {t("navFeatures")}
              </a>
            </li>
            <li>
              <a href="#pricing" className="transition-colors hover:text-foreground">
                {t("navPricing")}
              </a>
            </li>
            <li>
              <a href="#stories" className="transition-colors hover:text-foreground">
                {t("navStories")}
              </a>
            </li>
          </ul>
        </div>

        {/* Legal column */}
        <div className="text-sm">
          <p className="font-semibold text-foreground">{t("footerLegal")}</p>
          <ul className="mt-4 space-y-3 text-muted-foreground">
            <li>
              <a href="/privacidade" className="transition-colors hover:text-foreground">
                {t("navStart") === "Criar galeria" ? "Privacidade" : "Privacy"}
              </a>
            </li>
            <li>
              <a href="/termos" className="transition-colors hover:text-foreground">
                {t("navStart") === "Criar galeria" ? "Termos" : "Terms"}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/40 px-6 py-6 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Memoir. {t("rights")}
        </p>
      </div>
    </footer>
  );
}
