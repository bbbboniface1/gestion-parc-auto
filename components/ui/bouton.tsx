import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variante = "primaire" | "secondaire" | "fantome" | "danger" | "sur-nuit";
type Taille = "sm" | "md" | "lg";

const VARIANTES: Record<Variante, string> = {
  primaire: "bg-signal text-sur-signal font-semibold hover:bg-signal-fonce active:bg-signal-fonce",
  secondaire: "bg-surface-2 text-encre hover:bg-trait",
  fantome: "text-encre-2 hover:bg-surface-2 hover:text-encre",
  danger: "bg-perte-voile text-perte hover:bg-perte-voile/70",
  "sur-nuit": "bg-white/10 text-sur-nuit hover:bg-white/15",
};

const TAILLES: Record<Taille, string> = {
  sm: "h-9 px-3 text-petit gap-1.5",
  md: "h-11 lg:h-10 px-4 text-corps gap-2",
  lg: "h-12 px-5 text-corps gap-2",
};

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
        "inline-flex select-none items-center justify-center rounded-controle font-medium whitespace-nowrap transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTES[variante],
        TAILLES[taille],
        pleineLargeur && "w-full",
        className,
      )}
      {...reste}
    >
      {chargement ? <Loader2 className="size-[18px] animate-spin" aria-hidden /> : icone}
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
          "inline-flex size-11 items-center justify-center rounded-controle transition-colors lg:size-10",
          surNuit ? "text-sur-nuit-2 hover:bg-white/10 hover:text-sur-nuit" : "text-encre-2 hover:bg-surface-2 hover:text-encre",
          className,
        )}
        {...reste}
      >
        {children}
      </button>
    );
  },
);
