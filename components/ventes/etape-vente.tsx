"use client";

import type { ReactNode } from "react";
import { Check, type Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

/**
 * Une étape du formulaire de vente : un numéro qui devient une coche verte quand l'étape est faite,
 * un titre, et le contenu. Le formulaire se lit de haut en bas comme une liste de choses à cocher.
 */
export function EtapeVente({ numero, titre, fait, couleur, icone: Ico, children, className }: {
  numero: number;
  titre: string;
  fait: boolean;
  couleur: string;
  icone: Icon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("@container carte apparition p-4 lg:p-5", className)} style={{ animationDelay: `${(numero - 1) * 60}ms` }} aria-label={titre}>
      <h2 className="mb-4 flex items-center gap-3 text-[17px] font-bold">
        <span className={cn("relative grid size-9 shrink-0 place-items-center rounded-xl text-white transition-all duration-300", fait && "scale-105")}
          style={{ background: fait ? "var(--gain)" : couleur }}>
          {fait ? <Check size={20} weight="bold" aria-hidden /> : <Ico size={20} weight="fill" aria-hidden />}
          <span className="absolute -top-1.5 -left-1.5 grid size-5 place-items-center rounded-full bg-surface text-[11px] font-extrabold text-encre shadow-sm ring-1 ring-trait">{numero}</span>
        </span>
        {titre}
        {fait && <span className="sr-only"> (fait)</span>}
      </h2>
      {children}
    </section>
  );
}
