import { supabase } from "./supabase";
import type { Company, MailingContact } from "../types";

// Maps between this app's camelCase Company/MailingContact shapes and the
// snake_case columns in supabase/schema.sql. Kept in one place so the two
// never drift silently out of sync with each other.

function companyToRow(c: Company) {
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    city: c.city,
    province: c.province,
    country: c.country,
    postal_code: c.postalCode,
    address: c.address ?? null,
    lat: c.lat,
    lng: c.lng,
    contact_name: c.contact.contactName ?? null,
    email: c.contact.email ?? null,
    phone: c.contact.phone ?? null,
    brands: c.brands,
    specialties: c.specialties,
    assigned_rep: c.assignedRep,
    status: c.status,
    alarm: c.alarm,
    imported_type: c.importedType,
    comments: c.comments,
    ai_summary: c.aiSummary ?? null,
    ai_recommendation: c.aiRecommendation ?? null,
    connected_to: c.connectedTo ?? null,
    needs_review: c.needsReview ?? false,
  };
}

// Only maps the fields actually present in a partial patch, so a small edit
// (e.g. just `{ name }`) doesn't overwrite every other column with null.
function partialCompanyToRow(patch: Partial<Company>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if ("name" in patch) row.name = patch.name;
  if ("type" in patch) row.type = patch.type;
  if ("city" in patch) row.city = patch.city;
  if ("province" in patch) row.province = patch.province;
  if ("country" in patch) row.country = patch.country;
  if ("postalCode" in patch) row.postal_code = patch.postalCode;
  if ("address" in patch) row.address = patch.address ?? null;
  if ("lat" in patch) row.lat = patch.lat;
  if ("lng" in patch) row.lng = patch.lng;
  if (patch.contact) {
    if ("contactName" in patch.contact) row.contact_name = patch.contact.contactName ?? null;
    if ("email" in patch.contact) row.email = patch.contact.email ?? null;
    if ("phone" in patch.contact) row.phone = patch.contact.phone ?? null;
  }
  if ("brands" in patch) row.brands = patch.brands;
  if ("specialties" in patch) row.specialties = patch.specialties;
  if ("assignedRep" in patch) row.assigned_rep = patch.assignedRep;
  if ("status" in patch) row.status = patch.status;
  if ("alarm" in patch) row.alarm = patch.alarm;
  if ("importedType" in patch) row.imported_type = patch.importedType;
  if ("comments" in patch) row.comments = patch.comments;
  if ("aiSummary" in patch) row.ai_summary = patch.aiSummary ?? null;
  if ("aiRecommendation" in patch) row.ai_recommendation = patch.aiRecommendation ?? null;
  if ("connectedTo" in patch) row.connected_to = patch.connectedTo ?? null;
  if ("needsReview" in patch) row.needs_review = patch.needsReview ?? false;
  return row;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToCompany(row: any): Company {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    city: row.city,
    province: row.province,
    country: row.country,
    postalCode: row.postal_code,
    address: row.address ?? undefined,
    lat: row.lat,
    lng: row.lng,
    contact: {
      contactName: row.contact_name ?? undefined,
      email: row.email ?? undefined,
      phone: row.phone ?? undefined,
    },
    brands: row.brands ?? [],
    specialties: row.specialties ?? [],
    assignedRep: row.assigned_rep,
    status: row.status,
    alarm: row.alarm,
    importedType: row.imported_type,
    comments: row.comments ?? [],
    aiSummary: row.ai_summary ?? undefined,
    aiRecommendation: row.ai_recommendation ?? undefined,
    connectedTo: row.connected_to ?? undefined,
    needsReview: row.needs_review ?? false,
  };
}

function contactToRow(c: MailingContact) {
  return { id: c.id, contact_name: c.contactName, email: c.email, company_name: c.companyName };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToContact(row: any): MailingContact {
  return { id: row.id, contactName: row.contact_name, email: row.email, companyName: row.company_name };
}

export async function fetchCompanies(): Promise<Company[]> {
  const { data, error } = await supabase!.from("companies").select("*");
  if (error) throw error;
  return (data ?? []).map(rowToCompany);
}

export async function fetchMailingContacts(): Promise<MailingContact[]> {
  const { data, error } = await supabase!.from("mailing_contacts").select("*");
  if (error) throw error;
  return (data ?? []).map(rowToContact);
}

export async function insertCompanies(companies: Company[]): Promise<void> {
  if (companies.length === 0) return;
  const { error } = await supabase!.from("companies").insert(companies.map(companyToRow));
  if (error) throw error;
}

export async function updateCompanyRow(id: string, patch: Partial<Company>): Promise<void> {
  const { error } = await supabase!.from("companies").update(partialCompanyToRow(patch)).eq("id", id);
  if (error) throw error;
}

export async function deleteCompanyRow(id: string): Promise<void> {
  const { error } = await supabase!.from("companies").delete().eq("id", id);
  if (error) throw error;
}

export async function insertMailingContacts(contacts: MailingContact[]): Promise<void> {
  if (contacts.length === 0) return;
  const { error } = await supabase!.from("mailing_contacts").insert(contacts.map(contactToRow));
  if (error) throw error;
}

export async function updateMailingContactRow(id: string, patch: Partial<MailingContact>): Promise<void> {
  const row: Record<string, unknown> = {};
  if ("contactName" in patch) row.contact_name = patch.contactName;
  if ("email" in patch) row.email = patch.email;
  if ("companyName" in patch) row.company_name = patch.companyName;
  const { error } = await supabase!.from("mailing_contacts").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteMailingContactRow(id: string): Promise<void> {
  const { error } = await supabase!.from("mailing_contacts").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteMailingContactRows(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase!.from("mailing_contacts").delete().in("id", ids);
  if (error) throw error;
}
