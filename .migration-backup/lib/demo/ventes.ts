import type { Vente } from "@/types";
import { loadDemoStore, saveDemoStore } from "./storage";

export function annulerVenteDemo(
  venteId: string,
  cancelReason?: string,
  cancelledFromModule = "factures",
  cancelledBy?: string
) {
  const store = loadDemoStore();
  const vente = store.ventes.find((v) => v.id === venteId);

  if (!vente) throw new Error("Vente introuvable");
  if (vente.status === "annulee") throw new Error("Vente déjà annulée");

  vente.status = "annulee";
  vente.cancelled_at = new Date().toISOString();
  vente.cancel_reason = cancelReason ?? null;
  vente.cancelled_from_module = cancelledFromModule;
  vente.cancelled_by = cancelledBy ?? null;

  const voiture = store.voitures.find((v) => v.id === vente.voiture_id);
  if (voiture) voiture.statut = "en_stock";

  saveDemoStore(store);
}

export function modifierVenteDemo(
  venteId: string,
  payload: Pick<Vente, "client_nom" | "client_telephone" | "client_adresse" | "montant_recu_fcfa" | "statut_paiement">
): Vente {
  const store = loadDemoStore();
  const index = store.ventes.findIndex((v) => v.id === venteId);
  if (index === -1) throw new Error("Vente introuvable");

  store.ventes[index] = { ...store.ventes[index], ...payload };
  saveDemoStore(store);
  return store.ventes[index];
}
