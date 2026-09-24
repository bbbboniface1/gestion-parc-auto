// Simulateur d'enchère maximale.
// Question du négociant devant une enchère Copart : « Si je revends ce RAV4 à 14,5 M à Bamako
// et que je veux gagner 2 M, jusqu'où puis-je enchérir ? »
//
// Tous les frais sont linéaires en fonction de l'enchère B (en USD) :
//   frais d'enchère  = B × p + f
//   FOB              = B + frais d'enchère + remorquage
//   assurance        = FOB × a
//   CAF              = FOB + fret + assurance
//   douane           = CAF × taux cumulé (mode « taux ») ou forfait
//   coût total FCFA  = CAF × taux USD + douane + frais locaux fixes
// donc coût(B) = K × B + C, et l'enchère maximale est (budget − C) / K, arrondie au palier inférieur.

export interface HypothesesSimulateur {
  tauxUsd: number;
  /** Frais d'enchère : pourcentage de l'enchère + part fixe en USD */
  fraisEncherePourcent: number;
  fraisEnchereFixeUsd: number;
  remorquageUsd: number;
  fretUsd: number;
  /** Assurance maritime en % de la valeur FOB */
  assurancePourcent: number;
  douane: { mode: "taux"; tauxCumulePourcent: number } | { mode: "forfait"; montantXof: number };
  portXof: number;
  convoiXof: number;
  transitaireXof: number;
  atelierXof: number;
  diversXof: number;
}

/**
 * Valeurs de départ, à remplacer dans Paramètres › Frais et douane par les tarifs réels de l'entreprise.
 * - Frais Copart : environ 20 % de l'enchère sur un véhicule courant (CarFlipIQ, 2026).
 * - Remorquage vers le port : 350 à 1 400 $ selon la distance (Y7 Logistics, 2026) → 600 $.
 * - Douane : « 20 % + prélèvements », TVA 18 % sur CAF + droits ; taux cumulé ≈ 44 % de la CAF,
 *   donné comme approximatif par toutes les sources → à confirmer avec le transitaire.
 * - Transit : environ 250 000 FCFA (SimpliFi Bénin, 2026).
 * Fret, port, convoi et atelier dépendent de chaque entreprise : 0 tant qu'ils ne sont pas renseignés.
 */
export const HYPOTHESES_PAR_DEFAUT: HypothesesSimulateur = {
  tauxUsd: 570,
  fraisEncherePourcent: 20,
  fraisEnchereFixeUsd: 0,
  remorquageUsd: 600,
  fretUsd: 0,
  assurancePourcent: 0,
  douane: { mode: "taux", tauxCumulePourcent: 44 },
  portXof: 0,
  convoiXof: 0,
  transitaireXof: 250_000,
  atelierXof: 0,
  diversXof: 0,
};

export interface LigneCout {
  code: string;
  libelle: string;
  montantXof: number;
  montantUsd?: number;
}

export interface DetailCout {
  encheresUsd: number;
  cafUsd: number;
  lignes: LigneCout[];
  totalXof: number;
}

function coefficients(h: HypothesesSimulateur) {
  const p = h.fraisEncherePourcent / 100;
  const a = h.assurancePourcent / 100;
  const t = h.douane.mode === "taux" ? h.douane.tauxCumulePourcent / 100 : 0;
  const fixesXof =
    h.portXof + h.convoiXof + h.transitaireXof + h.atelierXof + h.diversXof +
    (h.douane.mode === "forfait" ? h.douane.montantXof : 0);
  // CAF(B) = B(1+p)(1+a) + (f + remorquage)(1+a) + fret
  const cafPente = (1 + p) * (1 + a);
  const cafOrigine = (h.fraisEnchereFixeUsd + h.remorquageUsd) * (1 + a) + h.fretUsd;
  const K = cafPente * h.tauxUsd * (1 + t);
  const C = cafOrigine * h.tauxUsd * (1 + t) + fixesXof;
  return { K, C };
}

/** Coût de revient complet, en FCFA, pour une enchère donnée. */
export function coutPourEnchere(encheresUsd: number, h: HypothesesSimulateur): DetailCout {
  const fraisEnchere = encheresUsd * (h.fraisEncherePourcent / 100) + h.fraisEnchereFixeUsd;
  const fob = encheresUsd + fraisEnchere + h.remorquageUsd;
  const assurance = fob * (h.assurancePourcent / 100);
  const caf = fob + h.fretUsd + assurance;
  const douaneXof = h.douane.mode === "taux"
    ? Math.round(caf * h.tauxUsd * (h.douane.tauxCumulePourcent / 100))
    : h.douane.montantXof;

  const usd = (code: string, libelle: string, montant: number): LigneCout => ({
    code, libelle, montantUsd: montant, montantXof: Math.round(montant * h.tauxUsd),
  });
  const xof = (code: string, libelle: string, montant: number): LigneCout => ({ code, libelle, montantXof: montant });

  const lignes = [
    usd("achat", "Enchère", encheresUsd),
    usd("frais_enchere", "Frais d'enchère", fraisEnchere),
    usd("remorquage", "Remorquage USA", h.remorquageUsd),
    usd("fret", "Fret maritime", h.fretUsd),
    usd("assurance", "Assurance", assurance),
    xof("port", "Frais de port", h.portXof),
    xof("convoi", "Convoi", h.convoiXof),
    xof("douane", "Douane (estimation)", douaneXof),
    xof("transitaire", "Transitaire", h.transitaireXof),
    xof("atelier", "Atelier", h.atelierXof),
    xof("divers", "Divers", h.diversXof),
  ].filter((l) => l.montantXof !== 0 || l.code === "achat");

  return {
    encheresUsd,
    cafUsd: caf,
    lignes,
    totalXof: lignes.reduce((s, l) => s + l.montantXof, 0),
  };
}

export interface ResultatSimulation {
  /** Enchère maximale en USD, arrondie au palier inférieur ; 0 si le prix visé ne couvre pas les frais fixes */
  enchereMaxUsd: number;
  budgetXof: number;
  margeXof: number;
  detail: DetailCout;
  /** Marge réellement obtenue à l'enchère maximale (≥ marge voulue, à cause de l'arrondi) */
  margeObtenueXof: number;
  impossible: boolean;
}

export function enchereMaximale(
  prixVenteXof: number,
  marge: { type: "montant"; valeur: number } | { type: "pourcent"; valeur: number },
  h: HypothesesSimulateur,
  palierUsd = 25,
): ResultatSimulation {
  const margeXof = marge.type === "montant" ? marge.valeur : Math.round(prixVenteXof * (marge.valeur / 100));
  const budgetXof = prixVenteXof - margeXof;
  const { K, C } = coefficients(h);
  const brut = K > 0 ? (budgetXof - C) / K : 0;
  const enchereMaxUsd = brut > 0 ? Math.floor(brut / palierUsd) * palierUsd : 0;
  const detail = coutPourEnchere(enchereMaxUsd, h);
  return {
    enchereMaxUsd,
    budgetXof,
    margeXof,
    detail,
    margeObtenueXof: prixVenteXof - detail.totalXof,
    impossible: brut <= 0,
  };
}
