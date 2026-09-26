import type { NextConfig } from "next";

// Export statique : l'application entière est un ensemble de fichiers servis tels quels
// (Vercel, Netlify, Cloudflare Pages ou un simple hébergement mutualisé). Toutes les données
// passent par les fonctions Postgres (Supabase en production, PGlite en démonstration),
// il n'y a donc aucun serveur applicatif à maintenir.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: { root: process.cwd() },
  // Next 16 régénère AGENTS.md et CLAUDE.md à chaque « next dev » : inutile ici, on coupe.
  agentRules: false,
};

export default nextConfig;
