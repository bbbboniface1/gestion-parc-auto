import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { CircleNotch } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

type Variante = "primaire" | "secondaire" | "fantome" | "danger" | "sur-nuit";
type Taille = "sm" | "md" | "lg";

const VARIANTES: Record<Variante, string> = {
  primaire: "bg-primaire-plein text-sur-primaire shadow-bouton hover:bg-primaire-plein-survol active:translate-y-px",
  secondaire: "bg-surface text-encre border border-trait-fort shadow-champ hover:bg-surface-2 hover:border-encre-3/40",
  fantome: "text-encre-2 hover:bg-primaire-voile hover:text-primaire",
  danger: "bg-surface text-perte-texte border border-perte/30 hover:bg-perte-voile",
  "sur-nuit": "bg-white/10 text-sur-nuit hover:bg-white/15",
};

// Cible de 44 px sur téléphone, 40 px au-delà ; « sm » se distingue par un rembourrage plus serré.
const TAILLES: Record<Taille, string> = {
  sm: "h-11 lg:h-10 px-3 text-[14px] gap-2",
  md: "h-11 lg:h-10 px-4 text-[14px] gap-2",
  lg: "h-12 px-6 text-[16px] gap-2",
};

const BASE = "onde inline-flex select-none items-center justify-center rounded-controle font-semibold whitespace-nowrap transition-all duration-150 [&>svg]:shrink-0";

/** Classes d'un bouton, pour un lien (`<Link>`) qui doit avoir exactement l'apparence d'un `Bouton`. */
export function classesBouton(variante: Variante = "secondaire", taille: Taille = "md", className?: string) {
  return cn(BASE, VARIANTES[variante], TAILLES[taille], className);
}

export interface ProprietesBouton extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  taille?: Taille;
  chargement?: boolean;
  icone?: ReactNode;
  pleineLargeur?: boolean;
}

export const Bouton = forwardRef<HTMLButtonElement, ProprietesBouton>(function Bouton(
  { variante = "secondaire", taille = "md", chargement, icone, pleineLargeur, className, children, disabled, type = "button", ...reste },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || chargement}
      aria-busy={chargement || undefined}
      className={cn(
        BASE,
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTES[variante],
        TAILLES[taille],
        pleineLargeur && "w-full",
        className,
      )}
      {...reste}
    >
      {chargement ? <CircleNotch className="size-4 animate-spin" aria-hidden /> : icone}
      {children}
    </button>
  );
});

/** Bouton icône seul : cible tactile de 44 px, libellé obligatoire pour les lecteurs d'écran. */
export const BoutonIcone = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { libelle: string; surNuit?: boolean }>(
  function BoutonIcone({ libelle, surNuit, className, children, type = "button", ...reste }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={libelle}
        title={libelle}
        className={cn(
          "inline-flex size-11 items-center justify-center rounded-full transition-colors lg:size-10",
          surNuit ? "text-sur-nuit-2 hover:bg-white/10 hover:text-sur-nuit" : "text-encre-2 hover:bg-primaire-voile hover:text-primaire",
          className,
        )}
        {...reste}
      >
        {children}
      </button>
    );
  },
);
