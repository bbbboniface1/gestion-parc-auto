// Après `next build` : l'export statique range les charges de préchargement des pages racines dans des dossiers
// (out/credits/__next.credits/__PAGE__.txt) mais le navigateur les demande à plat (out/credits/__next.credits.__PAGE__.txt).
// Sur un hébergement de fichiers statiques sans règle de réécriture, chaque préchargement finissait en 404 (erreur
// visible en console sur la page de connexion). On dépose donc aussi la version à plat, à côté.
import { copyFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sortie = path.join(racine, "out");

async function parcourir(dossier) {
  let copies = 0;
  for (const e of await readdir(dossier, { withFileTypes: true })) {
    const chemin = path.join(dossier, e.name);
    if (e.isDirectory()) {
      if (e.name.startsWith("__next.")) copies += await aplatir(chemin, e.name, dossier);
      else copies += await parcourir(chemin);
    }
  }
  return copies;
}

/** __next.a/b/c.txt  →  __next.a.b.c.txt (dans le dossier parent). */
async function aplatir(dossier, prefixe, parent) {
  let copies = 0;
  for (const e of await readdir(dossier, { withFileTypes: true })) {
    const chemin = path.join(dossier, e.name);
    if (e.isDirectory()) copies += await aplatir(chemin, `${prefixe}.${e.name}`, parent);
    else if (e.name.endsWith(".txt")) {
      await copyFile(chemin, path.join(parent, `${prefixe}.${e.name}`));
      copies++;
    }
  }
  return copies;
}

console.log(`préchargements : ${await parcourir(sortie)} fichiers à plat ajoutés dans out/`);
