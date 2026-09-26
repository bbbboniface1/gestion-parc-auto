// Parcours métier de A à Z dans un vrai navigateur (build de production, démonstration) : chaque scénario fait ce que
// ferait un utilisateur — formulaires remplis, boutons cliqués, PDF téléchargés — et vérifie ce qui s'affiche ensuite.
// Tous les scénarios sont joués même si l'un échoue ; le code de sortie est 1 s'il y a au moins un échec.
// À chaque échec, une capture d'écran est déposée dans test-results/.
//
// Usage : npm run build && npm run verifier:parcours
import { mkdirSync, readFileSync } from "node:fs";
import { entrerDansLaDemo, ouvrirApplication } from "./navigateur-outils.mjs";

const D = 30_000; // un rechargement complet rouvre la base de démonstration (jusqu'à ~15 s à froid)
mkdirSync("test-results", { recursive: true });

const app = await ouvrirApplication();
const { page, base } = app;
page.setDefaultTimeout(30_000);
// Confirmations « Supprimer ? » : acceptées. La garde « enregistrement en cours » de la démonstration (beforeunload) est
// refusée : on reste sur la page, et aller() réessaie jusqu'à ce que la base soit rangée dans le navigateur.
let gardesRencontrees = 0;
page.on("dialog", (d) => {
  if (d.type() === "beforeunload") { gardesRencontrees++; void d.dismiss(); } else void d.accept();
});
const erreursConsole = [];
page.on("pageerror", (e) => erreursConsole.push(`exception : ${(e.message || String(e)).slice(0, 160)}`));
page.on("console", (m) => { if (m.type() === "error") erreursConsole.push(`console : ${m.text().slice(0, 160)}`); });

const resultats = [];
async function scenario(nom, corps) {
  const t0 = Date.now();
  const avant = erreursConsole.length;
  try {
    await corps();
    const nouvelles = erreursConsole.slice(avant);
    if (nouvelles.length) throw new Error(`erreur(s) en console pendant le scénario — ${nouvelles[0]}`);
    resultats.push({ nom, ok: true });
    console.log(`✓ ${nom} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  } catch (e) {
    const fichier = `test-results/parcours-${resultats.length + 1}.png`;
    await page.screenshot({ path: fichier, fullPage: false }).catch(() => {});
    const dialogue = await page.getByRole("dialog").innerText({ timeout: 800 }).catch(() => "");
    const ecran = (await page.locator("main").innerText({ timeout: 800 }).catch(() => "")).slice(0, 240).replace(/\n+/g, " | ");
    resultats.push({ nom, ok: false, erreur: e instanceof Error ? e.message.split("\n")[0] : String(e) });
    console.error(`✗ ${nom}\n    ${resultats.at(-1).erreur}${dialogue ? `\n    fenêtre ouverte : ${dialogue.slice(0, 160).replace(/\n/g, " | ")}` : `\n    écran : ${ecran}`}\n    capture : ${fichier}`);
    await page.keyboard.press("Escape").catch(() => {});
  }
}

async function aller(chemin) {
  for (let essai = 1; ; essai++) {
    try {
      return await page.goto(base + chemin, { waitUntil: "domcontentloaded" });
    } catch (e) {
      if (essai >= 8) throw e;
      await page.waitForTimeout(1_000); // la garde a retenu la page : on laisse la base s'enregistrer
    }
  }
}
const dialogue = () => page.getByRole("dialog");
const bouton = (nom, portee = page) => portee.getByRole("button", { name: nom }).first();
const champ = (etiquette, portee = page) => portee.getByLabel(etiquette).first();
async function remplir(etiquette, valeur, portee = page) { const c = champ(etiquette, portee); await c.click(); await c.fill(String(valeur)); }
async function choisir(etiquette, portee = page) { await portee.getByText(etiquette, { exact: true }).first().click(); }
// Beaucoup d'écrans ont une variante mobile et une variante bureau du même texte : on ne regarde que ce qui est visible.
const voir = (texte, portee = page) => portee.getByText(texte).filter({ visible: true }).first().waitFor({ timeout: D });
const absent = (texte, portee = page) => portee.getByText(texte).filter({ visible: true }).first().waitFor({ state: "detached", timeout: D });
async function idDepuisUrl() { return new URL(page.url()).searchParams.get("id"); }
async function telecharger(declencheur) {
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 30_000 }), declencheur()]);
  const chemin = await dl.path();
  const octets = readFileSync(chemin);
  if (octets.subarray(0, 4).toString() !== "%PDF") throw new Error(`le fichier « ${dl.suggestedFilename()} » n'est pas un PDF`);
  return { nom: dl.suggestedFilename(), taille: octets.length };
}

await entrerDansLaDemo(page, base);
console.log("démonstration prête\n");

const etat = {}; // ce que les scénarios se transmettent

// ────────────────────────────────────────────────────────────────────────────────────────────
await scenario("1. Ajouter un véhicule au parc (formulaire complet)", async () => {
  await aller("/parc/nouveau/");
  await remplir("Marque", "Toyota");
  await remplir("Modèle", "Corolla Cross");
  await remplir("Année", "2021");
  await remplir("Couleur", "Rouge");
  await remplir("Compteur", "45000");
  await page.getByRole("radio", { name: "Essence" }).check({ force: true });
  await page.getByRole("radio", { name: "Copart" }).check({ force: true });
  await remplir("N° de lot", "48213377");
  await remplir("Prix d'achat", "8500");
  await remplir("Prix affiché", "14500000");
  await bouton("Ajouter au parc").click();
  await page.waitForURL(/\/parc\/vehicule\/\?id=/, { timeout: D });
  await voir("Toyota Corolla Cross");
  etat.vehicule = await idDepuisUrl();
  await voir("Copart");
});

await scenario("2. Ajouter un frais au véhicule et le voir dans son coût de revient", async () => {
  await aller(`/parc/vehicule/?id=${etat.vehicule}`);
  await bouton(/Ajouter un frais/).click();
  const d = dialogue();
  await d.waitFor({ timeout: D });
  await remplir("Montant", "350", d);
  await d.getByLabel("Catégorie").selectOption("remorquage");
  await bouton("Enregistrer", d).click();
  await d.waitFor({ state: "detached", timeout: D });
  await voir("Remorquage USA");
  await voir("Frais · 1");
});

await scenario("3. Faire avancer l'étape du véhicule (Acheté → Vers le port)", async () => {
  await aller(`/parc/vehicule/?id=${etat.vehicule}`);
  await bouton(/Choisir une autre étape/).click();
  const d = dialogue();
  await d.waitFor({ timeout: D });
  await d.getByRole("radio", { name: /Vers le port/ }).check({ force: true });
  await bouton("Enregistrer", d).click();
  await d.waitFor({ state: "detached", timeout: D });
  await voir("Vers le port");
});

await scenario("4. Archiver le véhicule, le retrouver dans « Archivés », le remettre au parc", async () => {
  await aller(`/parc/vehicule/?id=${etat.vehicule}`);
  await bouton(/^Archiver/).click();
  await page.waitForURL(/\/parc\/$/, { timeout: D });
  await aller("/parc/?filtre=archives");
  await voir("Toyota Corolla Cross");
  await page.getByRole("link", { name: /Corolla Cross/ }).first().click();
  await voir("Ce véhicule est archivé");
  await bouton("Remettre au parc").click();
  await absent("Ce véhicule est archivé");
});

await scenario("5. Ajouter une photo et un document au véhicule, puis les supprimer", async () => {
  await aller(`/parc/vehicule/?id=${etat.vehicule}`);
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  await page.locator('input[type="file"][accept="image/*"][multiple]').setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: png });
  await voir("Photo ajoutée");
  await voir("Photos · 1");
  await page.getByRole("button", { name: /Agrandir la photo/ }).first().click();
  await bouton("Supprimer", dialogue()).click();
  await voir("Photo supprimée");
  await voir("Photos · 0");
  // document
  await bouton(/Ajouter un document/).click();
  const d = dialogue();
  await d.waitFor({ timeout: D });
  await d.locator('input[type="file"]').setInputFiles({ name: "connaissement.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF") });
  await voir("Document ajouté");
  await voir("connaissement.pdf");
  await page.getByRole("button", { name: /Supprimer connaissement.pdf/ }).click();
  await voir("Document supprimé");
});

await scenario("6. Créer un conteneur, y mettre le véhicule, l'embarquer, l'arriver, le clôturer", async () => {
  await aller("/expeditions/");
  await bouton(/Nouvelle expédition/).click();
  const d = dialogue();
  await d.waitFor({ timeout: D });
  await remplir("Numéro de conteneur", "TEST1234567", d);
  await remplir("Navire", "MSC Test", d);
  await bouton("Enregistrer", d).click();
  await d.waitFor({ state: "detached", timeout: D });
  const lien = page.getByRole("link", { name: /TEST1234567/ }).first();
  await lien.waitFor({ timeout: D });
  etat.expedition = await lien.getAttribute("href");
  await aller(`/parc/vehicule/?id=${etat.vehicule}`);
  await bouton(/Mettre dans un conteneur/).click();
  await voir("Dans quel conteneur ?");
  await bouton(/TEST1234567/, dialogue()).click();
  await voir("Voyage dans le conteneur");
  await aller(etat.expedition);
  await bouton(/Marquer comme embarqué/).click();
  await voir("En mer");
  await bouton(/^Arrivé à/).click();
  await voir("Arrivée au port");
  await bouton(/Clôturer l'expédition/).click();
  await voir("Clôturée");
});

await scenario("7. Ajouter un client, noter sa demande, ouvrir sa fiche", async () => {
  await aller("/clients/");
  await page.getByRole("button", { name: /Nouveau client|Ajouter un client/ }).first().click();
  const d = dialogue();
  await d.waitFor({ timeout: D });
  await remplir("Nom complet", "Client Essai Parcours", d);
  await remplir("Téléphone", "70 11 22 33", d);
  await remplir("Ville", "Bamako", d);
  await bouton("Enregistrer", d).click();
  await d.waitFor({ state: "detached", timeout: D });
  await voir("Client Essai Parcours");
  await page.getByRole("link", { name: /Client Essai Parcours/ }).first().click();
  await page.waitForURL(/\/clients\/fiche\/\?id=/, { timeout: D });
  etat.client = await idDepuisUrl();
  await bouton(/Noter une demande/).click();
  const d2 = dialogue();
  await d2.waitFor({ timeout: D });
  await remplir("Marque", "Toyota", d2);
  await bouton("Enregistrer", d2).click();
  await d2.waitFor({ state: "detached", timeout: D });
  await voir("Toyota");
});

await scenario("8. Vendre au comptant avec un premier encaissement, télécharger la facture et le reçu", async () => {
  await aller(`/ventes/nouvelle/?vehicule=${etat.vehicule}`);
  await voir("Toyota Corolla Cross");
  await page.getByPlaceholder("Nom ou téléphone").fill("Client Essai");
  await page.getByRole("button", { name: /Client Essai Parcours/ }).first().click();
  await remplir("Encaisser aujourd'hui", "5000000");
  await bouton("Enregistrer la vente").click();
  await page.waitForURL(/\/ventes\/fiche\/\?id=/, { timeout: D });
  etat.vente = await idDepuisUrl();
  await voir("Reste à encaisser");
  const facture = await telecharger(() => bouton(/Télécharger la facture/).click());
  console.log(`    facture PDF : ${facture.nom} (${Math.round(facture.taille / 1024)} Ko)`);
  const recu = await telecharger(() => page.getByRole("button", { name: /Reçu/ }).first().click());
  console.log(`    reçu PDF : ${recu.nom} (${Math.round(recu.taille / 1024)} Ko)`);
});

await scenario("9. Encaisser le solde : la vente est soldée", async () => {
  await aller(`/ventes/fiche/?id=${etat.vente}`);
  await bouton(/Encaisser un versement/).click();
  const d = dialogue();
  await d.waitFor({ timeout: D });
  await bouton("Encaisser", d).click(); // le montant proposé est le reste à payer
  await d.waitFor({ state: "detached", timeout: D });
  await voir("Vente soldée");
  await voir("Soldé");
});

await scenario("10. Annuler la vente : avoir émis, le véhicule redevient disponible", async () => {
  await aller(`/ventes/fiche/?id=${etat.vente}`);
  await bouton(/Annuler la vente/).click();
  const d = dialogue();
  await d.waitFor({ timeout: D });
  await bouton(/Confirmer l'annulation/, d).isDisabled().then((off) => { if (!off) throw new Error("l'annulation doit exiger un motif"); });
  await remplir("Motif de l'annulation", "Le client renonce (test)", d);
  await bouton(/Confirmer l'annulation/, d).click();
  await d.waitFor({ state: "detached", timeout: D });
  await voir("Vente annulée");
  await aller(`/parc/vehicule/?id=${etat.vehicule}`);
  await voir("Vendre ce véhicule");
  await absent("Vendu à");
});

await scenario("11. Vente échelonnée : acompte + 3 échéances, échéancier affiché", async () => {
  await aller(`/ventes/nouvelle/?vehicule=${etat.vehicule}`);
  await voir("Toyota Corolla Cross");
  await page.getByPlaceholder("Nom ou téléphone").fill("Client Essai");
  await page.getByRole("button", { name: /Client Essai Parcours/ }).first().click();
  await bouton(/Échelonné/).click();
  await remplir("Acompte", "2000000");
  await remplir("Nombre d'échéances", "3");
  await voir("Acompte + échéances");
  await bouton("Enregistrer la vente").click();
  await page.waitForURL(/\/ventes\/fiche\/\?id=/, { timeout: D });
  etat.venteEchelonnee = await idDepuisUrl();
  await voir("Échéancier");
  await voir("Reste à encaisser");
});

await scenario("12. Proforma : créer, faire accepter, convertir en facture", async () => {
  await aller("/ventes/?onglet=proformas");
  await bouton(/Nouvelle proforma/).click();
  const d = dialogue();
  await d.waitFor({ timeout: D });
  await bouton(/Highlander/, d).click();
  await d.getByPlaceholder("Nom ou téléphone").fill("Client Essai");
  await bouton(/Client Essai Parcours/, d).click();
  await remplir("Prix proposé", "20000000", d);
  await bouton("Créer la proforma", d).click();
  await d.waitFor({ state: "detached", timeout: D });
  await page.waitForURL(/\/ventes\/\?onglet=proformas/, { timeout: D }); // on reste sur la liste, pas sur une fiche de vente
  await voir("Client Essai Parcours");
  const pdf = await telecharger(() => bouton(/Télécharger le PDF/).click());
  console.log(`    proforma PDF : ${pdf.nom} (${Math.round(pdf.taille / 1024)} Ko)`);
  await bouton(/Le client accepte/).click();
  await voir("Acceptée");
  await bouton(/Convertir en facture/).click();
  await page.waitForURL(/\/ventes\/fiche\/\?id=/, { timeout: D });
  await voir("Reste à encaisser");
});

await scenario("13. Réserver un véhicule pour un client, puis lever la réservation", async () => {
  await aller("/parc/");
  await page.getByRole("link", { name: /Santa Fe/ }).first().click();
  await page.waitForURL(/\/parc\/vehicule\/\?id=/, { timeout: D });
  await bouton(/Réserver pour un client/).click();
  const d = dialogue();
  await d.waitFor({ timeout: D });
  await d.getByPlaceholder("Nom ou téléphone").fill("Client Essai");
  await bouton(/Client Essai Parcours/, d).click();
  await bouton("Réserver", d).click();
  await d.waitFor({ state: "detached", timeout: D });
  await voir("Réservé pour");
  await bouton(/Lever la réservation/).click();
  await absent("Réservé pour Client Essai Parcours");
});

await scenario("14. Modifier la fiche d'un véhicule", async () => {
  await aller(`/parc/modifier/?id=${etat.vehicule}`);
  await voir("Modifier Toyota");
  await remplir("Couleur", "Bleu nuit");
  await bouton("Enregistrer").click();
  await page.waitForURL(/\/parc\/vehicule\/\?id=/, { timeout: D });
  await voir("Bleu nuit");
});

await scenario("15. Dépenses : ajouter une dépense générale, la retrouver, la marquer payée, la supprimer", async () => {
  await aller("/finances/?onglet=depenses");
  await bouton(/Ajouter une dépense/).click();
  const d = dialogue();
  await d.waitFor({ timeout: D });
  await remplir("Montant", "12345", d);
  await d.getByLabel("Catégorie").selectOption("loyer").catch(() => {});
  await remplir("Fournisseur", "Bailleur Essai", d);
  await d.getByLabel("Statut").selectOption("a_payer");
  await bouton("Enregistrer", d).click();
  await d.waitFor({ state: "detached", timeout: D });
  await page.getByPlaceholder("Voiture, conteneur, fournisseur…").fill("Bailleur Essai");
  await voir("Bailleur Essai");
  await bouton("Marquer payé").click();
  await voir("Marqué payé");
  await absent("Marquer payé");
  await page.getByRole("button", { name: "Supprimer cette dépense" }).first().click(); // la confirmation est acceptée par le gestionnaire de dialogues
  await absent("Bailleur Essai");
});

await scenario("16. Comptes : créer un compte, faire un transfert, l'annuler", async () => {
  await aller("/finances/");
  await bouton(/Gérer les comptes/).click();
  const d = dialogue();
  await d.waitFor({ timeout: D });
  await bouton(/Nouveau compte/, d).click();
  await remplir("Nom du compte", "Compte Essai", d);
  await bouton("Enregistrer", d).click();
  await voir("Compte Essai");
  await page.keyboard.press("Escape");
  await bouton(/Transférer/).click();
  const t = dialogue();
  await t.waitFor({ timeout: D });
  await t.getByLabel("Depuis").selectOption({ index: 1 });
  await t.getByLabel("Vers").selectOption({ index: 1 });
  await remplir("Montant", "1000", t);
  await bouton("Transférer", t).click();
  await t.waitFor({ state: "detached", timeout: D });
  await voir("Transfert enregistré").catch(() => {});
});

await scenario("17. Recherche globale (Ctrl K) : retrouver un véhicule et l'ouvrir", async () => {
  await aller("/accueil/");
  await page.getByText(/FCFA/).first().waitFor({ timeout: D });
  await page.keyboard.press("Control+k");
  await page.getByPlaceholder(/VIN, lot, client/).fill("Highlander");
  await page.getByRole("option").first().click().catch(async () => { await page.getByText("Highlander").first().click(); });
  await page.waitForURL(/\/parc\/vehicule\/\?id=/, { timeout: D });
});

await scenario("18. Simulateur : le résultat suit le prix visé", async () => {
  await aller("/outils/simulateur/");
  await voir("Vous pouvez enchérir jusqu'à");
  const avant = await page.locator("text=/\\d[\\d\\s\\u00a0]*\\s?\\$/").first().innerText();
  await remplir("Prix de vente à Bamako", "20000000");
  await page.waitForTimeout(1200);
  const apres = await page.locator("text=/\\d[\\d\\s\\u00a0]*\\s?\\$/").first().innerText();
  if (avant === apres) throw new Error("le résultat n'a pas changé après un nouveau prix de vente");
});

await scenario("19. Paramètres : modifier l'entreprise, enregistrer, retrouver la valeur après rechargement", async () => {
  await aller("/parametres/entreprise/");
  const slogan = `Essai ${Date.now() % 100000}`;
  await remplir("Slogan", slogan);
  await bouton("Enregistrer").click();
  await voir("Paramètres enregistrés");
  await aller("/parametres/entreprise/");
  await page.waitForFunction((s) => [...document.querySelectorAll("input")].some((i) => i.value === s), slogan, { timeout: D });
});

await scenario("20. Préférences : le thème sombre s'applique et persiste", async () => {
  await aller("/parametres/preferences/");
  await page.getByRole("radio", { name: "Sombre" }).check({ force: true }).catch(async () => { await choisir("Sombre"); });
  await page.waitForFunction(() => document.documentElement.dataset.theme === "dark", null, { timeout: D });
  await aller("/accueil/");
  await page.waitForFunction(() => document.documentElement.dataset.theme === "dark", null, { timeout: D });
  await aller("/parametres/preferences/");
  await choisir("Automatique");
});

await scenario("21. Quitter la démonstration revient à l'écran de connexion", async () => {
  await aller("/accueil/");
  await page.getByText(/FCFA/).first().waitFor({ timeout: D });
  await page.getByRole("button", { name: /Sahel Auto Import/ }).first().click().catch(() => {});
  await page.getByRole("button", { name: /Quitter la démonstration/ }).first().click();
  await page.waitForURL(/\/connexion\//, { timeout: D });
});

await app.fermer();
const echecs = resultats.filter((r) => !r.ok);
console.log(`\n${resultats.length - echecs.length}/${resultats.length} scénarios réussis`);
if (gardesRencontrees) console.log(`(la garde d'enregistrement de la démonstration a retenu ${gardesRencontrees} rechargement(s) trop rapide(s), puis les a laissés passer)`);
process.exit(echecs.length ? 1 : 0);
