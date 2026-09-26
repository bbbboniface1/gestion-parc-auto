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
 * Onglets en pastilles : ils passent à la ligne sur téléphone au lieu d'être coupés au bord de l'écran.
 * L'onglet actif est une pastille bleu nuit ; un point rappelle la couleur de l'étape.
 */
export function Onglets<T extends string>({ onglets, valeur, onChange, libelle, className }: {
  onglets: Onglet<T>[];
  valeur: T;
  onChange: (v: T) => void;
  libelle: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={libelle} className={cn("flex flex-wrap gap-2", className)}>
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
              "relative flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[14px] font-semibold whitespace-nowrap transition-all lg:h-10",
              actif ? "bg-puce-active text-sur-puce-active shadow-puce" : "bg-surface text-encre-2 shadow-champ hover:text-encre",
            )}
          >
            {o.couleur && <span aria-hidden className="size-2 rounded-full" style={{ background: o.couleur }} />}
            {o.libelle}
            {o.compteur !== undefined && o.compteur !== null && (
              <span className={cn("chiffres rounded-full px-1.5 text-[12px]", actif ? "bg-sur-puce-active/15" : "bg-surface-2 text-encre-3")}>{o.compteur}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
