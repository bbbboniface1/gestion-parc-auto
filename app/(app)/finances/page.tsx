"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowCounterClockwise, ArrowDownLeft, ArrowUpRight, ArrowsLeftRight, CaretRight, Clock, CurrencyCircleDollar, DownloadSimple, Gear, Percent, Plus, Timer, WhatsappLogo,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { useEcriture, useLecture } from "@/lib/api/requetes";
import { useOrg } from "@/lib/session";
import type { Compte, LigneMarge, RapportMarges, Tresorerie } from "@/lib/api/types-metier";
import type { Frais } from "@/lib/api/types";
import { peut } from "@/lib/domaine";
import { formatCourt, formatDate, formatPourcent, pluriel, formatNombre } from "@/lib/format";
import { lienWhatsApp } from "@/lib/whatsapp";
import { genererCSV, telechargerCSV } from "@/lib/csv";
import { cn } from "@/lib/cn";
import { decalage, useCompteur } from "@/lib/animation";
import { EnTetePage } from "@/components/coque/coque";
import { Onglets } from "@/components/ui/onglets";
import { Montant } from "@/components/ui/signature";
import { Bouton } from "@/components/ui/bouton";
import { Avatar } from "@/components/ui/avatar";
import { Puces } from "@/components/ui/recherche";
import { EtatErreur, EtatVide, SqueletteListe } from "@/components/ui/etats";
import { FeuilleFrais } from "@/components/metier/feuille-frais";
import { TuileIndicateur } from "@/components/metier/tableau-bord";
import { ListeDepenses } from "@/components/finances/liste-depenses";
import { FeuilleTransfert } from "@/components/finances/feuille-transfert";
import { FeuilleComptes } from "@/components/finances/feuille-comptes";
import { periodePour, type CodePeriode } from "@/components/finances/periode";
import { apparenceCompte } from "@/components/finances/apparence-compte";

type Onglet = "tresorerie" | "depenses" | "creances" | "rentabilite";

const PERIODES: { valeur: CodePeriode; libelle: string }[] = [
  { valeur: "mois", libelle: "Ce mois" }, { valeur: "mois_precedent", libelle: "Mois dernier" },
  { valeur: "trimestre", libelle: "3 mois" }, { valeur: "annee", libelle: "Cette année" },
];

/*
 * Finances, en deux niveaux de lecture par onglet (docs/CONVENTIONS_FRONT.md, « Mesures et hiérarchie ») :
 *  - Trésorerie : premier plan = la carte héro du total disponible, avec les entrées et sorties de la période ;
 *    second plan = les comptes (cartes neutres, couleur de l'opérateur sur la tuile d'icône, valeur en 24 px) et les mouvements.
 *  - Créances : premier plan = le total dû et la part en retard ; second plan = une carte par client.
 *  - Rentabilité : premier plan = la marge et son taux ; second plan = ventes, chiffre d'affaires, marge par vente.
 */

/** Premier plan de la trésorerie : le total disponible en grand, les entrées et sorties de la période à côté. */
function HeroTresorerie({ totaux }: { totaux: Tresorerie["totaux"] }) {
  const total = useCompteur(totaux.solde_total);
  const entrees = useCompteur(totaux.entrees_periode);
  const sorties = useCompteur(totaux.sorties_periode);
  return (
    <section aria-labelledby="titre-total" className="apparition min-w-0 overflow-hidden rounded-carte bg-heros p-6 text-white shadow-flottante lg:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h2 id="titre-total" className="etiquette text-[12px] text-white/70">Total disponible</h2>
          <p className="chiffres mt-4 text-[40px] leading-none font-extrabold tracking-tight lg:text-[56px]">{formatCourt(total)}</p>
          <p className="mt-2 text-[14px] text-white/75 lg:text-[16px]">FCFA, tous comptes</p>
        </div>
        <ul className="grid grid-cols-2 gap-2 lg:w-96 lg:shrink-0">
          <li className="apparition min-w-0 rounded-xl bg-white/[0.07] px-4 py-3 ring-1 ring-white/10" style={decalage(1, 60)}>
            <p className="flex items-center gap-2 text-[12px] font-semibold text-white/85">
              <ArrowDownLeft size={16} weight="bold" className="shrink-0 text-nuit-gain" aria-hidden />Entrées de la période
            </p>
            <p className="chiffres mt-1 truncate text-[24px] leading-tight font-bold text-nuit-gain">+{formatCourt(entrees)}</p>
            <p className="text-[12px] text-white/60">encaissements</p>
          </li>
          <li className="apparition min-w-0 rounded-xl bg-white/[0.07] px-4 py-3 ring-1 ring-white/10" style={decalage(2, 60)}>
            <p className="flex items-center gap-2 text-[12px] font-semibold text-white/85">
              <ArrowUpRight size={16} weight="bold" className="shrink-0 text-nuit-perte" aria-hidden />Sorties de la période
            </p>
            <p className="chiffres mt-1 truncate text-[24px] leading-tight font-bold text-nuit-perte">−{formatCourt(sorties)}</p>
            <p className="text-[12px] text-white/60">dépenses et achats</p>
          </li>
        </ul>
      </div>
    </section>
  );
}

/**
 * Second plan : un compte sur une carte neutre, solde en 24 px. La couleur de l'opérateur ne teinte que la tuile
 * d'icône : trois aplats saturés attiraient l'œil avant la carte héro. Sur téléphone, une rangée compacte
 * (tuile, nom et flux, solde à droite) ; au-delà, une carte verticale.
 */
function CarteCompte({ c, index }: { c: Tresorerie["comptes"][number]; index: number }) {
  const a = apparenceCompte(c);
  const solde = useCompteur(c.solde_xof ?? 0);
  return (
    <div className="carte apparition grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 p-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-y-3 lg:p-6" style={decalage(index, 60)}>
      <span className="col-start-1 row-span-2 row-start-1 grid size-10 place-items-center rounded-xl sm:row-span-1 sm:row-start-1" style={{ background: a.fond, color: a.texte }}>
        <a.icone size={20} weight="fill" aria-hidden />
      </span>
      <span className="col-start-2 row-start-1 line-clamp-2 text-[14px] font-bold break-words">{c.nom}</span>
      <p className="chiffres col-start-3 row-span-2 row-start-1 text-right text-[24px] leading-none font-bold tracking-tight whitespace-nowrap text-encre sm:col-span-2 sm:col-start-1 sm:row-span-1 sm:row-start-2 sm:text-left">
        {formatCourt(solde)} <span className="text-[12px] font-semibold text-encre-3">FCFA</span>
      </p>
      <p className="col-start-2 row-start-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] font-semibold text-encre-2 sm:col-span-2 sm:col-start-1 sm:row-start-3">
        <span className="inline-flex items-center gap-1"><ArrowDownLeft size={12} weight="bold" className="text-gain-texte" aria-hidden />+{formatCourt(c.entrees_periode)}</span>
        <span className="inline-flex items-center gap-1"><ArrowUpRight size={12} weight="bold" className="text-perte-texte" aria-hidden />−{formatCourt(c.sorties_periode)}</span>
      </p>
    </div>
  );
}

/** Second plan : une valeur calme, sans pictogramme, en 24 px (même lecture que le résumé du tableau de bord). */
function MesureSecondaire({ libelle, valeur, format, precision }: { libelle: string; valeur: number; format: (v: number) => string; precision?: string }) {
  const anime = useCompteur(valeur);
  return (
    <div className="min-w-0">
      <p className="text-[14px] text-encre-3">{libelle}</p>
      <p className="chiffres mt-1 truncate text-[24px] leading-tight font-bold text-encre">{format(anime)}</p>
      {precision && <p className="mt-1 text-[12px] text-encre-3">{precision}</p>}
    </div>
  );
}

function Finances() {
  const org = useOrg();
  const router = useRouter();
  const params = useSearchParams();
  const peutVoir = peut(org.role, "voirTresorerie");
  const peutModifier = peut(org.role, "saisirFrais");

  const [onglet, setOnglet] = useState<Onglet>((params.get("onglet") as Onglet) ?? "tresorerie");
  const [fraisEnEvidence, setFraisEnEvidence] = useState<string | null>(params.get("frais"));
  const [periode, setPeriode] = useState<CodePeriode>(params.get("frais") ? "annee" : "mois");
  const [nouvelleDepense, setNouvelleDepense] = useState(params.get("depense") === "1");
  const [transfert, setTransfert] = useState(false);
  const [gererComptes, setGererComptes] = useState(false);
  const p = periodePour(periode);

  const tresorerie = useLecture<Tresorerie>("tresorerie", { p_org: org.id, p_du: p.du, p_au: p.au }, { enabled: peutVoir && (onglet === "tresorerie" || onglet === "creances") });
  const depenses = useLecture<Frais[]>("frais_lister", { p_org: org.id, p_filtres: { du: p.du, au: p.au } }, { enabled: peutVoir && onglet === "depenses" });
  const marges = useLecture<RapportMarges>("rapport_marges", { p_org: org.id, p_du: p.du, p_au: p.au }, { enabled: peutVoir && onglet === "rentabilite" });
  const comptes = useLecture<Compte[]>("comptes_lister", { p_org: org.id }, { enabled: peutVoir && (transfert || gererComptes) });
  const annulerTransfert = useEcriture("transfert_supprimer", { onSuccess: () => toast.success("Transfert annulé"), onError: (e) => toast.error(e.message) });

  if (!peutVoir) return <EtatVide titre="Accès réservé" texte="Seuls le propriétaire, le gérant et le comptable consultent les finances." />;

  const exporterRentabilite = () => {
    if (!marges.data) return;
    const csv = genererCSV(
      [
        { titre: "Facture", valeur: (l: LigneMarge) => l.numero },
        { titre: "Date", valeur: (l) => new Date(l.date_vente) },
        { titre: "Véhicule", valeur: (l) => l.vehicule_libelle },
        { titre: "Client", valeur: (l) => l.client_nom },
        { titre: "Prix HT", valeur: (l) => l.montant_ht, decimales: 0 },
        { titre: "Coût de revient", valeur: (l) => l.prix_revient_xof, decimales: 0 },
        { titre: "Marge", valeur: (l) => l.marge_xof, decimales: 0 },
        { titre: "Marge %", valeur: (l) => l.marge_pct, decimales: 1 },
        { titre: "Jours en stock", valeur: (l) => l.jours_stock },
      ],
      marges.data.ventes,
    );
    telechargerCSV(`rentabilite-${p.du}-${p.au}`, csv);
  };

  return (
    <>
      <EnTetePage titre="Finances" sousTitre="Où est l'argent, ce qui sort, ce qu'on vous doit, ce que ça rapporte."
        actions={
          <>
            {/* shrink-0 : dans un bouton qui se comprime (flex-1 à 360 px), l'icône garde ses 18 × 18 px. */}
            <Bouton className="flex-1 sm:flex-none" icone={<ArrowsLeftRight size={18} weight="duotone" className="shrink-0 text-primaire" />} onClick={() => setTransfert(true)}><span className="min-w-0">Transférer<span className="hidden sm:inline"> entre comptes</span></span></Bouton>
            {peutModifier && <Bouton className="flex-[2] sm:flex-none" variante="primaire" icone={<Plus size={18} weight="bold" className="shrink-0" />} onClick={() => setNouvelleDepense(true)}>Ajouter une dépense</Bouton>}
          </>
        } />

      {/* Onglets sans pastille de couleur : quatre teintes ne portaient pas de sens stable (la couleur de Finances est
          `accent`, portée par la navigation) ; l'onglet actif se lit par `bg-puce-active`.
          Sur téléphone, les périodes forment un contrôle segmenté sur une seule rangée (4 colonnes, 44 px) au lieu de deux
          rangées de puces : le premier plan remonte d'environ 50 px. */}
      <div className="mb-6 flex flex-col gap-4 lg:mb-8">
        <Onglets libelle="Section" valeur={onglet} onChange={(v) => { setOnglet(v); router.replace(`/finances/?onglet=${v}`, { scroll: false }); }}
          onglets={[
            { valeur: "tresorerie", libelle: "Trésorerie" },
            { valeur: "depenses", libelle: "Dépenses" },
            { valeur: "creances", libelle: "Créances" },
            { valeur: "rentabilite", libelle: "Rentabilité" },
          ]} />
        {onglet !== "creances" && (
          <Puces valeur={periode} onChange={setPeriode} libelle="Période" options={PERIODES}
            className="max-sm:grid max-sm:grid-cols-4 max-sm:[&>button]:justify-center max-sm:[&>button]:px-2 max-sm:[&>button]:text-center max-sm:[&>button]:leading-tight max-sm:[&>button]:whitespace-normal" />
        )}
      </div>

      {onglet === "tresorerie" && (
        tresorerie.error && !tresorerie.data ? <EtatErreur erreur={tresorerie.error} onReessayer={() => void tresorerie.refetch()} /> : tresorerie.isPending || !tresorerie.data ? <SqueletteListe /> : (
          <div className="flex flex-col gap-6 lg:gap-8">
            <HeroTresorerie totaux={tresorerie.data.totaux} />
            <section className="flex flex-col gap-4" aria-labelledby="titre-comptes">
              <div className="flex min-h-11 items-center justify-between gap-2 lg:min-h-10">
                <h2 id="titre-comptes" className="text-[18px] font-bold">Vos comptes</h2>
                {peutModifier && <Bouton variante="fantome" icone={<Gear size={16} weight="duotone" />} onClick={() => setGererComptes(true)}>Gérer les comptes</Bouton>}
              </div>
              {/* Autant de colonnes que de comptes tant qu'elles font au moins 14 rem : ni colonne vide, ni carte orpheline sur 3 comptes. */}
              <div className="grid gap-4 sm:grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] lg:gap-6">
                {tresorerie.data.comptes.filter((c) => c.actif || (c.solde_xof ?? 0) !== 0).map((c, i) => <CarteCompte key={c.id} c={c} index={i} />)}
              </div>
            </section>
            <section className="carte apparition p-4 lg:p-6" aria-labelledby="titre-mouvements">
              <h2 id="titre-mouvements" className="mb-3 text-[18px] font-bold">Mouvements</h2>
              {tresorerie.data.mouvements.length === 0 ? <p className="py-2 text-encre-3">Aucun mouvement sur cette période.</p> : (
                <ul className="flex flex-col">
                  {tresorerie.data.mouvements.slice(0, 50).map((m, i) => {
                    const entree = m.montant_xof >= 0;
                    const idTransfert = m.entite === "transfert" ? m.entite_id : null;
                    const annulable = Boolean(idTransfert && peutModifier);
                    /*
                     * Une grille à 4 colonnes : pictogramme, texte, montant, fin de ligne (chevron ou « Annuler »).
                     *  - Téléphone : le libellé sur deux lignes au plus, sur la largeur texte + montant ; dessous, « date · compte »
                     *    à gauche et le montant à droite. « Annuler » devient une icône de 44 px posée sur la colonne de fin.
                     *  - Ordinateur : une seule rangée ; la colonne de fin a une largeur fixe (5 rem), donc les montants finissent
                     *    tous à la même abscisse, qu'il y ait un chevron ou « Annuler ».
                     */
                    const corps = (
                      <>
                        <span className={cn("col-start-1 row-span-2 row-start-1 grid size-10 place-items-center rounded-full", entree ? "bg-gain-voile text-gain-texte" : "bg-perte-voile text-perte-texte")}>
                          {entree ? <ArrowDownLeft size={18} weight="bold" aria-label="Entrée" /> : <ArrowUpRight size={18} weight="bold" aria-label="Sortie" />}
                        </span>
                        <p className={cn("col-span-2 col-start-2 row-start-1 line-clamp-2 font-semibold break-words group-hover:text-primaire lg:col-span-1 lg:pr-0 lg:col-start-2", annulable && "pr-8")}>{m.libelle}</p>
                        <p className="col-start-2 row-start-2 min-w-0 text-[12px] text-encre-3">
                          <span className="whitespace-nowrap">{formatDate(m.date)}{m.compte_nom ? " ·" : ""}</span>{m.compte_nom ? <> <span className="whitespace-nowrap">{m.compte_nom}</span></> : null}
                        </p>
                        <Montant valeur={m.montant_xof} devise={null} signe className={cn("col-start-3 row-start-2 justify-self-end lg:row-span-2 lg:row-start-1", entree ? "text-gain-texte" : "text-perte-texte")} />
                        {(m.entite === "vente" || m.entite === "frais") && <CaretRight size={16} weight="bold" className="col-start-4 row-span-2 row-start-1 justify-self-end text-encre-3 transition-transform group-hover:translate-x-px group-hover:text-primaire" aria-hidden />}
                      </>
                    );
                    const grille = "grid w-full grid-cols-[2.5rem_minmax(0,1fr)_auto_1rem] items-center gap-x-3 gap-y-1 rounded-xl px-2 py-3 lg:grid-cols-[2.5rem_minmax(0,1fr)_auto_5rem]";
                    const cls = cn("group text-left transition-colors hover:bg-surface-2", grille);
                    return (
                      <li key={i}>
                        {m.entite === "vente" && m.entite_id ? (
                          <Link href={`/ventes/fiche/?id=${m.entite_id}`} className={cls}>{corps}</Link>
                        ) : m.entite === "frais" && m.entite_id ? (
                          <button type="button" className={cls} onClick={() => { setFraisEnEvidence(m.entite_id); setPeriode("annee"); setOnglet("depenses"); router.replace("/finances/?onglet=depenses", { scroll: false }); }}>{corps}</button>
                        ) : (
                          <div className={grille}>
                            {corps}
                            {annulable && idTransfert && (
                              // Téléphone : icône de 44 px dont la marge négative déborde sur l'espace réservé à droite du libellé (pr-8).
                              <button type="button" title="Annuler ce transfert" onClick={() => { if (window.confirm("Annuler ce transfert ? Les deux comptes retrouvent leur solde d'avant.")) annulerTransfert.executer({ p_org: org.id, p_id: idTransfert }); }}
                                className="onde col-start-4 row-start-1 -ml-7 inline-flex size-11 items-center justify-center justify-self-end rounded-full text-[14px] font-semibold text-encre-3 hover:bg-perte-voile hover:text-perte-texte lg:row-span-2 lg:ml-0 lg:h-10 lg:w-auto lg:px-3 lg:row-start-1">
                                <ArrowCounterClockwise size={18} weight="bold" className="shrink-0 lg:hidden" aria-hidden />
                                <span className="max-lg:sr-only">Annuler</span>
                              </button>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )
      )}

      {onglet === "depenses" && (
        depenses.error && !depenses.data ? <EtatErreur erreur={depenses.error} onReessayer={() => void depenses.refetch()} /> : depenses.isPending ? <SqueletteListe /> : !depenses.data?.length ? (
          <EtatVide titre="Aucune dépense sur cette période" />
        ) : (
          <ListeDepenses liste={depenses.data} enEvidence={fraisEnEvidence} peutModifier={peutModifier} />
        )
      )}

      {onglet === "creances" && (
        tresorerie.error && !tresorerie.data ? <EtatErreur erreur={tresorerie.error} onReessayer={() => void tresorerie.refetch()} /> : tresorerie.isPending || !tresorerie.data ? <SqueletteListe /> : !tresorerie.data.creances.length ? (
          <EtatVide titre="Aucune créance" texte="Tous les clients sont à jour." />
        ) : (
          <div className="flex flex-col gap-6 lg:gap-8">
            <div className="grid grid-cols-2 gap-4 lg:gap-6">
              <TuileIndicateur index={0} libelle="Total dû par les clients" valeur={tresorerie.data.creances.reduce((s, c) => s + c.reste_xof, 0)} complement={pluriel(tresorerie.data.creances.length, "vente")} icone={<Clock className="size-5" />} couleur="var(--accent)" />
              {/* Le filet rouge signale qu'au moins un client est en retard. */}
              <div className={cn("h-full min-w-0 rounded-carte", tresorerie.data.creances.some((c) => c.jours_retard !== null) && "ring-2 ring-perte/30")}>
                <TuileIndicateur index={1} libelle="Dont en retard" valeur={tresorerie.data.creances.reduce((s, c) => s + c.retard_xof, 0)} complement={pluriel(tresorerie.data.creances.filter((c) => c.jours_retard !== null).length, "client")} icone={<Timer className="size-5" />} couleur="var(--perte)" />
              </div>
            </div>
            <ul className="grid gap-4 lg:grid-cols-2 lg:gap-6">
              {tresorerie.data.creances.map((c, i) => {
                const part = c.montant_ttc > 0 ? c.encaisse_xof / c.montant_ttc : 0;
                return (
                  <li key={c.vente_id} className={cn("carte apparition p-4 lg:p-6", c.jours_retard !== null && "ring-2 ring-perte/25")} style={decalage(Math.min(i, 10), 50)}>
                    <div className="flex items-start gap-3">
                      <Avatar nom={c.client_nom} taille={44} />
                      <div className="min-w-0 flex-1">
                        {/* Zone de toucher de 48 px autour du nom, sans changer la mise en page (marges négatives). */}
                        <Link href={`/ventes/fiche/?id=${c.vente_id}`} className="relative -my-3 block truncate py-3 text-[16px] font-bold hover:text-primaire">{c.client_nom}</Link>
                        {/* Deux lignes au plus : le numéro de facture (insécable) n'est plus coupé par le montant « reste dû ». */}
                        <p className="line-clamp-2 text-[14px] text-encre-3">{c.vehicule_libelle} · <span className="font-mono text-[12px] whitespace-nowrap">{c.numero}</span></p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="chiffres text-[24px] leading-tight font-extrabold text-ocre-texte">{formatCourt(c.reste_xof)}</p>
                        <p className="text-[12px] text-encre-3">reste dû</p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full origin-left rounded-full [animation:remplit_900ms_both]" style={{ width: `${part * 100}%`, background: c.jours_retard !== null ? "var(--perte)" : "var(--accent)" }} />
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                      {c.jours_retard !== null ? (
                        <span className="inline-flex h-7 items-center gap-1 rounded-full bg-perte-voile px-3 text-[12px] font-bold text-perte-texte"><Timer size={14} weight="fill" aria-hidden />{pluriel(c.jours_retard, "jour")} de retard</span>
                      ) : <span className="text-[12px] text-encre-3">{formatCourt(c.encaisse_xof)} déjà reçus sur {formatCourt(c.montant_ttc)}</span>}
                      {c.client_telephone && (
                        <a href={lienWhatsApp(c.client_telephone, `Bonjour ${c.client_nom}, un rappel amical concernant votre facture ${c.numero} : il reste ${formatNombre(c.reste_xof)} FCFA à régler. Merci.`)}
                          target="_blank" rel="noopener" className="onde inline-flex h-11 items-center gap-2 rounded-full bg-marque-whatsapp px-4 text-[14px] font-bold text-sur-marque-whatsapp transition-transform hover:-translate-y-px lg:h-10">
                          <WhatsappLogo size={18} weight="fill" aria-hidden /> Relancer sur WhatsApp
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )
      )}

      {onglet === "rentabilite" && (
        marges.error && !marges.data ? <EtatErreur erreur={marges.error} onReessayer={() => void marges.refetch()} /> : marges.isPending || !marges.data ? <SqueletteListe /> : (
          <div className="flex flex-col gap-6 lg:gap-8">
            {/* Premier plan : ce que la période a rapporté (marge et taux). Second plan : le volume (ventes, chiffre d'affaires). */}
            <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
              <div className="grid min-w-0 grid-cols-2 gap-4 lg:col-span-8 lg:gap-6">
                <TuileIndicateur index={0} libelle="Marge" valeur={marges.data.totaux.marge} complement="FCFA" icone={<CurrencyCircleDollar className="size-5" />} couleur="var(--gain)" />
                <TuileIndicateur index={1} libelle="Taux de marge" valeur={marges.data.totaux.marge_pct ?? 0} format={(x) => (marges.data!.totaux.marge_pct !== null ? formatPourcent(x, 1) : "—")} complement={marges.data.totaux.jours_stock_moyen !== null ? `${marges.data.totaux.jours_stock_moyen} j en stock en moyenne` : undefined} icone={<Percent className="size-5" />} couleur="var(--accent)" />
              </div>
              <div className="carte apparition grid min-w-0 grid-cols-2 content-start gap-4 p-4 lg:col-span-4 lg:grid-cols-1 lg:p-6" style={decalage(2, 60)}>
                <MesureSecondaire libelle="Ventes" valeur={marges.data.totaux.nb} format={(x) => String(Math.round(x))} precision="sur la période" />
                <MesureSecondaire libelle="Chiffre d'affaires" valeur={marges.data.totaux.ca} format={formatCourt} precision="FCFA hors taxes" />
              </div>
            </div>

            {marges.data.ventes.length > 0 && (
              <section className="carte apparition p-4 lg:p-6" aria-labelledby="titre-marges">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h2 id="titre-marges" className="text-[18px] font-bold">Ce que chaque vente a rapporté</h2>
                  <Bouton variante="secondaire" icone={<DownloadSimple size={16} weight="bold" />} onClick={exporterRentabilite}>Exporter pour Excel</Bouton>
                </div>
                <ul className="flex flex-col gap-2">
                  {(() => {
                    const max = Math.max(1, ...marges.data.ventes.map((l) => Math.abs(l.marge_xof)));
                    return [...marges.data.ventes].sort((a, b) => b.marge_xof - a.marge_xof).map((l, i) => (
                      <li key={l.vente_id} className="apparition" style={decalage(Math.min(i, 12), 40)}>
                        <Link href={`/ventes/fiche/?id=${l.vente_id}`} className="group block rounded-xl px-2 py-2 transition-colors hover:bg-surface-2">
                          <div className="flex items-baseline justify-between gap-3">
                            {/* Téléphone : le client passe sur une 2e ligne au lieu d'être coupé après deux lettres. */}
                            <span className="min-w-0 font-semibold group-hover:text-primaire sm:truncate">
                              <span className="block truncate sm:inline">{l.vehicule_libelle}</span>{" "}
                              <span className="block truncate text-[14px] font-normal text-encre-3 sm:inline"><span className="max-sm:hidden">· </span>{l.client_nom}</span>
                            </span>
                            <span className={cn("chiffres shrink-0 font-extrabold", l.marge_xof < 0 ? "text-perte-texte" : "text-gain-texte")}>
                              {l.marge_xof >= 0 ? "+" : ""}{formatCourt(l.marge_xof)} <span className="text-[12px] font-semibold text-encre-3">{l.marge_pct !== null ? formatPourcent(l.marge_pct, 0) : ""}</span>
                            </span>
                          </div>
                          <div className="mt-2 h-3 overflow-hidden rounded-full bg-surface-2">
                            <div className="h-full origin-left rounded-full [animation:remplit_900ms_both]"
                              style={{ width: `${(Math.abs(l.marge_xof) / max) * 100}%`, background: l.marge_xof < 0 ? "var(--perte)" : "var(--gain)", animationDelay: `${i * 50}ms` }} />
                          </div>
                          {/* Segments insécables : « 28 j en stock » ne se coupe plus au milieu ; aucune ligne ne commence par « · ». */}
                          <p className="mt-1 text-[12px] text-encre-3">
                            <span className="whitespace-nowrap">{formatDate(l.date_vente)} ·</span>{" "}
                            <span className="whitespace-nowrap">vendu {formatCourt(l.montant_ht)} HT ·</span>{" "}
                            <span className="whitespace-nowrap">revient {formatCourt(l.prix_revient_xof)} ·</span>{" "}
                            <span className="whitespace-nowrap">{l.jours_stock} j en stock</span>
                          </p>
                        </Link>
                      </li>
                    ));
                  })()}
                </ul>
              </section>
            )}
            {marges.data.ventes.length === 0 && <EtatVide titre="Aucune vente sur cette période" />}
          </div>
        )
      )}

      <FeuilleFrais ouverte={nouvelleDepense} onFermer={() => setNouvelleDepense(false)} portee="generale" titre="Ajouter une dépense" />
      <FeuilleTransfert ouverte={transfert} onFermer={() => setTransfert(false)} comptes={comptes.data ?? []} />
      <FeuilleComptes ouverte={gererComptes} onFermer={() => setGererComptes(false)} comptes={comptes.data ?? []} />
    </>
  );
}

export default function PageFinances() {
  return (
    <Suspense>
      <Finances />
    </Suspense>
  );
}
