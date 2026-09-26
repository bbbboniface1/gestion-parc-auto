"use client";

import { Boat, Warning } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import type { Vehicule } from "@/lib/api/types";
import { incoherence } from "@/lib/workflow";
import { STATUTS_EXPEDITION } from "@/components/expeditions/route-maritime";

type Source = Pick<Vehicule, "etape" | "archive" | "statut_commercial" | "expedition">;

/**
 * Deux petites pastilles qui relient le parc à l'expédition : dans quel conteneur voyage le véhicule
 * (couleur de l'état du conteneur) et, si son étape contredit son conteneur, « À vérifier ».
 * Ne rend rien quand le véhicule n'est dans aucun conteneur et que tout concorde.
 */
export function PastillesConteneur({ v, className }: { v: Source; className?: string }) {
  const c = v.expedition;
  const souci = incoherence({ etape: v.etape, archive: v.archive, statut_commercial: v.statut_commercial, expedition: c });
  if (!c && !souci) return null;
  const st = c ? STATUTS_EXPEDITION[c.statut] : null;
  return (
    <span className={cn("flex flex-wrap items-center gap-2", className)}>
      {c && st && (
        <span title={`${c.reference} · ${st.libelle}`} className="inline-flex h-6 items-center gap-1 rounded-full px-2 text-[12px] font-bold"
          style={{ background: `color-mix(in srgb, ${st.couleur} 13%, var(--surface))`, color: `color-mix(in srgb, ${st.couleur} 62%, var(--pole-texte))` }}>
          <Boat size={13} weight="fill" aria-hidden />{c.reference}
        </span>
      )}
      {souci && (
        <span title={souci.titre} className="inline-flex h-6 items-center gap-1 rounded-full bg-ocre-voile px-2 text-[12px] font-bold text-ocre-texte">
          <Warning size={13} weight="fill" aria-hidden />À vérifier
        </span>
      )}
    </span>
  );
}
