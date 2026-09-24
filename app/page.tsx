"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { EcranDemarrage } from "@/components/coque/garde-session";

export default function Racine() {
  const { etat } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (etat.statut === "connecte") router.replace(etat.org ? "/accueil/" : "/bienvenue/");
    else if (etat.statut === "deconnecte" || etat.statut === "erreur") router.replace("/connexion/");
  }, [etat, router]);
  return <EcranDemarrage />;
}
