"use client";

import { useLecture } from "@/lib/api/requetes";
import type { TableauDeBord, Vehicule } from "@/lib/api/types";
import type { ClientListe, ExpeditionListe, VenteListe } from "@/lib/api/types-metier";
import type { CleCompteur } from "@/components/coque/navigation";
import { useSession } from "@/lib/session";
import { aVerifier } from "@/lib/workflow";
import { pluriel } from "@/lib/format";

export interface Compteur {
  valeur: number;
  /** Ce que compte le chiffre, pour l'infobulle et les lecteurs d'écran. */
  sens: string;
  /**
   * « action » : des éléments attendent l'utilisateur (badge plein).
   * « statut » : un état à connaître, rien à traiter (badge discret, contour seul). Jamais un total d'inventaire.
   */
  genre: "action" | "statut";
  /** Action urgente (retard, échéance dépassée) : rouge. */
  alerte?: boolean;
}

/**
 * Chiffres affichés à côté de chaque section de la navigation. Un badge signale ce qui attend l'utilisateur, jamais un
 * total (« 23 véhicules » n'est pas une tâche). Les requêtes sont les mêmes que celles des pages (même clé de cache) :
 * pas d'appel en plus quand la page est déjà chargée.
 */
export function useCompteursNavigation(): Partial<Record<CleCompteur, Compteur>> {
  const { etat } = useSession();
  const org = etat.statut === "connecte" ? etat.org?.id : undefined;
  const actif = { enabled: !!org, staleTime: 60_000 };
  const bord = useLecture<TableauDeBord>("tableau_de_bord", { p_org: org }, actif);
  const parc = useLecture<Vehicule[]>("vehicules_lister", { p_org: org, p_filtres: {} }, actif);
  const ventes = useLecture<VenteListe[]>("ventes_lister", { p_org: org, p_filtres: { statut: "active" } }, actif);
  const exp = useLecture<ExpeditionListe[]>("expeditions_lister", { p_org: org, p_filtres: {} }, actif);
  const clients = useLecture<ClientListe[]>("clients_lister", { p_org: org, p_recherche: null }, actif);

  const r: Partial<Record<CleCompteur, Compteur>> = {};
  const urgents = bord.data?.actions.filter((a) => a.gravite === "haute").length;
  if (urgents) r.accueil = { valeur: urgents, sens: pluriel(urgents, "urgence"), genre: "action", alerte: true };
  // Parc : le même sous-ensemble que le filtre « À vérifier » de la page (étape en désaccord avec le conteneur).
  const aControler = parc.data ? aVerifier(parc.data).length : 0;
  if (aControler) r.parc = { valeur: aControler, sens: `${pluriel(aControler, "véhicule")} à vérifier`, genre: "action" };
  const aEncaisser = ventes.data?.filter((v) => v.reste_xof > 0).length;
  if (aEncaisser) r.ventes = { valeur: aEncaisser, sens: `${pluriel(aEncaisser, "vente")} à encaisser`, genre: "action", alerte: ventes.data?.some((v) => v.retard_xof > 0) };
  // Clients : les demandes de véhicule encore ouvertes (filtre « Cherchent » de la page), pas le nombre de fiches.
  const demandes = clients.data?.reduce((s, c) => s + c.nb_demandes_ouvertes, 0);
  if (demandes) r.clients = { valeur: demandes, sens: `${pluriel(demandes, "demande")} de véhicule en attente`, genre: "action" };
  // Expéditions : un état (ce qui navigue), pas une tâche : badge discret.
  const enMer = exp.data?.filter((e) => e.statut === "en_mer").length;
  if (enMer) r.expeditions = { valeur: enMer, sens: `${pluriel(enMer, "conteneur")} en mer`, genre: "statut" };
  return r;
}
