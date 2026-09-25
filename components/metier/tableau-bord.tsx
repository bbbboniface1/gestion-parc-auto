"use client";

import { useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { ETAPES, etape as defEtape, type Etape } from "@/lib/domaine";
import { formatCourt, formatMoisCourt, formatNombre, formatPourcent, pluriel } from "@/lib/format";
import { decalage, useCompteur } from "@/lib/animation";
import type { Vehicule } from "@/lib/api/types";
import { PhotoVehicule } from "./photo-vehicule";

interface Tranche {
  etape: Etape;
  nb: number;
  montant: number | null;
}

/**
 * « Où est votre argent ? » : carte en dégradé bleu nuit. Le capital immobilisé en grand (compteur animé),
 * une barre découpée par étape du voyage, et le détail cliquable de chaque étape. En fond, la route
 * Houston → Cotonou → Bamako.
 */
export function HeroCapital({ tranches, disponibles }: { tranches: Tranche[]; disponibles: number }) {
  const voitCouts = tranches.some((t) => t.montant !== null);
  const valeur = (t: Tranche) => (voitCouts ? t.montant ?? 0 : t.nb);
  const total = tranches.reduce((s, t) => s + valeur(t), 0);
  const nbTotal = tranches.reduce((s, t) => s + t.nb, 0);
  const anime = useCompteur(voitCouts ? total : nbTotal);
  const presentes = ETAPES.map((e) => tranches.find((t) => t.etape === e.code) ?? { etape: e.code, nb: 0, montant: voitCouts ? 0 : null });

  return (
    <section aria-labelledby="titre-capital"
      className="apparition relative min-w-0 overflow-hidden rounded-[22px] bg-[radial-gradient(120%_120%_at_100%_0%,#2d5bff_0%,#16275a_45%,#0b1633_100%)] p-5 text-white shadow-[0_24px_48px_-20px_rgb(11_22_51/0.7)] lg:p-7">
      {/* La route, en filigrane */}
      <svg aria-hidden viewBox="0 0 600 220" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full opacity-[0.18]">
        <path d="M20 190 C 150 170, 190 60, 320 90 S 520 40, 585 30" fill="none" stroke="white" strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-[#ff7a1a]/25 blur-3xl" />

      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="titre-capital" className="etiquette text-[11px] text-white/70">{voitCouts ? "Où est votre argent ?" : "Où sont vos véhicules ?"}</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold ring-1 ring-white/15">
            <span className="size-1.5 animate-pulse rounded-full bg-[#4ade80]" /> {pluriel(disponibles, "véhicule")} prêt{disponibles > 1 ? "s" : ""} à vendre
          </span>
        </div>
        <p className="mt-3 flex flex-wrap items-baseline gap-x-3">
          <span className="chiffres text-[44px] leading-none font-extrabold tracking-tight lg:text-[56px]">
            {voitCouts ? formatCourt(anime) : Math.round(anime)}
          </span>
          {voitCouts && <span className="text-[18px] font-semibold text-white/70">FCFA</span>}
        </p>
        <p className="mt-1.5 text-[15px] text-white/75">
          {voitCouts ? `immobilisés dans ${pluriel(nbTotal, "véhicule")}, de l'enchère jusqu'au parc` : `${pluriel(nbTotal, "véhicule")} en cours`}
        </p>

        {/* La barre du voyage */}
        <div className="mt-6 flex h-3 w-full origin-left gap-[3px] overflow-hidden rounded-full bg-white/10 [animation:remplit_900ms_cubic-bezier(0.22,1,0.36,1)_both]" role="img"
          aria-label={presentes.filter((t) => valeur(t) > 0).map((t) => `${defEtape(t.etape).libelle} : ${voitCouts ? `${formatNombre(t.montant ?? 0)} FCFA` : pluriel(t.nb, "véhicule")}`).join(", ")}>
          {total > 0 && presentes.map((t) => {
            const part = valeur(t) / total;
            if (part <= 0) return null;
            return <span key={t.etape} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${part * 100}%`, background: defEtape(t.etape).couleur }} />;
          })}
        </div>
        <div aria-hidden className="mt-2 flex justify-between text-[11px] font-semibold tracking-wide text-white/60 uppercase">
          <span>Houston</span><span>Cotonou</span><span>Bamako</span>
        </div>

        <ul className="sans-barre -mx-5 mt-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-2 xl:grid-cols-4">
          {presentes.map((t, i) => {
            const def = defEtape(t.etape);
            return (
              <li key={t.etape} className="apparition w-32 shrink-0 sm:w-auto" style={decalage(i, 40)}>
                <Link href={`/parc/?etape=${t.etape}`}
                  className={cn("flex h-full flex-col rounded-xl bg-white/[0.07] px-3 py-2.5 ring-1 ring-white/10 transition-all hover:-translate-y-0.5 hover:bg-white/[0.13]", t.nb === 0 && "opacity-50")}>
                  <span className="flex min-w-0 items-center gap-1.5 text-[12px] font-semibold text-white/85">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: def.couleur, boxShadow: `0 0 10px ${def.couleur}` }} />
                    <span className="truncate">{def.libelle}</span>
                  </span>
                  <span className="chiffres mt-1 text-[17px] leading-tight font-bold">{voitCouts ? formatCourt(t.montant ?? 0) : t.nb}</span>
                  {voitCouts && <span className="text-[11px] text-white/60">{pluriel(t.nb, "véhicule")}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** Mini-courbe (sparkline) avec aire en dégradé. */
function Courbe({ valeurs, couleur }: { valeurs: number[]; couleur: string }) {
  const id = useId();
  if (valeurs.length < 2) return null;
  const max = Math.max(...valeurs, 1);
  const min = Math.min(...valeurs, 0);
  const pts = valeurs.map((v, i) => [(i / (valeurs.length - 1)) * 100, 30 - ((v - min) / (max - min || 1)) * 26] as const);
  const ligne = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden className="h-9 w-full">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={couleur} stopOpacity="0.28" />
          <stop offset="1" stopColor={couleur} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${ligne} L100 32 L0 32 Z`} fill={`url(#${id})`} />
      <path d={ligne} fill="none" stroke={couleur} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Tuile d'indicateur : icône dans une bulle colorée, valeur animée, évolution, mini-courbe. */
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
        <span className="grid size-10 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${couleur} 14%, var(--surface))`, color: couleur }}>{icone}</span>
        {evolution !== undefined && evolution !== null && Number.isFinite(evolution) && (
          <span className={cn("inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[12px] font-bold", evolution >= 0 ? "bg-gain-voile text-gain-texte" : "bg-perte-voile text-perte-texte")}>
            {evolution >= 0 ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownRight className="size-3.5" aria-hidden />}
            {formatPourcent(Math.abs(evolution), 0)}
          </span>
        )}
      </div>
      <p className="mt-3 text-[13px] font-medium text-encre-3">{libelle}</p>
      <p className="chiffres text-[24px] leading-tight font-extrabold tracking-tight text-encre">{format(anime)}</p>
      {complement && <p className="text-[12px] text-encre-3">{complement}</p>}
      {serie && <div className="mt-2 -mb-1"><Courbe valeurs={serie} couleur={couleur} /></div>}
    </>
  );
  const classe = "carte apparition flex flex-col p-4";
  return lien ? (
    <Link href={lien} className={cn(classe, "carte-lien")} style={decalage(index)}>{contenu}</Link>
  ) : (
    <div className={classe} style={decalage(index)}>{contenu}</div>
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
    <section aria-labelledby="titre-ventes" className="carte apparition p-5 lg:p-6" style={decalage(2)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="titre-ventes" className="text-[17px] font-bold">Ventes sur 12 mois</h2>
          <p className="text-[13px] text-encre-3">Chiffre d&apos;affaires{voitMarge ? " et marge" : ""}, en FCFA</p>
        </div>
        <div className="flex gap-5">
          <div>
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-encre-3"><span className="size-2.5 rounded-sm bg-primaire" /> Chiffre d&apos;affaires</p>
            <p className="chiffres text-[18px] font-extrabold">{formatCourt(totalCa)}</p>
          </div>
          {voitMarge && (
            <div>
              <p className="flex items-center gap-1.5 text-[12px] font-medium text-encre-3"><span className="size-2.5 rounded-sm bg-accent" /> Marge</p>
              <p className="chiffres text-[18px] font-extrabold">{formatCourt(totalMarge)} <span className="text-[13px] font-bold text-gain-texte">{totalCa ? formatPourcent((totalMarge / totalCa) * 100, 0) : ""}</span></p>
            </div>
          )}
        </div>
      </div>

      <div className="relative mt-6 h-52">
        {/* Graduations */}
        {[1, 0.5, 0].map((g) => (
          <div key={g} aria-hidden className="absolute inset-x-0 flex items-center gap-2" style={{ top: `${(1 - g) * 100}%` }}>
            <span className="chiffres w-9 -translate-y-1/2 text-right text-[11px] text-encre-3">{g ? formatCourt(echelle * g).replace(/\s/g, " ") : "0"}</span>
            <span className="h-px flex-1 -translate-y-1/2 border-t border-dashed border-trait" />
          </div>
        ))}
        <div className="absolute inset-y-0 right-0 left-11 flex items-end gap-1 sm:gap-2" onMouseLeave={() => setActif(null)}>
          {points.map((x, k) => (
            <button key={x.mois} type="button" onMouseEnter={() => setActif(k)} onFocus={() => setActif(k)} onClick={() => setActif(k)}
              aria-label={`${formatMoisCourt(x.mois)} : ${formatNombre(x.ca)} FCFA${x.marge !== null ? `, marge ${formatNombre(x.marge)} FCFA` : ""}, ${pluriel(x.nb, "vente")}`}
              className={cn("group relative flex h-full flex-1 items-end justify-center gap-[2px] rounded-lg transition-colors", k === i && "bg-primaire-voile/60")}>
              <span className="w-full max-w-[18px] origin-bottom rounded-t-md bg-gradient-to-t from-primaire to-[#5b84ff] transition-opacity [animation:pousse_700ms_cubic-bezier(0.22,1,0.36,1)_both] group-hover:opacity-90"
                style={{ height: `${Math.max((x.ca / echelle) * 100, x.ca > 0 ? 1.5 : 0)}%`, animationDelay: `${k * 40}ms` }} />
              {voitMarge && (
                <span className="w-full max-w-[18px] origin-bottom rounded-t-md bg-gradient-to-t from-[#f2541b] to-[#ffa65c] [animation:pousse_700ms_cubic-bezier(0.22,1,0.36,1)_both]"
                  style={{ height: `${Math.max(((x.marge ?? 0) / echelle) * 100, (x.marge ?? 0) > 0 ? 1.5 : 0)}%`, animationDelay: `${k * 40 + 120}ms` }} />
              )}
            </button>
          ))}
        </div>
      </div>
      <div aria-hidden className="mt-2 ml-11 flex gap-1 sm:gap-2">
        {points.map((x, k) => (
          <span key={x.mois} className={cn("flex-1 text-center text-[11px] capitalize", k === i ? "font-bold text-primaire" : "text-encre-3")}>
            {formatMoisCourt(x.mois).replace(".", "")}
          </span>
        ))}
      </div>
      {p && (
        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-surface-2 px-3 py-2 text-[13px]" aria-live="polite">
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
    <section aria-labelledby="titre-vitrine" className="apparition" style={decalage(4)}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 id="titre-vitrine" className="text-[17px] font-bold">Prêts à vendre</h2>
          <p className="text-[13px] text-encre-3">{pluriel(vehicules.length, "véhicule")} au parc, disponibles aujourd&apos;hui</p>
        </div>
        <Link href="/parc/?vue=en_vente" className="inline-flex items-center gap-1 text-[13px] font-semibold text-primaire hover:underline">
          Tout voir <CaretRight className="size-4" aria-hidden />
        </Link>
      </div>
      <div className="sans-barre -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 lg:mx-0 lg:px-0">
        {vehicules.map((v) => (
          <Link key={v.id} href={`/parc/vehicule/?id=${v.id}`} className="carte carte-lien group w-64 shrink-0 snap-start overflow-hidden">
            <div className="relative aspect-[4/3] overflow-hidden">
              <PhotoVehicule path={v.photo_principale_path} alt="" arrondi={false} className="size-full transition-transform duration-500 group-hover:scale-105" />
              <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
              {v.prix_affiche_xof !== null && (
                <span className="chiffres absolute bottom-2.5 left-3 text-[18px] font-extrabold text-white drop-shadow">{formatCourt(v.prix_affiche_xof)} <span className="text-[12px] font-semibold text-white/80">FCFA</span></span>
              )}
              <span className="absolute top-2.5 right-2.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-[#0b1633] shadow backdrop-blur">{v.jours_etape} j au parc</span>
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
