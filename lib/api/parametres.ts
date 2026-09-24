"use client";

import { useLecture } from "./requetes";
import { useOrg } from "@/lib/session";
import type { BaremeDouane } from "@/lib/estimation";
import type { ModePaiement, Role } from "@/lib/domaine";

export interface Parametres {
  nom_commercial: string;
  raison_sociale: string | null;
  slogan: string | null;
  adresse: string | null;
  ville: string | null;
  pays: string;
  telephones: string[];
  whatsapp: string | null;
  email: string | null;
  site_web: string | null;
  nif: string | null;
  rccm: string | null;
  compte_bancaire: string | null;
  logo_path: string | null;
  cachet_path: string | null;
  signature_path: string | null;
  format_numero: string;
  padding: number;
  remise_annuelle: boolean;
  prefixe_facture: string;
  prefixe_proforma: string;
  prefixe_recu: string;
  prefixe_avoir: string;
  prefixe_vehicule: string;
  prefixe_expedition: string;
  tva_active: boolean;
  tva_taux: number;
  mention_tva: string | null;
  conditions_vente: string | null;
  pied_document: string | null;
  validite_proforma_jours: number;
  montant_en_lettres: boolean;
  qr_verification: boolean;
  couleur_documents: string;
  garantie_texte: string | null;
  modele_message_whatsapp: string | null;
  taux_usd: number;
  taux_eur: number;
  taux_maj_le: string;
  modes_paiement: ModePaiement[];
  commission_vendeur_pct: number;
  alerte_stock_jours: number;
  alerte_port_jours: number;
  masquer_couts_vendeurs: boolean;
  vendeur_voit_plancher: boolean;
  unite_compteur: "km" | "mi";
  bareme_douane: BaremeDouane;
  updated_at: string;
}

export interface ReponseParametres {
  organisation: { id: string; nom: string; pays: string; devise: string; plan: string; essai_fin: string | null; created_at: string };
  mon_role: Role;
  voit_couts: boolean;
  voit_plancher: boolean;
  parametres: Parametres;
}

/** Paramètres de l'entreprise active : taux, barème, préférences — relus rarement. */
export function useParametres() {
  const org = useOrg();
  return useLecture<ReponseParametres>("parametres_obtenir", { p_org: org.id }, { staleTime: 5 * 60_000 });
}

/** Taux vers le FCFA pour une devise, d'après les paramètres. */
export function tauxPour(devise: "XOF" | "USD" | "EUR", p: Parametres | undefined): number | null {
  if (devise === "XOF") return 1;
  if (!p) return null;
  return devise === "USD" ? Number(p.taux_usd) : Number(p.taux_eur);
}
