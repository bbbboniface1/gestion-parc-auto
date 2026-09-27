"use client";

import { useState } from "react";
import { toast } from "sonner";
import { nouvelId, useEcriture, useLecture } from "@/lib/api/requetes";
import { useParametres } from "@/lib/api/parametres";
import { useOrg } from "@/lib/session";
import { MODES_PAIEMENT, type ModePaiement } from "@/lib/domaine";
import { aujourdhui, formatFCFA, formatNombre } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Feuille } from "@/components/ui/feuille";
import { Bouton } from "@/components/ui/bouton";
import { Champ, Selection } from "@/components/ui/champ";
import { ChampMontant } from "@/components/ui/champ-montant";
import { celebrer } from "@/lib/celebration";
import { useAuChangement } from "@/lib/reinitialiser";

interface Compte { id: string; nom: string; actif: boolean }

/** Encaissement (ou remboursement, si `venteAnnulee`) sur une vente déjà identifiée. */
export function FeuilleEncaisser({ ouverte, onFermer, venteId, reste, prochaineEcheance, venteAnnulee }: {
  ouverte: boolean;
  onFermer: () => void;
  venteId: string;
  reste?: number | null;
  prochaineEcheance?: number | null;
  venteAnnulee?: boolean;
}) {
  const org = useOrg();
  const { data: reglages } = useParametres();
  const { data: comptes } = useLecture<Compte[]>("comptes_lister", { p_org: org.id }, { enabled: ouverte });
  const modesAutorises = reglages?.parametres.modes_paiement ?? (Object.keys(MODES_PAIEMENT) as ModePaiement[]);

  const [montant, setMontant] = useState<number | null>(null);
  const [mode, setMode] = useState<ModePaiement>(modesAutorises[0] ?? "especes");
  const [reference, setReference] = useState("");
  const [compte, setCompte] = useState("");
  const [date, setDate] = useState(aujourdhui());

  useAuChangement([ouverte, venteId], () => {
    if (!ouverte) return;
    setMontant(venteAnnulee ? null : (prochaineEcheance || reste) ?? null);
    setMode(modesAutorises[0] ?? "especes");
    setReference("");
    setDate(aujourdhui());
  });

  const ajouter = useEcriture("paiement_ajouter", {
    onSuccess: () => {
      if (venteAnnulee) toast.success("Remboursement enregistré");
      else if (montant !== null && reste != null && montant >= reste) celebrer({ type: "solde", titre: "Vente soldée !", detail: `${formatNombre(montant)} FCFA reçus : plus rien à encaisser.` });
      else celebrer({ type: "encaissement", titre: "Versement enregistré", detail: `${formatNombre(montant ?? 0)} FCFA · ${MODES_PAIEMENT[mode]?.libelle ?? ""} · reçu prêt` });
      onFermer();
    },
    onError: (e) => toast.error(e.message),
  });

  const valide = montant !== null && montant > 0;

  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre={venteAnnulee ? "Rembourser le client" : "Encaisser"}
      description={!venteAnnulee && reste ? `Reste à payer : ${formatFCFA(reste)}` : undefined}
      pied={<>
        <Bouton variante="secondaire" onClick={onFermer}>Annuler</Bouton>
        <Bouton variante="primaire" disabled={!valide} chargement={ajouter.isPending} onClick={() => {
          if (!valide || montant === null) return;
          ajouter.executer({
            p_org: org.id,
            p_data: {
              id: nouvelId(), vente_id: venteId, montant_xof: venteAnnulee ? -Math.abs(montant) : montant,
              date, mode, reference: reference.trim() || null, compte_id: compte || null,
            },
          });
        }}>{venteAnnulee ? "Rembourser" : "Encaisser"}</Bouton>
      </>}>
      <div className="flex flex-col gap-4">
        <ChampMontant libelle="Montant" valeur={montant} onChange={setMontant} devise="XOF" autoFocus />
        {!venteAnnulee && !!reste && montant !== reste && (
          <button type="button" onClick={() => setMontant(reste)} className="self-start text-[13px] font-medium text-primaire hover:underline">
            Solder le reste ({formatFCFA(reste)})
          </button>
        )}
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 text-[13px] font-medium text-encre-2">Mode</legend>
          <div className="flex flex-wrap gap-1.5">
            {modesAutorises.map((m) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}
                className={cn("h-10 rounded-controle border px-3 text-[14px] font-medium", mode === m ? "border-primaire bg-primaire-voile text-encre" : "border-trait-fort text-encre-2 hover:bg-surface-2")}>
                {MODES_PAIEMENT[m].libelle}
              </button>
            ))}
          </div>
        </fieldset>
        {MODES_PAIEMENT[mode].avecReference && (
          <Champ libelle="Référence de transaction" facultatif value={reference} onChange={(e) => setReference(e.target.value)} placeholder="MP260924.1532.C84121" />
        )}
        {comptes && comptes.filter((c) => c.actif).length > 0 && (
          <Selection libelle="Sur le compte" facultatif vide="Non précisé" value={compte} onChange={(e) => setCompte(e.target.value)}
            options={comptes.filter((c) => c.actif).map((c) => ({ valeur: c.id, libelle: c.nom }))} />
        )}
        <Champ libelle="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} max={aujourdhui()} />
      </div>
    </Feuille>
  );
}
