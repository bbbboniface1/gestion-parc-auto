"use client";

import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

const TAILLES = {
  xs: { boite: "size-7 rounded-lg", icone: 16 },
  sm: { boite: "size-9 rounded-xl", icone: 20 },
  md: { boite: "size-11 rounded-2xl", icone: 24 },
  lg: { boite: "size-14 rounded-[18px]", icone: 30 },
} as const;

/**
 * Pictogramme : icône bicolore (Phosphor « duotone ») dans une tuile teintée de sa couleur (unie, jamais en dégradé).
 * La couleur dit de quoi il s'agit (parc, ventes, argent, mer…) avant même de lire le libellé.
 */
export function Picto({ icone: Icone, couleur, taille = "md", plein, className }: {
  icone: Icon;
  couleur: string;
  taille?: keyof typeof TAILLES;
  /** Tuile pleine (couleur vive, icône blanche) au lieu de teintée. */
  plein?: boolean;
  className?: string;
}) {
  const t = TAILLES[taille];
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center transition-transform", t.boite, className)}
      style={plein
        ? { background: `color-mix(in srgb, ${couleur} 88%, var(--nuit))`, color: "white" }
        : { background: `color-mix(in srgb, ${couleur} 14%, var(--surface))`, color: `color-mix(in srgb, ${couleur} 85%, var(--pole-texte))` }}
    >
      <Icone size={t.icone} weight={plein ? "fill" : "duotone"} />
    </span>
  );
}
