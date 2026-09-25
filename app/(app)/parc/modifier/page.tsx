"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Car } from "@phosphor-icons/react";
import { FilAriane } from "@/components/ui/fil-ariane";
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
      <FilAriane retour={{ href: `/parc/vehicule/?id=${id}`, libelle: data?.libelle ?? "La fiche", icone: Car, couleur: "var(--etape-achete)", detail: "Retour à la fiche" }} etapes={["Modifier"]} />
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
