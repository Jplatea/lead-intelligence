import type { RobotsStatus } from "../data/sources";

export interface RobotsCheckResult {
  status: RobotsStatus;
  note: string;
  snippet?: string;
}

// Fetching third-party pages directly from the browser hits CORS on almost
// every real site (browsers block cross-origin reads by default, and
// directory sites like Sonos/Loxone/KNX/Control4 have no reason to opt in
// to it) - the actual robots.txt check + page fetch now happens server-
// side in api/scrape.js, which isn't subject to CORS at all.
export async function checkUrlAndScan(url: string): Promise<RobotsCheckResult> {
  try {
    const res = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
    if (!res.ok) {
      return { status: "unknown", note: `El escaneo falló (${res.status}).` };
    }
    return await res.json();
  } catch {
    return { status: "unknown", note: "No se pudo contactar con el servicio de escaneo." };
  }
}
