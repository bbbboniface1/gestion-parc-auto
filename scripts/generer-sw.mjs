// Génère out/sw.js après `next build` : la liste exacte des fichiers de l'application
// (HTML, charges RSC, JS, CSS, polices, icônes) est mise en cache à l'installation.
// Résultat : une fois ouverte une première fois, l'application démarre sans réseau.
import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sortie = path.join(racine, "out");

const EXCLUS = [
  /^pglite\//, // moteur de démo (~17 Mo) : mis en cache à la première utilisation seulement
  /\.map$/,
  /^sw\.js$/,
  /^serve\.json$/,
  /^_headers$/,
  /^404\.html$/,
  /^__next\._full\./,
];

async function lister(dossier, prefixe = "") {
  const entrees = await readdir(dossier, { withFileTypes: true });
  const fichiers = [];
  for (const e of entrees) {
    const relatif = prefixe ? `${prefixe}/${e.name}` : e.name;
    if (e.isDirectory()) fichiers.push(...(await lister(path.join(dossier, e.name), relatif)));
    else fichiers.push(relatif);
  }
  return fichiers;
}

const fichiers = (await lister(sortie)).filter((f) => !EXCLUS.some((re) => re.test(f)));
const empreinte = createHash("sha256");
let taille = 0;
for (const f of fichiers.sort()) {
  const contenu = await readFile(path.join(sortie, f));
  empreinte.update(f).update(contenu);
  taille += (await stat(path.join(sortie, f))).size;
}
const version = empreinte.digest("hex").slice(0, 12);

// Avec trailingSlash, « parc/vehicule/index.html » est servi à l'URL « /parc/vehicule/ ».
const urls = fichiers.map((f) => `/${f.replace(/(^|\/)index\.html$/, "$1")}`);

const sw = `// Généré par scripts/generer-sw.mjs — ne pas modifier.
const VERSION = ${JSON.stringify(version)};
const CACHE_APP = "parc-auto-app-" + VERSION;
const CACHE_DEMO = "parc-auto-demo-moteur";
const PRECACHE = ${JSON.stringify(urls)};
const HORS_LIGNE = "/hors-ligne/";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_APP).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const noms = await caches.keys();
    await Promise.all(noms.filter((n) => n.startsWith("parc-auto-app-") && n !== CACHE_APP).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data === "ACTIVER") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const requete = event.request;
  if (requete.method !== "GET") return;
  const url = new URL(requete.url);
  if (url.origin !== self.location.origin) return; // Supabase, décodage VIN… : toujours le réseau

  // Moteur de la démo : mis en cache à la première utilisation, puis servi depuis le cache.
  if (url.pathname.startsWith("/pglite/")) {
    event.respondWith(caches.open(CACHE_DEMO).then(async (cache) => {
      const trouve = await cache.match(requete);
      if (trouve) return trouve;
      const reponse = await fetch(requete);
      if (reponse.ok) cache.put(requete, reponse.clone());
      return reponse;
    }));
    return;
  }

  // Pages (?id=… ignoré : une page statique sert tous les identifiants) et charges RSC.
  const estPage = requete.mode === "navigate";
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_APP);
    const trouve = await cache.match(requete, { ignoreSearch: true });
    if (trouve) return trouve;
    try {
      return await fetch(requete);
    } catch (erreur) {
      if (estPage) {
        const secours = await cache.match(HORS_LIGNE);
        if (secours) return secours;
      }
      throw erreur;
    }
  })());
});
`;

await writeFile(path.join(sortie, "sw.js"), sw);
console.log(`sw.js : ${urls.length} fichiers mis en cache (${(taille / 1024 / 1024).toFixed(1)} Mo), version ${version}`);
