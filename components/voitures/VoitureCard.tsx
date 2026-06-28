"use client";

import Link from "next/link";
import Image from "next/image";
import type { Voiture } from "@/types";
import { StatutBadge } from "./StatutBadge";
import { PaiementBadge } from "./PaiementBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatFCFA, formatUSD, getVoitureTitre } from "@/lib/utils";
import { Eye, Pencil, ShoppingCart } from "lucide-react";

interface VoitureCardProps {
  voiture: Voiture;
  showVendre?: boolean;
}

export function VoitureCard({ voiture, showVendre = true }: VoitureCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="relative w-24 h-24 md:w-32 md:h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
            {voiture.photo_url ? (
              <Image
                src={voiture.photo_url}
                alt={getVoitureTitre(voiture)}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">🚗</div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold truncate">{getVoitureTitre(voiture)}</h3>
            {voiture.couleur && (
              <p className="text-base text-muted-foreground">Couleur : {voiture.couleur}</p>
            )}
            {voiture.kilometrage && (
              <p className="text-base text-muted-foreground">
                Km : {voiture.kilometrage.toLocaleString("fr-FR")}
              </p>
            )}

            <div className="flex flex-wrap gap-2 mt-2">
              <StatutBadge statut={voiture.statut} />
              <PaiementBadge paiement={voiture.paiement_fournisseur} />
            </div>

            <div className="mt-2 text-base">
              {voiture.prix_achat_usd && (
                <span className="mr-3">Achat : {formatUSD(voiture.prix_achat_usd)}</span>
              )}
              {voiture.prix_vente_fcfa && (
                <span>Vente : {formatFCFA(voiture.prix_vente_fcfa)}</span>
              )}
            </div>

            {voiture.numero_conteneur && (
              <p className="text-sm text-muted-foreground mt-1">
                Conteneur : {voiture.numero_conteneur}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Button variant="outline" asChild>
            <Link href={`/voitures/${voiture.id}`}>
              <Eye size={18} />
              Voir
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/voitures/${voiture.id}/modifier`}>
              <Pencil size={18} />
              Modifier
            </Link>
          </Button>
          {showVendre && voiture.statut === "en_stock" && (
            <Button asChild>
              <Link href={`/voitures/${voiture.id}?vendre=true`}>
                <ShoppingCart size={18} />
                Vendre
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
