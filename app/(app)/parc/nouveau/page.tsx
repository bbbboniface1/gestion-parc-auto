"use client";

import { Car } from "@phosphor-icons/react";
import { FilAriane } from "@/components/ui/fil-ariane";
import { useCompteursNavigation } from "@/lib/compteurs";
import { useOrg } from "@/lib/session";
import { peut } from "@/lib/domaine";
import { EnTetePage } from "@/components/coque/coque";
import { FormulaireVehicule } from "@/components/metier/formulaire-vehicule";
import { EtatVide } from "@/components/ui/etats";

export default function PageNouveauVehicule() {
  const org = useOrg();
  const compteurs = useCompteursNavigation();
  return (
    <>
      <FilAriane retour={{ href: "/parc/", libelle: "Parc", icone: Car, couleur: "var(--etape-achete)", detail: compteurs.parc?.sens }} etapes={["Nouveau véhicule"]} />
      <EnTetePage titre="Nouveau véhicule" sousTitre="Saisissez le VIN : marque, modèle et année se remplissent seuls." />
      {peut(org.role, "modifierVehicule") ? (
        <FormulaireVehicule />
      ) : (
        <EtatVide titre="Action réservée" texte="Seuls le propriétaire et le gérant ajoutent des véhicules au parc." />
      )}
    </>
  );
}
