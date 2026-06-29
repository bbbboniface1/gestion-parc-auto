"use client";

import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { parametresSchema, type ParametresSchemaType } from "@/lib/schemas";
import type { Parametres } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Loader2, Save, Upload } from "lucide-react";

export default function ParametresPage() {
  const [parametres, setParametres] = useState<Parametres | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const setStoreParametres = useAppStore((s) => s.setParametres);
  const loaded = useRef(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ParametresSchemaType>({
    resolver: zodResolver(parametresSchema),
  });

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    async function loadParametres() {
      const supabase = createClient();
      const { data } = await supabase.from("parametres").select("*").limit(1).single();
      if (data) {
        setParametres(data);
        setStoreParametres(data);
        reset({
          nom_entreprise: data.nom_entreprise,
          adresse: data.adresse,
          telephone: data.telephone,
          email: data.email ?? "",
          logo_url: data.logo_url ?? "",
          taux_change_usd_fcfa: data.taux_change_usd_fcfa,
        });
      }
      setIsLoading(false);
    }
    loadParametres();
  }, [reset, setStoreParametres]);

  const uploadLogo = async (file: File): Promise<string | null> => {
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const fileName = `logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("voitures-photos").upload(fileName, file);
    if (error) {
      toast.error("Erreur upload logo : " + error.message);
      return null;
    }
    const { data } = supabase.storage.from("voitures-photos").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const onSubmit = async (data: ParametresSchemaType) => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      let logoUrl = data.logo_url || null;
      if (logoFile) {
        const uploaded = await uploadLogo(logoFile);
        if (uploaded) logoUrl = uploaded;
      }

      const payload = {
        ...data,
        email: data.email || null,
        logo_url: logoUrl,
        updated_at: new Date().toISOString(),
      };

      if (parametres) {
        const { data: updated, error } = await supabase
          .from("parametres")
          .update(payload)
          .eq("id", parametres.id)
          .select()
          .single();
        if (error) throw error;
        setParametres(updated);
        setStoreParametres(updated);
      } else {
        const { data: created, error } = await supabase
          .from("parametres")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setParametres(created);
        setStoreParametres(created);
      }

      toast.success("Paramètres enregistrés !");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      toast.error("Erreur : " + message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">⚙️ Paramètres</h1>
        <p className="text-muted-foreground mt-1">Configuration de votre entreprise</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>🏢 Informations entreprise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nom_entreprise">Nom de l&apos;entreprise *</Label>
              <Input id="nom_entreprise" {...register("nom_entreprise")} />
              {errors.nom_entreprise && <p className="text-red-600 text-sm">{errors.nom_entreprise.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="adresse">Adresse *</Label>
              <Input id="adresse" {...register("adresse")} />
              {errors.adresse && <p className="text-red-600 text-sm">{errors.adresse.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="telephone">Téléphone *</Label>
              <Input id="telephone" {...register("telephone")} placeholder="+223 XX XX XX XX" />
              {errors.telephone && <p className="text-red-600 text-sm">{errors.telephone.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-red-600 text-sm">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo">Logo</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                />
                <Upload size={20} className="text-muted-foreground" />
              </div>
              {watch("logo_url") && (
                <p className="text-sm text-muted-foreground">Logo actuel enregistré</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="taux_change_usd_fcfa">Taux de change USD → FCFA *</Label>
              <Input id="taux_change_usd_fcfa" type="number" {...register("taux_change_usd_fcfa", { valueAsNumber: true })} />
              {errors.taux_change_usd_fcfa && <p className="text-red-600 text-sm">{errors.taux_change_usd_fcfa.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>
              <Save size={20} />
              Enregistrer les paramètres
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
