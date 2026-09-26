// Garde-fou de la démonstration : sert le dossier out/ (npm run build d'abord), ouvre l'application dans un vrai
// navigateur avec un profil vide, entre dans la démo et attend le tableau de bord ; recharge ensuite pour vérifier
// le démarrage « à chaud ». Échoue si la base ne s'initialise pas dans le délai.
//
// Pourquoi : le moteur Postgres de la démo (PGlite) regroupé par Turbopack restait bloqué en production alors que
// tout fonctionnait en développement. Aucun test unitaire ne le voyait ; celui-ci, si.
//
// Usage : npm run build && npm run verifier:demo   (navigateur : Edge ou Chrome installé, sinon Chromium de Playwright)
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");

const PORT = Number(process.env.PORT ?? 4173);
const DELAI_FROID_MS = Number(process.env.DELAI_FROID_MS ?? 120_000);
const DELAI_CHAUD_MS = Number(process.env.DELAI_CHAUD_MS ?? 20_000);

function attendrePort(port, delai = 15_000) {
  const fin = Date.now() + delai;
  return new Promise((ok, ko) => {
    const essai = () => {
      const s = net.connect(port, "127.0.0.1");
      s.once("connect", () => { s.destroy(); ok(); });
      s.once("error", () => { s.destroy(); if (Date.now() > fin) ko(new Error(`Le serveur ne répond pas sur le port ${port}`)); else setTimeout(essai, 200); });
    };
    essai();
  });
}

const serveur = spawn(process.execPath, [path.join(racine, "node_modules", "serve", "build", "main.js"), "out", "-l", String(PORT)], { cwd: racine, stdio: "ignore" });
let navigateur;
let code = 0;
try {
  await attendrePort(PORT);
  for (const canal of ["msedge", "chrome", undefined]) {
    try { navigateur = await chromium.launch(canal ? { channel: canal } : {}); break; } catch { /* essai suivant */ }
  }
  if (!navigateur) throw new Error("Aucun navigateur disponible (installez Edge/Chrome ou `npx playwright install chromium`).");

  const contexte = await navigateur.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: "block" });
  const page = await contexte.newPage();
  const base = `http://127.0.0.1:${PORT}`;

  let t0 = Date.now();
  await page.goto(`${base}/connexion/`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Essayer la démonstration/ }).click();
  await page.waitForURL(/\/accueil\//, { timeout: DELAI_FROID_MS });
  await page.getByText("Tableau de bord").first().waitFor({ timeout: DELAI_FROID_MS });
  console.log(`démarrage à froid : ${((Date.now() - t0) / 1000).toFixed(1)} s jusqu'au tableau de bord`);

  t0 = Date.now();
  await page.goto(`${base}/parc/`, { waitUntil: "domcontentloaded" });
  await page.getByText("véhicules ·").first().waitFor({ timeout: DELAI_CHAUD_MS });
  console.log(`démarrage à chaud : ${((Date.now() - t0) / 1000).toFixed(1)} s jusqu'au parc`);
  console.log("OK : la démonstration démarre.");
} catch (e) {
  code = 1;
  console.error(`ÉCHEC : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
} finally {
  await navigateur?.close();
  serveur.kill();
}
process.exit(code);
