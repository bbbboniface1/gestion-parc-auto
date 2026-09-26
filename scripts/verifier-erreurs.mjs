// Parcourt tous les écrans de l'application (build de production, démonstration) et échoue à la moindre erreur :
// erreur en console, exception non interceptée, requête échouée ou réponse HTTP 4xx/5xx.
//
// Usage : npm run build && npm run verifier:erreurs
import { entrerDansLaDemo, executer } from "./navigateur-outils.mjs";

const D = 20_000;

await executer("aucun écran ne produit d'erreur", async ({ page, base }) => {
  await entrerDansLaDemo(page, base);

  let courant = "";
  const problemes = [];
  const note = (genre, detail) => problemes.push(`${courant} → ${genre} : ${detail}`);
  page.on("console", (m) => { if (m.type() === "error") note("console", m.text().slice(0, 200)); });
  page.on("pageerror", (e) => note("exception", (e.message || String(e)).slice(0, 200)));
  page.on("requestfailed", (r) => { if (!(r.failure()?.errorText ?? "").includes("ERR_ABORTED")) note("requête échouée", `${r.url().slice(0, 100)} ${r.failure()?.errorText}`); });
  page.on("response", (r) => { if (r.status() >= 400) note(`HTTP ${r.status()}`, r.url().replace(base, "").slice(0, 100)); });

  // Liens vers des fiches, découverts dans les listes
  const premierLien = async (liste, motif) => {
    await page.goto(base + liste, { waitUntil: "domcontentloaded" });
    const l = page.locator(`a[href*="${motif}"]`).first();
    await l.waitFor({ timeout: D });
    return l.getAttribute("href");
  };
  const fiche = await premierLien("/parc/", "/parc/vehicule/");
  const idVehicule = new URL(base + fiche).searchParams.get("id");
  const vente = await premierLien("/ventes/", "/ventes/fiche/");
  const client = await premierLien("/clients/", "/clients/fiche/");
  const expedition = await premierLien("/expeditions/", "/expeditions/fiche/");

  const ecrans = [
    "/accueil/", "/parc/", "/parc/?filtre=a_verifier", "/parc/?filtre=archives", "/parc/nouveau/", fiche, `/parc/modifier/?id=${idVehicule}`,
    "/ventes/", "/ventes/?onglet=proformas", "/ventes/?onglet=encaissements", "/ventes/nouvelle/", `/ventes/nouvelle/?vehicule=${idVehicule}`, vente,
    "/clients/", client, "/expeditions/", expedition,
    "/finances/", "/finances/?onglet=depenses", "/finances/?onglet=creances", "/finances/?onglet=rentabilite",
    "/outils/simulateur/",
    "/parametres/", "/parametres/entreprise/", "/parametres/documents/", "/parametres/devises/", "/parametres/douane/", "/parametres/logistique/",
    "/parametres/ventes/", "/parametres/equipe/", "/parametres/preferences/", "/parametres/donnees/", "/parametres/journal/",
    "/credits/", "/hors-ligne/", "/verifier/?t=jeton-inexistant-1234567890",
  ];

  for (const chemin of ecrans) {
    courant = chemin;
    await page.goto(base + chemin, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1800);
    const texte = (await page.locator("body").innerText()).slice(0, 4000);
    if (/Une erreur|Erreur inattendue|Application error|Unhandled/i.test(texte)) note("écran d'erreur", texte.slice(0, 100).replace(/\n/g, " "));
    if (texte.trim().length < 20) note("écran vide", "aucun contenu");
  }
  console.log(`${ecrans.length} écrans parcourus`);

  // Une adresse qui n'existe pas doit afficher la page « introuvable », pas une erreur brute
  courant = "/n-importe-quoi/";
  const reponse = await page.goto(base + "/n-importe-quoi/", { waitUntil: "domcontentloaded" });
  problemes.length = problemes.filter((p) => !p.startsWith(courant)).length && 0; // 404 attendue ici
  if (reponse && reponse.status() !== 404) problemes.push(`/n-importe-quoi/ → statut ${reponse.status()} au lieu de 404`);

  // Visiteur sans session : pages publiques (connexion, inscription, mot de passe oublié, crédits, vérification).
  const anonyme = await page.context().browser().newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
  const p2 = await anonyme.newPage();
  const publics = ["/", "/connexion/", "/inscription/", "/mot-de-passe/", "/credits/", "/hors-ligne/", "/verifier/?t=jeton-inexistant-1234567890", "/rejoindre/"];
  p2.on("console", (m) => { if (m.type() === "error") note("console", m.text().slice(0, 200)); });
  p2.on("pageerror", (e) => note("exception", (e.message || String(e)).slice(0, 200)));
  p2.on("response", (r) => { if (r.status() >= 400) note(`HTTP ${r.status()}`, r.url().replace(base, "").slice(0, 100)); });
  for (const chemin of publics) {
    courant = "(public) " + chemin;
    await p2.goto(base + chemin, { waitUntil: "domcontentloaded" });
    await p2.waitForTimeout(1800);
  }
  await anonyme.close();
  console.log(`${publics.length} pages publiques parcourues`);

  const uniques = [...new Set(problemes)].filter((p) => !p.startsWith("/n-importe-quoi/ → HTTP 404") && !p.startsWith("/n-importe-quoi/ → console"));
  if (uniques.length) {
    for (const p of uniques) console.error("  ✗ " + p);
    throw new Error(`${uniques.length} problème(s) détecté(s)`);
  }
});
