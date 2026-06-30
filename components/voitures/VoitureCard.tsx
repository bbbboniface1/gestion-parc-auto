"use client";

import Link from "next/link";
import Image from "next/image";
import type { Voiture } from "@/types";
import { StatutBadge } from "./StatutBadge";
import { PaiementBadge } from "./PaiementBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatFCFA, formatUSD, getVoitureTitre } from "@/lib/utils";
import { EyeIcon, PencilSquareIcon, ShoppingCartIcon } from "@heroicons/react/24/solid";

interface VoitureCardProps {
  voiture: Voiture;
  showVendre?: boolean;
}

export function VoitureCard({ voiture, showVendre = true }: VoitureCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="relative w-24 h-24 md:w-32 md:h-32 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 shadow-sm">
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
          <Button variant="outline" asChild className="gap-1.5 transition-all hover:shadow-sm">
            <Link href={`/voitures/${voiture.id}`}>
              <EyeIcon className="w-4 h-4" />
              Voir
            </Link>
          </Button>
          <Button variant="outline" asChild className="gap-1.5 transition-all hover:shadow-sm">
            <Link href={`/voitures/${voiture.id}/modifier`}>
              <PencilSquareIcon className="w-4 h-4" />
              Modifier
            </Link>
          </Button>
          {showVendre && voiture.statut === "en_stock" && (
            <Button asChild className="gap-1.5 transition-all hover:shadow-md">
              <Link href={`/voitures/${voiture.id}?vendre=true`}>
                <ShoppingCartIcon className="w-4 h-4" />
                Vendre
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
