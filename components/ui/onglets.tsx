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
 * pas sur 390 px), l'onglet actif est souligné en latérite ou dans la couleur de l'étape.
 */
export function Onglets<T extends string>({ onglets, valeur, onChange, libelle, className }: {
  onglets: Onglet<T>[];
  valeur: T;
  onChange: (v: T) => void;
  libelle: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={libelle} className={cn("sans-barre -mx-4 flex gap-1 overflow-x-auto border-b border-trait px-4 lg:mx-0 lg:px-0", className)}>
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
              "relative flex h-11 shrink-0 items-center gap-1.5 px-3 text-[15px] font-medium whitespace-nowrap transition-colors lg:h-10 lg:text-sm",
              actif ? "text-encre" : "text-encre-3 hover:text-encre-2",
            )}
          >
            {o.libelle}
            {o.compteur !== undefined && o.compteur !== null && (
              <span className={cn("chiffres text-[13px]", actif ? "text-encre-2" : "text-encre-3")}>{o.compteur}</span>
            )}
            {actif && <span aria-hidden className="absolute inset-x-2 -bottom-px h-[3px] rounded-t-sm" style={{ background: o.couleur ?? "var(--laterite)" }} />}
          </button>
        );
      })}
    </div>
  );
}
