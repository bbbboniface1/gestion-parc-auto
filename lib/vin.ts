// Numéro d'identification du véhicule (VIN, norme ISO 3779) : 17 caractères, sans I, O ni Q.
// Pour les véhicules nord-américains, le 9e caractère est une clé de contrôle : une faute de frappe
// sur un seul caractère est détectée avant qu'elle ne se retrouve sur une facture.

const TRANSLITTERATION: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};
const POIDS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

export function normaliserVin(saisie: string): string {
  return saisie.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function cleDeControle(vin: string): string | null {
  if (vin.length !== 17) return null;
  let somme = 0;
  for (let i = 0; i < 17; i++) {
    const c = vin[i]!;
    const valeur = /\d/.test(c) ? Number(c) : TRANSLITTERATION[c];
    if (valeur === undefined) return null;
    somme += valeur * POIDS[i]!;
  }
  const reste = somme % 11;
  return reste === 10 ? "X" : String(reste);
}

export type VerificationVin =
  | { etat: "vide" }
  | { etat: "incomplet"; longueur: number }
  | { etat: "invalide"; message: string }
  | { etat: "cle_incorrecte"; attendue: string }
  | { etat: "valide" };

export function verifierVin(saisie: string): VerificationVin {
  const vin = normaliserVin(saisie);
  if (vin.length === 0) return { etat: "vide" };
  if (/[IOQ]/.test(vin)) return { etat: "invalide", message: "Un VIN ne contient jamais les lettres I, O ou Q." };
  if (vin.length < 17) return { etat: "incomplet", longueur: vin.length };
  if (vin.length > 17) return { etat: "invalide", message: "Un VIN compte exactement 17 caractères." };
  const attendue = cleDeControle(vin);
  if (attendue === null) return { etat: "invalide", message: "Caractère non autorisé dans le VIN." };
  if (vin[8] !== attendue) return { etat: "cle_incorrecte", attendue };
  return { etat: "valide" };
}

/** Affichage lisible par groupes : WMI (3) · VDS (6) · VIS (8) → « 2T3 RFREV5 JW812345 ». */
export function grouperVin(vin: string | null | undefined): string {
  if (!vin) return "—";
  const v = normaliserVin(vin);
  if (v.length !== 17) return v;
  return `${v.slice(0, 3)} ${v.slice(3, 9)} ${v.slice(9)}`;
}

/** Les 6 derniers caractères (numéro de série) : ce que les négociants se disent au téléphone. */
export function finDeVin(vin: string | null | undefined): string {
  if (!vin) return "";
  const v = normaliserVin(vin);
  return v.length >= 6 ? `…${v.slice(-6)}` : v;
}

export interface DecodageVin {
  marque: string | null;
  modele: string | null;
  finition: string | null;
  annee: number | null;
  carburant: string | null;
  transmission: string | null;
  moteur: string | null;
  carrosserie: string | null;
}

const CARBURANTS: Record<string, string> = {
  Gasoline: "Essence",
  Diesel: "Diesel",
  Electric: "Électrique",
  "Flexible Fuel Vehicle (FFV)": "Essence",
};

function propre(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" || t === "Not Applicable" ? null : t;
}

/**
 * Décodage gratuit par la base publique de la NHTSA (vPIC, sans clé d'API).
 * Ne couvre que les véhicules destinés au marché nord-américain — justement ceux achetés aux enchères.
 */
export async function decoderVin(vin: string, signal?: AbortSignal): Promise<DecodageVin | null> {
  const v = normaliserVin(vin);
  if (v.length !== 17) return null;
  const reponse = await fetch(
    `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${v}?format=json`,
    { signal },
  );
  if (!reponse.ok) return null;
  const donnees = (await reponse.json()) as { Results?: Record<string, unknown>[] };
  const r = donnees.Results?.[0];
  if (!r) return null;
  const marque = propre(r.Make);
  if (!marque) return null;
  const hybride = propre(r.ElectrificationLevel);
  const carburantBrut = propre(r.FuelTypePrimary);
  const cylindree = propre(r.DisplacementL);
  const cylindres = propre(r.EngineCylinders);
  const annee = Number(propre(r.ModelYear));
  return {
    marque: marque.charAt(0) + marque.slice(1).toLowerCase().replace(/(^|[\s-])\w/g, (s) => s.toUpperCase()),
    modele: propre(r.Model),
    finition: propre(r.Trim),
    annee: Number.isFinite(annee) && annee > 1980 ? annee : null,
    carburant: hybride && /hybrid|HEV/i.test(hybride) ? "Hybride" : carburantBrut ? (CARBURANTS[carburantBrut] ?? carburantBrut) : null,
    transmission: propre(r.TransmissionStyle)?.match(/manual/i) ? "Manuelle" : propre(r.TransmissionStyle) ? "Automatique" : null,
    moteur: [cylindree ? `${Number(cylindree).toFixed(1)} L` : null, cylindres ? `${cylindres} cyl.` : null].filter(Boolean).join(" ") || null,
    carrosserie: propre(r.BodyClass),
  };
}
