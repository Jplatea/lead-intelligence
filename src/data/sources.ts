export type RobotsStatus = "allowed" | "disallowed" | "blocked" | "checking" | "unknown";

export interface LeadSource {
  id: string;
  name: string;
  url: string;
  note: string;
  custom?: boolean;
  robotsStatus: RobotsStatus;
  robotsNote?: string;
}

export const DEFAULT_SOURCES: LeadSource[] = [
  {
    id: "sonos",
    name: "Sonos — Store Locator",
    url: "https://www.sonos.com/es-es/storelocator",
    note: "Buscador de distribuidores. Filtra por España/Portugal en el propio selector de país.",
    robotsStatus: "blocked",
    robotsNote: "El WAF del sitio bloquea peticiones automatizadas (incluso al robots.txt).",
  },
  {
    id: "loxone",
    name: "Loxone — Buscar un Partner",
    url: "https://www.loxone.com/eses/comprar/buscar-un-partner/",
    note: "Directorio de partners certificados. Limita la búsqueda a España y Portugal.",
    robotsStatus: "disallowed",
    robotsNote: "robots.txt prohíbe explícitamente /eses/country/espana/ y /eses/search/*.",
  },
  {
    id: "knx",
    name: "KNX — Find an Installer",
    url: "https://www.knx.org/find-an-installer",
    note: "Directorio global de instaladores KNX. Filtra por país (España / Portugal).",
    robotsStatus: "allowed",
    robotsNote: "La página no está restringida, pero el buscador es una herramienta JS interactiva.",
  },
  {
    id: "control4",
    name: "Control4 — Integrator Search",
    url: "https://www.control4.com/integrator-search",
    note: "Buscador de integradores certificados Control4. Filtra por país.",
    robotsStatus: "allowed",
    robotsNote: "Sin restricciones en robots.txt.",
  },
  {
    id: "bowers-wilkins",
    name: "Bowers & Wilkins — Find a Retailer",
    url: "https://www.bowerswilkins.com/en/support/find-a-retailer.html",
    note: "Buscador de distribuidores oficiales. Filtra por país.",
    robotsStatus: "disallowed",
    robotsNote: "robots.txt prohíbe /search, /s/ y varios patrones de query usados por el buscador.",
  },
  {
    id: "mapa-clientes-propio",
    name: "Google My Maps — Clientes (propio)",
    url: "https://www.google.com/maps/d/u/0/edit?hl=es&mid=1pj6t0HuDRU04_EmDrbwARl3Ww3s&ll=38.21375867194699%2C-2.8614176500000212&z=5",
    note: "Mapa propio con clientes ya clasificados por comercial (José/Fran/Víctor). Acceso autorizado por el propietario.",
    robotsStatus: "allowed",
    robotsNote: "Recurso propio del usuario, con acceso explícitamente autorizado — no aplica robots.txt de terceros.",
  },
];
