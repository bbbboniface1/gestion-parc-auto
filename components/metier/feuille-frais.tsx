"use client";

import { useState } from "react";
import { toast } from "sonner";
import { nouvelId, useEcriture, useLecture } from "@/lib/api/requetes";
import { tauxPour, useParametres } from "@/lib/api/parametres";
import { useOrg } from "@/lib/session";
import { CATEGORIES_FRAIS } from "@/lib/domaine";
import { aujourdhui, formatFCFA, type Devise } from "@/lib/format";
import { Feuille } from "@/components/ui/feuille";
import { Bouton } from "@/components/ui/bouton";
import { Champ, Selection } from "@/components/ui/champ";
import { ChampMontant } from "@/components/ui/champ-montant";
import { useAuChangement } from "@/lib/reinitialiser";

interface Compte { id: string; nom: string; type: string; actif: boolean }

/**
 * Saisie d'un frais (sortie d'argent). Portée véhicule, expédition (réparti entre les véhicules
 * du conteneur) ou générale (loyer, salaires). La devise et le taux du jour sont conservés :
 * un fret payé en dollars reste juste même si le dollar bouge ensuite.
 */
export function FeuilleFrais({ ouverte, onFermer, vehiculeId, expeditionId, portee = vehiculeId ? "vehicule" : expeditionId ? "expedition" : "generale", titre }: {
  ouverte: boolean;
  onFermer: () => void;
  vehiculeId?: string;
  expeditionId?: string;
  portee?: "vehicule" | "expedition" | "generale";
  titre?: string;
}) {
  const org = useOrg();
  const { data: reglages } = useParametres();
  const { data: comptes } = useLecture<Compte[]>("comptes_lister", { p_org: org.id }, { enabled: ouverte });
  const categories = Object.entries(CATEGORIES_FRAIS).filter(([, c]) => (portee === "generale" ? c.portee === "generale" : c.portee === "vehicule"));

  const [categorie, setCategorie] = useState(categories[0]?.[0] ?? "divers");
  const [libelle, setLibelle] = useState("");
  const [montant, setMontant] = useState<number | null>(null);
  const [devise, setDevise] = useState<Devise>("XOF");
  const [taux, setTaux] = useState<number | null>(1);
  const [date, setDate] = useState(aujourdhui());
  const [statut, setStatut] = useState<"paye" | "a_payer">("paye");
  const [compte, setCompte] = useState("");
  const [fournisseur, setFournisseur] = useState("");
  const [repartition, setRepartition] = useState<"egale" | "valeur">("egale");
  const [id, setId] = useState(nouvelId);

  useAuChangement([devise, reglages], () => {
    setTaux(tauxPour(devise, reglages?.parametres));
  });

  useAuChangement([ouverte], () => {
    if (!ouverte) return;
    setId(nouvelId());
    setMontant(null);
    setLibelle("");
    setFournisseur("");
  });

  const enregistrer = useEcriture("frais_enregistrer", {
    onSuccess: () => {
      toast.success("Frais enregistré");
      onFermer();
    },
    onError: (e) => toast.error(e.message),
  });

  const valide = montant !== null && montant > 0 && (devise === "XOF" || (taux ?? 0) > 0);
  const envoyer = () => {
    if (!valide) return;
    enregistrer.executer({
      p_org: org.id,
      p_data: {
        id,
        portee,
        vehicule_id: vehiculeId ?? null,
        expedition_id: expeditionId ?? null,
        categorie,
        libelle: libelle.trim() || null,
        montant,
        devise,
        taux: devise === "XOF" ? 1 : taux,
        date,
        statut,
        compte_id: statut === "paye" && compte ? compte : null,
        fournisseur: fournisseur.trim() || null,
        repartition: portee === "expedition" ? repartition : null,
      },
    });
  };

  return (
    <Feuille
      ouverte={ouverte}
      onFermer={onFermer}
      titre={titre ?? "Ajouter un frais"}
      description={portee === "expedition" ? "Réparti entre les véhicules de l'expédition." : undefined}
      pleinEcran
      pied={
        <>
          <Bouton variante="secondaire" onClick={onFermer}>Annuler</Bouton>
          <Bouton variante="primaire" onClick={envoyer} disabled={!valide} chargement={enregistrer.isPending}>Enregistrer</Bouton>
        </>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); envoyer(); }}>
        <Selection libelle="Catégorie" value={categorie} onChange={(e) => setCategorie(e.target.value)}
          options={categories.map(([code, c]) => ({ valeur: code, libelle: c.libelle }))} />
        <ChampMontant
          libelle="Montant"
          valeur={montant}
          onChange={setMontant}
          devise={devise}
          devises={["XOF", "USD", "EUR"]}
          onDevise={setDevise}
          taux={devise === "XOF" ? null : taux}
          autoFocus
        />
        {devise !== "XOF" && (
          <ChampMontant libelle={`Taux appliqué (FCFA pour 1 ${devise === "USD" ? "$" : "€"})`} valeur={taux} onChange={setTaux}
            aide={devise === "EUR" ? "Parité fixe du franc CFA : 655,957." : "Le taux du jour de paiement : il reste attaché à ce frais."} />
        )}
        <Champ libelle="Libellé" facultatif placeholder={portee === "generale" ? "Loyer de septembre" : "Facture Copart n° 48213377"} value={libelle} onChange={(e) => setLibelle(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Champ libelle="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Selection libelle="Statut" value={statut} onChange={(e) => setStatut(e.target.value as "paye" | "a_payer")}
            options={[{ valeur: "paye", libelle: "Payé" }, { valeur: "a_payer", libelle: "À payer" }]} />
        </div>
        {statut === "paye" && comptes && comptes.length > 0 && (
          <Selection libelle="Payé depuis" vide="Caisse (par défaut)" value={compte} onChange={(e) => setCompte(e.target.value)}
            options={comptes.filter((c) => c.actif).map((c) => ({ valeur: c.id, libelle: c.nom }))} />
        )}
        <Champ libelle="Fournisseur" facultatif placeholder="Transitaire, garage, transporteur…" value={fournisseur} onChange={(e) => setFournisseur(e.target.value)} />
        {portee === "expedition" && (
          <Selection libelle="Répartition entre les véhicules" value={repartition} onChange={(e) => setRepartition(e.target.value as "egale" | "valeur")}
            options={[{ valeur: "egale", libelle: "Parts égales" }, { valeur: "valeur", libelle: "Au prorata du prix d'achat" }]} />
        )}
        {montant !== null && devise !== "XOF" && taux ? (
          <p className="rounded-controle bg-surface-2 px-3 py-2 text-[14px] text-encre-2">
            Compté dans le coût de revient pour <strong className="chiffres text-encre">{formatFCFA(montant * taux)}</strong>.
          </p>
        ) : null}
      </form>
    </Feuille>
  );
}
