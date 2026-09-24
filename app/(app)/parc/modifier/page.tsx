"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useLecture } from "@/lib/api/requetes";
import type { VehiculeDetail } from "@/lib/api/types";
import { useOrg } from "@/lib/session";
import { EnTetePage } from "@/components/coque/coque";
import { FormulaireVehicule } from "@/components/metier/formulaire-vehicule";
import { EtatErreur, SqueletteListe } from "@/components/ui/etats";

function Modifier() {
  const id = useSearchParams().get("id") ?? "";
  const org = useOrg();
  const { data, error, refetch } = useLecture<VehiculeDetail>("vehicule_obtenir", { p_org: org.id, p_id: id }, { enabled: !!id });
  return (
    <>
      <Link href={`/parc/vehicule/?id=${id}`} className="mb-2 inline-flex h-10 items-center gap-1.5 text-corps text-encre-2 hover:text-encre">
        <ArrowLeft className="size-4" aria-hidden /> Retour à la fiche
      </Link>
      <EnTetePage titre={data ? `Modifier ${data.libelle}` : "Modifier le véhicule"} surtitre={data?.reference} />
      {error && !data ? <EtatErreur erreur={error} onReessayer={() => void refetch()} /> : !data ? <SqueletteListe lignes={4} /> : <FormulaireVehicule vehicule={data} />}
    </>
  );
}

export default function PageModifierVehicule() {
  return (
    <Suspense>
      <Modifier />
    </Suspense>
  );
}
