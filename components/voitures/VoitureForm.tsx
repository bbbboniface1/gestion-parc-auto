"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { voitureSchema, type VoitureSchemaType } from "@/lib/schemas";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUTS_VOITURE, PAIEMENT_FOURNISSEUR, CARBURANTS, TRANSMISSIONS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, Upload } from "lucide-react";

interface VoitureFormProps {
  voiture?: Voiture;
  onSuccess?: (voiture: Voiture) => void;
}

export function VoitureForm({ voiture, onSuccess }: VoitureFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<VoitureSchemaType>({
    resolver: zodResolver(voitureSchema),
    mode: "onChange",
    defaultValues: voiture
      ? {
          marque: voiture.marque,
          modele: voiture.modele,
          annee: voiture.annee,
          couleur: voiture.couleur ?? "",
          numero_chassis: voiture.numero_chassis ?? "",
          kilometrage: voiture.kilometrage ?? undefined,
          carburant: voiture.carburant ?? undefined,
          transmission: voiture.transmission ?? undefined,
          photo_url: voiture.photo_url ?? "",
          statut: voiture.statut,
          prix_achat_usd: voiture.prix_achat_usd ?? undefined,
          frais_transport: voiture.frais_transport ?? undefined,
          prix_vente_fcfa: voiture.prix_vente_fcfa ?? undefined,
          prix_vente_usd: voiture.prix_vente_usd ?? undefined,
          paiement_fournisseur: voiture.paiement_fournisseur,
          montant_paye_fournisseur: voiture.montant_paye_fournisseur ?? undefined,
          date_paiement_fournisseur: voiture.date_paiement_fournisseur ?? "",
          date_commande: voiture.date_commande ?? "",
          date_expedition: voiture.date_expedition ?? "",
          date_arrivee_prevue: voiture.date_arrivee_prevue ?? "",
          date_arrivee_reelle: voiture.date_arrivee_reelle ?? "",
          numero_conteneur: voiture.numero_conteneur ?? "",
          port_depart: voiture.port_depart ?? "USA",
          notes: voiture.notes ?? "",
        }
      : {
          statut: "commande",
          paiement_fournisseur: "non_paye",
          port_depart: "USA",
        },
  });

  const paiementFournisseur = watch("paiement_fournisseur");

  const uploadPhoto = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("voitures-photos")
      .upload(fileName, file);

    if (error) {
      toast.error("Erreur upload photo : " + error.message);
      return null;
    }

    const { data } = supabase.storage.from("voitures-photos").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const onSubmit = async (data: VoitureSchemaType) => {
    setIsLoading(true);

    try {
      let photoUrl = data.photo_url || null;

      if (photoFile) {
        const uploaded = await uploadPhoto(photoFile);
        if (uploaded) photoUrl = uploaded;
      }

      const payload = {
        ...data,
        photo_url: photoUrl,
        couleur: data.couleur || null,
        numero_chassis: data.numero_chassis || null,
        kilometrage: data.kilometrage || null,
        carburant: data.carburant || null,
        transmission: data.transmission || null,
        frais_transport: data.frais_transport || null,
        prix_vente_usd: data.prix_vente_usd || null,
        montant_paye_fournisseur: data.montant_paye_fournisseur || 0,
        date_paiement_fournisseur: data.date_paiement_fournisseur || null,
        date_commande: data.date_commande || null,
        date_expedition: data.date_expedition || null,
        date_arrivee_prevue: data.date_arrivee_prevue || null,
        date_arrivee_reelle: data.date_arrivee_reelle || null,
        numero_conteneur: data.numero_conteneur || null,
        notes: data.notes || null,
      };

      if (voiture) {
        const { data: updated, error } = await supabase
          .from("voitures")
          .update(payload)
          .eq("id", voiture.id)
          .select()
          .single();

        if (error) throw error;
        toast.success("Voiture modifiée avec succès !");
        onSuccess?.(updated);
      } else {
        const { data: created, error } = await supabase
          .from("voitures")
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        toast.success("Voiture ajoutée avec succès !");
        onSuccess?.(created);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      toast.error("Erreur : " + message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Section 1 — Informations */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Informations de la voiture</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="marque">Marque *</Label>
            <Input id="marque" {...register("marque")} placeholder="Toyota" />
            {errors.marque && <p className="text-red-600 text-sm">{errors.marque.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="modele">Modèle *</Label>
            <Input id="modele" {...register("modele")} placeholder="Camry" />
            {errors.modele && <p className="text-red-600 text-sm">{errors.modele.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="annee">Année *</Label>
            <Input id="annee" type="number" {...register("annee")} placeholder="2020" />
            {errors.annee && <p className="text-red-600 text-sm">{errors.annee.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="couleur">Couleur</Label>
            <Input id="couleur" {...register("couleur")} placeholder="Blanc" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="numero_chassis">Numéro de châssis (VIN)</Label>
            <Input id="numero_chassis" {...register("numero_chassis")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kilometrage">Kilométrage</Label>
            <Input id="kilometrage" type="number" {...register("kilometrage")} placeholder="45000" />
          </div>
          <div className="space-y-2">
            <Label>Carburant</Label>
            <Select
              value={watch("carburant") ?? ""}
              onValueChange={(v) => setValue("carburant", v as VoitureSchemaType["carburant"])}
            >
              <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
              <SelectContent>
                {CARBURANTS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Transmission</Label>
            <Select
              value={watch("transmission") ?? ""}
              onValueChange={(v) => setValue("transmission", v as VoitureSchemaType["transmission"])}
            >
              <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
              <SelectContent>
                {TRANSMISSIONS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="photo">Photo</Label>
            <div className="flex items-center gap-4">
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              />
              <Upload size={20} className="text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2 — Prix */}
      <Card>
        <CardHeader>
          <CardTitle>💰 Prix</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="prix_achat_usd">Prix d&apos;achat USA ($) *</Label>
            <Input id="prix_achat_usd" type="number" step="0.01" {...register("prix_achat_usd")} />
            {errors.prix_achat_usd && <p className="text-red-600 text-sm">{errors.prix_achat_usd.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="frais_transport">Frais transport + douane</Label>
            <Input id="frais_transport" type="number" step="0.01" {...register("frais_transport")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prix_vente_fcfa">Prix de vente souhaité (FCFA) *</Label>
            <Input id="prix_vente_fcfa" type="number" {...register("prix_vente_fcfa")} />
            {errors.prix_vente_fcfa && <p className="text-red-600 text-sm">{errors.prix_vente_fcfa.message}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Section 3 — Paiement fournisseur */}
      <Card>
        <CardHeader>
          <CardTitle>🏦 Paiement fournisseur (USA)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Statut du paiement</Label>
            <Select
              value={watch("paiement_fournisseur")}
              onValueChange={(v) => setValue("paiement_fournisseur", v as VoitureSchemaType["paiement_fournisseur"])}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAIEMENT_FOURNISSEUR.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {paiementFournisseur === "partiel" && (
            <div className="space-y-2">
              <Label htmlFor="montant_paye_fournisseur">Montant déjà payé ($)</Label>
              <Input id="montant_paye_fournisseur" type="number" step="0.01" {...register("montant_paye_fournisseur")} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="date_paiement_fournisseur">Date du paiement</Label>
            <Input id="date_paiement_fournisseur" type="date" {...register("date_paiement_fournisseur")} />
          </div>
        </CardContent>
      </Card>

      {/* Section 4 — Logistique */}
      <Card>
        <CardHeader>
          <CardTitle>🚢 Logistique</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Statut de la voiture *</Label>
            <Select
              value={watch("statut")}
              onValueChange={(v) => setValue("statut", v as VoitureSchemaType["statut"])}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUTS_VOITURE.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date_commande">Date de commande</Label>
            <Input id="date_commande" type="date" {...register("date_commande")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date_expedition">Date d&apos;expédition</Label>
            <Input id="date_expedition" type="date" {...register("date_expedition")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="numero_conteneur">Numéro de conteneur</Label>
            <Input id="numero_conteneur" {...register("numero_conteneur")} placeholder="MSCU123456" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date_arrivee_prevue">Date d&apos;arrivée prévue</Label>
            <Input id="date_arrivee_prevue" type="date" {...register("date_arrivee_prevue")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date_arrivee_reelle">Date d&apos;arrivée réelle</Label>
            <Input id="date_arrivee_reelle" type="date" {...register("date_arrivee_reelle")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} placeholder="Notes libres..." />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" size="lg" className="w-full md:w-auto" disabled={isLoading || !isValid}>
        {isLoading ? (
          <Loader2 className="animate-spin" size={20} />
        ) : (
          <>
            <Save size={20} />
            {voiture ? "Enregistrer les modifications" : "Ajouter la voiture"}
          </>
        )}
      </Button>
    </form>
  );
}
