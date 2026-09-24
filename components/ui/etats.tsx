import type { ReactNode } from "react";
import { CloudOff, RotateCw } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ErreurApi } from "@/lib/api/erreurs";
import { Bouton } from "./bouton";

export function Squelette({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-controle bg-surface-2", className)} />;
}

/** Liste de squelettes : garde la forme de l'écran pendant le chargement (pas de toupie au centre). */
export function SqueletteListe({ lignes = 5, className }: { lignes?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)} role="status" aria-label="Chargement">
      {Array.from({ length: lignes }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-carte border border-trait bg-surface p-3">
          <Squelette className="size-14 shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            <Squelette className="h-4 w-2/3" />
            <Squelette className="h-3 w-1/3" />
          </div>
          <Squelette className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

export function EtatVide({ titre, texte, action, illustration, className }: {
  titre: string; texte?: ReactNode; action?: ReactNode; illustration?: ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-start gap-3 rounded-carte border border-dashed border-trait-fort bg-surface px-5 py-8 lg:items-center lg:text-center", className)}>
      {illustration}
      <div>
        <p className="text-[17px] font-semibold text-encre">{titre}</p>
        {texte && <p className="mt-1 max-w-md text-encre-2">{texte}</p>}
      </div>
      {action}
    </div>
  );
}

export function EtatErreur({ erreur, onReessayer, className }: { erreur: ErreurApi | Error | null; onReessayer?: () => void; className?: string }) {
  const horsLigne = !!erreur && "horsLigne" in erreur && erreur.horsLigne;
  return (
    <div role="alert" className={cn("flex flex-col items-start gap-3 rounded-carte border border-trait bg-surface px-5 py-6", className)}>
      <div className="flex items-center gap-2 text-encre">
        {horsLigne && <CloudOff className="size-5 text-ocre" aria-hidden />}
        <p className="font-semibold">{horsLigne ? "Pas de connexion" : "Impossible d'afficher ces données"}</p>
      </div>
      <p className="text-encre-2">{erreur?.message ?? "Une erreur est survenue."}</p>
      {onReessayer && (
        <Bouton variante="secondaire" taille="sm" icone={<RotateCw className="size-4" />} onClick={onReessayer}>
          Réessayer
        </Bouton>
      )}
    </div>
  );
}
