"use client";

import { cn } from "@/lib/cn";
import { ETAPES, type Etape } from "@/lib/domaine";

interface Colonne {
  valeur: Etape | "toutes";
  libelle: string;
  nb: number;
}

/**
 * Le parc lu comme le voyage : une colonne par étape, du chiffre (combien de véhicules) au nom de l'étape.
 * C'est aussi le filtre : toucher une colonne ne garde que les véhicules qui y sont. Sur téléphone la bande
 * défile ; sur ordinateur les neuf colonnes se partagent la largeur.
 */
export function FiltreRoute({ valeur, onChange, compte, total }: {
  valeur: Etape | "toutes";
  onChange: (v: Etape | "toutes") => void;
  compte: (e: Etape) => number;
  total: number;
}) {
  const colonnes: Colonne[] = [
    { valeur: "toutes", libelle: "Tous", nb: total },
    ...ETAPES.map((e) => ({ valeur: e.code, libelle: e.libelle, nb: compte(e.code) })),
  ];
  return (
    <div role="tablist" aria-label="Étapes du voyage" className="sans-barre -mx-4 flex overflow-x-auto border-b border-trait px-4 lg:mx-0 lg:px-0">
      {colonnes.map((c) => {
        const actif = c.valeur === valeur;
        return (
          <button
            key={c.valeur}
            role="tab"
            type="button"
            aria-selected={actif}
            onClick={() => onChange(c.valeur)}
            className={cn(
              "relative min-w-[84px] shrink-0 pt-2.5 pr-4 pb-2 text-left transition-colors lg:min-w-0 lg:flex-1",
              actif ? "text-encre" : "text-encre-3 hover:text-encre-2",
            )}
          >
            <span className={cn("figure block text-titre", c.nb === 0 && !actif && "font-normal")}>{c.nb}</span>
            <span className={cn("etiquette block text-petit", actif && "text-encre")}>{c.libelle}</span>
            {actif && <span aria-hidden className="absolute inset-x-0 -bottom-px h-[3px] bg-encre" />}
          </button>
        );
      })}
    </div>
  );
}
