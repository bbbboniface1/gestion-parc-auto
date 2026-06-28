# Gestion Parc Automobile — Mali Import

Application web de gestion de parc automobile pour revendeur de voitures d'occasion importées des USA vers le Mali.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Supabase** (PostgreSQL + Auth + Storage)
- **Tailwind CSS** + shadcn/ui
- **React Hook Form** + Zod
- **@react-pdf/renderer** pour les factures
- **Recharts** pour les graphiques
- **Zustand** + **Sonner**

## Installation

```bash
npm install
```

## Configuration Supabase

1. Créez un projet sur [supabase.com](https://supabase.com)
2. Exécutez le script SQL dans `supabase/schema.sql` (éditeur SQL Supabase)
3. Copiez `.env.local.example` vers `.env.local` et renseignez vos clés :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

4. Créez un compte utilisateur via `/inscription`

## Lancement

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000)

## Déploiement Vercel

1. Poussez le code sur GitHub
2. Importez le projet dans Vercel
3. Ajoutez les variables d'environnement Supabase
4. Déployez

## Structure

- `/dashboard` — Tableau de bord
- `/voitures` — Liste et gestion des voitures
- `/stock` — Voitures disponibles à la vente
- `/finances` — Paiements USA et encaissements Mali
- `/ventes` — Historique des ventes et factures PDF
- `/parametres` — Configuration entreprise
# gestion-parc-auto
