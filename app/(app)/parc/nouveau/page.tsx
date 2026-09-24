"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useOrg } from "@/lib/session";
import { peut } from "@/lib/domaine";
import { EnTetePage } from "@/components/coque/coque";
import { FormulaireVehicule } from "@/components/metier/formulaire-vehicule";
import { EtatVide } from "@/components/ui/etats";

export default function PageNouveauVehicule() {
  const org = useOrg();
  return (
    <>
      <Link href="/parc/" className="mb-2 inline-flex h-10 items-center gap-1.5 text-corps text-encre-2 hover:text-encre">
        <ArrowLeft className="size-4" aria-hidden /> Parc
      </Link>
      <EnTetePage titre="Nouveau véhicule" />
      {peut(org.role, "modifierVehicule") ? (
        <FormulaireVehicule />
      ) : (
        <EtatVide titre="Action réservée" texte="Seuls le propriétaire et le gérant ajoutent des véhicules au parc." />
      )}
    </>
  );
}
