import type { DashboardStats } from "@/types";
import type { DemoStore } from "./storage";

function usaPaye(v: DemoStore["voitures"][0]): number {
  if (v.paiement_fournisseur === "paye") return v.prix_achat_usd ?? 0;
  if (v.paiement_fournisseur === "partiel") return v.montant_paye_fournisseur ?? 0;
  return 0;
}

function usaReste(v: DemoStore["voitures"][0]): number {
  if (v.paiement_fournisseur === "paye") return 0;
  const achat = v.prix_achat_usd ?? 0;
  if (v.paiement_fournisseur === "partiel") return achat - (v.montant_paye_fournisseur ?? 0);
  return achat;
}

export function computeDashboardStats(store: DemoStore): DashboardStats {
  const voitures = store.voitures;
  const ventes = store.ventes;

  const ventesActives = ventes.filter((v) => !v.status || v.status === "active");

  return {
    total_commandes: voitures.filter((v) => v.statut === "commande").length,
    total_en_transit: voitures.filter((v) => v.statut === "en_transit").length,
    total_arrivees: voitures.filter((v) => v.statut === "arrivee").length,
    total_en_stock: voitures.filter((v) => v.statut === "en_stock").length,
    total_vendues: voitures.filter((v) => v.statut === "vendue").length,
    total_parc: voitures.length,
    montant_paye_usa: voitures.reduce((s, v) => s + usaPaye(v), 0),
    montant_du_usa: voitures.reduce((s, v) => s + usaReste(v), 0),
    montant_total_usa: voitures.reduce((s, v) => s + (v.prix_achat_usd ?? 0), 0),
    total_encaisse_fcfa: ventesActives.reduce((s, v) => s + v.montant_recu_fcfa, 0),
    total_restant_fcfa: ventesActives.reduce(
      (s, v) => s + Math.max(0, v.prix_vente_fcfa - v.montant_recu_fcfa),
      0
    ),
  };
}
