"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bank, DeviceMobile, Money, PencilSimple, Plus, type Icon } from "@phosphor-icons/react";
import { nouvelId, useEcriture } from "@/lib/api/requetes";
import { useOrg } from "@/lib/session";
import type { Compte } from "@/lib/api/types-metier";
import { formatFCFA } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Feuille } from "@/components/ui/feuille";
import { Bouton } from "@/components/ui/bouton";
import { Champ, Interrupteur, Selection } from "@/components/ui/champ";
import { ChampMontant } from "@/components/ui/champ-montant";

const TYPES: Record<Compte["type"], { libelle: string; icone: Icon; couleur: string }> = {
  caisse: { libelle: "Caisse (espèces)", icone: Money, couleur: "var(--gain-plein)" },
  mobile_money: { libelle: "Mobile money", icone: DeviceMobile, couleur: "var(--accent-plein)" },
  banque: { libelle: "Compte bancaire", icone: Bank, couleur: "var(--nuit-2)" },
};

interface Brouillon { id: string | null; nom: string; type: Compte["type"]; soldeInitial: number | null; actif: boolean }

function FormulaireCompte({ initial, onRetour }: { initial: Brouillon; onRetour: () => void }) {
  const org = useOrg();
  const [nom, setNom] = useState(initial.nom);
  const [type, setType] = useState<Compte["type"]>(initial.type);
  const [soldeInitial, setSoldeInitial] = useState<number | null>(initial.soldeInitial);
  const [actif, setActif] = useState(initial.actif);
  const enregistrer = useEcriture("compte_enregistrer", {
    onSuccess: () => { toast.success(initial.id ? "Compte mis à jour" : "Compte créé"); onRetour(); },
    onError: (e) => toast.error(e.message),
  });
  const valide = nom.trim().length > 0;
  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => {
      e.preventDefault();
      if (!valide) return;
      enregistrer.executer({ p_org: org.id, p_data: { id: initial.id ?? nouvelId(), nom: nom.trim(), type, solde_initial: soldeInitial ?? 0, actif } });
    }}>
      <Champ libelle="Nom du compte" placeholder="Orange Money, Caisse du parc, BDM…" value={nom} onChange={(e) => setNom(e.target.value)} autoFocus />
      <Selection libelle="Type" value={type} onChange={(e) => setType(e.target.value as Compte["type"])} options={Object.entries(TYPES).map(([valeur, t]) => ({ valeur, libelle: t.libelle }))} />
      <ChampMontant libelle="Solde de départ" aide="Ce que contenait le compte avant d'utiliser l'application. Les mouvements s'y ajoutent ensuite." valeur={soldeInitial} onChange={setSoldeInitial} />
      {initial.id && <Interrupteur actif={actif} onChange={setActif} libelle="Compte utilisé" description="Désactivé, il disparaît des choix de paiement mais garde son historique." />}
      <div className="flex justify-end gap-2 pt-1">
        <Bouton variante="secondaire" onClick={onRetour}>Retour</Bouton>
        <Bouton variante="primaire" type="submit" disabled={!valide} chargement={enregistrer.isPending}>Enregistrer</Bouton>
      </div>
    </form>
  );
}

/** Ouvrir, renommer ou mettre de côté un compte (caisse, mobile money, banque). */
export function FeuilleComptes({ ouverte, onFermer, comptes }: { ouverte: boolean; onFermer: () => void; comptes: Compte[] }) {
  const [edition, setEdition] = useState<Brouillon | null>(null);
  const fermer = () => { setEdition(null); onFermer(); };
  return (
    <Feuille ouverte={ouverte} onFermer={fermer} titre={edition ? (edition.id ? "Modifier le compte" : "Nouveau compte") : "Vos comptes"}
      description={edition ? undefined : "Là où l'argent entre et sort : caisse, mobile money, banque."}>
      {edition ? (
        <FormulaireCompte key={edition.id ?? "nouveau"} initial={edition} onRetour={() => setEdition(null)} />
      ) : (
        <div className="flex flex-col gap-2">
          {comptes.map((c) => {
            const t = TYPES[c.type];
            return (
              <button key={c.id} type="button" onClick={() => setEdition({ id: c.id, nom: c.nom, type: c.type, soldeInitial: c.solde_initial, actif: c.actif })}
                className={cn("onde carte carte-lien group flex items-center gap-3 p-3 text-left", !c.actif && "opacity-60")}>
                <span className="grid size-11 shrink-0 place-items-center rounded-xl text-white" style={{ background: t.couleur }}><t.icone size={22} weight="fill" aria-hidden /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold group-hover:text-primaire">{c.nom}</span>
                  <span className="block text-[13px] text-encre-3">{t.libelle}{!c.actif ? " · désactivé" : ""}</span>
                </span>
                <span className="chiffres shrink-0 text-right text-[15px] font-bold">{formatFCFA(c.solde_xof ?? 0)}</span>
                <PencilSimple size={16} weight="duotone" className="shrink-0 text-encre-3" aria-hidden />
              </button>
            );
          })}
          {comptes.length === 0 && <p className="py-4 text-center text-encre-3">Aucun compte pour l&apos;instant.</p>}
          <Bouton className="mt-2" variante="secondaire" icone={<Plus size={18} weight="bold" />} onClick={() => setEdition({ id: null, nom: "", type: "mobile_money", soldeInitial: null, actif: true })}>Nouveau compte</Bouton>
        </div>
      )}
    </Feuille>
  );
}
