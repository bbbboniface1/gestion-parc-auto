# Parc Auto

Application de gestion pour les négociants qui achètent des véhicules à l'étranger
(enchères USA : Copart, IAAI, Manheim) et les revendent au Mali : suivi du véhicule de
l'enchère à la vente, **coût de revient en FCFA ligne par ligne**, ventes échelonnées,
encaissements mobile money, factures, trésorerie.

PWA (installable, fonctionne hors ligne), pensée pour le téléphone d'abord.

## Essayer tout de suite (sans compte)

```bash
npm install
npm run dev
```

Ouvrez http://localhost:3000 puis **« Essayer la démonstration »** : une vraie base Postgres
(PGlite) tourne dans le navigateur avec une entreprise fictive de Bamako (23 véhicules,
ventes, échéances, encaissements). Rien n'est envoyé à un serveur.

## Mettre en production (Supabase + hébergement statique)

1. Créez un projet sur [supabase.com](https://supabase.com).
2. Dans l'éditeur SQL, exécutez dans l'ordre `supabase/migrations/0001_schema.sql`,
   `0002_prive.sql`, `0003_api.sql`, `0004_stockage.sql`.
   **N'exécutez jamais** `supabase/tests/bouchon_supabase.sql` ni `supabase/demo/` en production.
3. Authentication › activez l'e-mail ; réglez l'URL du site (redirections de confirmation).
4. Copiez `.env.local.example` vers `.env.local` et renseignez l'URL et la clé `anon`.
5. `npm run build` produit le dossier `out/` : déposez-le tel quel sur Vercel, Netlify,
   Cloudflare Pages ou un hébergement statique. Les en-têtes de sécurité sont fournis
   (`vercel.json`, `public/_headers`).

## Sécurité

- Aucun accès direct aux tables : les droits sont retirés à `anon` et `authenticated`,
  toute l'API passe par des fonctions `security definer` qui vérifient l'appartenance à
  l'entreprise **et** le rôle (propriétaire, gérant, vendeur, comptable, lecture).
- Le vendeur ne voit ni coûts ni marges (réglable). Vérifié par 49 tests Postgres,
  dont un test d'isolation entre entreprises sur **chaque** fonction.
- Numérotation des factures attribuée par le serveur, sans trou ni doublon.

## Vérifier

```bash
npm run typecheck   # types
npm test            # 160 tests : montant en lettres, saisie, VIN, simulateur, PDF, Postgres
npm run build       # export statique + service worker
```

## Structure

- `app/(app)/` — écrans : accueil, parc, ventes, clients, expéditions, finances, paramètres, outils
- `components/ui/` — système de design « Connaissement » ; `components/metier/` — composants du métier
- `lib/` — formats, montants, VIN (clé de contrôle + décodage NHTSA), simulateur, documents PDF
- `supabase/` — schéma, API, données de démonstration ; `tests/` — tests unitaires et Postgres
- `docs/` — cahier des charges, direction artistique, recherche, conventions
