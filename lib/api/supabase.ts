import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CLE_ANONYME, SUPABASE_URL } from "@/lib/config";

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_CLE_ANONYME, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "parc-auto:auth" },
      db: { schema: "public" },
    });
  }
  return client;
}
