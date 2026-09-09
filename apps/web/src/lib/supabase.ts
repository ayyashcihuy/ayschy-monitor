import { createClient } from "@supabase/supabase-js";

// Vite exposes VITE_-prefixed env vars via import.meta.env.
// The web app only ever uses the anon key — it reads Supabase directly
// (+ realtime subscription) and never performs the checks itself; only the
// checker (service-role key) and the local agent write check results.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set yet — see apps/web/.env.example",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
