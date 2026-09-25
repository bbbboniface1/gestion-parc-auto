"use client";

import { CloudOff } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";

// Page de secours du service worker : seulement si une page jamais ouverte est demandée sans réseau.
export default function PageHorsLigne() {
  return (
    <div className="grid min-h-dvh place-items-center bg-papier p-6">
      <div className="max-w-sm">
        <CloudOff className="size-10 text-ocre-texte" aria-hidden />
        <h1 className="mt-4 text-[24px] font-semibold tracking-tight">Pas de connexion</h1>
        <p className="mt-2 text-encre-2">
          Cette page n&apos;a pas encore été ouverte sur cet appareil. Les écrans déjà consultés restent disponibles hors ligne,
          et vos saisies partiront dès le retour du réseau.
        </p>
        <div className="mt-6 flex gap-2">
          <Bouton variante="primaire" onClick={() => window.location.reload()}>Réessayer</Bouton>
          <Bouton variante="secondaire" onClick={() => (window.location.href = "/accueil/")}>Aujourd&apos;hui</Bouton>
        </div>
      </div>
    </div>
  );
}
