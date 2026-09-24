"use client";

import { useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { modeActuel, rpc } from "@/lib/api/client";
import type { Vehicule } from "@/lib/api/types";
import type { ClientListe, VenteListe } from "@/lib/api/types-metier";
import { useOrg } from "@/lib/session";
import { peut } from "@/lib/domaine";
import { genererCSV, telechargerCSV } from "@/lib/csv";
import { aujourdhui } from "@/lib/format";
import { EnTetePage } from "@/components/coque/coque";
import { Groupe } from "@/components/parametres/commun";
import { Bouton } from "@/components/ui/bouton";

export default function PageDonnees() {
  const org = useOrg();
  const [en, setEn] = useState<string | null>(null);
  const demo = modeActuel() === "demo";
  const voitCouts = peut(org.role, "voirTresorerie");

  async function exporter(quoi: "vehicules" | "ventes" | "clients") {
    setEn(quoi);
    try {
      if (quoi === "vehicules") {
        const l = await rpc<Vehicule[]>("vehicules_lister", { p_org: org.id, p_filtres: { inclure_archives: true } });
        telechargerCSV(`vehicules-${aujourdhui()}`, genererCSV<Vehicule>([
          { titre: "Référence", valeur: (v) => v.reference }, { titre: "VIN", valeur: (v) => v.vin }, { titre: "Marque", valeur: (v) => v.marque },
          { titre: "Modèle", valeur: (v) => v.modele }, { titre: "Année", valeur: (v) => v.annee }, { titre: "Étape", valeur: (v) => v.etape },
          { titre: "Statut", valeur: (v) => v.statut_commercial }, { titre: "Lot", valeur: (v) => v.lot_numero },
          { titre: "Prix affiché", valeur: (v) => v.prix_affiche_xof, decimales: 0 },
          ...(voitCouts ? [{ titre: "Prix de revient", valeur: (v: Vehicule) => v.prix_revient_xof, decimales: 0 }] : []),
        ], l));
      } else if (quoi === "ventes") {
        const l = await rpc<VenteListe[]>("ventes_lister", { p_org: org.id, p_filtres: {} });
        telechargerCSV(`ventes-${aujourdhui()}`, genererCSV<VenteListe>([
          { titre: "Facture", valeur: (v) => v.numero }, { titre: "Date", valeur: (v) => new Date(v.date_vente) }, { titre: "Client", valeur: (v) => v.client_nom },
          { titre: "Véhicule", valeur: (v) => v.vehicule_libelle }, { titre: "Total TTC", valeur: (v) => v.montant_ttc, decimales: 0 },
          { titre: "Encaissé", valeur: (v) => v.encaisse_xof, decimales: 0 }, { titre: "Reste", valeur: (v) => v.reste_xof, decimales: 0 },
          { titre: "Statut", valeur: (v) => v.statut }, { titre: "Avoir", valeur: (v) => v.numero_avoir },
        ], l));
      } else {
        const l = await rpc<ClientListe[]>("clients_lister", { p_org: org.id, p_recherche: null });
        telechargerCSV(`clients-${aujourdhui()}`, genererCSV<ClientListe>([
          { titre: "Nom", valeur: (c) => c.nom }, { titre: "Téléphone", valeur: (c) => c.telephone }, { titre: "Ville", valeur: (c) => c.ville },
          { titre: "Achats", valeur: (c) => c.nb_achats }, { titre: "Total achats", valeur: (c) => c.total_achats_xof, decimales: 0 }, { titre: "Reste dû", valeur: (c) => c.reste_du_xof, decimales: 0 },
        ], l));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export impossible");
    } finally {
      setEn(null);
    }
  }

  return (
    <>
      <EnTetePage titre="Données" sousTitre="Vos informations vous appartiennent : exportez-les à tout moment." />
      <div className="border-t-2 border-encre pt-4">
        <Groupe titre="Exports Excel" description="Fichiers CSV qui s'ouvrent directement dans Excel, accents et virgules décimales compris.">
          {([["vehicules", "Tous les véhicules"], ["ventes", "Toutes les ventes"], ["clients", "Tous les clients"]] as const).map(([cle, libelle]) => (
            <Bouton key={cle} className="self-start" icone={<Download className="size-4" />} chargement={en === cle} onClick={() => void exporter(cle)}>{libelle}</Bouton>
          ))}
        </Groupe>
        {demo ? (
          <Groupe titre="Démonstration" description="Vous travaillez sur une entreprise fictive, dans ce navigateur uniquement. Rien n'est envoyé à un serveur.">
            <Bouton variante="danger" className="self-start" icone={<RotateCcw className="size-4" />} onClick={async () => {
              if (!window.confirm("Effacer la démonstration et repartir de données neuves ?")) return;
              const { reinitialiserDemo } = await import("@/lib/demo/moteur");
              await reinitialiserDemo();
              window.location.href = "/accueil/";
            }}>Réinitialiser la démonstration</Bouton>
          </Groupe>
        ) : (
          <Groupe titre="Sauvegarde" description="Vos données sont sauvegardées automatiquement par votre hébergeur de base de données (Supabase). Les exports ci-dessus sont une copie de plus, à vous.">
            <p className="text-corps text-encre-2">Conservez un export mensuel des ventes et des clients dans un dossier à part.</p>
          </Groupe>
        )}
      </div>
    </>
  );
}
