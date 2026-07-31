// Client-side Outlook/Microsoft 365 integration: reads (read-only) the most
// recent emails exchanged with a given contact address via MSAL.js (loaded
// from Microsoft's CDN, no bundler dependency — mirrors how gmail.ts loads
// Google's Identity Services) + the Microsoft Graph REST API, directly from
// the browser. No backend involved — the access token is kept in memory
// only for this tab's session and is never persisted.
const MSAL_SRC = "https://alcdn.msauth.net/browser/3.7.1/js/msal-browser.min.js";
const CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID as string | undefined;
const SCOPES = ["Mail.Read"];

interface MsalAccount {
  username: string;
}

interface MsalAuthResult {
  accessToken: string;
  account: MsalAccount;
}

interface MsalPublicClientApplication {
  initialize: () => Promise<void>;
  getAllAccounts: () => MsalAccount[];
  acquireTokenSilent: (req: { scopes: string[]; account: MsalAccount }) => Promise<MsalAuthResult>;
  loginPopup: (req: { scopes: string[] }) => Promise<MsalAuthResult>;
}

declare global {
  interface Window {
    msal?: {
      PublicClientApplication: new (config: {
        auth: { clientId: string; authority: string };
      }) => MsalPublicClientApplication;
    };
  }
}

let msalLoaded: Promise<void> | null = null;
function loadMsal(): Promise<void> {
  if (msalLoaded) return msalLoaded;
  msalLoaded = new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${MSAL_SRC}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = MSAL_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar la librería de Microsoft (MSAL)."));
    document.head.appendChild(script);
  });
  return msalLoaded;
}

let pca: MsalPublicClientApplication | null = null;
async function getPca(): Promise<MsalPublicClientApplication> {
  if (pca) return pca;
  if (!CLIENT_ID) throw new Error("Falta configurar VITE_MICROSOFT_CLIENT_ID para conectar Outlook.");
  await loadMsal();
  if (!window.msal) throw new Error("La librería de Microsoft (MSAL) no está disponible.");
  pca = new window.msal.PublicClientApplication({
    auth: { clientId: CLIENT_ID, authority: "https://login.microsoftonline.com/common" },
  });
  await pca.initialize();
  return pca;
}

export function isOutlookConfigured(): boolean {
  return !!CLIENT_ID;
}

// Fire-and-forget: loads MSAL and constructs+initializes the
// PublicClientApplication as soon as the Comunicación card mounts, well
// before the user clicks "Conectar Outlook". Popup blockers only allow
// window.open() reliably when it's called with minimal delay after the
// user gesture — doing the script fetch + MSAL init ahead of time means
// the click handler's loginPopup() call isn't stuck waiting on a network
// round trip first.
export function preloadOutlook(): void {
  if (CLIENT_ID) void getPca();
}

let cachedToken: { value: string; account: MsalAccount } | null = null;

export async function requestOutlookAccessToken(): Promise<string> {
  const client = await getPca();
  if (cachedToken) return cachedToken.value;

  const accounts = client.getAllAccounts();
  if (accounts.length > 0) {
    try {
      const result = await client.acquireTokenSilent({ scopes: SCOPES, account: accounts[0] });
      cachedToken = { value: result.accessToken, account: result.account };
      return result.accessToken;
    } catch {
      // Falls through to an interactive popup below.
    }
  }

  const result = await client.loginPopup({ scopes: SCOPES });
  cachedToken = { value: result.accessToken, account: result.account };
  return result.accessToken;
}

export interface OutlookMessage {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

interface GraphMessage {
  id: string;
  subject?: string;
  from?: { emailAddress?: { name?: string; address?: string } };
  receivedDateTime?: string;
  bodyPreview?: string;
}

// Approximate equivalent of Gmail's "from OR to" search — Graph's $search
// scans subject/sender/recipients/body for the query string, which is close
// enough for "recent emails involving this contact" without needing a more
// elaborate $filter with lambda operators over toRecipients.
export async function fetchRecentEmails(accessToken: string, contactEmail: string, limit = 10): Promise<OutlookMessage[]> {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages?$search="${contactEmail}"&$top=${limit}`,
    { headers: { Authorization: `Bearer ${accessToken}`, ConsistencyLevel: "eventual" } }
  );
  if (!res.ok) throw new Error(`Microsoft Graph: error ${res.status}`);
  const data: { value?: GraphMessage[] } = await res.json();

  return (data.value || []).map((m) => ({
    id: m.id,
    subject: m.subject || "(sin asunto)",
    from: m.from?.emailAddress?.address || m.from?.emailAddress?.name || "",
    date: m.receivedDateTime || "",
    snippet: m.bodyPreview || "",
  }));
}
