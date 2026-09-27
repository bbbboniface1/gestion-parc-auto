"use client";

import { useLecture } from "@/lib/api/requetes";
import type { TableauDeBord, Vehicule } from "@/lib/api/types";
import type { ClientListe, ExpeditionListe, VenteListe } from "@/lib/api/types-metier";
import type { CleCompteur } from "@/components/coque/navigation";
import { useSession } from "@/lib/session";

export interface Compteur {
  valeur: number;
  /** Ce que compte le chiffre, pour l'infobulle et les lecteurs d'écran. */
  sens: string;
  /** Rouge quand il y a urgence. */
  alerte?: boolean;
}

/**
 * Chiffres affichés à côté de chaque section de la navigation. Les requêtes sont les mêmes que celles des
 * pages (même clé de cache) : pas d'appel en plus quand la page est déjà chargée.
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
  if (urgents) r.accueil = { valeur: urgents, sens: `${urgents} urgence${urgents > 1 ? "s" : ""}`, alerte: true };
  if (parc.data) r.parc = { valeur: parc.data.length, sens: `${parc.data.length} véhicules` };
  const aEncaisser = ventes.data?.filter((v) => v.reste_xof > 0).length;
  if (aEncaisser) r.ventes = { valeur: aEncaisser, sens: `${aEncaisser} vente${aEncaisser > 1 ? "s" : ""} à encaisser`, alerte: ventes.data?.some((v) => v.retard_xof > 0) };
  const enMer = exp.data?.filter((e) => e.statut === "en_mer").length;
  if (enMer) r.expeditions = { valeur: enMer, sens: `${enMer} en mer` };
  if (clients.data) r.clients = { valeur: clients.data.length, sens: `${clients.data.length} clients` };
  return r;
}
