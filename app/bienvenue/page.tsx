"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { rpc } from "@/lib/api/client";
import { versErreurApi } from "@/lib/api/erreurs";
import { useSession } from "@/lib/session";
import { CadreAccueil } from "@/components/coque/cadre-accueil";
import { EcranDemarrage } from "@/components/coque/garde-session";
import { Bouton } from "@/components/ui/bouton";
import { Champ } from "@/components/ui/champ";
import { ChampMontant } from "@/components/ui/champ-montant";

/** Création de l'entreprise : le strict nécessaire pour commencer ; le reste se règle dans Paramètres. */
export default function PageBienvenue() {
  const { etat, recharger, choisirOrganisation } = useSession();
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [ville, setVille] = useState("Bamako");
  const [taux, setTaux] = useState<number | null>(570);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (etat.statut === "deconnecte") router.replace("/connexion/");
    else if (etat.statut === "connecte" && etat.org) router.replace("/accueil/");
  }, [etat, router]);

  if (etat.statut !== "connecte" || etat.org) return <EcranDemarrage />;

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await rpc<{ id?: string; org_id?: string }>("organisation_creer", { p_nom: nom.trim(), p_ville: ville.trim(), p_taux_usd: taux });
      await recharger();
      const id = r?.id ?? r?.org_id;
      if (id) choisirOrganisation(id);
      router.replace("/accueil/");
    } catch (x) {
      setErreur(versErreurApi(x).message);
      setEnvoi(false);
    }
  }

  return (
    <CadreAccueil>
      <p className="etiquette text-[12px] text-encre-3">Première étape</p>
      <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Votre entreprise</h1>
      <p className="mt-1 text-encre-2">Ces informations apparaîtront sur vos factures. Vous pourrez tout compléter plus tard (NIF, RCCM, logo, cachet).</p>
      <form onSubmit={creer} className="mt-6 flex flex-col gap-4">
        <Champ libelle="Nom commercial" placeholder="Sahel Auto Import" required value={nom} onChange={(e) => setNom(e.target.value)} autoFocus />
        <Champ libelle="Ville" required value={ville} onChange={(e) => setVille(e.target.value)} />
        <ChampMontant
          libelle="Taux du dollar"
          aide="Combien de FCFA pour 1 $ US aujourd'hui. Chaque frais en dollars garde le taux de sa date."
          valeur={taux}
          onChange={setTaux}
          devise="XOF"
        />
        {erreur && <p role="alert" className="rounded-controle border border-perte/30 bg-perte-voile px-3 py-2 text-[14px] text-perte-texte">{erreur}</p>}
        <Bouton type="submit" variante="primaire" taille="lg" pleineLargeur chargement={envoi} disabled={nom.trim().length < 2 || !taux}>
          Créer l&apos;entreprise
        </Bouton>
        <p className="text-[14px] text-encre-2">
          Vous avez reçu un code d&apos;invitation ? <Link href="/rejoindre/" className="font-medium text-primaire underline-offset-4 hover:underline">Rejoindre une entreprise</Link>
        </p>
      </form>
    </CadreAccueil>
  );
}
