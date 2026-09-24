import { describe, expect, it } from "vitest";
import { formatCourt, formatDate, formatFCFA, formatJour, formatNombre, joursDepuis, lireDate } from "@/lib/format";
import { formaterPendantSaisie, lireMontant, versFCFA } from "@/lib/montant";
import { cleDeControle, finDeVin, grouperVin, normaliserVin, verifierVin } from "@/lib/vin";
import { lienWhatsApp, numeroInternational, remplirModele } from "@/lib/whatsapp";

const NBSP = " ";

describe("format", () => {
  it("groupe les milliers avec une espace insécable", () => {
    expect(formatNombre(8_500_000)).toBe(`8${NBSP}500${NBSP}000`);
    expect(formatNombre(950)).toBe("950");
    expect(formatNombre(-12_345)).toBe(`−12${NBSP}345`);
    expect(formatNombre(1234.5, 2)).toBe(`1${NBSP}234,50`);
  });

  it("arrondit le FCFA à l'unité", () => {
    expect(formatFCFA(14_499_999.6)).toBe(`14${NBSP}500${NBSP}000${NBSP}FCFA`);
    expect(formatFCFA(null)).toBe("—");
  });

  it("abrège les grands montants pour les indicateurs", () => {
    expect(formatCourt(186_400_000)).toBe(`186${NBSP}M`);
    expect(formatCourt(38_450_000)).toBe(`38,5${NBSP}M`);
    expect(formatCourt(950_000)).toBe(`950${NBSP}k`);
    expect(formatCourt(12_500)).toBe(`12${NBSP}500`);
    expect(formatCourt(2_400_000_000)).toBe(`2,4${NBSP}Md`);
  });

  it("lit une date SQL sans décalage de fuseau", () => {
    const d = lireDate("2026-09-24")!;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 8, 24]);
    expect(formatDate("2026-09-24")).toBe("24 sept. 2026");
    expect(formatJour("2026-09-24")).toBe("Jeudi 24 septembre");
    expect(formatJour("2026-10-01")).toBe("Jeudi 1er octobre");
  });

  it("compte les jours écoulés", () => {
    expect(joursDepuis("2026-09-10", new Date(2026, 8, 24))).toBe(14);
    expect(joursDepuis(null)).toBeNull();
  });
});

describe("saisie des montants", () => {
  it.each([
    ["8500000", 8_500_000],
    ["8 500 000", 8_500_000],
    ["8,5M", 8_500_000],
    ["8.5m", 8_500_000],
    ["850k", 850_000],
    ["1,2Md", 1_200_000_000],
    ["8.500.000", 8_500_000],
    ["12 500 FCFA", 12_500],
    ["$14,250", 14_250],
    ["14250.75", 14_250.75],
    ["14,250.00", 14_250],
    ["14 250,50", 14_250.5],
    ["1.234.567,89", 1_234_567.89],
    ["8,5", 8.5],
    ["-500", -500],
  ])("« %s » → %d", (saisie, attendu) => {
    expect(lireMontant(saisie)).toBe(attendu);
  });

  it.each(["", "abc", "8,5,5", "1e9", "--3", "12,34,567", "1,2.3.4"])("« %s » n'est pas un montant", (saisie) => {
    expect(lireMontant(saisie)).toBeNull();
  });

  it("groupe pendant la frappe sans casser la saisie", () => {
    expect(formaterPendantSaisie("8500000")).toBe(`8${NBSP}500${NBSP}000`);
    expect(formaterPendantSaisie("14250,")).toBe(`14${NBSP}250,`);
    expect(formaterPendantSaisie("8,5M")).toBe("8,5M");
    expect(formaterPendantSaisie("")).toBe("");
  });

  it("convertit en FCFA arrondi", () => {
    expect(versFCFA(14_250, 570)).toBe(8_122_500);
    expect(versFCFA(99.99, 655.957)).toBe(65_589);
  });
});

describe("VIN", () => {
  it("vérifie la clé de contrôle", () => {
    expect(cleDeControle("1HGCM82633A004352")).toBe("3");
    expect(verifierVin("1HGCM82633A004352")).toEqual({ etat: "valide" });
    expect(verifierVin("2t3-rfrev0-jw812345")).toEqual({ etat: "valide" });
    // 9e caractère (la clé) modifié : 4 au lieu de 3
    expect(verifierVin("1HGCM82643A004352")).toEqual({ etat: "cle_incorrecte", attendue: "3" });
    // une faute de frappe ailleurs est détectée aussi
    expect(verifierVin("1HGCM82633A004353").etat).toBe("cle_incorrecte");
  });

  it("signale les saisies impossibles", () => {
    expect(verifierVin("")).toEqual({ etat: "vide" });
    expect(verifierVin("1HGCM826")).toEqual({ etat: "incomplet", longueur: 8 });
    expect(verifierVin("1HGCM82633A00435O").etat).toBe("invalide");
    expect(verifierVin("1HGCM82633A0043521").etat).toBe("invalide");
  });

  it("affiche par groupes ISO et en forme courte", () => {
    expect(normaliserVin(" 2t3 rfrev0 jw812345 ")).toBe("2T3RFREV0JW812345");
    expect(grouperVin("2T3RFREV0JW812345")).toBe("2T3 RFREV0 JW812345");
    expect(finDeVin("2T3RFREV0JW812345")).toBe("…812345");
  });
});

describe("WhatsApp", () => {
  it("normalise les numéros maliens", () => {
    expect(numeroInternational("70 12 34 56")).toBe("22370123456");
    expect(numeroInternational("+223 76 00 11 22")).toBe("22376001122");
    expect(numeroInternational("00223 66 55 44 33")).toBe("22366554433");
    expect(numeroInternational("123")).toBeNull();
  });

  it("remplit le modèle de message", () => {
    expect(remplirModele("Bonjour {client}, facture {numero} : {montant}.", { client: "M. Traoré", numero: "FAC-2026-0047", montant: "14 500 000 FCFA" }))
      .toBe("Bonjour M. Traoré, facture FAC-2026-0047 : 14 500 000 FCFA.");
    expect(remplirModele("Reste {reste}", {})).toBe("Reste {reste}");
  });

  it("construit le lien wa.me", () => {
    expect(lienWhatsApp("70123456", "Bonjour & merci")).toBe("https://wa.me/22370123456?text=Bonjour%20%26%20merci");
  });
});
