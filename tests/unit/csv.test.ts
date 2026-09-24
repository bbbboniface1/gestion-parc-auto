import { describe, expect, it } from "vitest";
import { BOM, celluleCSV, genererCSV, type ColonneCSV } from "@/lib/csv";

describe("celluleCSV", () => {
  it("écrit les nombres avec une virgule décimale, sans groupement des milliers", () => {
    expect(celluleCSV(8_500_000)).toBe("8500000");
    expect(celluleCSV(12.5)).toBe("12,5");
    expect(celluleCSV(18.3456, 1)).toBe("18,3");
    expect(celluleCSV(7, 2)).toBe("7,00");
    expect(celluleCSV(0.1 + 0.2)).toBe("0,3");
  });

  it("garde un signe moins ASCII, lisible par Excel", () => {
    expect(celluleCSV(-1_250_000)).toBe("-1250000");
    expect(celluleCSV(-0.0001, 1)).toBe("0,0");
  });

  it("laisse vide ce qui n'a pas de valeur", () => {
    expect(celluleCSV(null)).toBe("");
    expect(celluleCSV(undefined)).toBe("");
    expect(celluleCSV(Number.NaN)).toBe("");
    expect(celluleCSV(Number.POSITIVE_INFINITY)).toBe("");
  });

  it("écrit les dates en JJ/MM/AAAA", () => {
    expect(celluleCSV(new Date(2026, 8, 4))).toBe("04/09/2026");
    expect(celluleCSV(new Date("invalide"))).toBe("");
  });

  it("écrit les booléens en français", () => {
    expect(celluleCSV(true)).toBe("Oui");
    expect(celluleCSV(false)).toBe("Non");
  });

  it("met entre guillemets et double les guillemets quand c'est nécessaire", () => {
    expect(celluleCSV("Toyota RAV4 2018")).toBe("Toyota RAV4 2018");
    expect(celluleCSV('Pick-up "double cabine"')).toBe('"Pick-up ""double cabine"""');
    expect(celluleCSV("Traoré; Moussa")).toBe('"Traoré; Moussa"');
    expect(celluleCSV("ligne 1\nligne 2")).toBe('"ligne 1\nligne 2"');
    expect(celluleCSV(" espace en tête")).toBe('" espace en tête"');
  });

  it("neutralise un texte qui ressemble à une formule", () => {
    expect(celluleCSV("=HYPERLINK(\"http://x\")")).toBe("\"'=HYPERLINK(\"\"http://x\"\")\"");
    expect(celluleCSV("+22370123456")).toBe("'+22370123456");
    expect(celluleCSV("-5")).toBe("'-5");
    expect(celluleCSV("@SOMME(A1)")).toBe("'@SOMME(A1)");
  });
});

describe("genererCSV", () => {
  interface Ligne { vehicule: string; date: Date; prix: number; marge: number | null; pct: number | null }
  const colonnes: ColonneCSV<Ligne>[] = [
    { titre: "Véhicule", valeur: (l) => l.vehicule },
    { titre: "Date de vente", valeur: (l) => l.date },
    { titre: "Prix HT (FCFA)", valeur: (l) => l.prix },
    { titre: "Marge (FCFA)", valeur: (l) => l.marge },
    { titre: "Marge (%)", valeur: (l) => l.pct, decimales: 1 },
  ];
  const lignes: Ligne[] = [
    { vehicule: "Toyota RAV4 2018", date: new Date(2026, 8, 12), prix: 12_500_000, marge: 1_840_000, pct: 14.72 },
    { vehicule: 'Lexus RX 350 "F Sport"', date: new Date(2026, 7, 3), prix: 18_000_000, marge: -250_000, pct: -1.39 },
    { vehicule: "Honda CR-V 2019", date: new Date(2026, 6, 30), prix: 9_000_000, marge: null, pct: null },
  ];

  it("commence par le BOM UTF-8, puis l'en-tête séparé par des points-virgules", () => {
    const csv = genererCSV(colonnes, lignes);
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1).split("\r\n")[0]).toBe("Véhicule;Date de vente;Prix HT (FCFA);Marge (FCFA);Marge (%)");
  });

  it("écrit une ligne par élément, en CRLF, avec une fin de ligne finale", () => {
    const csv = genererCSV(colonnes, lignes);
    const lignesCsv = csv.slice(1).split("\r\n");
    expect(lignesCsv).toHaveLength(5);
    expect(lignesCsv[4]).toBe("");
    expect(lignesCsv[1]).toBe("Toyota RAV4 2018;12/09/2026;12500000;1840000;14,7");
    expect(lignesCsv[2]).toBe('"Lexus RX 350 ""F Sport""";03/08/2026;18000000;-250000;-1,4');
    expect(lignesCsv[3]).toBe("Honda CR-V 2019;30/07/2026;9000000;;");
  });

  it("produit un fichier réduit à l'en-tête quand il n'y a aucune ligne", () => {
    expect(genererCSV(colonnes, [])).toBe(`${BOM}Véhicule;Date de vente;Prix HT (FCFA);Marge (FCFA);Marge (%)\r\n`);
  });
});
