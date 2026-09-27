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
      <input value={valeur} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="h-12 w-full rounded-full border border-trait bg-surface pr-11 pl-11 text-[15px] shadow-carte transition-all placeholder:text-encre-3/70 focus:border-primaire focus:shadow-[0_0_0_4px_var(--primaire-voile)] focus:outline-none lg:h-11 lg:text-sm" />
      {valeur && (
        <button type="button" onClick={() => onChange("")} aria-label="Effacer la recherche"
          className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-surface-2 text-encre-3 hover:text-encre">
          <X size={14} weight="bold" />
        </button>
      )}
    </label>
  );
}

/** Puces de filtre : le choix actif est plein, chaque puce peut porter son nombre et sa couleur. */
export function Puces<T extends string>({ valeur, onChange, options, libelle, className }: {
  valeur: T;
  onChange: (v: T) => void;
  options: { valeur: T; libelle: string; nombre?: number; couleur?: string }[];
  libelle: string;
  className?: string;
}) {
  return (
    <div className={cn("sans-barre -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0", className)} role="group" aria-label={libelle}>
      {options.map((o) => {
        const actif = valeur === o.valeur;
        return (
          <button key={o.valeur} type="button" aria-pressed={actif} onClick={() => onChange(o.valeur)}
            className={cn("onde flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition-all",
              actif ? "bg-nuit text-white shadow-[0_6px_16px_-6px_rgb(11_22_51/0.6)]" : "bg-surface text-encre-2 shadow-[0_1px_2px_rgb(15_23_42/0.06)] ring-1 ring-trait/70 hover:text-encre")}>
            {o.couleur && <span aria-hidden className="size-2 rounded-full" style={{ background: o.couleur }} />}
            {o.libelle}
            {o.nombre !== undefined && <span className={cn("chiffres rounded-full px-1.5 text-[12px]", actif ? "bg-white/15" : "bg-surface-2 text-encre-3")}>{o.nombre}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Indicateur compact : pictogramme, libellé, valeur qui s'anime, précision dessous. */
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
    <div className={cn("carte apparition flex items-center gap-3 p-3.5", alerte && "ring-2 ring-perte/30")} style={decalage(index)}>
      <Picto icone={icone} couleur={couleur} taille="md" />
      <div className="min-w-0">
        <p className="truncate text-[12px] font-semibold text-encre-3">{libelle}</p>
        <p className="chiffres truncate text-[20px] leading-tight font-extrabold tracking-tight">{format(anime)}</p>
        {precision && <p className="truncate text-[12px] text-encre-3">{precision}</p>}
      </div>
    </div>
  );
}
