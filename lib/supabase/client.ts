import { createBrowserClient } from "@supabase/ssr";
import { createDemoClient } from "@/lib/demo/mock-client";
import { isDemoMode } from "@/lib/demo";

export function createClient() {
  // Vérifier aussi l'absence de variables Supabase (pas seulement localStorage)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const noSupabase = !url || url.includes("placeholder") || !key || key.includes("placeholder");

  if (isDemoMode() || noSupabase) {
    return createDemoClient() as unknown as ReturnType<typeof createBrowserClient>;
  }

  return createBrowserClient(url, key);
}
