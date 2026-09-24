"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";

/** Champ de recherche : une ligne soulignée, l'icône à gauche, le bouton d'effacement à droite. */
export function ChampRecherche({ valeur, onChange, placeholder, libelle, className }: {
  valeur: string;
  onChange: (v: string) => void;
  placeholder: string;
  libelle: string;
  className?: string;
}) {
  return (
    <label className={cn("relative block lg:w-96", className)}>
      <span className="sr-only">{libelle}</span>
      <Search className="pointer-events-none absolute top-1/2 left-0 size-4 -translate-y-1/2 text-encre-3" aria-hidden />
      <input value={valeur} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="h-11 w-full border-0 border-b-2 border-trait-fort bg-transparent pr-9 pl-7 placeholder:text-encre-3 focus:border-encre focus:outline-none lg:h-10" />
      {valeur && (
        <button type="button" onClick={() => onChange("")} aria-label="Effacer la recherche" className="absolute top-1/2 right-0 inline-flex size-10 -translate-y-1/2 items-center justify-center text-encre-3">
          <X className="size-4" />
        </button>
      )}
    </label>
  );
}

/** Filtres en texte : le choix actif est en gras, souligné d'encre. Pas de pastilles, pas de cadres. */
export function FiltresTexte<T extends string>({ valeur, onChange, options, libelle, className }: {
  valeur: T;
  onChange: (v: T) => void;
  options: readonly (readonly [T, string])[];
  libelle: string;
  className?: string;
}) {
  return (
    <div className={cn("sans-barre flex gap-5 overflow-x-auto", className)} role="group" aria-label={libelle}>
      {options.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={valeur === v} onClick={() => onChange(v)}
          className={cn("h-10 shrink-0 border-b-2", valeur === v ? "border-encre font-semibold text-encre" : "border-transparent text-encre-3 hover:text-encre")}>
          {l}
        </button>
      ))}
    </div>
  );
}
