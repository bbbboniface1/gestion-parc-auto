import { Boat, Car, Gauge, Gavel, GearSix, Invoice, UsersThree, Wallet, type Icon } from "@phosphor-icons/react";
import { peut, type PERMISSIONS, type Role } from "@/lib/domaine";

export type CleCompteur = "accueil" | "parc" | "ventes" | "expeditions" | "clients";

export interface EntreeNavigation {
  href: string;
  libelle: string;
  /** Ce que la section contient, en une ligne (menu du téléphone). */
  description: string;
  icone: Icon;
  couleur: string;
  /** Préfixes d'URL qui rendent l'entrée active */
  actif: string[];
  compteur?: CleCompteur;
  /** Droit nécessaire pour voir l'entrée (aucun : visible par tous). */
  permission?: keyof typeof PERMISSIONS;
}

export const NAVIGATION_PRINCIPALE: EntreeNavigation[] = [
  { href: "/accueil/", libelle: "Tableau de bord", description: "Capital, ventes du mois, urgences", icone: Gauge, couleur: "var(--primaire)", actif: ["/accueil"], compteur: "accueil" },
  { href: "/parc/", libelle: "Parc", description: "Véhicules, de l'enchère au parc", icone: Car, couleur: "var(--etape-achete)", actif: ["/parc"], compteur: "parc" },
  { href: "/ventes/", libelle: "Ventes", description: "Factures, proformas, encaissements", icone: Invoice, couleur: "var(--gain)", actif: ["/ventes"], compteur: "ventes" },
  { href: "/clients/", libelle: "Clients", description: "Acheteurs, demandes, reste dû", icone: UsersThree, couleur: "var(--reserve)", actif: ["/clients"], compteur: "clients" },
  { href: "/expeditions/", libelle: "Expéditions", description: "Conteneurs, navires, arrivées", icone: Boat, couleur: "var(--etape-en-mer)", actif: ["/expeditions"], compteur: "expeditions" },
  { href: "/finances/", libelle: "Finances", description: "Trésorerie, dépenses, rentabilité", icone: Wallet, couleur: "var(--accent)", actif: ["/finances"], permission: "voirTresorerie" },
];

export const NAVIGATION_SECONDAIRE: EntreeNavigation[] = [
  { href: "/outils/simulateur/", libelle: "Simulateur d'enchère", description: "Prix maximum à miser, rendu Bamako", icone: Gavel, couleur: "var(--ocre)", actif: ["/outils"] },
  { href: "/parametres/", libelle: "Paramètres", description: "Entreprise, factures, équipe", icone: GearSix, couleur: "var(--encre-3)", actif: ["/parametres"] },
];

/** Entrées que ce rôle a le droit d'ouvrir. */
export function entreesPour(entrees: EntreeNavigation[], role: Role): EntreeNavigation[] {
  return entrees.filter((e) => !e.permission || peut(role, e.permission));
}

export function estActif(chemin: string, entree: EntreeNavigation): boolean {
  return entree.actif.some((p) => chemin === p || chemin.startsWith(`${p}/`));
}
