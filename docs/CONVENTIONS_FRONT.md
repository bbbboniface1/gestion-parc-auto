# Conventions front-end

À lire avant d'écrire un écran. Les écrans de référence, à imiter : `app/(app)/accueil/page.tsx`,
`app/(app)/parc/page.tsx`, `app/(app)/parc/vehicule/page.tsx`, `components/metier/formulaire-vehicule.tsx`.

## Données

- **Jamais d'appel direct aux tables.** Tout passe par les fonctions SQL (`supabase/migrations/0003_api.sql`,
  documentées dans `supabase/API.md`) via :
  - `useLecture<T>(fonction, { p_org: org.id, ... })` — lecture, cache hors ligne ;
  - `useEcriture<T>(fonction, { onSuccess, onError })` puis `.executer(params)` / `.executerAsync(params)` —
    après succès, tout le cache est invalidé (les écrans se rafraîchissent seuls).
- Création : toujours passer `id: nouvelId()` dans `p_data` (idempotence, reprise hors ligne). Générer l'id
  **une fois par ouverture de formulaire** (voir `feuille-frais.tsx`), pas à chaque rendu.
- Entreprise active : `const org = useOrg()` (`org.id`, `org.role`). Paramètres : `useParametres()`.
- Droits : `peut(org.role, "vendre")`, etc. (`lib/domaine.ts`). Le serveur fait foi ; l'interface masque
  seulement ce qui serait refusé. Un montant de coût `null` = rôle qui ne doit pas le voir : ne rien afficher.
- Erreurs : `toast.error(e.message)` — les messages SQL sont déjà rédigés pour l'utilisateur.

## Routes

Export statique : **pas de segment dynamique**. Une fiche = `?id=` (`/ventes/fiche/?id=…`).
Toujours la barre oblique finale dans les liens (`/ventes/`). Page qui lit `useSearchParams` : l'envelopper
dans `<Suspense>`.

## Composants (ne pas en recréer)

- Coque : `EnTetePage` (titre, surtitre, sousTitre, actions) dans `components/coque/coque.tsx`.
- `components/ui/` : `Bouton`, `BoutonIcone`, `Champ`, `ZoneTexte`, `Selection`, `Interrupteur`, `ChampMontant`
  (FCFA/USD/EUR, « 8,5M »), `Choix` (segments), `Feuille` (bas d'écran sur téléphone, fenêtre sur ordinateur,
  `pied` = boutons), `MenuActions`, `Onglets`, `EtatVide`, `EtatErreur`, `Squelette`, `SqueletteListe`,
  `EtiquetteEtape`, `Tampon`, `Montant`, `Surtitre`, `Code`.
- `components/metier/` : `Registre` (libellé … valeur), `CarteEmbarquement`, `Trajet`, `CoutRevient`,
  `LigneVehicule`, `TamponCommercial`, `PhotoVehicule`, `FeuilleFrais`, `ChoixClient`, `ListeActions` + `lienEntite`.
- Documents : `genererPDF(donnees)`, `telecharger`, `imprimer`, `nomFichier`, `urlVerification`
  (`lib/documents/generer.tsx`), types `DonneesDocument` (`lib/documents/types.ts`).
- WhatsApp : `lienWhatsApp`, `remplirModele`, `partagerFichier` (`lib/whatsapp.ts`).
- Formats : `formatFCFA`, `formatCourt`, `formatDate`, `formatDateLongue`, `formatJour`, `formatPourcent`,
  `pluriel`, `aujourdhui` (`lib/format.ts`). Montant en lettres : `montantEnLettres` (`lib/lettres.ts`).

## Style

- Jetons uniquement (`bg-surface`, `text-encre-2`, `border-trait`, `text-laterite`, `text-gain`, `text-perte`,
  `text-ocre`…). Aucune couleur en dur, aucun emoji, aucun dégradé.
- Titres de section : `etiquette text-[12px] text-encre-3` (capitales condensées).
- Cartes : `rounded-carte border border-trait bg-surface`, pas d'ombre.
- Montants alignés à droite, classe `chiffres`. Codes (n° de facture, VIN, référence) : `font-mono`.
- Téléphone d'abord : cibles ≥ 44 px, action principale dans une barre collée en bas
  (`fixed inset-x-0 bottom-16 … lg:static`, voir la fiche véhicule), pas de défilement horizontal de page.
- Chaque écran a ses états : squelette pendant le chargement, `EtatVide` avec l'action utile, `EtatErreur`
  avec « Réessayer ».
- Textes en français, vouvoiement, phrases courtes. Aucune mention d'un outil d'assistance dans le code.

## Vérification avant de rendre la main

`npm run typecheck`, `npm run lint`, `npx vitest run tests/unit` : verts.
