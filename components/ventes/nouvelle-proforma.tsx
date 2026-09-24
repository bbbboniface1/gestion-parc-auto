"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { nouvelId, useEcriture } from "@/lib/api/requetes";
import { useParametres } from "@/lib/api/parametres";
import { useOrg } from "@/lib/session";
import type { Vehicule } from "@/lib/api/types";
import { aujourdhui } from "@/lib/format";
import { ChoixClient } from "@/components/metier/feuilles-vehicule";
import { ChoixVehicule } from "./choix-vehicule";
import { Feuille } from "@/components/ui/feuille";
import { Bouton } from "@/components/ui/bouton";
import { ChampMontant } from "@/components/ui/champ-montant";

interface ClientLigne { id: string; nom: string; telephone: string | null; ville: string | null }

export function NouvelleProforma({ ouverte, onFermer }: { ouverte: boolean; onFermer: () => void }) {
  const org = useOrg();
  const router = useRouter();
  const { data: reglages } = useParametres();
  const [vehicule, setVehicule] = useState<Vehicule | null>(null);
  const [client, setClient] = useState<ClientLigne | null>(null);
  const [prix, setPrix] = useState<number | null>(null);
  const [id, setId] = useState(nouvelId);

  useEffect(() => {
    if (ouverte) { setVehicule(null); setClient(null); setPrix(null); setId(nouvelId()); }
  }, [ouverte]);
  useEffect(() => {
    if (vehicule && prix === null) setPrix(vehicule.prix_affiche_xof);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicule]);

  const creer = useEcriture<{ id: string }>("proforma_creer", {
    onSuccess: (p) => { toast.success("Proforma créée"); onFermer(); router.push(`/ventes/fiche/?id=${p?.id ?? ""}`); },
    onError: (e) => toast.error(e.message),
  });

  const valide = !!vehicule && !!client && !!prix && prix > 0;
  const jours = reglages?.parametres.validite_proforma_jours ?? 15;

  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre="Nouvelle proforma" pleinEcran
      description={`Valable ${jours} jours par défaut.`}
      pied={<>
        <Bouton variante="secondaire" onClick={onFermer}>Annuler</Bouton>
        <Bouton variante="primaire" disabled={!valide} chargement={creer.isPending} onClick={() => {
          if (!vehicule || !client || prix === null) return;
          creer.executer({ p_org: org.id, p_data: { id, vehicule_id: vehicule.id, client_id: client.id, prix_xof: prix, date: aujourdhui() } });
        }}>Créer la proforma</Bouton>
      </>}>
      <div className="flex flex-col gap-5">
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-encre-2">Véhicule</p>
          <ChoixVehicule valeur={vehicule} onChoix={setVehicule} />
        </div>
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-encre-2">Client</p>
          <ChoixClient valeur={client} onChoix={setClient} />
        </div>
        <ChampMontant libelle="Prix proposé" valeur={prix} onChange={setPrix} devise="XOF" />
      </div>
    </Feuille>
  );
}
