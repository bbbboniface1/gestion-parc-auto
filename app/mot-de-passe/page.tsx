"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { versErreurApi } from "@/lib/api/erreurs";
import { CadreAccueil } from "@/components/coque/cadre-accueil";
import { Bouton } from "@/components/ui/bouton";
import { Champ } from "@/components/ui/champ";

/** Deux usages : demander le lien de réinitialisation, puis (arrivé par ce lien) choisir le nouveau mot de passe. */
export default function PageMotDePasse() {
  const router = useRouter();
  const [recuperation, setRecuperation] = useState(false);
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let desabonner: (() => void) | undefined;
    void import("@/lib/api/supabase").then(({ supabase }) => {
      const { data } = supabase().auth.onAuthStateChange((evenement) => {
        if (evenement === "PASSWORD_RECOVERY") setRecuperation(true);
      });
      desabonner = () => data.subscription.unsubscribe();
    });
    return () => desabonner?.();
  }, []);

  async function demander(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setErreur(null);
    const { supabase } = await import("@/lib/api/supabase");
    const { error } = await supabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/mot-de-passe/` });
    setEnvoi(false);
    if (error) setErreur(versErreurApi(error).message);
    else setEnvoye(true);
  }

  async function changer(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setErreur(null);
    const { supabase } = await import("@/lib/api/supabase");
    const { error } = await supabase().auth.updateUser({ password: motDePasse });
    setEnvoi(false);
    if (error) setErreur(versErreurApi(error).message);
    else {
      toast.success("Mot de passe modifié");
      router.replace("/accueil/");
    }
  }

  return (
    <CadreAccueil>
      {recuperation ? (
        <form onSubmit={changer} className="flex flex-col gap-4">
          <h1 className="text-[26px] font-semibold tracking-tight">Nouveau mot de passe</h1>
          <Champ libelle="Mot de passe" type="password" autoComplete="new-password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} aide="10 caractères au moins." />
          {erreur && <p role="alert" className="text-[14px] text-perte">{erreur}</p>}
          <Bouton type="submit" variante="primaire" taille="lg" pleineLargeur chargement={envoi} disabled={motDePasse.length < 10}>Enregistrer</Bouton>
        </form>
      ) : envoye ? (
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">Lien envoyé</h1>
          <p className="mt-2 text-encre-2">Si un compte existe pour <strong className="text-encre">{email}</strong>, un lien de réinitialisation vient d&apos;être envoyé.</p>
          <Link href="/connexion/" className="mt-6 inline-block font-medium text-primaire underline-offset-4 hover:underline">Retour à la connexion</Link>
        </div>
      ) : (
        <form onSubmit={demander} className="flex flex-col gap-4">
          <h1 className="text-[26px] font-semibold tracking-tight">Mot de passe oublié</h1>
          <p className="-mt-2 text-encre-2">Indiquez votre adresse : vous recevrez un lien pour en choisir un nouveau.</p>
          <Champ libelle="Adresse e-mail" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {erreur && <p role="alert" className="text-[14px] text-perte">{erreur}</p>}
          <Bouton type="submit" variante="primaire" taille="lg" pleineLargeur chargement={envoi} disabled={!email}>Envoyer le lien</Bouton>
          <Link href="/connexion/" className="text-[14px] text-encre-2 underline-offset-4 hover:underline">Retour à la connexion</Link>
        </form>
      )}
    </CadreAccueil>
  );
}
