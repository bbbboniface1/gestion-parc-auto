import { Bank, DeviceMobile, Money, type Icon } from "@phosphor-icons/react";
import type { Compte } from "@/lib/api/types-metier";

/**
 * Apparence d'un compte : la couleur de l'opérateur quand on la reconnaît (Orange Money, Wave, Moov), unie.
 * Partagée par l'onglet Trésorerie et la feuille « Vos comptes » : un compte a la même couleur partout.
 */
export function apparenceCompte(c: Pick<Compte, "nom" | "type">): { fond: string; texte: string; icone: Icon } {
  const n = c.nom.toLowerCase();
  if (n.includes("orange")) return { fond: "var(--marque-orange-money)", texte: "var(--nuit)", icone: DeviceMobile };
  if (n.includes("wave")) return { fond: "var(--marque-wave)", texte: "var(--nuit)", icone: DeviceMobile };
  if (n.includes("moov")) return { fond: "var(--marque-moov)", texte: "white", icone: DeviceMobile };
  if (c.type === "mobile_money") return { fond: "var(--primaire-plein)", texte: "white", icone: DeviceMobile };
  if (c.type === "banque") return { fond: "var(--nuit-2)", texte: "white", icone: Bank };
  return { fond: "var(--gain-plein)", texte: "white", icone: Money };
}
