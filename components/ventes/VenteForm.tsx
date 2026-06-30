"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { venteSchema, type VenteSchemaType } from "@/lib/schemas";
import type { Voiture } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MODES_PAIEMENT } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { calculerStatutPaiement, getProchainNumeroFacture } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { ArrowPathIcon, ShoppingCartIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";

interface VenteFormProps {
  voiture: Voiture;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VenteForm({ voiture, open, onOpenChange }: VenteFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const bumpDataVersion = useAppStore((s) => s.bumpDataVersion);

  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<VenteSchemaType>({
    resolver: zodResolver(venteSchema),
    mode: "onChange",
    defaultValues: {
      prix_vente_fcfa: voiture.prix_vente_fcfa ?? undefined,
      montant_recu_fcfa: 0,
      date_vente: today,
    },
  });

  const onSubmit = async (data: VenteSchemaType) => {
    if (voiture.statut !== "en_stock") {
      toast.error("La voiture doit être en stock pour être vendue");
      return;
    }

    setIsLoading(true);

    try {
      const numeroFacture = await getProchainNumeroFacture(supabase);
      const statutPaiement = calculerStatutPaiement(data.prix_vente_fcfa, data.montant_recu_fcfa);

      const { data: vente, error: venteError } = await supabase
        .from("ventes")
        .insert({
          voiture_id: voiture.id,
          client_nom: data.client_nom,
          client_telephone: data.client_telephone || null,
          client_adresse: data.client_adresse || null,
          prix_vente_fcfa: data.prix_vente_fcfa,
          montant_recu_fcfa: data.montant_recu_fcfa,
          mode_paiement: data.mode_paiement || null,
          statut_paiement: statutPaiement,
          date_vente: data.date_vente,
          numero_facture: numeroFacture,
          notes: data.notes || null,
          status: "active",
        })
        .select()
        .single();

      if (venteError) throw venteError;

      const { error: voitureError } = await supabase
        .from("voitures")
        .update({ statut: "vendue" })
        .eq("id", voiture.id);

      if (voitureError) throw voitureError;

      if (data.montant_recu_fcfa > 0) {
        await supabase.from("paiements_vente").insert({
          vente_id: vente.id,
          montant_fcfa: data.montant_recu_fcfa,
          mode_paiement: data.mode_paiement || null,
          date_paiement: data.date_vente,
        });
      }

      toast.success(`Vente enregistrée ! Facture ${numeroFacture} générée.`);
      bumpDataVersion();
      onOpenChange(false);
      router.push(`/ventes/${vente.id}/facture`);
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      toast.error("Erreur : " + message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCartIcon className="w-6 h-6" />
            Vendre : {voiture.marque} {voiture.modele} {voiture.annee}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client_nom">Nom du client *</Label>
            <Input id="client_nom" {...register("client_nom")} placeholder="Moussa Traoré" />
            {errors.client_nom && <p className="text-red-600 text-sm">{errors.client_nom.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_telephone">Téléphone</Label>
            <Input id="client_telephone" {...register("client_telephone")} placeholder="+223 70 00 00 00" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_adresse">Adresse</Label>
            <Input id="client_adresse" {...register("client_adresse")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prix_vente_fcfa">Prix de vente (FCFA) *</Label>
            <Input id="prix_vente_fcfa" type="number" {...register("prix_vente_fcfa")} />
            {errors.prix_vente_fcfa && <p className="text-red-600 text-sm">{errors.prix_vente_fcfa.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="montant_recu_fcfa">Montant reçu aujourd&apos;hui</Label>
            <Input id="montant_recu_fcfa" type="number" {...register("montant_recu_fcfa")} />
            {errors.montant_recu_fcfa && (
              <p className="text-red-600 text-sm">{errors.montant_recu_fcfa.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Mode de paiement</Label>
            <Select
              value={watch("mode_paiement") ?? ""}
              onValueChange={(v) => setValue("mode_paiement", v as VenteSchemaType["mode_paiement"])}
            >
              <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
              <SelectContent>
                {MODES_PAIEMENT.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date_vente">Date de vente</Label>
            <Input id="date_vente" type="date" {...register("date_vente")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} />
          </div>

          <Button type="submit" className="w-full gap-2 transition-all hover:shadow-md" disabled={isLoading || !isValid}>
            {isLoading ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <ShoppingCartIcon className="w-5 h-5" />
                Enregistrer la vente
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
