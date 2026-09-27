"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Choix en segments : pour 2 à 6 options, plus rapide au pouce qu'une liste déroulante.
 * Groupe radio natif : clavier (flèches) et lecteurs d'écran fonctionnent sans code en plus.
 */
export function Choix<T extends string>({ libelle, options, valeur, onChange, facultatif, colonnes }: {
  libelle: ReactNode;
  options: { valeur: T; libelle: ReactNode }[];
  valeur: T | null;
  onChange: (v: T | null) => void;
  /** Un second appui sur l'option choisie la désélectionne */
  facultatif?: boolean;
  colonnes?: number;
}) {
  const nom = useId();
  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="mb-2 text-[14px] font-medium text-encre-2">
        {libelle}
        {facultatif && <span className="ml-1 font-normal text-encre-3">facultatif</span>}
      </legend>
      <div className={cn("grid gap-2", !colonnes && "flex flex-wrap")} style={colonnes ? { gridTemplateColumns: `repeat(${colonnes}, minmax(0, 1fr))` } : undefined}>
        {options.map((o) => {
          const actif = o.valeur === valeur;
          return (
            <label key={o.valeur}
              className={cn(
                "flex min-h-11 cursor-pointer items-center justify-center rounded-controle border px-2 py-2 text-center text-[14px] leading-tight font-medium transition-colors select-none has-[:focus-visible]:shadow-[var(--focus)] lg:min-h-10",
                actif ? "border-primaire bg-primaire-voile text-primaire-fonce ring-1 ring-primaire" : "border-trait-fort bg-surface text-encre-2 hover:border-primaire/50 hover:text-encre",
              )}>
              <input type="radio" name={nom} value={o.valeur} checked={actif} className="sr-only"
                onChange={() => onChange(o.valeur)}
                onClick={() => { if (facultatif && actif) onChange(null); }} />
              {o.libelle}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
