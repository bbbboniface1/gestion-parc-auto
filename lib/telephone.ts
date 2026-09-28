// Numéros de téléphone : le Mali par défaut (8 chiffres, sans indicatif à saisir), les autres pays avec leur
// indicatif, choisi dans une liste. Valeur enregistrée : « +223 76 45 12 89 », « +33 6 12 34 56 78 »…

export interface Pays {
  code: string;
  nom: string;
  indicatif: string;
  drapeau: string;
}

/** Mali en tête, puis les pays de la sous-région, puis ceux d'où l'on achète et où vit la diaspora. */
export const PAYS: readonly Pays[] = [
  { code: "ML", nom: "Mali", indicatif: "223", drapeau: "🇲🇱" },
  { code: "SN", nom: "Sénégal", indicatif: "221", drapeau: "🇸🇳" },
  { code: "CI", nom: "Côte d'Ivoire", indicatif: "225", drapeau: "🇨🇮" },
  { code: "BF", nom: "Burkina Faso", indicatif: "226", drapeau: "🇧🇫" },
  { code: "GN", nom: "Guinée", indicatif: "224", drapeau: "🇬🇳" },
  { code: "NE", nom: "Niger", indicatif: "227", drapeau: "🇳🇪" },
  { code: "MR", nom: "Mauritanie", indicatif: "222", drapeau: "🇲🇷" },
  { code: "BJ", nom: "Bénin", indicatif: "229", drapeau: "🇧🇯" },
  { code: "TG", nom: "Togo", indicatif: "228", drapeau: "🇹🇬" },
  { code: "GH", nom: "Ghana", indicatif: "233", drapeau: "🇬🇭" },
  { code: "NG", nom: "Nigeria", indicatif: "234", drapeau: "🇳🇬" },
  { code: "CM", nom: "Cameroun", indicatif: "237", drapeau: "🇨🇲" },
  { code: "GA", nom: "Gabon", indicatif: "241", drapeau: "🇬🇦" },
  { code: "CG", nom: "Congo", indicatif: "242", drapeau: "🇨🇬" },
  { code: "CD", nom: "RD Congo", indicatif: "243", drapeau: "🇨🇩" },
  { code: "MA", nom: "Maroc", indicatif: "212", drapeau: "🇲🇦" },
  { code: "DZ", nom: "Algérie", indicatif: "213", drapeau: "🇩🇿" },
  { code: "TN", nom: "Tunisie", indicatif: "216", drapeau: "🇹🇳" },
  { code: "FR", nom: "France", indicatif: "33", drapeau: "🇫🇷" },
  { code: "BE", nom: "Belgique", indicatif: "32", drapeau: "🇧🇪" },
  { code: "CH", nom: "Suisse", indicatif: "41", drapeau: "🇨🇭" },
  { code: "ES", nom: "Espagne", indicatif: "34", drapeau: "🇪🇸" },
  { code: "IT", nom: "Italie", indicatif: "39", drapeau: "🇮🇹" },
  { code: "DE", nom: "Allemagne", indicatif: "49", drapeau: "🇩🇪" },
  { code: "GB", nom: "Royaume-Uni", indicatif: "44", drapeau: "🇬🇧" },
  { code: "US", nom: "États-Unis", indicatif: "1", drapeau: "🇺🇸" },
  { code: "CA", nom: "Canada", indicatif: "1", drapeau: "🇨🇦" },
  { code: "CN", nom: "Chine", indicatif: "86", drapeau: "🇨🇳" },
  { code: "AE", nom: "Émirats arabes unis", indicatif: "971", drapeau: "🇦🇪" },
  { code: "SA", nom: "Arabie saoudite", indicatif: "966", drapeau: "🇸🇦" },
  { code: "TR", nom: "Turquie", indicatif: "90", drapeau: "🇹🇷" },
];

export const MALI = PAYS[0]!;
/** Code du choix « Autre pays » : l'indicatif se saisit alors à la main. */
export const AUTRE = "autre";

export interface NumeroDecompose {
  /** Code pays (ML, FR…) ou AUTRE */
  pays: string;
  indicatif: string;
  /** Chiffres du numéro national */
  national: string;
}

/** Lit une valeur enregistrée (ou saisie librement) : « +223 76… », « 0033 6… », « 76 45 12 89 ». */
export function decomposer(valeur: string | null | undefined): NumeroDecompose {
  const brut = (valeur ?? "").trim();
  const international = brut.startsWith("+") || brut.startsWith("00");
  let chiffres = brut.replace(/\D/g, "");
  if (brut.startsWith("00")) chiffres = chiffres.slice(2);
  if (!international) return { pays: MALI.code, indicatif: MALI.indicatif, national: chiffres };
  // Indicatif le plus long qui correspond ; « +1 » va aux États-Unis.
  const connu = [...PAYS].sort((a, b) => b.indicatif.length - a.indicatif.length).find((p) => chiffres.startsWith(p.indicatif));
  if (connu) return { pays: connu.code, indicatif: connu.indicatif, national: chiffres.slice(connu.indicatif.length) };
  return { pays: AUTRE, indicatif: chiffres.slice(0, 3), national: chiffres.slice(3) };
}

/** Groupes de 2 chiffres (3-3-4 pour +1), lisibles au téléphone. */
export function grouper(indicatif: string, national: string): string {
  if (indicatif === "1" && national.length === 10) return `${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
  const debut = national.length % 2 === 1 ? national.slice(0, 1) : "";
  const reste = national.slice(debut.length).match(/\d{2}/g) ?? [];
  return [debut, ...reste].filter(Boolean).join(" ");
}

/** Valeur à enregistrer ; chaîne vide si aucun chiffre. */
export function composer(indicatif: string, national: string): string {
  const n = national.replace(/\D/g, "");
  const i = indicatif.replace(/\D/g, "");
  return n ? `+${i} ${grouper(i, n)}` : "";
}

/** Message d'erreur, ou null si le numéro est vide ou valable. */
export function erreurTelephone(d: NumeroDecompose): string | null {
  if (!d.national) return null;
  if (d.pays === MALI.code) {
    return d.national.length === 8 ? null : "Un numéro malien compte 8 chiffres.";
  }
  if (!/^\d{1,3}$/.test(d.indicatif)) return "Indiquez l'indicatif du pays (1 à 3 chiffres).";
  if (d.national.length < 6 || d.indicatif.length + d.national.length > 15) return "Ce numéro n'a pas une longueur valable.";
  return null;
}

export function telephoneValide(valeur: string | null | undefined): boolean {
  return erreurTelephone(decomposer(valeur)) === null;
}
