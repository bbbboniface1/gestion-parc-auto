"use client";

import { useLecture } from "@/lib/api/requetes";
import { useOrg } from "@/lib/session";
import { CATEGORIES_FRAIS } from "@/lib/domaine";
import { formatDate } from "@/lib/format";
import { EnTeteSection } from "@/components/parametres/en-tete-section";
import { EtatErreur, EtatVide, SqueletteListe } from "@/components/ui/etats";
import { Code } from "@/components/ui/signature";

interface Ligne {
  id: string; created_at: string; user_nom: string | null; action: string; entite: string | null; entite_id: string | null;
  details: Record<string, unknown> | null;
}

const ACTIONS: Record<string, string> = {
  vehicule_creer: "Véhicule ajouté", vehicule_modifier: "Véhicule modifié", vehicule_reserver: "Véhicule réservé", vehicule_liberer: "Réservation levée",
  vehicule_etape: "Étape du véhicule", vehicule_archiver: "Véhicule archivé", vehicule_desarchiver: "Véhicule désarchivé",
  vente_creer: "Vente enregistrée", vente_annuler: "Vente annulée", vente_livrer: "Vente livrée",
  paiement_ajouter: "Encaissement", remboursement_ajouter: "Remboursement", paiement_annuler: "Paiement annulé",
  frais_creer: "Frais saisi", frais_modifier: "Frais modifié", frais_supprimer: "Frais supprimé",
  client_creer: "Client ajouté", client_modifier: "Client modifié", client_supprimer: "Client supprimé",
  expedition_creer: "Expédition créée", expedition_modifier: "Expédition modifiée", expedition_statut: "Statut d'expédition", expedition_affecter: "Véhicules affectés",
  proforma_creer: "Proforma émise", proforma_statut: "Proforma", proforma_convertir: "Proforma convertie",
  parametres_enregistrer: "Paramètres modifiés", invitation_creer: "Invitation créée", invitation_annuler: "Invitation annulée", membre_modifier: "Membre modifié",
  invitation_accepter: "Invitation acceptée", organisation_creer: "Entreprise créée",
  referentiel_creer: "Élément logistique ajouté", referentiel_modifier: "Élément logistique modifié", referentiel_supprimer: "Élément logistique retiré",
  compte_creer: "Compte créé", compte_modifier: "Compte modifié", transfert_creer: "Transfert", transfert_supprimer: "Transfert supprimé",
  demande_creer: "Demande client", demande_modifier: "Demande modifiée", photo_ajouter: "Photo ajoutée", photo_supprimer: "Photo retirée",
  document_ajouter: "Document ajouté", document_supprimer: "Document retiré",
};

/** Libellé d'une action ; une action pas encore traduite s'affiche lisiblement (« Vehicule xyz »), jamais en identifiant brut. */
function libelleAction(action: string): string {
  const connu = ACTIONS[action];
  if (connu) return connu;
  const texte = action.replace(/_/g, " ");
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

/** Résumé lisible : les champs qui identifient l'opération (numéro, référence, nom), pas le JSON brut. */
function resume(d: Ligne["details"]): string {
  if (!d) return "";
  const cles = ["numero", "numero_avoir", "numero_recu", "reference", "vehicule", "nom", "client", "categorie", "motif"];
  return cles
    .map((c) => (c === "categorie" && typeof d[c] === "string" ? CATEGORIES_FRAIS[d[c] as string]?.libelle ?? d[c] : d[c]))
    .filter((v) => typeof v === "string" || typeof v === "number").slice(0, 3).join(" · ");
}

/** Lignes regroupées par jour (la liste arrive du plus récent au plus ancien) : la date n'est écrite qu'une fois. */
function parJour(lignes: Ligne[]): { jour: string; lignes: Ligne[] }[] {
  const groupes: { jour: string; lignes: Ligne[] }[] = [];
  for (const l of lignes) {
    const jour = formatDate(l.created_at);
    const dernier = groupes.at(-1);
    if (dernier?.jour === jour) dernier.lignes.push(l); else groupes.push({ jour, lignes: [l] });
  }
  return groupes;
}

export default function PageJournal() {
  const org = useOrg();
  const { data, error, isPending, refetch } = useLecture<Ligne[]>("journal_lister", { p_org: org.id, p_filtres: { limite: 150 } });
  return (
    <>
      <EnTeteSection cle="journal" titre="Journal" sousTitre="Qui a fait quoi, et quand. Les 150 dernières opérations." />
      {error && !data ? <EtatErreur erreur={error} onReessayer={() => void refetch()} /> : isPending ? <SqueletteListe /> : !data?.length ? <EtatVide titre="Rien à afficher" /> : (
        <div className="flex flex-col gap-4 lg:gap-6">
          {parJour(data).map((g) => (
            <section key={g.jour}>
              <h2 className="chiffres etiquette mb-2 px-1 text-[12px] text-encre-3">{g.jour}</h2>
              <ul className="overflow-hidden carte">
                {g.lignes.map((l) => {
                  const detail = resume(l.details);
                  return (
                    // Téléphone : l'action sur toute la largeur, puis la référence et l'auteur dessous ; rien n'est tronqué.
                    <li key={l.id} className="flex flex-col gap-1 border-b border-trait px-4 py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{libelleAction(l.action)}</p>
                        {detail && <p className="text-[12px] text-encre-3 [overflow-wrap:anywhere] sm:truncate"><Code className="text-[12px]">{detail}</Code></p>}
                      </div>
                      <span className="text-[12px] text-encre-3 sm:shrink-0 sm:text-[14px] sm:text-encre-2">{l.user_nom ?? "—"}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
