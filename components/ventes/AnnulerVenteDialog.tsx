"use client";

import { useState } from "react";
import type { Vente, Voiture } from "@/types";
import { annulerVente } from "@/lib/services/ventes";
import { useAppStore } from "@/lib/store";
import { getVoitureTitre } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AnnulerVenteDialogProps {
  vente: Vente;
  voiture?: Voiture | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AnnulerVenteDialog({
  vente,
  voiture,
  open,
  onOpenChange,
  onSuccess,
}: AnnulerVenteDialogProps) {
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bumpDataVersion = useAppStore((s) => s.bumpDataVersion);

  const handleConfirm = async () => {
    setIsLoading(true);
    const { error } = await annulerVente({
      venteId: vente.id,
      cancelReason: reason || undefined,
      cancelledFromModule: "factures",
    });

    if (error) {
      toast.error("Erreur : " + error);
      setIsLoading(false);
      return;
    }

    toast.success("Vente annulée — véhicule remis en stock");
    bumpDataVersion();
    onOpenChange(false);
    setReason("");
    onSuccess?.();
    setIsLoading(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Annuler la vente {vente.numero_facture} ?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-base text-muted-foreground">
              <p>Cette opération :</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Remettra la voiture en stock</li>
                <li>Retirera les statistiques et encaissements associés</li>
                <li>Conservera la vente avec le statut « Annulée »</li>
              </ul>
              {voiture && (
                <p className="font-medium text-foreground">
                  Véhicule : {getVoitureTitre(voiture)}
                </p>
              )}
              <p className="text-red-600 font-semibold">Cette action est irréversible.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="cancel_reason">Motif (optionnel)</Label>
          <Textarea
            id="cancel_reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Raison de l'annulation..."
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Retour</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : "Confirmer l'annulation"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
