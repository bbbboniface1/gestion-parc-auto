// Formes des ventes, clients, expéditions et finances (supabase/migrations/0003_api.sql).
import type { ModePaiement, StatutCommercial } from "@/lib/domaine";

export type StatutPaiementVente = "non_paye" | "partiel" | "paye";
export type StatutEcheance = "payee" | "partielle" | "en_retard" | "a_venir";
export type StatutProforma = "emise" | "acceptee" | "expiree" | "convertie" | "annulee";
export type StatutExpedition = "preparation" | "en_mer" | "arrivee" | "cloturee";

export interface VenteListe {
  id: string;
  numero: string;
  date_vente: string;
  date_livraison: string | null;
  livree: boolean;
  statut: "active" | "annulee";
  mode: "comptant" | "echelonne";
  numero_avoir: string | null;
  client_id: string;
  client_nom: string;
  client_telephone: string | null;
  vehicule_id: string;
  vehicule_reference: string;
  vehicule_libelle: string;
  vehicule_photo: string | null;
  vehicule_etape: string;
  montant_ttc: number;
  montant_ht: number;
  encaisse_xof: number;
  reste_xof: number;
  statut_paiement: StatutPaiementVente;
  retard_xof: number;
  prochaine_echeance: string | null;
  prochaine_echeance_xof: number | null;
  marge_xof: number | null;
}

export interface PaiementVente {
  id: string;
  vente_id: string;
  numero_recu: string;
  date: string;
  montant_xof: number;
  mode: ModePaiement;
  reference: string | null;
  compte_id: string | null;
  compte_nom: string | null;
  notes: string | null;
  annule: boolean;
  annule_le: string | null;
  motif_annulation: string | null;
  type: "encaissement" | "remboursement";
  vente_numero?: string;
  client_nom?: string;
}

export interface EcheanceVente {
  id: string;
  date_echeance: string;
  montant_xof: number;
  impute_xof: number;
  reste_xof: number;
  statut: StatutEcheance;
}

export interface VenteDetail {
  id: string;
  numero: string;
  vehicule_id: string;
  client_id: string;
  vendeur_id: string;
  date_vente: string;
  date_livraison: string | null;
  livree: boolean;
  prix_xof: number;
  remise_xof: number;
  tva_taux: number;
  montant_ht: number;
  montant_tva: number;
  montant_ttc: number;
  mode: "comptant" | "echelonne";
  statut: "active" | "annulee";
  annulee_le: string | null;
  motif_annulation: string | null;
  numero_avoir: string | null;
  notes: string | null;
  created_at: string;
  token_verification: string;
  encaisse_xof: number;
  reste_xof: number;
  statut_paiement: StatutPaiementVente;
  retard_xof: number;
  a_rembourser_xof: number;
  client: { id: string; nom: string; telephone: string | null; whatsapp: string | null; ville: string | null; adresse: string | null; type_piece: string | null; numero_piece: string | null };
  vehicule: { id: string; reference: string; libelle: string; marque: string; modele: string; annee: number | null; vin: string | null; etape: string; statut_commercial: StatutCommercial; photo_principale_path: string | null };
  vendeur_nom: string | null;
  paiements: PaiementVente[];
  echeances: EcheanceVente[];
  proforma: { id: string; numero: string } | null;
  documents: { id: string; type: string; nom: string; path: string; created_at: string }[];
  prix_revient_xof: number | null;
  marge_xof: number | null;
  marge_pct: number | null;
  snapshot: unknown;
}

export interface ProformaListe {
  id: string;
  numero: string;
  date: string;
  valide_jusqu_au: string;
  statut: StatutProforma;
  statut_effectif: StatutProforma;
  client_id: string;
  client_nom: string;
  vehicule_id: string;
  vehicule_reference?: string;
  vehicule_libelle?: string | null;
  montant_ttc: number;
  vente_id: string | null;
}

export interface ClientListe {
  id: string;
  nom: string;
  telephone: string | null;
  whatsapp: string | null;
  email: string | null;
  ville: string | null;
  adresse: string | null;
  type_piece: string | null;
  numero_piece: string | null;
  notes: string | null;
  nb_achats: number;
  total_achats_xof: number;
  reste_du_xof: number;
  derniere_vente: string | null;
  nb_demandes_ouvertes: number;
}

export interface Demande {
  id: string;
  client_id: string;
  client_nom?: string;
  marque: string | null;
  modele: string | null;
  annee_min: number | null;
  annee_max: number | null;
  budget_max_xof: number | null;
  notes: string | null;
  statut: "ouverte" | "satisfaite" | "abandonnee";
  created_at: string;
  nb_correspondances?: number;
}

export interface Correspondance {
  demande: Demande & { client_telephone: string | null };
  vehicule: {
    id: string; reference: string; libelle: string; marque: string; modele: string; annee: number | null;
    etape: string; statut_commercial: StatutCommercial; prix_affiche_xof: number | null;
    photo_principale_path: string | null; date_arrivee_prevue: string | null;
  };
}

export interface ClientDetail extends Omit<ClientListe, "nb_achats" | "nb_demandes_ouvertes"> {
  ventes: {
    id: string; numero: string; date_vente: string; date_livraison: string | null; statut: "active" | "annulee";
    numero_avoir: string | null; montant_ttc: number; encaisse_xof: number; reste_xof: number;
    statut_paiement: StatutPaiementVente; retard_xof: number; vehicule_id: string; vehicule_reference: string; vehicule_libelle: string;
  }[];
  paiements: PaiementVente[];
  proformas: ProformaListe[];
  demandes: Demande[];
  reservations: { vehicule_id: string; reference: string; libelle: string; reserve_jusqu_au: string | null; etape: string }[];
  total_achats_xof: number;
}

export interface ExpeditionVehicule {
  id: string;
  reference: string;
  libelle: string;
  marque?: string;
  modele?: string;
  annee?: number | null;
  vin?: string | null;
  etape: string;
  statut_commercial: StatutCommercial;
  photo_principale_path?: string | null;
  achat_xof?: number | null;
  part_frais_xof?: number | null;
}

export interface ExpeditionListe {
  id: string;
  reference: string;
  mode: "conteneur" | "roro";
  numero_conteneur: string | null;
  numero_bl: string | null;
  compagnie: string | null;
  navire: string | null;
  port_depart: string | null;
  port_arrivee: string | null;
  date_depart: string | null;
  date_arrivee_prevue: string | null;
  date_arrivee_reelle: string | null;
  statut: StatutExpedition;
  notes: string | null;
  nb_vehicules: number;
  frais_xof: number | null;
  jours_avant_arrivee: number | null;
  vehicules: ExpeditionVehicule[];
}

export interface ExpeditionDetail extends ExpeditionListe {
  frais: {
    id: string; categorie: string; libelle: string | null; montant: number; devise: string; taux: number;
    montant_xof: number; date: string; statut: string; fournisseur: string | null;
    parts: { vehicule_id: string; vehicule_reference: string; part_xof: number }[];
  }[] | null;
  total_frais_xof: number | null;
  documents: { id: string; type: string; nom: string; path: string; created_at: string }[];
}

export interface Compte {
  id: string;
  nom: string;
  type: "caisse" | "mobile_money" | "banque";
  solde_initial: number | null;
  actif: boolean;
  ordre: number;
  solde_xof: number | null;
}

export interface MouvementTresorerie {
  date: string;
  type: string;
  libelle: string;
  montant_xof: number;
  compte_id: string | null;
  compte_nom: string | null;
  entite: string | null;
  entite_id: string | null;
}

export interface Creance {
  vente_id: string;
  numero: string;
  date_vente: string;
  client_id: string;
  client_nom: string;
  client_telephone: string | null;
  vehicule_reference: string;
  vehicule_libelle: string;
  montant_ttc: number;
  encaisse_xof: number;
  reste_xof: number;
  retard_xof: number;
  premiere_echeance_retard: string | null;
  jours_retard: number | null;
  jours_depuis_vente: number;
}

export interface Tresorerie {
  periode: { du: string; au: string };
  comptes: (Compte & { entrees_periode: number; sorties_periode: number })[];
  mouvements: MouvementTresorerie[];
  depenses_par_categorie: { categorie: string; montant_xof: number }[];
  creances: Creance[];
  totaux: { solde_total: number; entrees_periode: number; sorties_periode: number; achats_vehicules_periode: number };
}

export interface LigneMarge {
  vente_id: string;
  numero: string;
  date_vente: string;
  vehicule_id: string;
  vehicule_reference: string;
  vehicule_libelle: string;
  client_nom: string;
  montant_ht: number;
  montant_ttc: number;
  prix_revient_xof: number;
  marge_xof: number;
  marge_pct: number | null;
  jours_stock: number;
}

export interface RapportMarges {
  periode: { du: string; au: string };
  totaux: { nb: number; ca: number; prix_revient: number; marge: number; marge_pct: number | null; jours_stock_moyen: number | null };
  ventes: LigneMarge[];
  par_marque: { marque: string; nb: number; ca: number; marge: number; marge_pct: number | null }[];
}
