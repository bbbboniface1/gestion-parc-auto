"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { Bouton } from "@/components/ui/bouton";

/** Écran de démarrage : la piste du voyage qui avance, pendant que la session et les données se chargent. */
export function EcranDemarrage({ message = "Ouverture…" }: { message?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-papier" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <div aria-hidden className="flex h-[14px] w-32 items-center gap-[3px]">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="h-[6px] flex-1 animate-pulse bg-encre" style={{ animationDelay: `${i * 120}ms` }} />
          ))}
        </div>
        <p className="text-encre-3">{message}</p>
      </div>
    </div>
  );
}

/**
 * Protège l'espace de travail : sans session → connexion ; sans entreprise → création.
 * La sécurité réelle est côté serveur (chaque fonction SQL vérifie droits et appartenance) ;
 * cette garde ne fait qu'orienter l'utilisateur.
 */
export function GardeSession({ children }: { children: ReactNode }) {
  const { etat, recharger, deconnecter } = useSession();
  const router = useRouter();
  const chemin = usePathname();

  useEffect(() => {
    if (etat.statut === "deconnecte") router.replace(`/connexion/?retour=${encodeURIComponent(chemin)}`);
    else if (etat.statut === "connecte" && !etat.org) router.replace("/bienvenue/");
  }, [etat, router, chemin]);

  if (etat.statut === "erreur") {
    return (
      <div className="grid min-h-dvh place-items-center bg-papier p-6">
        <div className="max-w-sm border-t-2 border-encre pt-4">
          <p className="text-titre font-semibold">Ouverture impossible</p>
          <p className="mt-1 text-encre-2">{etat.message}</p>
          <div className="mt-4 flex gap-2">
            <Bouton variante="primaire" onClick={() => void recharger()}>Réessayer</Bouton>
            <Bouton variante="fantome" onClick={() => void deconnecter()}>Se déconnecter</Bouton>
          </div>
        </div>
      </div>
    );
  }
  if (etat.statut !== "connecte" || !etat.org) return <EcranDemarrage />;
  return <>{children}</>;
}
