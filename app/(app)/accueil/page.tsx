"use client";

import Link from "next/link";
import { Calculator, Plus } from "lucide-react";
import { useLecture } from "@/lib/api/requetes";
import type { TableauDeBord } from "@/lib/api/types";
import { useOrg } from "@/lib/session";
import { formatCourt, formatJour, formatPourcent } from "@/lib/format";
import { EnTetePage } from "@/components/coque/coque";
import { CapitalParEtape } from "@/components/metier/capital-etapes";
import { ListeActions } from "@/components/metier/liste-actions";
import { Registre } from "@/components/metier/registre";
import { GraphiqueMois } from "@/components/metier/graphique-mois";
import { EtatErreur, Squelette } from "@/components/ui/etats";
import { Surtitre } from "@/components/ui/signature";

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

export default function PageAujourdhui() {
  const org = useOrg();
  const { data, error, isPending, refetch } = useLecture<TableauDeBord>("tableau_de_bord", { p_org: org.id });

  return (
    <>
      <EnTetePage
        surtitre={formatJour(new Date())}
        titre="Aujourd'hui"
        actions={
          <>
            <Link href="/outils/simulateur/" className="inline-flex h-11 items-center gap-2 rounded-controle border border-trait-fort bg-surface px-4 text-[15px] font-medium hover:bg-surface-2 lg:h-10 lg:text-sm">
              <Calculator className="size-4" aria-hidden /> Simuler une enchère
            </Link>
            <Link href="/parc/nouveau/" className="hidden h-10 items-center gap-2 rounded-controle border border-trait-fort bg-surface px-4 text-sm font-medium hover:bg-surface-2 lg:inline-flex">
              <Plus className="size-4" aria-hidden /> Véhicule
            </Link>
          </>
        }
      />

      {error && !data ? (
        <EtatErreur erreur={error} onReessayer={() => void refetch()} />
      ) : isPending || !data ? (
        <div className="grid gap-5 lg:grid-cols-12" role="status" aria-label="Chargement">
          <Squelette className="h-80 lg:col-span-8" />
          <Squelette className="h-80 lg:col-span-4" />
        </div>
      ) : (
        <Contenu d={data} />
      )}
    </>
  );
}

function Contenu({ d }: { d: TableauDeBord }) {
  const i = d.indicateurs;
  const moisCourant = MOIS[new Date().getMonth()];
  const tauxMarge = i.ventes_mois.marge !== null && i.ventes_mois.ca > 0 ? (i.ventes_mois.marge / i.ventes_mois.ca) * 100 : null;
  const urgentes = d.actions.filter((a) => a.gravite === "haute").length;

  return (
    <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
      <div className="flex flex-col gap-5 lg:col-span-8 lg:gap-6">
        <CapitalParEtape tranches={i.capital_par_etape} />

        <section aria-labelledby="titre-actions">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 id="titre-actions" className="text-[19px] font-semibold tracking-tight">À faire</h2>
            <span className="text-[13px] text-encre-3">
              {d.actions.length === 0 ? "" : urgentes > 0 ? `${urgentes} urgent${urgentes > 1 ? "s" : ""} sur ${d.actions.length}` : `${d.actions.length} élément${d.actions.length > 1 ? "s" : ""}`}
            </span>
          </div>
          <ListeActions actions={d.actions} limite={8} />
        </section>
      </div>

      <aside className="flex flex-col gap-5 lg:col-span-4 lg:gap-6">
        <section aria-labelledby="titre-mois" className="rounded-carte border border-trait bg-surface p-4 lg:p-5">
          <Surtitre as="h2" className="mb-1">{moisCourant}</Surtitre>
          <p id="titre-mois" className="sr-only">Activité du mois</p>
          <Registre
            lignes={[
              { libelle: "Ventes", valeur: i.ventes_mois.nb },
              { libelle: "Chiffre d'affaires", valeur: formatCourt(i.ventes_mois.ca) },
              ...(i.ventes_mois.marge !== null
                ? [{ libelle: "Marge", valeur: <span className="text-laterite">{formatCourt(i.ventes_mois.marge)}</span>, complement: tauxMarge !== null ? formatPourcent(tauxMarge, 0) : undefined }]
                : []),
              { libelle: "Encaissé", valeur: formatCourt(i.encaisse_mois) },
              { libelle: "Créances clients", valeur: formatCourt(i.creances_total), fort: true },
              ...(i.a_payer_fournisseurs !== null ? [{ libelle: "À payer fournisseurs", valeur: formatCourt(i.a_payer_fournisseurs) }] : []),
            ]}
          />
          <p className="mt-2 text-[12px] text-encre-3">Montants en FCFA, hors taxes.</p>
        </section>

        <section className="rounded-carte border border-trait bg-surface p-4 lg:p-5">
          <GraphiqueMois points={d.series} />
        </section>

        <Link href="/parc/?vue=en_vente" className="flex items-center justify-between rounded-carte border border-trait bg-surface px-4 py-3 hover:bg-surface-2/60">
          <span>
            <span className="etiquette block text-[12px] text-encre-3">Au parc, disponibles</span>
            <span className="text-[15px] font-medium">Prêts à être vendus aujourd&apos;hui</span>
          </span>
          <span className="chiffres text-[28px] font-semibold">{i.nb_au_parc_disponibles}</span>
        </Link>
      </aside>
    </div>
  );
}
