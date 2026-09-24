"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { useParametres } from "@/lib/api/parametres";
import type { BaremeDouane } from "@/lib/estimation";
import { enchereMaximale, HYPOTHESES_PAR_DEFAUT, type HypothesesSimulateur } from "@/lib/simulateur";
import { formatFCFA, formatNombre } from "@/lib/format";
import { libelleCategorie } from "@/lib/domaine";
import { cn } from "@/lib/cn";
import { EnTetePage } from "@/components/coque/coque";
import { ChampMontant } from "@/components/ui/champ-montant";
import { ChampNombre } from "@/components/ui/champ";
import { Choix } from "@/components/ui/choix";
import { Montant } from "@/components/ui/signature";
import { Squelette } from "@/components/ui/etats";

interface HypothesesEnregistrees {
  frais_enchere_pct?: number; frais_enchere_fixe_usd?: number; remorquage_usd?: number; fret_usd?: number;
  assurance_pct?: number; port_xof?: number; convoi_xof?: number; transitaire_xof?: number; atelier_xof?: number;
}

function hypothesesDepuisParametres(bareme: BaremeDouane | undefined, tauxUsd: number | undefined): HypothesesSimulateur {
  const h = (bareme as (BaremeDouane & { simulateur?: HypothesesEnregistrees }) | undefined)?.simulateur ?? {};
  return {
    tauxUsd: tauxUsd ?? HYPOTHESES_PAR_DEFAUT.tauxUsd,
    fraisEncherePourcent: h.frais_enchere_pct ?? HYPOTHESES_PAR_DEFAUT.fraisEncherePourcent,
    fraisEnchereFixeUsd: h.frais_enchere_fixe_usd ?? HYPOTHESES_PAR_DEFAUT.fraisEnchereFixeUsd,
    remorquageUsd: h.remorquage_usd ?? HYPOTHESES_PAR_DEFAUT.remorquageUsd,
    fretUsd: h.fret_usd ?? HYPOTHESES_PAR_DEFAUT.fretUsd,
    assurancePourcent: h.assurance_pct ?? HYPOTHESES_PAR_DEFAUT.assurancePourcent,
    douane: bareme
      ? { mode: "taux", tauxCumulePourcent: (bareme.droit_douane_pct ?? 0) + (bareme.redevance_statistique_pct ?? 0) + (bareme.prelevement_communautaire_pct ?? 0) + (bareme.tva_pct ?? 0) }
      : HYPOTHESES_PAR_DEFAUT.douane,
    portXof: h.port_xof ?? HYPOTHESES_PAR_DEFAUT.portXof,
    convoiXof: h.convoi_xof ?? HYPOTHESES_PAR_DEFAUT.convoiXof,
    transitaireXof: h.transitaire_xof ?? HYPOTHESES_PAR_DEFAUT.transitaireXof,
    atelierXof: h.atelier_xof ?? HYPOTHESES_PAR_DEFAUT.atelierXof,
    diversXof: 0,
  };
}

export default function PageSimulateur() {
  const { data: reglages, isPending } = useParametres();
  const [prixVente, setPrixVente] = useState<number | null>(14_500_000);
  const [typeMarge, setTypeMarge] = useState<"montant" | "pourcent">("pourcent");
  const [margeValeur, setMargeValeur] = useState<number | null>(15);

  const hypotheses = useMemo(() => hypothesesDepuisParametres(reglages?.parametres.bareme_douane, reglages?.parametres.taux_usd), [reglages]);

  const resultat = useMemo(() => {
    if (!prixVente || !margeValeur) return null;
    return enchereMaximale(prixVente, { type: typeMarge, valeur: margeValeur }, hypotheses);
  }, [prixVente, margeValeur, typeMarge, hypotheses]);

  if (isPending) return <Squelette className="h-96 rounded-carte" />;

  return (
    <>
      <EnTetePage titre="Simulateur d'enchère" sousTitre="Jusqu'où enchérir aux USA pour atteindre la marge visée, une fois toutes les charges payées." />
      <div className="grid gap-5 lg:grid-cols-12">
        <section className="rounded-carte border border-trait bg-surface p-4 lg:col-span-5 lg:p-5">
          <h2 className="mb-3 text-[16px] font-semibold">Ce que vous visez</h2>
          <div className="flex flex-col gap-4">
            <ChampMontant libelle="Prix de vente à Bamako" valeur={prixVente} onChange={setPrixVente} devise="XOF" />
            <Choix libelle="Marge exprimée en" colonnes={2} valeur={typeMarge} onChange={(v) => v && setTypeMarge(v)}
              options={[{ valeur: "pourcent", libelle: "Pourcentage" }, { valeur: "montant", libelle: "Montant" }]} />
            {typeMarge === "pourcent" ? (
              <ChampNombre libelle="Marge voulue" valeur={margeValeur} onChange={setMargeValeur} min={0} max={95} decimales={1} unite="%" />
            ) : (
              <ChampMontant libelle="Marge voulue" valeur={margeValeur} onChange={setMargeValeur} devise="XOF" />
            )}
          </div>
          <p className="mt-4 text-[12px] text-encre-3">
            Hypothèses de frais et barème de douane : réglables dans Paramètres › Frais et douane.
            {reglages?.parametres.bareme_douane?.mention ? ` ${reglages.parametres.bareme_douane.mention}.` : ""}
          </p>
        </section>

        <section className="rounded-carte border border-trait bg-surface p-4 lg:col-span-7 lg:p-5">
          <h2 className="mb-3 text-[16px] font-semibold">Enchère maximale</h2>
          {!resultat ? (
            <p className="text-encre-3">Renseignez le prix de vente et la marge voulue.</p>
          ) : resultat.impossible ? (
            <p className="rounded-controle bg-perte-voile px-3 py-3 text-perte">Ce prix de vente ne couvre même pas les frais fixes pour la marge demandée. Baissez la marge ou revoyez le prix.</p>
          ) : (
            <>
              <div className="flex items-baseline gap-3">
                <Calculator className="size-6 text-laterite" aria-hidden />
                <p className="chiffres text-[36px] font-semibold tracking-tight">{formatNombre(resultat.enchereMaxUsd)}<span className="ml-1 text-[16px] font-normal text-encre-3">$</span></p>
              </div>
              <p className="mt-1 text-[13px] text-encre-3">Marge obtenue : <Montant valeur={resultat.margeObtenueXof} devise={null} className={cn(resultat.margeObtenueXof < 0 && "text-perte")} /> ({formatFCFA(resultat.detail.totalXof)} de coût total)</p>
              <ul className="mt-4 flex flex-col">
                {resultat.detail.lignes.map((l) => (
                  <li key={l.code} className="flex items-center justify-between gap-3 border-b border-trait py-2 text-[14px] last:border-b-0">
                    <span>{libelleCategorie(l.code)}{l.montantUsd !== undefined ? ` (${formatNombre(l.montantUsd)} $)` : ""}</span>
                    <span className="chiffres">{formatFCFA(l.montantXof)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </>
  );
}
