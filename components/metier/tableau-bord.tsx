"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { ETAPES, etape as defEtape, type Etape } from "@/lib/domaine";
import { formatCourt, formatMoisCourt, formatNombre, formatPourcent, pluriel } from "@/lib/format";
import { decalage, useCompteur } from "@/lib/animation";
import type { Vehicule } from "@/lib/api/types";
import { PhotoVehicule } from "./photo-vehicule";

/*
 * Tableau de bord, en deux niveaux de lecture (docs/CONVENTIONS_FRONT.md, « Hiérarchie ») :
 *  - premier plan : la carte héro (où est l'argent) et deux indicateurs (chiffre d'affaires du mois, créances) ;
 *  - second plan, plus calme : le résumé du mois, le graphique sur 12 mois, la vitrine.
 * Espacements en multiples de 4 et 8 px ; tailles de texte 12, 14, 16, 18, 24, 32, 40, 56 px.
 */

interface Tranche {
  etape: Etape;
  nb: number;
  montant: number | null;
}

/**
 * « Où est votre argent ? » : carte bleu nuit. Le capital immobilisé en grand (compteur animé), une barre découpée par
 * étape du voyage, et le détail cliquable de chaque étape. En filigrane, la route Houston → Cotonou → Bamako.
 */
export function HeroCapital({ tranches, disponibles }: { tranches: Tranche[]; disponibles: number }) {
  const voitCouts = tranches.some((t) => t.montant !== null);
  const valeur = (t: Tranche) => (voitCouts ? t.montant ?? 0 : t.nb);
  const total = tranches.reduce((s, t) => s + valeur(t), 0);
  const nbTotal = tranches.reduce((s, t) => s + t.nb, 0);
  const anime = useCompteur(voitCouts ? total : nbTotal);
  const presentes = ETAPES.map((e) => tranches.find((t) => t.etape === e.code) ?? { etape: e.code, nb: 0, montant: voitCouts ? 0 : null });

  return (
    <section aria-labelledby="titre-capital" className="apparition relative h-full min-w-0 overflow-hidden rounded-carte bg-heros p-6 text-white shadow-flottante lg:p-8">
      {/* La route, en filigrane */}
      <svg aria-hidden viewBox="0 0 600 220" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full opacity-[0.12]">
        <path d="M20 190 C 150 170, 190 60, 320 90 S 520 40, 585 30" fill="none" stroke="white" strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>

      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="titre-capital" className="etiquette text-[12px] text-white/70">{voitCouts ? "Où est votre argent ?" : "Où sont vos véhicules ?"}</h2>
          <span className="inline-flex h-7 items-center gap-2 rounded-full bg-white/10 px-3 text-[12px] font-semibold ring-1 ring-white/15">
            <span aria-hidden className="size-2 rounded-full bg-nuit-gain" /> {pluriel(disponibles, "véhicule")} prêt{disponibles > 1 ? "s" : ""} à vendre
          </span>
        </div>
        <p className="mt-4 flex flex-wrap items-baseline gap-x-3">
          <span className="chiffres text-[40px] leading-none font-extrabold tracking-tight lg:text-[56px]">
            {voitCouts ? formatCourt(anime) : Math.round(anime)}
          </span>
          {voitCouts && <span className="text-[18px] font-semibold text-white/70">FCFA</span>}
        </p>
        <p className="mt-2 text-[14px] text-white/75 lg:text-[16px]">
          {voitCouts ? `immobilisés dans ${pluriel(nbTotal, "véhicule")}, de l'enchère jusqu'au parc` : `${pluriel(nbTotal, "véhicule")} en cours`}
        </p>

        {/* La barre du voyage */}
        <div className="mt-6 flex h-3 w-full origin-left gap-0.5 overflow-hidden rounded-full bg-white/10 [animation:remplit_700ms_cubic-bezier(0.22,1,0.36,1)_both]" role="img"
          aria-label={presentes.filter((t) => valeur(t) > 0).map((t) => `${defEtape(t.etape).libelle} : ${voitCouts ? `${formatNombre(t.montant ?? 0)} FCFA` : pluriel(t.nb, "véhicule")}`).join(", ")}>
          {total > 0 && presentes.map((t) => {
            const part = valeur(t) / total;
            if (part <= 0) return null;
            return <span key={t.etape} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${part * 100}%`, background: defEtape(t.etape).couleur }} />;
          })}
        </div>
        <div aria-hidden className="mt-2 flex justify-between text-[12px] font-semibold tracking-wide text-white/60 uppercase">
          <span>Houston</span><span>Cotonou</span><span>Bamako</span>
        </div>

        <ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {presentes.map((t, i) => {
            const def = defEtape(t.etape);
            return (
              <li key={t.etape} className="apparition min-w-0" style={decalage(i, 30)}>
                <Link href={`/parc/?etape=${t.etape}`}
                  className={cn("flex h-full min-h-[72px] flex-col justify-center rounded-xl bg-white/[0.07] px-3 py-2 ring-1 ring-white/10 transition-colors hover:bg-white/[0.12]", t.nb === 0 && "opacity-50")}>
                  <span className="flex min-w-0 items-center gap-2 text-[12px] font-semibold text-white/85">
                    <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: def.couleur }} />
                    <span className="truncate">{def.libelle}</span>
                  </span>
                  <span className="chiffres mt-1 text-[18px] leading-tight font-bold">{voitCouts ? formatCourt(t.montant ?? 0) : t.nb}</span>
                  {voitCouts && <span className="text-[12px] text-white/60">{pluriel(t.nb, "véhicule")}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** Mini-courbe (sparkline) avec aire légèrement teintée. */
function Courbe({ valeurs, couleur }: { valeurs: number[]; couleur: string }) {
  if (valeurs.length < 2) return null;
  const max = Math.max(...valeurs, 1);
  const min = Math.min(...valeurs, 0);
  const pts = valeurs.map((v, i) => [(i / (valeurs.length - 1)) * 100, 30 - ((v - min) / (max - min || 1)) * 26] as const);
  const ligne = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden className="h-10 w-full">
      <path d={`${ligne} L100 32 L0 32 Z`} fill={couleur} fillOpacity={0.1} />
      <path d={ligne} fill="none" stroke={couleur} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Évolution par rapport au mois précédent : flèche et pourcentage, vert ou rouge. */
function Evolution({ valeur }: { valeur: number | null | undefined }) {
  if (valeur === undefined || valeur === null || !Number.isFinite(valeur)) return null;
  const hausse = valeur >= 0;
  return (
    <span className={cn("inline-flex h-6 items-center gap-1 rounded-full px-2 text-[12px] font-bold", hausse ? "bg-gain-voile text-gain-texte" : "bg-perte-voile text-perte-texte")}>
      {hausse ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownRight className="size-3.5" aria-hidden />}
      <span className="sr-only">{hausse ? "en hausse de" : "en baisse de"} </span>
      {formatPourcent(Math.abs(valeur), 0)}
    </span>
  );
}

/**
 * Indicateur de premier plan : pictogramme, valeur animée en grand (32 px), évolution et mini-courbe.
 * Réservé aux deux ou trois chiffres qui décident de la journée ; le reste passe par `ResumeMois`.
 */
export function TuileIndicateur({ libelle, valeur, format = formatCourt, complement, evolution, serie, couleur, icone, lien, index = 0 }: {
  libelle: string;
  valeur: number;
  format?: (v: number) => string;
  complement?: ReactNode;
  evolution?: number | null;
  serie?: number[];
  couleur: string;
  icone: ReactNode;
  lien?: string;
  index?: number;
}) {
  const anime = useCompteur(valeur);
  const contenu = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span aria-hidden className="grid size-10 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${couleur} 14%, var(--surface))`, color: `color-mix(in srgb, ${couleur} 85%, var(--pole-texte))` }}>{icone}</span>
        <Evolution valeur={evolution} />
      </div>
      <p className="mt-4 line-clamp-2 min-h-10 text-[14px] leading-5 font-medium text-encre-3 sm:min-h-0">{libelle}</p>
      <p className="chiffres mt-1 text-[32px] leading-none font-extrabold tracking-tight text-encre">{format(anime)}</p>
      {complement && <p className="mt-2 text-[12px] text-encre-3">{complement}</p>}
      {serie && <div className="mt-auto pt-4"><Courbe valeurs={serie} couleur={couleur} /></div>}
    </>
  );
  const classe = "carte apparition flex h-full min-w-0 flex-col p-4 lg:p-6";
  return lien ? (
    <Link href={lien} className={cn(classe, "carte-lien")} style={decalage(index, 60)}>{contenu}</Link>
  ) : (
    <div className={classe} style={decalage(index, 60)}>{contenu}</div>
  );
}

/**
 * Second plan : les autres chiffres du mois, sans pictogramme ni courbe, en 24 px. Ils se lisent quand on les cherche,
 * sans concurrencer le premier plan.
 */
export function ResumeMois({ mesures, index = 0 }: {
  mesures: { libelle: string; valeur: string; detail?: ReactNode; evolution?: number | null; lien?: string }[];
  index?: number;
}) {
  return (
    <section aria-labelledby="titre-mois" className="carte apparition p-4 lg:p-6" style={decalage(index, 60)}>
      <h2 id="titre-mois" className="etiquette text-[12px] text-encre-3">Ce mois-ci</h2>
      <div className="mt-3 grid grid-cols-2 gap-4">
        {mesures.map((m) => {
          const corps = (
            <>
              <span className="block text-[14px] text-encre-3">{m.libelle}</span>
              <span className="chiffres mt-1 block text-[24px] leading-tight font-bold text-encre">{m.valeur}</span>
              {(m.detail || (m.evolution !== undefined && m.evolution !== null)) && (
                <span className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-encre-3">
                  <Evolution valeur={m.evolution} />
                  {m.detail}
                </span>
              )}
            </>
          );
          return m.lien ? (
            <Link key={m.libelle} href={m.lien} className="-m-2 block min-w-0 rounded-controle p-2 transition-colors hover:bg-surface-2">{corps}</Link>
          ) : (
            <div key={m.libelle} className="min-w-0">{corps}</div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Ventes sur 12 mois : pour chaque mois, une barre bleue (chiffre d'affaires) et une barre orange (marge),
 * qui poussent à l'ouverture. Au survol ou au toucher, le mois s'affiche en détail.
 */
export function GraphiqueVentes({ points }: { points: { mois: string; ca: number; marge: number | null; nb: number }[] }) {
  const [actif, setActif] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.ca));
  const echelle = Math.ceil(max / 5_000_000) * 5_000_000 || max;
  const voitMarge = points.some((p) => p.marge !== null);
  const totalCa = points.reduce((s, p) => s + p.ca, 0);
  const totalMarge = points.reduce((s, p) => s + (p.marge ?? 0), 0);
  const i = actif ?? points.length - 1;
  const p = points[i];

  return (
    <section aria-labelledby="titre-ventes" className="carte apparition p-4 lg:p-6" style={decalage(3, 60)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="titre-ventes" className="text-[18px] font-bold">Ventes sur 12 mois</h2>
          <p className="text-[14px] text-encre-3">Chiffre d&apos;affaires{voitMarge ? " et marge" : ""}, en FCFA</p>
        </div>
        <div className="flex gap-6">
          <div>
            <p className="flex items-center gap-2 text-[12px] font-medium text-encre-3"><span aria-hidden className="size-3 rounded-sm bg-primaire" /> Chiffre d&apos;affaires</p>
            <p className="chiffres text-[16px] font-bold">{formatCourt(totalCa)}</p>
          </div>
          {voitMarge && (
            <div>
              <p className="flex items-center gap-2 text-[12px] font-medium text-encre-3"><span aria-hidden className="size-3 rounded-sm bg-accent" /> Marge</p>
              <p className="chiffres text-[16px] font-bold">{formatCourt(totalMarge)} <span className="text-[12px] font-bold text-gain-texte">{totalCa ? formatPourcent((totalMarge / totalCa) * 100, 0) : ""}</span></p>
            </div>
          )}
        </div>
      </div>

      <div className="relative mt-6 h-48 lg:h-52">
        {/* Graduations */}
        {[1, 0.5, 0].map((g) => (
          <div key={g} aria-hidden className="absolute inset-x-0 flex items-center gap-2" style={{ top: `${(1 - g) * 100}%` }}>
            <span className="chiffres w-12 -translate-y-1/2 text-right text-[12px] whitespace-nowrap text-encre-3">{g ? formatCourt(echelle * g).replace(/\s/g, " ") : "0"}</span>
            <span className="h-px flex-1 -translate-y-1/2 border-t border-dashed border-trait" />
          </div>
        ))}
        <div className="absolute inset-y-0 right-0 left-14 flex items-end sm:gap-2" onMouseLeave={() => setActif(null)}>
          {points.map((x, k) => (
            <button key={x.mois} type="button" onMouseEnter={() => setActif(k)} onFocus={() => setActif(k)} onClick={() => setActif(k)}
              aria-label={`${formatMoisCourt(x.mois)} : ${formatNombre(x.ca)} FCFA${x.marge !== null ? `, marge ${formatNombre(x.marge)} FCFA` : ""}, ${pluriel(x.nb, "vente")}`}
              className={cn("group relative flex h-full min-w-0 flex-1 items-end justify-center gap-0.5 rounded-lg px-0.5 transition-colors", k === i && "bg-primaire-voile/60")}>
              <span className="w-full max-w-4 origin-bottom rounded-t-md bg-primaire transition-opacity [animation:pousse_600ms_cubic-bezier(0.22,1,0.36,1)_both] group-hover:opacity-90"
                style={{ height: `${Math.max((x.ca / echelle) * 100, x.ca > 0 ? 1.5 : 0)}%`, animationDelay: `${k * 30}ms` }} />
              {voitMarge && (
                <span className="w-full max-w-4 origin-bottom rounded-t-md bg-accent [animation:pousse_600ms_cubic-bezier(0.22,1,0.36,1)_both]"
                  style={{ height: `${Math.max(((x.marge ?? 0) / echelle) * 100, (x.marge ?? 0) > 0 ? 1.5 : 0)}%`, animationDelay: `${k * 30 + 80}ms` }} />
              )}
            </button>
          ))}
        </div>
      </div>
      <div aria-hidden className="mt-2 ml-14 flex sm:gap-2">
        {points.map((x, k) => (
          <span key={x.mois} className={cn("min-w-0 flex-1 text-center text-[12px] capitalize", k === i ? "font-bold text-primaire" : "text-encre-3")}>
            <span className="sm:hidden">{formatMoisCourt(x.mois).charAt(0)}</span>
            <span className="hidden sm:inline">{formatMoisCourt(x.mois).replace(".", "")}</span>
          </span>
        ))}
      </div>
      {p && (
        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-surface-2 px-3 py-2 text-[14px]" aria-live="polite">
          <span className="font-bold capitalize">{formatMoisCourt(p.mois).replace(".", "")}</span>
          <span><span className="text-encre-3">CA </span><span className="chiffres font-semibold">{formatNombre(p.ca)}</span></span>
          {p.marge !== null && <span><span className="text-encre-3">Marge </span><span className="chiffres font-semibold text-gain-texte">{formatNombre(p.marge)}</span></span>}
          <span className="text-encre-3">{pluriel(p.nb, "vente")}</span>
        </p>
      )}
    </section>
  );
}

/** Vitrine : les véhicules au parc et disponibles, en grandes photos qui défilent. */
export function VitrineParc({ vehicules }: { vehicules: Vehicule[] }) {
  if (vehicules.length === 0) return null;
  return (
    <section aria-labelledby="titre-vitrine" className="apparition" style={decalage(4, 60)}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 id="titre-vitrine" className="text-[18px] font-bold">Prêts à vendre</h2>
          <p className="text-[14px] text-encre-3">{pluriel(vehicules.length, "véhicule")} au parc, disponibles aujourd&apos;hui</p>
        </div>
        <Link href="/parc/?vue=en_vente" className="-mr-2 inline-flex min-h-11 shrink-0 items-center gap-1 rounded-controle px-2 text-[14px] font-semibold whitespace-nowrap text-primaire hover:bg-primaire-voile">
          Tout voir <CaretRight className="size-4" aria-hidden />
        </Link>
      </div>
      <div data-defilement="horizontal" className="sans-barre -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 lg:mx-0 lg:px-0">
        {vehicules.map((v) => (
          <Link key={v.id} href={`/parc/vehicule/?id=${v.id}`} className="carte carte-lien group w-64 shrink-0 snap-start overflow-hidden">
            <div className="relative aspect-[4/3] overflow-hidden">
              <PhotoVehicule path={v.photo_principale_path} alt="" arrondi={false} className="size-full transition-transform duration-500 group-hover:scale-[1.03]" />
              <span aria-hidden className="voile-photo absolute inset-x-0 bottom-0 h-1/2" />
              {v.prix_affiche_xof !== null && (
                <span className="chiffres absolute bottom-3 left-3 text-[18px] font-extrabold text-white">{formatCourt(v.prix_affiche_xof)} <span className="text-[12px] font-semibold text-white/80">FCFA</span></span>
              )}
              <span className="absolute top-3 right-3 inline-flex h-6 items-center rounded-full bg-white/90 px-2 text-[12px] font-bold text-nuit">{v.jours_etape} j au parc</span>
            </div>
            <div className="p-3">
              <p className="truncate font-bold">{v.libelle}</p>
              <p className="truncate text-[12px] text-encre-3">{v.couleur ? `${v.couleur} · ` : ""}{v.kilometrage_km ? `${formatNombre(v.kilometrage_km)} km` : v.reference}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
