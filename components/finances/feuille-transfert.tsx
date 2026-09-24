"use client";

import { useState } from "react";
import { toast } from "sonner";
import { nouvelId, useEcriture } from "@/lib/api/requetes";
import { useOrg } from "@/lib/session";
import { aujourdhui } from "@/lib/format";
import type { Compte } from "@/lib/api/types-metier";
import { Feuille } from "@/components/ui/feuille";
import { Bouton } from "@/components/ui/bouton";
import { Champ, Selection } from "@/components/ui/champ";
import { ChampMontant } from "@/components/ui/champ-montant";

export function FeuilleTransfert({ ouverte, onFermer, comptes }: { ouverte: boolean; onFermer: () => void; comptes: Compte[] }) {
  const org = useOrg();
  const [source, setSource] = useState("");
  const [dest, setDest] = useState("");
  const [montant, setMontant] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(aujourdhui());

  const transferer = useEcriture("transfert_enregistrer", {
    onSuccess: () => { toast.success("Transfert enregistré"); onFermer(); },
    onError: (e) => toast.error(e.message),
  });

  const actifs = comptes.filter((c) => c.actif);
  const valide = !!source && !!dest && source !== dest && !!montant && montant > 0;

  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre="Transfert entre comptes"
      pied={<>
        <Bouton variante="secondaire" onClick={onFermer}>Annuler</Bouton>
        <Bouton variante="primaire" disabled={!valide} chargement={transferer.isPending} onClick={() => transferer.executer({
          p_org: org.id, p_data: { id: nouvelId(), compte_source: source, compte_dest: dest, montant_xof: montant, date, note: note.trim() || null },
        })}>Transférer</Bouton>
      </>}>
      <div className="flex flex-col gap-4">
        <Selection libelle="Depuis" vide="Choisir…" value={source} onChange={(e) => setSource(e.target.value)} options={actifs.map((c) => ({ valeur: c.id, libelle: c.nom }))} />
        <Selection libelle="Vers" vide="Choisir…" value={dest} onChange={(e) => setDest(e.target.value)} options={actifs.filter((c) => c.id !== source).map((c) => ({ valeur: c.id, libelle: c.nom }))} />
        <ChampMontant libelle="Montant" valeur={montant} onChange={setMontant} devise="XOF" />
        <Champ libelle="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Champ libelle="Note" facultatif value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Feuille>
  );
}
