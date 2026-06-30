"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store";
import type { Vente, Voiture } from "@/types";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatFCFA, formatDateShort, getResteAPayer, getVoitureTitre, isVenteActive } from "@/lib/utils";
import { getStatutPaiementConfig } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { VenteStatutBadge } from "@/components/ventes/VenteStatutBadge";
import { AnnulerVenteDialog } from "@/components/ventes/AnnulerVenteDialog";
import { ModifierVenteDialog } from "@/components/ventes/ModifierVenteDialog";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  TableCellsIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  MagnifyingGlassIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";

interface VenteWithVoiture extends Omit<Vente, "voiture"> { voiture: Voiture | null; }
type FiltreFacture = "all" | "paye" | "partiel" | "non_paye" | "annulee";

const PAGE_SIZE = 20;
const FILTRES: { value: FiltreFacture; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "paye", label: "Payées" },
  { value: "partiel", label: "Partielles" },
  { value: "non_paye", label: "Non payées" },
  { value: "annulee", label: "Annulées" },
];

export default function FacturesPage() {
  const [ventes, setVentes] = useState<VenteWithVoiture[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filtre, setFiltre] = useState<FiltreFacture>("all");
  const [page, setPage] = useState(1);
  const [annulerVente, setAnnulerVente] = useState<VenteWithVoiture | null>(null);
  const [modifierVente, setModifierVente] = useState<VenteWithVoiture | null>(null);
  const dataVersion = useAppStore((s) => s.dataVersion);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadVentes = useCallback(async () => {
    setIsLoading(true);
    const supabase = createClient();

    let query = supabase
      .from("ventes")
      .select("*, voiture:voitures(*)", { count: "exact" })
      .order("date_vente", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (filtre === "annulee") {
      query = query.eq("status", "annulee");
    } else {
      query = query.eq("status", "active");
      if (filtre === "paye") query = query.eq("statut_paiement", "paye");
      if (filtre === "partiel") query = query.eq("statut_paiement", "partiel");
      if (filtre === "non_paye") query = query.eq("statut_paiement", "non_paye");
    }

    if (search.trim()) {
      query = query.or(
        `client_nom.ilike.%${search.trim()}%,` +
        `numero_facture.ilike.%${search.trim()}%,` +
        `client_telephone.ilike.%${search.trim()}%`
      );
    }

    const { data, count } = await query;
    setVentes((data as VenteWithVoiture[]) ?? []);
    setTotal(count ?? 0);
    setIsLoading(false);
  }, [page, filtre, search]);

  useEffect(() => {
    loadVentes();
  }, [loadVentes, dataVersion]);

  useEffect(() => { setPage(1); }, [search, filtre]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">📄 Factures & ventes</h1>
          <p className="text-muted-foreground mt-1">{total} facture(s) au total</p>
        </div>
        <Button variant="outline" disabled title="Export Excel — architecture prévue" className="gap-1.5">
          <TableCellsIcon className="w-4 h-4" />Export Excel
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTRES.map((f) => (
          <button key={f.value} type="button" onClick={() => setFiltre(f.value)}
            className={cn(
              "px-4 py-2 rounded-full text-base font-medium min-h-10 transition-all duration-200",
              filtre === f.value
                ? "bg-primary text-white shadow-md shadow-primary/25"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
        <Input
          placeholder="Rechercher : client, facture, téléphone..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? <Spinner /> : ventes.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Aucune facture trouvée</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {ventes.map((v) => {
            const paiementConfig = getStatutPaiementConfig(v.statut_paiement);
            const reste = getResteAPayer(v.prix_vente_fcfa, v.montant_recu_fcfa);
            const active = isVenteActive(v);
            return (
              <Card key={v.id} className={cn("hover:shadow-md transition-all duration-200", !active && "opacity-80 border-red-200")}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-lg">{v.numero_facture}</p>
                        <VenteStatutBadge status={v.status ?? "active"} />
                        {active && (
                          <span className={cn("inline-flex px-3 py-1 rounded-full text-sm font-semibold", paiementConfig.bg, paiementConfig.text)}>
                            {paiementConfig.label}
                          </span>
                        )}
                      </div>
                      <p className="text-base font-medium">{v.client_nom}</p>
                      <p className="text-sm text-muted-foreground">
                        {v.voiture ? getVoitureTitre(v.voiture) : "—"} · {formatDateShort(v.date_vente)}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center sm:text-right text-sm shrink-0">
                      <div><p className="text-muted-foreground">Prix</p><p className="font-semibold">{formatFCFA(v.prix_vente_fcfa)}</p></div>
                      <div><p className="text-muted-foreground">Payé</p><p className="font-semibold text-emerald-600">{active ? formatFCFA(v.montant_recu_fcfa) : "—"}</p></div>
                      <div><p className="text-muted-foreground">Reste</p>
                        <p className={cn("font-semibold", !active ? "text-muted-foreground" : reste === 0 ? "text-emerald-600" : "text-red-600")}>
                          {active ? formatFCFA(reste) : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button variant="outline" asChild className="gap-1.5">
                      <Link href={`/ventes/${v.id}/facture`}><EyeIcon className="w-4 h-4" />Voir</Link>
                    </Button>
                    <Button variant="outline" asChild className="gap-1.5">
                      <Link href={`/ventes/${v.id}/facture`}><DocumentTextIcon className="w-4 h-4" />PDF</Link>
                    </Button>
                    {active && (
                      <>
                        <Button variant="outline" onClick={() => setModifierVente(v)} className="gap-1.5">
                          <PencilSquareIcon className="w-4 h-4" />Modifier
                        </Button>
                        <Button variant="destructive" onClick={() => setAnnulerVente(v)} className="gap-1.5">
                          <XCircleIcon className="w-4 h-4" />Annuler
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="gap-1">
            <ChevronLeftIcon className="w-4 h-4" />Précédent
          </Button>
          <span className="text-base">Page {page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="gap-1">
            Suivant<ChevronRightIcon className="w-4 h-4" />
          </Button>
        </div>
      )}

      {annulerVente && (
        <AnnulerVenteDialog
          vente={(() => { const { voiture: _v, ...v } = annulerVente; return v; })()}
          voiture={annulerVente.voiture}
          open={!!annulerVente}
          onOpenChange={(open) => !open && setAnnulerVente(null)}
          onSuccess={loadVentes}
        />
      )}
      {modifierVente && (
        <ModifierVenteDialog
          vente={(() => { const { voiture: _v, ...v } = modifierVente; return v; })()}
          open={!!modifierVente}
          onOpenChange={(open) => !open && setModifierVente(null)}
          onSuccess={loadVentes}
        />
      )}
    </div>
  );
}
