"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CaretLeft, CaretRight, type Icon } from "@phosphor-icons/react";
import { Picto } from "./picto";

/**
 * Fil d'Ariane : un bouton de retour qui dit où il ramène (section, pictogramme, nombre d'éléments),
 * puis le chemin jusqu'à la page courante. Remplace la flèche « ← » seule.
 */
export function FilAriane({ retour, etapes }: {
  retour: { href: string; libelle: string; icone: Icon; couleur: string; detail?: string };
  etapes?: ReactNode[];
}) {
  return (
    <nav aria-label="Fil d'Ariane" className="apparition mb-4 flex min-w-0 items-center gap-2">
      <Link href={retour.href} aria-label={`Retour : ${retour.libelle}`}
        className="group onde inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-surface py-1 pr-4 pl-1.5 shadow-carte ring-1 ring-trait/70 transition-all hover:-translate-x-0.5 hover:ring-trait-fort">
        <CaretLeft size={16} weight="bold" className="ml-1 text-encre-3 transition-transform group-hover:-translate-x-0.5" aria-hidden />
        <Picto icone={retour.icone} couleur={retour.couleur} taille="xs" />
        <span className="flex flex-col leading-tight">
          <span className="text-[13px] font-bold text-encre">{retour.libelle}</span>
          {retour.detail && <span className="text-[11px] text-encre-3">{retour.detail}</span>}
        </span>
      </Link>
      {etapes?.map((e, i) => (
        <span key={i} className="hidden min-w-0 items-center gap-2 text-[13px] sm:flex">
          <CaretRight size={12} weight="bold" className="shrink-0 text-trait-fort" aria-hidden />
          <span className={i === etapes.length - 1 ? "truncate font-semibold text-encre" : "truncate text-encre-3"}>{e}</span>
        </span>
      ))}
    </nav>
  );
}
