// Mise en page à toutes les largeurs (build de production, démonstration) : du petit téléphone à l'écran large.
// Pour chaque écran et chaque largeur, vérifie qu'aucun contenu ne déborde de la page, que la navigation latérale ne
// recouvre pas le contenu et que le titre de l'écran est réellement visible (pas masqué par une barre fixe).
//
// Usage : npm run build && npm run verifier:mise-en-page
import { mkdirSync } from "node:fs";
import { entrerDansLaDemo, executer } from "./navigateur-outils.mjs";

const LARGEURS = [360, 390, 600, 768, 895, 896, 1024, 1099, 1100, 1280, 1536, 1920];
const HAUTEUR = 860;
const D = 30_000;

await executer("aucune largeur ne casse la mise en page", async ({ page, base }) => {
  mkdirSync("test-results", { recursive: true });
  await entrerDansLaDemo(page, base);
  const premierLien = async (liste, motif) => {
    await page.goto(base + liste, { waitUntil: "domcontentloaded" });
    const l = page.locator(`a[href*="${motif}"]`).first();
    await l.waitFor({ timeout: D });
    return l.getAttribute("href");
  };
  const fiche = await premierLien("/parc/", "/parc/vehicule/");
  const vente = await premierLien("/ventes/", "/ventes/fiche/");
  const client = await premierLien("/clients/", "/clients/fiche/");
  const expedition = await premierLien("/expeditions/", "/expeditions/fiche/");

  const ecrans = [
    "/accueil/", "/parc/", "/parc/nouveau/", fiche, "/ventes/", "/ventes/nouvelle/", vente, "/clients/", client,
    "/expeditions/", expedition, "/finances/", "/finances/?onglet=depenses", "/outils/simulateur/",
    "/parametres/", "/parametres/entreprise/", "/parametres/equipe/",
  ];

  const problemes = [];
  for (const chemin of ecrans) {
    await page.setViewportSize({ width: 1280, height: HAUTEUR });
    await page.goto(base + chemin, { waitUntil: "domcontentloaded" });
    await page.locator("h1").first().waitFor({ timeout: D });
    for (const largeur of LARGEURS) {
      await page.setViewportSize({ width: largeur, height: HAUTEUR });
      await page.waitForTimeout(350);
      const mesure = await page.evaluate(() => {
        const r = [];
        const doc = document.documentElement;
        if (doc.scrollWidth > innerWidth + 1) {
          // Premier élément qui dépasse à droite sans être rogné par un parent (défilement interne, overflow caché).
          const rogne = (e) => { for (let p = e.parentElement; p && p !== doc; p = p.parentElement) { if (getComputedStyle(p).overflowX !== "visible" && p.getBoundingClientRect().right <= innerWidth + 1) return true; } return false; };
          const fautif = [...document.querySelectorAll("body *")].find((e) => e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(e).position !== "fixed" && !rogne(e));
          r.push(`déborde de ${doc.scrollWidth - innerWidth} px${fautif ? ` (${fautif.tagName.toLowerCase()}${fautif.className ? "." + String(fautif.className).split(" ")[0] : ""})` : ""}`);
        }
        const aside = document.querySelector("aside");
        const main = document.querySelector("main");
        const titre = main?.querySelector("h1");
        if (aside && main && getComputedStyle(aside).display !== "none") {
          const a = aside.getBoundingClientRect();
          const gauche = main.getBoundingClientRect().left + parseFloat(getComputedStyle(main).paddingLeft);
          if (gauche < a.right - 1) r.push(`la navigation (${Math.round(a.width)} px) recouvre le contenu (qui commence à ${Math.round(gauche)} px)`);
        }
        if (titre) {
          const b = titre.getBoundingClientRect();
          const point = document.elementFromPoint(Math.min(Math.max(b.left + 4, 1), innerWidth - 2), Math.min(Math.max(b.top + b.height / 2, 1), innerHeight - 2));
          if (b.width > 0 && b.left < 0) r.push("le titre sort à gauche de l'écran");
          if (point && !titre.contains(point) && !point.contains(titre)) r.push(`le titre est masqué par ${point.tagName.toLowerCase()}`);
        }
        return r;
      });
      for (const m of mesure) problemes.push(`${chemin} à ${largeur} px : ${m}`);
    }
  }
  console.log(`${ecrans.length} écrans × ${LARGEURS.length} largeurs`);
  if (problemes.length) {
    for (const p of problemes.slice(0, 40)) console.error("  " + p);
    if (problemes.length > 40) console.error(`  … et ${problemes.length - 40} autres`);
    throw new Error(`${problemes.length} défaut(s) de mise en page`);
  }
});
