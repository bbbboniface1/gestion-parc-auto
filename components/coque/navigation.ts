import { Banknote, Car, Home, LayoutGrid, Settings, Ship, Users, Calculator, type LucideIcon } from "lucide-react";

export interface EntreeNavigation {
  href: string;
  libelle: string;
  icone: LucideIcon;
  /** Préfixes d'URL qui rendent l'entrée active */
  actif: string[];
}

export const NAVIGATION_PRINCIPALE: EntreeNavigation[] = [
  { href: "/accueil/", libelle: "Aujourd'hui", icone: Home, actif: ["/accueil"] },
  { href: "/parc/", libelle: "Parc", icone: Car, actif: ["/parc"] },
  { href: "/ventes/", libelle: "Ventes", icone: Banknote, actif: ["/ventes"] },
  { href: "/clients/", libelle: "Clients", icone: Users, actif: ["/clients"] },
  { href: "/expeditions/", libelle: "Expéditions", icone: Ship, actif: ["/expeditions"] },
  { href: "/finances/", libelle: "Finances", icone: LayoutGrid, actif: ["/finances"] },
];

export const NAVIGATION_SECONDAIRE: EntreeNavigation[] = [
  { href: "/outils/simulateur/", libelle: "Simulateur d'enchère", icone: Calculator, actif: ["/outils"] },
  { href: "/parametres/", libelle: "Paramètres", icone: Settings, actif: ["/parametres"] },
];

export function estActif(chemin: string, entree: EntreeNavigation): boolean {
  return entree.actif.some((p) => chemin === p || chemin.startsWith(`${p}/`));
}
