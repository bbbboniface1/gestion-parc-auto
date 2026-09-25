"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Gavel, Sliders, TrendDown, Warning } from "@phosphor-icons/react";
import { useParametres } from "@/lib/api/parametres";
import type { BaremeDouane } from "@/lib/estimation";
import { coutPourEnchere, enchereMaximale, HYPOTHESES_PAR_DEFAUT, type HypothesesSimulateur } from "@/lib/simulateur";
import { formatCourt, formatFCFA, formatNombre, formatPourcent } from "@/lib/format";
import { libelleCategorie } from "@/lib/domaine";
import { useCompteur, decalage } from "@/lib/animation";
import { cn } from "@/lib/cn";
import { EnTetePage } from "@/components/coque/coque";
import { couleurCategorie } from "@/components/finances/ligne-depense";
import { ChampMontant } from "@/components/ui/champ-montant";
import { ChampNombre } from "@/components/ui/champ";
import { Choix } from "@/components/ui/choix";
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

const MARGES_RAPIDES = [10, 15, 20, 25];

/** Le grand chiffre : monte jusqu'à l'enchère maximale à chaque nouveau calcul. */
function EnchereHero({ enchereUsd, tauxUsd, coutTotal, margeXof, margePct, sensibilite }: {
  enchereUsd: number; tauxUsd: number; coutTotal: number; margeXof: number; margePct: number; sensibilite: number;
}) {
  const affiche = useCompteur(enchereUsd, 700);
  return (
    <section className="apparition relative overflow-hidden rounded-[22px] bg-[radial-gradient(120%_140%_at_100%_0%,#7c3aed_0%,#2457e5_45%,#0b1633_100%)] p-5 text-white shadow-[0_24px_48px_-20px_rgb(11_22_51/0.7)] lg:p-7" aria-live="polite">
      <div aria-hidden className="pointer-events-none absolute -top-16 -right-10 size-64 rounded-full bg-white/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full bg-[#ff7a1a]/25 blur-3xl" />
      <p className="etiquette relative flex items-center gap-2 text-[11px] text-white/75"><Gavel size={16} weight="fill" aria-hidden />Vous pouvez enchérir jusqu&apos;à</p>
      <p className="chiffres relative mt-2 text-[56px] leading-none font-extrabold tracking-tight lg:text-[72px]">
        {formatNombre(Math.round(affiche))}<span className="ml-2 text-[26px] font-bold text-white/70">$</span>
      </p>
      <p className="relative mt-2 text-[14px] text-white/75">soit {formatFCFA(Math.round(enchereUsd * tauxUsd))} · dollar à {formatNombre(tauxUsd, tauxUsd % 1 ? 2 : 0)} FCFA</p>
      <dl className="relative mt-6 grid grid-cols-3 gap-2 sm:gap-3">
        {[
          ["Coût de revient", `${formatCourt(coutTotal)}`, "FCFA, tout compris"],
          ["Marge obtenue", `${margeXof >= 0 ? "+" : "−"}${formatCourt(Math.abs(margeXof))}`, "FCFA"],
          ["Taux de marge", formatPourcent(margePct, 1), "du prix de vente"],
        ].map(([t, v, s]) => (
          <div key={t} className="rounded-xl bg-white/[0.09] px-3 py-2.5 ring-1 ring-white/15">
            <dt className="text-[11px] font-semibold text-white/70">{t}</dt>
            <dd className="chiffres mt-0.5 text-[20px] leading-tight font-extrabold">{v}</dd>
            <dd className="text-[11px] text-white/60">{s}</dd>
          </div>
        ))}
      </dl>
      <p className="relative mt-4 flex items-start gap-2 rounded-xl bg-black/20 px-3 py-2 text-[13px] text-white/85">
        <TrendDown size={18} weight="bold" className="mt-0.5 shrink-0 text-[#ffb37a]" aria-hidden />
        <span>Chaque <strong>100 $</strong> d&apos;enchère en plus vous coûte <strong className="chiffres">{formatFCFA(sensibilite)}</strong> de marge.</span>
      </p>
    </section>
  );
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

  const parametrage = "/parametres/douane/";
  const detail = resultat && !resultat.impossible ? resultat.detail : null;
  // La marge, dernier segment de la barre : ce qui reste du prix de vente une fois tous les coûts payés.
  const base = detail && prixVente ? Math.max(prixVente, detail.totalXof) : 0;
  const segments = detail
    ? [
        ...detail.lignes.map((l) => ({ code: l.code, libelle: l.code === "achat" ? "Enchère" : libelleCategorie(l.code), montantXof: l.montantXof, montantUsd: l.montantUsd, couleur: l.code === "achat" ? "var(--primaire)" : couleurCategorie(l.code) })),
        ...(resultat && resultat.margeObtenueXof > 0 ? [{ code: "marge", libelle: "Votre marge", montantXof: resultat.margeObtenueXof, montantUsd: undefined, couleur: "var(--gain)" }] : []),
      ]
    : [];
  const sensibilite = detail && resultat ? coutPourEnchere(resultat.enchereMaxUsd + 100, hypotheses).totalXof - detail.totalXof : 0;

  return (
    <>
      <EnTetePage surtitre="Avant d'enchérir" titre="Simulateur d'enchère" sousTitre="Jusqu'où enchérir aux USA pour atteindre la marge visée, une fois toutes les charges payées." />
      <div className="grid gap-5 lg:grid-cols-12 lg:items-start">
        <section className="carte apparition p-4 lg:col-span-5 lg:p-5" style={decalage(1)}>
          <h2 className="mb-4 flex items-center gap-2.5 text-[17px] font-bold">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] text-white shadow-[0_8px_16px_-8px_#7c3aed]"><Sliders size={20} weight="fill" aria-hidden /></span>
            Ce que vous visez
          </h2>
          <div className="flex flex-col gap-4">
            <ChampMontant libelle="Prix de vente à Bamako" valeur={prixVente} onChange={setPrixVente} devise="XOF" />
            <Choix libelle="Marge exprimée en" colonnes={2} valeur={typeMarge} onChange={(v) => v && setTypeMarge(v)}
              options={[{ valeur: "pourcent", libelle: "Pourcentage" }, { valeur: "montant", libelle: "Montant" }]} />
            {typeMarge === "pourcent" ? (
              <div className="flex flex-col gap-3">
                <ChampNombre libelle="Marge voulue" valeur={margeValeur} onChange={setMargeValeur} min={0} max={95} decimales={1} unite="%" />
                <input type="range" min={0} max={40} step={0.5} value={Math.min(margeValeur ?? 0, 40)} onChange={(e) => setMargeValeur(Number(e.target.value))}
                  aria-label="Ajuster la marge voulue" className="h-2 w-full cursor-pointer accent-[var(--primaire)]" />
                <div className="flex flex-wrap gap-2" role="group" aria-label="Marges courantes">
                  {MARGES_RAPIDES.map((m) => (
                    <button key={m} type="button" aria-pressed={margeValeur === m} onClick={() => setMargeValeur(m)}
                      className={cn("h-9 rounded-full px-4 text-[14px] font-semibold transition-all",
                        margeValeur === m ? "bg-primaire text-white shadow-bouton" : "bg-surface-2 text-encre-2 hover:bg-primaire-voile hover:text-primaire")}>{m} %</button>
                  ))}
                </div>
              </div>
            ) : (
              <ChampMontant libelle="Marge voulue" valeur={margeValeur} onChange={setMargeValeur} devise="XOF" />
            )}
          </div>
          <p className="mt-5 rounded-xl bg-surface-2 px-3 py-2.5 text-[13px] leading-snug text-encre-2">
            Les hypothèses de frais et le barème de douane se règlent dans <Link href={parametrage} className="font-semibold text-primaire hover:underline">Paramètres › Frais et douane</Link>.
            {reglages?.parametres.bareme_douane?.mention ? ` ${reglages.parametres.bareme_douane.mention}.` : ""}
          </p>
        </section>

        <div className="flex min-w-0 flex-col gap-5 lg:col-span-7">
          {!resultat ? (
            <section className="carte apparition p-6 text-center text-encre-3">
              <p className="text-[16px] font-semibold text-encre">Renseignez le prix de vente et la marge voulue</p>
              <p className="mt-1">L&apos;enchère maximale apparaît dès que les deux champs sont remplis.</p>
            </section>
          ) : resultat.impossible ? (
            <section role="alert" className="apparition flex items-start gap-3 rounded-2xl bg-perte-voile p-4 ring-1 ring-perte/25">
              <Warning size={26} weight="fill" className="shrink-0 text-perte" aria-hidden />
              <p className="text-perte-texte"><strong>Ce prix ne couvre pas les frais fixes.</strong> Même sans enchérir, la marge demandée n&apos;est pas tenable : baissez la marge ou revoyez le prix de vente.</p>
            </section>
          ) : (
            <>
              <EnchereHero enchereUsd={resultat.enchereMaxUsd} tauxUsd={hypotheses.tauxUsd} coutTotal={resultat.detail.totalXof}
                margeXof={resultat.margeObtenueXof} margePct={prixVente ? (resultat.margeObtenueXof / prixVente) * 100 : 0} sensibilite={sensibilite} />

              <section className="carte apparition p-4 lg:p-5" style={decalage(2)} aria-labelledby="titre-repartition">
                <h2 id="titre-repartition" className="text-[17px] font-bold">Où va chaque franc du prix de vente</h2>
                <div className="mt-4 flex h-5 overflow-hidden rounded-full bg-surface-2" role="img" aria-label="Répartition du prix de vente entre les coûts et la marge">
                  {segments.map((s, i) => (
                    <span key={s.code} className="h-full origin-left border-r-2 border-surface last:border-r-0 [animation:remplit_900ms_both]" title={`${s.libelle} : ${formatFCFA(s.montantXof)}`}
                      style={{ width: `${(s.montantXof / base) * 100}%`, background: s.couleur, animationDelay: `${i * 50}ms` }} />
                  ))}
                </div>
                <ul className="mt-3 flex flex-col">
                  {segments.map((s) => (
                    <li key={s.code} className={cn("flex items-center gap-3 rounded-lg px-2 py-2 text-[14px]", s.code === "marge" && "bg-gain-voile font-bold")}>
                      <span className="size-3 shrink-0 rounded-[4px]" style={{ background: s.couleur }} />
                      <span className={cn("min-w-0 flex-1", s.code === "marge" && "text-gain-texte")}>
                        <span className="block truncate">{s.libelle}</span>
                        {s.montantUsd !== undefined && <span className="chiffres block text-[12px] font-normal text-encre-3">{formatNombre(s.montantUsd)} $</span>}
                      </span>
                      <span className="chiffres shrink-0 font-semibold">{formatFCFA(s.montantXof)}</span>
                      <span className="chiffres w-11 shrink-0 text-right text-[12px] text-encre-3">{formatPourcent((s.montantXof / base) * 100, 0)}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <Link href="/parc/nouveau/" className="onde carte carte-lien group apparition flex items-center gap-3 p-4" style={decalage(3)}>
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#ff9a3d] to-[#ff6a00] text-white shadow-[0_8px_16px_-8px_#ff7a1a]"><Gavel size={22} weight="fill" aria-hidden /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold group-hover:text-primaire">Vous avez gagné l&apos;enchère ?</span>
                  <span className="block text-[13px] text-encre-3">Ajoutez le véhicule au parc : le prix de revient se calcule tout seul.</span>
                </span>
                <ArrowRight size={18} weight="bold" className="shrink-0 text-encre-3 transition-transform group-hover:translate-x-0.5 group-hover:text-primaire" aria-hidden />
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
