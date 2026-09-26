"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PlayCircle } from "@phosphor-icons/react";
import { demoDisponible, supabaseConfigure } from "@/lib/config";
import { useSession } from "@/lib/session";
import { versErreurApi } from "@/lib/api/erreurs";
import { CadreAccueil } from "@/components/coque/cadre-accueil";
import { Bouton } from "@/components/ui/bouton";
import { Champ } from "@/components/ui/champ";

function destinationSure(retour: string | null): string {
  // Seulement un chemin interne : pas de redirection ouverte vers un autre site.
  return retour && retour.startsWith("/") && !retour.startsWith("//") ? retour : "/accueil/";
}

function Connexion() {
  const { etat, entrerDemo } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const retour = destinationSure(params.get("retour"));
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [demo, setDemo] = useState(false);
  const production = supabaseConfigure();
  const avecDemo = demoDisponible();

  useEffect(() => {
    if (etat.statut === "connecte") router.replace(etat.org ? retour : "/bienvenue/");
  }, [etat, router, retour]);

  async function seConnecter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const { supabase } = await import("@/lib/api/supabase");
      const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password: motDePasse });
      if (error) {
        setErreur(/invalid login/i.test(error.message) ? "Adresse ou mot de passe incorrect." : /confirm/i.test(error.message) ? "Confirmez d'abord votre adresse : le lien vous a été envoyé par e-mail." : versErreurApi(error).message);
      }
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <CadreAccueil>
      <h1 className="text-[24px] leading-tight font-semibold tracking-tight lg:text-[32px]">Connexion</h1>
      <p className="mt-2 text-encre-2">{production ? "Accédez au parc de votre entreprise." : "Aucun serveur n'est configuré sur ce déploiement : seule la démonstration est disponible."}</p>

      {production && (
        <form onSubmit={seConnecter} className="mt-6 flex flex-col gap-4" noValidate>
          <Champ libelle="Adresse e-mail" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Champ libelle="Mot de passe" type="password" autoComplete="current-password" required value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} />
          {erreur && <p role="alert" className="rounded-controle border border-perte/30 bg-perte-voile px-3 py-2 text-[14px] text-perte-texte">{erreur}</p>}
          <Bouton type="submit" variante="primaire" taille="lg" pleineLargeur chargement={envoi} disabled={!email || !motDePasse}>
            Se connecter
          </Bouton>
          <div className="flex flex-wrap justify-between gap-x-4 text-[14px]">
            <Link href="/mot-de-passe/" className="inline-flex h-11 items-center lg:h-10 text-encre-2 underline-offset-4 hover:underline">Mot de passe oublié</Link>
            <Link href="/inscription/" className="inline-flex h-11 items-center lg:h-10 font-medium text-primaire underline-offset-4 hover:underline">Créer un compte</Link>
          </div>
        </form>
      )}

      {avecDemo && (
      <div className={production ? "mt-8 border-t border-trait pt-6" : "mt-6"}>
        <p className="etiquette text-[12px] text-encre-3">Sans compte</p>
        <p className="mt-2 text-[14px] text-encre-2">
          Une entreprise fictive de Bamako, 24 véhicules, des ventes et des encaissements : tout fonctionne, directement dans votre navigateur.
        </p>
        <Bouton
          className="mt-3"
          variante={production ? "secondaire" : "primaire"}
          taille="lg"
          pleineLargeur
          chargement={demo}
          icone={<PlayCircle className="size-5" aria-hidden />}
          onClick={async () => {
            setDemo(true);
            await entrerDemo();
          }}
        >
          Essayer la démonstration
        </Bouton>
        {demo && <p className="mt-2 text-[12px] text-encre-3" role="status">Préparation de la base de démonstration (quelques secondes la première fois)…</p>}
      </div>
      )}
    </CadreAccueil>
  );
}

export default function PageConnexion() {
  return (
    <Suspense>
      <Connexion />
    </Suspense>
  );
}
