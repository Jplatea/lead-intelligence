import type { RepId } from "../types";
import { REPS } from "../data/config";

export interface RepCredential {
  repId: RepId;
  label: string;
  password: string;
  email: string;
}

// Vault-style login: cycle a dial between the 3 reps, then type the
// password. This is a soft access gate for a small internal tool with no
// backend — NOT real authentication (see LoginPage.tsx note).
export const REP_CREDENTIALS: RepCredential[] = [
  { repId: "jose", label: REPS.jose.name, password: "Jose12345#", email: "jplaza@legroupeprestige.es" },
  { repId: "victor", label: REPS.victor.name, password: "Victor12345#", email: "vteruel@legroupeprestige.es" },
  { repId: "fran", label: REPS.fran.name, password: "Fran12345#", email: "frojas@legroupeprestige.es" },
];

const SESSION_KEY = "lead-intelligence:session";

export function authenticate(repId: RepId, password: string): RepId | null {
  const match = REP_CREDENTIALS.find((r) => r.repId === repId && r.password === password);
  return match ? match.repId : null;
}

export function loadSession(): RepId | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as RepId) : null;
  } catch {
    return null;
  }
}

export function saveSession(repId: RepId) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(repId));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
