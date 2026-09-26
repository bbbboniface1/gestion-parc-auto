"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MagnifyingGlass, UserPlus } from "@phosphor-icons/react";
import { nouvelId, useEcriture, useLecture } from "@/lib/api/requetes";
import { useOrg } from "@/lib/session";
import { ETAPES, type Etape } from "@/lib/domaine";
import { aujourdhui } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";
import { Feuille } from "@/components/ui/feuille";
import { Bouton } from "@/components/ui/bouton";
import { Champ, ZoneTexte } from "@/components/ui/champ";
import { cn } from "@/lib/cn";
import { celebrer } from "@/lib/celebration";
import { etape as defEtapeCelebration } from "@/lib/domaine";
import { useAuChangement } from "@/lib/reinitialiser";

export function FeuilleEtape({ ouverte, onFermer, vehiculeId, actuelle, proposee }: {
  ouverte: boolean; onFermer: () => void; vehiculeId: string; actuelle: Etape; proposee?: Etape | null;
}) {
  const org = useOrg();
  const [etape, setEtape] = useState<Etape>(proposee ?? actuelle);
  const [date, setDate] = useState(aujourdhui());
  const [note, setNote] = useState("");
  useAuChangement([ouverte, proposee, actuelle], () => {
    if (ouverte) { setEtape(proposee ?? actuelle); setDate(aujourdhui()); setNote(""); }
  });
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
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[14px] font-medium text-encre-2">Nouvelle étape</legend>
        {ETAPES.map((e) => (
          <label key={e.code} className={cn("flex h-12 cursor-pointer items-center gap-3 rounded-controle border px-3", etape === e.code ? "border-primaire bg-primaire-voile" : "border-trait")}>
            <input type="radio" name="etape" value={e.code} checked={etape === e.code} onChange={() => setEtape(e.code)} className="accent-[var(--primaire)]" />
            <span aria-hidden className="h-6 w-1 rounded-full" style={{ background: e.couleur }} />
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
      <div className="apparition flex items-center gap-3 rounded-carte bg-primaire-voile px-4 py-3 ring-2 ring-primaire/40">
        <Avatar nom={valeur.nom} taille={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[18px] font-extrabold">{valeur.nom}</p>
          <p className="truncate text-[14px] text-encre-2">{[valeur.telephone, valeur.ville].filter(Boolean).join(" · ")}</p>
        </div>
        <button type="button" onClick={() => onChoix(null)} className="onde inline-flex h-11 shrink-0 items-center rounded-full bg-surface px-4 text-[14px] font-semibold text-primaire shadow-champ hover:bg-primaire-plein hover:text-sur-primaire lg:h-10">Changer</button>
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
        <MagnifyingGlass className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-encre-3" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom ou téléphone"
          className="h-12 w-full rounded-full border border-trait bg-surface pr-4 pl-11 text-[16px] shadow-champ transition-all placeholder:text-encre-3/70 focus:border-primaire focus:shadow-[0_0_0_4px_var(--primaire-voile)] focus:outline-none lg:h-10 lg:text-[14px]" />
      </label>
      <ul className="grid gap-1 @xl:grid-cols-2">
        {liste.map((c, i) => (
          <li key={c.id} className="apparition" style={{ animationDelay: `${i * 30}ms` }}>
            <button type="button" onClick={() => onChoix(c)} className="onde group flex w-full items-center gap-3 rounded-controle p-2 text-left transition-colors hover:bg-surface-2">
              <Avatar nom={c.nom} taille={40} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold group-hover:text-primaire">{c.nom}</span>
                <span className="block truncate text-[14px] text-encre-3">{c.telephone ?? c.ville ?? "—"}</span>
              </span>
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
