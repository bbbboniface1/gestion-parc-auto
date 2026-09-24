// Mise en forme des nombres, montants et dates, en français.
// On groupe les milliers avec une espace insécable classique (U+00A0) plutôt qu'avec
// l'espace fine (U+202F) d'Intl : toutes les polices, y compris celles des PDF, la possèdent.

const INSECABLE = " ";

export function formatNombre(valeur: number, decimales = 0): string {
  if (!Number.isFinite(valeur)) return "—";
  const signe = valeur < 0 ? "−" : "";
  const fixe = Math.abs(valeur).toFixed(decimales);
  const [entier = "0", fraction] = fixe.split(".");
  const groupe = entier.replace(/\B(?=(\d{3})+(?!\d))/g, INSECABLE);
  return `${signe}${groupe}${fraction ? `,${fraction}` : ""}`;
}

export type Devise = "XOF" | "USD" | "EUR";

export const SYMBOLE_DEVISE: Record<Devise, string> = {
  XOF: "FCFA",
  USD: "$",
  EUR: "€",
};

/** 8 500 000 FCFA — le franc CFA n'a pas de subdivision en usage : toujours arrondi à l'unité. */
export function formatFCFA(valeur: number | null | undefined): string {
  if (valeur === null || valeur === undefined) return "—";
  return `${formatNombre(Math.round(valeur))}${INSECABLE}FCFA`;
}

export function formatDevise(valeur: number | null | undefined, devise: Devise): string {
  if (valeur === null || valeur === undefined) return "—";
  if (devise === "XOF") return formatFCFA(valeur);
  const decimales = Number.isInteger(valeur) ? 0 : 2;
  return `${formatNombre(valeur, decimales)}${INSECABLE}${SYMBOLE_DEVISE[devise]}`;
}

/** Forme courte pour les indicateurs : 186,4 M · 950 k · 12 500. */
export function formatCourt(valeur: number | null | undefined): string {
  if (valeur === null || valeur === undefined || !Number.isFinite(valeur)) return "—";
  const abs = Math.abs(valeur);
  const signe = valeur < 0 ? "−" : "";
  if (abs >= 1_000_000_000) return `${signe}${formatNombre(abs / 1_000_000_000, abs >= 10_000_000_000 ? 0 : 1)}${INSECABLE}Md`;
  if (abs >= 1_000_000) return `${signe}${formatNombre(abs / 1_000_000, abs >= 100_000_000 ? 0 : 1)}${INSECABLE}M`;
  if (abs >= 100_000) return `${signe}${formatNombre(Math.round(abs / 1000))}${INSECABLE}k`;
  return `${signe}${formatNombre(Math.round(abs))}`;
}

export function formatPourcent(valeur: number | null | undefined, decimales = 1): string {
  if (valeur === null || valeur === undefined || !Number.isFinite(valeur)) return "—";
  return `${formatNombre(valeur, decimales)}${INSECABLE}%`;
}

const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/** Accepte « 2026-09-24 » (date SQL, lue en date locale sans décalage de fuseau) ou un horodatage ISO. */
export function lireDate(valeur: string | Date | null | undefined): Date | null {
  if (!valeur) return null;
  if (valeur instanceof Date) return Number.isNaN(valeur.getTime()) ? null : valeur;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valeur);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(valeur);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 24 sept. 2026 */
export function formatDate(valeur: string | Date | null | undefined): string {
  const d = lireDate(valeur);
  if (!d) return "—";
  return `${d.getDate()} ${MOIS_COURTS[d.getMonth()]} ${d.getFullYear()}`;
}

/** 24 septembre 2026 */
export function formatDateLongue(valeur: string | Date | null | undefined): string {
  const d = lireDate(valeur);
  if (!d) return "—";
  return `${d.getDate() === 1 ? "1er" : d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Mercredi 24 septembre */
export function formatJour(valeur: string | Date | null | undefined): string {
  const d = lireDate(valeur);
  if (!d) return "—";
  const jour = JOURS[d.getDay()]!;
  return `${jour.charAt(0).toUpperCase()}${jour.slice(1)} ${d.getDate() === 1 ? "1er" : d.getDate()} ${MOIS[d.getMonth()]}`;
}

/** « 2026-09 » → « sept. » */
export function formatMoisCourt(cle: string): string {
  const mois = Number(cle.slice(5, 7));
  return MOIS_COURTS[mois - 1] ?? cle;
}

/** Date du jour au format SQL (AAAA-MM-JJ), en heure locale. */
export function aujourdhui(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function joursDepuis(valeur: string | Date | null | undefined, reference = new Date()): number | null {
  const d = lireDate(valeur);
  if (!d) return null;
  const debut = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const fin = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate()).getTime();
  return Math.round((fin - debut) / 86_400_000);
}

export function pluriel(n: number, singulier: string, plurielForme = `${singulier}s`): string {
  return `${formatNombre(n)}${INSECABLE}${Math.abs(n) >= 2 ? plurielForme : singulier}`;
}
