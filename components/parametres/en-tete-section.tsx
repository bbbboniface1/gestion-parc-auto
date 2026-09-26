"use client";

import type { ReactNode } from "react";
import { SECTIONS } from "./commun";
import { Picto } from "@/components/ui/picto";

/**
 * En-tête d'une section de Paramètres : une carte avec le pictogramme de la section (le même que dans le menu
 * et sur la vue d'ensemble, en teinte neutre). On sait où l'on est avant d'avoir lu le titre.
 */
export function EnTeteSection({ cle, titre, sousTitre, actions }: { cle: string; titre?: ReactNode; sousTitre?: ReactNode; actions?: ReactNode }) {
  const s = SECTIONS.find((x) => x.cle === cle);
  return (
    <header className="carte apparition mb-6 p-4 lg:mb-8 lg:p-6">
      <div className="flex flex-wrap items-center gap-4">
        {s && <Picto icone={s.icone} couleur={s.couleur} taille="md" />}
        <div className="min-w-0 flex-1 basis-56">
          <h1 className="text-[24px] leading-tight font-extrabold tracking-tight text-encre lg:text-[32px]">{titre ?? s?.libelle}</h1>
          {(sousTitre ?? s?.description) && <p className="mt-1 text-[14px] leading-snug text-encre-2">{sousTitre ?? s?.description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}
