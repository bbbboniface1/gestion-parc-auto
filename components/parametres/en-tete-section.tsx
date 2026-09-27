"use client";

import type { ReactNode } from "react";
import { SECTIONS } from "./commun";
import { Picto } from "@/components/ui/picto";

/**
 * En-tête d'une section de Paramètres : un bandeau teinté de la couleur de la section (la même que dans le menu
 * et sur la vue d'ensemble), avec son pictogramme. On sait où l'on est avant d'avoir lu le titre.
 */
export function EnTeteSection({ cle, titre, sousTitre, actions }: { cle: string; titre?: ReactNode; sousTitre?: ReactNode; actions?: ReactNode }) {
  const s = SECTIONS.find((x) => x.cle === cle);
  const couleur = s?.couleur ?? "var(--primaire)";
  return (
    <header className="apparition relative mb-5 overflow-hidden rounded-[22px] p-4 shadow-carte ring-1 ring-trait/60 lg:mb-6 lg:p-6"
      style={{ background: `linear-gradient(115deg, color-mix(in srgb, ${couleur} 15%, var(--surface)) 0%, var(--surface) 72%)` }}>
      <span aria-hidden className="pointer-events-none absolute -top-12 -right-10 size-44 rounded-full opacity-25 blur-3xl" style={{ background: couleur }} />
      <div className="relative flex flex-wrap items-center gap-4">
        {s && <Picto icone={s.icone} couleur={couleur} taille="lg" plein />}
        <div className="min-w-0 flex-1 basis-56">
          <h1 className="text-[24px] leading-tight font-extrabold tracking-tight text-encre lg:text-[28px]">{titre ?? s?.libelle}</h1>
          {(sousTitre ?? s?.description) && <p className="mt-1 text-[14px] leading-snug text-encre-2">{sousTitre ?? s?.description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}
