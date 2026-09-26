// Composants signature : badge d'étape, badge de statut, montant, surtitre.

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ETAPES, etape as definitionEtape, type Etape } from "@/lib/domaine";
import { formatCourt, formatNombre } from "@/lib/format";

/** Texte foncé et fond teinté tirés de la couleur vive de l'étape (contraste ≥ 4,5:1 vérifié). */
export function teintesEtape(couleur: string) {
  return {
    texte: `color-mix(in srgb, ${couleur} 62%, var(--pole-texte))`,
    fond: `color-mix(in srgb, ${couleur} 12%, var(--surface))`,
  };
}

/** Badge d'étape : pastille arrondie, point de la couleur de l'étape, fond teinté. */
export function EtiquetteEtape({ etape, compacte, className }: { etape: Etape | string; compacte?: boolean; className?: string }) {
  const def = definitionEtape(etape);
  const t = teintesEtape(def.couleur);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold leading-none whitespace-nowrap",
        compacte ? "h-6 gap-1 px-2 text-[12px]" : "h-7 gap-2 px-3 text-[14px]",
        className,
      )}
      style={{ color: t.texte, background: t.fond }}
    >
      <span aria-hidden className={cn("rounded-full", compacte ? "size-1.5" : "size-2")} style={{ background: def.couleur }} />
      {def.libelle}
    </span>
  );
}

/** Mini-piste : huit traits colorés, les étapes franchies prennent leur couleur. */
export function MiniPiste({ etape, className }: { etape: Etape | string; className?: string }) {
  const indice = ETAPES.findIndex((e) => e.code === definitionEtape(etape).code);
  return (
    <span aria-hidden className={cn("flex h-1.5 gap-0.5", className)}>
      {ETAPES.map((e, k) => (
        <span key={e.code} className="flex-1 rounded-full" style={{ background: k <= indice ? e.couleur : "var(--trait)" }} />
      ))}
    </span>
  );
}

type TypeTampon = "reserve" | "vendu" | "a_livrer" | "solde" | "annule" | "brouillon";

const STATUTS: Record<TypeTampon, { texte: string; couleur: string; teinte: string; fond: string }> = {
  reserve: { texte: "Réservé", couleur: "var(--reserve)", teinte: "var(--reserve-texte)", fond: "var(--reserve-voile)" },
  vendu: { texte: "Vendu", couleur: "var(--gain)", teinte: "var(--gain-texte)", fond: "var(--gain-voile)" },
  a_livrer: { texte: "Vendu · à livrer", couleur: "var(--gain)", teinte: "var(--gain-texte)", fond: "var(--gain-voile)" },
  solde: { texte: "Soldé", couleur: "var(--gain)", teinte: "var(--gain-texte)", fond: "var(--gain-voile)" },
  annule: { texte: "Annulé", couleur: "var(--perte)", teinte: "var(--perte-texte)", fond: "var(--perte-voile)" },
  brouillon: { texte: "En attente", couleur: "var(--ocre)", teinte: "var(--ocre-texte)", fond: "var(--ocre-voile)" },
};

/** Badge de statut commercial ou de facture : fond teinté, point de couleur, texte foncé. */
export function Tampon({ type, detail, grand, className }: {
  type: TypeTampon; detail?: string | null; grand?: boolean; incline?: boolean; className?: string;
}) {
  const t = STATUTS[type];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold leading-none whitespace-nowrap",
        grand ? "h-9 gap-2 px-4 text-[14px]" : "h-6 gap-1 px-2 text-[12px]",
        className,
      )}
      style={{ color: t.teinte, background: t.fond }}
    >
      <span aria-hidden className={cn("rounded-full", grand ? "size-2" : "size-1.5")} style={{ background: t.couleur }} />
      {t.texte}
      {detail && <span className="font-medium">· {detail}</span>}
    </span>
  );
}

/**
 * Montant : le chiffre en gras, l'unité plus petite et plus claire.
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
    sm: "text-[12px] font-semibold",
    md: "text-[16px] font-semibold lg:text-[14px]",
    // Second plan (24 px), premier plan (32 px), chiffre héro (40 puis 56 px) : l'échelle de l'écran pilote.
    lg: "text-[24px] leading-tight font-bold tracking-tight",
    xl: "text-[32px] leading-none font-extrabold tracking-tight",
    heros: "text-[40px] leading-none font-extrabold tracking-tight lg:text-[56px]",
  } as const;
  return (
    <span className={cn("chiffres whitespace-nowrap", tailles[taille], className)} title={court ? exact : undefined} aria-label={court ? exact : undefined}>
      {signe && valeur > 0 ? "+" : ""}
      {affiche}
      {devise && (
        <span className={cn("ml-1 font-medium opacity-60", taille === "heros" || taille === "xl" ? "text-[0.42em]" : "text-[0.78em]", classeUnite)}>
          {devise}
        </span>
      )}
    </span>
  );
}

/** Surtitre : petites capitales espacées, pour les en-têtes de section et de colonne. */
export function Surtitre({ children, className, as: Balise = "p" }: { children: ReactNode; className?: string; as?: "p" | "h2" | "h3" | "span" }) {
  return <Balise className={cn("etiquette text-[12px] text-encre-3", className)}>{children}</Balise>;
}

export function Code({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("font-mono text-[14px] font-medium tracking-wide", className)}>{children}</span>;
}
