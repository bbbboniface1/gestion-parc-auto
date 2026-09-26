import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const racine = path.resolve(__dirname, "..", "..");
const publicPglite = path.join(racine, "public", "pglite");

// Le moteur de la démo est servi tel que publié, hors bundle : regroupé par Turbopack, son démarrage restait
// bloqué en production (la base ne s'initialisait jamais). Ces tests gardent les deux moitiés de ce choix.

describe("moteur de la démo, servi hors bundle", () => {
  it("le script de copie dépose le moteur et tout ce qu'il importe dans public/pglite", () => {
    execFileSync(process.execPath, [path.join(racine, "scripts", "copier-ressources.mjs")], { cwd: racine });

    for (const f of ["index.js", "pglite.wasm", "initdb.wasm", "pglite.data"]) {
      expect(existsSync(path.join(publicPglite, f)), `${f} manquant`).toBe(true);
    }
    // Tout import relatif de proche en proche doit exister : sinon le navigateur bloque au chargement du module.
    const a_voir = ["index.js"];
    const vus = new Set<string>();
    while (a_voir.length) {
      const f = a_voir.pop()!;
      if (vus.has(f)) continue;
      vus.add(f);
      const source = readFileSync(path.join(publicPglite, f), "utf8");
      for (const m of source.matchAll(/(?:from|import)\s*\(?\s*["'](\.[^"']+)["']/g)) {
        const p = path.posix.normalize(path.posix.join(path.posix.dirname(f), m[1]!));
        if (!p.endsWith(".js")) continue;
        expect(existsSync(path.join(publicPglite, p)), `${p} (importé par ${f}) manquant`).toBe(true);
        a_voir.push(p);
      }
    }
    expect(vus.size).toBeGreaterThan(3);
  });

  it("le code de l'application ne réimporte pas le moteur dans le bundle", () => {
    // Les types (typeof import(...), import type) sont effacés à la compilation : ils ne comptent pas.
    const source = readFileSync(path.join(racine, "lib", "demo", "moteur.ts"), "utf8").replace(/typeof import\([^)]*\)/g, "");
    // Seul l'import de type est permis ; le chargement à l'exécution passe par /pglite/index.js.
    expect(source).not.toMatch(/import\(\s*["']@electric-sql\/pglite["']\s*\)/);
    expect(source).not.toMatch(/^import\s+(?!type\b)[^;]*from\s+["']@electric-sql\/pglite["']/m);
    expect(source).toContain("/pglite/index.js");
  });
});
