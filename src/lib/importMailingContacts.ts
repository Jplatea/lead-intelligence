import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { MailingContact } from "../types";

interface ContactRow {
  contactName: string;
  email: string;
  companyName: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FIELD_ALIASES: Record<keyof ContactRow, string[]> = {
  contactName: ["nombre contacto", "contacto", "nombre", "name", "contact", "contactname", "contact name"],
  email: ["email", "correo", "mail", "e-mail"],
  companyName: ["nombre empresa", "empresa", "company", "compañia", "compañía", "company name", "nombre_empresa"],
};

function normalizeKey(k: string) {
  return k.trim().toLowerCase();
}

// Header-name matching — used only when the sheet's headers actually
// resemble one of our known aliases (in any column order).
function mapByHeader(raw: Record<string, unknown>): ContactRow | null {
  const lower: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) lower[normalizeKey(k)] = v;

  const pick = (field: keyof ContactRow): string => {
    for (const alias of FIELD_ALIASES[field]) {
      const v = lower[alias];
      if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
    }
    return "";
  };

  const email = pick("email");
  if (!email) return null;
  return { contactName: pick("contactName"), email, companyName: pick("companyName") };
}

function hasKnownHeaders(headerRow: unknown[]): boolean {
  const keys = headerRow.map((h) => normalizeKey(String(h ?? "")));
  return Object.values(FIELD_ALIASES).some((aliases) => aliases.some((alias) => keys.includes(alias)));
}

// Positional fallback — the format most contact exports actually come in:
// column 1 = contact name, column 2 = email, column 3 = company name, no
// (or unrecognized) headers. The first row is treated as a header and
// skipped only when its own second column isn't itself a valid email.
function mapByPosition(rows: unknown[][]): ContactRow[] {
  if (rows.length === 0) return [];
  const firstRowLooksLikeHeader = !EMAIL_RE.test(String(rows[0]?.[1] ?? "").trim());
  const dataRows = firstRowLooksLikeHeader ? rows.slice(1) : rows;

  return dataRows
    .map((row) => ({
      contactName: String(row[0] ?? "").trim(),
      email: String(row[1] ?? "").trim(),
      companyName: String(row[2] ?? "").trim(),
    }))
    .filter((r) => EMAIL_RE.test(r.email));
}

export function parseContactsCSV(text: string): ContactRow[] {
  const headerResult = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
  const headerRow = headerResult.meta.fields ?? [];
  if (hasKnownHeaders(headerRow)) {
    return headerResult.data.map(mapByHeader).filter((r): r is ContactRow => r !== null);
  }

  const rawResult = Papa.parse<unknown[]>(text, { header: false, skipEmptyLines: true });
  return mapByPosition(rawResult.data);
}

export function parseContactsXLSX(buffer: ArrayBuffer): ContactRow[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  if (rows.length > 0 && hasKnownHeaders(rows[0])) {
    const objects = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    return objects.map(mapByHeader).filter((r): r is ContactRow => r !== null);
  }

  return mapByPosition(rows);
}

export interface ContactImportResult {
  contacts: MailingContact[];
  skipped: number;
  duplicates: number;
}

// Rows without an email are dropped outright (email is the one field this
// list exists to collect); rows repeating an email already in `existing` or
// earlier in the same file are skipped rather than creating a duplicate.
export function rowsToMailingContacts(rows: ContactRow[], existing: MailingContact[]): ContactImportResult {
  const seen = new Set(existing.map((c) => c.email.toLowerCase()));
  const contacts: MailingContact[] = [];
  let duplicates = 0;

  rows.forEach((row, i) => {
    const key = row.email.toLowerCase();
    if (seen.has(key)) {
      duplicates++;
      return;
    }
    seen.add(key);
    contacts.push({
      id: `mailing-contact-${Date.now()}-${i}`,
      contactName: row.contactName,
      email: row.email,
      companyName: row.companyName,
    });
  });

  return { contacts, skipped: 0, duplicates };
}
