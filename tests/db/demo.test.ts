/**
 * Données de démonstration : contenu réaliste et cohérent, tableau de bord
 * lisible (actions regroupées), aucun coût pour le vendeur, et recalage des
 * dates (demo_decaler_dates / demo_actualiser) sans rien casser.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { nouvelleBase, type Base } from "./outils";

const UTILISATEUR = "00000000-0000-4000-8000-00000000d3e0";
const TYPES_ACTIONS = [
  "echeance_retard", "magasinage_port", "stock_dormant", "arrivee_proche",
  "frais_a_payer", "reservation_echue", "livraison_en_attente", "demande_correspondante",
];

let base: Base;
let org: string;
let vendeur: string;
let aujourdhui: string;

/** Clé de contrôle d'un VIN nord-américain, calculée indépendamment du SQL. */
function cleVin(vin: string): string {
  const poids = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  const valeur = (c: string) => {
    if (/\d/.test(c)) return Number(c);
    const translit: Record<string, number> = {
      A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
      S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
    };
    return translit[c] ?? NaN;
  };
  const somme = [...vin].reduce((s, c, i) => s + valeur(c) * poids[i]!, 0);
  const reste = somme % 11;
  return reste === 10 ? "X" : String(reste);
}

beforeAll(async () => {
  base = await nouvelleBase({ demo: true });
  const [r] = await base.sql<{ id: string; d: string }>(
    "select public.demo_initialiser($1, 'demo@parc-auto.app') as id, current_date::text as d", [UTILISATEUR],
  );
  org = r!.id;
  aujourdhui = r!.d;
  const [v] = await base.sql<{ u: string }>("select user_id as u from public.membres where org_id = $1 and role = 'vendeur'", [org]);
  vendeur = v!.u;
  await base.commeUtilisateur(UTILISATEUR);
}, 180_000);

afterAll(async () => base?.fermer());

describe("contenu de la démonstration", () => {
  it("entreprise Sahel Auto Import à Bamako, taux USD 570, comptes Caisse / Orange Money / Banque", async () => {
    const p = await base.rpc("parametres_obtenir", { p_org: org });
    expect(p.organisation.nom).toBe("Sahel Auto Import");
    expect(p.parametres.ville).toBe("Bamako");
    expect(p.parametres.taux_usd).toBe(570);
    expect(p.mon_role).toBe("proprietaire");
    const comptes = await base.rpc("comptes_lister", { p_org: org });
    expect(comptes.map((c: { nom: string }) => c.nom)).toEqual(["Caisse", "Orange Money", "Banque BDM"]);
    for (const c of comptes) expect(c.solde_xof, c.nom).toBeGreaterThanOrEqual(0);
  });

  it("22 à 26 véhicules sur toutes les étapes, 2 vendus encore en mer, 1 réservé, VIN à clé valide", async () => {
    const vehicules = await base.rpc("vehicules_lister", { p_org: org, p_filtres: { inclure_archives: true } });
    expect(vehicules.length).toBeGreaterThanOrEqual(22);
    expect(vehicules.length).toBeLessThanOrEqual(26);
    const etapes = new Set(vehicules.map((v: { etape: string }) => v.etape));
    expect([...etapes].sort()).toEqual(["achete", "atelier", "au_port", "convoi", "douane", "en_mer", "parc", "transport_usa"]);
    expect(vehicules.filter((v: { etape: string; statut_commercial: string }) => v.etape === "en_mer" && v.statut_commercial === "vendu").length).toBe(2);
    expect(vehicules.filter((v: { statut_commercial: string }) => v.statut_commercial === "reserve").length).toBe(1);
    for (const v of vehicules) {
      expect(v.vin, v.reference).toMatch(/^[A-HJ-NPR-Z0-9]{17}$/);
      expect(v.vin[8], `${v.reference} ${v.vin}`).toBe(cleVin(v.vin));
    }
    await base.commeAdmin();
    const [sql] = await base.sql<{ n: number }>(
      "select count(*)::int as n from public.vehicules where org_id = $1 and not prive.vin_cle_valide(vin)", [org],
    );
    expect(sql!.n).toBe(0);
    await base.commeUtilisateur(UTILISATEUR);
  });

  it("3 expéditions : MSC en mer Houston → Cotonou (4 véhicules, frais communs en USD), RoRo Grimaldi arrivé à Dakar, une clôturée", async () => {
    const exps = await base.rpc("expeditions_lister", { p_org: org });
    expect(exps.length).toBe(3);
    const msc = exps.find((e: { compagnie: string }) => e.compagnie === "MSC");
    expect(msc).toMatchObject({ statut: "en_mer", mode: "conteneur", port_depart: "Houston", port_arrivee: "Cotonou", nb_vehicules: 4 });
    const detail = await base.rpc("expedition_obtenir", { p_org: org, p_id: msc.id });
    expect(detail.frais.some((f: { devise: string }) => f.devise === "USD")).toBe(true);
    // Le détail annonce le même nombre de véhicules que la liste (la fiche l'affiche en titre : « À bord · 4 »).
    expect(detail.nb_vehicules).toBe(4);
    expect(detail.vehicules).toHaveLength(detail.nb_vehicules);
    expect(exps.find((e: { compagnie: string }) => e.compagnie === "Grimaldi")).toMatchObject({ statut: "arrivee", mode: "roro", port_arrivee: "Dakar" });
    expect(exps.filter((e: { statut: string }) => e.statut === "cloturee").length).toBe(1);
  });

  it("frais en USD et en FCFA, dont des « à payer », et des dépenses générales (loyer, salaires)", async () => {
    const frais = await base.rpc("frais_lister", { p_org: org });
    expect(new Set(frais.map((f: { devise: string }) => f.devise))).toEqual(new Set(["USD", "XOF"]));
    expect(frais.some((f: { statut: string }) => f.statut === "a_payer")).toBe(true);
    const generaux = new Set(frais.filter((f: { portee: string }) => f.portee === "generale").map((f: { categorie: string }) => f.categorie));
    expect(generaux.has("loyer") && generaux.has("salaires")).toBe(true);
  });

  it("8 clients maliens (+223), 8 à 10 ventes sur 8 mois, marges de 10 à 25 %, prix de 6,5 à 22 M FCFA", async () => {
    const clients = await base.rpc("clients_lister", { p_org: org });
    expect(clients.length).toBe(8);
    for (const c of clients) expect(c.telephone, c.nom).toMatch(/^\+223 \d{2} \d{2} \d{2} \d{2}$/);
    expect(clients.filter((c: { type_piece: string }) => c.type_piece === "NINA").length).toBeGreaterThanOrEqual(5);
    const noms = clients.map((c: { nom: string }) => c.nom);
    for (const n of ["Moussa Traoré", "Aminata Diallo", "Oumar Coulibaly", "Fatoumata Keïta", "Ibrahim Sangaré", "Mariam Touré"]) {
      expect(noms).toContain(n);
    }

    const ventes = await base.rpc("ventes_lister", { p_org: org });
    expect(ventes.length).toBeGreaterThanOrEqual(8);
    expect(ventes.length).toBeLessThanOrEqual(10);
    const dates = ventes.map((v: { date_vente: string }) => v.date_vente).sort();
    const ecartJours = (Date.parse(dates.at(-1)) - Date.parse(dates[0])) / 86_400_000;
    expect(ecartJours).toBeGreaterThan(200);
    expect(ecartJours).toBeLessThanOrEqual(245);
    for (const v of ventes) {
      expect(v.montant_ttc, v.numero).toBeGreaterThanOrEqual(6_500_000);
      expect(v.montant_ttc, v.numero).toBeLessThanOrEqual(22_000_000);
      if (v.statut === "active") {
        const pct = (100 * v.marge_xof) / v.montant_ht;
        expect(pct, `${v.numero} marge ${pct.toFixed(1)} %`).toBeGreaterThanOrEqual(10);
        expect(pct, `${v.numero} marge ${pct.toFixed(1)} %`).toBeLessThanOrEqual(25);
      }
    }
    const annulees = ventes.filter((v: { statut: string }) => v.statut === "annulee");
    expect(annulees.length).toBe(1);
    expect(annulees[0].numero_avoir).toMatch(/^AV-\d{4}-0001$/);
    const echelonnees = ventes.filter((v: { mode: string }) => v.mode === "echelonne");
    expect(echelonnees.length).toBe(1);
    expect(echelonnees[0].retard_xof).toBeGreaterThan(0);
    // Numéros croissants avec la date.
    const parDate = [...ventes].sort((a, b) => a.date_vente.localeCompare(b.date_vente));
    const annee = aujourdhui.slice(0, 4);
    if (parDate.every((v) => v.date_vente.startsWith(annee))) {
      expect(parDate.map((v) => v.numero)).toEqual(parDate.map((_, i) => `FAC-${annee}-${String(i + 1).padStart(4, "0")}`));
    }
  });

  it("encaissements Orange Money, Moov Money, Wave et espèces avec références ; un remboursement", async () => {
    const paiements = await base.rpc("paiements_lister", { p_org: org });
    const modes = new Set(paiements.map((p: { mode: string }) => p.mode));
    for (const m of ["especes", "orange_money", "moov_money", "wave", "virement"]) expect(modes.has(m), m).toBe(true);
    for (const p of paiements.filter((x: { mode: string }) => ["orange_money", "moov_money", "wave"].includes(x.mode))) {
      expect(p.reference, p.numero_recu).toBeTruthy();
    }
    expect(paiements.filter((p: { type: string }) => p.type === "remboursement").length).toBe(1);
  });

  it("2 demandes clients, dont une correspond à un véhicule en mer ; 2 proformas (une échue)", async () => {
    const corr = await base.rpc("demandes_correspondances", { p_org: org });
    expect(corr.length).toBe(1);
    expect(corr[0].vehicule.etape).toBe("en_mer");
    expect(corr[0].demande.client_nom).toBe("Fatoumata Keïta");
    const proformas = await base.rpc("proformas_lister", { p_org: org });
    expect(proformas.map((p: { statut_effectif: string }) => p.statut_effectif).sort()).toEqual(["emise", "expiree"]);
  });
});

describe("tableau de bord de la démonstration", () => {
  it("actions des 8 types connus, frais à payer regroupés en une seule action, séries sur 12 mois", async () => {
    const tdb = await base.rpc("tableau_de_bord", { p_org: org });
    for (const a of tdb.actions) {
      expect(TYPES_ACTIONS).toContain(a.type);
      expect(["haute", "moyenne", "info"]).toContain(a.gravite);
      expect(Object.keys(a).sort()).toEqual(["date", "detail", "entite", "entite_id", "gravite", "titre", "type"]);
    }
    const types = tdb.actions.map((a: { type: string }) => a.type);
    for (const t of ["echeance_retard", "stock_dormant", "livraison_en_attente", "arrivee_proche", "frais_a_payer", "magasinage_port", "demande_correspondante"]) {
      expect(types, t).toContain(t);
    }
    const frais = tdb.actions.filter((a: { type: string }) => a.type === "frais_a_payer");
    expect(frais.length).toBe(1);
    expect(frais[0].titre).toMatch(/^\d+ frais à payer$/);
    expect(frais[0].entite).toBe("frais");
    expect(tdb.actions.length).toBeLessThanOrEqual(10);
    expect(tdb.series.length).toBe(12);
    expect(tdb.series.at(-1).mois).toBe(aujourdhui.slice(0, 7));
    expect(tdb.indicateurs.capital_par_etape.map((e: { etape: string }) => e.etape)).toEqual(
      ["achete", "transport_usa", "en_mer", "au_port", "convoi", "douane", "atelier", "parc"]);
    expect(tdb.indicateurs.valeur_stock_revient).toBeGreaterThan(0);
  });

  it("au-delà de 3 véhicules en magasinage, une seule action les regroupe", async () => {
    await base.commeAdmin();
    await base.sql("begin");
    try {
      await base.sql(
        "update public.vehicules set etape = 'au_port', etape_depuis = current_date - 25 where org_id = $1 and etape in ('parc', 'atelier') and statut_commercial = 'disponible'",
        [org],
      );
      await base.commeUtilisateur(UTILISATEUR);
      const tdb = await base.rpc("tableau_de_bord", { p_org: org });
      const mag = tdb.actions.filter((a: { type: string }) => a.type === "magasinage_port");
      expect(mag.length).toBe(1);
      expect(mag[0].titre).toMatch(/^\d+ véhicules en magasinage au port$/);
      expect(mag[0].gravite).toBe("haute");
    } finally {
      await base.commeAdmin();
      await base.sql("rollback");
      await base.commeUtilisateur(UTILISATEUR);
    }
  });

  it("le vendeur ne reçoit ni action « frais à payer » ni montant de coût", async () => {
    await base.commeUtilisateur(vendeur);
    const tdb = await base.rpc("tableau_de_bord", { p_org: org });
    expect(tdb.actions.some((a: { type: string }) => a.type === "frais_a_payer")).toBe(false);
    expect(tdb.indicateurs.valeur_stock_revient).toBeNull();
    expect(tdb.indicateurs.a_payer_fournisseurs).toBeNull();
    expect(tdb.indicateurs.ventes_mois.marge).toBeNull();
    expect(tdb.series.every((s: { marge: unknown }) => s.marge === null)).toBe(true);
    expect(tdb.indicateurs.capital_par_etape.every((e: { montant: unknown }) => e.montant === null)).toBe(true);
    const texte = tdb.actions.map((a: { detail: string }) => a.detail).join(" ");
    expect(texte).not.toMatch(/revient|marge|frais/i);
    await base.commeUtilisateur(UTILISATEUR);
  });
});

describe("recalage des dates de la démonstration", () => {
  /** Toutes les dates et horodatages de l'organisation, en jours (nombres). */
  async function signature(): Promise<Record<string, number[][]>> {
    await base.commeAdmin();
    const colonnes = await base.sql<{ t: string; c: string; ty: string }>(
      `select c.table_name as t, c.column_name as c, c.data_type as ty
         from information_schema.columns c
        where c.table_schema = 'public' and c.data_type in ('date', 'timestamp with time zone')
          and (c.table_name = 'organisations' or exists (
                select 1 from information_schema.columns o
                 where o.table_schema = 'public' and o.table_name = c.table_name and o.column_name = 'org_id'))
        order by 1, 2`,
    );
    const parTable = new Map<string, { c: string; ty: string }[]>();
    for (const col of colonnes) parTable.set(col.t, [...(parTable.get(col.t) ?? []), col]);
    const sig: Record<string, number[][]> = {};
    for (const [t, cols] of parTable) {
      const cle = t === "membres" ? "user_id" : t === "parametres" ? "org_id" : t === "frais_parts_figees" ? "frais_id, vehicule_id" : "id";
      const filtre = t === "organisations" ? "id" : "org_id";
      const exprs = cols.map((c) => c.ty === "date"
        ? `(${c.c} - date '2000-01-01')::float8`
        : `extract(epoch from ${c.c})::float8 / 86400`);
      const rows = await base.sql<{ v: number[] }>(
        `select array[${exprs.join(", ")}] as v from public.${t} where ${filtre} = $1 order by ${cle}`, [org]);
      sig[t] = rows.map((r) => r.v);
    }
    await base.commeUtilisateur(UTILISATEUR);
    return sig;
  }

  function decalee(sig: Record<string, number[][]>, jours: number) {
    return Object.fromEntries(Object.entries(sig).map(([t, rows]) =>
      [t, rows.map((r) => r.map((x) => (x === null ? null : x + jours)))]));
  }

  function arrondie(sig: Record<string, (number | null)[][]>) {
    return JSON.stringify(sig, (_k, v) => (typeof v === "number" ? Math.round(v * 1e6) / 1e6 : v));
  }

  it("décaler de -30 jours déplace TOUTES les dates ; demo_actualiser les recale à l'identique", async () => {
    const avant = await signature();
    expect(Object.keys(avant).length).toBeGreaterThanOrEqual(18);
    const tdbAvant = await base.rpc("tableau_de_bord", { p_org: org });
    const numerosAvant = (await base.rpc("ventes_lister", { p_org: org })).map((v: { numero: string }) => v.numero);

    await base.commeAdmin();
    const [d] = await base.sql<{ r: string }>("select public.demo_decaler_dates($1, -30)::text as r", [org]);
    const attendu = new Date(`${aujourdhui}T00:00:00Z`);
    attendu.setUTCDate(attendu.getUTCDate() - 30);
    expect(d!.r).toBe(attendu.toISOString().slice(0, 10));

    const apres = await signature();
    expect(arrondie(apres)).toBe(arrondie(decalee(avant, -30)));

    // Données « vieillies » de 30 jours : l'échéance à venir est désormais passée, etc.
    const tdbVieux = await base.rpc("tableau_de_bord", { p_org: org });
    expect(JSON.stringify(tdbVieux)).not.toBe(JSON.stringify(tdbAvant));

    await base.commeAdmin();
    const [n] = await base.sql<{ r: number }>("select public.demo_actualiser($1) as r", [org]);
    expect(n!.r).toBe(30);
    const [zero] = await base.sql<{ r: number }>("select public.demo_actualiser($1) as r", [org]);
    expect(zero!.r).toBe(0);

    expect(arrondie(await signature())).toBe(arrondie(avant));
    const tdbApres = await base.rpc("tableau_de_bord", { p_org: org });
    expect(tdbApres).toEqual(tdbAvant);
    const compte = (t: { actions: { type: string }[] }) =>
      t.actions.reduce<Record<string, number>>((acc, a) => ({ ...acc, [a.type]: (acc[a.type] ?? 0) + 1 }), {});
    expect(compte(tdbApres)).toEqual(compte(tdbAvant));
    expect((await base.rpc("ventes_lister", { p_org: org })).map((v: { numero: string }) => v.numero)).toEqual(numerosAvant);
  });

  it("un décalage qui traverse une fin d'année renumérote les documents dans la bonne année", async () => {
    await base.commeAdmin();
    await base.sql("begin");
    try {
      // Décalage jusqu'au 10 janvier de l'année suivante pour la vente la plus récente.
      const [r] = await base.sql<{ j: number }>(
        `select (make_date(extract(year from current_date)::int + 1, 1, 10) - max(date_vente))::int as j
           from public.ventes where org_id = $1`, [org]);
      await base.sql("select public.demo_decaler_dates($1, $2)", [org, r!.j]);
      const lignes = await base.sql<{ numero: string; annee: string }>(
        "select numero, extract(year from date_vente)::text as annee from public.ventes where org_id = $1 order by date_vente, created_at", [org]);
      for (const l of lignes) expect(l.numero, l.numero).toContain(`-${l.annee}-`);
      const nouvelle = lignes.filter((l) => l.annee === String(Number(aujourdhui.slice(0, 4)) + 1));
      expect(nouvelle.length).toBeGreaterThan(0);
      expect(nouvelle[0]!.numero).toMatch(/-0001$/);
    } finally {
      await base.sql("rollback");
      await base.commeUtilisateur(UTILISATEUR);
    }
  });
});
