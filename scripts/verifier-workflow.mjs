// Parcours métier de bout en bout dans un vrai navigateur, sur la démo : un véhicule « vers le port » sans conteneur
// est repéré, mis dans un conteneur, le conteneur arrive, et le parc, la fiche véhicule et l'expédition racontent la
// même histoire ; enfin une ligne de dépense mène à sa voiture.
//
// Usage : npm run build && npm run verifier:workflow
import { entrerDansLaDemo, executer } from "./navigateur-outils.mjs";

const D = 20_000;

await executer("le workflow véhicule ↔ conteneur ↔ dépenses", async ({ page, base }) => {
  await entrerDansLaDemo(page, base);

  // 1. Le parc signale le véhicule incohérent (« vers le port » sans conteneur)
  await page.goto(`${base}/parc/`, { waitUntil: "domcontentloaded" });
  const puce = page.getByRole("button", { name: /À vérifier/ });
  await puce.waitFor({ timeout: D });
  await puce.click();
  await page.getByRole("link", { name: /Kia Sorento 2018/ }).first().waitFor({ timeout: D });
  if (await page.getByRole("link", { name: /Toyota Highlander/ }).count()) throw new Error("le filtre « À vérifier » garde un véhicule cohérent");
  console.log("✓ le parc signale le véhicule sans conteneur");

  // 2. Sa fiche l'explique et propose la correction
  await page.getByRole("link", { name: /Kia Sorento 2018/ }).first().click();
  await page.getByText("En route vers le port, sans conteneur").waitFor({ timeout: D });
  await page.getByRole("alert").getByRole("button", { name: /Mettre dans un conteneur/ }).click();
  await page.getByText("Dans quel conteneur ?").waitFor({ timeout: D });
  await page.getByRole("button", { name: /Mettre dans EXP-0003/ }).click();
  await page.getByText("Voyage dans le conteneur").waitFor({ timeout: D });
  await page.getByText("sans conteneur").waitFor({ state: "detached", timeout: D });
  console.log("✓ en le mettant dans EXP-0003 (en mer), le véhicule passe « En mer » et l'alerte disparaît");

  // 3. Le conteneur arrive : le véhicule suit (une seule action, sur le conteneur)
  await page.getByRole("button", { name: /EXP-0003 est arrivé/ }).first().click();
  await page.getByText("Arrivée au port").first().waitFor({ timeout: D });
  await page.getByRole("button", { name: /Le véhicule part en convoi/ }).first().waitFor({ timeout: D });
  console.log("✓ à l'arrivée du conteneur, la prochaine action du véhicule devient « part en convoi »");

  // 4. L'expédition raconte la même histoire, sans incohérence.
  // La démonstration enregistre ses écritures en différé (lib/demo/moteur.ts) : un vrai utilisateur est prévenu s'il
  // recharge trop tôt, Playwright non. On laisse passer la fenêtre d'enregistrement avant de recharger la page.
  await page.waitForTimeout(5_000);
  await page.goto(`${base}/expeditions/`, { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: /EXP-0003/ }).first().click();
  await page.getByText("Arrivée au port").first().waitFor({ timeout: D });
  await page.getByText("À bord ·").waitFor({ timeout: D });
  if (await page.getByText("À vérifier").count()) throw new Error("l'expédition affiche encore une incohérence");
  console.log("✓ l'expédition EXP-0003 est arrivée, tous ses véhicules concordent");

  // 5. Le parc n'a plus rien à vérifier
  await page.goto(`${base}/parc/`, { waitUntil: "domcontentloaded" });
  await page.getByText("véhicules ·").first().waitFor({ timeout: D });
  if (await page.getByRole("button", { name: /À vérifier/ }).count()) throw new Error("le parc signale encore un véhicule à vérifier");
  console.log("✓ le parc n'a plus rien à vérifier");

  // 6. Une ligne de dépense mène à sa voiture
  await page.goto(`${base}/finances/?onglet=depenses`, { waitUntil: "domcontentloaded" });
  const ligne = page.locator('a[href*="/parc/vehicule/"]').first();
  await ligne.waitFor({ timeout: D });
  await ligne.click();
  await page.waitForURL(/\/parc\/vehicule\/\?id=/, { timeout: D });
  console.log("✓ une ligne de dépense ouvre la fiche de la voiture");
});
