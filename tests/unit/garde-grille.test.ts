import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Piège de Tailwind 4 : `col-span-N` s'écrit `grid-column: span N / span N`, qui efface un `col-start-M` posé avant.
// Un `lg:col-span-1` sans `lg:col-start-2` renvoie donc l'élément dans la première colonne dès `lg` (vu sur la liste
// des dépenses : la vignette de 64 px s'élargissait à 256 px). Même chose pour `row-span` et `row-start`.
const RACINE = path.resolve(__dirname, "../..");

function sources(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = path.join(dossier, nom);
    if (statSync(chemin).isDirectory()) return sources(chemin);
    return nom.endsWith(".tsx") ? [chemin] : [];
  });
}

describe("grilles", () => {
  it("un span responsive ne fait jamais perdre la colonne ou la ligne de départ", () => {
    const fautifs: string[] = [];
    for (const f of ["app", "components"].flatMap((d) => sources(path.join(RACINE, d)))) {
      const texte = readFileSync(f, "utf8");
      for (const m of texte.matchAll(/"([^"]*(?:col|row)-(?:start|span)-[^"]*)"/g)) {
        const classes = m[1]!.split(/\s+/);
        for (const [debut, etendue] of [["col-start-", "col-span-"], ["row-start-", "row-span-"]] as const) {
          if (!classes.some((c) => c.startsWith(debut))) continue;
          for (const c of classes.filter((x) => x.includes(":") && x.split(":").pop()!.startsWith(etendue))) {
            const variante = c.slice(0, c.lastIndexOf(":"));
            if (!classes.some((x) => x.startsWith(`${variante}:${debut}`))) fautifs.push(`${path.relative(RACINE, f)} : ${c} sans ${variante}:${debut}…`);
          }
        }
      }
    }
    expect(fautifs).toEqual([]);
  });
});
