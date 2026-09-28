/**
 * Fondations : les migrations et la démo s'appliquent sur une base vide, aucune
 * table n'est accessible directement, anon n'exécute que verifier_document,
 * le schéma prive est fermé, les politiques de stockage cloisonnent les
 * entreprises, et le fichier généré pour la démo est à jour.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { echoue, entrepriseAvecEquipe, nouvelleBase, RACINE, type Base } from "./outils";

describe("migrations et démonstration sur une base vide", () => {
  it("le bouchon, 0001 à 0004 et la démo s'appliquent, demo_initialiser crée une entreprise complète", async () => {
    const base = await nouvelleBase({ demo: true, cache: false });
    try {
      const migrations = await base.sql<{ n: number }>(
        "select count(*)::int as n from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'",
      );
      expect(migrations[0]!.n).toBeGreaterThan(55);
      const uid = "00000000-0000-4000-8000-00000000d3e0";
      const [ligne] = await base.sql<{ id: string }>("select public.demo_initialiser($1, $2) as id", [uid, "demo@parc-auto.app"]);
      const org = ligne!.id;
      const [compte] = await base.sql<{ vehicules: number; ventes: number; clients: number; expeditions: number }>(
        `select (select count(*)::int from public.vehicules where org_id = $1) as vehicules,
                (select count(*)::int from public.ventes where org_id = $1) as ventes,
                (select count(*)::int from public.clients where org_id = $1) as clients,
                (select count(*)::int from public.expeditions where org_id = $1) as expeditions`,
        [org],
      );
      expect(compte).toEqual({ vehicules: 24, ventes: 10, clients: 8, expeditions: 3 });
    } finally {
      await base.fermer();
    }
  }, 180_000);
});

describe("verrouillage des accès", () => {
  let base: Base;
  let org: string;
  let proprietaire: string;
  let lecteur: string;
  let tables: string[];
  let fonctions: { nom: string; args: string[] }[];

  beforeAll(async () => {
    base = await nouvelleBase();
    const e = await entrepriseAvecEquipe(base, "Accès", ["lecture"]);
    org = e.org;
    proprietaire = e.membres.proprietaire!;
    lecteur = e.membres.lecture!;
    await base.commeAdmin();
    tables = (await base.sql<{ t: string }>(
      "select tablename as t from pg_catalog.pg_tables where schemaname = 'public' order by 1",
    )).map((r) => r.t);
    fonctions = (await base.sql<{ nom: string; args: string[] | null }>(
      `select p.proname as nom, p.proargnames as args
         from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' order by 1`,
    )).map((r) => ({ nom: r.nom, args: r.args ?? [] }));
  }, 120_000);

  afterAll(async () => base?.fermer());

  it("chaque fonction de l'API est security definer, search_path vide, renvoie du jsonb", async () => {
    await base.commeAdmin();
    const defauts = await base.sql<{ nom: string; definer: boolean; config: string[] | null; retour: string }>(
      `select p.proname as nom, p.prosecdef as definer, p.proconfig as config, format_type(p.prorettype, null) as retour
         from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' order by 1`,
    );
    expect(defauts.length).toBe(fonctions.length);
    for (const f of defauts) {
      expect(f.definer, f.nom).toBe(true);
      expect(f.config, f.nom).toEqual(['search_path=""']);
      expect(f.retour, f.nom).toBe("jsonb");
    }
    const autorisees = await base.sql<{ nom: string }>(
      `select p.proname as nom from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute') order by 1`,
    );
    expect(autorisees.map((f) => f.nom)).toEqual(["verifier_document"]);
  });

  it("toutes les tables ont la RLS activée", async () => {
    await base.commeAdmin();
    const sansRls = await base.sql<{ t: string }>(
      `select c.relname as t from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
    );
    expect(sansRls).toEqual([]);
    expect(tables.length).toBe(22);
  });

  it("en authenticated, tout select ou insert direct sur chaque table échoue", async () => {
    await base.commeUtilisateur(proprietaire);
    for (const t of tables) {
      await echoue(base.sql(`select * from public.${t} limit 1`), "permission denied");
      await echoue(base.sql(`insert into public.${t} default values`), "permission denied");
      await echoue(base.sql(`delete from public.${t}`), "permission denied");
    }
  });

  it("en anon, tout accès direct aux tables échoue", async () => {
    await base.commeAnonyme();
    for (const t of tables) {
      await echoue(base.sql(`select * from public.${t} limit 1`), "permission denied");
      await echoue(base.sql(`insert into public.${t} default values`), "permission denied");
    }
  });

  it("en anon, seule verifier_document s'exécute", async () => {
    await base.commeAnonyme();
    let refusees = 0;
    for (const f of fonctions) {
      const params = Object.fromEntries(f.args.map((a) => [a, null]));
      if (f.nom === "verifier_document") {
        expect(await base.rpc(f.nom, { p_token: "0".repeat(64) })).toEqual({ valide: false });
        continue;
      }
      await echoue(base.rpc(f.nom, params), /permission denied for function/);
      refusees++;
    }
    expect(refusees).toBe(fonctions.length - 1);
  });

  it("en authenticated, le schéma prive est fermé (sauf les deux contrôles de stockage)", async () => {
    await base.commeUtilisateur(proprietaire);
    await echoue(base.sql("select prive.prochain_numero($1, 'facture', current_date)", [org]), "permission denied");
    await echoue(base.sql("select prive.role_dans($1)", [org]), "permission denied");
    await echoue(base.sql("select * from prive.couts_vehicules($1)", [org]), "permission denied");
    const [r] = await base.sql<{ ok: boolean }>("select prive.stockage_peut_lire($1) as ok", [org]);
    expect(r!.ok).toBe(true);
  });

  it("stockage : un membre lit et écrit sous le dossier de son entreprise, jamais ailleurs", async () => {
    const autre = await entrepriseAvecEquipe(base, "Autre stockage");
    await base.commeUtilisateur(proprietaire);
    await base.sql("insert into storage.objects (bucket_id, name) values ('parc-auto', $1)", [`${org}/vehicules/a.jpg`]);
    await echoue(
      base.sql("insert into storage.objects (bucket_id, name) values ('parc-auto', $1)", [`${autre.org}/vehicules/b.jpg`]),
      "row-level security",
    );
    await echoue(
      base.sql("insert into storage.objects (bucket_id, name) values ('parc-auto', 'sans-dossier.jpg')"),
      "row-level security",
    );
    const vus = await base.sql<{ name: string }>("select name from storage.objects");
    expect(vus.map((o) => o.name)).toEqual([`${org}/vehicules/a.jpg`]);

    await base.commeUtilisateur(autre.membres.proprietaire!);
    expect(await base.sql("select name from storage.objects")).toEqual([]);

    await base.commeUtilisateur(lecteur);
    expect((await base.sql("select name from storage.objects")).length).toBe(1);
    await echoue(
      base.sql("insert into storage.objects (bucket_id, name) values ('parc-auto', $1)", [`${org}/vehicules/c.jpg`]),
      "row-level security",
    );
    const suppr = await base.sql("delete from storage.objects returning name");
    expect(suppr).toEqual([]);
  });
});

describe("fichier généré pour la démo", () => {
  it("lib/demo/sql.generated.ts correspond au SQL de supabase/", async () => {
    const script = pathToFileURL(path.join(RACINE, "scripts", "assembler-sql.mjs")).href;
    const mod = (await import(script)) as { assembler: () => string };
    const attendu = mod.assembler();
    const actuel = readFileSync(path.join(RACINE, "lib", "demo", "sql.generated.ts"), "utf8");
    expect(actuel.startsWith("// Fichier généré par scripts/assembler-sql.mjs — ne pas modifier.")).toBe(true);
    expect(actuel === attendu, "lancez « npm run sql:bundle »").toBe(true);
  });
});
