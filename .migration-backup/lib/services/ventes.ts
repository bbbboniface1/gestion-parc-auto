import { isDemoMode } from "@/lib/demo";
import { annulerVenteDemo } from "@/lib/demo/ventes";
import { createClient } from "@/lib/supabase/client";
import { calculerStatutPaiement } from "@/lib/utils";
import type { Vente } from "@/types";

export interface AnnulerVenteParams {
  venteId: string;
  cancelReason?: string;
  cancelledFromModule?: string;
  cancelledBy?: string;
}

export async function annulerVente({
  venteId,
  cancelReason,
  cancelledFromModule = "factures",
  cancelledBy,
}: AnnulerVenteParams): Promise<{ error: string | null }> {
  if (isDemoMode()) {
    try {
      annulerVenteDemo(venteId, cancelReason, cancelledFromModule, cancelledBy);
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Erreur inconnue" };
    }
  }

  const supabase = createClient();

  const { error: rpcError } = await supabase.rpc("annuler_vente", {
    p_vente_id: venteId,
    p_cancel_reason: cancelReason ?? null,
    p_cancelled_from_module: cancelledFromModule,
    p_cancelled_by: cancelledBy ?? null,
  });

  if (!rpcError) return { error: null };

  const { data: vente, error: fetchError } = await supabase
    .from("ventes")
    .select("id, voiture_id, status")
    .eq("id", venteId)
    .single();

  if (fetchError || !vente) return { error: "Vente introuvable" };
  if (vente.status === "annulee") return { error: "Vente déjà annulée" };

  const { error: updateVenteError } = await supabase
    .from("ventes")
    .update({
      status: "annulee",
      cancelled_at: new Date().toISOString(),
      cancelled_by: cancelledBy ?? null,
      cancel_reason: cancelReason ?? null,
      cancelled_from_module: cancelledFromModule,
    })
    .eq("id", venteId);

  if (updateVenteError) return { error: updateVenteError.message };

  const { error: updateVoitureError } = await supabase
    .from("voitures")
    .update({ statut: "en_stock" })
    .eq("id", vente.voiture_id);

  if (updateVoitureError) {
    await supabase
      .from("ventes")
      .update({
        status: "active",
        cancelled_at: null,
        cancelled_by: null,
        cancel_reason: null,
        cancelled_from_module: null,
      })
      .eq("id", venteId);
    return { error: updateVoitureError.message };
  }

  return { error: null };
}

export interface ModifierVenteParams {
  venteId: string;
  client_nom: string;
  client_telephone?: string;
  client_adresse?: string;
  montant_recu_fcfa: number;
  prix_vente_fcfa: number;
}

export async function modifierVente(
  params: ModifierVenteParams
): Promise<{ data: Vente | null; error: string | null }> {
  const statut_paiement = calculerStatutPaiement(
    params.prix_vente_fcfa,
    params.montant_recu_fcfa
  );

  const payload = {
    client_nom: params.client_nom,
    client_telephone: params.client_telephone || null,
    client_adresse: params.client_adresse || null,
    montant_recu_fcfa: params.montant_recu_fcfa,
    statut_paiement,
  };

  if (isDemoMode()) {
    const { modifierVenteDemo } = await import("@/lib/demo/ventes");
    try {
      const data = modifierVenteDemo(params.venteId, payload);
      return { data, error: null };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : "Erreur inconnue" };
    }
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("ventes")
    .update(payload)
    .eq("id", params.venteId)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}
