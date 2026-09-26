import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Intl / toLocaleString("fr-FR") groupe les milliers avec l'espace fine U+202F, absente de la plupart des polices :
// à l'écran les chiffres se collaient (« 14500000 FCFA »). Tout affichage de nombre passe par lib/format.
const RACINE = path.resolve(__dirname, "../..");

function sources(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = path.join(dossier, nom);
    if (statSync(chemin).isDirectory()) return sources(chemin);
    return /\.(ts|tsx)$/.test(nom) ? [chemin] : [];
  });
}

describe("formatage des nombres", () => {
  it("n'utilise jamais toLocaleString ni Intl.NumberFormat pour afficher un nombre", () => {
    const fautifs = ["app", "components", "lib"]
      .flatMap((d) => sources(path.join(RACINE, d)))
      .filter((f) => !f.endsWith("sql.generated.ts"))
      .filter((f) => /\.toLocaleString\(|Intl\.NumberFormat/.test(readFileSync(f, "utf8")))
      .map((f) => path.relative(RACINE, f));
    expect(fautifs).toEqual([]);
  });
});
