import { supabase } from "./supabase";
import type { RepId, WhatsAppMessage } from "../types";

// Which reps currently have a WhatsApp number connected - update this (and
// the matching WHATSAPP_<REP>_TOKEN/PHONE_ID env vars in Vercel + the
// PHONE_ID_TO_REP map in api/whatsapp-webhook.js) as Fran/Victor connect
// theirs. A rep not in this set just sees "not connected yet" in the UI.
export const CONNECTED_REPS: RepId[] = ["jose"];

export function isWhatsAppConnected(repId: RepId): boolean {
  return CONNECTED_REPS.includes(repId);
}

// WhatsApp identifies contacts by a plain digit string (country code +
// number, no "+" or spaces) - company phone numbers are usually stored
// human-readable with a country code ("+34 91 555 22 11"), but some records
// only have the local 9-digit number - country tells us which prefix to add
// in that case (Spain 34, Portugal 351).
export function normalizePhoneToWaId(phone: string | undefined | null, country?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) return digits;
  if (digits.length === 9) {
    const prefix = country === "Portugal" ? "351" : "34";
    return `${prefix}${digits}`;
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToMessage(row: any): WhatsAppMessage {
  return {
    id: row.id,
    repId: row.rep_id,
    waId: row.wa_id,
    contactName: row.contact_name ?? undefined,
    direction: row.direction,
    body: row.body,
    createdAt: row.created_at,
  };
}

export async function fetchWhatsAppMessages(waId: string, repId: RepId): Promise<WhatsAppMessage[]> {
  const { data, error } = await supabase!
    .from("whatsapp_messages")
    .select("*")
    .eq("wa_id", waId)
    .eq("rep_id", repId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToMessage);
}

export async function sendWhatsAppMessage(repId: RepId, to: string, body: string): Promise<void> {
  const res = await fetch("/api/whatsapp-send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repId, to, body }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || `El envío falló (${res.status}).`);
  }
}
