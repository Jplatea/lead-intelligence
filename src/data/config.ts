import type { AlarmLevel, CompanyStatus, Rep, RepId } from "../types";

export const PASTEL = {
  yellow: "#f2e9a8",
  peach: "#f0c39a",
  coral: "#eda18f",
  pink: "#eeb0c9",
  lavender: "#d2aeda",
  purple: "#a79bcb",
  periwinkle: "#9faad6",
  blue: "#9dc0e8",
  sky: "#a9dcef",
  mint: "#a8dfcf",
  green: "#a9d6a9",
  lime: "#cbe2a0",
};

// Deeper/saturated counterparts of PASTEL, for use as text/icon color on the
// light background (the pale PASTEL tones only have enough contrast as fills).
export const PASTEL_TEXT = {
  yellow: "#a6853a",
  peach: "#b56a2e",
  coral: "#b9503a",
  pink: "#c25a86",
  lavender: "#8a5fc2",
  purple: "#6a56a0",
  periwinkle: "#5a6bc0",
  blue: "#3f6fc0",
  sky: "#2a8fae",
  mint: "#2a9678",
  green: "#3f8f52",
  lime: "#7a9a3a",
};

export const REPS: Record<RepId, Rep & { textColor: string }> = {
  jose: {
    id: "jose",
    name: "José",
    color: PASTEL.purple,
    textColor: PASTEL_TEXT.purple,
    bg: "bg-[#a79bcb]",
    ring: "ring-[#a79bcb]/50",
  },
  fran: {
    id: "fran",
    name: "Fran",
    color: PASTEL.mint,
    textColor: PASTEL_TEXT.mint,
    bg: "bg-[#a8dfcf]",
    ring: "ring-[#a8dfcf]/50",
  },
  victor: {
    id: "victor",
    name: "Víctor",
    color: PASTEL.peach,
    textColor: PASTEL_TEXT.peach,
    bg: "bg-[#f0c39a]",
    ring: "ring-[#f0c39a]/50",
  },
};

export const STATUS_CONFIG: Record<
  CompanyStatus,
  { label: string; className: string; hex: string }
> = {
  nuevo: { label: "Nuevo", className: "bg-[#9dc0e8] text-black/80", hex: PASTEL.blue },
  contactado: { label: "Contactado", className: "bg-[#a8dfcf] text-black/80", hex: PASTEL.mint },
  no_interesado: { label: "No interesado", className: "bg-[#eda18f] text-black/80", hex: PASTEL.coral },
  trabajando: { label: "Trabajando", className: "bg-[#a79bcb] text-black/80", hex: PASTEL.purple },
};

export const ALARM_CONFIG: Record<
  AlarmLevel,
  { label: string; dot: string; hex: string; textHex: string }
> = {
  nunca_contactado: { label: "Nunca contactado", dot: "bg-[#eda18f]", hex: PASTEL.coral, textHex: PASTEL_TEXT.coral },
  mas_30_dias: { label: "Hace más de 30 días", dot: "bg-[#f0c39a]", hex: PASTEL.peach, textHex: PASTEL_TEXT.peach },
  esperando_respuesta: { label: "Esperando respuesta", dot: "bg-[#f2e9a8]", hex: PASTEL.yellow, textHex: PASTEL_TEXT.yellow },
  reunion_proxima: { label: "Reunión próxima", dot: "bg-[#a9d6a9]", hex: PASTEL.green, textHex: PASTEL_TEXT.green },
  cliente_activo: { label: "Cliente activo", dot: "bg-[#9dc0e8]", hex: PASTEL.blue, textHex: PASTEL_TEXT.blue },
};

export const BRAND_OPTIONS = [
  "KNX",
  "Control4",
  "Crestron",
  "RTI",
  "Savant",
  "Lutron",
  "URC",
  "Basalte",
  "Sonance",
  "Origin",
  "Stewart",
];

export const SPECIALTY_OPTIONS = [
  "Cinema",
  "Audio",
  "Vídeo",
  "Electricidad",
  "Iluminación",
  "Domótica",
  "Redes",
];

export const TYPE_OPTIONS = ["Integrador", "Arquitecto", "Decorador"];
