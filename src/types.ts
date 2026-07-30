export type RepId = "jose" | "fran" | "victor";

export interface Rep {
  id: RepId;
  name: string;
  color: string; // hex
  bg: string; // tailwind class
  ring: string; // tailwind class
}

export type CompanyStatus = "nuevo" | "contactado" | "no_interesado" | "trabajando";

export type AlarmLevel =
  | "nunca_contactado"
  | "mas_30_dias"
  | "esperando_respuesta"
  | "reunion_proxima"
  | "cliente_activo";

export interface Comment {
  repId: RepId;
  text: string;
  date: string;
}

export interface NextAction {
  label: string;
  dueInDays: number;
}

export interface Company {
  id: string;
  name: string;
  type: string;
  city: string;
  province: string;
  country: string;
  postalCode: string;
  lat: number;
  lng: number;
  employees?: string;
  revenueEstimate?: string;
  foundedYear?: number;
  contact: {
    email?: string;
    secondaryEmails?: string[];
    phone?: string;
    whatsapp?: string;
    web?: string;
    instagram?: string;
    linkedin?: string;
    facebook?: string;
    youtube?: string;
    pinterest?: string;
  };
  brands: string[];
  specialties: string[];
  assignedRep: RepId;
  status: CompanyStatus;
  alarm: AlarmLevel;
  lastActionLabel: string;
  importedType: "manual" | "auto";
  comments: Comment[];
  nextActions: NextAction[];
  aiSummary?: string;
  aiRecommendation?: string;
  connectedTo?: string[];
}
