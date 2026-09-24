"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useEcriture } from "@/lib/api/requetes";
import { useOrg } from "@/lib/session";
import { Feuille } from "@/components/ui/feuille";
import { Bouton } from "@/components/ui/bouton";
import { ZoneTexte } from "@/components/ui/champ";

export function FeuilleAnnulerPaiement({ ouverte, onFermer, paiementId }: { ouverte: boolean; onFermer: () => void; paiementId: string }) {
  const org = useOrg();
  const [motif, setMotif] = useState("");
  const annuler = useEcriture("paiement_annuler", {
    onSuccess: () => { toast.success("Paiement annulé"); setMotif(""); onFermer(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre="Annuler ce paiement" description="Le montant repasse dans le reste à payer."
      pied={<>
        <Bouton variante="secondaire" onClick={onFermer}>Retour</Bouton>
        <Bouton variante="danger" chargement={annuler.isPending} onClick={() => annuler.executer({ p_org: org.id, p_id: paiementId, p_motif: motif.trim() || null })}>
          Confirmer
        </Bouton>
      </>}>
      <ZoneTexte libelle="Motif" facultatif rows={2} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Erreur de saisie, double encaissement…" />
    </Feuille>
  );
}
