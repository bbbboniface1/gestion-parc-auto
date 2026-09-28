/**
 * Règles métier : numérotation, coût de revient, ventes, paiements, échéances,
 * invitations, expéditions, demandes, vérification publique, recherche et
 * idempotence des créations (reprise hors ligne).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { echoue, entrepriseAvecEquipe, nouvelleBase, type Base } from "./outils";

let base: Base;
let aujourdhui: string;
let annee: number;

function jour(decalage: number): string {
  const d = new Date(`${aujourdhui}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + decalage);
  return d.toISOString().slice(0, 10);
}

beforeAll(async () => {
  base = await nouvelleBase();
  const [r] = await base.sql<{ d: string }>("select current_date::text as d");
  aujourdhui = r!.d;
  annee = Number(aujourdhui.slice(0, 4));
}, 120_000);

afterAll(async () => base?.fermer());

/** Nouvelle entreprise avec un client et des véhicules prêts à vendre. */
async function preparer(nom: string, nbVehicules = 2) {
  const e = await entrepriseAvecEquipe(base, nom);
  const client = await base.rpc("client_enregistrer", { p_org: e.org, p_data: { nom: "Aminata Diallo", telephone: "+223 66 45 78 12" } });
  const vehicules: string[] = [];
  for (let i = 0; i < nbVehicules; i++) {
    const v = await base.rpc("vehicule_enregistrer", {
      p_org: e.org, p_data: { marque: "Toyota", modele: "Corolla", annee: 2019, prix_achat: 6000 + i * 100, prix_affiche_xof: 9000000, etape: "parc" },
    });
    vehicules.push(v.id);
  }
  return { ...e, client: client.id as string, vehicules };
}

describe("numérotation", () => {
  it("FAC-AAAA-0001, 0002… ; une vente qui échoue ne consomme pas de numéro", async () => {
    const e = await preparer("Numérotation", 3);
    const v1 = await base.rpc("vente_creer", { p_org: e.org, p_data: { vehicule_id: e.vehicules[0], client_id: e.client, prix_xof: 9000000 } });
    expect(v1.numero).toBe(`FAC-${annee}-0001`);

    // Échec APRÈS l'attribution du numéro (acompte trop élevé, puis échéancier faux) : tout est annulé.
    await echoue(base.rpc("vente_creer", {
      p_org: e.org, p_data: { vehicule_id: e.vehicules[1], client_id: e.client, prix_xof: 9000000, acompte: { montant_xof: 9500000 } },
    }), "dépasse le montant de la vente");
    await echoue(base.rpc("vente_creer", {
      p_org: e.org,
      p_data: { vehicule_id: e.vehicules[1], client_id: e.client, prix_xof: 9000000, mode: "echelonne",
                acompte: { montant_xof: 3000000 }, echeances: [{ date_echeance: jour(30), montant_xof: 5000000 }] },
    }), "doit être égale au montant de la vente");

    const v2 = await base.rpc("vente_creer", { p_org: e.org, p_data: { vehicule_id: e.vehicules[1], client_id: e.client, prix_xof: 9000000 } });
    expect(v2.numero).toBe(`FAC-${annee}-0002`);
    const recus = await base.rpc("paiements_lister", { p_org: e.org });
    expect(recus).toEqual([]);

    await base.commeAdmin();
    const [c] = await base.sql<{ dernier: number }>(
      "select dernier from public.compteurs where org_id = $1 and type = 'facture' and annee = $2", [e.org, annee],
    );
    expect(c!.dernier).toBe(2);
  });

  it("remise annuelle : une vente datée de l'année précédente repart à 0001 pour cette année-là", async () => {
    const e = await preparer("Remise annuelle", 3);
    const a = await base.rpc("vente_creer", { p_org: e.org, p_data: { vehicule_id: e.vehicules[0], client_id: e.client, prix_xof: 9000000 } });
    const b = await base.rpc("vente_creer", {
      p_org: e.org, p_data: { vehicule_id: e.vehicules[1], client_id: e.client, prix_xof: 9000000, date_vente: `${annee - 1}-12-30` },
    });
    const c = await base.rpc("vente_creer", { p_org: e.org, p_data: { vehicule_id: e.vehicules[2], client_id: e.client, prix_xof: 9000000 } });
    expect([a.numero, b.numero, c.numero]).toEqual([`FAC-${annee}-0001`, `FAC-${annee - 1}-0001`, `FAC-${annee}-0002`]);
  });

  it("le format, le préfixe et le nombre de chiffres suivent les paramètres ; références véhicules sans année", async () => {
    const e = await preparer("Format", 1);
    await base.rpc("parametres_enregistrer", { p_org: e.org, p_patch: { prefixe_facture: "F", format_numero: "{AA}/{NUM}-{PREFIXE}", padding: 3 } });
    const v = await base.rpc("vente_creer", { p_org: e.org, p_data: { vehicule_id: e.vehicules[0], client_id: e.client, prix_xof: 9000000 } });
    expect(v.numero).toBe(`${String(annee).slice(2)}/001-F`);
    const veh = await base.rpc("vehicule_obtenir", { p_org: e.org, p_id: e.vehicules[0] });
    expect(veh.reference).toBe("V-0001");
    await echoue(base.rpc("parametres_enregistrer", { p_org: e.org, p_patch: { format_numero: "{PREFIXE}-{AAAA}" } }), "{NUM}");
  });
});

describe("coût de revient", () => {
  it("conversion USD, répartition égale et au prorata de la valeur : la somme des parts est exacte", async () => {
    const e = await entrepriseAvecEquipe(base, "Coûts");
    const creer = (data: Record<string, unknown>) => base.rpc("vehicule_enregistrer", { p_org: e.org, p_data: data });
    const a = await creer({ marque: "Toyota", modele: "RAV4", prix_achat: 10000, devise_achat: "USD" }); // 5 700 000
    const b = await creer({ marque: "Honda", modele: "CR-V", prix_achat: 5000, devise_achat: "USD", taux_achat: 570 }); // 2 850 000
    const c = await creer({ marque: "Kia", modele: "Rio", prix_achat: 3000000, devise_achat: "XOF" }); // 3 000 000
    expect([a.achat_xof, b.achat_xof, c.achat_xof]).toEqual([5700000, 2850000, 3000000]);
    expect(c.taux_achat).toBe(1);

    const exp = await base.rpc("expedition_enregistrer", { p_org: e.org, p_data: { mode: "conteneur", port_depart: "Houston", port_arrivee: "Cotonou" } });
    await base.rpc("expedition_affecter", { p_org: e.org, p_id: exp.id, p_vehicule_ids: [a.id, b.id, c.id] });
    const egale = await base.rpc("frais_enregistrer", { p_org: e.org, p_data: { expedition_id: exp.id, categorie: "port", montant: 1000, repartition: "egale" } });
    const valeur = await base.rpc("frais_enregistrer", { p_org: e.org, p_data: { expedition_id: exp.id, categorie: "assurance", montant: 100000, repartition: "valeur" } });
    const usd = await base.rpc("frais_enregistrer", { p_org: e.org, p_data: { expedition_id: exp.id, categorie: "fret", montant: 4201, devise: "USD", taux: 575.5 } });
    expect(usd.montant_xof).toBe(Math.round(4201 * 575.5));
    const direct = await base.rpc("frais_enregistrer", { p_org: e.org, p_data: { vehicule_id: a.id, categorie: "frais_enchere", montant: 100, devise: "USD" } });
    expect(direct.taux).toBe(570);
    expect(direct.montant_xof).toBe(57000);

    const detail = await base.rpc("expedition_obtenir", { p_org: e.org, p_id: exp.id });
    const parts = (id: string) => detail.frais.find((f: { id: string }) => f.id === id).parts.map((p: { part_xof: number }) => p.part_xof);
    expect(parts(egale.id)).toEqual([333, 333, 334]); // le reste va au dernier (V-0003)
    // 100 000 × 5,70/11,55 = 49 350,6 ; × 2,85/11,55 = 24 675,3 ; reste = 25 975
    expect(parts(valeur.id)).toEqual([49350, 24675, 25975]);
    for (const f of detail.frais) {
      const somme = f.parts.reduce((s: number, p: { part_xof: number }) => s + p.part_xof, 0);
      expect(somme, f.categorie).toBe(f.montant_xof);
    }
    const partUsd = parts(usd.id);
    const va = await base.rpc("vehicule_obtenir", { p_org: e.org, p_id: a.id });
    expect(va.frais_directs_xof).toBe(57000);
    expect(va.frais_expedition_xof).toBe(333 + 49350 + partUsd[0]);
    expect(va.prix_revient_xof).toBe(5700000 + 57000 + 333 + 49350 + partUsd[0]);
    const cat = Object.fromEntries(va.couts_par_categorie.map((x: { categorie: string; montant_xof: number }) => [x.categorie, x.montant_xof]));
    expect(cat).toMatchObject({ achat: 5700000, frais_enchere: 57000, port: 333, assurance: 49350 });
    const total = [a, b, c].length;
    expect(total).toBe(3);
  });

  it("frais de conteneur : la part d'un véhicule vendu est figée, le reste va aux non vendus", async () => {
    const e = await preparer("Parts figées", 0);
    const creer = async (modele: string) =>
      (await base.rpc("vehicule_enregistrer", { p_org: e.org, p_data: { marque: "Toyota", modele, prix_achat: 5000000, devise_achat: "XOF" } })).id as string;
    const [a, b, c] = [await creer("A"), await creer("B"), await creer("C")];
    const exp = await base.rpc("expedition_enregistrer", { p_org: e.org, p_data: { mode: "conteneur" } });
    await base.rpc("expedition_affecter", { p_org: e.org, p_id: exp.id, p_vehicule_ids: [a, b, c] });
    const fret = await base.rpc("frais_enregistrer", { p_org: e.org, p_data: { expedition_id: exp.id, categorie: "fret", montant: 3000, repartition: "egale" } });
    const part = async (id: string) => (await base.rpc("vehicule_obtenir", { p_org: e.org, p_id: id })).frais_expedition_xof as number;
    const parts = async (ids: string[]) => Promise.all(ids.map(part));
    const totalFrais = async () => {
      const d = await base.rpc("expedition_obtenir", { p_org: e.org, p_id: exp.id });
      for (const f of d.frais) expect(f.parts.reduce((s: number, p: { part_xof: number }) => s + p.part_xof, 0), f.categorie).toBe(f.montant_xof);
    };
    expect(await parts([a, b, c])).toEqual([1000, 1000, 1000]);

    const vente = await base.rpc("vente_creer", { p_org: e.org, p_data: { vehicule_id: a, client_id: e.client, prix_xof: 9000000 } });

    // Un véhicule ajouté après la vente reprend le reste du fret ; la part de A ne bouge pas.
    const d = await creer("D");
    await base.rpc("vehicule_expedition_affecter", { p_org: e.org, p_vehicule_id: d, p_expedition_id: exp.id });
    expect(await parts([a, b, c, d])).toEqual([1000, 666, 666, 668]);

    // Un frais saisi après la vente ne touche que les non vendus.
    const port = await base.rpc("frais_enregistrer", { p_org: e.org, p_data: { expedition_id: exp.id, categorie: "port", montant: 900, repartition: "egale" } });
    expect(await parts([a, b, c, d])).toEqual([1000, 966, 966, 968]);
    await totalFrais();

    // Corriger le montant recalcule tout, part figée comprise.
    await base.rpc("frais_enregistrer", { p_org: e.org, p_data: { id: fret.id, montant: 6000 } });
    expect(await parts([a, b, c, d])).toEqual([1500, 1800, 1800, 1800]);
    await totalFrais();

    // Supprimer le frais supprime aussi la part figée.
    await base.rpc("frais_supprimer", { p_org: e.org, p_id: fret.id });
    expect(await parts([a, b, c, d])).toEqual([0, 300, 300, 300]);

    // Annuler la vente libère le véhicule : il reprend sa part des frais du conteneur.
    await base.rpc("vente_annuler", { p_org: e.org, p_id: vente.id, p_motif: "Test" });
    expect(await parts([a, b, c, d])).toEqual([225, 225, 225, 225]);
    await base.commeAdmin();
    expect(await base.sql("select 1 from public.frais_parts_figees where vente_id = $1", [vente.id])).toEqual([]);
    await base.commeUtilisateur(e.membres.proprietaire!);
    expect(port.montant_xof).toBe(900);
  });

  it("un frais payé sans compte va sur la caisse ; « marquer payé » aussi", async () => {
    const e = await preparer("Compte par défaut", 0);
    const [caisse] = await base.rpc("comptes_lister", { p_org: e.org });
    const paye = await base.rpc("frais_enregistrer", { p_org: e.org, p_data: { portee: "generale", categorie: "loyer", montant: 350000 } });
    expect(paye.compte_id).toBe(caisse.id);
    const aPayer = await base.rpc("frais_enregistrer", { p_org: e.org, p_data: { portee: "generale", categorie: "loyer", montant: 1000, statut: "a_payer" } });
    expect(aPayer.compte_id).toBeNull();
    const regle = await base.rpc("frais_enregistrer", { p_org: e.org, p_data: { id: aPayer.id, statut: "paye" } });
    expect(regle.compte_id).toBe(caisse.id);
    const t = await base.rpc("tresorerie", { p_org: e.org });
    expect(t.comptes[0].solde_xof).toBe(-351000);
    expect(t.totaux.solde_total).toBe(-351000);
  });
});

describe("ventes", () => {
  it("un véhicule en mer se vend ; statut vendu ; revente impossible ; annulation → avoir et disponible ; livraison", async () => {
    const e = await preparer("Ventes", 0);
    const v = await base.rpc("vehicule_enregistrer", { p_org: e.org, p_data: { marque: "Ford", modele: "Explorer", annee: 2017, prix_achat: 9400, etape: "en_mer" } });
    const vente = await base.rpc("vente_creer", {
      p_org: e.org, p_data: { vehicule_id: v.id, client_id: e.client, prix_xof: 12500000, acompte: { montant_xof: 5000000, mode: "especes" } },
    });
    expect(vente.statut).toBe("active");
    expect(vente.statut_paiement).toBe("partiel");
    expect(vente.snapshot.mention_livraison).toBe("Livraison à l'arrivée du véhicule");
    expect(vente.snapshot.client.nom).toBe("Aminata Diallo");
    expect(vente.snapshot.vehicule.marque).toBe("Ford");
    expect(vente.token_verification).toMatch(/^[0-9a-f]{64}$/);
    let veh = await base.rpc("vehicule_obtenir", { p_org: e.org, p_id: v.id });
    expect(veh.statut_commercial).toBe("vendu");
    expect(veh.etape).toBe("en_mer");
    expect(veh.vente.numero).toBe(vente.numero);

    await echoue(base.rpc("vente_creer", { p_org: e.org, p_data: { vehicule_id: v.id, client_id: e.client, prix_xof: 13000000 } }), "déjà vendu");
    await echoue(base.rpc("vehicule_reserver", { p_org: e.org, p_id: v.id, p_client_id: e.client }), "déjà vendu");

    const livree = await base.rpc("vente_livrer", { p_org: e.org, p_vente_id: vente.id });
    expect(livree.date_livraison).toBe(aujourdhui);
    expect(livree.livree).toBe(true);

    await echoue(base.rpc("vente_annuler", { p_org: e.org, p_id: vente.id, p_motif: "  " }), "motif");
    const annulee = await base.rpc("vente_annuler", { p_org: e.org, p_id: vente.id, p_motif: "Désistement du client" });
    expect(annulee.statut).toBe("annulee");
    expect(annulee.numero_avoir).toBe(`AV-${annee}-0001`);
    expect(annulee.a_rembourser_xof).toBe(5000000);
    expect(annulee.marge_xof).toBeNull();
    await echoue(base.rpc("vente_annuler", { p_org: e.org, p_id: vente.id, p_motif: "encore" }), "déjà annulée");
    veh = await base.rpc("vehicule_obtenir", { p_org: e.org, p_id: v.id });
    expect(veh.statut_commercial).toBe("disponible");
    expect(veh.vente).toBeNull();
    expect(veh.historique_ventes.map((h: { statut: string }) => h.statut)).toEqual(["annulee"]);

    const revente = await base.rpc("vente_creer", { p_org: e.org, p_data: { vehicule_id: v.id, client_id: e.client, prix_xof: 12000000 } });
    expect(revente.numero).toBe(`FAC-${annee}-0002`);
    const ventes = await base.rpc("ventes_lister", { p_org: e.org, p_filtres: { statut: "active" } });
    expect(ventes.length).toBe(1);
  });

  it("réservation : bloque la vente à un autre client, pas au client réservataire ; libération", async () => {
    const e = await preparer("Réservations", 1);
    const autre = await base.rpc("client_enregistrer", { p_org: e.org, p_data: { nom: "Oumar Coulibaly" } });
    const r = await base.rpc("vehicule_reserver", { p_org: e.org, p_id: e.vehicules[0], p_client_id: e.client, p_jusqu_au: jour(5) });
    expect(r.statut_commercial).toBe("reserve");
    expect(r.reserve_client_nom).toBe("Aminata Diallo");
    await echoue(base.rpc("vente_creer", { p_org: e.org, p_data: { vehicule_id: e.vehicules[0], client_id: autre.id, prix_xof: 9000000 } }), "réservé pour Aminata Diallo");
    const l = await base.rpc("vehicule_liberer", { p_org: e.org, p_id: e.vehicules[0] });
    expect(l.statut_commercial).toBe("disponible");
    await base.rpc("vehicule_reserver", { p_org: e.org, p_id: e.vehicules[0], p_client_id: e.client });
    const v = await base.rpc("vente_creer", { p_org: e.org, p_data: { vehicule_id: e.vehicules[0], client_id: e.client, prix_xof: 9000000 } });
    expect(v.vehicule.statut_commercial).toBe("vendu");
  });

  it("proforma : numérotée, acceptée (réserve), convertie en vente de façon idempotente", async () => {
    const e = await preparer("Proformas", 1);
    const p = await base.rpc("proforma_creer", { p_org: e.org, p_data: { vehicule_id: e.vehicules[0], client_id: e.client, prix_xof: 9000000, remise_xof: 100000 } });
    expect(p.numero).toBe(`PRO-${annee}-0001`);
    expect(p.montant_ttc).toBe(8900000);
    expect(p.valide_jusqu_au).toBe(jour(15));
    const acc = await base.rpc("proforma_changer_statut", { p_org: e.org, p_id: p.id, p_statut: "acceptee" });
    expect(acc.vehicule.statut_commercial).toBe("reserve");
    const v1 = await base.rpc("proforma_convertir", { p_org: e.org, p_id: p.id, p_data: { acompte: { montant_xof: 1000000 } } });
    const v2 = await base.rpc("proforma_convertir", { p_org: e.org, p_id: p.id });
    expect(v2.id).toBe(v1.id);
    expect(v1.montant_ttc).toBe(8900000);
    expect(v1.proforma.numero).toBe(p.numero);
    const pr = await base.rpc("proforma_obtenir", { p_org: e.org, p_id: p.id });
    expect(pr.statut).toBe("convertie");
    expect(pr.vente_numero).toBe(v1.numero);
  });
});

describe("paiements et échéances", () => {
  it("partiel puis payé ; dépassement refusé ; annulation d'un paiement ; remboursement après annulation", async () => {
    const e = await preparer("Paiements", 1);
    const vente = await base.rpc("vente_creer", { p_org: e.org, p_data: { vehicule_id: e.vehicules[0], client_id: e.client, prix_xof: 10000000 } });
    expect(vente.statut_paiement).toBe("non_paye");
    const p1 = await base.rpc("paiement_ajouter", { p_org: e.org, p_data: { vente_id: vente.id, montant_xof: 4000000, mode: "orange_money", reference: "CI260924.1432.C48213" } });
    expect(p1.paiement.numero_recu).toBe(`REC-${annee}-0001`);
    expect(p1.vente).toMatchObject({ encaisse_xof: 4000000, reste_xof: 6000000, statut_paiement: "partiel" });
    await echoue(base.rpc("paiement_ajouter", { p_org: e.org, p_data: { vente_id: vente.id, montant_xof: 6000001 } }), "dépasse le reste à payer");
    await echoue(base.rpc("paiement_ajouter", { p_org: e.org, p_data: { vente_id: vente.id, montant_xof: -1000 } }), "vente annulée");
    const p2 = await base.rpc("paiement_ajouter", { p_org: e.org, p_data: { vente_id: vente.id, montant_xof: 6000000, mode: "especes" } });
    expect(p2.vente).toMatchObject({ encaisse_xof: 10000000, reste_xof: 0, statut_paiement: "paye" });

    const a = await base.rpc("paiement_annuler", { p_org: e.org, p_id: p2.paiement.id, p_motif: "Saisie en double" });
    expect(a.paiement.annule).toBe(true);
    expect(a.vente).toMatchObject({ encaisse_xof: 4000000, statut_paiement: "partiel" });
    await echoue(base.rpc("paiement_annuler", { p_org: e.org, p_id: p2.paiement.id }), "déjà annulé");

    await base.rpc("vente_annuler", { p_org: e.org, p_id: vente.id, p_motif: "Financement refusé" });
    await echoue(base.rpc("paiement_ajouter", { p_org: e.org, p_data: { vente_id: vente.id, montant_xof: 1000 } }), "seul un remboursement");
    await echoue(base.rpc("paiement_ajouter", { p_org: e.org, p_data: { vente_id: vente.id, montant_xof: -4000001 } }), "dépasse le montant encaissé");
    const r = await base.rpc("paiement_ajouter", { p_org: e.org, p_data: { vente_id: vente.id, montant_xof: -4000000, mode: "orange_money" } });
    expect(r.paiement.type).toBe("remboursement");
    expect(r.vente).toMatchObject({ encaisse_xof: 0, a_rembourser_xof: 0, statut: "annulee" });
    await echoue(base.rpc("paiement_annuler", { p_org: e.org, p_id: p1.paiement.id }), "remboursement");
  });

  it("imputation dans l'ordre des échéances ; l'échéance en retard remonte au tableau de bord", async () => {
    const e = await preparer("Échéances", 1);
    const vente = await base.rpc("vente_creer", {
      p_org: e.org,
      p_data: {
        vehicule_id: e.vehicules[0], client_id: e.client, prix_xof: 9000000, date_vente: jour(-40), mode: "echelonne",
        acompte: { montant_xof: 3000000, date: jour(-40) },
        echeances: [{ date_echeance: jour(-10), montant_xof: 3000000 }, { date_echeance: jour(20), montant_xof: 3000000 }],
      },
    });
    await base.rpc("paiement_ajouter", { p_org: e.org, p_data: { vente_id: vente.id, montant_xof: 1000000, date: jour(-5) } });
    const v = await base.rpc("vente_obtenir", { p_org: e.org, p_id: vente.id });
    expect(v.echeances.map((x: { statut: string; reste_xof: number }) => [x.statut, x.reste_xof])).toEqual([
      ["payee", 0], ["en_retard", 2000000], ["a_venir", 3000000],
    ]);
    expect(v.retard_xof).toBe(2000000);
    const tdb = await base.rpc("tableau_de_bord", { p_org: e.org });
    const retard = tdb.actions.filter((a: { type: string }) => a.type === "echeance_retard");
    expect(retard.length).toBe(1);
    expect(retard[0]).toMatchObject({ gravite: "haute", entite: "vente", entite_id: vente.id, date: jour(-10) });
    expect(retard[0].detail).toContain("2 000 000 FCFA");
    expect(tdb.indicateurs.creances_total).toBe(5000000);

    await base.rpc("paiement_ajouter", { p_org: e.org, p_data: { vente_id: vente.id, montant_xof: 2000000 } });
    const tdb2 = await base.rpc("tableau_de_bord", { p_org: e.org });
    expect(tdb2.actions.filter((a: { type: string }) => a.type === "echeance_retard")).toEqual([]);
  });
});

describe("invitations", () => {
  it("code valide, expiré, déjà utilisé, invalide", async () => {
    const e = await entrepriseAvecEquipe(base, "Invitations");
    const inv = await base.rpc("invitation_creer", { p_org: e.org, p_role: "vendeur" });
    expect(inv.code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    await echoue(base.rpc("invitation_creer", { p_org: e.org, p_role: "proprietaire" }), "valeur « proprietaire » invalide");

    const u1 = await base.creerUtilisateur();
    await base.commeUtilisateur(u1);
    const ok = await base.rpc("invitation_accepter", { p_code: ` ${inv.code.slice(0, 4).toLowerCase()}-${inv.code.slice(4)} ` });
    expect(ok).toMatchObject({ id: e.org, role: "vendeur" });
    expect((await base.rpc("mes_organisations"))[0].role).toBe("vendeur");

    const u2 = await base.creerUtilisateur();
    await base.commeUtilisateur(u2);
    await echoue(base.rpc("invitation_accepter", { p_code: inv.code }), "déjà été utilisé");
    await echoue(base.rpc("invitation_accepter", { p_code: "ZZZZZZZZ" }), "invalide");

    await base.commeUtilisateur(e.membres.proprietaire!);
    const inv2 = await base.rpc("invitation_creer", { p_org: e.org, p_role: "comptable" });
    await base.commeAdmin();
    await base.sql("update public.invitations set expire_le = now() - interval '1 minute' where id = $1", [inv2.id]);
    await base.commeUtilisateur(u2);
    await echoue(base.rpc("invitation_accepter", { p_code: inv2.code }), "expiré");
    expect(await base.rpc("mes_organisations")).toEqual([]);
  });
});

describe("expéditions et demandes", () => {
  it("expedition_changer_statut propage l'étape en_mer puis au_port, sans faire reculer un véhicule", async () => {
    const e = await entrepriseAvecEquipe(base, "Expéditions");
    const v = async (etape: string) => (await base.rpc("vehicule_enregistrer", { p_org: e.org, p_data: { marque: "Toyota", modele: "Camry", etape, date_achat: jour(-30), etape_depuis: jour(-25) } })).id as string;
    const [a, b, c] = [await v("achete"), await v("transport_usa"), await v("convoi")];
    const exp = await base.rpc("expedition_enregistrer", { p_org: e.org, p_data: { mode: "roro", compagnie: "Grimaldi", navire: "Grande Dakar" } });
    expect(exp.reference).toBe("EXP-0001");
    await base.rpc("expedition_affecter", { p_org: e.org, p_id: exp.id, p_vehicule_ids: [a, b, c] });
    const enMer = await base.rpc("expedition_changer_statut", { p_org: e.org, p_id: exp.id, p_statut: "en_mer", p_date: jour(-20) });
    expect(enMer.statut).toBe("en_mer");
    expect(enMer.date_depart).toBe(jour(-20));
    expect(enMer.vehicules_mis_a_jour).toBe(2);
    const etapes = (x: { vehicules: { etape: string }[] }) => x.vehicules.map((y) => y.etape);
    expect(etapes(enMer)).toEqual(["en_mer", "en_mer", "convoi"]);
    const arrivee = await base.rpc("expedition_changer_statut", { p_org: e.org, p_id: exp.id, p_statut: "arrivee" });
    expect(etapes(arrivee)).toEqual(["au_port", "au_port", "convoi"]);
    expect(arrivee.date_arrivee_reelle).toBe(aujourdhui);
    const va = await base.rpc("vehicule_obtenir", { p_org: e.org, p_id: a });
    expect(va.etape_depuis).toBe(aujourdhui);
    expect(va.etapes.map((x: { etape: string }) => x.etape)).toEqual(["au_port", "en_mer", "achete"]);
    await base.rpc("expedition_changer_statut", { p_org: e.org, p_id: exp.id, p_statut: "cloturee" });
    await echoue(base.rpc("expedition_affecter", { p_org: e.org, p_id: exp.id, p_vehicule_ids: [a] }), "clôturée");
  });

  it("un véhicule qui rejoint un conteneur déjà parti ou arrivé prend l'étape du conteneur (parc et expédition concordent)", async () => {
    const e = await entrepriseAvecEquipe(base, "Cohérence conteneur");
    const v = async (etape: string) => (await base.rpc("vehicule_enregistrer", { p_org: e.org, p_data: { marque: "Honda", modele: "CR-V", etape, date_achat: jour(-30), etape_depuis: jour(-25) } })).id as string;
    const [a, b, c] = [await v("achete"), await v("transport_usa"), await v("douane")];
    const exp = await base.rpc("expedition_enregistrer", { p_org: e.org, p_data: { mode: "conteneur", port_depart: "Houston", port_arrivee: "Cotonou" } });
    await base.rpc("expedition_affecter", { p_org: e.org, p_id: exp.id, p_vehicule_ids: [a] });
    await base.rpc("expedition_changer_statut", { p_org: e.org, p_id: exp.id, p_statut: "en_mer", p_date: jour(-10) });

    // Affectation groupée : b rejoint un conteneur en mer -> « en_mer » ; c (déjà à la douane) ne recule pas.
    const groupe = await base.rpc("expedition_affecter", { p_org: e.org, p_id: exp.id, p_vehicule_ids: [a, b, c] });
    expect(groupe.vehicules_mis_a_jour).toBe(1);
    expect(groupe.vehicules.map((x: { etape: string }) => x.etape)).toEqual(["en_mer", "en_mer", "douane"]);
    const vb = await base.rpc("vehicule_obtenir", { p_org: e.org, p_id: b });
    expect(vb.etape_depuis).toBe(jour(-10));

    // Un seul véhicule, depuis sa fiche.
    const d = await v("achete");
    const vd = await base.rpc("vehicule_expedition_affecter", { p_org: e.org, p_vehicule_id: d, p_expedition_id: exp.id });
    expect(vd.etape).toBe("en_mer");
    expect(vd.expedition.reference).toBe(exp.reference);
    const retire = await base.rpc("vehicule_expedition_affecter", { p_org: e.org, p_vehicule_id: d, p_expedition_id: null });
    expect(retire.expedition).toBeNull();
    expect(retire.etape).toBe("en_mer");

    // Arrivé au port : un nouveau venu passe « au_port » ; une expédition clôturée refuse.
    await base.rpc("expedition_changer_statut", { p_org: e.org, p_id: exp.id, p_statut: "arrivee" });
    const f = await v("transport_usa");
    expect((await base.rpc("vehicule_expedition_affecter", { p_org: e.org, p_vehicule_id: f, p_expedition_id: exp.id })).etape).toBe("au_port");
    await base.rpc("expedition_changer_statut", { p_org: e.org, p_id: exp.id, p_statut: "cloturee" });
    await echoue(base.rpc("vehicule_expedition_affecter", { p_org: e.org, p_vehicule_id: d, p_expedition_id: exp.id }), "clôturée");
  });

  it("demandes_correspondances : demande ouverte × véhicule non vendu qui correspond", async () => {
    const e = await preparer("Demandes", 0);
    const rav = await base.rpc("vehicule_enregistrer", { p_org: e.org, p_data: { marque: "Toyota", modele: "RAV4 XLE", annee: 2019, prix_affiche_xof: 12800000, etape: "en_mer" } });
    await base.rpc("vehicule_enregistrer", { p_org: e.org, p_data: { marque: "Toyota", modele: "RAV4", annee: 2015, prix_affiche_xof: 8000000 } });
    await base.rpc("vehicule_enregistrer", { p_org: e.org, p_data: { marque: "Toyota", modele: "RAV4", annee: 2019, prix_affiche_xof: 15000000 } });
    const d = await base.rpc("demande_enregistrer", {
      p_org: e.org, p_data: { client_id: e.client, marque: "toyota", modele: "rav4", annee_min: 2018, annee_max: 2020, budget_max_xof: 13000000 },
    });
    expect(d.nb_correspondances).toBe(1);
    let c = await base.rpc("demandes_correspondances", { p_org: e.org });
    expect(c.length).toBe(1);
    expect(c[0].vehicule.id).toBe(rav.id);
    expect(c[0].demande.client_nom).toBe("Aminata Diallo");
    const tdb = await base.rpc("tableau_de_bord", { p_org: e.org });
    expect(tdb.actions.filter((a: { type: string }) => a.type === "demande_correspondante").length).toBe(1);

    await base.rpc("vente_creer", { p_org: e.org, p_data: { vehicule_id: rav.id, client_id: e.client, prix_xof: 12800000 } });
    c = await base.rpc("demandes_correspondances", { p_org: e.org });
    expect(c).toEqual([]);
  });
});

describe("vérification publique d'une facture", () => {
  it("token valide, invalide, facture annulée ; rien d'autre que l'essentiel", async () => {
    const e = await preparer("Vérification", 1);
    const vente = await base.rpc("vente_creer", { p_org: e.org, p_data: { vehicule_id: e.vehicules[0], client_id: e.client, prix_xof: 9000000 } });
    await base.commeAnonyme();
    const ok = await base.rpc("verifier_document", { p_token: vente.token_verification });
    expect(ok).toEqual({ valide: true, entreprise: "Vérification", numero: vente.numero, date: aujourdhui, montant: 9000000, statut: "active" });
    expect(await base.rpc("verifier_document", { p_token: "f".repeat(64) })).toEqual({ valide: false });
    expect(await base.rpc("verifier_document", { p_token: "'; drop table public.ventes; --" })).toEqual({ valide: false });
    expect(await base.rpc("verifier_document", { p_token: null })).toEqual({ valide: false });

    await base.commeUtilisateur(e.membres.proprietaire!);
    await base.rpc("vente_annuler", { p_org: e.org, p_id: vente.id, p_motif: "Erreur de saisie" });
    await base.commeAnonyme();
    expect((await base.rpc("verifier_document", { p_token: vente.token_verification })).statut).toBe("annulee");
  });
});

describe("recherche", () => {
  it("VIN, lot, référence, marque, client, téléphone, numéro de document ; caractères spéciaux sans erreur", async () => {
    const e = await preparer("Recherche", 0);
    const v = await base.rpc("vehicule_enregistrer", {
      p_org: e.org, p_data: { marque: "Lexus", modele: "RX 350", annee: 2016, vin: "2T2BZMCAXGC104386", lot_numero: "MH-2291047", prix_affiche_xof: 16900000 },
    });
    const vente = await base.rpc("vente_creer", { p_org: e.org, p_data: { vehicule_id: v.id, client_id: e.client, prix_xof: 16500000 } });
    const q = (texte: string) => base.rpc("recherche", { p_org: e.org, p_q: texte });
    expect((await q("104386")).vehicules[0].id).toBe(v.id);
    expect((await q("2291047")).vehicules[0].id).toBe(v.id);
    expect((await q("V-0001")).vehicules[0].id).toBe(v.id);
    expect((await q("lexus rx")).vehicules[0].id).toBe(v.id);
    expect((await q("aminata")).clients[0].id).toBe(e.client);
    expect((await q("66457812")).clients[0].id).toBe(e.client);
    expect((await q(vente.numero)).ventes[0].id).toBe(vente.id);
    for (const texte of ["',()%_", "%", "_", "\\", "a'b\"c", "); select 1; --", "%%%%", "ÉÈ"]) {
      const r = await q(texte);
      expect(r.vehicules, texte).toEqual([]);
      expect(r.clients, texte).toEqual([]);
    }
    const listes = await base.rpc("vehicules_lister", { p_org: e.org, p_filtres: { q: "%" } });
    expect(listes).toEqual([]);
    expect(await base.rpc("clients_lister", { p_org: e.org, p_recherche: "_" })).toEqual([]);
  });
});

describe("idempotence des créations (reprise hors ligne)", () => {
  it("deux vente_creer avec le même id : une seule vente, un seul numéro, la même réponse", async () => {
    const e = await preparer("Idempotence", 2);
    const id = randomUUID();
    const donnees = { id, vehicule_id: e.vehicules[0], client_id: e.client, prix_xof: 9000000, acompte: { montant_xof: 1000000 } };
    const v1 = await base.rpc("vente_creer", { p_org: e.org, p_data: donnees });
    const v2 = await base.rpc("vente_creer", { p_org: e.org, p_data: donnees });
    expect(v1.id).toBe(id);
    expect(v2).toEqual(v1);
    expect(v2.numero).toBe(`FAC-${annee}-0001`);
    expect((await base.rpc("ventes_lister", { p_org: e.org })).length).toBe(1);
    expect((await base.rpc("paiements_lister", { p_org: e.org })).length).toBe(1);
    const suivante = await base.rpc("vente_creer", { p_org: e.org, p_data: { vehicule_id: e.vehicules[1], client_id: e.client, prix_xof: 9000000 } });
    expect(suivante.numero).toBe(`FAC-${annee}-0002`);
  });

  it("véhicule, frais, client, expédition, demande, paiement, proforma : un rejeu ne duplique rien", async () => {
    const e = await preparer("Idempotence 2", 1);
    const idV = randomUUID();
    const dv = { id: idV, marque: "Kia", modele: "Sorento", prix_achat: 8900 };
    const v1 = await base.rpc("vehicule_enregistrer", { p_org: e.org, p_data: dv });
    const v2 = await base.rpc("vehicule_enregistrer", { p_org: e.org, p_data: dv });
    expect(v2.reference).toBe(v1.reference);
    expect(v2.updated_at).toBe(v1.updated_at);

    const idF = randomUUID();
    const df = { id: idF, vehicule_id: idV, categorie: "remorquage", montant: 300, devise: "USD" };
    await base.rpc("frais_enregistrer", { p_org: e.org, p_data: df });
    await base.rpc("frais_enregistrer", { p_org: e.org, p_data: df });
    expect((await base.rpc("frais_lister", { p_org: e.org, p_filtres: { vehicule_id: idV } })).length).toBe(1);

    const idC = randomUUID();
    await base.rpc("client_enregistrer", { p_org: e.org, p_data: { id: idC, nom: "Kadiatou Konaté" } });
    await base.rpc("client_enregistrer", { p_org: e.org, p_data: { id: idC, nom: "Kadiatou Konaté" } });
    const idE = randomUUID();
    const e1 = await base.rpc("expedition_enregistrer", { p_org: e.org, p_data: { id: idE, navire: "MSC Aurora" } });
    const e2 = await base.rpc("expedition_enregistrer", { p_org: e.org, p_data: { id: idE, navire: "MSC Aurora" } });
    expect(e2.reference).toBe(e1.reference);
    const idD = randomUUID();
    await base.rpc("demande_enregistrer", { p_org: e.org, p_data: { id: idD, client_id: idC, marque: "Kia" } });
    await base.rpc("demande_enregistrer", { p_org: e.org, p_data: { id: idD, client_id: idC, marque: "Kia" } });
    const client = await base.rpc("client_obtenir", { p_org: e.org, p_id: idC });
    expect(client.demandes.length).toBe(1);
    expect((await base.rpc("clients_lister", { p_org: e.org })).length).toBe(2);
    expect((await base.rpc("expeditions_lister", { p_org: e.org })).length).toBe(1);

    const idP = randomUUID();
    const p1 = await base.rpc("proforma_creer", { p_org: e.org, p_data: { id: idP, vehicule_id: idV, client_id: idC, prix_xof: 11000000 } });
    const p2 = await base.rpc("proforma_creer", { p_org: e.org, p_data: { id: idP, vehicule_id: idV, client_id: idC, prix_xof: 11000000 } });
    expect(p2.numero).toBe(p1.numero);
    expect((await base.rpc("proformas_lister", { p_org: e.org })).length).toBe(1);

    const vente = await base.rpc("vente_creer", { p_org: e.org, p_data: { vehicule_id: e.vehicules[0], client_id: e.client, prix_xof: 9000000 } });
    const idPa = randomUUID();
    const pa1 = await base.rpc("paiement_ajouter", { p_org: e.org, p_data: { id: idPa, vente_id: vente.id, montant_xof: 500000 } });
    const pa2 = await base.rpc("paiement_ajouter", { p_org: e.org, p_data: { id: idPa, vente_id: vente.id, montant_xof: 500000 } });
    expect(pa2.paiement.numero_recu).toBe(pa1.paiement.numero_recu);
    expect(pa2.vente.encaisse_xof).toBe(500000);
  });
});

describe("messages d'erreur", () => {
  it("les erreurs de saisie sont en français et nomment le champ", async () => {
    const e = await entrepriseAvecEquipe(base, "Erreurs");
    await echoue(base.rpc("vehicule_enregistrer", { p_org: e.org, p_data: { marque: "Toyota", modele: "RAV4", annee: "deux mille" } }), "Champ « annee » : nombre entier attendu");
    await echoue(base.rpc("vehicule_enregistrer", { p_org: e.org, p_data: { marque: "Toyota", modele: "RAV4", vin: "123" } }), "17 caractères");
    await echoue(base.rpc("vehicule_enregistrer", { p_org: e.org, p_data: { marque: "Toyota", modele: "RAV4", etape: "lune" } }), "Champ « etape » : valeur « lune » invalide");
    await echoue(base.rpc("vehicule_enregistrer", { p_org: e.org, p_data: { modele: "RAV4" } }), "La marque est obligatoire");
    await echoue(base.rpc("frais_enregistrer", { p_org: e.org, p_data: { categorie: "loyer", montant: "abc" } }), "Champ « montant » : nombre attendu");
    const v = await base.rpc("vehicule_enregistrer", { p_org: e.org, p_data: { marque: "Toyota", modele: "RAV4", vin: "2t3rfrev5jw 781254" } });
    expect(v.vin).toBe("2T3RFREV5JW781254");
    expect(v.vin_cle_valide).toBe(true);
    await echoue(base.rpc("vehicule_enregistrer", { p_org: e.org, p_data: { marque: "Toyota", modele: "RAV4", vin: "2T3RFREV5JW781254" } }), "déjà enregistré pour le véhicule V-0001");
  });
});
