"use client";

import { Bank, Coins, DeviceMobile, Money, Receipt, type Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { useCompteur } from "@/lib/animation";

/** Couleur et pictogramme de chaque moyen de paiement, reconnaissables d'un coup d'œil. */
export const MODES_VISUELS: Record<string, { couleur: string; icone: Icon }> = {
  especes: { couleur: "#16a34a", icone: Money },
  orange_money: { couleur: "#ff7900", icone: DeviceMobile },
  moov_money: { couleur: "#0a5cbf", icone: DeviceMobile },
  wave: { couleur: "#1dc3f0", icone: DeviceMobile },
  virement: { couleur: "#6366f1", icone: Bank },
  cheque: { couleur: "#64748b", icone: Receipt },
  autre: { couleur: "#94a3b8", icone: Coins },
};

/**
 * Anneau d'encaissement : la part payée du total, qui se remplit à l'ouverture de la fiche.
 * Vert quand tout est payé, orange tant qu'il reste de l'argent à recevoir.
 */
export function AnneauPaiement({ encaisse, total, taille = 132, className }: { encaisse: number; total: number; taille?: number; className?: string }) {
  const part = total > 0 ? Math.min(1, Math.max(0, encaisse / total)) : 0;
  const anime = useCompteur(part * 100, 1100);
  const r = 52;
  const tour = 2 * Math.PI * r;
  const couleur = part >= 1 ? "var(--gain)" : "var(--accent)";
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: taille, height: taille }} role="img" aria-label={`${Math.round(part * 100)} % encaissé`}>
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="12" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={couleur} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={tour} strokeDashoffset={tour * (1 - anime / 100)} style={{ filter: `drop-shadow(0 4px 8px color-mix(in srgb, ${couleur} 45%, transparent))` }} />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className="chiffres text-[26px] leading-none font-extrabold">{Math.round(anime)}<span className="text-[14px]"> %</span></span>
        <span className="mt-0.5 text-[11px] font-semibold text-encre-3">encaissé</span>
      </div>
    </div>
  );
}
