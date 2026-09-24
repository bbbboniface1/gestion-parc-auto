"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Enregistre le service worker (build de production seulement) et propose de recharger
 * quand une nouvelle version de l'application est prête — sans jamais recharger de force
 * au milieu d'une saisie.
 */
export function EnregistrementServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    let rechargement = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (rechargement) return;
      rechargement = true;
      window.location.reload();
    });

    const proposer = (attente: ServiceWorker) => {
      toast("Nouvelle version disponible", {
        description: "Rechargez pour en profiter. Vos données sont conservées.",
        duration: Infinity,
        action: { label: "Recharger", onClick: () => attente.postMessage("ACTIVER") },
      });
    };

    navigator.serviceWorker.register("/sw.js").then((enregistrement) => {
      if (enregistrement.waiting && navigator.serviceWorker.controller) proposer(enregistrement.waiting);
      enregistrement.addEventListener("updatefound", () => {
        const nouveau = enregistrement.installing;
        nouveau?.addEventListener("statechange", () => {
          if (nouveau.state === "installed" && navigator.serviceWorker.controller) proposer(nouveau);
        });
      });
      // Vérifie une mise à jour à chaque retour sur l'app (onglet ou PWA réaffichée).
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") void enregistrement.update();
      });
    }).catch(() => {
      // Sans service worker, l'app fonctionne en ligne ; rien à signaler à l'utilisateur.
    });
  }, []);

  return null;
}
