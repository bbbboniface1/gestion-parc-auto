// Formes des réponses JSON des fonctions SQL (supabase/migrations/0003_api.sql, supabase/API.md).
// Les montants de coût/marge valent null pour un rôle qui ne doit pas les voir.

import type { Etape, ModePaiement, Role, StatutCommercial } from "@/lib/domaine";

export type Gravite = "haute" | "moyenne" | "info";

export interface ActionAFaire {
  type:
    | "echeance_retard" | "magasinage_port" | "stock_dormant" | "arrivee_proche" | "frais_a_payer"
    | "reservation_echue" | "livraison_en_attente" | "demande_correspondante";
  gravite: Gravite;
  titre: string;
  detail: string | null;
  entite: "vehicule" | "vente" | "expedition" | "frais" | "client" | string;
  entite_id: string;
  date: string | null;
}

export interface TableauDeBord {
  indicateurs: {
    valeur_stock_revient: number | null;
    nb_au_parc_disponibles: number;
    capital_par_etape: { etape: Etape; nb: number; montant: number | null }[];
    ventes_mois: { nb: number; ca: number; marge: number | null };
    encaisse_mois: number;
    creances_total: number;
    a_payer_fournisseurs: number | null;
  };
  actions: ActionAFaire[];
  series: { mois: string; ca: number; marge: number | null; nb: number }[];
}

export interface ExpeditionResume {
  id: string;
  reference: string;
  mode: "conteneur" | "roro";
  statut: "preparation" | "en_mer" | "arrivee" | "cloturee";
  numero_conteneur: string | null;
  compagnie: string | null;
  navire: string | null;
  port_depart: string | null;
  port_arrivee: string | null;
  date_depart: string | null;
  date_arrivee_prevue: string | null;
  date_arrivee_reelle: string | null;
}

export interface Vehicule {
  id: string;
  reference: string;
  vin: string | null;
  marque: string;
  modele: string;
  finition: string | null;
  annee: number | null;
  couleur: string | null;
  carburant: string | null;
  transmission: string | null;
  kilometrage_km: number | null;
  moteur: string | null;
  source: string | null;
  lot_numero: string | null;
  date_achat: string | null;
  lieu_achat: string | null;
  titre: string | null;
  dommage_principal: string | null;
  cles: boolean | null;
  demarre: boolean | null;
  etape: Etape;
  etape_depuis: string;
  statut_commercial: StatutCommercial;
  reserve_client_id: string | null;
  reserve_jusqu_au: string | null;
  reserve_client_nom: string | null;
  reservation_echue: boolean;
  expedition_id: string | null;
  prix_achat: number | null;
  devise_achat: "USD" | "EUR" | "XOF" | null;
  taux_achat: number | null;
  achat_xof: number | null;
  prix_affiche_xof: number | null;
  prix_plancher_xof: number | null;
  immatriculation: string | null;
  carte_grise: "a_faire" | "en_cours" | "obtenue" | null;
  photo_principale_path: string | null;
  notes: string | null;
  archive: boolean;
  created_at: string;
  updated_at: string;
  libelle: string;
  jours_etape: number;
  en_vente: boolean;
  frais_directs_xof: number | null;
  frais_expedition_xof: number | null;
  frais_xof: number | null;
  prix_revient_xof: number | null;
  marge_xof: number | null;
  marge_type: "reelle" | "previsionnelle" | null;
  expedition: ExpeditionResume | null;
  vente: {
    id: string; numero: string; client_id: string; client_nom: string; date_vente: string;
    date_livraison: string | null; montant_ttc: number; livree: boolean;
  } | null;
}

export interface Frais {
  id: string;
  portee: "vehicule" | "expedition" | "generale";
  vehicule_id: string | null;
  expedition_id: string | null;
  categorie: string;
  libelle: string | null;
  montant: number;
  devise: "XOF" | "USD" | "EUR";
  taux: number;
  montant_xof: number;
  part_xof?: number;
  repartition: "egale" | "valeur" | null;
  fournisseur: string | null;
  date: string;
  statut: "paye" | "a_payer";
  compte_id: string | null;
  compte_nom: string | null;
  piece_path: string | null;
  vehicule_reference?: string | null;
  vehicule_libelle?: string | null;
  expedition_reference?: string | null;
  created_at: string;
}

export interface VehiculeDetail extends Vehicule {
  etapes: { id: string; etape: Etape; date: string; note: string | null; user_nom: string | null; created_at: string }[];
  photos: { id: string; path: string; ordre: number }[];
  documents: { id: string; type: string; nom: string; path: string; taille: number | null; created_at: string }[];
  frais: Frais[] | null;
  couts_par_categorie: { categorie: string; montant_xof: number }[] | null;
  historique_ventes: { id: string; numero: string; statut: string; date_vente: string; client_nom: string; montant_ttc: number; numero_avoir: string | null }[];
  proformas: { id: string; numero: string; statut: string; statut_effectif: string; client_nom: string; montant_ttc: number; valide_jusqu_au: string | null }[];
  vin_cle_valide: boolean | null;
}

export interface OrganisationApi {
  id: string;
  nom: string;
  ville: string | null;
  role: Role;
  plan: string;
  essai_fin: string | null;
  logo_path: string | null;
  nom_affiche: string | null;
}

export type { Etape, ModePaiement, Role, StatutCommercial };
