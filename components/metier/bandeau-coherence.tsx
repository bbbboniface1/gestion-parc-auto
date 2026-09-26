"use client";

import { Warning } from "@phosphor-icons/react";
import type { Incoherence } from "@/lib/workflow";
import { Bouton } from "@/components/ui/bouton";

/**
 * Bandeau « à vérifier » : dit en une phrase ce qui ne concorde pas entre l'étape du véhicule et son conteneur,
 * et propose la correction en un bouton nommé. S'affiche sur la fiche véhicule et dans l'expédition.
 */
export function BandeauCoherence({ souci, onCorriger, chargement, compact }: {
  souci: Incoherence;
  onCorriger?: () => void;
  chargement?: boolean;
  compact?: boolean;
}) {
  return (
    <div role="alert" className="apparition flex flex-wrap items-center gap-3 rounded-carte bg-ocre-voile p-3 ring-1 ring-ocre/30">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ocre text-nuit"><Warning size={24} weight="fill" aria-hidden /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] leading-snug font-bold text-ocre-texte">{souci.titre}</p>
        {!compact && <p className="mt-1 text-[14px] leading-snug text-encre-2">{souci.detail}</p>}
      </div>
      {onCorriger && (
        <Bouton taille="sm" variante="primaire" chargement={chargement} onClick={onCorriger}>{souci.libelleCorrection}</Bouton>
      )}
    </div>
  );
}
