import { describe, expect, it } from "vitest";
import { coutPourEnchere, enchereMaximale, HYPOTHESES_PAR_DEFAUT, type HypothesesSimulateur } from "@/lib/simulateur";
import { etapeSuivante, peut } from "@/lib/domaine";

const H: HypothesesSimulateur = {
  tauxUsd: 570,
  fraisEncherePourcent: 10,
  fraisEnchereFixeUsd: 400,
  remorquageUsd: 600,
  fretUsd: 1500,
  assurancePourcent: 1.5,
  douane: { mode: "taux", tauxCumulePourcent: 44 },
  portXof: 300_000,
  convoiXof: 350_000,
  transitaireXof: 250_000,
  atelierXof: 400_000,
  diversXof: 0,
};

describe("coût pour une enchère", () => {
  it("détaille chaque poste et totalise exactement", () => {
    const d = coutPourEnchere(8000, H);
    const somme = d.lignes.reduce((s, l) => s + l.montantXof, 0);
    expect(d.totalXof).toBe(somme);
    // FOB = 8000 + (800 + 400) + 600 = 9800 ; assurance 147 ; CAF = 9800 + 1500 + 147 = 11 447
    expect(d.cafUsd).toBeCloseTo(11_447, 6);
    const douane = d.lignes.find((l) => l.code === "douane")!;
    expect(douane.montantXof).toBe(Math.round(11_447 * 570 * 0.44));
  });
});

describe("enchère maximale", () => {
  it("respecte la marge voulue et reste au palier de 25 $", () => {
    const r = enchereMaximale(14_500_000, { type: "montant", valeur: 2_000_000 }, H);
    expect(r.impossible).toBe(false);
    expect(r.enchereMaxUsd % 25).toBe(0);
    expect(r.margeObtenueXof).toBeGreaterThanOrEqual(2_000_000);
    // un palier de plus ferait passer sous la marge voulue
    const auDessus = coutPourEnchere(r.enchereMaxUsd + 25, H);
    expect(14_500_000 - auDessus.totalXof).toBeLessThan(2_000_000);
  });

  it("accepte une marge en pourcentage du prix de vente", () => {
    const r = enchereMaximale(10_000_000, { type: "pourcent", valeur: 15 }, H);
    expect(r.margeXof).toBe(1_500_000);
    expect(r.margeObtenueXof).toBeGreaterThanOrEqual(1_500_000);
  });

  it("signale un prix de vente qui ne couvre pas les frais fixes", () => {
    const r = enchereMaximale(2_000_000, { type: "montant", valeur: 500_000 }, H);
    expect(r.impossible).toBe(true);
    expect(r.enchereMaxUsd).toBe(0);
  });

  it("gère une douane au forfait", () => {
    const forfait: HypothesesSimulateur = { ...H, douane: { mode: "forfait", montantXof: 2_500_000 } };
    const d = coutPourEnchere(8000, forfait);
    expect(d.lignes.find((l) => l.code === "douane")!.montantXof).toBe(2_500_000);
  });

  it("fonctionne avec les hypothèses par défaut", () => {
    const r = enchereMaximale(14_500_000, { type: "pourcent", valeur: 15 }, HYPOTHESES_PAR_DEFAUT);
    expect(r.enchereMaxUsd).toBeGreaterThan(0);
  });
});

describe("domaine", () => {
  it("enchaîne les étapes jusqu'au parc", () => {
    expect(etapeSuivante("en_mer")).toBe("au_port");
    expect(etapeSuivante("parc")).toBeNull();
  });

  it("reflète les droits par rôle", () => {
    expect(peut("vendeur", "vendre")).toBe(true);
    expect(peut("vendeur", "saisirFrais")).toBe(false);
    expect(peut("comptable", "modifierVehicule")).toBe(false);
    expect(peut(null, "vendre")).toBe(false);
  });
});
