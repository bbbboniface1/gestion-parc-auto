// Passage d'une vente (ou d'une proforma) telle que renvoyée par l'API au document à imprimer.
//
// Fonctions pures : aucune lecture réseau, aucun accès au navigateur. L'entreprise, le client
// et le véhicule viennent du « snapshot » figé à l'émission : modifier aujourd'hui la fiche du
// client ou les coordonnées de l'entreprise ne change jamais une facture déjà remise.
// Les paramètres actuels ne servent que de repli pour une vente sans snapshot.
//
// Logo, cachet et signature : le document porte d'abord le CHEMIN de stockage ; `avecImages`
// le remplace par une adresse lisible (`urlFichier`) juste avant `genererPDF`.

import type { Parametres } from "@/lib/api/parametres";
import { CARBURANTS, TRANSMISSIONS } from "@/lib/domaine";
import type {
  ClientDocument,
  DonneesDocument,
  EcheanceDocument,
  EntrepriseDocument,
  LigneDocument,
  PaiementDocument,
  VehiculeDocument,
} from "./types";

// ─── Formes d'entrée (sous-ensembles des réponses de vente_obtenir / proforma_obtenir) ─────

export interface SnapshotEntreprise {
  nom_commercial?: string | null;
  raison_sociale?: string | null;
  slogan?: string | null;
  adresse?: string | null;
  ville?: string | null;
  pays?: string | null;
  telephones?: string[] | null;
  whatsapp?: string | null;
  email?: string | null;
  site_web?: string | null;
  nif?: string | null;
  rccm?: string | null;
  compte_bancaire?: string | null;
  logo_path?: string | null;
  cachet_path?: string | null;
  signature_path?: string | null;
  couleur_documents?: string | null;
  mention_tva?: string | null;
  conditions_vente?: string | null;
  pied_document?: string | null;
  garantie_texte?: string | null;
  montant_en_lettres?: boolean | null;
  qr_verification?: boolean | null;
  tva_active?: boolean | null;
  unite_compteur?: string | null;
}

export interface SnapshotClient {
  nom?: string | null;
  telephone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  ville?: string | null;
  adresse?: string | null;
  type_piece?: string | null;
  numero_piece?: string | null;
}

export interface SnapshotVehicule {
  reference?: string | null;
  marque?: string | null;
  modele?: string | null;
  finition?: string | null;
  annee?: number | null;
  couleur?: string | null;
  vin?: string | null;
  kilometrage_km?: number | null;
  carburant?: string | null;
  transmission?: string | null;
  moteur?: string | null;
  immatriculation?: string | null;
  lot_numero?: string | null;
  etape?: string | null;
  titre?: string | null;
}

/** Photographie figée à l'émission (prive.snapshot_document + vendeur et taux de TVA). */
export interface SnapshotDocument {
  entreprise?: SnapshotEntreprise | null;
  client?: SnapshotClient | null;
  vehicule?: SnapshotVehicule | null;
  mention_livraison?: string | null;
  vendeur_nom?: string | null;
  tva_taux?: number | null;
}

export type StatutEcheance = "payee" | "partielle" | "en_retard" | "a_venir";

export interface PaiementPourDocument {
  id: string;
  numero_recu: string;
  date: string;
  montant_xof: number;
  mode: string;
  reference: string | null;
  annule: boolean;
  motif_annulation?: string | null;
}

export interface EcheancePourDocument {
  date_echeance: string;
  montant_xof: number;
  statut?: StatutEcheance | null;
}

/** Client et véhicule « vivants » : repli pour une vente enregistrée sans snapshot. */
interface ClientRepli {
  nom: string;
  telephone?: string | null;
  adresse?: string | null;
  ville?: string | null;
  type_piece?: string | null;
  numero_piece?: string | null;
}

interface VehiculeRepli {
  reference?: string | null;
  marque?: string | null;
  modele?: string | null;
  annee?: number | null;
  vin?: string | null;
  etape?: string | null;
}

export interface VentePourDocument {
  numero: string;
  date_vente: string;
  statut: "active" | "annulee";
  prix_xof: number;
  remise_xof: number;
  tva_taux: number;
  montant_ht: number;
  montant_tva: number;
  montant_ttc: number;
  numero_avoir?: string | null;
  annulee_le?: string | null;
  motif_annulation?: string | null;
  snapshot: SnapshotDocument | null;
  client?: ClientRepli | null;
  vehicule?: VehiculeRepli | null;
  paiements?: PaiementPourDocument[];
  echeances?: EcheancePourDocument[];
}

export interface ProformaPourDocument {
  numero: string;
  date: string;
  valide_jusqu_au: string | null;
  statut: string;
  prix_xof: number;
  remise_xof: number;
  tva_taux: number;
  montant_ht: number;
  montant_tva: number;
  montant_ttc: number;
  snapshot: SnapshotDocument | null;
  client?: ClientRepli | null;
  client_nom?: string | null;
  client_telephone?: string | null;
  vehicule?: VehiculeRepli | null;
}

/** Ce qu'il faut des paramètres actuels : le repli, et rien d'autre. */
export type ParametresDocument = Pick<
  Parametres,
  | "nom_commercial" | "raison_sociale" | "slogan" | "adresse" | "ville" | "pays" | "telephones" | "whatsapp"
  | "email" | "site_web" | "nif" | "rccm" | "compte_bancaire" | "logo_path" | "cachet_path" | "signature_path"
  | "couleur_documents" | "mention_tva" | "conditions_vente" | "pied_document" | "garantie_texte"
  | "montant_en_lettres" | "qr_verification" | "tva_active"
>;

// ─── Aides ───────────────────────────────────────────────────────────────────────────

/** Mention par défaut quand la TVA ne s'applique pas et qu'aucune mention n'est réglée. */
export const MENTION_SANS_TVA = "TVA non applicable.";

const PIECES: Record<string, string> = { NINA: "NINA", CNI: "CNI", passeport: "Passeport", autre: "Pièce" };

const nombre = (v: number | string | null | undefined): number => {
  const n = typeof v === "string" ? Number(v) : v ?? 0;
  return Number.isFinite(n) ? n : 0;
};

/** « 2026-05-18T11:00:00+00:00 » → « 2026-05-18 » (jour local) ; une date SQL passe telle quelle. */
export function jourLocal(valeur: string | null | undefined): string | null {
  if (!valeur) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(valeur)) return valeur;
  const d = new Date(valeur);
  if (Number.isNaN(d.getTime())) return valeur.slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Entreprise figée si le snapshot la contient (valeurs nulles comprises), sinon les paramètres actuels. */
function sourceEntreprise(snapshot: SnapshotDocument | null | undefined, p: ParametresDocument): SnapshotEntreprise {
  return snapshot?.entreprise ?? p;
}

function entreprise(e: SnapshotEntreprise, p: ParametresDocument): EntrepriseDocument {
  return {
    nom: e.nom_commercial || p.nom_commercial,
    raison_sociale: e.raison_sociale ?? null,
    slogan: e.slogan ?? null,
    adresse: e.adresse ?? null,
    ville: e.ville ?? null,
    pays: e.pays ?? null,
    telephones: e.telephones ?? [],
    whatsapp: e.whatsapp ?? null,
    email: e.email ?? null,
    site_web: e.site_web ?? null,
    nif: e.nif ?? null,
    rccm: e.rccm ?? null,
    compte_bancaire: e.compte_bancaire ?? null,
    // Chemins de stockage : résolus par `avecImages` au moment de générer.
    logo: e.logo_path ?? null,
    cachet: e.cachet_path ?? null,
    signature: e.signature_path ?? null,
  };
}

function client(snapshot: SnapshotDocument | null | undefined, repli: ClientRepli | null | undefined, nomRepli?: string | null, telRepli?: string | null): ClientDocument {
  const c = snapshot?.client;
  const source = c ?? repli ?? null;
  const type = source?.type_piece ?? null;
  return {
    nom: source?.nom || nomRepli || "Client",
    telephone: source?.telephone ?? telRepli ?? null,
    adresse: source?.adresse ?? null,
    ville: source?.ville ?? null,
    type_piece: type ? PIECES[type] ?? type : null,
    numero_piece: source?.numero_piece ?? null,
  };
}

function vehicule(snapshot: SnapshotDocument | null | undefined, repli: VehiculeRepli | null | undefined): VehiculeDocument | null {
  const v = snapshot?.vehicule;
  if (v) {
    return {
      marque: v.marque ?? "",
      modele: v.modele ?? "",
      annee: v.annee ?? null,
      finition: v.finition ?? null,
      vin: v.vin ?? null,
      couleur: v.couleur ?? null,
      kilometrage_km: v.kilometrage_km ?? null,
      carburant: v.carburant ? CARBURANTS[v.carburant] ?? v.carburant : null,
      transmission: v.transmission ? TRANSMISSIONS[v.transmission] ?? v.transmission : null,
      reference: v.reference ?? null,
    };
  }
  if (!repli) return null;
  return { marque: repli.marque ?? "", modele: repli.modele ?? "", annee: repli.annee ?? null, vin: repli.vin ?? null, reference: repli.reference ?? null };
}

/** « Toyota RAV4 XLE 2018 » */
export function designationVehicule(v: VehiculeDocument | null): string {
  if (!v) return "Véhicule";
  return [v.marque, v.modele, v.finition, v.annee].filter((x) => x !== null && x !== undefined && x !== "").join(" ") || "Véhicule";
}

function ligneVehicule(v: VehiculeDocument | null, snapshot: SnapshotDocument | null | undefined, montant: number): LigneDocument {
  const immat = snapshot?.vehicule?.immatriculation;
  const detail = [v?.reference ? `Réf. ${v.reference}` : null, immat ? `Immatriculation ${immat}` : null].filter(Boolean).join(" · ");
  return { designation: designationVehicule(v), detail: detail || null, montant };
}

/** La TVA d'un document est celle appliquée à l'émission (taux figé sur la vente), pas le réglage actuel. */
function tva(taux: number, e: SnapshotEntreprise) {
  const active = taux > 0;
  return { active, taux, mention: active ? e.mention_tva ?? null : e.mention_tva || MENTION_SANS_TVA };
}

function options(e: SnapshotEntreprise) {
  return {
    montant_en_lettres: e.montant_en_lettres ?? true,
    qr_verification: e.qr_verification ?? true,
    couleur: e.couleur_documents ?? null,
  };
}

function mentions(e: SnapshotEntreprise, avecGarantie: boolean) {
  return {
    conditions: e.conditions_vente ?? null,
    pied: e.pied_document ?? null,
    garantie: avecGarantie ? e.garantie_texte ?? null : null,
  };
}

function versPaiement(p: PaiementPourDocument): PaiementDocument {
  return { date: p.date, montant: nombre(p.montant_xof), mode: p.mode, reference: p.reference, numero_recu: p.numero_recu };
}

function versEcheance(e: EcheancePourDocument): EcheanceDocument {
  return { date: e.date_echeance, montant: nombre(e.montant_xof), ...(e.statut ? { statut: e.statut } : {}) };
}

function totaux(x: { montant_ht: number; montant_tva: number; montant_ttc: number }) {
  return { ht: nombre(x.montant_ht), tva: nombre(x.montant_tva), ttc: nombre(x.montant_ttc) };
}

// ─── Documents ───────────────────────────────────────────────────────────────────────

/**
 * Facture : versements non annulés, échéancier avec statut, tampon « ANNULÉE » si la vente l'est,
 * mention de livraison à l'arrivée si le véhicule n'était pas au parc à l'émission.
 */
export function documentFacture(vente: VentePourDocument, parametres: ParametresDocument, qrUrl: string | null): DonneesDocument {
  const e = sourceEntreprise(vente.snapshot, parametres);
  const v = vehicule(vente.snapshot, vente.vehicule);
  const opts = options(e);
  const annulee = vente.statut === "annulee";
  return {
    type: "facture",
    numero: vente.numero,
    date: vente.date_vente,
    annule: annulee,
    motif_annulation: annulee ? vente.motif_annulation ?? null : null,
    entreprise: entreprise(e, parametres),
    client: client(vente.snapshot, vente.client),
    vehicule: v,
    lignes: [ligneVehicule(v, vente.snapshot, nombre(vente.prix_xof))],
    remise: nombre(vente.remise_xof),
    tva: tva(nombre(vente.tva_taux), e),
    totaux: totaux(vente),
    paiements: (vente.paiements ?? []).filter((p) => !p.annule).map(versPaiement),
    echeances: (vente.echeances ?? []).map(versEcheance),
    livraison_a_l_arrivee: !!vente.snapshot?.mention_livraison,
    mentions: mentions(e, true),
    options: opts,
    url_verification: opts.qr_verification ? qrUrl : null,
  };
}

/**
 * Reçu d'un versement. « Total versé à ce jour » = versements non annulés jusqu'à celui-ci
 * inclus, dans l'ordre de la vente : réimprimé plus tard, le reçu dit toujours la même chose.
 */
export function documentRecu(vente: VentePourDocument, paiement: PaiementPourDocument, parametres: ParametresDocument): DonneesDocument {
  const e = sourceEntreprise(vente.snapshot, parametres);
  const v = vehicule(vente.snapshot, vente.vehicule);
  const tous = vente.paiements ?? [];
  const rang = tous.findIndex((p) => p.id === paiement.id);
  const jusquIci = rang >= 0 ? tous.slice(0, rang + 1) : [...tous, paiement];
  return {
    type: "recu",
    numero: paiement.numero_recu,
    date: paiement.date,
    annule: paiement.annule,
    motif_annulation: paiement.annule ? paiement.motif_annulation ?? null : null,
    reference_facture: vente.numero,
    entreprise: entreprise(e, parametres),
    client: client(vente.snapshot, vente.client),
    vehicule: v,
    lignes: [],
    tva: tva(nombre(vente.tva_taux), e),
    totaux: totaux(vente),
    paiements: jusquIci.filter((p) => !p.annule).map(versPaiement),
    paiement: versPaiement(paiement),
    mentions: { pied: e.pied_document ?? null },
    options: { ...options(e), qr_verification: false },
    url_verification: null,
  };
}

/** Avoir : annule la facture pour son montant total ; daté du jour de l'annulation. */
export function documentAvoir(vente: VentePourDocument, parametres: ParametresDocument): DonneesDocument {
  if (vente.statut !== "annulee" || !vente.numero_avoir) {
    throw new Error("Cette vente n'est pas annulée : elle n'a pas d'avoir.");
  }
  const e = sourceEntreprise(vente.snapshot, parametres);
  const v = vehicule(vente.snapshot, vente.vehicule);
  return {
    type: "avoir",
    numero: vente.numero_avoir,
    date: jourLocal(vente.annulee_le) ?? vente.date_vente,
    annule: true,
    motif_annulation: vente.motif_annulation ?? null,
    reference_facture: vente.numero,
    entreprise: entreprise(e, parametres),
    client: client(vente.snapshot, vente.client),
    vehicule: v,
    lignes: [{
      designation: `Annulation de la facture ${vente.numero}`,
      detail: designationVehicule(v),
      montant: nombre(vente.prix_xof),
    }],
    remise: nombre(vente.remise_xof),
    tva: tva(nombre(vente.tva_taux), e),
    totaux: totaux(vente),
    mentions: { pied: e.pied_document ?? null },
    options: { ...options(e), qr_verification: false },
    url_verification: null,
  };
}

/** Proforma : engagement de prix jusqu'à la date de validité ; pas de QR (rien à vérifier). */
export function documentProforma(proforma: ProformaPourDocument, parametres: ParametresDocument): DonneesDocument {
  const e = sourceEntreprise(proforma.snapshot, parametres);
  const v = vehicule(proforma.snapshot, proforma.vehicule);
  return {
    type: "proforma",
    numero: proforma.numero,
    date: proforma.date,
    annule: proforma.statut === "annulee",
    valide_jusqu_au: proforma.valide_jusqu_au,
    entreprise: entreprise(e, parametres),
    client: client(proforma.snapshot, proforma.client, proforma.client_nom, proforma.client_telephone),
    vehicule: v,
    lignes: [ligneVehicule(v, proforma.snapshot, nombre(proforma.prix_xof))],
    remise: nombre(proforma.remise_xof),
    tva: tva(nombre(proforma.tva_taux), e),
    totaux: totaux(proforma),
    livraison_a_l_arrivee: !!proforma.snapshot?.mention_livraison,
    mentions: mentions(e, false),
    options: { ...options(e), qr_verification: false },
    url_verification: null,
  };
}

/**
 * Remplace les chemins de logo, cachet et signature par des adresses lisibles.
 * `resoudre` est `urlFichier` dans l'application ; une image introuvable disparaît du document.
 */
export async function avecImages(
  d: DonneesDocument,
  resoudre: (chemin: string | null | undefined) => Promise<string | null>,
): Promise<DonneesDocument> {
  const [logo, cachet, signature] = await Promise.all([
    resoudre(d.entreprise.logo).catch(() => null),
    resoudre(d.entreprise.cachet).catch(() => null),
    resoudre(d.entreprise.signature).catch(() => null),
  ]);
  return { ...d, entreprise: { ...d.entreprise, logo, cachet, signature } };
}
