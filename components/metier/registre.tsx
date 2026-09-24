import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Registre : libellé à gauche, valeur à droite, reliés par une ligne pointillée —
 * la lecture d'un livre de caisse, sans la lourdeur d'une grille de cartes.
 */
export function Registre({ lignes, className }: {
  lignes: { libelle: ReactNode; valeur: ReactNode; complement?: ReactNode; fort?: boolean }[];
  className?: string;
}) {
  return (
    <dl className={cn("flex flex-col", className)}>
      {lignes.map((l, i) => (
        <div key={i} className="flex items-baseline gap-2 py-2">
          <dt className={cn("shrink-0 text-encre-2", l.fort && "font-medium text-encre")}>{l.libelle}</dt>
          <span aria-hidden className="mb-1 flex-1 border-b border-dotted border-trait-fort" />
          <dd className="shrink-0 text-right">
            <span className={cn("chiffres", l.fort ? "font-semibold" : "font-medium")}>{l.valeur}</span>
            {l.complement && <span className="ml-1.5 text-[13px] text-encre-3">{l.complement}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
