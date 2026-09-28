"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownLeft, ArrowUpRight, ArrowsLeftRight, Bank, Car, CaretRight, ChartLineUp, CheckCircle, Clock, CurrencyCircleDollar, DeviceMobile, DownloadSimple, Gear,
  Money, Percent, Plus, Timer, WhatsappLogo, type Icon,
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
import { Indicateur, Puces } from "@/components/ui/recherche";
import { EtatErreur, EtatVide, SqueletteListe } from "@/components/ui/etats";
import { FeuilleFrais } from "@/components/metier/feuille-frais";
import { ListeDepenses } from "@/components/finances/liste-depenses";
import { FeuilleTransfert } from "@/components/finances/feuille-transfert";
import { FeuilleComptes } from "@/components/finances/feuille-comptes";
import { periodePour, type CodePeriode } from "@/components/finances/periode";

type Onglet = "tresorerie" | "depenses" | "creances" | "rentabilite";

const PERIODES: { valeur: CodePeriode; libelle: string }[] = [
  { valeur: "mois", libelle: "Ce mois" }, { valeur: "mois_precedent", libelle: "Mois dernier" },
  { valeur: "trimestre", libelle: "3 mois" }, { valeur: "annee", libelle: "Cette année" },
];

/** Apparence d'un compte : la couleur de l'opérateur quand on la reconnaît (Orange Money, Wave, Moov). */
function apparenceCompte(c: Pick<Compte, "nom" | "type">): { degrade: string; icone: Icon; lueur: string } {
  const n = c.nom.toLowerCase();
  if (n.includes("orange")) return { degrade: "linear-gradient(135deg,#ff9a3d,#ff6a00)", icone: DeviceMobile, lueur: "#ff7900" };
  if (n.includes("wave")) return { degrade: "linear-gradient(135deg,#5ee0ff,#1596d9)", icone: DeviceMobile, lueur: "#1dc3f0" };
  if (n.includes("moov")) return { degrade: "linear-gradient(135deg,#3b82f6,#0a4aa8)", icone: DeviceMobile, lueur: "#0a5cbf" };
  if (c.type === "mobile_money") return { degrade: "linear-gradient(135deg,#a78bfa,#6d28d9)", icone: DeviceMobile, lueur: "#7c3aed" };
  if (c.type === "banque") return { degrade: "linear-gradient(135deg,#2d4a8a,#0b1633)", icone: Bank, lueur: "#16275a" };
  return { degrade: "linear-gradient(135deg,#34d399,#0f8a4f)", icone: Money, lueur: "#16a34a" };
}

function CarteCompte({ c, index }: { c: Tresorerie["comptes"][number]; index: number }) {
  const a = apparenceCompte(c);
  const solde = useCompteur(c.solde_xof ?? 0);
  return (
    <div className="apparition relative overflow-hidden rounded-[20px] p-4 text-white transition-transform hover:-translate-y-1" style={{ background: a.degrade, boxShadow: `0 16px 32px -14px ${a.lueur}`, ...decalage(index) }}>
      <div aria-hidden className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-white/15" />
      <div aria-hidden className="pointer-events-none absolute -right-4 -bottom-16 size-32 rounded-full bg-white/10" />
      <div className="relative flex items-center justify-between gap-2">
        <span className="truncate text-[14px] font-bold">{c.nom}</span>
        <a.icone size={22} weight="fill" className="shrink-0 opacity-90" aria-hidden />
      </div>
      <p className="chiffres relative mt-4 text-[26px] leading-none font-extrabold tracking-tight">{formatCourt(solde)} <span className="text-[13px] font-semibold opacity-80">FCFA</span></p>
      <p className="relative mt-3 flex gap-3 text-[12px] font-semibold opacity-90">
        <span className="inline-flex items-center gap-0.5"><ArrowDownLeft size={13} weight="bold" aria-hidden />+{formatCourt(c.entrees_periode)}</span>
        <span className="inline-flex items-center gap-0.5"><ArrowUpRight size={13} weight="bold" aria-hidden />−{formatCourt(c.sorties_periode)}</span>
      </p>
    </div>
  );
}

function Finances() {
  const org = useOrg();
  const router = useRouter();
  const params = useSearchParams();
  const peutVoir = peut(org.role, "voirTresorerie");
  const peutModifier = peut(org.role, "saisirFrais");
  const peutComptes = peut(org.role, "gererComptes");

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

  if (!peutVoir) return <EtatVide titre="Accès réservé" texte="Les finances sont réservées au propriétaire, au gérant, au comptable et au rôle lecture seule." />;

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
            {peutComptes && <Bouton className="flex-1 sm:flex-none" icone={<ArrowsLeftRight size={18} weight="duotone" className="text-primaire" />} onClick={() => setTransfert(true)}><span>Transférer<span className="hidden sm:inline"> entre comptes</span></span></Bouton>}
            {peutModifier && <Bouton className="flex-[2] sm:flex-none" variante="primaire" icone={<Plus size={18} weight="bold" />} onClick={() => setNouvelleDepense(true)}>Ajouter une dépense</Bouton>}
          </>
        } />

      <Onglets libelle="Section" className="mb-4" valeur={onglet} onChange={(v) => { setOnglet(v); router.replace(`/finances/?onglet=${v}`, { scroll: false }); }}
        onglets={[
          { valeur: "tresorerie", libelle: "Trésorerie", couleur: "var(--gain)" },
          { valeur: "depenses", libelle: "Dépenses", couleur: "var(--accent)" },
          { valeur: "creances", libelle: "Créances", couleur: "var(--perte)" },
          { valeur: "rentabilite", libelle: "Rentabilité", couleur: "var(--primaire)" },
        ]} />

      {onglet !== "creances" && <Puces className="mb-5" valeur={periode} onChange={setPeriode} libelle="Période" options={PERIODES} />}

      {onglet === "tresorerie" && (
        tresorerie.error && !tresorerie.data ? <EtatErreur erreur={tresorerie.error} onReessayer={() => void tresorerie.refetch()} /> : tresorerie.isPending || !tresorerie.data ? <SqueletteListe /> : (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[17px] font-bold">Vos comptes</h2>
              {peutComptes && <Bouton variante="fantome" taille="sm" icone={<Gear size={16} weight="duotone" />} onClick={() => setGererComptes(true)}>Gérer les comptes</Bouton>}
            </div>
            <div className="-mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {tresorerie.data.comptes.filter((c) => c.actif || (c.solde_xof ?? 0) !== 0).map((c, i) => <CarteCompte key={c.id} c={c} index={i} />)}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Indicateur index={0} libelle="Total disponible" valeur={tresorerie.data.totaux.solde_total} format={formatCourt} precision="FCFA, tous comptes" icone={CurrencyCircleDollar} couleur="var(--primaire)" />
              <Indicateur index={1} libelle="Entrées de la période" valeur={tresorerie.data.totaux.entrees_periode} format={(x) => `+${formatCourt(x)}`} precision="encaissements" icone={ArrowDownLeft} couleur="var(--gain)" />
              <Indicateur index={2} libelle="Sorties de la période" valeur={tresorerie.data.totaux.sorties_periode} format={(x) => `−${formatCourt(x)}`} precision="dépenses payées, hors achats de véhicules" icone={ArrowUpRight} couleur="var(--perte)" />
              <Indicateur index={3} libelle="Achats de véhicules" valeur={tresorerie.data.totaux.achats_vehicules_periode} format={formatCourt} precision="prix d'achat de la période, hors comptes" icone={Car} couleur="var(--accent)" />
            </div>
            <section className="carte apparition p-4 lg:p-5" aria-labelledby="titre-mouvements">
              <h2 id="titre-mouvements" className="mb-3 text-[17px] font-bold">Mouvements</h2>
              {tresorerie.data.mouvements.length === 0 ? <p className="py-2 text-encre-3">Aucun mouvement sur cette période.</p> : (
                <ul className="flex flex-col">
                  {tresorerie.data.mouvements.slice(0, 50).map((m, i) => {
                    const entree = m.montant_xof >= 0;
                    const corps = (
                      <>
                        <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", entree ? "bg-gain-voile text-gain-texte" : "bg-perte-voile text-perte-texte")}>
                          {entree ? <ArrowDownLeft size={18} weight="bold" aria-label="Entrée" /> : <ArrowUpRight size={18} weight="bold" aria-label="Sortie" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold group-hover:text-primaire">{m.libelle}</p>
                          <p className="text-[12px] text-encre-3">{formatDate(m.date)}{m.compte_nom ? ` · ${m.compte_nom}` : ""}</p>
                        </div>
                        <Montant valeur={m.montant_xof} devise={null} signe className={entree ? "text-gain-texte" : "text-perte-texte"} />
                        {(m.entite === "vente" || m.entite === "frais") && <CaretRight size={14} weight="bold" className="shrink-0 text-encre-3 transition-transform group-hover:translate-x-0.5 group-hover:text-primaire" aria-hidden />}
                      </>
                    );
                    const idTransfert = m.entite === "transfert" ? m.entite_id : null;
                    const cls = "group flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-surface-2";
                    return (
                      <li key={i}>
                        {m.entite === "vente" && m.entite_id ? (
                          <Link href={`/ventes/fiche/?id=${m.entite_id}`} className={cls}>{corps}</Link>
                        ) : m.entite === "frais" && m.entite_id ? (
                          <button type="button" className={cls} onClick={() => { setFraisEnEvidence(m.entite_id); setPeriode("annee"); setOnglet("depenses"); router.replace("/finances/?onglet=depenses", { scroll: false }); }}>{corps}</button>
                        ) : (
                          <div className="flex items-center gap-3 rounded-xl px-2 py-2.5">
                            {corps}
                            {idTransfert && peutComptes && (
                              <button type="button" title="Annuler ce transfert" onClick={() => { if (window.confirm("Annuler ce transfert ? Les deux comptes retrouvent leur solde d'avant.")) annulerTransfert.executer({ p_org: org.id, p_id: idTransfert }); }}
                                className="onde inline-flex h-8 shrink-0 items-center rounded-full px-3 text-[12px] font-semibold text-encre-3 hover:bg-perte-voile hover:text-perte-texte">Annuler</button>
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
          <>
            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
              <Indicateur index={0} libelle="Total dû par les clients" valeur={tresorerie.data.creances.reduce((s, c) => s + c.reste_xof, 0)} format={formatCourt} precision={pluriel(tresorerie.data.creances.length, "vente")} icone={Clock} couleur="var(--accent)" />
              <Indicateur index={1} libelle="Dont en retard" valeur={tresorerie.data.creances.reduce((s, c) => s + c.retard_xof, 0)} format={formatCourt} precision={pluriel(tresorerie.data.creances.filter((c) => c.jours_retard !== null).length, "client")} icone={Timer} couleur="var(--perte)" alerte={tresorerie.data.creances.some((c) => c.jours_retard !== null)} />
            </div>
            <ul className="grid gap-3 lg:grid-cols-2">
              {tresorerie.data.creances.map((c, i) => {
                const part = c.montant_ttc > 0 ? c.encaisse_xof / c.montant_ttc : 0;
                return (
                  <li key={c.vente_id} className={cn("carte apparition p-4", c.jours_retard !== null && "ring-2 ring-perte/25")} style={decalage(Math.min(i, 10), 50)}>
                    <div className="flex items-start gap-3">
                      <Avatar nom={c.client_nom} taille={44} />
                      <div className="min-w-0 flex-1">
                        <Link href={`/ventes/fiche/?id=${c.vente_id}`} className="block truncate text-[16px] font-bold hover:text-primaire">{c.client_nom}</Link>
                        <p className="truncate text-[13px] text-encre-3">{c.vehicule_libelle} · {c.numero}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="chiffres text-[18px] font-extrabold text-ocre-texte">{formatCourt(c.reste_xof)}</p>
                        <p className="text-[11px] text-encre-3">reste dû</p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full origin-left rounded-full [animation:remplit_900ms_both]" style={{ width: `${part * 100}%`, background: c.jours_retard !== null ? "var(--perte)" : "var(--accent)" }} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      {c.jours_retard !== null ? (
                        <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-perte-voile px-2.5 text-[12px] font-bold text-perte-texte"><Timer size={14} weight="fill" aria-hidden />{pluriel(c.jours_retard, "jour")} de retard</span>
                      ) : <span className="text-[12px] text-encre-3">{formatCourt(c.encaisse_xof)} déjà reçus sur {formatCourt(c.montant_ttc)}</span>}
                      {c.client_telephone && (
                        <a href={lienWhatsApp(c.client_telephone, `Bonjour ${c.client_nom}, un rappel amical concernant votre facture ${c.numero} : il reste ${formatNombre(c.reste_xof)} FCFA à régler. Merci.`)}
                          target="_blank" rel="noopener" className="onde inline-flex h-10 items-center gap-2 rounded-full bg-[#25d366] px-4 text-[13px] font-bold text-[#062b14] shadow-[0_8px_18px_-8px_#25d366] transition-transform hover:-translate-y-0.5">
                          <WhatsappLogo size={18} weight="fill" aria-hidden /> Relancer sur WhatsApp
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )
      )}

      {onglet === "rentabilite" && (
        marges.error && !marges.data ? <EtatErreur erreur={marges.error} onReessayer={() => void marges.refetch()} /> : marges.isPending || !marges.data ? <SqueletteListe /> : (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Indicateur index={0} libelle="Ventes" valeur={marges.data.totaux.nb} format={(x) => String(Math.round(x))} precision="sur la période" icone={CheckCircle} couleur="var(--gain)" />
              <Indicateur index={1} libelle="Chiffre d'affaires" valeur={marges.data.totaux.ca} format={formatCourt} precision="FCFA hors taxes" icone={ChartLineUp} couleur="var(--primaire)" />
              <Indicateur index={2} libelle="Marge" valeur={marges.data.totaux.marge} format={formatCourt} precision="FCFA" icone={CurrencyCircleDollar} couleur="var(--gain)" />
              <Indicateur index={3} libelle="Taux de marge" valeur={marges.data.totaux.marge_pct ?? 0} format={(x) => (marges.data!.totaux.marge_pct !== null ? formatPourcent(x, 1) : "—")} precision={marges.data.totaux.jours_stock_moyen !== null ? `${marges.data.totaux.jours_stock_moyen} j en stock en moyenne` : undefined} icone={Percent} couleur="var(--accent)" />
            </div>

            {marges.data.ventes.length > 0 && (
              <section className="carte apparition p-4 lg:p-5" aria-labelledby="titre-marges">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h2 id="titre-marges" className="text-[17px] font-bold">Ce que chaque vente a rapporté</h2>
                  <Bouton variante="secondaire" taille="sm" icone={<DownloadSimple size={16} weight="bold" />} onClick={exporterRentabilite}>Exporter pour Excel</Bouton>
                </div>
                <ul className="flex flex-col gap-3">
                  {(() => {
                    const max = Math.max(1, ...marges.data.ventes.map((l) => Math.abs(l.marge_xof)));
                    return [...marges.data.ventes].sort((a, b) => b.marge_xof - a.marge_xof).map((l, i) => (
                      <li key={l.vente_id} className="apparition" style={decalage(Math.min(i, 12), 40)}>
                        <Link href={`/ventes/fiche/?id=${l.vente_id}`} className="group block rounded-xl px-2 py-1.5 transition-colors hover:bg-surface-2">
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="min-w-0 truncate font-semibold group-hover:text-primaire">{l.vehicule_libelle} <span className="font-normal text-encre-3">· {l.client_nom}</span></span>
                            <span className={cn("chiffres shrink-0 font-extrabold", l.marge_xof < 0 ? "text-perte-texte" : "text-gain-texte")}>
                              {l.marge_xof >= 0 ? "+" : ""}{formatCourt(l.marge_xof)} <span className="text-[12px] font-semibold text-encre-3">{l.marge_pct !== null ? formatPourcent(l.marge_pct, 0) : ""}</span>
                            </span>
                          </div>
                          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface-2">
                            <div className="h-full origin-left rounded-full [animation:remplit_900ms_both]"
                              style={{ width: `${(Math.abs(l.marge_xof) / max) * 100}%`, background: l.marge_xof < 0 ? "var(--perte)" : "linear-gradient(90deg,#22c55e,#16a34a)", animationDelay: `${i * 50}ms` }} />
                          </div>
                          <p className="mt-1 text-[12px] text-encre-3">{formatDate(l.date_vente)} · vendu {formatCourt(l.montant_ht)} HT · revient {formatCourt(l.prix_revient_xof)} · {l.jours_stock} j en stock</p>
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
