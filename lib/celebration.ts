"use client";

export type TypeCelebration = "vente" | "encaissement" | "solde" | "etape" | "vehicule" | "simple";

export interface Celebration {
  type: TypeCelebration;
  titre: string;
  detail?: string;
  /** Pour une étape : couleur de l'étape atteinte. */
  couleur?: string;
}

const EVENEMENT = "parc-auto:celebrer";

/** Déclenche l'animation de réussite (voir components/coque/effets.tsx). Sans effet côté serveur. */
export function celebrer(c: Celebration) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<Celebration>(EVENEMENT, { detail: c }));
}

export function ecouterCelebrations(rappel: (c: Celebration) => void): () => void {
  const f = (e: Event) => rappel((e as CustomEvent<Celebration>).detail);
  window.addEventListener(EVENEMENT, f);
  return () => window.removeEventListener(EVENEMENT, f);
}
