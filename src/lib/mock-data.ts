import type { EventPhoto, GuestEvent, GuestBookEntry } from "./types";
import hero1 from "@/assets/memoir/hero-1.jpg";
import hero2 from "@/assets/memoir/hero-2.jpg";
import hero3 from "@/assets/memoir/hero-3.jpg";
import hero4 from "@/assets/memoir/hero-4.jpg";

export const MOCK_EVENTS: Record<string, GuestEvent> = {
  "casamento-ana-nuno-2024": {
    id: "evt-001",
    name: "Casamento Ana & Nuno",
    slug: "casamento-ana-nuno-2024",
    event_type: "wedding",
    description:
      "O grande dia da Ana e do Nuno. Uma celebrac\u0327a\u0303o de amor rodeada de familia e amigos.",
    cover_url: hero1,
    starts_at: "2024-12-15T14:00:00+02:00",
    ends_at: "2024-12-16T04:00:00+02:00",
    location_name: "Hotel Polana Serena, Maputo",
    privacy_mode: "public",
    theme_colors: {
      primary: "#d4a853",
      secondary: "#f8e8e0",
      accent: "#2C2420",
      bg: "#1a1a2e",
    },
    guest_upload: true,
    guestbook_enabled: true,
    live_wall_enabled: true,
    face_recognition: true,
    photo_count: 347,
    guest_count: 89,
    view_count: 5420,
    download_enabled: true,
    guest_list: [
      "Maria Joa\u0303o",
      "Pedro Machava",
      "Luana Domingos",
      "Carlos Mendes",
      "Sofia Santos",
      "Jo\u00e3o Mondlane",
      "Tia Beatriz",
      "Marta Cossa",
      "Rui Nhaca",
      "Fernanda Tembe",
      "Nuno Costa",
      "Bia Ferreira",
      "Kelvin Dos Santos",
      "Ana Macamo",
      "David Sitoe",
    ],
    hashtag: "#AnaENuno2024",
  },
  "aniversario-kelvin-30": {
    id: "evt-002",
    name: "Aniversa\u0301rio Kelvin 30",
    slug: "aniversario-kelvin-30",
    event_type: "birthday",
    description: "Trinta anos de vida! Vem celebrar comigo numa noite inesquecivel em Luanda.",
    cover_url: hero2,
    starts_at: "2025-02-20T20:00:00+01:00",
    ends_at: "2025-02-21T05:00:00+01:00",
    location_name: "Clube Luanda",
    privacy_mode: "access_code",
    theme_colors: {
      primary: "#FF6B35",
      secondary: "#004E89",
      accent: "#F5F0E8",
      bg: "#1a1a2e",
    },
    guest_upload: true,
    guestbook_enabled: true,
    live_wall_enabled: true,
    face_recognition: true,
    photo_count: 156,
    guest_count: 45,
    view_count: 2130,
    download_enabled: true,
    guest_list: ["Luana Domingos", "Kelvin Dos Santos", "Manuel Zangado", "Teresa Ngola"],
    hashtag: "#Kelvin30",
  },
};

const PHOTO_SOURCES = [hero1, hero2, hero3, hero4];
const CAPTIONS_PT = [
  "Os noivos no altar",
  "Primeira danc\u0327a como casados",
  "Brinde com champanhe",
  "Convidados a dan\u0327ar",
  "Momentos de alegria",
  "A noiva a entrar",
  "Lanc\u0327amento de arroz",
  "Familia reunida",
  "O bolo perfeito",
  "Momentos intimos",
  "Risadas entre amigos",
  "O ensaio pre\u0301-nupcial",
  "Ao por do sol",
  "Abra\u0327os emocionados",
  "A mesa dos noivos",
  "Vista a\u0301rea do local",
  "Detalhes da decorac\u0327a\u0303o",
  "As alianc\u0327as",
  "Bouquet da noiva",
  "Convidados divertidos",
];
const UPLOADER_NAMES = [
  "Bia Ferreira",
  "Nuno Costa",
  "Maria Joa\u0303o",
  "Pedro Machava",
  "Luana Domingos",
  "Carlos Mendes",
];

export function generateMockPhotos(eventId: string, count = 24): EventPhoto[] {
  const photos: EventPhoto[] = [];
  for (let i = 0; i < count; i++) {
    const src = PHOTO_SOURCES[i % PHOTO_SOURCES.length]!;
    const isLandscape = i % 3 !== 0;
    const isTall = i % 7 === 0;
    photos.push({
      id: `photo-${i + 1}`,
      event_id: eventId,
      src,
      thumbnail: src,
      width: isTall ? 600 : 800,
      height: isTall ? 1000 : isLandscape ? 600 : 800,
      caption: CAPTIONS_PT[i % CAPTIONS_PT.length],
      is_video: false,
      taken_at: `2024-12-15T${14 + Math.floor(i / 6)}:${String((i * 17) % 60).padStart(2, "0")}:00+02:00`,
      uploader_name: UPLOADER_NAMES[i % UPLOADER_NAMES.length],
      likes: Math.floor(Math.random() * 30),
    });
  }
  return photos;
}

export const MOCK_GUESTBOOK: GuestBookEntry[] = [
  {
    id: "gb-1",
    guest_name: "Maria Joa\u0303o",
    message: "Que casamento mais lindo! A Ana estava radiante. Parabe\u0301ns ao casal!",
    created_at: "2024-12-15T16:30:00+02:00",
    sentiment: "positive",
  },
  {
    id: "gb-2",
    guest_name: "Pedro Machava",
    message: "A festa foi incrive\u0301l! O mural ao vivo foi a melhor parte.",
    created_at: "2024-12-15T18:00:00+02:00",
    sentiment: "positive",
  },
  {
    id: "gb-3",
    guest_name: "Tia Beatriz",
    message: "Meus sobrinhos, que Deus os abenc\u0327oe. A cerimo\u0301nia foi perfeita!",
    created_at: "2024-12-15T20:15:00+02:00",
    sentiment: "positive",
  },
  {
    id: "gb-4",
    guest_name: "Luana Domingos",
    message:
      "Vim de Luanda especialmente para este casamento e valeu cada minuto. O reconhecimento facial encontrou todas as minhas fotos em segundos!",
    created_at: "2024-12-15T22:30:00+02:00",
    sentiment: "positive",
  },
  {
    id: "gb-5",
    guest_name: "Carlos (amigo do Nuno)",
    message: "Nuno, meu irma\u0303o! Finalmente casaste! A melhor festa que ja\u0301 fui.",
    created_at: "2024-12-16T00:45:00+02:00",
    sentiment: "positive",
  },
];

export function getEvent(slug: string): GuestEvent | undefined {
  return MOCK_EVENTS[slug];
}

export function getPhotos(eventId: string): EventPhoto[] {
  return generateMockPhotos(eventId, 24);
}

export function getGuestbook(eventId: string): GuestBookEntry[] {
  return MOCK_GUESTBOOK;
}
