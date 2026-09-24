// Rend une facture complète en PDF (sans navigateur) : vérifie que le modèle se génère
// et écrit un aperçu si APERCU_PDF est défini.
import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { writeFileSync } from "node:fs";
import path from "node:path";
import QRCode from "qrcode";
import { DocumentPDF, enregistrerPolices } from "@/components/documents/document-pdf";
import type { DonneesDocument } from "@/lib/documents/types";

const FACTURE: DonneesDocument = {
  type: "facture",
  numero: "FAC-2026-0047",
  date: "2026-09-24",
  entreprise: {
    nom: "Sahel Auto Import",
    raison_sociale: "Sahel Auto Import SARL",
    slogan: "Véhicules importés des États-Unis",
    adresse: "Avenue de l'OUA, Faladié",
    ville: "Bamako",
    pays: "Mali",
    telephones: ["+223 70 12 34 56", "+223 66 55 44 33"],
    email: "contact@sahelauto.ml",
    nif: "084123456K",
    rccm: "MA.BKO.2021.B.4521",
    compte_bancaire: "BDM-SA · ML016 01201 020401234567 89",
  },
  client: { nom: "Moussa Traoré", telephone: "+223 76 00 11 22", adresse: "Hamdallaye ACI 2000", ville: "Bamako", type_piece: "NINA", numero_piece: "1 98 07 01 0234 56" },
  vehicule: { marque: "Toyota", modele: "RAV4", finition: "XLE", annee: 2018, vin: "2T3RFREV0JW812345", couleur: "Gris magnétique", kilometrage_km: 68_412, carburant: "Essence", transmission: "Automatique", reference: "V-0042" },
  lignes: [{ designation: "Toyota RAV4 XLE 2018", detail: "Véhicule d'occasion importé des États-Unis, dédouané, carte grise en cours", montant: 14_500_000 }],
  tva: { active: false, taux: 18, mention: "TVA non applicable." },
  totaux: { ht: 14_500_000, tva: 0, ttc: 14_500_000 },
  paiements: [
    { date: "2026-09-24", montant: 6_000_000, mode: "especes", numero_recu: "REC-2026-0112" },
    { date: "2026-09-24", montant: 1_000_000, mode: "orange_money", reference: "MP260924.1532.C84121", numero_recu: "REC-2026-0113" },
  ],
  echeances: [
    { date: "2026-10-24", montant: 2_500_000, statut: "a_venir" },
    { date: "2026-11-24", montant: 2_500_000, statut: "a_venir" },
    { date: "2026-12-24", montant: 2_500_000, statut: "a_venir" },
  ],
  livraison_a_l_arrivee: true,
  mentions: { garantie: "Garantie moteur et boîte : 3 mois ou 3 000 km, selon la première échéance.", conditions: "Tout acompte versé reste acquis en cas de désistement de l'acheteur. Le véhicule reste la propriété du vendeur jusqu'au paiement intégral." },
  options: { montant_en_lettres: true, qr_verification: true, couleur: "#B5461E" },
  url_verification: "https://parc-auto.app/verifier/?t=6qH2kL9pZxY4vN8rT1sW",
};

describe("modèle PDF", () => {
  enregistrerPolices(path.resolve("public"));

  it.each(["facture", "proforma", "recu", "avoir", "annulee"] as const)("génère un(e) %s", async (cas) => {
    const type = cas === "annulee" ? "facture" : cas;
    const d: DonneesDocument = {
      ...FACTURE,
      type,
      numero: { facture: "FAC-2026-0047", annulee: "FAC-2026-0031", proforma: "PRO-2026-0019", recu: "REC-2026-0113", avoir: "AV-2026-0003" }[cas],
      reference_facture: type === "recu" || type === "avoir" ? "FAC-2026-0047" : null,
      paiement: type === "recu" ? FACTURE.paiements![1] : null,
      valide_jusqu_au: type === "proforma" ? "2026-10-09" : null,
      annule: cas === "annulee",
      motif_annulation: type === "avoir" ? "Le client renonce à l'achat avant livraison ; acompte remboursé en espèces." : null,
      qr: await QRCode.toDataURL(FACTURE.url_verification!, { margin: 0, width: 280 }),
    };
    const tampon = await renderToBuffer(<DocumentPDF d={d} />);
    expect(tampon.subarray(0, 5).toString()).toBe("%PDF-");
    expect(tampon.length).toBeGreaterThan(10_000);
    if (process.env.APERCU_PDF) writeFileSync(path.join(process.env.APERCU_PDF, `${d.numero}.pdf`), tampon);
  });
});
