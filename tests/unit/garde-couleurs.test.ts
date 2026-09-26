import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Règle de docs/CONVENTIONS_FRONT.md : aucune couleur en dur, aucun dégradé décoratif dans les écrans et composants.
// Les couleurs vivent dans app/globals.css (jetons). Chaque exception ci-dessous a une raison écrite.
const RACINE = path.resolve(__dirname, "../..");

const EXCEPTIONS_COULEUR: Record<string, string> = {
  "components/documents/document-pdf.tsx": "le PDF est dessiné hors du navigateur : pas de variables CSS",
  "components/coque/logo.tsx": "logo : couleurs de marque figées",
  "app/layout.tsx": "balise meta theme-color : une valeur littérale est exigée",
  "app/manifest.ts": "manifeste de l'application installable : valeurs littérales exigées",
  "components/parametres/champs-image.tsx": "encre de la signature dessinée sur un canvas",
  "app/(app)/parametres/documents/page.tsx": "palette proposée au client pour ses factures PDF (donnée enregistrée)",
};
const EXCEPTIONS_DEGRADE: Record<string, string> = {
  "components/metier/cout-revient.tsx": "hachures d'un coût estimé : un motif, pas un dégradé",
  "components/parametres/champs-image.tsx": "damier de transparence derrière un logo",
  "components/coque/logo.tsx": "logo : dessin de marque figé",
};

function sources(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = path.join(dossier, nom);
    if (statSync(chemin).isDirectory()) return sources(chemin);
    return /\.tsx?$/.test(nom) ? [chemin] : [];
  });
}
const fichiers = ["app", "components"].flatMap((d) => sources(path.join(RACINE, d))).map((f) => ({
  rel: path.relative(RACINE, f).split(path.sep).join("/"),
  texte: readFileSync(f, "utf8"),
}));

describe("couleurs et dégradés", () => {
  it("aucune couleur hexadécimale en dur hors des exceptions documentées", () => {
    const fautifs = fichiers
      .filter((f) => !EXCEPTIONS_COULEUR[f.rel])
      .flatMap((f) => [...f.texte.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => `${f.rel} : ${m[0]}`));
    expect(fautifs).toEqual([]);
  });

  it("aucun dégradé : seul l'utilitaire voile-photo (globals.css) en contient un", () => {
    const fautifs = fichiers
      .filter((f) => !EXCEPTIONS_DEGRADE[f.rel])
      .filter((f) => /gradient-to-|linear-gradient\(|radial-gradient\(|conic-gradient\(|<linearGradient|<radialGradient/.test(f.texte))
      .map((f) => f.rel);
    expect(fautifs).toEqual([]);
  });

  it("aucune lueur colorée ni tache floue décorative", () => {
    const fautifs = fichiers
      .filter((f) => /blur-3xl|boxShadow: `0 0 \d+px \$\{|drop-shadow\(0 \d+px \d+px color-mix/.test(f.texte))
      .map((f) => f.rel);
    expect(fautifs).toEqual([]);
  });
});
