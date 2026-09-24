"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useEcriture } from "@/lib/api/requetes";
import { useOrg } from "@/lib/session";
import { Feuille } from "@/components/ui/feuille";
import { Bouton } from "@/components/ui/bouton";
import { ZoneTexte } from "@/components/ui/champ";

export function FeuilleAnnulerVente({ ouverte, onFermer, venteId, onAnnulee }: {
  ouverte: boolean; onFermer: () => void; venteId: string; onAnnulee: () => void;
}) {
  const org = useOrg();
  const [motif, setMotif] = useState("");
  const annuler = useEcriture("vente_annuler", {
    onSuccess: () => { toast.success("Vente annulée, avoir émis"); setMotif(""); onFermer(); onAnnulee(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre="Annuler la vente" description="Cette action génère un avoir et remet le véhicule disponible. Elle est irréversible."
      pied={<>
        <Bouton variante="secondaire" onClick={onFermer}>Retour</Bouton>
        <Bouton variante="danger" disabled={motif.trim().length < 3} chargement={annuler.isPending} onClick={() => annuler.executer({ p_org: org.id, p_id: venteId, p_motif: motif.trim() })}>
          Confirmer l&apos;annulation
        </Bouton>
      </>}>
      <ZoneTexte libelle="Motif de l'annulation" required rows={3} value={motif} onChange={(e) => setMotif(e.target.value)}
        placeholder="Le client renonce à l'achat avant livraison." />
    </Feuille>
  );
}
