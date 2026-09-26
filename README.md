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

## Mettre en production

Pas à pas complet : **[docs/MISE_EN_PRODUCTION.md](docs/MISE_EN_PRODUCTION.md)** (projet Supabase, variables d'environnement,
hébergement, premier démarrage, sauvegardes). En bref : exécuter les quatre fichiers de `supabase/migrations/` dans l'éditeur SQL,
renseigner `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`, puis `npm run build` et déposer `out/` sur
un hébergement statique (les en-têtes de sécurité sont fournis). Dès que Supabase est configuré, la démonstration est masquée.

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
npm run lint        # ESLint (règles React Compiler comprises)
npm test            # ~200 tests : montant en lettres, saisie, VIN, simulateur, workflow, dépenses, PDF, Postgres
npm run build       # export statique + service worker
```

Vérifications dans un vrai navigateur (Edge ou Chrome), sur le build de production — à lancer après `npm run build` :

```bash
npm run verifier:navigateur   # tout ce qui suit, dans l'ordre
npm run verifier:demo         # la démonstration démarre à froid puis à chaud
npm run verifier:workflow     # véhicule sans conteneur → conteneur → arrivée → dépenses cliquables
npm run verifier:erreurs      # 36 écrans + pages publiques : aucune erreur console / exception / requête en échec
npm run verifier:accessibilite  # axe WCAG 2.1 AA, téléphone et ordinateur (THEME=dark pour le thème sombre)
npm run verifier:mise-en-page   # 17 écrans × 12 largeurs, de 360 à 1920 px
npm run verifier:hors-ligne     # l'application s'ouvre sans réseau après une première visite
npm run verifier:parcours       # 21 parcours métier joués comme un utilisateur (achat, ventes, proforma, PDF…)
```

## Structure

- `app/(app)/` — écrans : accueil, parc, ventes, clients, expéditions, finances, paramètres, outils
- `components/ui/` — système de design « Connaissement » ; `components/metier/` — composants du métier
- `lib/` — formats, montants, VIN (clé de contrôle + décodage NHTSA), simulateur, documents PDF
- `supabase/` — schéma, API, données de démonstration ; `tests/` — tests unitaires et Postgres
- `docs/` — cahier des charges, direction artistique, recherche, conventions
