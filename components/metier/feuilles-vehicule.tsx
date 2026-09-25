"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MagnifyingGlass, UserPlus } from "@phosphor-icons/react";
import { nouvelId, useEcriture, useLecture } from "@/lib/api/requetes";
import { useOrg } from "@/lib/session";
import { ETAPES, type Etape } from "@/lib/domaine";
import { aujourdhui } from "@/lib/format";
import { Feuille } from "@/components/ui/feuille";
import { Bouton } from "@/components/ui/bouton";
import { Champ, ZoneTexte } from "@/components/ui/champ";
import { cn } from "@/lib/cn";
import { celebrer } from "@/lib/celebration";
import { etape as defEtapeCelebration } from "@/lib/domaine";

export function FeuilleEtape({ ouverte, onFermer, vehiculeId, actuelle, proposee }: {
  ouverte: boolean; onFermer: () => void; vehiculeId: string; actuelle: Etape; proposee?: Etape | null;
}) {
  const org = useOrg();
  const [etape, setEtape] = useState<Etape>(proposee ?? actuelle);
  const [date, setDate] = useState(aujourdhui());
  const [note, setNote] = useState("");
  useEffect(() => {
    if (ouverte) { setEtape(proposee ?? actuelle); setDate(aujourdhui()); setNote(""); }
  }, [ouverte, proposee, actuelle]);
  const changer = useEcriture("vehicule_changer_etape", {
    onSuccess: () => { const d = defEtapeCelebration(etape); celebrer({ type: "etape", titre: `${d.libelle} : c'est noté`, detail: date === aujourdhui() ? "Le véhicule avance sur son trajet." : `Étape datée du ${date.split("-").reverse().join("/")}.`, couleur: d.couleur }); onFermer(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre="Changer d'étape"
      pied={<>
        <Bouton variante="secondaire" onClick={onFermer}>Annuler</Bouton>
        <Bouton variante="primaire" disabled={etape === actuelle} chargement={changer.isPending}
          onClick={() => changer.executer({ p_org: org.id, p_id: vehiculeId, p_etape: etape, p_date: date, p_note: note.trim() || null })}>
          Enregistrer
        </Bouton>
      </>}>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-2 text-[13px] font-medium text-encre-2">Nouvelle étape</legend>
        {ETAPES.map((e) => (
          <label key={e.code} className={cn("flex h-12 cursor-pointer items-center gap-3 rounded-controle border px-3", etape === e.code ? "border-primaire bg-primaire-voile" : "border-trait")}>
            <input type="radio" name="etape" value={e.code} checked={etape === e.code} onChange={() => setEtape(e.code)} className="accent-[var(--primaire)]" />
            <span aria-hidden className="h-5 w-[3px] rounded-sm" style={{ background: e.couleur }} />
            <span className="flex-1 font-medium">{e.libelle}</span>
            {e.code === actuelle && <span className="text-[12px] text-encre-3">actuelle</span>}
          </label>
        ))}
      </fieldset>
      <div className="mt-4 flex flex-col gap-4">
        <Champ libelle="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <ZoneTexte libelle="Note" facultatif rows={2} placeholder="Ex. déchargé au terminal Bolloré, magasin 4" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Feuille>
  );
}

interface ClientLigne { id: string; nom: string; telephone: string | null; ville: string | null }

/** Choisir un client existant ou le créer en deux champs, sans quitter l'écran. */
export function ChoixClient({ valeur, onChoix }: { valeur: ClientLigne | null; onChoix: (c: ClientLigne | null) => void }) {
  const org = useOrg();
  const [q, setQ] = useState("");
  const [creation, setCreation] = useState(false);
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const { data } = useLecture<ClientLigne[]>("clients_lister", { p_org: org.id, p_recherche: q.trim() || null });
  const creer = useEcriture<{ id: string; nom: string; telephone: string | null; ville: string | null }>("client_enregistrer", {
    onSuccess: (c) => { onChoix({ id: c.id, nom: c.nom, telephone: c.telephone, ville: c.ville }); setCreation(false); },
    onError: (e) => toast.error(e.message),
  });
  const liste = useMemo(() => (data ?? []).slice(0, 8), [data]);

  if (valeur) {
    return (
      <div className="flex items-center justify-between rounded-controle border border-primaire bg-primaire-voile px-3 py-2.5">
        <div>
          <p className="font-semibold">{valeur.nom}</p>
          <p className="text-[13px] text-encre-2">{[valeur.telephone, valeur.ville].filter(Boolean).join(" · ")}</p>
        </div>
        <Bouton variante="fantome" taille="sm" onClick={() => onChoix(null)}>Changer</Bouton>
      </div>
    );
  }
  if (creation) {
    return (
      <div className="flex flex-col gap-3 rounded-controle border border-trait p-3">
        <Champ libelle="Nom complet" value={nom} onChange={(e) => setNom(e.target.value)} autoFocus />
        <Champ libelle="Téléphone" type="tel" inputMode="tel" placeholder="70 12 34 56" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
        <div className="flex gap-2">
          <Bouton variante="secondaire" taille="sm" onClick={() => setCreation(false)}>Retour</Bouton>
          <Bouton variante="primaire" taille="sm" disabled={nom.trim().length < 2} chargement={creer.isPending}
            onClick={() => creer.executer({ p_org: org.id, p_data: { id: nouvelId(), nom: nom.trim(), telephone: telephone.trim() || null } })}>
            Créer le client
          </Bouton>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <label className="relative">
        <span className="sr-only">Rechercher un client</span>
        <MagnifyingGlass className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-encre-3" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom ou téléphone"
          className="h-11 w-full rounded-controle border border-trait-fort bg-surface pl-9 text-[15px] focus:border-primaire focus:outline-none" />
      </label>
      <ul className="flex flex-col">
        {liste.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => onChoix(c)} className="flex w-full items-center justify-between border-b border-trait px-1 py-2.5 text-left hover:bg-surface-2">
              <span className="font-medium">{c.nom}</span>
              <span className="text-[13px] text-encre-3">{c.telephone}</span>
            </button>
          </li>
        ))}
      </ul>
      <Bouton variante="fantome" icone={<UserPlus className="size-4" />} onClick={() => { setNom(q); setCreation(true); }} className="self-start">
        Nouveau client
      </Bouton>
    </div>
  );
}

export function FeuilleReservation({ ouverte, onFermer, vehiculeId }: { ouverte: boolean; onFermer: () => void; vehiculeId: string }) {
  const org = useOrg();
  const [client, setClient] = useState<ClientLigne | null>(null);
  const [jusquau, setJusquau] = useState("");
  const reserver = useEcriture("vehicule_reserver", {
    onSuccess: () => { celebrer({ type: "simple", titre: "Véhicule réservé", detail: "Personne d'autre ne pourra le vendre d'ici là." }); onFermer(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre="Réserver pour un client" description="Le véhicule n'apparaît plus comme disponible."
      pied={<>
        <Bouton variante="secondaire" onClick={onFermer}>Annuler</Bouton>
        <Bouton variante="primaire" disabled={!client} chargement={reserver.isPending}
          onClick={() => client && reserver.executer({ p_org: org.id, p_id: vehiculeId, p_client_id: client.id, p_jusqu_au: jusquau || null })}>
          Réserver
        </Bouton>
      </>}>
      <div className="flex flex-col gap-4">
        <ChoixClient valeur={client} onChoix={setClient} />
        <Champ libelle="Réservé jusqu'au" type="date" facultatif value={jusquau} onChange={(e) => setJusquau(e.target.value)}
          aide="Passé cette date, une alerte apparaît dans « À faire »." />
      </div>
    </Feuille>
  );
}
