// Application installable : après une première visite, elle doit s'ouvrir sans réseau (service worker + démonstration locale).
// Le service worker est activé (SW=allow), puis le réseau est coupé et l'application rechargée.
//
// Usage : npm run build && npm run verifier:hors-ligne
import { entrerDansLaDemo, executer } from "./navigateur-outils.mjs";

process.env.SW = "allow";

await executer("l'application s'ouvre sans réseau après une première visite", async ({ page, base }) => {
  page.setDefaultTimeout(60_000);
  await entrerDansLaDemo(page, base);
  const contexte = page.context();

  // Le service worker doit être actif et avoir fini de mettre les pages en cache.
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    if (!reg.active) throw new Error("service worker inactif");
  });
  await page.waitForTimeout(6_000); // temps de pré-cache des pages

  // Sans cette garantie, un rechargement pourrait être servi par le cache HTTP et non par le service worker.
  await page.goto(base + "/accueil/", { waitUntil: "domcontentloaded" });
  if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) throw new Error("la page n'est pas contrôlée par le service worker");

  await contexte.setOffline(true);
  const erreurs = [];
  page.on("pageerror", (e) => erreurs.push((e.message || String(e)).slice(0, 160)));

  for (const chemin of ["/accueil/", "/parc/", "/ventes/"]) {
    await page.goto(base + chemin, { waitUntil: "domcontentloaded" });
    await page.locator("h1").first().waitFor({ timeout: 60_000 });
    const texte = await page.locator("main").innerText();
    if (/Impossible d'afficher|hors ligne|Vous êtes hors ligne/i.test(texte) && !/véhicule|vente|Tableau/i.test(texte)) throw new Error(`${chemin} : écran d'erreur hors ligne`);
    console.log(`✓ ${chemin} s'ouvre sans réseau`);
  }

  // Une page jamais visitée doit afficher la page « hors ligne » et non l'erreur du navigateur.
  await page.goto(base + "/credits/", { waitUntil: "domcontentloaded" }).catch(() => {});
  const corps = (await page.locator("body").innerText().catch(() => "")).slice(0, 200);
  if (/ERR_INTERNET_DISCONNECTED|Aucune connexion Internet|This site can.t be reached/i.test(corps)) throw new Error("page non mise en cache : erreur brute du navigateur");
  if (erreurs.length) throw new Error(`exception hors ligne : ${erreurs[0]}`);
  await contexte.setOffline(false);
});
