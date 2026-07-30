import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { Company } from "../types";
import { REPS, STATUS_CONFIG, ALARM_CONFIG } from "../data/config";

function toRecord(c: Company) {
  return {
    id: c.id,
    nombre: c.name,
    tipo: c.type,
    ciudad: c.city,
    provincia: c.province,
    pais: c.country,
    codigo_postal: c.postalCode,
    lat: c.lat,
    lng: c.lng,
    email: c.contact.email ?? "",
    telefono: c.contact.phone ?? "",
    marcas: c.brands.join("; "),
    especialidades: c.specialties.join("; "),
    comercial: REPS[c.assignedRep].name,
    estado: STATUS_CONFIG[c.status].label,
    alarma: ALARM_CONFIG[c.alarm].label,
    revisar: c.needsReview ? "sí" : "no",
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
