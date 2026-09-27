"use client";

import { Bank, Coins, DeviceMobile, Money, Receipt, Warning, type Icon } from "@phosphor-icons/react";
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
 * Badge « En retard » : le même dans la liste et sur la fiche, pour que le retard reste au premier plan partout.
 * `grand` suit la hauteur des tampons de la fiche (36 px).
 */
export function BadgeRetard({ grand }: { grand?: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full bg-perte-voile font-bold whitespace-nowrap text-perte-texte",
      grand ? "h-9 gap-2 px-4 text-[14px]" : "h-6 gap-1 px-2 text-[12px]",
    )}>
      <Warning size={grand ? 16 : 13} weight="fill" aria-hidden /> En retard
    </span>
  );
}

/**
 * Anneau d'encaissement : la part payée du total, qui se remplit à l'ouverture de la fiche.
 * Vert quand tout est payé, rouge si une échéance est en retard (comme la barre de la liste), orange sinon.
 */
export function AnneauPaiement({ encaisse, total, enRetard, taille = 132, libelle = "encaissé", className }: { encaisse: number; total: number; enRetard?: boolean; taille?: number; libelle?: string; className?: string }) {
  const part = total > 0 ? Math.min(1, Math.max(0, encaisse / total)) : 0;
  const anime = useCompteur(part * 100, 1100);
  const r = 52;
  const tour = 2 * Math.PI * r;
  const couleur = part >= 1 ? "var(--gain)" : enRetard ? "var(--perte)" : "var(--accent)";
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: taille, height: taille }} role="img" aria-label={`${Math.round(part * 100)} % ${libelle}`}>
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--trait)" strokeWidth="12" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={couleur} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={tour} strokeDashoffset={tour * (1 - anime / 100)} />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className="chiffres text-[24px] leading-none font-extrabold">{Math.round(anime)}<span className="text-[14px]"> %</span></span>
        <span className="mt-1 text-[12px] font-semibold text-encre-3">{libelle}</span>
      </div>
    </div>
  );
}
