import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "pt" | "en";

type Dict = Record<string, { pt: string; en: string }>;

export const dict = {
  // ── Navigation ──
  navFeatures: { pt: "Funcionalidades", en: "Features" },
  navPricing: { pt: "Preços", en: "Pricing" },
  navStories: { pt: "Histórias", en: "Stories" },
  navLogin: { pt: "Entrar", en: "Log in" },
  navStart: { pt: "Criar galeria", en: "Create gallery" },

  // ── Hero ──
  heroBadge: {
    pt: "A recordação digital para cada convidado",
    en: "A digital keepsake for every guest",
  },
  heroTitle: {
    pt: "Cada batimento, eternamente guardado.",
    en: "Every heartbeat, beautifully kept.",
  },
  heroSub: {
    pt: "Da luz íntima de Maputo às noites vibrantes de Lisboa. Memoir reúne cada momento dos seus convidados — por QR code e reconhecimento facial — num arquivo privado e atemporal. Sem apps. Sem login. Apenas memórias.",
    en: "From the intimate light of Maputo to the vibrant nights of Lisbon. Memoir gathers every guest moment — via QR code and face recognition — into a private, timeless archive. No apps. No login. Just memories.",
  },
  heroCta: { pt: "Criar a minha galeria", en: "Create my gallery" },
  heroCta2: { pt: "Ver como funciona", en: "See how it works" },
  heroStat1Label: { pt: "Celebrações", en: "Celebrations" },
  heroStat2Label: { pt: "Memórias guardadas", en: "Memories kept" },
  heroStat3Label: { pt: "Países", en: "Countries" },
  heroNoApp: {
    pt: "Sem app. Sem login.",
    en: "No app. No login.",
  },
  heroNoAppSub: {
    pt: "O convidado escaneia o QR e já pode ver, partilhar e carregar fotos.",
    en: "Guests scan the QR and can instantly view, share and upload photos.",
  },

  // ── Trust marquee ──
  trustKicker: { pt: "Presente em", en: "Present in" },

  // ── Features ──
  featuresKicker: { pt: "Feito para momentos reais", en: "Built for real moments" },
  featuresTitle: {
    pt: "Simples para os convidados. Poderoso para si.",
    en: "Simple for guests. Powerful for you.",
  },
  f1t: { pt: "Partilha por QR Code", en: "QR code sharing" },
  f1d: {
    pt: "Um código único por evento, para convites, mesas e ecrãs. Os convidados apenas apontam a câmara — sem download, sem registo.",
    en: "One unique code per event — invites, tables and screens. Guests just point their camera — no download, no sign-up.",
  },
  f2t: { pt: "Reconhecimento facial", en: "AI face recognition" },
  f2d: {
    pt: "Uma selfie e cada convidado encontra todas as suas fotos numa galeria privada. Tecnologia pgvector com embeddings de 128 dimensões.",
    en: "One selfie and each guest finds all their photos in a private gallery. pgvector technology with 128-dimension embeddings.",
  },
  f3t: { pt: "Modo offline", en: "Offline mode" },
  f3d: {
    pt: "As fotos ficam em fila e sincronizam quando a rede voltar. Pensado para locais com internet fraca — como sabimos que é em África.",
    en: "Photos queue up and sync when the network returns. Designed for venues with weak signal — as we know it often is in Africa.",
  },
  f4t: { pt: "Entrega por WhatsApp", en: "WhatsApp delivery" },
  f4d: {
    pt: "Envie links e fotos diretamente por WhatsApp, onde os seus convidados já estão. Partilha com um toque.",
    en: "Send links and photos directly via WhatsApp, where your guests already are. Share with one tap.",
  },
  f5t: { pt: "Mural ao vivo", en: "Live photo wall" },
  f5d: {
    pt: "Slideshow em tempo real em qualquer TV ou ecrã do salão. Transições Ken Burns, efeito Polaroid — uma experiência cinematográfica para toda a festa.",
    en: "Real-time slideshow on any screen at the venue. Ken Burns transitions, Polaroid effect — a cinematic experience for the whole party.",
  },
  f6t: { pt: "Pagamentos locais", en: "Local payments" },
  f6d: {
    pt: "M-Pesa, PIX, cartão e PayPal — pague como preferir, no seu mercado. Preços em Metical para Moçambique.",
    en: "M-Pesa, PIX, card and PayPal — pay however works in your market. Prices in Metical for Mozambique.",
  },

  // ── Pricing (Metical MZN) ──
  pricingKicker: { pt: "Preços", en: "Pricing" },
  pricingTitle: { pt: "Pague por evento ou por mês", en: "Pay per event or monthly" },
  pricingSub: {
    pt: "3 eventos gratuitos para novas contas. Sem compromisso. Preços em Metical (MZN).",
    en: "3 free events for new accounts. No commitment. Prices in Metical (MZN).",
  },
  pricingMZN: { pt: "Todos os preços em MZN", en: "All prices in MZN" },
  perEvent: { pt: "/evento", en: "/event" },
  perMonth: { pt: "/mês", en: "/mo" },
  planFree: { pt: "Gratuito", en: "Free" },
  planPremium: { pt: "Premium", en: "Premium" },
  planPro: { pt: "Profissional", en: "Professional" },
  popular: { pt: "Mais popular", en: "Most popular" },
  choose: { pt: "Escolher plano", en: "Choose plan" },
  startFree: { pt: "Começar grátis", en: "Start free" },

  // ── Testimonials ──
  testiKicker: { pt: "Histórias reais", en: "Real stories" },
  testiTitle: { pt: "Momentos que ninguém perdeu", en: "Moments nobody missed" },

  // ── CTA ──
  ctaTitle: { pt: "Pronto para o seu grande dia?", en: "Ready for your big day?" },
  ctaSub: {
    pt: "Crie a galeria em menos de 3 minutos. Os convidados partilham desde o primeiro brinde.",
    en: "Set up your gallery in under 3 minutes. Guests start sharing from the first toast.",
  },

  // ── How it works ──
  howKicker: { pt: "Como funciona", en: "How it works" },
  howTitle: { pt: "Três passos. Zero complicação.", en: "Three steps. Zero complexity." },
  howStep1Title: { pt: "Crie o seu evento", en: "Create your event" },
  howStep1Desc: {
    pt: "Defina nome, data e tipo de celebração. Escolha a privacidade e gere o QR code personalizado.",
    en: "Set the name, date and celebration type. Choose privacy and generate your custom QR code.",
  },
  howStep2Title: { pt: "Os convidados chegam", en: "Guests arrive" },
  howStep2Desc: {
    pt: "Eles escaneiam o QR — sem app, sem login. Veem fotos, carregam as suas, e escrevem no guestbook.",
    en: "They scan the QR — no app, no login. They browse photos, upload their own, and write in the guestbook.",
  },
  howStep3Title: { pt: "Memórias para sempre", en: "Memories forever" },
  howStep3Desc: {
    pt: "Todas as fotos e vídeos organizados por reconhecimento facial. Cada convidado encontra as suas com uma selfie.",
    en: "All photos and videos organized by face recognition. Every guest finds theirs with a single selfie.",
  },

  // ── Footer ──
  footerTag: {
    pt: "Feito em África para o mundo. Com amor desde Maputo.",
    en: "Made in Africa for the world. With love from Maputo.",
  },
  footerProduct: { pt: "Produto", en: "Product" },
  footerCompany: { pt: "Empresa", en: "Company" },
  footerLegal: { pt: "Legal", en: "Legal" },
  rights: { pt: "Todos os direitos reservados.", en: "All rights reserved." },
  footerMZN: { pt: "Preços em Metical (MZN)", en: "Prices in Metical (MZN)" },
} satisfies Dict;

type Key = keyof typeof dict;

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "pt",
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("pt");

  useEffect(() => {
    const stored = window.localStorage.getItem("memoir-lang");
    if (stored === "pt" || stored === "en") setLang(stored);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("memoir-lang", lang);
  }, [lang]);

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const { lang, setLang } = useContext(LangContext);
  const t = (key: Key) => dict[key][lang];
  return { lang, setLang, t };
}
