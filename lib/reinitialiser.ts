import { useState } from "react";

/**
 * Rejoue `initialiser` au premier rendu puis chaque fois qu'une des valeurs de `declencheurs` change (ouverture
 * d'une feuille, arrivée des réglages, valeur modifiée de l'extérieur…). C'est la forme que React recommande pour
 * « réinitialiser un état quand une prop change » : l'ajustement se fait pendant le rendu, sans effet et sans
 * second affichage visible.
 */
export function useAuChangement(declencheurs: readonly unknown[], initialiser: () => void): void {
  const [precedents, setPrecedents] = useState<readonly unknown[] | null>(null);
  const change = precedents === null || precedents.length !== declencheurs.length || precedents.some((d, i) => !Object.is(d, declencheurs[i]));
  if (change) {
    setPrecedents(declencheurs);
    initialiser();
  }
}
