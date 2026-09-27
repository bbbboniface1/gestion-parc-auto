"use client";

import Link from "next/link";
import { Calculator } from "@phosphor-icons/react";
import { estimerDouane, type BaremeDouane } from "@/lib/estimation";
import { HYPOTHESES_PAR_DEFAUT } from "@/lib/simulateur";
import { formatNombre } from "@/lib/format";
import { EnTeteSection } from "@/components/parametres/en-tete-section";
import { BarreEnregistrement, Groupe, useBrouillon } from "@/components/parametres/commun";
import { ChampNombre, Champ } from "@/components/ui/champ";
import { EtatErreur, SqueletteListe } from "@/components/ui/etats";
import { Registre } from "@/components/metier/registre";

export interface HypothesesEnregistrees {
  frais_enchere_pct?: number;
  frais_enchere_fixe_usd?: number;
  remorquage_usd?: number;
  fret_usd?: number;
  assurance_pct?: number;
  port_xof?: number;
  convoi_xof?: number;
  transitaire_xof?: number;
  atelier_xof?: number;
}

type BaremeComplet = BaremeDouane & { simulateur?: HypothesesEnregistrees };

const EXEMPLE_CAF = 7_296_000;

export default function PageDouane() {
  const { brouillon: p, maj, sale, enregistrement, enregistrer, annuler, erreur, recharger } = useBrouillon();
  if (erreur && !p) return <EtatErreur erreur={erreur} onReessayer={() => void recharger()} />;
  if (!p) return <SqueletteListe lignes={4} />;

  const b = p.bareme_douane as BaremeComplet;
  const h = b.simulateur ?? {};
  const majB = (cle: keyof BaremeDouane, v: number | string | null) => maj("bareme_douane", { ...b, [cle]: v ?? 0 });
  const majH = (cle: keyof HypothesesEnregistrees, v: number | null) => maj("bareme_douane", { ...b, simulateur: { ...h, [cle]: v ?? 0 } } as BaremeDouane);

  const droits = EXEMPLE_CAF * (((b.droit_douane_pct ?? 0) + (b.redevance_statistique_pct ?? 0) + (b.prelevement_communautaire_pct ?? 0)) / 100);
  const tva = (EXEMPLE_CAF + droits) * ((b.tva_pct ?? 0) / 100);
  const total = estimerDouane(EXEMPLE_CAF, b);

  return (
    <>
      <EnTeteSection cle="douane" titre="Frais et douane"
        sousTitre="Ces valeurs servent uniquement aux estimations : le coût réel est toujours le frais que vous saisissez."
        actions={<Link href="/outils/simulateur/" className="inline-flex h-10 items-center gap-2 rounded-controle border border-trait-fort bg-surface px-4 text-sm font-medium hover:bg-surface-2"><Calculator className="size-4" aria-hidden /> Ouvrir le simulateur</Link>} />
      <div className="flex flex-col gap-4">
        <Groupe titre="Barème de dédouanement" description="Les taux publiés pour le Mali sont tous indiqués comme approximatifs : faites valider ces valeurs par votre transitaire.">
          <div className="grid grid-cols-2 gap-3">
            <ChampNombre libelle="Droit de douane" valeur={b.droit_douane_pct ?? 0} onChange={(v) => majB("droit_douane_pct", v)} decimales={2} unite="% CAF" />
            <ChampNombre libelle="Redevance statistique" valeur={b.redevance_statistique_pct ?? 0} onChange={(v) => majB("redevance_statistique_pct", v)} decimales={2} unite="% CAF" />
            <ChampNombre libelle="Prélèvements communautaires" valeur={b.prelevement_communautaire_pct ?? 0} onChange={(v) => majB("prelevement_communautaire_pct", v)} decimales={2} unite="% CAF" />
            <ChampNombre libelle="TVA à l'import" valeur={b.tva_pct ?? 0} onChange={(v) => majB("tva_pct", v)} decimales={2} unite="%" />
          </div>
          <ChampNombre libelle="Frais fixes (timbres, fiches, visite)" valeur={b.frais_fixes_xof ?? 0} onChange={(v) => majB("frais_fixes_xof", v)} unite="FCFA" />
          <Champ libelle="Mention affichée avec les estimations" value={b.mention ?? ""} onChange={(e) => majB("mention", e.target.value)} />
          <div className="rounded-controle bg-surface-2 px-4 py-3">
            <p className="etiquette text-[12px] text-encre-3">Exemple pour une valeur CAF de {formatNombre(EXEMPLE_CAF)} FCFA</p>
            <Registre className="mt-1 text-[14px]" lignes={[
              { libelle: "Droits et prélèvements", valeur: formatNombre(Math.round(droits)) },
              { libelle: "TVA sur CAF + droits", valeur: formatNombre(Math.round(tva)) },
              { libelle: "Frais fixes", valeur: formatNombre(b.frais_fixes_xof ?? 0) },
              { libelle: "Douane estimée", valeur: `${formatNombre(total)} FCFA`, complement: `${formatNombre((total / EXEMPLE_CAF) * 100, 1)} % de la CAF`, fort: true },
            ]} />
          </div>
        </Groupe>

        <Groupe titre="Hypothèses du simulateur d'enchère" description="Vos tarifs habituels : le simulateur s'en sert pour calculer l'enchère maximale avant d'acheter.">
          <div className="grid grid-cols-2 gap-3">
            <ChampNombre libelle="Frais d'enchère" valeur={h.frais_enchere_pct ?? HYPOTHESES_PAR_DEFAUT.fraisEncherePourcent} onChange={(v) => majH("frais_enchere_pct", v)} decimales={1} unite="%" />
            <ChampNombre libelle="Frais d'enchère fixes" valeur={h.frais_enchere_fixe_usd ?? HYPOTHESES_PAR_DEFAUT.fraisEnchereFixeUsd} onChange={(v) => majH("frais_enchere_fixe_usd", v)} unite="$" />
            <ChampNombre libelle="Remorquage" valeur={h.remorquage_usd ?? HYPOTHESES_PAR_DEFAUT.remorquageUsd} onChange={(v) => majH("remorquage_usd", v)} unite="$" />
            <ChampNombre libelle="Fret maritime" valeur={h.fret_usd ?? HYPOTHESES_PAR_DEFAUT.fretUsd} onChange={(v) => majH("fret_usd", v)} unite="$" />
            <ChampNombre libelle="Assurance" valeur={h.assurance_pct ?? HYPOTHESES_PAR_DEFAUT.assurancePourcent} onChange={(v) => majH("assurance_pct", v)} decimales={2} unite="% FOB" />
            <ChampNombre libelle="Frais de port" valeur={h.port_xof ?? HYPOTHESES_PAR_DEFAUT.portXof} onChange={(v) => majH("port_xof", v)} unite="FCFA" />
            <ChampNombre libelle="Convoi vers Bamako" valeur={h.convoi_xof ?? HYPOTHESES_PAR_DEFAUT.convoiXof} onChange={(v) => majH("convoi_xof", v)} unite="FCFA" />
            <ChampNombre libelle="Transitaire" valeur={h.transitaire_xof ?? HYPOTHESES_PAR_DEFAUT.transitaireXof} onChange={(v) => majH("transitaire_xof", v)} unite="FCFA" />
            <ChampNombre libelle="Atelier moyen" valeur={h.atelier_xof ?? HYPOTHESES_PAR_DEFAUT.atelierXof} onChange={(v) => majH("atelier_xof", v)} unite="FCFA" />
          </div>
        </Groupe>
      </div>
      <BarreEnregistrement sale={sale} enregistrement={enregistrement} onEnregistrer={enregistrer} onAnnuler={annuler} />
    </>
  );
}
