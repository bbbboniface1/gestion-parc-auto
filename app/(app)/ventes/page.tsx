"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CarProfile, CheckCircle, ClockCountdown, FilePdf, FileText, HandCoins, Invoice, Plus, Warning, XCircle } from "@phosphor-icons/react";
import { useEcriture, useLecture } from "@/lib/api/requetes";
import { rpc } from "@/lib/api/client";
import type { ParametresDocument, ProformaPourDocument } from "@/lib/documents/depuis-vente";
import { useParametres } from "@/lib/api/parametres";
import { useOrg } from "@/lib/session";
import type { PaiementVente, ProformaListe, VenteListe } from "@/lib/api/types-metier";
import { MODES_PAIEMENT, peut } from "@/lib/domaine";
import { formatCourt, formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { decalage } from "@/lib/animation";
import { celebrer } from "@/lib/celebration";
import { EnTetePage } from "@/components/coque/coque";
import { Onglets } from "@/components/ui/onglets";
import { Montant, Tampon } from "@/components/ui/signature";
import { EtatErreur, EtatVide, SqueletteListe } from "@/components/ui/etats";
import { Bouton, classesBouton } from "@/components/ui/bouton";
import { Feuille } from "@/components/ui/feuille";
import { BarreRecherche, Indicateur, Puces } from "@/components/ui/recherche";
import { PhotoVehicule } from "@/components/metier/photo-vehicule";
import { FeuilleEncaisser } from "@/components/ventes/feuille-encaisser";
import { NouvelleProforma } from "@/components/ventes/nouvelle-proforma";
import { MODES_VISUELS } from "@/components/ventes/paiement-visuel";
import { toast } from "sonner";

type Onglet = "ventes" | "proformas" | "encaissements";
type FiltreVente = "toutes" | "a_encaisser" | "soldees" | "annulees";

/** Barre d'encaissement : verte si tout est payé, rouge si une échéance est en retard, orange sinon. */
function Encaissement({ v }: { v: VenteListe }) {
  const part = v.montant_ttc > 0 ? Math.min(1, v.encaisse_xof / v.montant_ttc) : 0;
  const couleur = v.statut === "annulee" ? "var(--trait-fort)" : part >= 1 ? "var(--gain)" : v.retard_xof > 0 ? "var(--perte)" : "var(--accent)";
  return (
    <div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${Math.round(part * 100)} % encaissé`}>
        <div className="h-full origin-left rounded-full [animation:remplit_900ms_cubic-bezier(0.22,1,0.36,1)_both]" style={{ width: `${part * 100}%`, background: couleur }} />
      </div>
      <p className="mt-1.5 flex items-baseline justify-between gap-2 text-[12px]">
        <span className="text-encre-3"><span className="chiffres font-semibold text-encre">{formatCourt(v.encaisse_xof)}</span> encaissés sur {formatCourt(v.montant_ttc)}</span>
        {v.statut === "active" && v.reste_xof > 0 && (
          <span className={cn("chiffres font-bold", v.retard_xof > 0 ? "text-perte-texte" : "text-ocre-texte")}>reste {formatCourt(v.reste_xof)}</span>
        )}
      </p>
    </div>
  );
}

function CarteVente({ v, index }: { v: VenteListe; index: number }) {
  return (
    <li className="apparition" style={decalage(Math.min(index, 10), 45)}>
      <Link href={`/ventes/fiche/?id=${v.id}`} className="carte carte-lien group flex gap-4 overflow-hidden p-3">
        <PhotoVehicule path={v.vehicule_photo} alt="" className="aspect-[4/3] w-28 shrink-0 rounded-xl sm:w-36" />
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[13px] font-bold text-encre-2">{v.numero}</span>
              {v.statut === "annulee" && <Tampon type="annule" />}
              {v.statut === "active" && v.statut_paiement === "paye" && <Tampon type="solde" />}
              {v.statut === "active" && v.reste_xof > 0 && v.retard_xof > 0 && (
                <span className="inline-flex h-6 items-center gap-1 rounded-full bg-perte-voile px-2 text-[12px] font-bold text-perte-texte"><Warning size={13} weight="fill" aria-hidden /> En retard</span>
              )}
              {v.statut === "active" && !v.livree && <Tampon type="a_livrer" />}
            </div>
            <p className="mt-1 truncate text-[16px] font-bold group-hover:text-primaire">{v.client_nom}</p>
            <p className="truncate text-[13px] text-encre-3">{v.vehicule_libelle} · {formatDate(v.date_vente)}</p>
          </div>
          <Encaissement v={v} />
        </div>
      </Link>
    </li>
  );
}

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

  const actives = useLecture<VenteListe[]>("ventes_lister", { p_org: org.id, p_filtres: { statut: "active" } });
  const ventes = useLecture<VenteListe[]>("ventes_lister", { p_org: org.id, p_filtres: filtres }, { enabled: onglet === "ventes" });
  const proformas = useLecture<ProformaListe[]>("proformas_lister", { p_org: org.id, p_filtres: {} }, { enabled: onglet === "proformas" });
  const encaissements = useLecture<PaiementVente[]>("paiements_lister", { p_org: org.id, p_filtres: {} }, { enabled: onglet === "encaissements" });

  const a = actives.data ?? [];
  const aEncaisser = a.filter((v) => v.reste_xof > 0);
  const enRetard = a.filter((v) => v.retard_xof > 0);
  const totaux = {
    facture: a.reduce((s, v) => s + v.montant_ttc, 0),
    encaisse: a.reduce((s, v) => s + v.encaisse_xof, 0),
    reste: a.reduce((s, v) => s + v.reste_xof, 0),
  };

  return (
    <>
      <EnTetePage titre="Ventes" sousTitre="Factures, acomptes, échéances et encaissements."
        actions={
          <>
            {peutEncaisser && <Bouton icone={<HandCoins size={18} weight="duotone" className="text-primaire" />} onClick={() => setChoisirPourEncaisser(true)}>Encaisser un versement</Bouton>}
            {peutVendre && (
              <Link href="/ventes/nouvelle/" className={classesBouton("primaire")}>
                <Plus size={18} weight="bold" aria-hidden /> Nouvelle vente
              </Link>
            )}
          </>
        } />

      {actives.data && (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Indicateur index={0} libelle="Ventes en cours" valeur={a.length} format={(x) => String(Math.round(x))} precision={`${aEncaisser.length} à encaisser`} icone={Invoice} couleur="var(--gain)" />
          <Indicateur index={1} libelle="Total facturé" valeur={totaux.facture} format={formatCourt} precision="FCFA, ventes actives" icone={FileText} couleur="var(--primaire)" />
          <Indicateur index={2} libelle="Déjà encaissé" valeur={totaux.encaisse} format={formatCourt} precision={totaux.facture ? `${Math.round((totaux.encaisse / totaux.facture) * 100)} % du facturé` : undefined} icone={CheckCircle} couleur="var(--etape-en-mer)" />
          <Indicateur index={3} libelle="Reste à encaisser" valeur={totaux.reste} format={formatCourt} precision={enRetard.length ? `${enRetard.length} en retard` : "aucun retard"} icone={ClockCountdown} couleur={enRetard.length ? "var(--perte)" : "var(--accent)"} alerte={enRetard.length > 0} />
        </div>
      )}

      <Onglets libelle="Section" className="mb-4" valeur={onglet} onChange={(v) => { setOnglet(v); router.replace(`/ventes/?onglet=${v}`, { scroll: false }); }}
        onglets={[
          { valeur: "ventes", libelle: "Ventes", compteur: a.length || null },
          { valeur: "proformas", libelle: "Proformas", compteur: proformas.data?.length ?? null },
          { valeur: "encaissements", libelle: "Encaissements" },
        ]} />

      {onglet === "ventes" && (
        <>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <BarreRecherche valeur={q} onChange={setQ} libelle="Rechercher une vente" placeholder="Client, numéro de facture, véhicule…" />
            <Puces valeur={filtre} onChange={setFiltre} libelle="Filtrer les ventes" options={[
              { valeur: "toutes", libelle: "En cours" },
              { valeur: "a_encaisser", libelle: "À encaisser", nombre: aEncaisser.length, couleur: "var(--accent)" },
              { valeur: "soldees", libelle: "Soldées", couleur: "var(--gain)" },
              { valeur: "annulees", libelle: "Annulées", couleur: "var(--perte)" },
            ]} />
          </div>
          {ventes.error && !ventes.data ? <EtatErreur erreur={ventes.error} onReessayer={() => void ventes.refetch()} /> : ventes.isPending ? <SqueletteListe /> : (() => {
            const liste = filtre === "a_encaisser" ? (ventes.data ?? []).filter((v) => v.reste_xof > 0) : ventes.data ?? [];
            return liste.length === 0 ? <EtatVide titre="Aucune vente" texte={peutVendre ? "Vendez votre premier véhicule depuis sa fiche, ou ici." : undefined} /> : (
              <ul className="grid gap-3 xl:grid-cols-2">
                {liste.map((v, i) => <CarteVente key={v.id} v={v} index={i} />)}
              </ul>
            );
          })()}
        </>
      )}

      {onglet === "proformas" && (
        <>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-[14px] text-encre-3">Une proforma engage un prix sans facturer.</p>
            {peutVendre && <Bouton variante="primaire" icone={<Plus size={18} weight="bold" />} onClick={() => setNouvelleProforma(true)}>Nouvelle proforma</Bouton>}
          </div>
          {proformas.error && !proformas.data ? <EtatErreur erreur={proformas.error} onReessayer={() => void proformas.refetch()} /> : proformas.isPending ? <SqueletteListe /> : !proformas.data?.length ? (
            <EtatVide titre="Aucune proforma" texte="Une proforma engage un prix sans facturer : idéale pour un client qui hésite encore." />
          ) : (
            <ul className="grid gap-3 xl:grid-cols-2">
              {proformas.data.map((p, i) => <LigneProforma key={p.id} p={p} peutAgir={peutVendre} index={i} />)}
            </ul>
          )}
        </>
      )}

      {onglet === "encaissements" && (
        encaissements.error && !encaissements.data ? <EtatErreur erreur={encaissements.error} onReessayer={() => void encaissements.refetch()} /> : encaissements.isPending ? <SqueletteListe /> : !encaissements.data?.length ? (
          <EtatVide titre="Aucun encaissement" />
        ) : (
          <ul className="carte apparition divide-y divide-trait/70 overflow-hidden">
            {encaissements.data.map((p) => {
              const mv = MODES_VISUELS[p.mode] ?? MODES_VISUELS.autre!;
              return (
                <li key={p.id} className={cn("flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2", p.annule && "opacity-50")}>
                  <span className="grid size-10 shrink-0 place-items-center rounded-full" style={{ background: mv.couleur, color: mv.texte }}><mv.icone size={19} weight="fill" aria-hidden /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{p.client_nom} <span className="font-mono text-[12px] font-medium text-encre-3">· {p.vente_numero}</span></p>
                    <p className="truncate text-[13px] text-encre-3">{MODES_PAIEMENT[p.mode]?.libelle} · {formatDate(p.date)}{p.reference ? ` · ${p.reference}` : ""}{p.annule ? " · annulé" : ""}</p>
                  </div>
                  <Montant valeur={p.montant_xof} devise={null} className={cn(p.annule ? "text-encre-3 line-through" : p.montant_xof < 0 ? "text-perte-texte" : "text-gain-texte")} />
                </li>
              );
            })}
          </ul>
        )
      )}

      <Feuille ouverte={choisirPourEncaisser && !venteAEncaisser} onFermer={() => setChoisirPourEncaisser(false)} titre="Encaisser un versement" description="Quelle vente le client règle-t-il ?">
        <ul className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto pb-1">
          {aEncaisser.map((v) => (
            <li key={v.id}>
              <button type="button" onClick={() => setVenteAEncaisser(v)} className="onde carte carte-lien flex w-full items-center gap-3 p-2.5 text-left">
                <PhotoVehicule path={v.vehicule_photo} alt="" className="h-12 w-16 shrink-0 rounded-lg" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{v.client_nom}</span>
                  <span className="block truncate text-[12px] text-encre-3">{v.numero} · {v.vehicule_libelle}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[11px] text-encre-3">reste</span>
                  <Montant valeur={v.reste_xof} devise={null} court className={v.retard_xof > 0 ? "text-perte-texte" : "text-ocre-texte"} />
                </span>
                <ArrowRight size={16} weight="bold" className="shrink-0 text-encre-3" aria-hidden />
              </button>
            </li>
          ))}
          {aEncaisser.length === 0 && <li className="py-6 text-center text-encre-3">Aucun reste à encaisser.</li>}
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

const STATUTS_PROFORMA: Record<string, { libelle: string; couleur: string }> = {
  emise: { libelle: "Émise", couleur: "var(--acier)" },
  acceptee: { libelle: "Acceptée", couleur: "var(--gain)" },
  expiree: { libelle: "Expirée", couleur: "var(--ocre)" },
  convertie: { libelle: "Convertie en vente", couleur: "var(--reserve)" },
  annulee: { libelle: "Annulée", couleur: "var(--perte)" },
};

/** Récupère la proforma complète (client, véhicule, photographie de l'entreprise) et télécharge son PDF. */
async function telechargerProforma(orgId: string, id: string, parametres: unknown) {
  const [{ documentProforma, avecImages }, { genererPDF, telecharger, nomFichier }, { urlFichier }, proforma] = await Promise.all([
    import("@/lib/documents/depuis-vente"),
    import("@/lib/documents/generer"),
    import("@/lib/stockage"),
    rpc<ProformaPourDocument>("proforma_obtenir", { p_org: orgId, p_id: id }),
  ]);
  const d = documentProforma(proforma, parametres as ParametresDocument);
  telecharger(await genererPDF(await avecImages(d, urlFichier)), nomFichier(d));
}

function LigneProforma({ p, peutAgir, index }: { p: ProformaListe; peutAgir: boolean; index: number }) {
  const org = useOrg();
  const router = useRouter();
  const { data: reglages } = useParametres();
  const [pdfEnCours, setPdfEnCours] = useState(false);
  const changerStatut = useEcriture("proforma_changer_statut", { onError: (e) => toast.error(e.message) });
  const convertir = useEcriture<{ id: string }>("proforma_convertir", {
    onSuccess: (v) => { celebrer({ type: "vente", titre: "Proforma convertie", detail: "La facture est créée." }); router.push(`/ventes/fiche/?id=${v.id}`); },
    onError: (e) => toast.error(e.message),
  });
  const st = STATUTS_PROFORMA[p.statut_effectif] ?? { libelle: p.statut_effectif, couleur: "var(--encre-3)" };
  return (
    <li className="carte apparition flex flex-col gap-3 p-4" style={decalage(Math.min(index, 10), 45)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[13px] font-bold text-encre-2">{p.numero}</span>
            <span className="inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-bold"
              style={{ background: `color-mix(in srgb, ${st.couleur} 13%, var(--surface))`, color: `color-mix(in srgb, ${st.couleur} 70%, var(--pole-texte))` }}>
              <span className="size-1.5 rounded-full" style={{ background: st.couleur }} />{st.libelle}
            </span>
          </div>
          <p className="mt-1 truncate text-[16px] font-bold">{p.client_nom}</p>
          <Link href={`/parc/vehicule/?id=${p.vehicule_id}`} className="group mt-0.5 flex items-center gap-1.5 text-[14px] font-semibold text-encre-2 hover:text-primaire">
            <CarProfile size={16} weight="duotone" className="shrink-0" aria-hidden />
            <span className="truncate">{p.vehicule_libelle ?? "Véhicule"}{p.vehicule_reference ? <span className="ml-1.5 font-mono text-[12px] font-normal text-encre-3">{p.vehicule_reference}</span> : null}</span>
          </Link>
          <p className="text-[13px] text-encre-3">Valable jusqu&apos;au {formatDate(p.valide_jusqu_au)}</p>
        </div>
        <Montant valeur={p.montant_ttc} devise={null} taille="lg" className="shrink-0" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Bouton taille="sm" icone={<FilePdf size={16} weight="duotone" className="text-perte-texte" />} chargement={pdfEnCours} disabled={!reglages}
          onClick={async () => {
            setPdfEnCours(true);
            try { await telechargerProforma(org.id, p.id, reglages!.parametres); }
            catch (e) { toast.error(e instanceof Error ? e.message : "Génération impossible"); }
            finally { setPdfEnCours(false); }
          }}>
          Télécharger le PDF
        </Bouton>
        {peutAgir && (p.statut_effectif === "emise" || p.statut_effectif === "acceptee") && (
          <Bouton taille="sm" variante="primaire" icone={<Invoice size={16} weight="fill" />} chargement={convertir.isPending} onClick={() => convertir.executer({ p_org: org.id, p_id: p.id })}>Convertir en facture</Bouton>
        )}
        {peutAgir && p.statut_effectif === "emise" && (
          <Bouton taille="sm" icone={<CheckCircle size={16} weight="duotone" className="text-gain-texte" />} onClick={() => changerStatut.executer({ p_org: org.id, p_id: p.id, p_statut: "acceptee" })}>Le client accepte</Bouton>
        )}
        {peutAgir && p.statut_effectif !== "convertie" && p.statut_effectif !== "annulee" && (
          <Bouton taille="sm" variante="fantome" icone={<XCircle size={16} weight="duotone" />} onClick={() => changerStatut.executer({ p_org: org.id, p_id: p.id, p_statut: "annulee" })}>Annuler la proforma</Bouton>
        )}
        {p.vente_id && (
          <Link href={`/ventes/fiche/?id=${p.vente_id}`} className="onde inline-flex h-9 items-center gap-1.5 rounded-controle bg-primaire-voile px-3 text-[13px] font-semibold text-primaire">
            Voir la facture <ArrowRight size={14} weight="bold" aria-hidden />
          </Link>
        )}
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
