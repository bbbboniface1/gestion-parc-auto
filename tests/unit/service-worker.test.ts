import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const racine = path.resolve(__dirname, "..", "..");

// En développement il n'y a pas de sw.js : un service worker de production resté enregistré sur le même port
// (localhost:3000) redemandait le fichier en boucle (erreur 404) et servait de vieux fichiers. `public/sw.js` est un
// service worker « d'effacement » servi seulement par `next dev` ; le build le remplace par le vrai.

describe("service worker et développement", () => {
  it("public/sw.js s'efface et vide les caches, sans rien mettre en cache", () => {
    const source = readFileSync(path.join(racine, "public", "sw.js"), "utf8");
    expect(source).toContain("unregister()");
    expect(source).toContain("caches.delete");
    expect(source).toContain("skipWaiting");
    expect(source).not.toMatch(/addEventListener\(\s*["']fetch["']/); // il n'intercepte aucune requête
    expect(source).not.toContain("PRECACHE");
  });

  it("le build écrit le vrai service worker par-dessus (sinon la production perdrait le hors-ligne)", () => {
    const generateur = readFileSync(path.join(racine, "scripts", "generer-sw.mjs"), "utf8");
    expect(generateur).toMatch(/writeFile\(\s*path\.join\(sortie,\s*"sw\.js"\)/);
    expect(generateur).toContain("PRECACHE");
    expect(readFileSync(path.join(racine, "package.json"), "utf8")).toContain("node scripts/aplatir-rsc.mjs && node scripts/generer-sw.mjs");
  });

  it("le composant ne l'enregistre qu'en production et nettoie les anciens en développement", () => {
    const composant = readFileSync(path.join(racine, "components", "service-worker.tsx"), "utf8");
    expect(composant).toContain('process.env.NODE_ENV !== "production"');
    expect(composant).toContain("getRegistrations()");
  });
});
