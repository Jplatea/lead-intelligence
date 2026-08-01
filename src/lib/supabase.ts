import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function isSupabaseConfigured(): boolean {
  return !!url && !!anonKey;
}

// Only construct the client when both env vars are present - createClient
// throws immediately on a missing/empty URL, which would otherwise crash
// the whole app at import time in an environment that hasn't set these yet.
export const supabase = isSupabaseConfigured() ? createClient(url!, anonKey!) : null;
