// Composants signature du design v2 : la piste (où en est le véhicule), l'étiquette d'étape, le tampon, le montant.

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ETAPES, etape as definitionEtape, type Etape } from "@/lib/domaine";
import { formatCourt, formatNombre } from "@/lib/format";

/**
 * La piste : huit segments, un par étape du voyage. Le passé est plein, l'étape en cours est jaune et
 * plus haute (cerclée d'encre : le jaune seul ne se distingue pas du blanc), la suite est un filet.
 * C'est l'unique usage du jaune dans les listes : il désigne toujours la position du véhicule.
 */
export function Piste({ etape, className }: { etape: Etape | string; className?: string }) {
  const def = definitionEtape(etape);
  const indice = ETAPES.findIndex((e) => e.code === def.code);
  return (
    <span role="img" aria-label={`Étape ${indice + 1} sur ${ETAPES.length} : ${def.libelle}`} className={cn("flex h-[10px] items-center gap-[2px]", className)}>
      {ETAPES.map((e, k) => (
        <span
          key={e.code}
          aria-hidden
          className={cn("flex-1", k === indice ? "h-[10px] outline-[1.5px] outline-encre" : "h-[4px]")}
          style={{ background: k < indice ? "var(--encre)" : k === indice ? "var(--signal)" : "var(--trait)" }}
        />
      ))}
    </span>
  );
}

/** Étiquette d'étape : un carré de la rampe grise puis le nom en capitales condensées. Pas de pastille. */
export function EtiquetteEtape({ etape, className }: { etape: Etape | string; compacte?: boolean; className?: string }) {
  const def = definitionEtape(etape);
  return (
    <span className={cn("etiquette inline-flex items-center gap-1.5 text-petit leading-none whitespace-nowrap text-encre", className)}>
      <span aria-hidden className="size-2 shrink-0" style={{ background: def.couleur }} />
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

/** Statut commercial dans les listes : texte en capitales, sans cadre (le tampon est réservé aux documents). */
export function StatutTexte({ type, detail, className }: { type: TypeTampon; detail?: string | null; className?: string }) {
  const t = TAMPONS[type];
  return (
    <span className={cn("etiquette text-petit leading-none whitespace-nowrap", className)} style={{ color: t.couleur }}>
      {t.texte}
      {detail && <span className="ml-1 opacity-90">· {detail}</span>}
    </span>
  );
}

/**
 * Tampon : cadre à double trait, légèrement incliné — l'équivalent du cachet sur un document.
 * Il ne sert qu'une fois par écran, pour le statut du dossier (fiche, facture, confirmation).
 */
export function Tampon({ type, detail, grand, incline = true, className }: {
  type: TypeTampon; detail?: string | null; grand?: boolean; incline?: boolean; className?: string;
}) {
  const t = TAMPONS[type];
  return (
    <span
      className={cn(
        "etiquette inline-flex items-center whitespace-nowrap rounded-controle border-[3px] border-double leading-none",
        grand ? "px-3 py-2 text-titre" : "px-1.5 py-[3px] text-petit",
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
 * Montant : le chiffre en gras, l'unité en petit et plus claire. `lg`, `xl` et `heros` utilisent les chiffres
 * condensés (numéro de lot). `court` abrège (186,4 M) et garde la valeur exacte en infobulle.
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
    sm: "text-petit font-semibold",
    md: "text-corps font-semibold",
    lg: "figure text-titre",
    xl: "figure text-chiffre",
    heros: "figure text-chiffre",
  } as const;
  return (
    <span className={cn("chiffres whitespace-nowrap", tailles[taille], className)} title={court ? exact : undefined} aria-label={court ? exact : undefined}>
      {signe && valeur > 0 ? "+" : ""}
      {affiche}
      {devise && <span className={cn("ml-1 font-sans text-petit font-normal text-encre-3", classeUnite)}>{devise}</span>}
    </span>
  );
}

/** Surtitre en capitales condensées, pour les en-têtes de section et de colonne. */
export function Surtitre({ children, className, as: Balise = "p" }: { children: ReactNode; className?: string; as?: "p" | "h2" | "h3" | "span" }) {
  return <Balise className={cn("etiquette text-petit text-encre-3", className)}>{children}</Balise>;
}

export function Code({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("font-mono text-petit font-medium tracking-wide", className)}>{children}</span>;
}
