"use client";

import { useState } from "react";
import { Plus, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { nouvelId, useEcriture, useLecture } from "@/lib/api/requetes";
import { useOrg } from "@/lib/session";
import { EnTeteSection } from "@/components/parametres/en-tete-section";
import { Groupe } from "@/components/parametres/commun";
import { Bouton } from "@/components/ui/bouton";
import { EtatErreur, Squelette } from "@/components/ui/etats";

interface Referentiel { id: string; type: string; libelle: string; actif: boolean; ordre: number }

const TYPES = [
  { type: "port_depart", titre: "Ports de départ", description: "Où vos véhicules embarquent aux États-Unis.", exemple: "Houston" },
  { type: "port_arrivee", titre: "Ports d'arrivée", description: "Où ils débarquent avant le convoi vers Bamako.", exemple: "Cotonou" },
  { type: "compagnie", titre: "Compagnies maritimes", description: "Proposées à la création d'une expédition.", exemple: "MSC" },
  { type: "transitaire", titre: "Transitaires", description: "Vos transitaires au port et à Bamako.", exemple: "Transit Sahel SARL" },
  { type: "fournisseur", titre: "Fournisseurs", description: "Garages, remorqueurs, vendeurs de pièces.", exemple: "Garage Konaté" },
] as const;

function Liste({ type, titre, description, exemple, elements }: { type: string; titre: string; description: string; exemple: string; elements: Referentiel[] }) {
  const org = useOrg();
  const [saisie, setSaisie] = useState("");
  const ajouter = useEcriture("referentiel_enregistrer", { onSuccess: () => setSaisie(""), onError: (e) => toast.error(e.message) });
  const supprimer = useEcriture("referentiel_supprimer", { onError: (e) => toast.error(e.message) });
  return (
    <Groupe titre={titre} description={description}>
      <ul className="flex flex-wrap gap-2">
        {elements.map((e) => (
          <li key={e.id} className="inline-flex h-9 items-center gap-1 rounded-controle border border-trait bg-surface pl-3 text-[14px]">
            {e.libelle}
            <button type="button" aria-label={`Retirer ${e.libelle}`} onClick={() => supprimer.executer({ p_org: org.id, p_id: e.id })}
              className="inline-flex size-8 items-center justify-center text-encre-3 hover:text-perte"><Trash className="size-3.5" /></button>
          </li>
        ))}
        {elements.length === 0 && <li className="text-[14px] text-encre-3">Aucun pour l&apos;instant.</li>}
      </ul>
      <form className="flex gap-2" onSubmit={(e) => {
        e.preventDefault();
        if (!saisie.trim()) return;
        ajouter.executer({ p_org: org.id, p_data: { id: nouvelId(), type, libelle: saisie.trim(), actif: true, ordre: elements.length + 1 } });
      }}>
        <label className="flex-1">
          <span className="sr-only">Ajouter à « {titre} »</span>
          <input value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder={exemple}
            className="h-11 w-full rounded-controle border border-trait-fort bg-surface px-3 text-[15px] focus:border-primaire focus:outline-none lg:h-10 lg:text-sm" />
        </label>
        <Bouton type="submit" icone={<Plus className="size-4" />} disabled={!saisie.trim()} chargement={ajouter.isPending}>Ajouter</Bouton>
      </form>
    </Groupe>
  );
}

export default function PageLogistique() {
  const org = useOrg();
  const { data, error, isPending, refetch } = useLecture<Referentiel[]>("referentiels_lister", { p_org: org.id });
  return (
    <>
      <EnTeteSection cle="logistique" titre="Logistique" sousTitre="Les listes proposées lors de la saisie des expéditions et des frais." />
      {error && !data ? <EtatErreur erreur={error} onReessayer={() => void refetch()} /> : isPending || !data ? <Squelette className="h-96 rounded-carte" /> : (
        <div className="flex flex-col gap-4">
          {TYPES.map((t) => <Liste key={t.type} {...t} elements={data.filter((r) => r.type === t.type && r.actif).sort((a, b) => a.ordre - b.ordre)} />)}
        </div>
      )}
    </>
  );
}
