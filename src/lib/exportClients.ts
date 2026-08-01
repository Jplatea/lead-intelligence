import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { Company, MailingContact } from "../types";
import { REPS, STATUS_CONFIG, ALARM_CONFIG } from "../data/config";

// Column order/naming matches exportMailingContacts's toMailingRecord below
// on purpose (Nombre Empresa, Nombre Contacto, Mail first) - lets the two
// exports be compared side by side (find_recent_emails/matchMailing-style
// cross-checks) without hunting for differently-named equivalent columns.
function toRecord(c: Company) {
  return {
    nombre_empresa: c.name,
    nombre_contacto: c.contact.contactName ?? "",
    mail: c.contact.email ?? "",
    tipo: c.type,
    ciudad: c.city,
    provincia: c.province,
    pais: c.country,
    codigo_postal: c.postalCode,
    lat: c.lat,
    lng: c.lng,
    telefono: c.contact.phone ?? "",
    marcas: c.brands.join("; "),
    especialidades: c.specialties.join("; "),
    comercial: REPS[c.assignedRep].name,
    estado: STATUS_CONFIG[c.status].label,
    alarma: ALARM_CONFIG[c.alarm].label,
    revisar: c.needsReview ? "sí" : "no",
    id: c.id,
  };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCompaniesCSV(companies: Company[]) {
  const csv = Papa.unparse(companies.map(toRecord));
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "clientes.csv");
}

export function exportCompaniesXLSX(companies: Company[]) {
  const sheet = XLSX.utils.json_to_sheet(companies.map(toRecord));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Clientes");
  const buffer = XLSX.write(book, { type: "array", bookType: "xlsx" });
  downloadBlob(new Blob([buffer], { type: "application/octet-stream" }), "clientes.xlsx");
}

// Column order matters here (unlike toRecord's above): the mailing import
// (importMailingContacts.ts) reads this file back positionally — column 1
// = company name, 2 = contact name, 3 = email — regardless of header text,
// matching toRecord's Nombre Empresa/Nombre Contacto/Mail order above so
// the two exports compare column-for-column. `id` has to stay out of
// those first three slots or a re-imported backup silently misreads every
// row.
function toMailingRecord(c: MailingContact) {
  return {
    nombre_empresa: c.companyName,
    nombre_contacto: c.contactName,
    mail: c.email,
    id: c.id,
  };
}

export function exportMailingContactsCSV(contacts: MailingContact[]) {
  const csv = Papa.unparse(contacts.map(toMailingRecord));
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "newsletter.csv");
}

export function exportMailingContactsXLSX(contacts: MailingContact[]) {
  const sheet = XLSX.utils.json_to_sheet(contacts.map(toMailingRecord));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Newsletter");
  const buffer = XLSX.write(book, { type: "array", bookType: "xlsx" });
  downloadBlob(new Blob([buffer], { type: "application/octet-stream" }), "newsletter.xlsx");
}
