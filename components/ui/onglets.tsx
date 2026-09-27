"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface Onglet<T extends string> {
  valeur: T;
  libelle: ReactNode;
  compteur?: number | null;
  couleur?: string;
}

/**
 * Onglets défilants : sur téléphone, ils débordent horizontalement (les étapes du parc ne tiennent
 * pas sur 390 px). L'onglet actif est une pastille bleu nuit ; un point rappelle la couleur de l'étape.
 */
export function Onglets<T extends string>({ onglets, valeur, onChange, libelle, className }: {
  onglets: Onglet<T>[];
  valeur: T;
  onChange: (v: T) => void;
  libelle: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={libelle} className={cn("sans-barre -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0", className)}>
      {onglets.map((o) => {
        const actif = o.valeur === valeur;
        return (
          <button
            key={o.valeur}
            role="tab"
            type="button"
            aria-selected={actif}
            onClick={() => onChange(o.valeur)}
            className={cn(
              "relative flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold whitespace-nowrap transition-all",
              actif ? "bg-nuit text-sur-nuit shadow-[0_4px_12px_-4px_rgb(11_22_51/0.5)]" : "bg-surface text-encre-2 shadow-[0_1px_2px_rgb(15_23_42/0.06)] hover:text-encre",
            )}
          >
            {o.couleur && <span aria-hidden className="size-2 rounded-full" style={{ background: o.couleur }} />}
            {o.libelle}
            {o.compteur !== undefined && o.compteur !== null && (
              <span className={cn("chiffres rounded-full px-1.5 text-[12px]", actif ? "bg-white/15 text-sur-nuit" : "bg-surface-2 text-encre-3")}>{o.compteur}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
