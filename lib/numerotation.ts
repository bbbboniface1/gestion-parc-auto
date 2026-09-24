// Aperçu local de la numérotation — même règle que prive.prochain_numero (0002_prive.sql) :
// jetons {PREFIXE}, {AAAA}, {AA}, {NUM} ; {NUM} complété de zéros jusqu'à `padding` chiffres.

export const JETONS_NUMERO = ["{PREFIXE}", "{AAAA}", "{AA}", "{NUM}"] as const;

export function formaterNumero(format: string, prefixe: string, date: Date, numero: number, padding: number): string {
  const annee = String(date.getFullYear());
  return format
    .replace("{PREFIXE}", prefixe)
    .replace("{AAAA}", annee)
    .replace("{AA}", annee.slice(2))
    .replace("{NUM}", String(numero).padStart(padding, "0"));
}

export function verifierFormat(format: string): string | null {
  if (!format.includes("{NUM}")) return "Le format doit contenir {NUM}.";
  if (format.length > 60) return "60 caractères au maximum.";
  const inconnus = format.match(/\{[^}]*\}/g)?.filter((j) => !(JETONS_NUMERO as readonly string[]).includes(j));
  if (inconnus?.length) return `Jeton inconnu : ${inconnus.join(", ")}.`;
  return null;
}
