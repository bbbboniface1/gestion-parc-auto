// Export CSV lisible tel quel par Excel en français (double-clic, sans assistant d'import) :
// - BOM UTF-8 en tête : sans lui, Excel lit « Ã© » au lieu de « é » ;
// - séparateur « ; » : la virgule est le séparateur décimal en français ;
// - nombres sans groupement des milliers, virgule décimale, signe moins ASCII ;
// - dates en JJ/MM/AAAA, reconnues comme dates par Excel ;
// - guillemets doublés, champ entre guillemets s'il contient « ; », « " » ou un retour à la ligne ;
// - un texte qui commence par = + - @ est préfixé d'une apostrophe : un nom de client ne doit
//   jamais pouvoir s'exécuter comme une formule à l'ouverture du fichier.

export type ValeurCSV = string | number | boolean | Date | null | undefined;

export interface ColonneCSV<T> {
  titre: string;
  valeur: (ligne: T) => ValeurCSV;
  /** Nombre de décimales imposé pour une colonne numérique (sinon : au plus 6, sans zéros inutiles) */
  decimales?: number;
}

export const BOM = "﻿";
export const SEPARATEUR = ";";
const FIN_DE_LIGNE = "\r\n";

function nombreCSV(n: number, decimales?: number): string {
  if (!Number.isFinite(n)) return "";
  const texte = decimales !== undefined ? n.toFixed(decimales) : String(Math.round(n * 1e6) / 1e6);
  // « -0 » n'a pas de sens dans un tableur
  return (texte.startsWith("-") && Number(texte) === 0 ? texte.slice(1) : texte).replace(".", ",");
}

function dateCSV(d: Date): string {
  if (Number.isNaN(d.getTime())) return "";
  const jj = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${jj}/${mm}/${d.getFullYear()}`;
}

function texteCSV(texte: string): string {
  const neutralise = /^[=+\-@\t\r]/.test(texte) ? `'${texte}` : texte;
  return /[";\r\n]|^\s|\s$/.test(neutralise) ? `"${neutralise.replace(/"/g, '""')}"` : neutralise;
}

/** Une cellule, déjà échappée. */
export function celluleCSV(valeur: ValeurCSV, decimales?: number): string {
  if (valeur === null || valeur === undefined) return "";
  if (typeof valeur === "number") return nombreCSV(valeur, decimales);
  if (typeof valeur === "boolean") return valeur ? "Oui" : "Non";
  if (valeur instanceof Date) return dateCSV(valeur);
  return texteCSV(valeur);
}

/** Fichier complet : BOM, ligne d'en-tête, une ligne par élément, fins de ligne CRLF. */
export function genererCSV<T>(colonnes: ColonneCSV<T>[], lignes: readonly T[]): string {
  const entete = colonnes.map((c) => celluleCSV(c.titre)).join(SEPARATEUR);
  const corps = lignes.map((l) => colonnes.map((c) => celluleCSV(c.valeur(l), c.decimales)).join(SEPARATEUR));
  return BOM + [entete, ...corps].join(FIN_DE_LIGNE) + FIN_DE_LIGNE;
}

/** Propose le fichier à l'enregistrement (navigateur uniquement). */
export function telechargerCSV(nomFichier: string, contenu: string): void {
  const blob = new Blob([contenu], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nomFichier.toLowerCase().endsWith(".csv") ? nomFichier : `${nomFichier}.csv`;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
