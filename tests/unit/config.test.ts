import { afterEach, describe, expect, it, vi } from "vitest";

// La configuration est lue au chargement du module (export statique) : chaque cas recharge le module.
async function charger(env: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return import("@/lib/config");
}

afterEach(() => vi.unstubAllEnvs());

describe("démonstration et serveur", () => {
  it("sans Supabase : seule la démonstration est disponible", async () => {
    const c = await charger({ NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "" });
    expect(c.supabaseConfigure()).toBe(false);
    expect(c.demoDisponible()).toBe(true);
  });

  it("l'exemple de configuration livré ne compte pas comme un vrai projet", async () => {
    const c = await charger({ NEXT_PUBLIC_SUPABASE_URL: "https://xxxxx.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "votre-cle-anon-publique-123456" });
    expect(c.supabaseConfigure()).toBe(false);
  });

  it("chez le client (Supabase configuré) : la démonstration est masquée", async () => {
    const c = await charger({ NEXT_PUBLIC_SUPABASE_URL: "https://abcdefgh.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "a".repeat(40) });
    expect(c.supabaseConfigure()).toBe(true);
    expect(c.demoDisponible()).toBe(false);
  });

  it("un site de présentation peut la garder avec NEXT_PUBLIC_DEMO=1", async () => {
    const c = await charger({ NEXT_PUBLIC_SUPABASE_URL: "https://abcdefgh.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "a".repeat(40), NEXT_PUBLIC_DEMO: "1" });
    expect(c.demoDisponible()).toBe(true);
  });

  it("http (non chiffré) n'est pas accepté comme adresse de serveur", async () => {
    const c = await charger({ NEXT_PUBLIC_SUPABASE_URL: "http://abcdefgh.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "a".repeat(40) });
    expect(c.supabaseConfigure()).toBe(false);
  });
});
