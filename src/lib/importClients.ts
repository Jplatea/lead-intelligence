import Papa from "papaparse";
import * as XLSX from "xlsx";
import { unzipSync, strFromU8 } from "fflate";
import type { Company, RepId } from "../types";
import { geocodeAddress } from "./geocode";

export interface ImportRow {
  name: string;
  contactName?: string;
  city?: string;
  province?: string;
  country?: string;
  postalCode?: string;
  lat?: number;
  lng?: number;
  email?: string;
  phone?: string;
  type?: string;
}

const FIELD_ALIASES: Record<keyof ImportRow, string[]> = {
  name: ["name", "nombre", "empresa", "company", "nombre empresa", "nombre_empresa"],
  contactName: ["contactname", "contacto", "nombre contacto", "nombre_contacto", "contact name"],
  city: ["city", "ciudad", "localidad"],
  province: ["province", "provincia", "region", "región"],
  country: ["country", "pais", "país"],
  postalCode: ["postalcode", "postal_code", "cp", "codigopostal", "código postal"],
  lat: ["lat", "latitude", "latitud"],
  lng: ["lng", "lon", "long", "longitude", "longitud"],
  email: ["email", "correo", "mail"],
  phone: ["phone", "telefono", "teléfono", "tel"],
  type: ["type", "tipo"],
};

function normalizeKey(k: string) {
  return k.trim().toLowerCase();
}

function mapRow(raw: Record<string, unknown>): ImportRow | null {
  const lower: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) lower[normalizeKey(k)] = v;

  const pick = (field: keyof ImportRow): string | undefined => {
    for (const alias of FIELD_ALIASES[field]) {
      const v = lower[alias];
      if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
    }
    return undefined;
  };

  const name = pick("name");
  if (!name) return null;

  const latStr = pick("lat");
  const lngStr = pick("lng");
  const lat = latStr ? parseFloat(latStr.replace(",", ".")) : undefined;
  const lng = lngStr ? parseFloat(lngStr.replace(",", ".")) : undefined;

  return {
    name,
    contactName: pick("contactName"),
    city: pick("city"),
    province: pick("province"),
    country: pick("country"),
    postalCode: pick("postalCode"),
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
    email: pick("email"),
    phone: pick("phone"),
    type: pick("type"),
  };
}

export function parseCSV(text: string): ImportRow[] {
  const result = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
  return result.data.map(mapRow).filter((r): r is ImportRow => r !== null);
}

export function parseXLSX(buffer: ArrayBuffer): ImportRow[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return json.map(mapRow).filter((r): r is ImportRow => r !== null);
}

export function parseKML(text: string): ImportRow[] {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror")) return [];

  const rows: ImportRow[] = [];
  for (const placemark of Array.from(doc.getElementsByTagName("Placemark"))) {
    const name = placemark.getElementsByTagName("name")[0]?.textContent?.trim();
    const coordText = placemark.getElementsByTagName("coordinates")[0]?.textContent?.trim();
    if (!name || !coordText) continue;
    const [lngStr, latStr] = coordText.split(",");
    const lng = parseFloat(lngStr);
    const lat = parseFloat(latStr);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    rows.push({ name, lat, lng });
  }
  return rows;
}

// KMZ is just a zip archive with a .kml (usually doc.kml) inside it.
export function parseKMZ(buffer: ArrayBuffer): ImportRow[] {
  const files = unzipSync(new Uint8Array(buffer));
  const kmlName = Object.keys(files).find((n) => n.toLowerCase().endsWith(".kml"));
  if (!kmlName) return [];
  return parseKML(strFromU8(files[kmlName]));
}

export type ImportFormat = "csv" | "kml" | "kmz" | "xlsx";

export function detectFormat(filename: string): ImportFormat | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "csv") return "csv";
  if (ext === "kml") return "kml";
  if (ext === "kmz") return "kmz";
  if (ext === "xlsx" || ext === "xls") return "xlsx";
  return null;
}

export interface ImportResult {
  companies: Company[];
  skipped: number;
  geocodeFailed: string[];
}

// Rows that already have lat/lng use them directly; rows with only a
// city/province are geocoded one at a time via free Nominatim, respecting
// its ~1 req/sec usage policy — onProgress lets the UI show "3 / 20".
export async function rowsToCompanies(
  rows: ImportRow[],
  assignedRep: RepId,
  onProgress?: (done: number, total: number) => void
): Promise<ImportResult> {
  const companies: Company[] = [];
  const geocodeFailed: string[] = [];
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let lat = row.lat;
    let lng = row.lng;
    let city = row.city;
    let province = row.province;
    let country = row.country;
    let postalCode = row.postalCode;

    if (lat === undefined || lng === undefined) {
      const query = [row.city, row.province, row.country ?? "España"].filter(Boolean).join(", ");
      if (!query) {
        skipped++;
        onProgress?.(i + 1, rows.length);
        continue;
      }
      try {
        const results = await geocodeAddress(query);
        if (results.length === 0) {
          geocodeFailed.push(row.name);
          onProgress?.(i + 1, rows.length);
          continue;
        }
        lat = results[0].lat;
        lng = results[0].lng;
        city = city ?? results[0].city;
        province = province ?? results[0].province;
        country = country ?? results[0].country;
        postalCode = postalCode ?? results[0].postalCode;
        if (i < rows.length - 1) await new Promise((r) => setTimeout(r, 1100));
      } catch {
        geocodeFailed.push(row.name);
        onProgress?.(i + 1, rows.length);
        continue;
      }
    }

    const needsReview = !row.email || !row.phone || !(province ?? city);

    companies.push({
      id: `import-${Date.now()}-${i}`,
      name: row.name,
      type: row.type ?? "Integrador",
      city: city ?? "",
      province: province ?? city ?? "Sin especificar",
      country: country ?? "España",
      postalCode: postalCode ?? "",
      lat,
      lng,
      contact: {
        contactName: row.contactName,
        email: row.email,
        phone: row.phone,
      },
      brands: [],
      specialties: [],
      assignedRep,
      status: "nuevo",
      alarm: "nunca_contactado",
      importedType: "manual",
      comments: [],
      needsReview,
    });
    onProgress?.(i + 1, rows.length);
  }

  return { companies, skipped, geocodeFailed };
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function findDuplicate(incoming: Company, existing: Company[]): Company | undefined {
  const target = normalizeName(incoming.name);
  return existing.find((c) => normalizeName(c.name) === target);
}

// Scans the whole database for companies sharing a name with another one
// already in it (e.g. imported more than once over time). Groups by
// normalized name; within each group the first record is kept as
// "existing" and every other one pairs against it as "incoming".
export function findAllDuplicateGroups(companies: Company[]): { existing: Company; incoming: Company }[] {
  const groups = new Map<string, Company[]>();
  for (const c of companies) {
    const key = normalizeName(c.name);
    const arr = groups.get(key);
    if (arr) arr.push(c);
    else groups.set(key, [c]);
  }
  const conflicts: { existing: Company; incoming: Company }[] = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const [first, ...rest] = group;
    for (const dup of rest) conflicts.push({ existing: first, incoming: dup });
  }
  return conflicts;
}

// Fills gaps in the existing record from the incoming one rather than
// overwriting anything already there, and unions list fields (brands,
// specialties) — the existing record's own edits are never clobbered.
export function mergeCompanyData(existing: Company, incoming: Company): Partial<Company> {
  const contact = {
    contactName: existing.contact.contactName || incoming.contact.contactName,
    email: existing.contact.email || incoming.contact.email,
    phone: existing.contact.phone || incoming.contact.phone,
  };
  const province = existing.province && existing.province !== "Sin especificar" ? existing.province : incoming.province;
  const city = existing.city || incoming.city;
  const country = existing.country || incoming.country;
  const postalCode = existing.postalCode || incoming.postalCode;
  const brands = Array.from(new Set([...existing.brands, ...incoming.brands]));
  const specialties = Array.from(new Set([...existing.specialties, ...incoming.specialties]));
  const needsReview = !contact.email || !contact.phone || !province || province === "Sin especificar";
  return { city, province, country, postalCode, contact, brands, specialties, needsReview };
}
