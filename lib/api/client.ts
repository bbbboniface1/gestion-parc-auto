// Point d'entrée unique vers les données : l'interface appelle `rpc("vehicules_lister", {...})`
// sans savoir si la réponse vient de Supabase ou de la démonstration locale.

import { supabaseConfigure } from "@/lib/config";
import { versErreurApi } from "./erreurs";

export type Mode = "supabase" | "demo";
const CLE_MODE = "parc-auto:mode";

export function modeActuel(): Mode {
  if (typeof window === "undefined") return supabaseConfigure() ? "supabase" : "demo";
  if (!supabaseConfigure()) return "demo";
  return localStorage.getItem(CLE_MODE) === "demo" ? "demo" : "supabase";
}

export function choisirMode(mode: Mode) {
  if (mode === "demo") localStorage.setItem(CLE_MODE, "demo");
  else localStorage.removeItem(CLE_MODE);
}

export async function rpc<T>(fonction: string, params: Record<string, unknown> = {}): Promise<T> {
  try {
    if (modeActuel() === "demo") {
      const { rpcDemo } = await import("@/lib/demo/moteur");
      return await rpcDemo<T>(fonction, params);
    }
    const { supabase } = await import("./supabase");
    const { data, error } = await supabase().rpc(fonction, params);
    if (error) throw error;
    return data as T;
  } catch (erreur) {
    throw versErreurApi(erreur);
  }
}
