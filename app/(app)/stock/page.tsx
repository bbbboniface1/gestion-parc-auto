"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Voiture } from "@/types";
import { VoitureCard } from "@/components/voitures/VoitureCard";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatFCFA } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";

const PAGE_SIZE = 24;

export default function StockPage() {
  const [voitures, setVoitures] = useState<Voiture[]>([]);
  const [total, setTotal] = useState(0);
  const [valeurTotale, setValeurTotale] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const dataVersion = useAppStore((s) => s.dataVersion);

  const loadStock = useCallback(async () => {
    setIsLoading(true);
    const supabase = createClient();

    const { data, count } = await supabase
      .from("voitures")
      .select("*", { count: "exact" })
      .eq("statut", "en_stock")
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    setVoitures(data ?? []);
    setTotal(count ?? 0);

    if (page === 1) {
      const { data: allStock } = await supabase
        .from("voitures")
        .select("prix_vente_fcfa")
        .eq("statut", "en_stock");
      setValeurTotale((allStock ?? []).reduce((s, v) => s + (v.prix_vente_fcfa ?? 0), 0));
    }

    setIsLoading(false);
  }, [page, dataVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadStock(); }, [loadStock]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">📦 Stock disponible</h1>
        <p className="text-muted-foreground mt-1">
          {total} voiture(s) disponible(s) — Valeur totale : {formatFCFA(valeurTotale)}
        </p>
      </div>

      {voitures.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-4xl mb-4">📦</p>
            <p className="text-lg font-medium mb-2">Aucune voiture en stock</p>
            <p className="text-muted-foreground mb-4">Les voitures disponibles à la vente apparaîtront ici</p>
            <Link href="/voitures" className="text-primary font-medium hover:underline">Voir toutes les voitures →</Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {voitures.map((v) => <VoitureCard key={v.id} voiture={v} />)}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="gap-1">
                <ChevronLeftIcon className="w-4 h-4" />Précédent
              </Button>
              <span className="text-base">Page {page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="gap-1">
                Suivant<ChevronRightIcon className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
