// Talks to the optional local Outlook agent (local-agent/outlook_agent.py)
// that a rep can run on their own PC to read their desktop Outlook via COM
// automation — a fallback while the real Microsoft Graph integration is
// blocked on tenant admin consent. Read-only, and only reachable from this
// same machine (the agent binds to 127.0.0.1).
const AGENT_URL = "http://127.0.0.1:5787";

export interface LocalAgentMessage {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

export async function fetchRecentEmailsViaAgent(contactEmail: string, limit = 10): Promise<LocalAgentMessage[]> {
  let res: Response;
  try {
    res = await fetch(`${AGENT_URL}/emails?email=${encodeURIComponent(contactEmail)}&limit=${limit}`);
  } catch {
    throw new Error(
      "No se pudo conectar con el agente local. ¿Está el script outlook_agent.py ejecutándose en este ordenador?"
    );
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `El agente local respondió con un error (${res.status}).`);
  }
  return res.json();
}
