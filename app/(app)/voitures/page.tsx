"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Voiture, StatutVoiture, PaiementFournisseur } from "@/types";
import { VoitureCard } from "@/components/voitures/VoitureCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { STATUTS_VOITURE, PAIEMENT_FOURNISSEUR } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Plus, Search } from "lucide-react";

function VoituresContent() {
  const searchParams = useSearchParams();
  const [voitures, setVoitures] = useState<Voiture[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState<StatutVoiture | "all">(
    (searchParams.get("statut") as StatutVoiture) || "all"
  );
  const [paiementFilter, setPaiementFilter] = useState<PaiementFournisseur | "all">("all");
  const supabase = createClient();

  useEffect(() => {
    async function loadVoitures() {
      setIsLoading(true);
      let query = supabase.from("voitures").select("*").order("created_at", { ascending: false });

      if (statutFilter !== "all") {
        query = query.eq("statut", statutFilter);
      }
      if (paiementFilter !== "all") {
        query = query.eq("paiement_fournisseur", paiementFilter);
      }

      const { data } = await query;
      setVoitures(data ?? []);
      setIsLoading(false);
    }
    loadVoitures();
  }, [statutFilter, paiementFilter, supabase]);

  const filtered = voitures.filter((v) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      v.marque.toLowerCase().includes(s) ||
      v.modele.toLowerCase().includes(s) ||
      (v.numero_chassis?.toLowerCase().includes(s) ?? false)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">🚗 Voitures</h1>
          <p className="text-muted-foreground mt-1">{filtered.length} voiture(s)</p>
        </div>
        <Button asChild size="lg">
          <Link href="/voitures/ajouter">
            <Plus size={20} />
            Ajouter une voiture
          </Link>
        </Button>
      </div>

      {/* Filtres statut */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatutFilter("all")}
          className={cn(
            "px-4 py-2 rounded-full text-base font-medium min-h-10 transition-colors",
            statutFilter === "all" ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          Toutes
        </button>
        {STATUTS_VOITURE.map((s) => (
          <button
            key={s.value}
            onClick={() => setStatutFilter(s.value)}
            className={cn(
              "px-4 py-2 rounded-full text-base font-medium min-h-10 transition-colors",
              statutFilter === s.value ? `${s.bg} ${s.text} ring-2 ring-offset-1` : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Filtres paiement */}
      <div className="flex flex-wrap gap-2">
        {PAIEMENT_FOURNISSEUR.map((p) => (
          <button
            key={p.value}
            onClick={() => setPaiementFilter(paiementFilter === p.value ? "all" : p.value)}
            className={cn(
              "px-4 py-2 rounded-full text-base font-medium min-h-10 transition-colors",
              paiementFilter === p.value ? `${p.bg} ${p.text} ring-2 ring-offset-1` : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {p.filterLabel}
          </button>
        ))}
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
        <Input
          placeholder="Rechercher par marque, modèle ou châssis..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-4xl mb-4">🚗</p>
            <p className="text-lg font-medium mb-2">Aucune voiture trouvée</p>
            <p className="text-muted-foreground mb-4">
              Commencez par ajouter votre première voiture importée
            </p>
            <Button asChild>
              <Link href="/voitures/ajouter">
                <Plus size={20} />
                Ajouter une voiture
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((v) => (
            <VoitureCard key={v.id} voiture={v} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function VoituresPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <VoituresContent />
    </Suspense>
  );
}
