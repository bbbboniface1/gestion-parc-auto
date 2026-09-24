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
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1.5 text-petit font-medium text-encre-2">
        {libelle}
        {facultatif && <span className="ml-1 font-normal text-encre-3">facultatif</span>}
      </legend>
      <div className={cn("grid gap-1.5", !colonnes && "flex flex-wrap")} style={colonnes ? { gridTemplateColumns: `repeat(${colonnes}, minmax(0, 1fr))` } : undefined}>
        {options.map((o) => {
          const actif = o.valeur === valeur;
          return (
            <label key={o.valeur}
              className={cn(
                "flex h-11 cursor-pointer items-center justify-center rounded-controle px-3 font-medium transition-colors select-none has-[:focus-visible]:shadow-[var(--focus)] lg:h-10 lg:text-corps",
                actif ? "bg-encre text-surface" : "bg-surface-2 text-encre-2 hover:bg-trait hover:text-encre",
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
