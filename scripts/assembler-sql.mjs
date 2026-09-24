#!/usr/bin/env node
// Assemble le SQL du dossier supabase/ dans lib/demo/sql.generated.ts, pour la
// démonstration PGlite dans le navigateur (même SQL qu'en production).
//
//   node scripts/assembler-sql.mjs             écrit le fichier
//   node scripts/assembler-sql.mjs --verifier  échoue si le fichier n'est pas à jour
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const CIBLE = "lib/demo/sql.generated.ts";

function lire(racine, ...morceaux) {
  // Fins de ligne normalisées : le contenu (et son empreinte) ne dépend pas du système.
  return readFileSync(path.join(racine, ...morceaux), "utf8").replace(/\r\n/g, "\n");
}

/** Renvoie le contenu TypeScript généré à partir des fichiers SQL. */
export function assembler(racine = RACINE) {
  const noms = readdirSync(path.join(racine, "supabase", "migrations"))
    .filter((f) => /^\d{4}_.+\.sql$/.test(f))
    .sort();
  if (noms.length === 0) throw new Error("Aucune migration dans supabase/migrations");

  const bouchon = lire(racine, "supabase", "tests", "bouchon_supabase.sql");
  const migrations = noms.map((nom) => lire(racine, "supabase", "migrations", nom));
  const demo = lire(racine, "supabase", "demo", "0100_demo.sql");
  const chaine = (s) => JSON.stringify(s);

  return [
    "// Fichier généré par scripts/assembler-sql.mjs — ne pas modifier.",
    "// Sources : supabase/tests/bouchon_supabase.sql, supabase/migrations/*.sql, supabase/demo/0100_demo.sql.",
    "// Régénérer : npm run sql:bundle",
    "",
    "/** Bouchon Supabase (rôles anon/authenticated, auth.uid(), storage) — uniquement pour PGlite. */",
    `export const BOUCHON: string = ${chaine(bouchon)};`,
    "",
    "/** Noms des migrations, dans l'ordre d'application. */",
    `export const NOMS_MIGRATIONS: readonly string[] = ${JSON.stringify(noms)};`,
    "",
    "/** Migrations (0001 à 0004), dans l'ordre d'application. */",
    "export const MIGRATIONS: readonly string[] = [",
    ...migrations.map((sql, i) => `  // ${noms[i]}\n  ${chaine(sql)},`),
    "];",
    "",
    "/** Données de démonstration : demo_initialiser, demo_decaler_dates, demo_actualiser. */",
    `export const DEMO: string = ${chaine(demo)};`,
    "",
  ].join("\n");
}

const direct = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct) {
  const contenu = assembler();
  const cible = path.join(RACINE, ...CIBLE.split("/"));
  if (process.argv.includes("--verifier")) {
    const actuel = existsSync(cible) ? readFileSync(cible, "utf8") : "";
    if (actuel !== contenu) {
      console.error(`${CIBLE} n'est pas à jour : lancez « npm run sql:bundle ».`);
      process.exit(1);
    }
    console.log(`${CIBLE} est à jour.`);
  } else {
    writeFileSync(cible, contenu);
    console.log(`${CIBLE} écrit (${(contenu.length / 1024).toFixed(0)} Ko).`);
  }
}
