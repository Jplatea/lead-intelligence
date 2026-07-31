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

export interface Company {
  id: string;
  name: string;
  type: string;
  city: string;
  province: string;
  country: string;
  postalCode: string;
  address?: string;
  lat: number;
  lng: number;
  contact: {
    email?: string;
    phone?: string;
  };
  brands: string[];
  specialties: string[];
  assignedRep: RepId;
  status: CompanyStatus;
  alarm: AlarmLevel;
  importedType: "manual" | "auto";
  comments: Comment[];
  aiSummary?: string;
  aiRecommendation?: string;
  connectedTo?: string[];
  needsReview?: boolean;
}

// A separate, minimal contacts list for mailing campaigns — deliberately not
// the same records as Company. It's imported straight from an XLSX/CSV of
// contact name + email + company name, and never merges with the main
// leads database.
export interface MailingContact {
  id: string;
  contactName: string;
  email: string;
  companyName: string;
}
