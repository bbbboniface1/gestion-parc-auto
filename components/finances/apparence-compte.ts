import { Bank, DeviceMobile, Money, type Icon } from "@phosphor-icons/react";
import type { Compte } from "@/lib/api/types-metier";

/**
 * Apparence d'un compte : la couleur de l'opérateur quand on la reconnaît (Orange Money, Wave, Moov), unie.
 * Partagée par l'onglet Trésorerie et la feuille « Vos comptes » : un compte a la même couleur partout.
 * Elle ne colore que la tuile d'icône ; la carte du compte reste neutre (second plan calme).
 *
 * Banque et caisse ont des jetons qui existent dans les deux thèmes avec un écart net à la surface (≥ 3:1) :
 *  - banque : `acier` (bleu franc en clair, bleu clair en sombre) — `nuit-2` se confondait avec le fond en sombre ;
 *  - caisse : `encre-2`, neutre — le vert voulait déjà dire « entrée d'argent » sur le même écran.
 * L'icône prend alors la couleur `surface` : blanche en clair, bleu nuit en sombre, lisible dans les deux cas.
 */
export function apparenceCompte(c: Pick<Compte, "nom" | "type">): { fond: string; texte: string; icone: Icon } {
  const n = c.nom.toLowerCase();
  if (n.includes("orange")) return { fond: "var(--marque-orange-money)", texte: "var(--nuit)", icone: DeviceMobile };
  if (n.includes("wave")) return { fond: "var(--marque-wave)", texte: "var(--nuit)", icone: DeviceMobile };
  if (n.includes("moov")) return { fond: "var(--marque-moov)", texte: "white", icone: DeviceMobile };
  if (c.type === "mobile_money") return { fond: "var(--primaire-plein)", texte: "white", icone: DeviceMobile };
  if (c.type === "banque") return { fond: "var(--acier)", texte: "var(--surface)", icone: Bank };
  return { fond: "var(--encre-2)", texte: "var(--surface)", icone: Money };
}
