// Garde-fou de la démonstration : sert le dossier out/ (npm run build d'abord), ouvre l'application dans un vrai
// navigateur avec un profil vide, entre dans la démo et attend le tableau de bord ; recharge ensuite pour vérifier
// le démarrage « à chaud ». Échoue si la base ne s'initialise pas dans le délai.
//
// Pourquoi : le moteur Postgres de la démo (PGlite) regroupé par Turbopack restait bloqué en production alors que
// tout fonctionnait en développement. Aucun test unitaire ne le voyait ; celui-ci, si.
//
// Usage : npm run build && npm run verifier:demo
import { entrerDansLaDemo, executer } from "./navigateur-outils.mjs";

const DELAI_FROID_MS = Number(process.env.DELAI_FROID_MS ?? 120_000);
const DELAI_CHAUD_MS = Number(process.env.DELAI_CHAUD_MS ?? 20_000);

await executer("la démonstration démarre", async ({ page, base }) => {
  const froid = await entrerDansLaDemo(page, base, DELAI_FROID_MS);
  console.log(`démarrage à froid : ${froid.toFixed(1)} s jusqu'au tableau de bord`);

  const t0 = Date.now();
  await page.goto(`${base}/parc/`, { waitUntil: "domcontentloaded" });
  await page.getByText("véhicules ·").first().waitFor({ timeout: DELAI_CHAUD_MS });
  console.log(`démarrage à chaud : ${((Date.now() - t0) / 1000).toFixed(1)} s jusqu'au parc`);
});
