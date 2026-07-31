// Client-side Gmail integration: reads (read-only) the most recent emails
// exchanged with a given contact address via Google's Identity Services
// (GIS) OAuth token flow + the Gmail REST API directly from the browser —
// no backend involved. The access token is kept in memory only for this
// tab's session and is never persisted to storage.
const GIS_SRC = "https://accounts.google.com/gsi/client";
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token: string; expires_in: number; error?: string }) => void;
            error_callback?: (err: { message?: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

let gisLoaded: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if (gisLoaded) return gisLoaded;
  gisLoaded = new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${GIS_SRC}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar Google Identity Services."));
    document.head.appendChild(script);
  });
  return gisLoaded;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

export function isGmailConfigured(): boolean {
  return !!CLIENT_ID;
}

export async function requestGmailAccessToken(): Promise<string> {
  if (!CLIENT_ID) {
    throw new Error("Falta configurar VITE_GOOGLE_CLIENT_ID para conectar Gmail.");
  }
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  await loadGis();
  const google = window.google;
  if (!google) throw new Error("Google Identity Services no está disponible.");

  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        cachedToken = { value: response.access_token, expiresAt: Date.now() + (response.expires_in - 60) * 1000 };
        resolve(response.access_token);
      },
      error_callback: (err) => reject(new Error(err?.message || "Autorización de Gmail cancelada.")),
    });
    client.requestAccessToken();
  });
}

export interface GmailMessage {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

interface GmailHeader {
  name: string;
  value: string;
}

// Searches messages sent to or received from the contact's email and
// returns the `limit` most recent ones with just enough metadata (subject/
// from/date/snippet) to list them — never the full message body.
export async function fetchRecentEmails(accessToken: string, contactEmail: string, limit = 10): Promise<GmailMessage[]> {
  const q = encodeURIComponent(`from:${contactEmail} OR to:${contactEmail}`);
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=${limit}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!listRes.ok) throw new Error(`Gmail API: error ${listRes.status}`);
  const listData: { messages?: { id: string }[] } = await listRes.json();
  const ids = (listData.messages || []).map((m) => m.id);

  const messages = await Promise.all(
    ids.map(async (id): Promise<GmailMessage> => {
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data: { snippet?: string; payload?: { headers?: GmailHeader[] } } = await res.json();
      const headers = data.payload?.headers || [];
      const get = (name: string) => headers.find((h) => h.name === name)?.value || "";
      return {
        id,
        subject: get("Subject") || "(sin asunto)",
        from: get("From"),
        date: get("Date"),
        snippet: data.snippet || "",
      };
    })
  );

  return messages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
