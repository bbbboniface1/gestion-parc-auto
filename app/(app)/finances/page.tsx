"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Voiture, Vente } from "@/types";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaiementBadge } from "@/components/voitures/PaiementBadge";
import { formatFCFA, formatUSD, getVoitureTitre, isVenteActive } from "@/lib/utils";
import { getStatutPaiementConfig } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

interface VenteWithVoiture extends Vente {
  voiture: Voiture;
}

export default function FinancesPage() {
  const [voitures, setVoitures] = useState<Voiture[]>([]);
  const [ventes, setVentes] = useState<VenteWithVoiture[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const dataVersion = useAppStore((s) => s.dataVersion);

  useEffect(() => {
    async function loadData() {
      const [voituresRes, ventesRes] = await Promise.all([
        supabase.from("voitures").select("*").order("marque"),
        supabase.from("ventes").select("*, voiture:voitures(*)").order("date_vente", { ascending: false }),
      ]);

      setVoitures(voituresRes.data ?? []);
      setVentes(((ventesRes.data as VenteWithVoiture[]) ?? []).filter(isVenteActive));
      setIsLoading(false);
    }
    loadData();
  }, [supabase, dataVersion]);

  if (isLoading) return <Spinner />;

  const totalAchat = voitures.reduce((s, v) => s + (v.prix_achat_usd ?? 0), 0);
  const totalPaye = voitures.reduce((s, v) => s + (v.montant_paye_fournisseur ?? (v.paiement_fournisseur === "paye" ? v.prix_achat_usd ?? 0 : 0)), 0);
  const totalResteUSA = totalAchat - totalPaye;

  const totalVente = ventes.reduce((s, v) => s + v.prix_vente_fcfa, 0);
  const totalEncaisse = ventes.reduce((s, v) => s + v.montant_recu_fcfa, 0);
  const totalResteMali = totalVente - totalEncaisse;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">💰 Finances</h1>
        <p className="text-muted-foreground mt-1">Résumé financier complet</p>
      </div>

      <Tabs defaultValue="usa">
        <TabsList>
          <TabsTrigger value="usa">🏦 Paiements USA</TabsTrigger>
          <TabsTrigger value="mali">💚 Encaissements Mali</TabsTrigger>
        </TabsList>

        <TabsContent value="usa" className="space-y-4">
          <div className="space-y-3">
            {voitures.map((v) => {
              const paye = v.paiement_fournisseur === "paye"
                ? v.prix_achat_usd ?? 0
                : v.montant_paye_fournisseur ?? 0;
              const reste = (v.prix_achat_usd ?? 0) - paye;

              return (
                <Card key={v.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="font-bold text-base">{getVoitureTitre(v)}</p>
                        <div className="mt-1">
                          <PaiementBadge paiement={v.paiement_fournisseur} />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center sm:text-right">
                        <div>
                          <p className="text-sm text-muted-foreground">Achat</p>
                          <p className="font-semibold">{formatUSD(v.prix_achat_usd ?? 0)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Payé</p>
                          <p className="font-semibold text-emerald-600">{formatUSD(paye)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Reste</p>
                          <p className="font-semibold text-red-600">{formatUSD(reste)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center font-bold text-lg">
                <div>
                  <p className="text-sm text-muted-foreground font-normal">TOTAL</p>
                  {formatUSD(totalAchat)}
                </div>
                <div className="text-emerald-600">
                  <p className="text-sm text-muted-foreground font-normal">Payé</p>
                  {formatUSD(totalPaye)}
                </div>
                <div className="text-red-600">
                  <p className="text-sm text-muted-foreground font-normal">Reste</p>
                  {formatUSD(totalResteUSA)}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mali" className="space-y-4">
          {ventes.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Aucune vente enregistrée
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-3">
                {ventes.map((v) => {
                  const config = getStatutPaiementConfig(v.statut_paiement);
                  const reste = v.prix_vente_fcfa - v.montant_recu_fcfa;

                  return (
                    <Card key={v.id}>
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div>
                            <p className="font-bold text-base">{v.client_nom}</p>
                            <p className="text-muted-foreground text-sm">
                              {v.voiture ? getVoitureTitre(v.voiture) : "—"}
                            </p>
                            <span className={cn("inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold mt-1", config.bg, config.text)}>
                              {config.label}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-center sm:text-right">
                            <div>
                              <p className="text-sm text-muted-foreground">Prix vente</p>
                              <p className="font-semibold">{formatFCFA(v.prix_vente_fcfa)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Encaissé</p>
                              <p className="font-semibold text-emerald-600">{formatFCFA(v.montant_recu_fcfa)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Reste</p>
                              <p className="font-semibold text-red-600">{formatFCFA(reste)}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="grid grid-cols-3 gap-4 text-center font-bold text-lg">
                    <div>
                      <p className="text-sm text-muted-foreground font-normal">TOTAL</p>
                      {formatFCFA(totalVente)}
                    </div>
                    <div className="text-emerald-600">
                      <p className="text-sm text-muted-foreground font-normal">Encaissé</p>
                      {formatFCFA(totalEncaisse)}
                    </div>
                    <div className="text-red-600">
                      <p className="text-sm text-muted-foreground font-normal">Reste</p>
                      {formatFCFA(totalResteMali)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
