import { describe, expect, it } from "vitest";
import { coutsAvecEstimation, estimerDouane } from "@/lib/estimation";

const BAREME = { droit_douane_pct: 20, redevance_statistique_pct: 1, prelevement_communautaire_pct: 1.5, tva_pct: 18, frais_fixes_xof: 150_000 };

describe("estimation de la douane", () => {
  it("applique les droits sur la CAF puis la TVA sur CAF + droits", () => {
    // CAF 7 296 000 : droits 22,5 % = 1 641 600 ; TVA 18 % de 8 937 600 = 1 608 768 ; + 150 000
    expect(estimerDouane(7_296_000, BAREME)).toBe(1_641_600 + 1_608_768 + 150_000);
  });

  it("n'estime rien sans barème ou sans valeur", () => {
    expect(estimerDouane(0, BAREME)).toBe(0);
    expect(estimerDouane(5_000_000, {})).toBe(0);
  });

  const lignes = [
    { categorie: "achat", montant_xof: 5_814_000 },
    { categorie: "frais_enchere", montant_xof: 484_500 },
    { categorie: "remorquage", montant_xof: 171_000 },
    { categorie: "fret", montant_xof: 826_500 },
    { categorie: "atelier", montant_xof: 0 },
  ];

  it("ajoute la douane estimée tant que le véhicule n'est pas dédouané", () => {
    const r = coutsAvecEstimation("en_mer", lignes, BAREME);
    const douane = r.find((l) => l.categorie === "douane");
    expect(douane?.estime).toBe(true);
    expect(douane?.montant_xof).toBe(estimerDouane(7_296_000, BAREME));
    expect(r.some((l) => l.montant_xof === 0)).toBe(false);
  });

  it("n'estime plus une fois la douane payée ou l'étape passée", () => {
    expect(coutsAvecEstimation("en_mer", [...lignes, { categorie: "douane", montant_xof: 3_100_000 }], BAREME).filter((l) => l.estime)).toHaveLength(0);
    expect(coutsAvecEstimation("atelier", lignes, BAREME).filter((l) => l.estime)).toHaveLength(0);
  });
});
