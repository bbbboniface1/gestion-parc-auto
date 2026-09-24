import { describe, expect, it } from "vitest";
import { montantEnLettres, nombreEnLettres } from "@/lib/lettres";

describe("nombreEnLettres", () => {
  it.each([
    [0, "zéro"],
    [1, "un"],
    [16, "seize"],
    [17, "dix-sept"],
    [21, "vingt et un"],
    [22, "vingt-deux"],
    [31, "trente et un"],
    [70, "soixante-dix"],
    [71, "soixante et onze"],
    [72, "soixante-douze"],
    [77, "soixante-dix-sept"],
    [80, "quatre-vingts"],
    [81, "quatre-vingt-un"],
    [90, "quatre-vingt-dix"],
    [91, "quatre-vingt-onze"],
    [99, "quatre-vingt-dix-neuf"],
    [100, "cent"],
    [101, "cent un"],
    [180, "cent quatre-vingts"],
    [200, "deux cents"],
    [201, "deux cent un"],
    [280, "deux cent quatre-vingts"],
    [1000, "mille"],
    [1001, "mille un"],
    [2000, "deux mille"],
    [21_000, "vingt et un mille"],
    [80_000, "quatre-vingt mille"],
    [200_000, "deux cent mille"],
    [280_000, "deux cent quatre-vingt mille"],
    [1_000_000, "un million"],
    [2_000_000, "deux millions"],
    [80_000_000, "quatre-vingts millions"],
    [200_000_000, "deux cents millions"],
    [8_500_000, "huit millions cinq cent mille"],
    [14_500_000, "quatorze millions cinq cent mille"],
    [999_999_999, "neuf cent quatre-vingt-dix-neuf millions neuf cent quatre-vingt-dix-neuf mille neuf cent quatre-vingt-dix-neuf"],
    [1_234_567_890, "un milliard deux cent trente-quatre millions cinq cent soixante-sept mille huit cent quatre-vingt-dix"],
  ])("%i → %s", (n, attendu) => {
    expect(nombreEnLettres(n)).toBe(attendu);
  });

  it("refuse les montants hors limites", () => {
    expect(() => nombreEnLettres(Number.NaN)).toThrow();
    expect(() => nombreEnLettres(1e13)).toThrow();
  });
});

describe("montantEnLettres", () => {
  it.each([
    [0, "zéro franc CFA"],
    [1, "un franc CFA"],
    [2, "deux francs CFA"],
    [1_000_000, "un million de francs CFA"],
    [21_000_000, "vingt et un millions de francs CFA"],
    [14_500_000, "quatorze millions cinq cent mille francs CFA"],
    [6_500_000, "six millions cinq cent mille francs CFA"],
    [22_000_000, "vingt-deux millions de francs CFA"],
  ])("%i → %s", (n, attendu) => {
    expect(montantEnLettres(n)).toBe(attendu);
  });
});
