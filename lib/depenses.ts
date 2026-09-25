// Règles pures de l'onglet Dépenses : où mène une ligne, quelle couleur, comment filtrer et regrouper.
// Testées à part (tests/unit/depenses.test.ts) : l'écran ne fait que les afficher.

import type { Frais } from "@/lib/api/types";
import { CATEGORIES_FRAIS, libelleCategorie } from "@/lib/domaine";

const PALETTE = ["#6366f1", "#0ea5e9", "#f97316", "#14b8a6", "#a855f7", "#f59e0b", "#ec4899", "#22c55e", "#3b82f6", "#64748b"];

/** Une couleur stable par catégorie : la même dans la liste des dépenses, sur la fiche véhicule et dans le simulateur. */
export function couleurCategorie(categorie: string): string {
  const i = Object.keys(CATEGORIES_FRAIS).indexOf(categorie);
  return PALETTE[(i < 0 ? PALETTE.length - 1 : i) % PALETTE.length]!;
}

/**
 * Où mène une ligne : la voiture concernée, sinon le conteneur, sinon nulle part (dépense générale : on ouvre le
 * détail). Sur la fiche d'un véhicule, la ligne d'une dépense propre au véhicule ne renvoie pas vers lui-même.
 */
export function lienDepense(f: Pick<Frais, "vehicule_id" | "expedition_id">, contexte: "liste" | "vehicule" = "liste"): string | null {
  if (contexte === "liste" && f.vehicule_id) return `/parc/vehicule/?id=${f.vehicule_id}`;
  if (f.expedition_id) return `/expeditions/fiche/?id=${f.expedition_id}`;
  return null;
}

/** Ce que la ligne pèse pour le lecteur : sa part quand la dépense est répartie entre plusieurs véhicules. */
export const montantLigne = (f: Pick<Frais, "part_xof" | "montant_xof">): number => f.part_xof ?? f.montant_xof;

export type PorteeDepense = "toutes" | "vehicule" | "expedition" | "generale";

export interface FiltreDepenses {
  q: string;
  portee: PorteeDepense;
  aPayerSeul: boolean;
  categorie: string | null;
}

/** Filtre la liste : type de dépense, à payer, catégorie, puis recherche libre (voiture, conteneur, fournisseur, compte…). */
export function filtrerDepenses(liste: readonly Frais[], filtre: FiltreDepenses): Frais[] {
  const motif = filtre.q.trim().toLowerCase();
  return liste.filter((f) => {
    if (filtre.portee !== "toutes" && f.portee !== filtre.portee) return false;
    if (filtre.aPayerSeul && f.statut !== "a_payer") return false;
    if (filtre.categorie && f.categorie !== filtre.categorie) return false;
    if (!motif) return true;
    return [f.vehicule_libelle, f.vehicule_reference, f.expedition_reference, f.fournisseur, f.libelle, f.compte_nom, libelleCategorie(f.categorie)]
      .some((x) => x?.toLowerCase().includes(motif));
  });
}

/** Regroupe par jour en gardant l'ordre reçu (le serveur trie du plus récent au plus ancien). */
export function regrouperParJour(liste: readonly Frais[]): [string, Frais[]][] {
  const jours = new Map<string, Frais[]>();
  for (const f of liste) {
    const du_jour = jours.get(f.date);
    if (du_jour) du_jour.push(f); else jours.set(f.date, [f]);
  }
  return [...jours.entries()];
}

/** Montant total par catégorie, de la plus lourde à la plus légère. */
export function repartitionParCategorie(liste: readonly Frais[]): [string, number][] {
  const m = new Map<string, number>();
  for (const f of liste) m.set(f.categorie, (m.get(f.categorie) ?? 0) + f.montant_xof);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
