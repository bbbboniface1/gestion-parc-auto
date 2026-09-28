import { describe, expect, it } from "vitest";
import { composer, decomposer, erreurTelephone, telephoneValide } from "@/lib/telephone";
import { numeroInternational } from "@/lib/whatsapp";

describe("téléphone", () => {
  it("un numéro malien se saisit sur 8 chiffres et s'enregistre au format international", () => {
    expect(composer("223", "76451289")).toBe("+223 76 45 12 89");
    expect(decomposer("+223 76 45 12 89")).toEqual({ pays: "ML", indicatif: "223", national: "76451289" });
    expect(decomposer("76 45 12 89")).toEqual({ pays: "ML", indicatif: "223", national: "76451289" });
    expect(erreurTelephone(decomposer("76 45 12"))).toBe("Un numéro malien compte 8 chiffres.");
  });

  it("les numéros étrangers gardent leur indicatif", () => {
    expect(composer("33", "612345678")).toBe("+33 6 12 34 56 78");
    expect(decomposer("+33 6 12 34 56 78")).toEqual({ pays: "FR", indicatif: "33", national: "612345678" });
    expect(decomposer("0033612345678").pays).toBe("FR");
    expect(composer("1", "7135550142")).toBe("+1 713 555 0142");
    expect(decomposer("+1 713 555 0142").pays).toBe("US");
    expect(decomposer("+225 07 08 09 10 11")).toEqual({ pays: "CI", indicatif: "225", national: "0708091011" });
  });

  it("indicatif absent de la liste : « Autre pays »", () => {
    expect(decomposer("+7 912 345 67 89").pays).toBe("autre");
    expect(telephoneValide("+999 12")).toBe(false);
  });

  it("vide = valable (champ facultatif) ; la valeur reste utilisable pour WhatsApp", () => {
    expect(telephoneValide("")).toBe(true);
    expect(composer("223", "")).toBe("");
    expect(numeroInternational("+223 76 45 12 89")).toBe("22376451289");
    expect(numeroInternational("+33 6 12 34 56 78")).toBe("33612345678");
  });
});
