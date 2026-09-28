/**
 * Isolation entre entreprises et contrôle des rôles.
 *
 * La liste des fonctions est lue dans le catalogue : toute nouvelle fonction
 * prenant p_org est automatiquement couverte.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { echoue, entrepriseAvecEquipe, nouvelleBase, type Base } from "./outils";

interface Fonction {
  nom: string;
  args: string[];
  volatile: boolean;
}

/** Clés de coût qui ne doivent jamais porter de valeur pour un vendeur « masqué ». */
const CLES_COUTS = new Set([
  "prix_achat", "devise_achat", "taux_achat", "achat_xof", "frais_xof", "frais_directs_xof", "frais_expedition_xof",
  "prix_revient_xof", "marge_xof", "marge_type", "marge_pct", "marge", "part_frais_xof", "total_frais_xof",
  "valeur_stock_revient", "a_payer_fournisseurs", "solde_xof", "solde_initial", "prix_plancher_xof", "frais",
  "couts_par_categorie",
]);

function valeursDeCout(json: unknown, chemin = "$"): string[] {
  const trouves: string[] = [];
  if (Array.isArray(json)) {
    json.forEach((x, i) => trouves.push(...valeursDeCout(x, `${chemin}[${i}]`)));
  } else if (json && typeof json === "object") {
    for (const [cle, val] of Object.entries(json)) {
      if (CLES_COUTS.has(cle) && val !== null) trouves.push(`${chemin}.${cle}`);
      else trouves.push(...valeursDeCout(val, `${chemin}.${cle}`));
    }
  }
  return trouves;
}

let base: Base;
let fonctions: Fonction[];
let A: Awaited<ReturnType<typeof entrepriseAvecEquipe>>;
let B: Awaited<ReturnType<typeof entrepriseAvecEquipe>>;
const ids: Record<string, string> = {};

beforeAll(async () => {
  base = await nouvelleBase();
  A = await entrepriseAvecEquipe(base, "Entreprise A", ["gerant", "vendeur", "comptable", "lecture"]);
  B = await entrepriseAvecEquipe(base, "Entreprise B", ["vendeur"]);

  // Des données dans A (par le propriétaire de A)
  await base.commeUtilisateur(A.membres.proprietaire!);
  const client = await base.rpc("client_enregistrer", { p_org: A.org, p_data: { nom: "Moussa Traoré", telephone: "+223 76 12 34 56" } });
  const vehicule = await base.rpc("vehicule_enregistrer", {
    p_org: A.org,
    p_data: { marque: "Toyota", modele: "RAV4", annee: 2018, prix_achat: 10000, devise_achat: "USD", prix_affiche_xof: 12500000, prix_plancher_xof: 11800000 },
  });
  const vehicule2 = await base.rpc("vehicule_enregistrer", {
    p_org: A.org, p_data: { marque: "Honda", modele: "CR-V", annee: 2019, prix_achat: 9000, prix_affiche_xof: 12000000, prix_plancher_xof: 11000000 },
  });
  const exp = await base.rpc("expedition_enregistrer", { p_org: A.org, p_data: { port_depart: "Houston", port_arrivee: "Cotonou" } });
  await base.rpc("expedition_affecter", { p_org: A.org, p_id: exp.id, p_vehicule_ids: [vehicule.id, vehicule2.id] });
  await base.rpc("frais_enregistrer", { p_org: A.org, p_data: { expedition_id: exp.id, categorie: "fret", montant: 2000, devise: "USD" } });
  await base.rpc("frais_enregistrer", { p_org: A.org, p_data: { vehicule_id: vehicule.id, categorie: "douane", montant: 1900000, statut: "a_payer" } });
  const vente = await base.rpc("vente_creer", {
    p_org: A.org, p_data: { vehicule_id: vehicule.id, client_id: client.id, prix_xof: 12500000, acompte: { montant_xof: 5000000 } },
  });
  Object.assign(ids, { client: client.id, vehicule: vehicule.id, vehicule2: vehicule2.id, exp: exp.id, vente: vente.id });

  await base.commeAdmin();
  fonctions = (await base.sql<{ nom: string; args: string[] | null; volatile: boolean }>(
    `select p.proname as nom, p.proargnames as args, p.provolatile = 'v' as volatile
       from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' order by 1`,
  )).map((r) => ({ nom: r.nom, args: r.args ?? [], volatile: r.volatile }));
}, 180_000);

afterAll(async () => base?.fermer());

function avecOrg(f: Fonction, org: string) {
  return Object.fromEntries(f.args.map((a) => [a, a === "p_org" ? org : null]));
}

describe("isolation entre entreprises", () => {
  it("un membre de A qui appelle CHAQUE fonction avec l'id de B obtient « Accès refusé »", async () => {
    const avecPorg = fonctions.filter((f) => f.args[0] === "p_org");
    expect(avecPorg.length).toBeGreaterThan(50);
    for (const role of ["proprietaire", "vendeur"] as const) {
      await base.commeUtilisateur(A.membres[role]!);
      for (const f of avecPorg) {
        const message = await echoue(base.rpc(f.nom, avecOrg(f, B.org)));
        expect(message, `${f.nom} (${role} de A sur B)`).toMatch(/^Accès refusé/);
      }
    }
  });

  it("un utilisateur sans entreprise est refusé partout, et ne voit aucune entreprise", async () => {
    const seul = await base.creerUtilisateur();
    await base.commeUtilisateur(seul);
    expect(await base.rpc("mes_organisations")).toEqual([]);
    for (const f of fonctions.filter((x) => x.args[0] === "p_org")) {
      expect(await echoue(base.rpc(f.nom, avecOrg(f, A.org))), f.nom).toMatch(/^Accès refusé/);
    }
  });

  it("un id d'une ligne de A passé avec l'org de B ne renvoie rien de A", async () => {
    await base.commeUtilisateur(B.membres.proprietaire!);
    await echoue(base.rpc("vehicule_obtenir", { p_org: B.org, p_id: ids.vehicule }), "Véhicule introuvable");
    await echoue(base.rpc("vente_obtenir", { p_org: B.org, p_id: ids.vente }), "Vente introuvable");
    await echoue(base.rpc("client_obtenir", { p_org: B.org, p_id: ids.client }), "Client introuvable");
    await echoue(base.rpc("expedition_obtenir", { p_org: B.org, p_id: ids.exp }), "Expédition introuvable");
    await echoue(base.rpc("vehicule_changer_etape", { p_org: B.org, p_id: ids.vehicule, p_etape: "parc" }), "Véhicule introuvable");
    // Réutiliser l'id d'une ligne de A pour créer dans B : refusé (idempotence inter-entreprises).
    await echoue(base.rpc("client_enregistrer", { p_org: B.org, p_data: { id: ids.client, nom: "Intrus" } }), "Accès refusé");
    await echoue(base.rpc("vente_creer", { p_org: B.org, p_data: { id: ids.vente } }), "Accès refusé");
    expect(await base.rpc("vehicules_lister", { p_org: B.org })).toEqual([]);
    const r = await base.rpc("recherche", { p_org: B.org, p_q: "RAV4" });
    expect(r.vehicules).toEqual([]);
  });

  it("mes_organisations ne liste que les entreprises du membre", async () => {
    await base.commeUtilisateur(A.membres.vendeur!);
    const orgs = await base.rpc("mes_organisations");
    expect(orgs.map((o: { id: string }) => o.id)).toEqual([A.org]);
    expect(orgs[0].role).toBe("vendeur");
  });
});

describe("rôles", () => {
  it("vendeur : aucun coût, aucune marge, aucun frais, pas de plancher, pas de trésorerie", async () => {
    await base.commeUtilisateur(A.membres.vendeur!);
    const lectures: [string, Record<string, unknown>][] = [
      ["vehicules_lister", { p_org: A.org, p_filtres: { inclure_archives: true } }],
      ["vehicule_obtenir", { p_org: A.org, p_id: ids.vehicule }],
      ["vehicule_obtenir", { p_org: A.org, p_id: ids.vehicule2 }],
      ["vente_obtenir", { p_org: A.org, p_id: ids.vente }],
      ["ventes_lister", { p_org: A.org }],
      ["expeditions_lister", { p_org: A.org }],
      ["expedition_obtenir", { p_org: A.org, p_id: ids.exp }],
      ["tableau_de_bord", { p_org: A.org }],
      ["comptes_lister", { p_org: A.org }],
      ["client_obtenir", { p_org: A.org, p_id: ids.client }],
      ["demandes_correspondances", { p_org: A.org }],
      ["recherche", { p_org: A.org, p_q: "Toyota" }],
    ];
    for (const [nom, params] of lectures) {
      const r = await base.rpc(nom, params);
      expect(valeursDeCout(r), nom).toEqual([]);
    }
    const tdb = await base.rpc("tableau_de_bord", { p_org: A.org });
    expect(tdb.actions.filter((a: { type: string }) => a.type === "frais_a_payer")).toEqual([]);
    expect(tdb.indicateurs.valeur_stock_revient).toBeNull();
    expect(tdb.indicateurs.capital_par_etape.every((e: { montant: unknown }) => e.montant === null)).toBe(true);
    const v = await base.rpc("vehicule_obtenir", { p_org: A.org, p_id: ids.vehicule2 });
    expect(v.prix_affiche_xof).toBe(12000000);
    expect(v.prix_plancher_xof).toBeNull();
    expect(v.frais).toBeNull();
    for (const nom of ["frais_lister", "rapport_marges", "tresorerie"]) {
      await echoue(base.rpc(nom, { p_org: A.org }), "Accès refusé");
    }
  });

  it("vendeur : voit le plancher si vendeur_voit_plancher, les coûts si masquer_couts_vendeurs est faux", async () => {
    await base.commeUtilisateur(A.membres.proprietaire!);
    await base.rpc("parametres_enregistrer", { p_org: A.org, p_patch: { vendeur_voit_plancher: true } });
    await base.commeUtilisateur(A.membres.vendeur!);
    let v = await base.rpc("vehicule_obtenir", { p_org: A.org, p_id: ids.vehicule2 });
    expect(v.prix_plancher_xof).toBe(11000000);
    expect(v.prix_revient_xof).toBeNull();

    await base.commeUtilisateur(A.membres.proprietaire!);
    await base.rpc("parametres_enregistrer", { p_org: A.org, p_patch: { vendeur_voit_plancher: false, masquer_couts_vendeurs: false } });
    await base.commeUtilisateur(A.membres.vendeur!);
    v = await base.rpc("vehicule_obtenir", { p_org: A.org, p_id: ids.vehicule2 });
    expect(v.prix_revient_xof).toBeGreaterThan(0);
    expect(Array.isArray(v.frais)).toBe(true);
    // Coûts visibles, mais les finances restent fermées au vendeur (décision du 28/09/2026).
    for (const nom of ["frais_lister", "rapport_marges", "tresorerie"]) {
      await echoue(base.rpc(nom, { p_org: A.org }), "Accès refusé");
    }

    await base.commeUtilisateur(A.membres.proprietaire!);
    await base.rpc("parametres_enregistrer", { p_org: A.org, p_patch: { masquer_couts_vendeurs: true } });
  });

  it("vendeur : ne peut ni créer de frais ni modifier les paramètres ; peut vendre et encaisser", async () => {
    await base.commeUtilisateur(A.membres.vendeur!);
    await echoue(base.rpc("frais_enregistrer", { p_org: A.org, p_data: { vehicule_id: ids.vehicule2, categorie: "divers", montant: 1000 } }), "Accès refusé");
    await echoue(base.rpc("frais_supprimer", { p_org: A.org, p_id: ids.vehicule2 }), "Accès refusé");
    await echoue(base.rpc("parametres_enregistrer", { p_org: A.org, p_patch: { slogan: "x" } }), "Accès refusé");
    await echoue(base.rpc("vehicule_enregistrer", { p_org: A.org, p_data: { marque: "Kia", modele: "Rio" } }), "Accès refusé");
    await echoue(base.rpc("vente_annuler", { p_org: A.org, p_id: ids.vente, p_motif: "x" }), "Accès refusé");
    const p = await base.rpc("paiement_ajouter", { p_org: A.org, p_data: { vente_id: ids.vente, montant_xof: 100000, mode: "wave" } });
    expect(p.vente.encaisse_xof).toBe(5100000);
  });

  it("vendeur : une vente sous le prix plancher est refusée sans révéler le plancher", async () => {
    await base.commeUtilisateur(A.membres.vendeur!);
    const msg = await echoue(base.rpc("vente_creer", {
      p_org: A.org, p_data: { vehicule_id: ids.vehicule2, client_id: ids.client, prix_xof: 10500000 },
    }), "minimum autorisé");
    expect(msg).not.toContain("11");
  });

  it("lecture : chaque fonction d'écriture est refusée", async () => {
    await base.commeUtilisateur(A.membres.lecture!);
    const ecritures = fonctions.filter((f) => f.volatile && f.args[0] === "p_org");
    expect(ecritures.length).toBeGreaterThan(30);
    for (const f of ecritures) {
      expect(await echoue(base.rpc(f.nom, avecOrg(f, A.org))), f.nom).toMatch(/^Accès refusé/);
    }
    // … mais il lit, coûts compris.
    const v = await base.rpc("vehicule_obtenir", { p_org: A.org, p_id: ids.vehicule });
    expect(v.prix_revient_xof).toBeGreaterThan(0);
    await echoue(base.rpc("membres_lister", { p_org: A.org }), "Accès refusé");
  });

  it("comptable : ne modifie pas un véhicule, mais gère frais et encaissements", async () => {
    await base.commeUtilisateur(A.membres.comptable!);
    for (const [nom, params] of [
      ["vehicule_enregistrer", { p_org: A.org, p_data: { id: ids.vehicule2, prix_affiche_xof: 1 } }],
      ["vehicule_changer_etape", { p_org: A.org, p_id: ids.vehicule2, p_etape: "parc" }],
      ["vehicules_changer_etape_lot", { p_org: A.org, p_ids: [ids.vehicule2], p_etape: "parc" }],
      ["vehicule_archiver", { p_org: A.org, p_id: ids.vehicule2 }],
      ["vehicule_reserver", { p_org: A.org, p_id: ids.vehicule2, p_client_id: ids.client }],
      ["vehicule_photo_ajouter", { p_org: A.org, p_vehicule_id: ids.vehicule2, p_path: `${A.org}/x.jpg` }],
      ["expedition_changer_statut", { p_org: A.org, p_id: ids.exp, p_statut: "en_mer" }],
    ] as [string, Record<string, unknown>][]) {
      await echoue(base.rpc(nom, params), "Accès refusé");
    }
    const f = await base.rpc("frais_enregistrer", { p_org: A.org, p_data: { vehicule_id: ids.vehicule2, categorie: "atelier", montant: 150000 } });
    expect(f.montant_xof).toBe(150000);
    const p = await base.rpc("paiement_ajouter", { p_org: A.org, p_data: { vente_id: ids.vente, montant_xof: 50000 } });
    await base.rpc("paiement_annuler", { p_org: A.org, p_id: p.paiement.id, p_motif: "Doublon" });
  });

  it("gérant : pas de gestion d'équipe ; propriétaire : invite et garde au moins un propriétaire", async () => {
    await base.commeUtilisateur(A.membres.gerant!);
    await echoue(base.rpc("invitation_creer", { p_org: A.org, p_role: "vendeur" }), "Accès refusé");
    await echoue(base.rpc("membre_modifier", { p_org: A.org, p_user: A.membres.vendeur!, p_role: "gerant" }), "Accès refusé");
    const liste = await base.rpc("membres_lister", { p_org: A.org });
    expect(liste.membres.length).toBe(5);
    expect(liste.invitations).toEqual([]);

    await base.commeUtilisateur(A.membres.proprietaire!);
    await echoue(base.rpc("membre_modifier", { p_org: A.org, p_user: A.membres.proprietaire!, p_role: "gerant" }), "au moins un propriétaire");
    const m = await base.rpc("membre_modifier", { p_org: A.org, p_user: A.membres.lecture!, p_actif: false });
    expect(m.actif).toBe(false);
    await base.commeUtilisateur(A.membres.lecture!);
    await echoue(base.rpc("vehicules_lister", { p_org: A.org }), "pas membre actif");
    await base.commeUtilisateur(A.membres.proprietaire!);
    await base.rpc("membre_modifier", { p_org: A.org, p_user: A.membres.lecture!, p_actif: true });
  });
});
