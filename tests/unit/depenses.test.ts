import { describe, expect, it } from "vitest";
import type { Frais } from "@/lib/api/types";
import { couleurCategorie, filtrerDepenses, lienDepense, montantLigne, regrouperParJour, repartitionParCategorie } from "@/lib/depenses";

let n = 0;
const frais = (extra: Partial<Frais>): Frais => ({
  id: `f${++n}`, portee: "vehicule", vehicule_id: "v1", expedition_id: null, categorie: "fret", libelle: null, montant: 1000, devise: "XOF",
  taux: 1, montant_xof: 1000, repartition: null, fournisseur: null, date: "2026-09-20", statut: "paye", compte_id: null, compte_nom: null,
  piece_path: null, created_at: "2026-09-20T10:00:00Z", ...extra,
});

describe("où mène une ligne de dépense", () => {
  it("vers la voiture concernée", () => {
    expect(lienDepense({ vehicule_id: "abc", expedition_id: null })).toBe("/parc/vehicule/?id=abc");
  });

  it("vers le conteneur quand la dépense est commune à ses véhicules", () => {
    expect(lienDepense({ vehicule_id: null, expedition_id: "exp1" })).toBe("/expeditions/fiche/?id=exp1");
  });

  it("nulle part pour une dépense générale : l'écran ouvre le détail", () => {
    expect(lienDepense({ vehicule_id: null, expedition_id: null })).toBeNull();
  });

  it("sur la fiche du véhicule, une dépense du véhicule ne renvoie pas vers lui-même, sa part de conteneur si", () => {
    expect(lienDepense({ vehicule_id: "abc", expedition_id: null }, "vehicule")).toBeNull();
    expect(lienDepense({ vehicule_id: null, expedition_id: "exp1" }, "vehicule")).toBe("/expeditions/fiche/?id=exp1");
  });
});

describe("couleur par catégorie", () => {
  it("est stable et identique d'un écran à l'autre", () => {
    expect(couleurCategorie("fret")).toBe(couleurCategorie("fret"));
    expect(couleurCategorie("douane")).not.toBe(couleurCategorie("fret"));
  });

  it("donne une couleur même à une catégorie inconnue", () => {
    expect(couleurCategorie("inconnue")).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("filtres de la liste", () => {
  const liste = [
    frais({ vehicule_libelle: "Toyota Highlander 2019", vehicule_reference: "V-0022", categorie: "frais_enchere", fournisseur: "IAAI", statut: "a_payer" }),
    frais({ portee: "expedition", vehicule_id: null, expedition_id: "e1", expedition_reference: "EXP-0002", categorie: "port", compte_nom: "Caisse" }),
    frais({ portee: "generale", vehicule_id: null, categorie: "loyer", libelle: "Loyer du parc" }),
  ];
  const tous = { q: "", portee: "toutes", aPayerSeul: false, categorie: null } as const;

  it("sans filtre, tout est gardé", () => {
    expect(filtrerDepenses(liste, tous)).toHaveLength(3);
  });

  it("par type de dépense", () => {
    expect(filtrerDepenses(liste, { ...tous, portee: "expedition" }).map((f) => f.expedition_reference)).toEqual(["EXP-0002"]);
    expect(filtrerDepenses(liste, { ...tous, portee: "generale" })).toHaveLength(1);
  });

  it("à payer seulement", () => {
    expect(filtrerDepenses(liste, { ...tous, aPayerSeul: true }).map((f) => f.fournisseur)).toEqual(["IAAI"]);
  });

  it("par catégorie", () => {
    expect(filtrerDepenses(liste, { ...tous, categorie: "loyer" })).toHaveLength(1);
  });

  it("recherche libre : voiture, référence, conteneur, fournisseur, compte, libellé de catégorie", () => {
    expect(filtrerDepenses(liste, { ...tous, q: "highlander" })).toHaveLength(1);
    expect(filtrerDepenses(liste, { ...tous, q: "V-0022" })).toHaveLength(1);
    expect(filtrerDepenses(liste, { ...tous, q: "exp-0002" })).toHaveLength(1);
    expect(filtrerDepenses(liste, { ...tous, q: "iaai" })).toHaveLength(1);
    expect(filtrerDepenses(liste, { ...tous, q: "caisse" })).toHaveLength(1);
    expect(filtrerDepenses(liste, { ...tous, q: "frais d'enchère" })).toHaveLength(1);
    expect(filtrerDepenses(liste, { ...tous, q: "rien de tout ça" })).toHaveLength(0);
  });

  it("les filtres se cumulent", () => {
    expect(filtrerDepenses(liste, { ...tous, portee: "vehicule", aPayerSeul: true, q: "iaai" })).toHaveLength(1);
    expect(filtrerDepenses(liste, { ...tous, portee: "generale", aPayerSeul: true })).toHaveLength(0);
  });
});

describe("regroupement et totaux", () => {
  it("regroupe par jour en gardant l'ordre reçu", () => {
    const jours = regrouperParJour([
      frais({ date: "2026-09-23" }), frais({ date: "2026-09-22" }), frais({ date: "2026-09-23" }),
    ]);
    expect(jours.map(([d, l]) => [d, l.length])).toEqual([["2026-09-23", 2], ["2026-09-22", 1]]);
  });

  it("compte la part d'un véhicule plutôt que le montant total de la dépense répartie", () => {
    expect(montantLigne(frais({ montant_xof: 900_000, part_xof: 300_000 }))).toBe(300_000);
    expect(montantLigne(frais({ montant_xof: 900_000 }))).toBe(900_000);
  });

  it("répartition par catégorie, de la plus lourde à la plus légère", () => {
    const r = repartitionParCategorie([
      frais({ categorie: "fret", montant_xof: 100 }), frais({ categorie: "douane", montant_xof: 500 }), frais({ categorie: "fret", montant_xof: 200 }),
    ]);
    expect(r).toEqual([["douane", 500], ["fret", 300]]);
  });
});
