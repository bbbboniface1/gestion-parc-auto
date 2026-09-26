"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { rpc } from "@/lib/api/client";
import { versErreurApi } from "@/lib/api/erreurs";
import { useSession } from "@/lib/session";
import { CadreAccueil } from "@/components/coque/cadre-accueil";
import { Bouton } from "@/components/ui/bouton";
import { Champ } from "@/components/ui/champ";

function Rejoindre() {
  const params = useSearchParams();
  const { etat, recharger, choisirOrganisation } = useSession();
  const router = useRouter();
  const [code, setCode] = useState((params.get("code") ?? "").toUpperCase());
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (etat.statut === "deconnecte") router.replace(`/connexion/?retour=${encodeURIComponent(`/rejoindre/?code=${code}`)}`);
  }, [etat, router, code]);

  async function accepter(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await rpc<{ org_id?: string; id?: string; nom?: string }>("invitation_accepter", { p_code: code.trim().toUpperCase() });
      await recharger();
      const id = r?.org_id ?? r?.id;
      if (id) choisirOrganisation(id);
      toast.success(r?.nom ? `Bienvenue chez ${r.nom}` : "Invitation acceptée");
      router.replace("/accueil/");
    } catch (x) {
      setErreur(versErreurApi(x).message);
      setEnvoi(false);
    }
  }

  return (
    <CadreAccueil>
      <h1 className="text-[26px] font-semibold tracking-tight">Rejoindre une entreprise</h1>
      <p className="mt-1 text-encre-2">Saisissez le code à 8 caractères que vous a transmis le propriétaire.</p>
      <form onSubmit={accepter} className="mt-6 flex flex-col gap-4">
        <Champ
          libelle="Code d'invitation"
          mono
          autoCapitalize="characters"
          autoComplete="one-time-code"
          maxLength={12}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="text-center text-[20px] tracking-[0.3em]"
        />
        {erreur && <p role="alert" className="rounded-controle border border-perte/30 bg-perte-voile px-3 py-2 text-[14px] text-perte-texte">{erreur}</p>}
        <Bouton type="submit" variante="primaire" taille="lg" pleineLargeur chargement={envoi} disabled={code.trim().length < 6}>
          Rejoindre
        </Bouton>
        <Link href="/bienvenue/" className="text-[14px] text-encre-2 underline-offset-4 hover:underline">Créer plutôt ma propre entreprise</Link>
      </form>
    </CadreAccueil>
  );
}

export default function PageRejoindre() {
  return (
    <Suspense>
      <Rejoindre />
    </Suspense>
  );
}
