import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

// Real secrets (access tokens) - server-side only env vars, never VITE_-
// prefixed, so they never reach the browser bundle. Add WHATSAPP_<REP>_TOKEN
// + WHATSAPP_<REP>_PHONE_ID here when a new rep's number is ready.
const REP_CREDENTIALS = {
  jose: { token: process.env.WHATSAPP_JOSE_TOKEN, phoneId: process.env.WHATSAPP_JOSE_PHONE_ID },
  fran: { token: process.env.WHATSAPP_FRAN_TOKEN, phoneId: process.env.WHATSAPP_FRAN_PHONE_ID },
  victor: { token: process.env.WHATSAPP_VICTOR_TOKEN, phoneId: process.env.WHATSAPP_VICTOR_PHONE_ID },
};

// Sends a free-form text reply (only valid within Meta's 24h service window
// after the contact's last message - this app never sends paid template/
// marketing messages) and logs it to the same whatsapp_messages table the
// webhook writes inbound messages to, so a company's thread is complete
// regardless of which direction each message went.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  const { repId, to, body } = req.body ?? {};
  const creds = REP_CREDENTIALS[repId];
  if (!creds?.token || !creds?.phoneId) {
    res.status(400).json({ error: "Este comercial no tiene WhatsApp configurado todavía." });
    return;
  }
  if (!to || !body) {
    res.status(400).json({ error: "Falta el destinatario o el mensaje." });
    return;
  }

  try {
    const metaRes = await fetch(`https://graph.facebook.com/v21.0/${creds.phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    });
    const data = await metaRes.json();
    if (!metaRes.ok) {
      res.status(502).json({ error: data?.error?.message || "Error al enviar el mensaje de WhatsApp." });
      return;
    }

    const wamid = data.messages?.[0]?.id;
    const { error } = await supabase.from("whatsapp_messages").insert({
      id: wamid || `local-${Date.now()}`,
      rep_id: repId,
      wa_id: to,
      contact_name: null,
      direction: "outbound",
      body,
      wamid: wamid ?? null,
    });
    if (error) console.error("whatsapp-send: supabase insert failed", error);

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error desconocido." });
  }
}
