"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Banknote, Plus } from "lucide-react";
import { useEcriture, useLecture } from "@/lib/api/requetes";
import { useOrg } from "@/lib/session";
import type { PaiementVente, ProformaListe, VenteListe } from "@/lib/api/types-metier";
import { MODES_PAIEMENT, peut } from "@/lib/domaine";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { EnTetePage } from "@/components/coque/coque";
import { Onglets } from "@/components/ui/onglets";
import { Montant, StatutTexte } from "@/components/ui/signature";
import { PhotoVehicule } from "@/components/metier/photo-vehicule";
import { ChampRecherche, FiltresTexte } from "@/components/ui/recherche";
import { EtatErreur, EtatVide, SqueletteListe } from "@/components/ui/etats";
import { Bouton } from "@/components/ui/bouton";
import { Feuille } from "@/components/ui/feuille";
import { FeuilleEncaisser } from "@/components/ventes/feuille-encaisser";
import { NouvelleProforma } from "@/components/ventes/nouvelle-proforma";
import { toast } from "sonner";

type Onglet = "ventes" | "proformas" | "encaissements";
type FiltreVente = "toutes" | "a_encaisser" | "soldees" | "annulees";

function Ventes() {
  const org = useOrg();
  const params = useSearchParams();
  const router = useRouter();
  const peutVendre = peut(org.role, "vendre");
  const peutEncaisser = peut(org.role, "encaisser");

  const [onglet, setOnglet] = useState<Onglet>((params.get("onglet") as Onglet) ?? "ventes");
  const [filtre, setFiltre] = useState<FiltreVente>("toutes");
  const [q, setQ] = useState("");
  const [choisirPourEncaisser, setChoisirPourEncaisser] = useState(params.get("encaisser") === "1");
  const [venteAEncaisser, setVenteAEncaisser] = useState<VenteListe | null>(null);
  const [nouvelleProforma, setNouvelleProforma] = useState(false);

  const filtres = useMemo(() => {
    const f: Record<string, unknown> = { q: q.trim() || undefined };
    if (filtre === "annulees") f.statut = "annulee";
    else {
      f.statut = "active";
      if (filtre === "soldees") f.statut_paiement = "paye";
    }
    return f;
  }, [filtre, q]);

  const ventes = useLecture<VenteListe[]>("ventes_lister", { p_org: org.id, p_filtres: filtres }, { enabled: onglet === "ventes" });
  const proformas = useLecture<ProformaListe[]>("proformas_lister", { p_org: org.id, p_filtres: {} }, { enabled: onglet === "proformas" });
  const encaissements = useLecture<PaiementVente[]>("paiements_lister", { p_org: org.id, p_filtres: {} }, { enabled: onglet === "encaissements" });

  const ventesAEncaisser = useLecture<VenteListe[]>("ventes_lister", { p_org: org.id, p_filtres: { statut: "active" } }, { enabled: choisirPourEncaisser })
    .data?.filter((v) => v.reste_xof > 0) ?? [];

  return (
    <>
      <EnTetePage titre="Ventes" sousTitre="Ventes, proformas et encaissements."
        actions={
          <>
            {peutEncaisser && <Bouton icone={<Banknote className="size-4" />} onClick={() => setChoisirPourEncaisser(true)}>Encaisser</Bouton>}
            {peutVendre && <Link href="/ventes/nouvelle/" className="inline-flex h-11 items-center gap-2 rounded-controle bg-signal px-4 font-semibold text-sur-signal hover:bg-signal-fonce lg:h-10"><Plus className="size-4" aria-hidden /> Nouvelle vente</Link>}
          </>
        } />

      <Onglets libelle="Section" className="mb-4" valeur={onglet} onChange={(v) => { setOnglet(v); router.replace(`/ventes/?onglet=${v}`, { scroll: false }); }}
        onglets={[{ valeur: "ventes", libelle: "Ventes" }, { valeur: "proformas", libelle: "Proformas" }, { valeur: "encaissements", libelle: "Encaissements" }]} />

      {onglet === "ventes" && (
        <>
          <div className="mb-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-8">
            <ChampRecherche valeur={q} onChange={setQ} libelle="Rechercher une vente" placeholder="Client, facture, véhicule" />
            <FiltresTexte valeur={filtre} onChange={setFiltre} libelle="Filtrer les ventes"
              options={[["toutes", "Toutes"], ["a_encaisser", "À encaisser"], ["soldees", "Soldées"], ["annulees", "Annulées"]] as const} />
          </div>
          {ventes.error && !ventes.data ? <EtatErreur erreur={ventes.error} onReessayer={() => void ventes.refetch()} /> : ventes.isPending ? <SqueletteListe /> : (() => {
            const liste = filtre === "a_encaisser" ? (ventes.data ?? []).filter((v) => v.reste_xof > 0) : ventes.data ?? [];
            return liste.length === 0 ? <EtatVide titre="Aucune vente" texte={peutVendre ? "Vendez votre premier véhicule depuis sa fiche, ou ici." : undefined} /> : (
              <ul className="border-t-2 border-encre">
                {liste.map((v) => (
                  <li key={v.id} className="border-b border-trait">
                    <Link href={`/ventes/fiche/?id=${v.id}`} className="flex gap-3 py-3 hover:bg-surface-2">
                      <PhotoVehicule path={v.vehicule_photo} alt="" className="aspect-[4/3] w-[104px] shrink-0 self-start" />
                      <div className="flex min-w-0 flex-1 flex-col gap-1 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                            <span className="font-mono font-semibold">{v.numero}</span>
                            {v.statut === "annulee" && <StatutTexte type="annule" />}
                            {v.statut === "active" && v.statut_paiement === "paye" && <StatutTexte type="solde" />}
                            {v.statut === "active" && v.reste_xof > 0 && v.retard_xof > 0 && <span className="etiquette text-petit text-perte">En retard</span>}
                            {v.statut === "active" && !v.livree && <StatutTexte type="a_livrer" />}
                          </div>
                          <p className="truncate">{v.client_nom}</p>
                          <p className="truncate text-petit text-encre-3">{v.vehicule_libelle} · {formatDate(v.date_vente)}</p>
                        </div>
                        <div className="flex shrink-0 gap-6 lg:text-right">
                          <div><p className="etiquette text-petit text-encre-3">Total</p><Montant valeur={v.montant_ttc} devise={null} court /></div>
                          <div><p className="etiquette text-petit text-encre-3">Reste</p><Montant valeur={v.reste_xof} devise={null} court className={v.reste_xof > 0 ? "text-ocre" : "text-gain"} /></div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            );
          })()}
        </>
      )}

      {onglet === "proformas" && (
        <>
          <div className="mb-4 flex justify-end">
            {peutVendre && <Bouton variante="primaire" icone={<Plus className="size-4" />} onClick={() => setNouvelleProforma(true)}>Nouvelle proforma</Bouton>}
          </div>
          {proformas.error && !proformas.data ? <EtatErreur erreur={proformas.error} onReessayer={() => void proformas.refetch()} /> : proformas.isPending ? <SqueletteListe /> : !proformas.data?.length ? (
            <EtatVide titre="Aucune proforma" texte="Une proforma engage un prix sans facturer : idéale pour un client qui hésite encore." />
          ) : (
            <ul className="border-t-2 border-encre">
              {proformas.data.map((p) => (
                <LigneProforma key={p.id} p={p} peutAgir={peutVendre} />
              ))}
            </ul>
          )}
        </>
      )}

      {onglet === "encaissements" && (
        encaissements.error && !encaissements.data ? <EtatErreur erreur={encaissements.error} onReessayer={() => void encaissements.refetch()} /> : encaissements.isPending ? <SqueletteListe /> : !encaissements.data?.length ? (
          <EtatVide titre="Aucun encaissement" />
        ) : (
          <ul className="border-t-2 border-encre">
            {encaissements.data.map((p) => (
              <li key={p.id} className="flex items-center gap-3 border-b border-trait py-3 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{p.client_nom} <span className="font-mono text-petit text-encre-3">· {p.vente_numero}</span></p>
                  <p className="text-petit text-encre-3">{formatDate(p.date)} · {MODES_PAIEMENT[p.mode]?.libelle}{p.reference ? ` · ${p.reference}` : ""}{p.annule ? " · annulé" : ""}</p>
                </div>
                <Montant valeur={p.montant_xof} devise={null} className={cn(p.annule && "text-encre-3 line-through", p.montant_xof < 0 && !p.annule && "text-perte")} />
              </li>
            ))}
          </ul>
        )
      )}

      <Feuille ouverte={choisirPourEncaisser && !venteAEncaisser} onFermer={() => setChoisirPourEncaisser(false)} titre="Encaisser" description="Choisissez la vente à encaisser.">
        <ul className="flex max-h-96 flex-col overflow-y-auto">
          {ventesAEncaisser.map((v) => (
            <li key={v.id}>
              <button type="button" onClick={() => setVenteAEncaisser(v)} className="flex w-full items-center justify-between gap-3 border-b border-trait py-2.5 text-left hover:bg-surface-2">
                <span className="min-w-0"><span className="block truncate font-medium">{v.client_nom}</span><span className="block truncate font-mono text-petit text-encre-3">{v.numero} · {v.vehicule_libelle}</span></span>
                <Montant valeur={v.reste_xof} devise={null} className="shrink-0 text-ocre" />
              </button>
            </li>
          ))}
          {ventesAEncaisser.length === 0 && <li className="py-6 text-center text-encre-3">Aucun reste à encaisser.</li>}
        </ul>
      </Feuille>
      {venteAEncaisser && (
        <FeuilleEncaisser ouverte onFermer={() => { setVenteAEncaisser(null); setChoisirPourEncaisser(false); }}
          venteId={venteAEncaisser.id} reste={venteAEncaisser.reste_xof} prochaineEcheance={venteAEncaisser.prochaine_echeance_xof} />
      )}
      <NouvelleProforma ouverte={nouvelleProforma} onFermer={() => setNouvelleProforma(false)} />
    </>
  );
}

function LigneProforma({ p, peutAgir }: { p: ProformaListe; peutAgir: boolean }) {
  const org = useOrg();
  const router = useRouter();
  const changerStatut = useEcriture("proforma_changer_statut", { onError: (e) => toast.error(e.message) });
  const convertir = useEcriture<{ id: string }>("proforma_convertir", {
    onSuccess: (v) => { toast.success("Vente créée"); router.push(`/ventes/fiche/?id=${v.id}`); },
    onError: (e) => toast.error(e.message),
  });
  const LIBELLES: Record<string, string> = { emise: "Émise", acceptee: "Acceptée", expiree: "Expirée", convertie: "Convertie", annulee: "Annulée" };
  return (
    <li className="flex flex-col gap-2 border-b border-trait py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-corps font-semibold">{p.numero}</span>
          <span className="etiquette text-petit text-encre-2">{LIBELLES[p.statut_effectif]}</span>
        </div>
        <p className="mt-0.5">{p.client_nom}</p>
        <p className="text-petit text-encre-3">Valable jusqu&apos;au {formatDate(p.valide_jusqu_au)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Montant valeur={p.montant_ttc} devise={null} />
        {peutAgir && p.statut_effectif === "emise" && <Bouton taille="sm" onClick={() => changerStatut.executer({ p_org: org.id, p_id: p.id, p_statut: "acceptee" })}>Accepter</Bouton>}
        {peutAgir && (p.statut_effectif === "emise" || p.statut_effectif === "acceptee") && (
          <Bouton taille="sm" variante="primaire" chargement={convertir.isPending} onClick={() => convertir.executer({ p_org: org.id, p_id: p.id })}>Convertir en vente</Bouton>
        )}
        {peutAgir && p.statut_effectif !== "convertie" && p.statut_effectif !== "annulee" && (
          <Bouton taille="sm" variante="danger" onClick={() => changerStatut.executer({ p_org: org.id, p_id: p.id, p_statut: "annulee" })}>Annuler</Bouton>
        )}
        {p.vente_id && <Link href={`/ventes/fiche/?id=${p.vente_id}`} className="text-petit font-medium text-lien hover:underline">Voir la vente</Link>}
      </div>
    </li>
  );
}

export default function PageVentes() {
  return (
    <Suspense>
      <Ventes />
    </Suspense>
  );
}
