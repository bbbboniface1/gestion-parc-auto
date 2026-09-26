// Configuration publique, lue au moment du build (export statique).

export const NOM_PRODUIT = "Parc Auto";
export const VERSION = "2.0.0";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_CLE_ANONYME = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Vrai si un projet Supabase est configuré : sinon, seule la démonstration est disponible. */
export function supabaseConfigure(): boolean {
  return /^https:\/\/.+/.test(SUPABASE_URL) && SUPABASE_CLE_ANONYME.length > 20 && !SUPABASE_URL.includes("xxxxx");
}

/**
 * La démonstration n'est offerte que sans serveur configuré (aperçu local) ou si NEXT_PUBLIC_DEMO=1 (site de
 * présentation). Chez le client, une fois Supabase configuré, elle est masquée : ses utilisateurs n'y accèdent pas.
 */
export function demoDisponible(): boolean {
  return !supabaseConfigure() || process.env.NEXT_PUBLIC_DEMO === "1";
}
