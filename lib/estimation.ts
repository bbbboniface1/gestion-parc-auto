// Coût de revient prévisionnel d'un véhicule pas encore dédouané.
// Tant que la douane n'est pas payée, le prix de revient affiché serait trompeur (trop bas) :
// on ajoute une estimation de la douane, calculée avec le barème de l'entreprise
// (Paramètres › Frais et douane), et on la montre comme telle — hachurée, « estimée ».

import type { Etape } from "./domaine";

export interface BaremeDouane {
  mention?: string;
  base?: "caf" | string;
  droit_douane_pct?: number;
  redevance_statistique_pct?: number;
  prelevement_communautaire_pct?: number;
  tva_pct?: number;
  frais_fixes_xof?: number;
}

export interface LigneCoutVehicule {
  categorie: string;
  montant_xof: number;
  estime?: boolean;
}

/** Catégories qui composent la valeur CAF (coût, assurance, fret) arrivée au port. */
const CATEGORIES_CAF = new Set(["achat", "frais_enchere", "remorquage", "fret", "assurance"]);
const AVANT_DOUANE: Etape[] = ["achete", "transport_usa", "en_mer", "au_port", "convoi"];

/**
 * Droits et taxes estimés : DD + RS + prélèvements sur la CAF, puis TVA sur (CAF + droits),
 * plus les frais fixes. Renvoie 0 si le barème est vide.
 */
export function estimerDouane(cafXof: number, b: BaremeDouane): number {
  if (cafXof <= 0) return 0;
  const droits = cafXof * (((b.droit_douane_pct ?? 0) + (b.redevance_statistique_pct ?? 0) + (b.prelevement_communautaire_pct ?? 0)) / 100);
  const tva = (cafXof + droits) * ((b.tva_pct ?? 0) / 100);
  return Math.round(droits + tva + (b.frais_fixes_xof ?? 0));
}

/** Lignes réelles + estimation de la douane si elle n'est pas encore payée. */
export function coutsAvecEstimation(etape: Etape, lignes: LigneCoutVehicule[], bareme: BaremeDouane | null | undefined): LigneCoutVehicule[] {
  const reelles = lignes.filter((l) => l.montant_xof !== 0);
  if (!bareme || !AVANT_DOUANE.includes(etape) || reelles.some((l) => l.categorie === "douane")) return reelles;
  const caf = reelles.filter((l) => CATEGORIES_CAF.has(l.categorie)).reduce((s, l) => s + l.montant_xof, 0);
  const douane = estimerDouane(caf, bareme);
  return douane > 0 ? [...reelles, { categorie: "douane", montant_xof: douane, estime: true }] : reelles;
}
