"use client";

import Link from "next/link";
import { Calculator, HandCoins, Plus, TrendUp } from "@phosphor-icons/react";
import { useLecture } from "@/lib/api/requetes";
import type { ActionAFaire, TableauDeBord, Vehicule } from "@/lib/api/types";
import { aVerifier } from "@/lib/workflow";
import { useOrg } from "@/lib/session";
import { formatCourt, formatJour, formatPourcent, pluriel } from "@/lib/format";
import { EnTetePage } from "@/components/coque/coque";
import { ListeActions } from "@/components/metier/liste-actions";
import { GraphiqueVentes, HeroCapital, ResumeMois, TuileIndicateur, VitrineParc } from "@/components/metier/tableau-bord";
import { EtatErreur, Squelette } from "@/components/ui/etats";
import { classesBouton } from "@/components/ui/bouton";

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
            <Link href="/outils/simulateur/" className={classesBouton("secondaire")}>
              <Calculator className="size-4 text-primaire" aria-hidden /> Simuler une enchère
            </Link>
            <Link href="/parc/nouveau/" className={classesBouton("primaire", "md", "hidden lg:inline-flex")}>
              <Plus className="size-4" aria-hidden /> Ajouter un véhicule
            </Link>
          </>
        }
      />

      {error && !data ? (
        <EtatErreur erreur={error} onReessayer={() => void refetch()} />
      ) : isPending || !data ? (
        <div className="grid gap-4 lg:grid-cols-12 lg:gap-6" role="status" aria-label="Chargement">
          <Squelette className="h-96 rounded-carte lg:col-span-12 xl:col-span-8" />
          <Squelette className="h-96 rounded-carte lg:col-span-12 xl:col-span-4" />
          <Squelette className="h-72 rounded-carte lg:col-span-7 xl:col-span-8" />
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

const RANG_GRAVITE = { haute: 0, moyenne: 1, info: 2 } as const;

function Contenu({ d: brut, vehicules }: { d: TableauDeBord; vehicules: Vehicule[] }) {
  // Les véhicules dont l'étape contredit leur conteneur rejoignent la liste « À faire », avec leur correction en une ligne.
  const incoherences: ActionAFaire[] = aVerifier(vehicules).map(({ vehicule, souci }) => ({
    type: "incoherence_conteneur", gravite: "moyenne", titre: vehicule.libelle, detail: souci.titre, entite: "vehicule", entite_id: vehicule.id, date: null,
  }));
  const d: TableauDeBord = { ...brut, actions: [...incoherences, ...brut.actions].sort((a, b) => RANG_GRAVITE[a.gravite] - RANG_GRAVITE[b.gravite]) };
  const i = d.indicateurs;
  const series = d.series.slice(-6);
  const ca = series.map((s) => s.ca);
  const marges = series.map((s) => s.marge ?? 0);
  const nbs = series.map((s) => s.nb);
  const tauxMarge = i.ventes_mois.marge !== null && i.ventes_mois.ca > 0 ? (i.ventes_mois.marge / i.ventes_mois.ca) * 100 : null;
  const urgentes = d.actions.filter((a) => a.gravite === "haute").length;
  const prets = vehicules.filter((v) => v.etape === "parc" && v.statut_commercial === "disponible");

  // Deux niveaux (docs/CONVENTIONS_FRONT.md, « Hiérarchie ») :
  //  1. premier plan — le capital immobilisé et les deux chiffres qui décident de la journée : ce qui rentre
  //     (chiffre d'affaires du mois) et ce qu'on attend encore des clients (créances) ;
  //  2. second plan, plus calme — ce qu'il y a à faire, le reste du mois, les 12 derniers mois, la vitrine.
  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
        <div className="min-w-0 lg:col-span-12 xl:col-span-8">
          <HeroCapital tranches={i.capital_par_etape} disponibles={i.nb_au_parc_disponibles} />
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-4 lg:col-span-12 lg:gap-6 xl:col-span-4 xl:grid-cols-1">
          <TuileIndicateur index={1} libelle="Chiffre d'affaires du mois" valeur={i.ventes_mois.ca} complement="FCFA facturés ce mois"
            evolution={evolution(ca)} serie={ca} couleur="var(--primaire)" icone={<TrendUp className="size-5" />} lien="/finances/?onglet=rentabilite" />
          <TuileIndicateur index={2} libelle="Créances clients" valeur={i.creances_total}
            complement={i.a_payer_fournisseurs !== null ? `FCFA à encaisser · ${formatCourt(i.a_payer_fournisseurs)} à payer aux fournisseurs` : "FCFA à encaisser"}
            couleur="var(--accent)" icone={<HandCoins className="size-5" />} lien="/finances/?onglet=creances" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
        <div className="order-2 flex min-w-0 flex-col gap-4 lg:order-1 lg:col-span-7 lg:gap-6 xl:col-span-8">
          <ResumeMois index={3} mesures={[
            { libelle: "Ventes", valeur: String(i.ventes_mois.nb), evolution: evolution(nbs), lien: "/ventes/" },
            i.ventes_mois.marge !== null
              ? { libelle: "Marge", valeur: formatCourt(i.ventes_mois.marge), evolution: evolution(marges), detail: tauxMarge !== null ? `${formatPourcent(tauxMarge, 0)} du chiffre d'affaires` : undefined, lien: "/finances/?onglet=rentabilite" }
              : { libelle: "Encaissé", valeur: formatCourt(i.encaisse_mois), detail: "FCFA reçus ce mois" },
          ]} />
          <GraphiqueVentes points={d.series} />
        </div>
        <section aria-labelledby="titre-actions" className="apparition order-1 min-w-0 lg:order-2 lg:col-span-5 xl:col-span-4" style={{ animationDelay: "120ms" }}>
          <div className="mb-3 flex min-h-7 items-center justify-between gap-2">
            <h2 id="titre-actions" className="text-[18px] font-bold">À faire</h2>
            {d.actions.length > 0 && (
              <span className={urgentes > 0 ? "inline-flex h-6 items-center rounded-full bg-perte-voile px-2 text-[12px] font-bold text-perte-texte" : "text-[14px] text-encre-3"}>
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
