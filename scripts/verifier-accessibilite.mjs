// Audit d'accessibilité (axe-core, WCAG 2.1 A et AA) de tous les écrans, dans le thème clair (THEME=dark pour le sombre),
// sur ordinateur (1280 px) puis téléphone (390 px). Échoue à la moindre violation « sérieuse » ou « critique ».
//
// Usage : npm run build && npm run verifier:accessibilite        (THEME=dark pour le thème sombre)
import { createRequire } from "node:module";
import { entrerDansLaDemo, executer } from "./navigateur-outils.mjs";

const require = createRequire(import.meta.url);
const AxeBuilder = require("@axe-core/playwright").default ?? require("@axe-core/playwright").AxeBuilder ?? require("@axe-core/playwright");

const D = 20_000;

await executer(`accessibilité (${process.env.THEME === "dark" ? "sombre" : "clair"})`, async ({ page, base }) => {
  await entrerDansLaDemo(page, base);

  const lien = async (liste, motif) => {
    await page.goto(base + liste, { waitUntil: "domcontentloaded" });
    const l = page.locator(`a[href*="${motif}"]`).first();
    await l.waitFor({ timeout: D });
    return l.getAttribute("href");
  };
  const fiche = await lien("/parc/", "/parc/vehicule/");
  const vente = await lien("/ventes/", "/ventes/fiche/");
  const client = await lien("/clients/", "/clients/fiche/");
  const expedition = await lien("/expeditions/", "/expeditions/fiche/");

  const ecrans = [
    "/accueil/", "/parc/", "/parc/nouveau/", fiche, "/ventes/", "/ventes/?onglet=proformas", "/ventes/nouvelle/", vente, "/clients/", client,
    "/expeditions/", expedition, "/finances/", "/finances/?onglet=depenses", "/finances/?onglet=creances", "/finances/?onglet=rentabilite",
    "/outils/simulateur/", "/parametres/", "/parametres/entreprise/", "/parametres/documents/", "/parametres/devises/", "/parametres/douane/",
    "/parametres/logistique/", "/parametres/ventes/", "/parametres/equipe/", "/parametres/preferences/", "/parametres/donnees/", "/parametres/journal/",
  ];

  const violations = new Map();
  for (const [largeur, hauteur] of [[1280, 900], [390, 844]]) {
    await page.setViewportSize({ width: largeur, height: hauteur });
    for (const chemin of ecrans) {
      await page.goto(base + chemin, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1800);
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      for (const v of r.violations.filter((x) => x.impact === "serious" || x.impact === "critical")) {
        const cle = v.id;
        const entree = violations.get(cle) ?? { aide: v.help, impact: v.impact, ecrans: new Set(), exemples: [] };
        entree.ecrans.add(`${chemin.split("?")[0]}@${largeur}`);
        for (const n of v.nodes.slice(0, 2)) if (entree.exemples.length < 3) entree.exemples.push(`${n.target.join(" ")} — ${(n.any[0]?.message ?? n.failureSummary ?? "").split("\n")[0].slice(0, 110)} | ${n.html.slice(0, 150)}`);
        violations.set(cle, entree);
      }
    }
    console.log(`${ecrans.length} écrans audités à ${largeur} px`);
  }

  if (violations.size) {
    for (const [id, v] of violations) {
      console.error(`  ✗ ${id} (${v.impact}) : ${v.aide} — ${v.ecrans.size} écran(s)`);
      for (const ex of v.exemples) console.error(`      ${ex}`);
    }
    throw new Error(`${violations.size} type(s) de violation`);
  }
});
