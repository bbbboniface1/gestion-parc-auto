// Copie dans public/ les ressources servies telles quelles, depuis node_modules :
// - le moteur Postgres WebAssembly de la démonstration (chargé à la demande, mode démo seulement) ;
// - les polices au format WOFF pour les PDF (le moteur PDF ne lit pas le WOFF2 du site).
import { copyFile, mkdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nm = path.join(racine, "node_modules");

const copies = [
  ...["pglite.wasm", "pglite.data", "initdb.wasm"].map((f) => [
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
