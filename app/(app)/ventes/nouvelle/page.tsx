"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { nouvelId, useEcriture, useLecture } from "@/lib/api/requetes";
import { useParametres } from "@/lib/api/parametres";
import { useOrg } from "@/lib/session";
import type { Vehicule } from "@/lib/api/types";
import { MODES_PAIEMENT, type ModePaiement } from "@/lib/domaine";
import { aujourdhui, formatFCFA, formatNombre } from "@/lib/format";
import { cn } from "@/lib/cn";
import { ChoixClient } from "@/components/metier/feuilles-vehicule";
import { ChoixVehicule } from "@/components/ventes/choix-vehicule";
import { EnTetePage } from "@/components/coque/coque";
import { Bouton } from "@/components/ui/bouton";
import { Champ } from "@/components/ui/champ";
import { ChampMontant } from "@/components/ui/champ-montant";
import { Choix } from "@/components/ui/choix";
import { Registre } from "@/components/metier/registre";

interface ClientLigne { id: string; nom: string; telephone: string | null; ville: string | null }
interface Echeance { date: string; montant: number }

function ajouterMois(date: string, n: number): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

function genererEcheances(total: number, nb: number, premiereDate: string): Echeance[] {
  if (nb <= 0 || total <= 0) return [];
  const base = Math.floor(total / nb);
  const reste = total - base * nb;
  return Array.from({ length: nb }, (_, i) => ({
    date: ajouterMois(premiereDate, i),
    montant: base + (i === nb - 1 ? reste : 0),
  }));
}

function NouvelleVente() {
  const org = useOrg();
  const router = useRouter();
  const params = useSearchParams();
  const { data: reglages } = useParametres();
  const idVehiculePreselectionne = params.get("vehicule");
  const preselection = useLecture<Vehicule>("vehicule_obtenir", { p_org: org.id, p_id: idVehiculePreselectionne! }, { enabled: !!idVehiculePreselectionne });

  const [vehicule, setVehicule] = useState<Vehicule | null>(null);
  const [client, setClient] = useState<ClientLigne | null>(null);
  const [prix, setPrix] = useState<number | null>(null);
  const [remise, setRemise] = useState<number | null>(null);
  const [mode, setMode] = useState<"comptant" | "echelonne">("comptant");
  const [nbEcheances, setNbEcheances] = useState(3);
  const [premiereEcheance, setPremiereEcheance] = useState(() => ajouterMois(aujourdhui(), 1));
  const [acompte, setAcompte] = useState<number | null>(null);
  const [encaisserMaintenant, setEncaisserMaintenant] = useState<number | null>(null);
  const [modePaiement, setModePaiement] = useState<ModePaiement>("especes");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [id] = useState(nouvelId);

  useEffect(() => {
    if (preselection.data && !vehicule) setVehicule(preselection.data);
  }, [preselection.data, vehicule]);
  useEffect(() => {
    if (vehicule && prix === null) setPrix(vehicule.prix_affiche_xof);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicule]);

  const p = reglages?.parametres;
  const modesAutorises = p?.modes_paiement ?? (Object.keys(MODES_PAIEMENT) as ModePaiement[]);
  const ttc = Math.max(0, (prix ?? 0) - (remise ?? 0));
  const tvaTaux = p?.tva_active ? p.tva_taux : 0;
  const ht = tvaTaux > 0 ? Math.round(ttc / (1 + tvaTaux / 100)) : ttc;
  const tva = ttc - ht;
  const livraisonAlarriveee = vehicule ? vehicule.etape !== "parc" : false;

  const echeances = useMemo(() => genererEcheances(ttc - (acompte ?? 0), nbEcheances, premiereEcheance), [ttc, acompte, nbEcheances, premiereEcheance]);
  const [echeancesModifiees, setEcheancesModifiees] = useState<Echeance[] | null>(null);
  const echeancesFinales = echeancesModifiees ?? echeances;
  const sommeEcheances = (acompte ?? 0) + echeancesFinales.reduce((s, e) => s + e.montant, 0);

  const creer = useEcriture<{ id: string; numero: string }>("vente_creer", {
    onSuccess: (v) => { toast.success(`Vente ${v?.numero ?? ""} enregistrée`); router.push(`/ventes/fiche/?id=${v?.id ?? ""}`); },
    onError: (e) => toast.error(e.message),
  });

  const valide = !!vehicule && !!client && ttc > 0
    && (mode === "comptant" || (echeancesFinales.length > 0 && sommeEcheances === ttc))
    && (!encaisserMaintenant || encaisserMaintenant <= ttc);

  function envoyer() {
    if (!valide || !vehicule || !client) return;
    creer.executer({
      p_org: org.id,
      p_data: {
        id, vehicule_id: vehicule.id, client_id: client.id, prix_xof: prix, remise_xof: remise ?? 0,
        date_vente: aujourdhui(), mode, notes: notes.trim() || null,
        acompte: mode === "echelonne" && acompte
          ? { montant_xof: acompte, mode: modePaiement, reference: reference.trim() || null }
          : mode === "comptant" && encaisserMaintenant
          ? { montant_xof: encaisserMaintenant, mode: modePaiement, reference: reference.trim() || null }
          : undefined,
        echeances: mode === "echelonne" ? echeancesFinales.map((e) => ({ date_echeance: e.date, montant_xof: e.montant })) : undefined,
      },
    });
  }

  return (
    <>
      <EnTetePage titre="Nouvelle vente" />
      <div className="grid gap-5 pb-28 lg:grid-cols-12 lg:pb-8">
        <div className="flex flex-col gap-4 lg:col-span-7">
          <section className="border-t-2 border-encre pt-3">
            <h2 className="mb-3 text-corps font-semibold">Véhicule</h2>
            <ChoixVehicule valeur={vehicule} onChoix={setVehicule} />
            {livraisonAlarriveee && vehicule && <p className="mt-2 text-petit text-ocre">Ce véhicule n&apos;est pas encore au parc : la facture indiquera une livraison à l&apos;arrivée.</p>}
          </section>

          <section className="border-t-2 border-encre pt-3">
            <h2 className="mb-3 text-corps font-semibold">Client</h2>
            <ChoixClient valeur={client} onChoix={setClient} />
          </section>

          <section className="border-t-2 border-encre pt-3">
            <h2 className="mb-3 text-corps font-semibold">Prix et modalités</h2>
            <div className="grid grid-cols-2 gap-3">
              <ChampMontant libelle="Prix de vente" valeur={prix} onChange={setPrix} devise="XOF" />
              <ChampMontant libelle="Remise" facultatif valeur={remise} onChange={setRemise} devise="XOF" />
            </div>
            <div className="mt-4">
              <Choix libelle="Paiement" colonnes={2} valeur={mode} onChange={(v) => v && setMode(v)}
                options={[{ valeur: "comptant", libelle: "Comptant" }, { valeur: "echelonne", libelle: "Échelonné" }]} />
            </div>

            {mode === "echelonne" ? (
              <div className="mt-4 flex flex-col gap-3">
                <ChampMontant libelle="Acompte" facultatif valeur={acompte} onChange={setAcompte} devise="XOF" />
                <div className="grid grid-cols-2 gap-3">
                  <Champ libelle="Nombre d'échéances" type="number" min={1} max={24} value={String(nbEcheances)}
                    onChange={(e) => setNbEcheances(Math.max(1, Math.min(24, Number(e.target.value) || 1)))} />
                  <Champ libelle="Première échéance" type="date" value={premiereEcheance} onChange={(e) => setPremiereEcheance(e.target.value)} />
                </div>
                <div className="rounded-controle bg-surface-2">
                  {echeancesFinales.map((e, i) => (
                    <div key={i} className="flex items-center gap-2 border-b border-trait px-3 py-2 text-corps last:border-b-0">
                      <span className="w-6 shrink-0 text-encre-3">{i + 1}.</span>
                      <input type="date" value={e.date} onChange={(ev) => setEcheancesModifiees(echeancesFinales.map((x, j) => j === i ? { ...x, date: ev.target.value } : x))}
                        className="h-9 rounded-t-controle border-0 border-b-2 border-trait-fort bg-surface-2 px-2 text-petit" />
                      <input type="number" value={e.montant} onChange={(ev) => setEcheancesModifiees(echeancesFinales.map((x, j) => j === i ? { ...x, montant: Number(ev.target.value) || 0 } : x))}
                        className="chiffres h-9 flex-1 rounded-t-controle border-0 border-b-2 border-trait-fort bg-surface-2 px-2 text-right text-petit" />
                    </div>
                  ))}
                </div>
                <p className={cn("text-petit", sommeEcheances === ttc ? "text-encre-3" : "text-perte")}>
                  Acompte + échéances : {formatFCFA(sommeEcheances)} {sommeEcheances !== ttc && `(devrait faire ${formatFCFA(ttc)})`}
                </p>
              </div>
            ) : (
              <div className="mt-4">
                <ChampMontant libelle="Encaisser aujourd'hui" facultatif valeur={encaisserMaintenant} onChange={setEncaisserMaintenant} devise="XOF" aide="Laissez vide pour facturer sans encaisser." />
              </div>
            )}

            {((mode === "echelonne" && acompte) || (mode === "comptant" && encaisserMaintenant)) ? (
              <div className="mt-4 flex flex-col gap-3 border-t border-trait pt-4">
                <fieldset className="flex flex-col gap-1.5">
                  <legend className="mb-1 text-petit font-medium text-encre-2">Mode de paiement</legend>
                  <div className="flex flex-wrap gap-1.5">
                    {modesAutorises.map((m) => (
                      <button key={m} type="button" aria-pressed={modePaiement === m} onClick={() => setModePaiement(m)}
                        className={cn("h-10 rounded-controle px-3 font-medium", modePaiement === m ? "bg-encre text-surface" : "bg-surface-2 text-encre-2 hover:bg-trait")}>
                        {MODES_PAIEMENT[m].libelle}
                      </button>
                    ))}
                  </div>
                </fieldset>
                {MODES_PAIEMENT[modePaiement].avecReference && <Champ libelle="Référence de transaction" facultatif value={reference} onChange={(e) => setReference(e.target.value)} />}
              </div>
            ) : null}

            <Champ libelle="Notes" facultatif classeConteneur="mt-4" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </section>
        </div>

        <aside className="flex flex-col gap-4 lg:col-span-5">
          <section className="border-t-2 border-encre pt-3 lg:sticky lg:top-8">
            <h2 className="mb-3 text-corps font-semibold">Récapitulatif</h2>
            <Registre lignes={[
              ...(remise ? [{ libelle: "Prix", valeur: formatNombre(prix ?? 0) }, { libelle: "Remise", valeur: `− ${formatNombre(remise)}` }] : []),
              ...(tvaTaux > 0 ? [{ libelle: "Hors taxes", valeur: formatNombre(ht) }, { libelle: `TVA ${tvaTaux}%`, valeur: formatNombre(tva) }] : []),
              { libelle: "Total", valeur: formatFCFA(ttc), fort: true },
            ]} />
            {vehicule && client && (
              <p className="mt-3 text-petit text-encre-3">{client.nom} · {vehicule.libelle}</p>
            )}
          </section>
          <div className="zone-sure-bas fixed inset-x-0 bottom-16 z-30 flex gap-2 border-t border-trait bg-surface/95 px-4 py-3 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <Bouton variante="secondaire" className="flex-1 lg:flex-none" onClick={() => router.back()}>Annuler</Bouton>
            <Bouton variante="primaire" className="flex-[2] lg:flex-none" disabled={!valide} chargement={creer.isPending} onClick={envoyer}>Enregistrer la vente</Bouton>
          </div>
        </aside>
      </div>
    </>
  );
}

export default function PageNouvelleVente() {
  return (
    <Suspense>
      <NouvelleVente />
    </Suspense>
  );
}
