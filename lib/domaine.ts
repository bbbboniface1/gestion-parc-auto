// Vocabulaire métier partagé par toute l'interface. Les codes sont ceux de la base
// (voir docs/CAHIER_DES_CHARGES.md §4 et §5) ; les libellés sont ceux que voit l'utilisateur.

export type Etape = "achete" | "transport_usa" | "en_mer" | "au_port" | "convoi" | "douane" | "atelier" | "parc";
export type StatutCommercial = "disponible" | "reserve" | "vendu";
export type Role = "proprietaire" | "gerant" | "vendeur" | "comptable" | "lecture";
export type ModePaiement = "especes" | "orange_money" | "moov_money" | "wave" | "virement" | "cheque" | "autre";

export interface DefinitionEtape {
  code: Etape;
  libelle: string;
  /** Libellé d'étiquette, en capitales condensées */
  etiquette: string;
  /** Où se trouve physiquement le véhicule : sert au trajet Houston → Cotonou → Bamako */
  zone: "usa" | "mer" | "afrique" | "mali";
  couleur: string;
}

export const ETAPES: readonly DefinitionEtape[] = [
  { code: "achete", libelle: "Acheté", etiquette: "ACHETÉ", zone: "usa", couleur: "var(--etape-achete)" },
  { code: "transport_usa", libelle: "Vers le port", etiquette: "VERS LE PORT", zone: "usa", couleur: "var(--etape-transport-usa)" },
  { code: "en_mer", libelle: "En mer", etiquette: "EN MER", zone: "mer", couleur: "var(--etape-en-mer)" },
  { code: "au_port", libelle: "Au port", etiquette: "AU PORT", zone: "afrique", couleur: "var(--etape-au-port)" },
  { code: "convoi", libelle: "Convoi", etiquette: "CONVOI", zone: "afrique", couleur: "var(--etape-convoi)" },
  { code: "douane", libelle: "Douane", etiquette: "DOUANE", zone: "mali", couleur: "var(--etape-douane)" },
  { code: "atelier", libelle: "Atelier", etiquette: "ATELIER", zone: "mali", couleur: "var(--etape-atelier)" },
  { code: "parc", libelle: "Au parc", etiquette: "AU PARC", zone: "mali", couleur: "var(--etape-parc)" },
];

export const ORDRE_ETAPES: readonly Etape[] = ETAPES.map((e) => e.code);

export function etape(code: Etape | string | null | undefined): DefinitionEtape {
  return ETAPES.find((e) => e.code === code) ?? ETAPES[0]!;
}

export function etapeSuivante(code: Etape): Etape | null {
  const i = ORDRE_ETAPES.indexOf(code);
  return i >= 0 && i < ORDRE_ETAPES.length - 1 ? ORDRE_ETAPES[i + 1]! : null;
}

export const STATUTS_COMMERCIAUX: Record<StatutCommercial, { libelle: string; tampon: string | null }> = {
  disponible: { libelle: "Disponible", tampon: null },
  reserve: { libelle: "Réservé", tampon: "RÉSERVÉ" },
  vendu: { libelle: "Vendu", tampon: "VENDU" },
};

export const MODES_PAIEMENT: Record<ModePaiement, { libelle: string; avecReference: boolean }> = {
  especes: { libelle: "Espèces", avecReference: false },
  orange_money: { libelle: "Orange Money", avecReference: true },
  moov_money: { libelle: "Moov Money", avecReference: true },
  wave: { libelle: "Wave", avecReference: true },
  virement: { libelle: "Virement", avecReference: true },
  cheque: { libelle: "Chèque", avecReference: true },
  autre: { libelle: "Autre", avecReference: false },
};

export const ROLES: Record<Role, { libelle: string; description: string }> = {
  proprietaire: { libelle: "Propriétaire", description: "Tous les droits, y compris l'équipe et la facturation." },
  gerant: { libelle: "Gérant", description: "Tout gérer, sauf l'équipe." },
  vendeur: { libelle: "Vendeur", description: "Parc, clients, ventes et encaissements. Ne voit pas les coûts." },
  comptable: { libelle: "Comptable", description: "Frais, encaissements, trésorerie et rapports." },
  lecture: { libelle: "Lecture seule", description: "Consulte tout, ne modifie rien." },
};

export const CATEGORIES_FRAIS: Record<string, { libelle: string; portee: "vehicule" | "generale"; ordre: number }> = {
  frais_enchere: { libelle: "Frais d'enchère", portee: "vehicule", ordre: 1 },
  remorquage: { libelle: "Remorquage USA", portee: "vehicule", ordre: 2 },
  fret: { libelle: "Fret maritime", portee: "vehicule", ordre: 3 },
  assurance: { libelle: "Assurance", portee: "vehicule", ordre: 4 },
  port: { libelle: "Frais de port", portee: "vehicule", ordre: 5 },
  convoi: { libelle: "Convoi", portee: "vehicule", ordre: 6 },
  douane: { libelle: "Douane", portee: "vehicule", ordre: 7 },
  transitaire: { libelle: "Transitaire", portee: "vehicule", ordre: 8 },
  atelier: { libelle: "Atelier", portee: "vehicule", ordre: 9 },
  pieces: { libelle: "Pièces", portee: "vehicule", ordre: 10 },
  carte_grise: { libelle: "Carte grise", portee: "vehicule", ordre: 11 },
  commission: { libelle: "Commission", portee: "vehicule", ordre: 12 },
  divers: { libelle: "Divers", portee: "vehicule", ordre: 13 },
  loyer: { libelle: "Loyer", portee: "generale", ordre: 20 },
  salaires: { libelle: "Salaires", portee: "generale", ordre: 21 },
  electricite: { libelle: "Électricité", portee: "generale", ordre: 22 },
  communication: { libelle: "Communication", portee: "generale", ordre: 23 },
  carburant: { libelle: "Carburant", portee: "generale", ordre: 24 },
  autre: { libelle: "Autre", portee: "generale", ordre: 25 },
};

export function libelleCategorie(code: string): string {
  return CATEGORIES_FRAIS[code]?.libelle ?? code.charAt(0).toUpperCase() + code.slice(1).replace(/_/g, " ");
}

export const SOURCES: Record<string, string> = {
  copart: "Copart",
  iaai: "IAAI",
  manheim: "Manheim",
  concession: "Concession",
  particulier: "Particulier",
  autre: "Autre",
};

export const TITRES: Record<string, { libelle: string; aide: string }> = {
  clean: { libelle: "Clean", aide: "Titre normal, jamais déclaré épave" },
  salvage: { libelle: "Salvage", aide: "Déclaré épave par l'assureur" },
  rebuilt: { libelle: "Rebuilt", aide: "Ancien salvage réparé et réinspecté" },
  autre: { libelle: "Autre", aide: "" },
};

/** Droits d'écriture selon le rôle — reflet de ce que les fonctions SQL imposent (le serveur fait foi). */
export const PERMISSIONS = {
  modifierVehicule: ["proprietaire", "gerant"],
  saisirFrais: ["proprietaire", "gerant", "comptable"],
  vendre: ["proprietaire", "gerant", "vendeur"],
  encaisser: ["proprietaire", "gerant", "vendeur", "comptable"],
  annulerVente: ["proprietaire", "gerant"],
  voirTresorerie: ["proprietaire", "gerant", "comptable", "lecture"],
  parametres: ["proprietaire", "gerant"],
  equipe: ["proprietaire"],
} as const satisfies Record<string, readonly Role[]>;

export function peut(role: Role | null | undefined, action: keyof typeof PERMISSIONS): boolean {
  return !!role && (PERMISSIONS[action] as readonly Role[]).includes(role);
}
