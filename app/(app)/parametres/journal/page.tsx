"use client";

import { useLecture } from "@/lib/api/requetes";
import { useOrg } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { EnTetePage } from "@/components/coque/coque";
import { EtatErreur, EtatVide, SqueletteListe } from "@/components/ui/etats";
import { Code } from "@/components/ui/signature";

interface Ligne {
  id: string; created_at: string; user_nom: string | null; action: string; entite: string | null; entite_id: string | null;
  details: Record<string, unknown> | null;
}

const ACTIONS: Record<string, string> = {
  vehicule_creer: "Véhicule ajouté", vehicule_modifier: "Véhicule modifié", vehicule_reserver: "Véhicule réservé", vehicule_liberer: "Réservation levée",
  vente_creer: "Vente enregistrée", vente_annuler: "Vente annulée", vente_livrer: "Vente livrée",
  paiement_ajouter: "Encaissement", remboursement_ajouter: "Remboursement", paiement_annuler: "Paiement annulé",
  frais_creer: "Frais saisi", frais_modifier: "Frais modifié", frais_supprimer: "Frais supprimé",
  client_creer: "Client ajouté", client_modifier: "Client modifié", client_supprimer: "Client supprimé",
  expedition_creer: "Expédition créée", expedition_modifier: "Expédition modifiée", expedition_statut: "Statut d'expédition", expedition_affecter: "Véhicules affectés",
  proforma_creer: "Proforma émise", proforma_statut: "Proforma", proforma_convertir: "Proforma convertie",
  parametres_enregistrer: "Paramètres modifiés", invitation_creer: "Invitation créée", invitation_annuler: "Invitation annulée", membre_modifier: "Membre modifié",
  compte_creer: "Compte créé", compte_modifier: "Compte modifié", transfert_creer: "Transfert", transfert_supprimer: "Transfert supprimé",
  demande_creer: "Demande client", demande_modifier: "Demande modifiée", photo_ajouter: "Photo ajoutée", photo_supprimer: "Photo retirée",
  document_ajouter: "Document ajouté", document_supprimer: "Document retiré",
};

/** Résumé lisible : les champs qui identifient l'opération (numéro, référence, nom), pas le JSON brut. */
function resume(d: Ligne["details"]): string {
  if (!d) return "";
  const cles = ["numero", "numero_avoir", "numero_recu", "reference", "vehicule", "nom", "client", "categorie", "motif"];
  return cles.map((c) => d[c]).filter((v) => typeof v === "string" || typeof v === "number").slice(0, 3).join(" · ");
}

export default function PageJournal() {
  const org = useOrg();
  const { data, error, isPending, refetch } = useLecture<Ligne[]>("journal_lister", { p_org: org.id, p_filtres: { limite: 150 } });
  return (
    <>
      <EnTetePage titre="Journal" sousTitre="Qui a fait quoi, et quand. Les 150 dernières opérations." />
      {error && !data ? <EtatErreur erreur={error} onReessayer={() => void refetch()} /> : isPending ? <SqueletteListe /> : !data?.length ? <EtatVide titre="Rien à afficher" /> : (
        <ul className="overflow-hidden rounded-carte border border-trait bg-surface">
          {data.map((l) => (
            <li key={l.id} className="flex items-start gap-3 border-b border-trait px-4 py-3 last:border-b-0">
              <span className="chiffres w-24 shrink-0 pt-0.5 text-[13px] text-encre-3">{formatDate(l.created_at)}</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{ACTIONS[l.action] ?? l.action.replace(/_/g, " ")}</p>
                <p className="truncate text-[13px] text-encre-3"><Code className="text-[12px]">{resume(l.details)}</Code></p>
              </div>
              <span className="shrink-0 text-[13px] text-encre-2">{l.user_nom ?? "—"}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
