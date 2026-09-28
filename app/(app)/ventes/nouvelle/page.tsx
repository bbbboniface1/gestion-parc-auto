"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { nouvelId, useEcriture, useLecture } from "@/lib/api/requetes";
import { useParametres } from "@/lib/api/parametres";
import { useOrg } from "@/lib/session";
import type { Vehicule } from "@/lib/api/types";
import { MODES_PAIEMENT, peut, type ModePaiement } from "@/lib/domaine";
import { EtatVide } from "@/components/ui/etats";
import { aujourdhui, formatFCFA, formatNombre } from "@/lib/format";
import { cn } from "@/lib/cn";
import { CalendarCheck, CarProfile, CheckCircle, HandCoins, Invoice, Money, UserCircle, Warning } from "@phosphor-icons/react";
import { useCompteur } from "@/lib/animation";
import { Avatar } from "@/components/ui/avatar";
import { PhotoVehicule } from "@/components/metier/photo-vehicule";
import { EtapeVente } from "@/components/ventes/etape-vente";
import { MODES_VISUELS } from "@/components/ventes/paiement-visuel";
import { ChoixClient } from "@/components/metier/feuilles-vehicule";
import { ChoixVehicule } from "@/components/ventes/choix-vehicule";
import { EnTetePage } from "@/components/coque/coque";
import { Bouton } from "@/components/ui/bouton";
import { Champ } from "@/components/ui/champ";
import { ChampMontant } from "@/components/ui/champ-montant";
import { Registre } from "@/components/metier/registre";
import { celebrer } from "@/lib/celebration";
import { useAuChangement } from "@/lib/reinitialiser";

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

  useAuChangement([preselection.data, vehicule], () => {
    if (preselection.data && !vehicule) setVehicule(preselection.data);
  });
  useAuChangement([vehicule], () => {
    if (vehicule && prix === null) setPrix(vehicule.prix_affiche_xof);
  });

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
    onSuccess: (v) => { celebrer({ type: "vente", titre: "Vente enregistrée", detail: `Facture ${v?.numero ?? ""} prête à envoyer` }); router.push(`/ventes/fiche/?id=${v?.id ?? ""}`); },
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

  const totalAffiche = useCompteur(ttc, 450);
  const manque = [
    !vehicule && "le véhicule",
    !client && "le client",
    !(ttc > 0) && "le prix",
    mode === "echelonne" && ttc > 0 && sommeEcheances !== ttc && "des échéances qui totalisent le prix",
    !!encaisserMaintenant && encaisserMaintenant > ttc && "un encaissement qui ne dépasse pas le total",
  ].filter((x): x is string => !!x);
  const acomptePrevu = mode === "echelonne" ? acompte : encaisserMaintenant;

  return (
    <>
      <EnTetePage surtitre="Facturer" titre="Nouvelle vente" sousTitre="Le véhicule, le client, le prix : la facture est prête à envoyer sur WhatsApp." />
      <div className="grid gap-5 pb-28 lg:grid-cols-12 lg:items-start lg:pb-8">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-7">
          <EtapeVente numero={1} titre="Quel véhicule ?" fait={!!vehicule} couleur="var(--etape-achete)" icone={CarProfile}>
            <ChoixVehicule valeur={vehicule} onChoix={setVehicule} />
            {livraisonAlarriveee && vehicule && (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-ocre-voile px-3 py-2 text-[13px] text-ocre-texte"><Warning size={16} weight="fill" className="mt-0.5 shrink-0" aria-hidden />Ce véhicule n&apos;est pas encore au parc : la facture indiquera une livraison à l&apos;arrivée.</p>
            )}
          </EtapeVente>

          <EtapeVente numero={2} titre="Pour quel client ?" fait={!!client} couleur="var(--reserve)" icone={UserCircle}>
            <ChoixClient valeur={client} onChoix={setClient} />
          </EtapeVente>

          <EtapeVente numero={3} titre="À quel prix, et comment ?" fait={valide} couleur="var(--accent)" icone={HandCoins}>
            <div className="grid grid-cols-2 gap-3">
              <ChampMontant libelle="Prix de vente" valeur={prix} onChange={setPrix} devise="XOF" />
              <ChampMontant libelle="Remise" facultatif valeur={remise} onChange={setRemise} devise="XOF" />
            </div>

            <fieldset className="mt-5">
              <legend className="mb-2 text-[13px] font-medium text-encre-2">Le client paie…</legend>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ["comptant", "Comptant", "En une fois, aujourd'hui ou à la livraison", Money, "var(--gain)"],
                  ["echelonne", "Échelonné", "Un acompte, puis des échéances", CalendarCheck, "var(--primaire)"],
                ] as const).map(([valeur, titre, aide, Ico, couleur]) => (
                  <button key={valeur} type="button" aria-pressed={mode === valeur} onClick={() => setMode(valeur)}
                    className={cn("onde flex flex-col items-start gap-2 rounded-2xl border p-3 text-left transition-all", mode === valeur ? "border-transparent shadow-carte ring-2" : "border-trait bg-surface hover:border-trait-fort")}
                    style={mode === valeur ? { background: `color-mix(in srgb, ${couleur} 9%, var(--surface))`, boxShadow: `0 0 0 2px ${couleur}` } : undefined}>
                    <span className="grid size-9 place-items-center rounded-xl text-white" style={{ background: couleur }}><Ico size={20} weight="fill" aria-hidden /></span>
                    <span className="block text-[15px] font-bold">{titre}</span>
                    <span className="block text-[12px] leading-snug text-encre-3">{aide}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            {mode === "echelonne" ? (
              <div className="mt-4 flex flex-col gap-3">
                <ChampMontant libelle="Acompte" facultatif valeur={acompte} onChange={setAcompte} devise="XOF" />
                <div className="grid grid-cols-2 gap-3">
                  <Champ libelle="Nombre d'échéances" type="number" min={1} max={24} value={String(nbEcheances)}
                    onChange={(e) => setNbEcheances(Math.max(1, Math.min(24, Number(e.target.value) || 1)))} />
                  <Champ libelle="Première échéance" type="date" value={premiereEcheance} onChange={(e) => setPremiereEcheance(e.target.value)} />
                </div>
                <div className="overflow-hidden rounded-2xl border border-trait">
                  {echeancesFinales.map((e, i) => (
                    <div key={i} className="flex items-center gap-2 border-b border-trait px-3 py-2 text-[14px] last:border-b-0">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primaire-voile text-[12px] font-bold text-primaire">{i + 1}</span>
                      <input type="date" value={e.date} onChange={(ev) => setEcheancesModifiees(echeancesFinales.map((x, j) => j === i ? { ...x, date: ev.target.value } : x))}
                        className="h-9 rounded-controle border border-trait-fort bg-surface px-2 text-[13px]" />
                      <input type="number" value={e.montant} onChange={(ev) => setEcheancesModifiees(echeancesFinales.map((x, j) => j === i ? { ...x, montant: Number(ev.target.value) || 0 } : x))}
                        className="chiffres h-9 flex-1 rounded-controle border border-trait-fort bg-surface px-2 text-right text-[13px]" />
                    </div>
                  ))}
                </div>
                <p className={cn("flex items-center gap-1.5 text-[13px]", sommeEcheances === ttc ? "font-semibold text-gain-texte" : "font-semibold text-perte-texte")}>
                  {sommeEcheances === ttc ? <CheckCircle size={16} weight="fill" aria-hidden /> : <Warning size={16} weight="fill" aria-hidden />}
                  Acompte + échéances : {formatFCFA(sommeEcheances)} {sommeEcheances !== ttc && `(devrait faire ${formatFCFA(ttc)})`}
                </p>
              </div>
            ) : (
              <div className="mt-4">
                <ChampMontant libelle="Encaisser aujourd'hui" facultatif valeur={encaisserMaintenant} onChange={setEncaisserMaintenant} devise="XOF" aide="Laissez vide pour facturer sans encaisser." />
              </div>
            )}

            {acomptePrevu ? (
              <div className="apparition mt-4 flex flex-col gap-3 border-t border-trait pt-4">
                <fieldset className="flex flex-col gap-1.5">
                  <legend className="mb-1 text-[13px] font-medium text-encre-2">Payé par</legend>
                  <div className="flex flex-wrap gap-2">
                    {modesAutorises.map((m) => {
                      const visuel = MODES_VISUELS[m] ?? MODES_VISUELS.autre!;
                      const actif = modePaiement === m;
                      return (
                        <button key={m} type="button" aria-pressed={actif} onClick={() => setModePaiement(m)}
                          className={cn("onde inline-flex h-11 items-center gap-2 rounded-full border px-3.5 text-[14px] font-semibold transition-all", actif ? "border-transparent text-white shadow-carte" : "border-trait-fort bg-surface text-encre-2 hover:text-encre")}
                          style={actif ? { background: visuel.couleur } : undefined}>
                          <visuel.icone size={18} weight="fill" style={actif ? undefined : { color: visuel.couleur }} aria-hidden />
                          {MODES_PAIEMENT[m].libelle}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
                {MODES_PAIEMENT[modePaiement].avecReference && <Champ libelle="Référence de transaction" facultatif value={reference} onChange={(e) => setReference(e.target.value)} />}
              </div>
            ) : null}

            <Champ libelle="Notes" facultatif classeConteneur="mt-4" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </EtapeVente>
        </div>

        <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-6 lg:col-span-5">
          <section className="carte apparition overflow-hidden" aria-label="Récapitulatif">
            <div className="relative bg-gradient-to-br from-[#16275a] to-[#0b1633] text-white">
              {vehicule ? (
                <>
                  <PhotoVehicule path={vehicule.photo_principale_path} alt="" arrondi={false} className="aspect-[16/7] w-full opacity-70" />
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0b1633] via-[#0b1633]/40 to-transparent" />
                  <div className="absolute inset-x-4 bottom-3">
                    <p className="etiquette text-[11px] text-white/70">{vehicule.reference}</p>
                    <p className="truncate text-[19px] leading-tight font-extrabold">{vehicule.libelle}</p>
                  </div>
                </>
              ) : (
                <div className="grid place-items-center px-4 py-6 text-center text-[14px] text-white/70 lg:py-10"><span>Le véhicule choisi apparaîtra ici.</span></div>
              )}
            </div>
            <div className="p-4 lg:p-5">
              {client ? (
                <p className="flex items-center gap-2.5 text-[14px]"><Avatar nom={client.nom} taille={32} /><span className="min-w-0"><span className="block truncate font-bold">{client.nom}</span>{client.telephone && <span className="block text-[12px] text-encre-3">{client.telephone}</span>}</span></p>
              ) : (
                <p className="text-[14px] text-encre-3">Le client sera indiqué ici.</p>
              )}
              <Registre className="mt-2" lignes={[
                ...(remise ? [{ libelle: "Prix", valeur: formatNombre(prix ?? 0) }, { libelle: "Remise", valeur: `− ${formatNombre(remise)}` }] : []),
                ...(tvaTaux > 0 ? [{ libelle: "Hors taxes", valeur: formatNombre(ht) }, { libelle: `TVA ${tvaTaux}%`, valeur: formatNombre(tva) }] : []),
                ...(acomptePrevu ? [{ libelle: mode === "echelonne" ? "Acompte" : "Encaissé aujourd'hui", valeur: formatNombre(acomptePrevu) }] : []),
              ]} />
              <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-trait pt-3">
                <span className="text-[14px] font-semibold whitespace-nowrap text-encre-2">Total à payer</span>
                <span className="chiffres text-[26px] leading-none font-extrabold tracking-tight whitespace-nowrap">{formatNombre(Math.round(totalAffiche))}<span className="ml-1 text-[13px] font-semibold text-encre-3">FCFA</span></span>
              </div>
              {manque.length > 0 && (
                <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-[13px] text-encre-2" role="status">Il manque : {manque.join(", ")}.</p>
              )}
            </div>
          </section>
          <div className="zone-sure-bas fixed inset-x-0 bottom-16 z-30 flex gap-2 border-t border-trait bg-surface/95 px-4 py-3 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <Bouton variante="secondaire" className="flex-1 lg:flex-none" onClick={() => router.back()}>Annuler</Bouton>
            <Bouton variante="primaire" taille="lg" className="flex-[2] lg:flex-1" icone={<Invoice size={20} weight="fill" />} disabled={!valide} chargement={creer.isPending} onClick={envoyer}>Enregistrer la vente</Bouton>
          </div>
        </aside>
      </div>
    </>
  );
}

export default function PageNouvelleVente() {
  const org = useOrg();
  if (!peut(org.role, "vendre")) {
    return (
      <>
        <EnTetePage titre="Nouvelle vente" />
        <EtatVide titre="Action réservée" texte="Seuls le propriétaire, le gérant et les vendeurs enregistrent des ventes." />
      </>
    );
  }
  return (
    <Suspense>
      <NouvelleVente />
    </Suspense>
  );
}
