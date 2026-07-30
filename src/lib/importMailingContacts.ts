import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { MailingContact } from "../types";

interface ContactRow {
  contactName: string;
  email: string;
  companyName: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Always positional: column 1 = contact name, column 2 = email, column 3 =
// company name — the fixed format this list is meant to import, regardless
// of whatever header text (if any) the file uses. A row is only skipped as
// a header row when NONE of its cells look like an email; if the first row
// already contains one, every row is treated as data.
function mapByPosition(rows: unknown[][]): ContactRow[] {
  if (rows.length === 0) return [];
  const firstRowHasEmail = rows[0].some((cell) => EMAIL_RE.test(String(cell ?? "").trim()));
  const dataRows = firstRowHasEmail ? rows : rows.slice(1);

  return dataRows
    .map((row) => ({
      contactName: String(row[0] ?? "").trim(),
      email: String(row[1] ?? "").trim(),
      companyName: String(row[2] ?? "").trim(),
    }))
    .filter((r) => EMAIL_RE.test(r.email));
}

export function parseContactsCSV(text: string): ContactRow[] {
  const result = Papa.parse<unknown[]>(text, { header: false, skipEmptyLines: true });
  return mapByPosition(result.data);
}

export function parseContactsXLSX(buffer: ArrayBuffer): ContactRow[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
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
