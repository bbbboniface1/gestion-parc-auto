"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Vente } from "@/types";
import { modifierVente } from "@/lib/services/ventes";
import { useAppStore } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowPathIcon, PencilSquareIcon } from "@heroicons/react/24/solid";

const modifierSchema = z
  .object({
    client_nom: z.string().min(1, "Nom obligatoire"),
    client_telephone: z.string().optional(),
    client_adresse: z.string().optional(),
    prix_vente_fcfa: z.coerce.number().positive(),
    montant_recu_fcfa: z.coerce.number().min(0),
  })
  .refine((d) => d.montant_recu_fcfa <= d.prix_vente_fcfa, {
    message: "Le montant reçu ne peut pas dépasser le prix",
    path: ["montant_recu_fcfa"],
  });

type ModifierForm = z.infer<typeof modifierSchema>;

interface ModifierVenteDialogProps {
  vente: Vente;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ModifierVenteDialog({
  vente,
  open,
  onOpenChange,
  onSuccess,
}: ModifierVenteDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const bumpDataVersion = useAppStore((s) => s.bumpDataVersion);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ModifierForm>({
    resolver: zodResolver(modifierSchema),
    defaultValues: {
      client_nom: vente.client_nom,
      client_telephone: vente.client_telephone ?? "",
      client_adresse: vente.client_adresse ?? "",
      prix_vente_fcfa: vente.prix_vente_fcfa,
      montant_recu_fcfa: vente.montant_recu_fcfa,
    },
  });

  const onSubmit = async (data: ModifierForm) => {
    setIsLoading(true);
    const { error } = await modifierVente({
      venteId: vente.id,
      ...data,
    });

    if (error) {
      toast.error("Erreur : " + error);
      setIsLoading(false);
      return;
    }

    toast.success("Vente modifiée");
    bumpDataVersion();
    onOpenChange(false);
    onSuccess?.();
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PencilSquareIcon className="w-5 h-5" />
            Modifier {vente.numero_facture}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client_nom">Nom client *</Label>
            <Input id="client_nom" {...register("client_nom")} />
            {errors.client_nom && <p className="text-red-600 text-sm">{errors.client_nom.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="client_telephone">Téléphone</Label>
            <Input id="client_telephone" {...register("client_telephone")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client_adresse">Adresse</Label>
            <Input id="client_adresse" {...register("client_adresse")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prix_vente_fcfa">Prix vente (FCFA)</Label>
            <Input id="prix_vente_fcfa" type="number" {...register("prix_vente_fcfa")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="montant_recu_fcfa">Montant reçu (FCFA)</Label>
            <Input id="montant_recu_fcfa" type="number" {...register("montant_recu_fcfa")} />
            {errors.montant_recu_fcfa && (
              <p className="text-red-600 text-sm">{errors.montant_recu_fcfa.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full gap-2" disabled={isLoading}>
            {isLoading ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
            ) : (
              "Enregistrer"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
