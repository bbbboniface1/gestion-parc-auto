import { createBrowserClient } from "@supabase/ssr";
import { createDemoClient } from "@/lib/demo/mock-client";
import { isDemoMode } from "@/lib/demo";

let client: ReturnType<typeof createBrowserClient> | ReturnType<typeof createDemoClient> | undefined;

export function createClient() {
  if (!client) {
    client = isDemoMode()
      ? createDemoClient()
      : createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
  }
  return client as ReturnType<typeof createBrowserClient>;
}
