// Outils partagés par les vérifications dans un vrai navigateur (scripts/verifier-*.mjs) :
// serveur statique sur out/, navigateur (Edge, Chrome ou Chromium de Playwright), entrée dans la démo.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");

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

/** Sert out/ (npm run build d'abord) et ouvre un navigateur à profil vide. `fermer()` nettoie tout. */
export async function ouvrirApplication({ port = Number(process.env.PORT ?? 4173) } = {}) {
  const serveur = spawn(process.execPath, [path.join(racine, "node_modules", "serve", "build", "main.js"), "out", "-l", String(port)], { cwd: racine, stdio: "ignore" });
  let navigateur;
  try {
    await attendrePort(port);
    for (const canal of ["msedge", "chrome", undefined]) {
      try { navigateur = await chromium.launch(canal ? { channel: canal } : {}); break; } catch { /* essai suivant */ }
    }
    if (!navigateur) throw new Error("Aucun navigateur disponible (installez Edge/Chrome ou `npx playwright install chromium`).");
    const contexte = await navigateur.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
    const page = await contexte.newPage();
    return {
      page,
      base: `http://127.0.0.1:${port}`,
      async fermer() { await navigateur?.close(); serveur.kill(); },
    };
  } catch (e) {
    await navigateur?.close();
    serveur.kill();
    throw e;
  }
}

/** Entre dans la démonstration et attend le tableau de bord. Renvoie la durée en secondes. */
export async function entrerDansLaDemo(page, base, delai = 120_000) {
  const t0 = Date.now();
  await page.goto(`${base}/connexion/`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Essayer la démonstration/ }).click();
  await page.waitForURL(/\/accueil\//, { timeout: delai });
  await page.getByText("Tableau de bord").first().waitFor({ timeout: delai });
  return (Date.now() - t0) / 1000;
}

/** Exécute `corps` avec l'application ouverte ; code de sortie 1 et message sur la première erreur. */
export async function executer(titre, corps) {
  let app;
  let code = 0;
  try {
    app = await ouvrirApplication();
    await corps(app);
    console.log(`OK : ${titre}`);
  } catch (e) {
    code = 1;
    console.error(`ÉCHEC : ${titre} — ${e instanceof Error ? e.message.split("\n")[0] : e}`);
  } finally {
    await app?.fermer();
  }
  process.exit(code);
}
