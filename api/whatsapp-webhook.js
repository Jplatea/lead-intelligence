import { createClient } from "@supabase/supabase-js";

// Server-side only - Vercel exposes every env var (VITE_-prefixed or not) to
// serverless functions at runtime; only the Vite build step is what limits
// client-bundle exposure to VITE_-prefixed vars. Reusing the same Supabase
// project/anon key the frontend already uses (RLS already allows this).
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

// One Meta App/WABA hosts every rep's phone number - this webhook URL is
// shared, and each inbound payload's metadata.phone_number_id says which
// rep's number it arrived on. Add a new WHATSAPP_<REP>_PHONE_ID env var here
// (and its matching entry in whatsapp-send.js) when a new rep connects,
// no other code change needed.
const PHONE_ID_TO_REP = {
  [process.env.WHATSAPP_JOSE_PHONE_ID]: "jose",
  [process.env.WHATSAPP_FRAN_PHONE_ID]: "fran",
  [process.env.WHATSAPP_VICTOR_PHONE_ID]: "victor",
};

export default async function handler(req, res) {
  // Meta's one-time webhook verification handshake when the URL is
  // registered in the app dashboard.
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      res.status(200).send(challenge);
      return;
    }
    res.status(403).end();
    return;
  }

  if (req.method === "POST") {
    // Always answer 200 quickly regardless of internal outcome - Meta
    // retries (and can eventually disable) a webhook that doesn't ack fast.
    try {
      const body = req.body ?? {};
      const rows = [];
      for (const entry of body.entry ?? []) {
        for (const change of entry.changes ?? []) {
          const value = change.value ?? {};
          const repId = PHONE_ID_TO_REP[value.metadata?.phone_number_id];
          if (!repId) continue;
          for (const m of value.messages ?? []) {
            if (m.type !== "text") continue;
            const contact = (value.contacts ?? []).find((c) => c.wa_id === m.from);
            rows.push({
              id: m.id,
              rep_id: repId,
              wa_id: m.from,
              contact_name: contact?.profile?.name ?? null,
              direction: "inbound",
              body: m.text?.body ?? "",
              wamid: m.id,
              created_at: new Date(Number(m.timestamp) * 1000).toISOString(),
            });
          }
        }
      }
      if (rows.length > 0) {
        const { error } = await supabase.from("whatsapp_messages").upsert(rows, { onConflict: "id" });
        if (error) console.error("whatsapp webhook: supabase upsert failed", error);
      }
    } catch (e) {
      console.error("whatsapp webhook error", e);
    }
    res.status(200).end();
    return;
  }

  res.status(405).end();
}
