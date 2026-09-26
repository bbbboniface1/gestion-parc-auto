"use client";

import type { ReactNode } from "react";
import { MagnifyingGlass, X, type Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { useCompteur, decalage } from "@/lib/animation";
import { Picto } from "./picto";

/** Barre de recherche arrondie : loupe à gauche, bouton d'effacement nommé à droite. */
export function BarreRecherche({ valeur, onChange, placeholder, libelle, className }: {
  valeur: string; onChange: (v: string) => void; placeholder: string; libelle: string; className?: string;
}) {
  return (
    <label className={cn("relative block flex-1 lg:max-w-md", className)}>
      <span className="sr-only">{libelle}</span>
      <MagnifyingGlass size={18} weight="bold" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-encre-3" aria-hidden />
      {/* 16 px sur téléphone : en dessous, le navigateur agrandit la page à la saisie. */}
      <input value={valeur} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="h-12 w-full rounded-full border border-trait bg-surface pr-12 pl-11 text-[16px] shadow-carte transition-all placeholder:text-encre-3/70 focus:border-primaire focus:ring-4 focus:ring-primaire-voile focus:outline-none lg:h-11 lg:text-[14px]" />
      {valeur && (
        // Cible de 44 px ; la pastille visible reste de 32 px.
        <button type="button" onClick={() => onChange("")} aria-label="Effacer la recherche"
          className="absolute top-1/2 right-1 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-encre-3 hover:text-encre lg:right-0 lg:size-10">
          <span className="grid size-8 place-items-center rounded-full bg-surface-2"><X size={14} weight="bold" /></span>
        </button>
      )}
    </label>
  );
}

/**
 * Puces de filtre : le choix actif est plein, chaque puce peut porter son nombre et sa couleur.
 * Elles passent à la ligne plutôt que de défiler : sur téléphone, aucune n'est coupée au bord de l'écran.
 */
export function Puces<T extends string>({ valeur, onChange, options, libelle, className }: {
  valeur: T;
  onChange: (v: T) => void;
  options: { valeur: T; libelle: string; nombre?: number; couleur?: string }[];
  libelle: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)} role="group" aria-label={libelle}>
      {options.map((o) => {
        const actif = valeur === o.valeur;
        return (
          <button key={o.valeur} type="button" aria-pressed={actif} onClick={() => onChange(o.valeur)}
            className={cn("onde flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition-all lg:h-10",
              actif ? "bg-puce-active text-sur-puce-active shadow-puce" : "bg-surface text-encre-2 shadow-champ ring-1 ring-trait/70 hover:text-encre")}>
            {o.couleur && <span aria-hidden className="size-2 rounded-full" style={{ background: o.couleur }} />}
            {o.libelle}
            {o.nombre !== undefined && <span className={cn("chiffres rounded-full px-1.5 text-[12px]", actif ? "bg-sur-puce-active/15" : "bg-surface-2 text-encre-3")}>{o.nombre}</span>}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Indicateur de second plan (docs/CONVENTIONS_FRONT.md, « Mesures et hiérarchie ») : petit pictogramme à côté du
 * libellé, valeur animée en 24 px sur toute la largeur de la carte, précision dessous. Le premier plan (valeur 32 px,
 * évolution, mini-courbe) passe par `TuileIndicateur`.
 */
export function Indicateur({ libelle, valeur, format, precision, icone, couleur, index = 0, alerte }: {
  libelle: string;
  valeur: number;
  format: (v: number) => string;
  precision?: ReactNode;
  icone: Icon;
  couleur: string;
  index?: number;
  alerte?: boolean;
}) {
  const anime = useCompteur(valeur);
  return (
    <div className={cn("carte apparition flex min-w-0 flex-col p-4 lg:p-6", alerte && "ring-2 ring-perte/30")} style={decalage(index, 60)}>
      <div className="flex min-w-0 items-center gap-2">
        <Picto icone={icone} couleur={couleur} taille="xs" />
        <p className="truncate text-[12px] font-medium text-encre-3 lg:text-[14px]">{libelle}</p>
      </div>
      <p className="chiffres mt-2 truncate text-[24px] leading-tight font-bold tracking-tight text-encre">{format(anime)}</p>
      {precision && <p className="mt-1 truncate text-[12px] text-encre-3">{precision}</p>}
    </div>
  );
}
