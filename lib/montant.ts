// Saisie rapide des montants : un négociant tape « 8,5M » ou « 850k » plutôt que
// « 8500000 », et voit « 8 500 000 » pendant la frappe.

import { formatNombre } from "./format";

const SUFFIXES: Record<string, number> = {
  k: 1_000,
  m: 1_000_000,
  md: 1_000_000_000,
};

/**
 * Convertit une saisie libre en nombre. Accepte les espaces, « , » ou « . » décimal,
 * et les suffixes k / M / Md. Renvoie `null` si la saisie n'est pas un montant.
 */
export function lireMontant(saisie: string | number | null | undefined): number | null {
  if (saisie === null || saisie === undefined) return null;
  if (typeof saisie === "number") return Number.isFinite(saisie) ? saisie : null;

  const brut = saisie
    .trim()
    .toLowerCase()
    .replace(/[\s  ]/g, "")
    .replace(/fcfa|cfa|xof|f$|\$|€|usd|eur/g, "");
  if (brut === "") return null;

  // Avec suffixe : « 8,5M », « 850k », « 1.2Md » — un seul séparateur, décimal.
  const avecSuffixe = /^(-?)(\d+(?:[.,]\d+)?|[.,]\d+)(md|k|m)$/.exec(brut);
  if (avecSuffixe) {
    const [, signe, nombre = "0", suffixe = ""] = avecSuffixe;
    const valeur = Number(nombre.replace(",", ".")) * SUFFIXES[suffixe]!;
    return signe === "-" ? -valeur : valeur;
  }

  const m = /^(-?)([\d.,]+)$/.exec(brut);
  if (!m) return null;
  const [, signe, corps = ""] = m;
  const valeur = lireCorps(corps);
  if (valeur === null) return null;
  return signe === "-" ? -valeur : valeur;
}

// Règles de séparateurs, pensées pour des montants copiés depuis un reçu américain (« 14,250.00 »)
// comme pour une saisie à la française (« 14 250,50 ») :
// - les deux séparateurs présents : le dernier est décimal, l'autre groupe les milliers ;
// - un séparateur répété : milliers (« 8.500.000 ») ;
// - un séparateur unique suivi d'exactement 3 chiffres : milliers (aucun montant n'a 3 décimales) ;
// - sinon : décimal (« 8,5 », « 14250.75 »).
function lireCorps(corps: string): number | null {
  if (!/\d/.test(corps)) return null;
  const virgules = (corps.match(/,/g) ?? []).length;
  const points = (corps.match(/\./g) ?? []).length;

  let decimal: string | null = null;
  let milliers: string | null = null;
  if (virgules && points) {
    decimal = corps.lastIndexOf(",") > corps.lastIndexOf(".") ? "," : ".";
    milliers = decimal === "," ? "." : ",";
    if ((decimal === "," ? virgules : points) > 1) return null;
  } else if (virgules + points > 0) {
    const sep = virgules ? "," : ".";
    const n = virgules || points;
    const apres = corps.slice(corps.lastIndexOf(sep) + 1);
    if (n > 1 || apres.length === 3) milliers = sep;
    else decimal = sep;
  }

  const [premier = "", fraction] = decimal ? corps.split(decimal) : [corps];
  let entier = premier;
  if (milliers) {
    const groupes = entier.split(milliers);
    const valides = groupes.every((g, i) => (i === 0 ? /^\d{1,3}$/.test(g) : /^\d{3}$/.test(g)));
    if (!valides) return null;
    entier = groupes.join("");
  }
  if (!/^\d*$/.test(entier) || (fraction !== undefined && !/^\d+$/.test(fraction))) return null;
  const valeur = Number(`${entier || "0"}${fraction ? `.${fraction}` : ""}`);
  return Number.isFinite(valeur) ? valeur : null;
}

/** Affichage pendant la frappe : groupe les milliers sans toucher à la partie décimale en cours. */
export function formaterPendantSaisie(saisie: string): string {
  const nettoye = saisie.replace(/[\s  ]/g, "");
  if (/[a-zA-Z]/.test(nettoye)) return saisie; // l'utilisateur tape un suffixe : on ne touche à rien
  const m = /^(-?)(\d*)([.,]\d*)?$/.exec(nettoye);
  if (!m) return saisie;
  const [, signe, entier = "", decimal = ""] = m;
  if (entier === "") return `${signe}${decimal}`;
  return `${signe}${formatNombre(Number(entier))}${decimal.replace(".", ",")}`;
}

/** Conversion d'une devise en FCFA, arrondie à l'unité. */
export function versFCFA(montant: number, taux: number): number {
  return Math.round(montant * taux);
}
