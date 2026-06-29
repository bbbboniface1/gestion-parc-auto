import type { StatutVoiture, PaiementFournisseur, StatutPaiement } from "@/types";

export const STATUTS_VOITURE: {
  value: StatutVoiture;
  label: string;
  shortLabel: string;
  bg: string;
  text: string;
  icon: string;
}[] = [
  {
    value: "commande",
    label: "Commandée",
    shortLabel: "Commandée",
    bg: "bg-gray-100",
    text: "text-gray-600",
    icon: "🟡",
  },
  {
    value: "en_transit",
    label: "En route",
    shortLabel: "En route",
    bg: "bg-blue-100",
    text: "text-blue-700",
    icon: "🔵",
  },
  {
    value: "arrivee",
    label: "Au port",
    shortLabel: "Au port",
    bg: "bg-purple-100",
    text: "text-purple-700",
    icon: "🟣",
  },
  {
    value: "en_stock",
    label: "En stock",
    shortLabel: "En stock",
    bg: "bg-green-100",
    text: "text-green-700",
    icon: "🟢",
  },
  {
    value: "vendue",
    label: "Vendue",
    shortLabel: "Vendue",
    bg: "bg-orange-100",
    text: "text-orange-700",
    icon: "🟠",
  },
];

export const PAIEMENT_FOURNISSEUR: {
  value: PaiementFournisseur;
  label: string;
  filterLabel: string;
  bg: string;
  text: string;
}[] = [
  { value: "non_paye", label: "Non payé", filterLabel: "Non payées ✗", bg: "bg-red-100", text: "text-red-700" },
  { value: "partiel", label: "Partiel", filterLabel: "Partielles ⚠️", bg: "bg-yellow-100", text: "text-yellow-700" },
  { value: "paye", label: "Payé", filterLabel: "Payées ✓", bg: "bg-emerald-500", text: "text-white" },
];

export const STATUT_PAIEMENT: {
  value: StatutPaiement;
  label: string;
  bg: string;
  text: string;
}[] = [
  { value: "non_paye", label: "Non payé", bg: "bg-red-100", text: "text-red-700" },
  { value: "partiel", label: "Partiel", bg: "bg-yellow-100", text: "text-yellow-700" },
  { value: "paye", label: "Payé", bg: "bg-emerald-500", text: "text-white" },
];

export const CARBURANTS = ["Essence", "Diesel", "Hybride", "Électrique"] as const;

export const TRANSMISSIONS = ["Automatique", "Manuelle"] as const;

export const MODES_PAIEMENT = [
  "Espèces",
  "Virement",
  "Orange Money",
  "Wave",
  "Chèque",
] as const;

export const STATUT_VENTE: {
  value: import("@/types").StatutVente;
  label: string;
  bg: string;
  text: string;
}[] = [
  { value: "active", label: "Active", bg: "bg-emerald-100", text: "text-emerald-700" },
  { value: "annulee", label: "Annulée", bg: "bg-red-100", text: "text-red-700" },
];

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Accueil", emoji: "🏠", icon: "Home" },
  { href: "/voitures", label: "Voitures", emoji: "🚗", icon: "Car" },
  { href: "/stock", label: "Stock", emoji: "📦", icon: "Package" },
  { href: "/ventes", label: "Factures", emoji: "📄", icon: "FileText" },
  { href: "/finances", label: "Finances", emoji: "💰", icon: "Wallet" },
  { href: "/parametres", label: "Paramètres", emoji: "⚙️", icon: "Settings" },
] as const;

export function getStatutVenteConfig(statut: import("@/types").StatutVente) {
  return STATUT_VENTE.find((s) => s.value === statut) ?? STATUT_VENTE[0];
}

export function getStatutConfig(statut: StatutVoiture) {
  return STATUTS_VOITURE.find((s) => s.value === statut) ?? STATUTS_VOITURE[0];
}

export function getPaiementConfig(paiement: PaiementFournisseur) {
  return PAIEMENT_FOURNISSEUR.find((p) => p.value === paiement) ?? PAIEMENT_FOURNISSEUR[0];
}

export function getStatutPaiementConfig(statut: StatutPaiement) {
  return STATUT_PAIEMENT.find((s) => s.value === statut) ?? STATUT_PAIEMENT[0];
}

export const STATUT_ORDER: StatutVoiture[] = [
  "commande",
  "en_transit",
  "arrivee",
  "en_stock",
  "vendue",
];
