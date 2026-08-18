import { createFileRoute } from "@tanstack/react-router";
import { LanguageProvider } from "@/lib/i18n";
import { SiteHeader } from "@/components/landing/SiteHeader";
import {
  Hero,
  HowItWorks,
  Features,
  Pricing,
  Testimonials,
  FinalCta,
  SiteFooter,
} from "@/components/landing/sections";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Memoir — Galeria de fotos para eventos | MZN" },
      {
        name: "description",
        content:
          "Crie a galeria do seu evento em minutos. QR code, reconhecimento facial, mural ao vivo e partilha por WhatsApp. Sem app para os convidados. Preços em Metical.",
      },
      { property: "og:title", content: "Memoir — Cada batimento, eternamente guardado" },
      {
        property: "og:description",
        content:
          "Galerias de fotos para eventos por QR code e reconhecimento facial. Feito para casamentos e celebrações em África e além.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <LanguageProvider>
      <div id="top" className="min-h-screen bg-background">
        {/* Global noise texture — Awwwards editorial feel */}
        <div className="noise-overlay" aria-hidden="true" />
        <SiteHeader />
        <main>
          <Hero />
          <HowItWorks />
          <Features />
          <Pricing />
          <Testimonials />
          <FinalCta />
        </main>
        <SiteFooter />
      </div>
    </LanguageProvider>
  );
}
