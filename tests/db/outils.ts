/**
 * Outils de test de la base : PGlite (Postgres WASM) en Node.
 *
 * nouvelleBase() crée une base vide, applique le bouchon Supabase puis les
 * migrations 0001 à 0004 (et la démo si demandé). Pour gagner du temps, l'état
 * obtenu est mis en cache sur disque (clé = empreinte du SQL) : les fichiers de
 * test suivants rechargent ce répertoire de données au lieu de tout rejouer.
 * `{ cache: false }` force une application complète sur une base neuve.
 */
import { PGlite } from "@electric-sql/pglite";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const RACINE = path.resolve(__dirname, "..", "..");

export interface SqlProjet {
  bouchon: string;
  migrations: { nom: string; sql: string }[];
  demo: string;
}

export function lireSql(): SqlProjet {
  const dossierMigrations = path.join(RACINE, "supabase", "migrations");
  const migrations = readdirSync(dossierMigrations)
    .filter((f) => /^\d{4}_.+\.sql$/.test(f))
    .sort()
    .map((nom) => ({ nom, sql: readFileSync(path.join(dossierMigrations, nom), "utf8") }));
  return {
    bouchon: readFileSync(path.join(RACINE, "supabase", "tests", "bouchon_supabase.sql"), "utf8"),
    migrations,
    demo: readFileSync(path.join(RACINE, "supabase", "demo", "0100_demo.sql"), "utf8"),
  };
}

export type Params = Record<string, unknown>;

export interface Base {
  db: PGlite;
  /** Agit comme l'utilisateur `uid` (rôle authenticated, claims JWT). */
  commeUtilisateur(uid: string): Promise<void>;
  /** Agit comme un visiteur non connecté (rôle anon, aucun claim). */
  commeAnonyme(): Promise<void>;
  /** Revient au super-utilisateur (préparation, vérifications directes). */
  commeAdmin(): Promise<void>;
  /** Appelle public.<nom>(p_x => ...) avec les paramètres nommés et renvoie le jsonb. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- résultats jsonb : forme libre selon la fonction
  rpc<T = any>(nom: string, params?: Params): Promise<T>;
  /** Requête SQL brute sous le rôle courant. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lignes SQL : forme libre selon la requête
  sql<T = any>(requete: string, params?: unknown[]): Promise<T[]>;
  /** Crée un utilisateur dans auth.users (en admin) et renvoie son id. */
  creerUtilisateur(email?: string): Promise<string>;
  fermer(): Promise<void>;
}

const VERSION_PGLITE = (() => {
  try {
    return JSON.parse(
      readFileSync(path.join(RACINE, "node_modules", "@electric-sql", "pglite", "package.json"), "utf8"),
    ).version as string;
  } catch {
    return "inconnue";
  }
})();

async function appliquer(db: PGlite, sqlProjet: SqlProjet, demo: boolean) {
  await db.exec(sqlProjet.bouchon);
  for (const m of sqlProjet.migrations) {
    try {
      await db.exec(m.sql);
    } catch (e) {
      throw new Error(`Échec de la migration ${m.nom} : ${(e as Error).message}`);
    }
  }
  if (demo) await db.exec(sqlProjet.demo);
}

function dossierCache() {
  const d = path.join(os.tmpdir(), "parc-auto-pglite-cache");
  mkdirSync(d, { recursive: true });
  return d;
}

export async function nouvelleBase(options: { demo?: boolean; cache?: boolean } = {}): Promise<Base> {
  const demo = options.demo ?? false;
  const cache = options.cache ?? true;
  const sqlProjet = lireSql();
  let db: PGlite;

  if (!cache) {
    db = await PGlite.create();
    await appliquer(db, sqlProjet, demo);
  } else {
    const cle = createHash("sha256")
      .update(VERSION_PGLITE)
      .update(sqlProjet.bouchon)
      .update(sqlProjet.migrations.map((m) => m.nom + "\n" + m.sql).join("\n"))
      .update(demo ? sqlProjet.demo : "")
      .digest("hex")
      .slice(0, 24);
    const fichier = path.join(dossierCache(), `${cle}${demo ? "-demo" : ""}.tar`);
    if (existsSync(fichier)) {
      const donnees = readFileSync(fichier);
      db = await PGlite.create({ loadDataDir: new Blob([donnees]) });
    } else {
      db = await PGlite.create();
      await appliquer(db, sqlProjet, demo);
      const archive = await db.dumpDataDir("none");
      const tmp = `${fichier}.${process.pid}.${randomUUID()}.tmp`;
      writeFileSync(tmp, Buffer.from(await archive.arrayBuffer()));
      try {
        renameSync(tmp, fichier);
      } catch {
        rmSync(tmp, { force: true });
      }
    }
  }

  const signatures = new Map<string, { noms: string[]; types: string[] }>();

  async function signature(nom: string) {
    let s = signatures.get(nom);
    if (!s) {
      const r = await db.query<{ noms: string[] | null; types: string[] }>(
        `select coalesce(p.proargnames, '{}') as noms,
                array(select format_type(t, null) from unnest(p.proargtypes::oid[]) with ordinality u(t, i) order by i) as types
           from pg_catalog.pg_proc p
           join pg_catalog.pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = $1`,
        [nom],
      );
      const ligne = r.rows[0];
      if (r.rows.length !== 1 || !ligne) throw new Error(`Fonction public.${nom} introuvable ou surchargée`);
      s = { noms: ligne.noms ?? [], types: ligne.types };
      signatures.set(nom, s);
    }
    return s;
  }

  function enTexte(valeur: unknown, type: string): string | null {
    if (valeur === null || valeur === undefined) return null;
    if (type.endsWith("[]")) {
      if (!Array.isArray(valeur)) throw new Error(`Tableau attendu pour ${type}`);
      return "{" + valeur.map((v) => (v === null ? "NULL" : `"${String(v).replace(/(["\\])/g, "\\$1")}"`)).join(",") + "}";
    }
    if (type === "jsonb" || type === "json") return JSON.stringify(valeur);
    if (valeur instanceof Date) return valeur.toISOString();
    return String(valeur);
  }

  const base: Base = {
    db,
    async commeUtilisateur(uid: string) {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub', '', false)");
      await db.query("select set_config('request.jwt.claims', $1, false)", [
        JSON.stringify({ sub: uid, role: "authenticated" }),
      ]);
      await db.exec("set role authenticated");
    },
    async commeAnonyme() {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub', '', false)");
      await db.query("select set_config('request.jwt.claims', '', false)");
      await db.exec("set role anon");
    },
    async commeAdmin() {
      await db.exec("reset role");
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async rpc<T = any>(nom: string, params: Params = {}): Promise<T> {
      const s = await signature(nom);
      const cles = Object.keys(params);
      const args: string[] = [];
      const valeurs: (string | null)[] = [];
      for (const cle of cles) {
        const i = s.noms.indexOf(cle);
        if (i < 0) throw new Error(`Paramètre inconnu ${cle} pour public.${nom}`);
        const type = s.types[i] ?? "text";
        valeurs.push(enTexte(params[cle], type));
        args.push(`${cle} => $${valeurs.length}::text::${type}`);
      }
      const r = await db.query<{ r: T }>(`select public.${nom}(${args.join(", ")}) as r`, valeurs);
      return r.rows[0]?.r as T;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async sql<T = any>(requete: string, params: unknown[] = []): Promise<T[]> {
      const r = await db.query<T>(requete, params);
      return r.rows;
    },
    async creerUtilisateur(email?: string) {
      const id = randomUUID();
      const role = (await db.query<{ r: string }>("select current_user as r")).rows[0]?.r;
      await db.exec("reset role");
      await db.query("insert into auth.users (id, email) values ($1, $2)", [id, email ?? `${id.slice(0, 8)}@exemple.ml`]);
      if (role && role !== "postgres") await db.exec(`set role ${role}`);
      return id;
    },
    async fermer() {
      await db.close();
    },
  };
  return base;
}

/** Attend une erreur dont le message contient `fragment`. Renvoie le message. */
export async function echoue(promesse: Promise<unknown>, fragment?: string | RegExp): Promise<string> {
  try {
    await promesse;
  } catch (e) {
    const message = (e as Error).message;
    if (fragment !== undefined) {
      const ok = typeof fragment === "string" ? message.includes(fragment) : fragment.test(message);
      if (!ok) throw new Error(`Message inattendu : « ${message} » (attendu : ${String(fragment)})`);
    }
    return message;
  }
  throw new Error(`Une erreur était attendue${fragment ? ` (${String(fragment)})` : ""}, l'appel a réussi.`);
}

/**
 * Prépare une entreprise avec un propriétaire et, si demandé, des membres
 * de chaque rôle (invités puis acceptés via l'API).
 */
export async function entrepriseAvecEquipe(
  base: Base,
  nom = "Entreprise test",
  roles: ("gerant" | "vendeur" | "comptable" | "lecture")[] = [],
) {
  const proprietaire = await base.creerUtilisateur();
  await base.commeUtilisateur(proprietaire);
  const org = await base.rpc("organisation_creer", { p_nom: nom, p_ville: "Bamako", p_taux_usd: 570 });
  const membres: Record<string, string> = { proprietaire };
  for (const role of roles) {
    await base.commeUtilisateur(proprietaire);
    const inv = await base.rpc("invitation_creer", { p_org: org.id, p_role: role });
    const uid = await base.creerUtilisateur();
    await base.commeUtilisateur(uid);
    await base.rpc("invitation_accepter", { p_code: inv.code });
    membres[role] = uid;
  }
  await base.commeUtilisateur(proprietaire);
  return { org: org.id as string, membres };
}
