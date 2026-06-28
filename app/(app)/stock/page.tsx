"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Voiture } from "@/types";
import { VoitureCard } from "@/components/voitures/VoitureCard";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { formatFCFA } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

export default function StockPage() {
  const [voitures, setVoitures] = useState<Voiture[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const dataVersion = useAppStore((s) => s.dataVersion);

  useEffect(() => {
    async function loadStock() {
      const { data } = await supabase
        .from("voitures")
        .select("*")
        .eq("statut", "en_stock")
        .order("created_at", { ascending: false });

      setVoitures(data ?? []);
      setIsLoading(false);
    }
    loadStock();
  }, [supabase, dataVersion]);

  const valeurTotale = voitures.reduce((sum, v) => sum + (v.prix_vente_fcfa ?? 0), 0);

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">📦 Stock disponible</h1>
        <p className="text-muted-foreground mt-1">
          {voitures.length} voiture(s) disponible(s) — Valeur totale : {formatFCFA(valeurTotale)}
        </p>
      </div>

      {voitures.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-4xl mb-4">📦</p>
            <p className="text-lg font-medium mb-2">Aucune voiture en stock</p>
            <p className="text-muted-foreground mb-4">
              Les voitures disponibles à la vente apparaîtront ici
            </p>
            <Link href="/voitures" className="text-primary font-medium hover:underline">
              Voir toutes les voitures →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {voitures.map((v) => (
            <VoitureCard key={v.id} voiture={v} />
          ))}
        </div>
      )}
    </div>
  );
}
