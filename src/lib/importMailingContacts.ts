import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { MailingContact } from "../types";

interface ContactRow {
  contactName: string;
  email: string;
  companyName: string;
}

const FIELD_ALIASES: Record<keyof ContactRow, string[]> = {
  contactName: ["nombre contacto", "contacto", "nombre", "name", "contact", "contactname", "contact name"],
  email: ["email", "correo", "mail", "e-mail"],
  companyName: ["nombre empresa", "empresa", "company", "compañia", "compañía", "company name", "nombre_empresa"],
};

function normalizeKey(k: string) {
  return k.trim().toLowerCase();
}

function mapRow(raw: Record<string, unknown>): ContactRow | null {
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

export function parseContactsCSV(text: string): ContactRow[] {
  const result = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
  return result.data.map(mapRow).filter((r): r is ContactRow => r !== null);
}

export function parseContactsXLSX(buffer: ArrayBuffer): ContactRow[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return json.map(mapRow).filter((r): r is ContactRow => r !== null);
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
