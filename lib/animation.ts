"use client";

import { useEffect, useState } from "react";

function mouvementReduit(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Compteur animé : la valeur monte de 0 à `cible` en `duree` ms (courbe qui ralentit à la fin).
 * Sans animation si l'utilisateur a demandé moins de mouvement.
 */
export function useCompteur(cible: number, duree = 900): number {
  const [valeur, setValeur] = useState(() => (mouvementReduit() ? cible : 0));
  useEffect(() => {
    if (mouvementReduit()) {
      const id = requestAnimationFrame(() => setValeur(cible));
      return () => cancelAnimationFrame(id);
    }
    let id = 0;
    const debut = performance.now();
    const pas = (t: number) => {
      const p = Math.min(1, (t - debut) / duree);
      setValeur(cible * (1 - (1 - p) ** 3));
      if (p < 1) id = requestAnimationFrame(pas);
    };
    id = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(id);
  }, [cible, duree]);
  return valeur;
}

/** Décalage d'apparition pour la i-ème carte d'une grille. */
export function decalage(i: number, pas = 70): React.CSSProperties {
  return { animationDelay: `${i * pas}ms` };
}
