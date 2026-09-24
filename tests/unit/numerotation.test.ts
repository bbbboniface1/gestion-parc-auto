import { describe, expect, it } from "vitest";
import { formaterNumero, verifierFormat } from "@/lib/numerotation";

describe("numérotation", () => {
  const d = new Date(2026, 8, 24);
  it("reproduit le format par défaut du serveur", () => {
    expect(formaterNumero("{PREFIXE}-{AAAA}-{NUM}", "FAC", d, 47, 4)).toBe("FAC-2026-0047");
    expect(formaterNumero("{PREFIXE}{AA}/{NUM}", "REC", d, 7, 3)).toBe("REC26/007");
    expect(formaterNumero("{PREFIXE}-{NUM}", "V", d, 42, 4)).toBe("V-0042");
  });
  it("ne tronque jamais un numéro plus long que le remplissage", () => {
    expect(formaterNumero("{PREFIXE}-{NUM}", "FAC", d, 12345, 4)).toBe("FAC-12345");
  });
  it("refuse un format sans {NUM} ou avec un jeton inconnu", () => {
    expect(verifierFormat("{PREFIXE}-{AAAA}")).toMatch(/NUM/);
    expect(verifierFormat("{PREFIXE}-{MOIS}-{NUM}")).toMatch(/inconnu/);
    expect(verifierFormat("{PREFIXE}-{AAAA}-{NUM}")).toBeNull();
  });
});
