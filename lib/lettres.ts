// Conversion d'un montant entier en toutes lettres, orthographe traditionnelle
// (« vingt et un », « quatre-vingts », « deux cents »), telle qu'on l'écrit sur une facture :
// « Arrêtée la présente facture à la somme de : quatorze millions cinq cent mille francs CFA ».

const UNITES = [
  "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize",
] as const;

const DIZAINES: Record<number, string> = {
  2: "vingt",
  3: "trente",
  4: "quarante",
  5: "cinquante",
  6: "soixante",
  8: "quatre-vingt",
};

// `final` : le nombre termine l'expression ou précède « millions » / « milliards » (des noms).
// Devant « mille » (adjectif numéral), « vingt » et « cent » restent invariables.
function moinsDeCent(n: number, final: boolean): string {
  if (n < 17) return UNITES[n]!;
  if (n < 20) return `dix-${UNITES[n - 10]}`;

  const d = Math.floor(n / 10);
  const u = n % 10;

  if (d === 7 || d === 9) {
    if (d === 7 && u === 1) return "soixante et onze";
    const base = d === 7 ? "soixante" : "quatre-vingt";
    return `${base}-${moinsDeCent(10 + u, final)}`;
  }

  const base = DIZAINES[d]!;
  if (u === 0) return d === 8 && final ? "quatre-vingts" : base;
  if (u === 1 && d !== 8) return `${base} et un`;
  return `${base}-${UNITES[u]}`;
}

function moinsDeMille(n: number, final: boolean): string {
  const c = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (c === 1) parts.push("cent");
  else if (c > 1) parts.push(`${UNITES[c]} cent${r === 0 && final ? "s" : ""}`);
  if (r > 0) parts.push(moinsDeCent(r, final));
  return parts.join(" ");
}

export const MAX_EN_LETTRES = 999_999_999_999;

export function nombreEnLettres(valeur: number): string {
  if (!Number.isFinite(valeur)) throw new RangeError("Montant invalide");
  const n = Math.round(Math.abs(valeur));
  if (n > MAX_EN_LETTRES) throw new RangeError("Montant trop grand pour être écrit en lettres");
  if (n === 0) return "zéro";

  const milliards = Math.floor(n / 1_000_000_000);
  const millions = Math.floor(n / 1_000_000) % 1000;
  const milliers = Math.floor(n / 1000) % 1000;
  const reste = n % 1000;

  const parts: string[] = [];
  if (milliards) parts.push(milliards === 1 ? "un milliard" : `${moinsDeMille(milliards, true)} milliards`);
  if (millions) parts.push(millions === 1 ? "un million" : `${moinsDeMille(millions, true)} millions`);
  if (milliers) parts.push(milliers === 1 ? "mille" : `${moinsDeMille(milliers, false)} mille`);
  if (reste) parts.push(moinsDeMille(reste, true));

  const texte = parts.join(" ");
  return valeur < 0 ? `moins ${texte}` : texte;
}

/** « deux millions de francs CFA », « quatorze millions cinq cent mille francs CFA », « un franc CFA ». */
export function montantEnLettres(valeur: number): string {
  const n = Math.round(Math.abs(valeur));
  const mots = nombreEnLettres(valeur);
  if (n <= 1) return `${mots} franc CFA`;
  const seulementMillions = n >= 1_000_000 && n % 1_000_000 === 0;
  return `${mots}${seulementMillions ? " de" : ""} francs CFA`;
}
