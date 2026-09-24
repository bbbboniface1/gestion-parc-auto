"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { nouvelId, useEcriture } from "@/lib/api/requetes";
import { useOrg } from "@/lib/session";
import { Feuille } from "@/components/ui/feuille";
import { Bouton } from "@/components/ui/bouton";
import { Champ } from "@/components/ui/champ";
import { ChampMontant } from "@/components/ui/champ-montant";

export function FeuilleDemande({ ouverte, onFermer, clientId }: { ouverte: boolean; onFermer: () => void; clientId: string }) {
  const org = useOrg();
  const [marque, setMarque] = useState("");
  const [modele, setModele] = useState("");
  const [anneeMin, setAnneeMin] = useState("");
  const [anneeMax, setAnneeMax] = useState("");
  const [budget, setBudget] = useState<number | null>(null);

  useEffect(() => { if (ouverte) { setMarque(""); setModele(""); setAnneeMin(""); setAnneeMax(""); setBudget(null); } }, [ouverte]);

  const creer = useEcriture("demande_enregistrer", { onSuccess: () => { toast.success("Demande enregistrée"); onFermer(); }, onError: (e) => toast.error(e.message) });

  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre="Ce que le client cherche"
      pied={<>
        <Bouton variante="secondaire" onClick={onFermer}>Annuler</Bouton>
        <Bouton variante="primaire" chargement={creer.isPending} onClick={() => creer.executer({
          p_org: org.id, p_data: {
            id: nouvelId(), client_id: clientId, marque: marque.trim() || null, modele: modele.trim() || null,
            annee_min: anneeMin ? Number(anneeMin) : null, annee_max: anneeMax ? Number(anneeMax) : null,
            budget_max_xof: budget,
          },
        })}>Enregistrer</Bouton>
      </>}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Champ libelle="Marque" facultatif value={marque} onChange={(e) => setMarque(e.target.value)} placeholder="Toyota" />
          <Champ libelle="Modèle" facultatif value={modele} onChange={(e) => setModele(e.target.value)} placeholder="RAV4" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Champ libelle="Année min" facultatif inputMode="numeric" maxLength={4} value={anneeMin} onChange={(e) => setAnneeMin(e.target.value.replace(/\D/g, ""))} />
          <Champ libelle="Année max" facultatif inputMode="numeric" maxLength={4} value={anneeMax} onChange={(e) => setAnneeMax(e.target.value.replace(/\D/g, ""))} />
        </div>
        <ChampMontant libelle="Budget maximum" facultatif valeur={budget} onChange={setBudget} devise="XOF" />
      </div>
    </Feuille>
  );
}
