// Composants signature du système « Connaissement » : étiquette d'étape, tampon, montant.

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { etape as definitionEtape, type Etape } from "@/lib/domaine";
import { formatCourt, formatNombre } from "@/lib/format";

/** Étiquette d'étape : barre de couleur à gauche, capitales condensées — jamais une pilule pastel. */
export function EtiquetteEtape({ etape, compacte, className }: { etape: Etape | string; compacte?: boolean; className?: string }) {
  const def = definitionEtape(etape);
  return (
    <span
      className={cn(
        "etiquette inline-flex items-center gap-1.5 rounded-[4px] border border-trait bg-surface leading-none whitespace-nowrap",
        compacte ? "h-6 pr-1.5 text-[11px]" : "h-7 pr-2 text-[12px]",
        className,
      )}
      style={{ color: def.couleur }}
    >
      <span aria-hidden className="h-full w-[3px] rounded-l-[3px]" style={{ background: def.couleur }} />
      {def.etiquette}
    </span>
  );
}

type TypeTampon = "reserve" | "vendu" | "a_livrer" | "solde" | "annule" | "brouillon";

const TAMPONS: Record<TypeTampon, { texte: string; couleur: string }> = {
  reserve: { texte: "RÉSERVÉ", couleur: "var(--reserve)" },
  vendu: { texte: "VENDU", couleur: "var(--gain)" },
  a_livrer: { texte: "VENDU · À LIVRER", couleur: "var(--gain)" },
  solde: { texte: "SOLDÉ", couleur: "var(--gain)" },
  annule: { texte: "ANNULÉ", couleur: "var(--perte)" },
  brouillon: { texte: "EN ATTENTE", couleur: "var(--ocre)" },
};

/**
 * Tampon : cadre à double trait, légèrement incliné — l'équivalent du cachet sur un document.
 * `grand` pour la facture et la confirmation, compact dans les listes.
 */
export function Tampon({ type, detail, grand, incline = true, className }: {
  type: TypeTampon; detail?: string | null; grand?: boolean; incline?: boolean; className?: string;
}) {
  const t = TAMPONS[type];
  return (
    <span
      className={cn(
        "etiquette inline-flex items-center whitespace-nowrap rounded-[3px] border-[3px] border-double leading-none",
        grand ? "px-3 py-2 text-[20px]" : "px-1.5 py-[3px] text-[11px]",
        incline && "-rotate-[4deg]",
        className,
      )}
      style={{ color: t.couleur, borderColor: t.couleur }}
    >
      {t.texte}
      {detail && <span className="ml-1 opacity-90">· {detail}</span>}
    </span>
  );
}

/**
 * Montant : le chiffre en demi-gras, l'unité plus petite et plus claire.
 * `court` abrège (186,4 M) et garde la valeur exacte en infobulle et pour les lecteurs d'écran.
 */
export function Montant({ valeur, devise = "FCFA", court, taille = "md", signe, className, classeUnite }: {
  valeur: number | null | undefined;
  devise?: string | null;
  court?: boolean;
  taille?: "sm" | "md" | "lg" | "xl" | "heros";
  signe?: boolean;
  className?: string;
  classeUnite?: string;
}) {
  if (valeur === null || valeur === undefined) return <span className={cn("text-encre-3", className)}>—</span>;
  const exact = `${formatNombre(Math.round(valeur))} ${devise ?? ""}`.trim();
  const affiche = court ? formatCourt(valeur) : formatNombre(Math.round(valeur));
  const tailles = {
    sm: "text-[13px]",
    md: "text-[15px] lg:text-sm",
    lg: "text-[20px]",
    xl: "text-[32px] leading-[1.1] tracking-tight",
    heros: "text-[40px] leading-[1.05] tracking-tight lg:text-[44px]",
  } as const;
  return (
    <span className={cn("chiffres font-semibold whitespace-nowrap", tailles[taille], className)} title={court ? exact : undefined} aria-label={court ? exact : undefined}>
      {signe && valeur > 0 ? "+" : ""}
      {affiche}
      {devise && (
        <span className={cn("ml-1 font-normal text-encre-3", taille === "heros" || taille === "xl" ? "text-[0.45em]" : "text-[0.8em]", classeUnite)}>
          {devise}
        </span>
      )}
    </span>
  );
}

/** Surtitre en capitales condensées, pour les en-têtes de section et de colonne. */
export function Surtitre({ children, className, as: Balise = "p" }: { children: ReactNode; className?: string; as?: "p" | "h2" | "h3" | "span" }) {
  return <Balise className={cn("etiquette text-[12px] text-encre-3", className)}>{children}</Balise>;
}

export function Code({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("font-mono text-[13px] font-medium tracking-wide", className)}>{children}</span>;
}
