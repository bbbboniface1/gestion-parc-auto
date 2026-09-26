"use client";

import { Bank, Coins, DeviceMobile, Money, Receipt, type Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { useCompteur } from "@/lib/animation";

/**
 * Couleur et pictogramme de chaque moyen de paiement, reconnaissables d'un coup d'œil (couleurs de marque des
 * opérateurs). `texte` = couleur du texte ou de l'icône posés sur `couleur` : l'orange et le bleu de Wave sont trop
 * clairs pour du blanc, on y pose le bleu nuit.
 */
export const MODES_VISUELS: Record<string, { couleur: string; texte: string; icone: Icon }> = {
  especes: { couleur: "var(--gain-plein)", texte: "white", icone: Money },
  orange_money: { couleur: "var(--marque-orange-money)", texte: "var(--nuit)", icone: DeviceMobile },
  moov_money: { couleur: "var(--marque-moov)", texte: "white", icone: DeviceMobile },
  wave: { couleur: "var(--marque-wave)", texte: "var(--nuit)", icone: DeviceMobile },
  virement: { couleur: "var(--primaire-plein)", texte: "white", icone: Bank },
  cheque: { couleur: "var(--nuit-2)", texte: "white", icone: Receipt },
  autre: { couleur: "var(--nuit-2)", texte: "white", icone: Coins },
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
          strokeDasharray={tour} strokeDashoffset={tour * (1 - anime / 100)} />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className="chiffres text-[24px] leading-none font-extrabold">{Math.round(anime)}<span className="text-[14px]"> %</span></span>
        <span className="mt-1 text-[12px] font-semibold text-encre-3">encaissé</span>
      </div>
    </div>
  );
}
