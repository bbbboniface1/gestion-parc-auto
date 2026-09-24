// Données d'un document commercial, figées au moment de l'émission (snapshot côté serveur) :
// modifier plus tard la fiche du client ou de l'entreprise ne change jamais une facture émise.

export type TypeDocument = "facture" | "proforma" | "recu" | "avoir";

export interface EntrepriseDocument {
  nom: string;
  raison_sociale?: string | null;
  slogan?: string | null;
  adresse?: string | null;
  ville?: string | null;
  pays?: string | null;
  telephones?: string[] | null;
  whatsapp?: string | null;
  email?: string | null;
  site_web?: string | null;
  nif?: string | null;
  rccm?: string | null;
  compte_bancaire?: string | null;
  /** Images en data URL (ou URL accessible) — chargées avant la génération */
  logo?: string | null;
  cachet?: string | null;
  signature?: string | null;
}

export interface ClientDocument {
  nom: string;
  telephone?: string | null;
  adresse?: string | null;
  ville?: string | null;
  type_piece?: string | null;
  numero_piece?: string | null;
}

export interface VehiculeDocument {
  marque: string;
  modele: string;
  annee?: number | null;
  finition?: string | null;
  vin?: string | null;
  couleur?: string | null;
  kilometrage_km?: number | null;
  carburant?: string | null;
  transmission?: string | null;
  reference?: string | null;
}

export interface LigneDocument {
  designation: string;
  detail?: string | null;
  montant: number;
}

export interface PaiementDocument {
  date: string;
  montant: number;
  mode: string;
  reference?: string | null;
  numero_recu?: string | null;
}

export interface EcheanceDocument {
  date: string;
  montant: number;
  statut?: "payee" | "partielle" | "en_retard" | "a_venir";
}

export interface DonneesDocument {
  type: TypeDocument;
  numero: string;
  date: string;
  annule?: boolean;
  motif_annulation?: string | null;
  /** Facture d'origine (avoir, reçu) */
  reference_facture?: string | null;
  entreprise: EntrepriseDocument;
  client: ClientDocument;
  vehicule?: VehiculeDocument | null;
  lignes: LigneDocument[];
  remise?: number;
  tva: { active: boolean; taux: number; mention?: string | null };
  totaux: { ht: number; tva: number; ttc: number };
  paiements?: PaiementDocument[];
  /** Reçu : le versement objet du reçu */
  paiement?: PaiementDocument | null;
  echeances?: EcheanceDocument[];
  livraison_a_l_arrivee?: boolean;
  valide_jusqu_au?: string | null;
  mentions?: { conditions?: string | null; pied?: string | null; garantie?: string | null };
  options?: { montant_en_lettres?: boolean; qr_verification?: boolean; couleur?: string | null };
  /** Adresse encodée dans le QR code */
  url_verification?: string | null;
  /** QR déjà rendu en data URL (PNG) */
  qr?: string | null;
}
