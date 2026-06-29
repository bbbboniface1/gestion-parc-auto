import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFCFA(montant: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0,
  }).format(montant);
}

export function formatUSD(montant: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(montant);
}

export function calculerStatutPaiement(
  prixVente: number,
  montantRecu: number
): "non_paye" | "partiel" | "paye" {
  if (montantRecu === 0) return "non_paye";
  if (montantRecu >= prixVente) return "paye";
  return "partiel";
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateShort(date: string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export async function getProchainNumeroFacture(
  supabase: ReturnType<typeof import("./supabase/client").createClient>
): Promise<string> {
  const annee = new Date().getFullYear();
  const { count } = await supabase
    .from("ventes")
    .select("*", { count: "exact", head: true })
    .like("numero_facture", `FAC-${annee}-%`);

  const numero = String((count || 0) + 1).padStart(3, "0");
  return `FAC-${annee}-${numero}`;
}

export function getVoitureTitre(voiture: {
  marque: string;
  modele: string;
  annee: number;
}): string {
  return `${voiture.marque} ${voiture.modele} ${voiture.annee}`;
}

export function formatFCFAPdf(montant: number): string {
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(montant);
  return `${formatted} FCFA`;
}

export function getResteAPayer(prixVente: number, montantRecu: number): number {
  return Math.max(0, prixVente - montantRecu);
}

export function isVenteActive(vente: { status?: string | null }): boolean {
  return !vente.status || vente.status === "active";
}
