"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store";
import type { Vente, Voiture, Parametres } from "@/types";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { VenteStatutBadge } from "@/components/ventes/VenteStatutBadge";
import { AnnulerVenteDialog } from "@/components/ventes/AnnulerVenteDialog";
import { toast } from "sonner";
import { ArrowLeft, XCircle } from "lucide-react";
import { isVenteActive } from "@/lib/utils";

const FactureActions = dynamic(
  () => import("@/components/ventes/FactureActions").then((mod) => mod.FactureActions),
  { ssr: false, loading: () => <Spinner /> }
);

interface VenteWithVoiture extends Vente { voiture: Voiture; }

export default function FacturePage() {
  const params = useParams();
  const [vente, setVente] = useState<VenteWithVoiture | null>(null);
  const [parametres, setParametres] = useState<Parametres | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAnnuler, setShowAnnuler] = useState(false);
  const storeParametres = useAppStore((s) => s.parametres);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    async function loadData() {
      const supabase = createClient();
      const venteRes = await supabase
        .from("ventes")
        .select("*, voiture:voitures(*)")
        .eq("id", params.id)
        .single();

      if (venteRes.error || !venteRes.data) {
        toast.error("Facture introuvable");
        return;
      }

      setVente(venteRes.data as VenteWithVoiture);

      if (storeParametres) {
        setParametres(storeParametres);
      } else {
        const paramRes = await supabase.from("parametres").select("*").limit(1).single();
        setParametres(
          paramRes.data ?? {
            id: "", created_at: "", updated_at: "",
            nom_entreprise: "Auto Mali Import",
            adresse: "Bamako, Mali",
            telephone: "+223 XX XX XX XX",
            email: null, logo_url: null,
            taux_change_usd_fcfa: 600,
          }
        );
      }
      setIsLoading(false);
    }
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (isLoading || !vente || !parametres || !vente.voiture) return <Spinner />;

  const active = isVenteActive(vente);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <Button variant="outline" asChild>
          <Link href="/ventes"><ArrowLeft size={18} />Retour aux factures</Link>
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold">📄 Facture {vente.numero_facture}</h1>
            <VenteStatutBadge status={vente.status ?? "active"} />
          </div>
          <p className="text-muted-foreground mt-1">Client : {vente.client_nom}</p>
        </div>
      </div>

      <FactureActions vente={vente} voiture={vente.voiture} parametres={parametres} />

      {active && (
        <Button variant="destructive" onClick={() => setShowAnnuler(true)}>
          <XCircle size={18} />Annuler la vente
        </Button>
      )}

      <AnnulerVenteDialog
        vente={vente}
        voiture={vente.voiture}
        open={showAnnuler}
        onOpenChange={setShowAnnuler}
        onSuccess={() => setShowAnnuler(false)}
      />
    </div>
  );
}
