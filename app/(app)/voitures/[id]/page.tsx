"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { Voiture, StatutVoiture } from "@/types";
import { StatutBadge } from "@/components/voitures/StatutBadge";
import { PaiementBadge } from "@/components/voitures/PaiementBadge";
import { StatutTimeline } from "@/components/voitures/StatutTimeline";
import { VenteForm } from "@/components/ventes/VenteForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { STATUTS_VOITURE } from "@/lib/constants";
import { formatFCFA, formatUSD, formatDate, getVoitureTitre } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  PencilSquareIcon,
  ShoppingCartIcon,
  TrashIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/solid";

function VoitureDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [voiture, setVoiture] = useState<Voiture | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showVenteForm, setShowVenteForm] = useState(searchParams.get("vendre") === "true");
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    async function loadVoiture() {
      const supabase = createClient();
      const { data, error } = await supabase.from("voitures").select("*").eq("id", params.id).single();
      if (error || !data) {
        toast.error("Voiture introuvable");
        router.push("/voitures");
        return;
      }
      setVoiture(data);
      setIsLoading(false);
    }
    loadVoiture();
  }, [params.id, router]);

  const handleStatutChange = async (newStatut: StatutVoiture) => {
    if (!voiture) return;
    const supabase = createClient();
    const { error } = await supabase.from("voitures").update({ statut: newStatut }).eq("id", voiture.id);
    if (error) { toast.error("Erreur : " + error.message); return; }
    setVoiture({ ...voiture, statut: newStatut });
    toast.success("Statut mis à jour !");
  };

  const handleMarquerPaye = async () => {
    if (!voiture) return;
    const supabase = createClient();
    const { error } = await supabase.from("voitures").update({
      paiement_fournisseur: "paye",
      montant_paye_fournisseur: voiture.prix_achat_usd,
      date_paiement_fournisseur: new Date().toISOString().split("T")[0],
    }).eq("id", voiture.id);
    if (error) { toast.error("Erreur : " + error.message); return; }
    setVoiture({ ...voiture, paiement_fournisseur: "paye", montant_paye_fournisseur: voiture.prix_achat_usd });
    toast.success("Marqué comme payé !");
  };

  const handleDelete = async () => {
    if (!voiture) return;
    const supabase = createClient();
    const { error } = await supabase.from("voitures").delete().eq("id", voiture.id);
    if (error) { toast.error("Erreur : " + error.message); return; }
    toast.success("Voiture supprimée");
    router.push("/voitures");
  };

  if (isLoading || !voiture) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild className="gap-1.5">
          <Link href="/voitures"><ArrowLeftIcon className="w-4 h-4" />Retour</Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold">{getVoitureTitre(voiture)}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <StatutBadge statut={voiture.statut} />
            <PaiementBadge paiement={voiture.paiement_fournisseur} />
          </div>
        </div>
      </div>

      <div className="relative w-full h-64 md:h-80 rounded-xl overflow-hidden bg-gray-100 shadow-sm">
        {voiture.photo_url ? (
          <Image src={voiture.photo_url} alt={getVoitureTitre(voiture)} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">🚗</div>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>📍 Progression</CardTitle></CardHeader>
        <CardContent><StatutTimeline currentStatut={voiture.statut} /></CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Select value={voiture.statut} onValueChange={(v) => handleStatutChange(v as StatutVoiture)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Changer le statut" /></SelectTrigger>
          <SelectContent>
            {STATUTS_VOITURE.map((s) => <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>)}
          </SelectContent>
        </Select>

        {voiture.paiement_fournisseur !== "paye" && (
          <Button variant="outline" onClick={handleMarquerPaye} className="gap-1.5">
            <CheckCircleIcon className="w-4 h-4" />Marquer comme payé
          </Button>
        )}

        {voiture.statut === "en_stock" && (
          <Button onClick={() => setShowVenteForm(true)} className="gap-1.5">
            <ShoppingCartIcon className="w-4 h-4" />Vendre cette voiture
          </Button>
        )}

        <Button variant="outline" asChild className="gap-1.5">
          <Link href={`/voitures/${voiture.id}/modifier`}><PencilSquareIcon className="w-4 h-4" />Modifier</Link>
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="gap-1.5"><TrashIcon className="w-4 h-4" />Supprimer</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer {getVoitureTitre(voiture)} ? Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>📋 Informations</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-base">
            {voiture.couleur && <p><span className="text-muted-foreground">Couleur :</span> {voiture.couleur}</p>}
            {voiture.numero_chassis && <p><span className="text-muted-foreground">Châssis :</span> {voiture.numero_chassis}</p>}
            {voiture.kilometrage && <p><span className="text-muted-foreground">Kilométrage :</span> {voiture.kilometrage.toLocaleString("fr-FR")} km</p>}
            {voiture.carburant && <p><span className="text-muted-foreground">Carburant :</span> {voiture.carburant}</p>}
            {voiture.transmission && <p><span className="text-muted-foreground">Transmission :</span> {voiture.transmission}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>💰 Finances</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-base">
            {voiture.prix_achat_usd && <p><span className="text-muted-foreground">Achat USA :</span> {formatUSD(voiture.prix_achat_usd)}</p>}
            {voiture.frais_transport && <p><span className="text-muted-foreground">Frais transport :</span> {formatFCFA(voiture.frais_transport)}</p>}
            {voiture.prix_vente_fcfa && <p><span className="text-muted-foreground">Prix vente :</span> {formatFCFA(voiture.prix_vente_fcfa)}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>🚢 Logistique</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-base">
            {voiture.date_commande && <p><span className="text-muted-foreground">Commande :</span> {formatDate(voiture.date_commande)}</p>}
            {voiture.date_expedition && <p><span className="text-muted-foreground">Expédition :</span> {formatDate(voiture.date_expedition)}</p>}
            {voiture.numero_conteneur && <p><span className="text-muted-foreground">Conteneur :</span> {voiture.numero_conteneur}</p>}
            {voiture.date_arrivee_prevue && <p><span className="text-muted-foreground">Arrivée prévue :</span> {formatDate(voiture.date_arrivee_prevue)}</p>}
            {voiture.date_arrivee_reelle && <p><span className="text-muted-foreground">Arrivée réelle :</span> {formatDate(voiture.date_arrivee_reelle)}</p>}
          </CardContent>
        </Card>

        {voiture.notes && (
          <Card>
            <CardHeader><CardTitle>📝 Notes</CardTitle></CardHeader>
            <CardContent><p className="text-base">{voiture.notes}</p></CardContent>
          </Card>
        )}
      </div>

      <VenteForm voiture={voiture} open={showVenteForm} onOpenChange={setShowVenteForm} />
    </div>
  );
}

export default function VoitureDetailPage() {
  return <Suspense fallback={<Spinner />}><VoitureDetailContent /></Suspense>;
}
