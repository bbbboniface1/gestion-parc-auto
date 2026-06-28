export type StatutVente = "active" | "annulee";

export type StatutVoiture =
  | "commande"
  | "en_transit"
  | "arrivee"
  | "en_stock"
  | "vendue";

export type PaiementFournisseur = "non_paye" | "partiel" | "paye";

export type StatutPaiement = "non_paye" | "partiel" | "paye";

export type Carburant = "Essence" | "Diesel" | "Hybride" | "Électrique";

export type Transmission = "Automatique" | "Manuelle";

export type ModePaiement =
  | "Espèces"
  | "Virement"
  | "Orange Money"
  | "Wave"
  | "Chèque";

export interface Voiture {
  id: string;
  created_at: string;
  marque: string;
  modele: string;
  annee: number;
  couleur: string | null;
  numero_chassis: string | null;
  kilometrage: number | null;
  carburant: Carburant | null;
  transmission: Transmission | null;
  photo_url: string | null;
  statut: StatutVoiture;
  prix_achat_usd: number | null;
  frais_transport: number | null;
  prix_vente_fcfa: number | null;
  prix_vente_usd: number | null;
  paiement_fournisseur: PaiementFournisseur;
  montant_paye_fournisseur: number | null;
  date_paiement_fournisseur: string | null;
  date_commande: string | null;
  date_expedition: string | null;
  date_arrivee_prevue: string | null;
  date_arrivee_reelle: string | null;
  numero_conteneur: string | null;
  port_depart: string | null;
  notes: string | null;
}

export interface Vente {
  id: string;
  created_at: string;
  voiture_id: string;
  client_nom: string;
  client_telephone: string | null;
  client_adresse: string | null;
  prix_vente_fcfa: number;
  montant_recu_fcfa: number;
  mode_paiement: ModePaiement | null;
  statut_paiement: StatutPaiement;
  date_vente: string;
  numero_facture: string | null;
  notes: string | null;
  status: StatutVente;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  cancelled_from_module: string | null;
  voiture?: Voiture;
}

export interface PaiementVente {
  id: string;
  created_at: string;
  vente_id: string;
  montant_fcfa: number;
  mode_paiement: string | null;
  date_paiement: string;
  notes: string | null;
}

export interface Parametres {
  id: string;
  created_at: string;
  updated_at: string;
  nom_entreprise: string;
  adresse: string;
  telephone: string;
  email: string | null;
  logo_url: string | null;
  taux_change_usd_fcfa: number;
}

export interface DashboardStats {
  total_commandes: number;
  total_en_transit: number;
  total_arrivees: number;
  total_en_stock: number;
  total_vendues: number;
  total_parc: number;
  montant_paye_usa: number | null;
  montant_du_usa: number | null;
  montant_total_usa: number | null;
  total_encaisse_fcfa: number | null;
  total_restant_fcfa: number | null;
}

export type VoitureFormData = Omit<
  Voiture,
  "id" | "created_at"
>;

export type VenteFormData = {
  client_nom: string;
  client_telephone?: string;
  client_adresse?: string;
  prix_vente_fcfa: number;
  montant_recu_fcfa: number;
  mode_paiement?: ModePaiement;
  date_vente: string;
  notes?: string;
};
