"use client";

import { useSyncExternalStore } from "react";

function abonner(requete: string) {
  return (rappel: () => void) => {
    const mq = window.matchMedia(requete);
    mq.addEventListener("change", rappel);
    return () => mq.removeEventListener("change", rappel);
  };
}

export function useMedia(requete: string, parDefaut = false): boolean {
  return useSyncExternalStore(
    abonner(requete),
    () => window.matchMedia(requete).matches,
    () => parDefaut,
  );
}

/** ≥ 1024 px : rail de navigation, Kanban, feuilles en fenêtre centrée. */
export function useOrdinateur(): boolean {
  return useMedia("(min-width: 1024px)");
}

function abonnerReseau(rappel: () => void) {
  window.addEventListener("online", rappel);
  window.addEventListener("offline", rappel);
  return () => {
    window.removeEventListener("online", rappel);
    window.removeEventListener("offline", rappel);
  };
}

export function useEnLigne(): boolean {
  return useSyncExternalStore(abonnerReseau, () => navigator.onLine, () => true);
}
