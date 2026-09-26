// Démonstration hors compte : le vrai schéma Postgres et les vraies fonctions de l'API
// tournent dans le navigateur (PGlite, Postgres compilé en WebAssembly), avec des données
// réalistes. Ce qu'un prospect essaie ici est exactement ce qui tourne en production.
//
// Le moteur (JavaScript et WebAssembly) est servi tel que publié depuis /pglite/ (copié au build par
// scripts/copier-ressources.mjs) et chargé à la demande : un utilisateur connecté à Supabase ne le télécharge jamais.
// Il n'est volontairement pas passé par le bundler : regroupé par Turbopack, son démarrage restait bloqué en production.

import type { PGlite } from "@electric-sql/pglite";

type ModulePGlite = typeof import("@electric-sql/pglite");
const URL_MOTEUR = "/pglite/index.js";

/** Charge le moteur depuis les fichiers statiques, hors bundle. */
async function chargerMoteur(): Promise<ModulePGlite> {
  return (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ URL_MOTEUR)) as ModulePGlite;
}

export const UTILISATEUR_DEMO = "00000000-0000-4000-8000-00000000d3e0";
export const EMAIL_DEMO = "demo@parc-auto.app";
const CLE_ORG = "parc-auto:demo:org";
const PREFIXE_BASE = "parc-auto-demo-";

let instance: Promise<PGlite> | null = null;

/**
 * Cette base tourne dans le navigateur : PGlite la range dans IndexedDB en différé (mode « relaxé », bien plus rapide).
 * Mesuré : une page rechargée dans les secondes qui suivent une saisie retrouve la base d'avant. Forcer
 * l'enregistrement à chaque écriture coûte ~3 s par opération, ce qui est pire. On protège donc la fenêtre de risque :
 * pendant DELAI_ENREGISTREMENT_MS après une écriture, fermer ou recharger l'onglet demande confirmation.
 * (Chez le client, avec Supabase, cette question ne se pose pas : les écritures partent sur le serveur.)
 */
const DELAI_ENREGISTREMENT_MS = 4_000;
let derniereEcriture = 0;
let gardeInstallee = false;
let reprises = 0;

function installerGarde() {
  if (gardeInstallee || typeof window === "undefined") return;
  gardeInstallee = true;
  window.addEventListener("beforeunload", (e) => {
    if (Date.now() - derniereEcriture < DELAI_ENREGISTREMENT_MS) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  // En mode relaxé, PGlite lance l'enregistrement sans en attendre le résultat. Quand un fichier temporaire de Postgres
  // disparaît pendant l'opération (ENOENT, errno 44 : fréquent pendant la création de la base), l'échec ressort en
  // « promesse rejetée non gérée » dans la console. Rien n'est perdu, l'enregistrement suivant recopie tout ce qui diffère :
  // on écarte l'alerte et on relance l'enregistrement, quelques fois au plus.
  window.addEventListener("unhandledrejection", (e) => {
    const raison = e.reason as { name?: string; errno?: number } | null;
    if (raison?.name !== "ErrnoError" || raison.errno !== 44) return;
    e.preventDefault();
    if (reprises++ < 3) setTimeout(() => void instance?.then((db) => db.syncToFs()).catch(() => {}), 800);
  });
}

/** Noms des fonctions de l'API qui écrivent (volatiles). */
let fonctionsEcriture: Promise<Set<string>> | null = null;
function listerEcritures(db: PGlite): Promise<Set<string>> {
  fonctionsEcriture ??= db
    .query<{ nom: string }>(`select p.proname as nom from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                              where n.nspname = 'public' and p.provolatile = 'v'`)
    .then((r) => new Set(r.rows.map((x) => x.nom)));
  return fonctionsEcriture;
}

async function compiler(url: string): Promise<WebAssembly.Module> {
  const reponse = await fetch(url);
  if (!reponse.ok) throw new Error(`Chargement impossible : ${url}`);
  try {
    return await WebAssembly.compileStreaming(reponse.clone());
  } catch {
    // Hébergement qui ne sert pas les .wasm en application/wasm
    return WebAssembly.compile(await reponse.arrayBuffer());
  }
}

/** Empreinte du SQL embarqué : une nouvelle version de l'app recrée une base de démo neuve. */
function empreinte(texte: string): string {
  let h = 5381;
  for (let i = 0; i < texte.length; i++) h = ((h << 5) + h + texte.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

async function supprimerAnciennesBases(actuelle: string) {
  if (typeof indexedDB === "undefined" || !indexedDB.databases) return;
  const bases = await indexedDB.databases();
  await Promise.all(
    bases
      .filter((b) => b.name && b.name.includes(PREFIXE_BASE) && !b.name.includes(actuelle))
      .map((b) => new Promise<void>((ok) => {
        const r = indexedDB.deleteDatabase(b.name!);
        r.onsuccess = r.onerror = r.onblocked = () => ok();
      })),
  );
}

async function ouvrir(): Promise<PGlite> {
  installerGarde(); // avant la création de la base : c'est là que l'enregistrement en différé peut échouer
  const [{ PGlite }, sql] = await Promise.all([
    chargerMoteur(),
    import("./sql.generated"),
  ]);
  const version = empreinte(sql.BOUCHON + sql.MIGRATIONS.join("") + sql.DEMO);
  const [pgliteWasmModule, initdbWasmModule, fsBundle] = await Promise.all([
    compiler("/pglite/pglite.wasm"),
    compiler("/pglite/initdb.wasm"),
    fetch("/pglite/pglite.data").then((r) => {
      if (!r.ok) throw new Error("Chargement impossible : /pglite/pglite.data");
      return r.blob();
    }),
  ]);

  const db = await PGlite.create({
    dataDir: `idb://${PREFIXE_BASE}${version}`,
    pgliteWasmModule,
    initdbWasmModule,
    fsBundle,
    relaxedDurability: true,
  });

  const deja = await db.query<{ ok: boolean }>("select to_regprocedure('public.demo_initialiser(uuid,text)') is not null as ok");
  if (!deja.rows[0]?.ok) {
    await db.exec(sql.BOUCHON);
    for (const migration of sql.MIGRATIONS) await db.exec(migration);
    await db.exec(sql.DEMO);
  }

  await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: UTILISATEUR_DEMO, role: "authenticated" })]);

  const org = await db.query<{ id: string }>(
    "select m.org_id as id from public.membres m where m.user_id = $1 limit 1",
    [UTILISATEUR_DEMO],
  );
  let orgId = org.rows[0]?.id;
  if (!orgId) {
    const r = await db.query<{ id: string }>("select public.demo_initialiser($1, $2) as id", [UTILISATEUR_DEMO, EMAIL_DEMO]);
    orgId = r.rows[0]!.id;
  }
  localStorage.setItem(CLE_ORG, orgId);
  void supprimerAnciennesBases(version);
  return db;
}

export function baseDemo(): Promise<PGlite> {
  if (!instance) {
    instance = ouvrir().catch((e) => {
      instance = null;
      throw e;
    });
  }
  return instance;
}

const IDENTIFIANT = /^[a-z_][a-z0-9_]*$/;

/** Appelle une fonction de l'API avec la notation nommée de Postgres : public.f(p_org => $1, …). */
export async function rpcDemo<T>(fonction: string, params: Record<string, unknown>): Promise<T> {
  if (!IDENTIFIANT.test(fonction)) throw new Error("Fonction inconnue");
  const cles = Object.keys(params).filter((k) => params[k] !== undefined);
  for (const cle of cles) if (!IDENTIFIANT.test(cle)) throw new Error("Paramètre invalide");
  const db = await baseDemo();
  const valeurs = cles.map((k) => {
    const v = params[k];
    // Les objets partent en JSON (paramètres jsonb) ; les tableaux restent des tableaux Postgres.
    return v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date) ? JSON.stringify(v) : v;
  });
  const appel = `select public.${fonction}(${cles.map((k, i) => `${k} => $${i + 1}`).join(", ")}) as r`;
  const r = await db.query<{ r: T }>(appel, valeurs);
  if ((await listerEcritures(db)).has(fonction)) derniereEcriture = Date.now();
  return r.rows[0]?.r as T;
}

export function orgDemo(): string | null {
  return typeof localStorage === "undefined" ? null : localStorage.getItem(CLE_ORG);
}

/** Efface la base de démonstration : la prochaine ouverture repart de données neuves. */
export async function reinitialiserDemo(): Promise<void> {
  const db = instance ? await instance.catch(() => null) : null;
  await db?.close();
  instance = null;
  fonctionsEcriture = null;
  derniereEcriture = 0; // la base vient d'être supprimée : rien à protéger
  localStorage.removeItem(CLE_ORG);
  await supprimerAnciennesBases("__aucune__");
}
