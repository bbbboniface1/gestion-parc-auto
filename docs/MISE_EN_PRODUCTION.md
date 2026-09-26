# Mise en production

Ce document suffit pour publier l'application chez un client : un projet Supabase (base, comptes, fichiers) et un
hébergement statique. Comptez une heure la première fois.

## 1. Le projet Supabase

1. Créez un projet sur [supabase.com](https://supabase.com) (région la plus proche des utilisateurs, mot de passe de base
   solide, conservé dans un gestionnaire de mots de passe).
2. **SQL Editor** : exécutez, dans cet ordre, `supabase/migrations/0001_schema.sql`, `0002_prive.sql`, `0003_api.sql`,
   `0004_stockage.sql`. Chaque fichier doit se terminer sans erreur.
   - N'exécutez **jamais** `supabase/tests/bouchon_supabase.sql` ni `supabase/demo/` : ils servent aux tests et à la
     démonstration, pas à la production.
3. **Authentication › Providers** : activez « Email ». Pour un lancement rapide, vous pouvez désactiver la confirmation
   par e-mail ; pour un usage réel, gardez-la activée et configurez un serveur SMTP (Authentication › SMTP), car l'envoi
   intégré de Supabase est limité.
4. **Authentication › URL Configuration** : *Site URL* = l'adresse publique de l'application
   (`https://parc.exemple.ml`) ; ajoutez la même adresse dans *Redirect URLs*.
5. **Storage** : le bucket privé `parc-auto` est créé par `0004_stockage.sql`. Vérifiez qu'il apparaît, non public.
6. **Project Settings › API** : notez l'URL du projet et la clé `anon` (publique). N'utilisez **jamais** la clé
   `service_role` dans l'application.

## 2. Variables d'environnement

Copiez `.env.local.example` vers `.env.local` (ou renseignez les mêmes noms dans l'hébergeur) :

| Variable | Valeur |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet, `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé `anon` publique |
| `NEXT_PUBLIC_DEMO` | *(facultatif)* `1` uniquement sur un site de présentation |

Dès que l'URL et la clé sont renseignées, **le mode démonstration est masqué** : l'écran de connexion n'affiche que la
connexion et l'inscription. Ces variables sont figées au moment du build : après les avoir changées, refaites
`npm run build`.

## 3. Construire et publier

```bash
npm ci
npm run build      # produit le dossier out/
```

Déposez `out/` tel quel sur Vercel, Netlify, Cloudflare Pages ou tout hébergement statique.

- **En-têtes de sécurité** (CSP, HSTS, `X-Frame-Options`…) : fournis dans `vercel.json` (Vercel) et `public/_headers`
  (Netlify, Cloudflare Pages). Ne les affaiblissez pas. La politique autorise uniquement l'application elle-même, votre
  projet Supabase (`*.supabase.co`), le décodage de VIN (`vpic.nhtsa.dot.gov`) et les taux de change
  (`open.er-api.com`).
- **HTTPS obligatoire** : le service worker (mode hors ligne, installation sur l'écran d'accueil) ne fonctionne qu'en HTTPS.
- **Nom de domaine** : configurez-le chez l'hébergeur, puis reportez-le dans *Site URL* côté Supabase (étape 1.4).
- `/sw.js` ne doit jamais être mis en cache par le navigateur (déjà réglé dans les en-têtes fournis).

## 4. Premier démarrage

1. Ouvrez l'application, **Créer un compte**, confirmez l'e-mail si la confirmation est activée.
2. L'écran « Bienvenue » crée l'entreprise : nom commercial, ville, taux USD → FCFA. Le compte devient **propriétaire**.
3. **Paramètres › Entreprise** : raison sociale, NIF, RCCM, compte bancaire, logo, cachet, signature (imprimés sur les
   factures). **Paramètres › Documents** : mention de TVA, conditions de vente, garantie.
4. **Paramètres › Équipe** : invitez le gérant, les vendeurs, le comptable. Chaque personne reçoit un code d'invitation
   à saisir sur « Rejoindre une entreprise ». Rôles : propriétaire, gérant, vendeur (ne voit ni coûts ni marges), comptable,
   lecture seule.
5. **Paramètres › Douane, Devises, Logistique** : barèmes de droits, taux de change, compagnies maritimes et ports.

## 5. Sauvegardes et exploitation

- **Sauvegardes** : Supabase sauvegarde la base chaque jour sur les offres payantes (Project Settings › Database ›
  Backups). Sur l'offre gratuite, exportez régulièrement (`pg_dump`, ou **Paramètres › Données** dans l'application pour
  l'export des véhicules, ventes et clients en CSV).
- **Mises à jour de l'application** : republiez `out/`. Le service worker détecte la nouvelle version et la propose à
  l'utilisateur ; aucune manipulation côté client.
- **Mises à jour du schéma** : ajoutez un nouveau fichier `supabase/migrations/000N_….sql` (ne modifiez jamais un fichier
  déjà exécuté en production) et exécutez-le dans le SQL Editor avant de publier la version de l'application qui en dépend.
- **Journal d'activité** : **Paramètres › Journal** (propriétaire) : qui a fait quoi, quand.
- **Sécurité** : aucun accès direct aux tables (droits retirés à `anon` et `authenticated`) ; toute l'API passe par des
  fonctions vérifiant l'appartenance à l'entreprise **et** le rôle. Aucune clé secrète n'est embarquée dans l'application.

## 6. Vérifier avant de livrer

```bash
npm run typecheck && npm run lint && npm test     # types, ESLint, ~200 tests (dont Postgres complet)
npm run build
npm run verifier:navigateur                       # vrai navigateur (Edge/Chrome) sur le build de production
```

`verifier:navigateur` enchaîne :

| Commande | Ce qu'elle prouve |
| --- | --- |
| `verifier:demo` | la démonstration démarre à froid et à chaud (moteur Postgres du navigateur hors bundle) |
| `verifier:workflow` | véhicule ↔ conteneur ↔ dépenses : cohérence et alertes |
| `verifier:erreurs` | 36 écrans + 8 pages publiques : aucune erreur console, exception ni requête en échec |
| `verifier:accessibilite` | axe (WCAG 2.1 AA) sur 28 écrans, téléphone et ordinateur ; `THEME=dark` pour le thème sombre |
| `verifier:mise-en-page` | 17 écrans × 12 largeurs (360 → 1920 px) : pas de débordement, navigation qui ne recouvre rien |
| `verifier:hors-ligne` | l'application s'ouvre sans réseau après une première visite |
| `verifier:parcours` | 21 parcours métier joués comme un utilisateur : achat, frais, conteneur, ventes, proforma, PDF, comptes… |

En cas d'échec de `verifier:parcours`, une capture de l'écran fautif est déposée dans `test-results/`.

## 7. Limites connues

- L'application est **une interface statique** : la fiabilité des données repose sur Supabase. Surveillez le quota et
  la facturation de votre projet.
- Le décodage automatique du VIN interroge la base publique NHTSA (véhicules américains) : sans réseau, la saisie manuelle
  reste possible.
- Les taux de change se rafraîchissent depuis un service public ; le taux saisi dans **Paramètres › Devises** fait foi.
- La démonstration (`NEXT_PUBLIC_DEMO=1`) stocke ses données dans le navigateur, sans serveur : elle ne remplace pas un
  compte réel. Elle démarre en 7 à 18 secondes la première fois, puis en moins de 2 secondes.
