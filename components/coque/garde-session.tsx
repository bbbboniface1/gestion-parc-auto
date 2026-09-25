"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { Bouton } from "@/components/ui/bouton";

/** Écran de démarrage : la silhouette du billet, pendant que la session et les données se chargent. */
export function EcranDemarrage({ message = "Ouverture…" }: { message?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-papier" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-14 w-24 animate-pulse rounded-lg bg-primaire">
          <span className="absolute -top-2 left-[62%] size-4 rounded-full bg-papier" />
          <span className="absolute -bottom-2 left-[62%] size-4 rounded-full bg-papier" />
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
        <div className="max-w-sm carte p-6">
          <p className="text-[17px] font-semibold">Ouverture impossible</p>
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
