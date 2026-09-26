"use client";

import { useState } from "react";
import Link from "next/link";
import { EnvelopeSimpleOpen } from "@phosphor-icons/react";
import { versErreurApi } from "@/lib/api/erreurs";
import { supabaseConfigure } from "@/lib/config";
import { CadreAccueil } from "@/components/coque/cadre-accueil";
import { Bouton } from "@/components/ui/bouton";
import { Champ } from "@/components/ui/champ";

export default function PageInscription() {
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const trop_court = motDePasse.length > 0 && motDePasse.length < 10;

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (!supabaseConfigure()) { setErreur("La création de compte n'est pas disponible sans serveur : essayez la démonstration depuis la page de connexion."); return; }
    setEnvoi(true);
    try {
      const { supabase } = await import("@/lib/api/supabase");
      const { data, error } = await supabase().auth.signUp({
        email: email.trim(),
        password: motDePasse,
        options: { emailRedirectTo: `${window.location.origin}/bienvenue/` },
      });
      if (error) setErreur(/already/i.test(error.message) ? "Un compte existe déjà avec cette adresse. Connectez-vous." : versErreurApi(error).message);
      else if (!data.session) setEnvoye(true);
    } finally {
      setEnvoi(false);
    }
  }

  if (envoye) {
    return (
      <CadreAccueil>
        <EnvelopeSimpleOpen className="size-10 text-gain-texte" aria-hidden />
        <h1 className="mt-4 text-[26px] font-semibold tracking-tight">Vérifiez votre boîte e-mail</h1>
        <p className="mt-2 text-encre-2">
          Un lien de confirmation a été envoyé à <strong className="text-encre">{email}</strong>. Ouvrez-le pour activer votre compte,
          puis créez votre entreprise.
        </p>
        <Link href="/connexion/" className="mt-6 inline-block font-medium text-primaire underline-offset-4 hover:underline">Retour à la connexion</Link>
      </CadreAccueil>
    );
  }

  return (
    <CadreAccueil>
      <h1 className="text-[26px] font-semibold tracking-tight">Créer un compte</h1>
      <p className="mt-1 text-encre-2">Vous créerez ensuite votre entreprise, ou rejoindrez celle qui vous invite.</p>
      <form onSubmit={creer} className="mt-6 flex flex-col gap-4" noValidate>
        <Champ libelle="Adresse e-mail" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Champ
          libelle="Mot de passe"
          type="password"
          autoComplete="new-password"
          required
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          aide="10 caractères au moins."
          erreur={trop_court ? "10 caractères au moins." : null}
        />
        {erreur && <p role="alert" className="rounded-controle border border-perte/30 bg-perte-voile px-3 py-2 text-[14px] text-perte">{erreur}</p>}
        <Bouton type="submit" variante="primaire" taille="lg" pleineLargeur chargement={envoi} disabled={!email || motDePasse.length < 10}>
          Créer mon compte
        </Bouton>
        <p className="text-[14px] text-encre-2">
          Déjà inscrit ? <Link href="/connexion/" className="font-medium text-primaire underline-offset-4 hover:underline">Se connecter</Link>
        </p>
      </form>
    </CadreAccueil>
  );
}
