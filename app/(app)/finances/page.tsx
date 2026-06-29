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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VenteWithVoiture extends Vente { voiture: Voiture; }

// Totaux financiers calculés côté serveur via agrégats Supabase
interface FinanceTotaux {
  totalAchatUSA: number;
  totalPayeUSA: number;
  totalVenteFCFA: number;
  totalEncaisseFCFA: number;
}

const PAGE_SIZE = 30;

export default function FinancesPage() {
  const [voitures, setVoitures] = useState<Voiture[]>([]);
  const [ventes, setVentes] = useState<VenteWithVoiture[]>([]);
  const [totaux, setTotaux] = useState<FinanceTotaux>({ totalAchatUSA: 0, totalPayeUSA: 0, totalVenteFCFA: 0, totalEncaisseFCFA: 0 });
  const [totalVoitures, setTotalVoitures] = useState(0);
  const [totalVentes, setTotalVentes] = useState(0);
  const [pageVoitures, setPageVoitures] = useState(1);
  const [pageVentes, setPageVentes] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("usa");
  const dataVersion = useAppStore((s) => s.dataVersion);

  // Charger les totaux une seule fois (requêtes légères)
  useEffect(() => {
    async function loadTotaux() {
      const supabase = createClient();
      const [voituresRes, ventesRes] = await Promise.all([
        supabase.from("voitures").select("prix_achat_usd, montant_paye_fournisseur, paiement_fournisseur"),
        supabase.from("ventes").select("prix_vente_fcfa, montant_recu_fcfa, status").eq("status", "active"),
      ]);

      const vRows = voituresRes.data ?? [];
      const venRows = ventesRes.data ?? [];

      setTotaux({
        totalAchatUSA: vRows.reduce((s, v) => s + (v.prix_achat_usd ?? 0), 0),
        totalPayeUSA: vRows.reduce((s, v) => s + (v.montant_paye_fournisseur ?? (v.paiement_fournisseur === "paye" ? v.prix_achat_usd ?? 0 : 0)), 0),
        totalVenteFCFA: venRows.reduce((s, v) => s + (v.prix_vente_fcfa ?? 0), 0),
        totalEncaisseFCFA: venRows.reduce((s, v) => s + (v.montant_recu_fcfa ?? 0), 0),
      });
      setIsLoading(false);
    }
    loadTotaux();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion]);

  // Charger les voitures paginées seulement quand l'onglet USA est actif
  useEffect(() => {
    if (activeTab !== "usa") return;
    async function loadVoitures() {
      const supabase = createClient();
      const { data, count } = await supabase
        .from("voitures")
        .select("*", { count: "exact" })
        .order("marque")
        .range((pageVoitures - 1) * PAGE_SIZE, pageVoitures * PAGE_SIZE - 1);
      setVoitures(data ?? []);
      setTotalVoitures(count ?? 0);
    }
    loadVoitures();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, pageVoitures, dataVersion]);

  // Charger les ventes paginées seulement quand l'onglet Mali est actif
  useEffect(() => {
    if (activeTab !== "mali") return;
    async function loadVentes() {
      const supabase = createClient();
      const { data, count } = await supabase
        .from("ventes")
        .select("*, voiture:voitures(*)", { count: "exact" })
        .eq("status", "active")
        .order("date_vente", { ascending: false })
        .range((pageVentes - 1) * PAGE_SIZE, pageVentes * PAGE_SIZE - 1);
      setVentes(((data as VenteWithVoiture[]) ?? []).filter(isVenteActive));
      setTotalVentes(count ?? 0);
    }
    loadVentes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, pageVentes, dataVersion]);

  if (isLoading) return <Spinner />;

  const totalResteUSA = totaux.totalAchatUSA - totaux.totalPayeUSA;
  const totalResteMali = totaux.totalVenteFCFA - totaux.totalEncaisseFCFA;
  const totalPagesVoitures = Math.max(1, Math.ceil(totalVoitures / PAGE_SIZE));
  const totalPagesVentes = Math.max(1, Math.ceil(totalVentes / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">💰 Finances</h1>
        <p className="text-muted-foreground mt-1">Résumé financier complet</p>
      </div>

      <Tabs defaultValue="usa" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="usa">🏦 Paiements USA</TabsTrigger>
          <TabsTrigger value="mali">💚 Encaissements Mali</TabsTrigger>
        </TabsList>

        <TabsContent value="usa" className="space-y-4">
          {/* Totaux en haut — toujours visibles */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center font-bold text-lg">
                <div><p className="text-sm text-muted-foreground font-normal">TOTAL ACHAT</p>{formatUSD(totaux.totalAchatUSA)}</div>
                <div className="text-emerald-600"><p className="text-sm text-muted-foreground font-normal">Payé</p>{formatUSD(totaux.totalPayeUSA)}</div>
                <div className="text-red-600"><p className="text-sm text-muted-foreground font-normal">Reste</p>{formatUSD(totalResteUSA)}</div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {voitures.map((v) => {
              const paye = v.paiement_fournisseur === "paye" ? v.prix_achat_usd ?? 0 : v.montant_paye_fournisseur ?? 0;
              const reste = (v.prix_achat_usd ?? 0) - paye;
              return (
                <Card key={v.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="font-bold text-base">{getVoitureTitre(v)}</p>
                        <div className="mt-1"><PaiementBadge paiement={v.paiement_fournisseur} /></div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center sm:text-right">
                        <div><p className="text-sm text-muted-foreground">Achat</p><p className="font-semibold">{formatUSD(v.prix_achat_usd ?? 0)}</p></div>
                        <div><p className="text-sm text-muted-foreground">Payé</p><p className="font-semibold text-emerald-600">{formatUSD(paye)}</p></div>
                        <div><p className="text-sm text-muted-foreground">Reste</p><p className="font-semibold text-red-600">{formatUSD(reste)}</p></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {totalPagesVoitures > 1 && (
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" size="sm" disabled={pageVoitures <= 1} onClick={() => setPageVoitures(p => p - 1)}><ChevronLeft size={18} />Précédent</Button>
              <span className="text-sm">Page {pageVoitures} / {totalPagesVoitures}</span>
              <Button variant="outline" size="sm" disabled={pageVoitures >= totalPagesVoitures} onClick={() => setPageVoitures(p => p + 1)}>Suivant<ChevronRight size={18} /></Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="mali" className="space-y-4">
          {/* Totaux en haut — toujours visibles */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center font-bold text-lg">
                <div><p className="text-sm text-muted-foreground font-normal">TOTAL VENTES</p>{formatFCFA(totaux.totalVenteFCFA)}</div>
                <div className="text-emerald-600"><p className="text-sm text-muted-foreground font-normal">Encaissé</p>{formatFCFA(totaux.totalEncaisseFCFA)}</div>
                <div className="text-red-600"><p className="text-sm text-muted-foreground font-normal">Reste</p>{formatFCFA(totalResteMali)}</div>
              </div>
            </CardContent>
          </Card>

          {ventes.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Aucune vente enregistrée</CardContent></Card>
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
                            <p className="text-muted-foreground text-sm">{v.voiture ? getVoitureTitre(v.voiture) : "—"}</p>
                            <span className={cn("inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold mt-1", config.bg, config.text)}>{config.label}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-center sm:text-right">
                            <div><p className="text-sm text-muted-foreground">Prix vente</p><p className="font-semibold">{formatFCFA(v.prix_vente_fcfa)}</p></div>
                            <div><p className="text-sm text-muted-foreground">Encaissé</p><p className="font-semibold text-emerald-600">{formatFCFA(v.montant_recu_fcfa)}</p></div>
                            <div><p className="text-sm text-muted-foreground">Reste</p><p className="font-semibold text-red-600">{formatFCFA(reste)}</p></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {totalPagesVentes > 1 && (
                <div className="flex items-center justify-center gap-4">
                  <Button variant="outline" size="sm" disabled={pageVentes <= 1} onClick={() => setPageVentes(p => p - 1)}><ChevronLeft size={18} />Précédent</Button>
                  <span className="text-sm">Page {pageVentes} / {totalPagesVentes}</span>
                  <Button variant="outline" size="sm" disabled={pageVentes >= totalPagesVentes} onClick={() => setPageVentes(p => p + 1)}>Suivant<ChevronRight size={18} /></Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
