// Copie dans public/ les ressources servies telles quelles, depuis node_modules :
// - le moteur Postgres WebAssembly de la démonstration (chargé à la demande, mode démo seulement), avec son
//   code JavaScript tel que publié : le regrouper dans le bundle de l'application (Turbopack) en cassait le
//   démarrage en production, la base ne s'initialisait jamais ;
// - les polices au format WOFF pour les PDF (le moteur PDF ne lit pas le WOFF2 du site).
import { copyFile, mkdir, readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nm = path.join(racine, "node_modules");

/** Fichiers JavaScript nécessaires à l'exécution de PGlite : tout ce que l'entrée ESM importe, de proche en proche. */
async function fichiersJsPglite() {
  const base = path.join(nm, "@electric-sql", "pglite", "dist");
  const vus = new Set();
  const a_voir = ["index.js"];
  while (a_voir.length) {
    const f = a_voir.pop();
    if (vus.has(f)) continue;
    vus.add(f);
    const source = await readFile(path.join(base, f), "utf8");
    for (const m of source.matchAll(/(?:from|import)\s*\(?\s*["'](\.[^"']+)["']/g)) {
      const p = path.posix.normalize(path.posix.join(path.posix.dirname(f), m[1]));
      if (p.endsWith(".js")) a_voir.push(p);
    }
  }
  return [...vus];
}

const copies = [
  ...["pglite.wasm", "pglite.data", "initdb.wasm", ...(await fichiersJsPglite())].map((f) => [
    path.join(nm, "@electric-sql", "pglite", "dist", f),
    path.join(racine, "public", "pglite", f),
  ]),
  ...[
    ["schibsted-grotesk", "400"], ["schibsted-grotesk", "500"], ["schibsted-grotesk", "600"], ["schibsted-grotesk", "700"],
    ["barlow-condensed", "600"],
  ].map(([famille, graisse]) => [
    path.join(nm, "@fontsource", famille, "files", `${famille}-latin-${graisse}-normal.woff`),
    path.join(racine, "public", "polices", `${famille}-${graisse}.woff`),
  ]),
  // IBM Plex Mono : fichiers officiels d'IBM (la version fontsource fait échouer le moteur PDF sur les chiffres)
  [path.join(nm, "@ibm", "plex-mono", "fonts", "complete", "woff", "IBMPlexMono-Medium.woff"), path.join(racine, "public", "polices", "ibm-plex-mono-500.woff")],
];

let copies_faites = 0;
for (const [de, vers] of copies) {
  await mkdir(path.dirname(vers), { recursive: true });
  const [a, b] = await Promise.all([stat(de), stat(vers).catch(() => null)]);
  if (b && b.size === a.size && b.mtimeMs >= a.mtimeMs) continue;
  await copyFile(de, vers);
  copies_faites++;
}
console.log(`ressources : ${copies.length} fichiers prêts dans public/ (${copies_faites} copiés)`);
