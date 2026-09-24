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
import { Section } from "@/components/ui/section";

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
            <Link href="/outils/simulateur/" className="inline-flex h-11 items-center gap-2 rounded-controle bg-surface-2 px-4 font-medium hover:bg-trait lg:h-10">
              <Calculator className="size-4" aria-hidden /> Simuler une enchère
            </Link>
            <Link href="/parc/nouveau/" className="hidden h-10 items-center gap-2 rounded-controle bg-signal px-4 font-semibold text-sur-signal hover:bg-signal-fonce lg:inline-flex">
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
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-x-10">
      <div className="flex min-w-0 flex-col gap-8 lg:col-span-8">
        <CapitalParEtape tranches={i.capital_par_etape} />

        <Section
          titre="À faire"
          id="titre-actions"
          compteur={d.actions.length === 0 ? undefined : urgentes > 0 ? `${urgentes} urgent${urgentes > 1 ? "s" : ""} sur ${d.actions.length}` : d.actions.length}
        >
          <ListeActions actions={d.actions} limite={8} className="border-t-0" />
        </Section>
      </div>

      <aside className="flex min-w-0 flex-col gap-8 lg:col-span-4">
        <Section titre={moisCourant ?? "Ce mois"} id="titre-mois">
          <Registre
            lignes={[
              { libelle: "Ventes", valeur: i.ventes_mois.nb },
              { libelle: "Chiffre d'affaires", valeur: formatCourt(i.ventes_mois.ca) },
              ...(i.ventes_mois.marge !== null
                ? [{ libelle: "Marge", valeur: <span className="text-gain">{formatCourt(i.ventes_mois.marge)}</span>, complement: tauxMarge !== null ? formatPourcent(tauxMarge, 0) : undefined }]
                : []),
              { libelle: "Encaissé", valeur: formatCourt(i.encaisse_mois) },
              { libelle: "Créances clients", valeur: formatCourt(i.creances_total), fort: true },
              ...(i.a_payer_fournisseurs !== null ? [{ libelle: "À payer fournisseurs", valeur: formatCourt(i.a_payer_fournisseurs) }] : []),
            ]}
          />
          <p className="mt-2 text-petit text-encre-3">Montants en FCFA, hors taxes.</p>
        </Section>

        <Section titre="Ventes sur 12 mois" id="titre-serie">
          <div className="pt-2"><GraphiqueMois points={d.series} /></div>
        </Section>

        <Link href="/parc/?vue=en_vente" className="flex items-end justify-between border-t-2 border-encre pt-2 hover:bg-surface-2">
          <span>
            <span className="etiquette block text-petit text-encre">Au parc, disponibles</span>
            <span className="text-encre-2">Prêts à être vendus aujourd&apos;hui</span>
          </span>
          <span className="figure text-chiffre">{i.nb_au_parc_disponibles}</span>
        </Link>
      </aside>
    </div>
  );
}
