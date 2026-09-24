import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Section d'un écran : un filet d'encre de 2 px, un titre en capitales condensées, puis le contenu posé
 * directement sur la page. C'est le motif qui remplace les cartes : on sépare par un filet, pas par une boîte.
 */
export function Section({ titre, compteur, action, children, className, id }: {
  titre: ReactNode;
  compteur?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section aria-labelledby={id} className={cn("min-w-0 border-t-2 border-encre pt-2", className)}>
      <header className="flex min-h-9 items-center justify-between gap-2">
        <h2 id={id} className="etiquette text-petit text-encre">
          {titre}
          {compteur !== undefined && <span className="ml-2 text-encre-3">{compteur}</span>}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}

/** Ligne de registre : libellé à gauche, valeur à droite, filet dessous. */
export function LigneRegistre({ libelle, children, className }: { libelle: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 border-b border-trait py-2.5 last:border-b-0", className)}>
      <dt className="text-encre-3">{libelle}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
