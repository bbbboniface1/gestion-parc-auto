"use client";

import Link from "next/link";
import { Calculator, CircleDollarSign, HandCoins, Plus, Receipt, TrendingUp } from "lucide-react";
import { useLecture } from "@/lib/api/requetes";
import type { TableauDeBord, Vehicule } from "@/lib/api/types";
import { useOrg } from "@/lib/session";
import { formatCourt, formatJour, formatPourcent, pluriel } from "@/lib/format";
import { EnTetePage } from "@/components/coque/coque";
import { ListeActions } from "@/components/metier/liste-actions";
import { GraphiqueVentes, HeroCapital, TuileIndicateur, VitrineParc } from "@/components/metier/tableau-bord";
import { EtatErreur, Squelette } from "@/components/ui/etats";

export default function PageAujourdhui() {
  const org = useOrg();
  const { data, error, isPending, refetch } = useLecture<TableauDeBord>("tableau_de_bord", { p_org: org.id });
  const parc = useLecture<Vehicule[]>("vehicules_lister", { p_org: org.id, p_filtres: {} });

  return (
    <>
      <EnTetePage
        surtitre={formatJour(new Date())}
        titre="Tableau de bord"
        sousTitre={`${org.nom} · l'essentiel de votre activité, en un coup d'œil`}
        actions={
          <>
            <Link href="/outils/simulateur/" className="inline-flex h-11 items-center gap-2 rounded-controle border border-trait-fort bg-surface px-4 text-[15px] font-semibold shadow-[0_1px_2px_rgb(15_23_42/0.05)] transition-colors hover:bg-surface-2 lg:h-10 lg:text-sm">
              <Calculator className="size-4 text-primaire" aria-hidden /> Simuler une enchère
            </Link>
            <Link href="/parc/nouveau/" className="hidden h-10 items-center gap-2 rounded-controle bg-gradient-to-b from-[#3a6cf0] to-primaire px-4 text-sm font-semibold text-white shadow-bouton transition-all hover:to-primaire-fonce lg:inline-flex">
              <Plus className="size-4" aria-hidden /> Ajouter un véhicule
            </Link>
          </>
        }
      />

      {error && !data ? (
        <EtatErreur erreur={error} onReessayer={() => void refetch()} />
      ) : isPending || !data ? (
        <div className="grid gap-5 lg:grid-cols-12" role="status" aria-label="Chargement">
          <Squelette className="h-80 rounded-[22px] lg:col-span-8" />
          <Squelette className="h-80 rounded-[22px] lg:col-span-4" />
          <Squelette className="h-72 rounded-[22px] lg:col-span-8" />
        </div>
      ) : (
        <Contenu d={data} vehicules={parc.data ?? []} />
      )}
    </>
  );
}

function evolution(serie: number[]): number | null {
  const cur = serie.at(-1);
  const prec = serie.at(-2);
  if (cur === undefined || prec === undefined || prec === 0) return null;
  return ((cur - prec) / Math.abs(prec)) * 100;
}

function Contenu({ d, vehicules }: { d: TableauDeBord; vehicules: Vehicule[] }) {
  const i = d.indicateurs;
  const series = d.series.slice(-6);
  const ca = series.map((s) => s.ca);
  const marges = series.map((s) => s.marge ?? 0);
  const nbs = series.map((s) => s.nb);
  const tauxMarge = i.ventes_mois.marge !== null && i.ventes_mois.ca > 0 ? (i.ventes_mois.marge / i.ventes_mois.ca) * 100 : null;
  const urgentes = d.actions.filter((a) => a.gravite === "haute").length;
  const prets = vehicules.filter((v) => v.etape === "parc" && v.statut_commercial === "disponible");

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
        <div className="min-w-0 lg:col-span-7 xl:col-span-8">
          <HeroCapital tranches={i.capital_par_etape} disponibles={i.nb_au_parc_disponibles} />
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-3 lg:col-span-5 lg:gap-4 xl:col-span-4">
          <TuileIndicateur index={1} libelle="Ventes du mois" valeur={i.ventes_mois.nb} format={(v) => String(Math.round(v))}
            evolution={evolution(nbs)} serie={nbs} couleur="var(--primaire)" icone={<Receipt className="size-5" />} lien="/ventes/" />
          <TuileIndicateur index={2} libelle="Chiffre d'affaires" valeur={i.ventes_mois.ca} complement="FCFA ce mois"
            evolution={evolution(ca)} serie={ca} couleur="var(--etape-en-mer)" icone={<TrendingUp className="size-5" />} lien="/finances/?onglet=rentabilite" />
          {i.ventes_mois.marge !== null ? (
            <TuileIndicateur index={3} libelle="Marge du mois" valeur={i.ventes_mois.marge} complement={tauxMarge !== null ? `${formatPourcent(tauxMarge, 0)} du chiffre d'affaires` : undefined}
              evolution={evolution(marges)} serie={marges} couleur="var(--gain)" icone={<CircleDollarSign className="size-5" />} lien="/finances/?onglet=rentabilite" />
          ) : (
            <TuileIndicateur index={3} libelle="Encaissé ce mois" valeur={i.encaisse_mois} couleur="var(--gain)" icone={<CircleDollarSign className="size-5" />} />
          )}
          <TuileIndicateur index={4} libelle="Créances clients" valeur={i.creances_total}
            complement={i.a_payer_fournisseurs !== null ? `${formatCourt(i.a_payer_fournisseurs)} à payer aux fournisseurs` : "reste à encaisser"}
            couleur="var(--accent)" icone={<HandCoins className="size-5" />} lien="/finances/?onglet=creances" />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
        <div className="min-w-0 lg:col-span-7 xl:col-span-8">
          <GraphiqueVentes points={d.series} />
        </div>
        <section aria-labelledby="titre-actions" className="apparition min-w-0 lg:col-span-5 xl:col-span-4" style={{ animationDelay: "180ms" }}>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="titre-actions" className="text-[17px] font-bold">À faire</h2>
            {d.actions.length > 0 && (
              <span className={urgentes > 0 ? "rounded-full bg-perte-voile px-2.5 py-0.5 text-[12px] font-bold text-perte-texte" : "text-[13px] text-encre-3"}>
                {urgentes > 0 ? `${urgentes} urgent${urgentes > 1 ? "s" : ""} sur ${d.actions.length}` : pluriel(d.actions.length, "élément")}
              </span>
            )}
          </div>
          <ListeActions actions={d.actions} limite={6} />
        </section>
      </div>

      <VitrineParc vehicules={prets} />
    </div>
  );
}
