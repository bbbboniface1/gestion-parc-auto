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
- `components/ui/` : `Bouton` (et `classesBouton(variante, taille)` pour un `<Link>` qui doit ressembler à un bouton),
  `BoutonIcone`, `Champ`, `ZoneTexte`, `Selection`, `Interrupteur`, `ChampMontant`
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

- Jetons uniquement (`bg-surface`, `text-encre-2`, `border-trait`, `text-gain`, `text-perte`, `text-ocre`…), définis dans
  `app/globals.css`. Aucune couleur en dur, aucun emoji, aucun dégradé. Le test `tests/unit/garde-couleurs.test.ts`
  échoue sinon ; ses rares exceptions (PDF, logo, balises meta, canvas) sont listées avec leur raison.
  - **Pleins sous du blanc** : `primaire-plein` (survol `primaire-plein-survol`), `accent-plein`, `gain-plein` ;
    ils garantissent 4,5:1. Ne jamais poser du blanc sur `accent` ou `gain` (trop clairs).
  - **Sur le bleu nuit** (barre latérale, cartes héros) : `text-nuit-primaire`, `text-nuit-ocre`, `text-nuit-perte`,
    `text-nuit-gain` ; identiques dans les deux thèmes.
  - **Marques tierces** : `marque-whatsapp` (+ `sur-marque-whatsapp`), `marque-orange-money`, `marque-wave`,
    `marque-moov` — réservées à ces opérateurs. Les couleurs des moyens de paiement sont dans `MODES_VISUELS`
    (`components/ventes/paiement-visuel.tsx`), avec la couleur du texte à poser dessus.
  - **Avatars** : `--avatar-1` à `--avatar-8`, via le composant `Avatar` uniquement.
  - **Palette `--etape-*`** : une couleur par étape du voyage d'un véhicule. Elle ne sert qu'à parler d'étapes.
- **Dégradés** : un seul est admis, `voile-photo` (utilitaire de `globals.css`), sous un texte posé sur une photo.
  Pas de fond de carte en dégradé, pas de tache floue décorative (`blur-3xl`), pas de lueur colorée (ombre de la
  couleur de l'élément). Une carte héro est `bg-nuit` uni.
- **Ombres** : jetons seulement — `shadow-carte`, `shadow-survol`, `shadow-flottante`, `shadow-bouton`,
  `shadow-champ` (champ, puce au repos), `shadow-puce` (puce ou onglet actif), `shadow-barre-bas`.
- Titres de section : `etiquette text-[12px] text-encre-3` (capitales condensées).
- Cartes : utilitaire `carte` (fond `surface`, filet `trait`, `rounded-carte` = 16 px, `shadow-carte`) ;
  `carte-lien` si elle est cliquable. Aucun autre rayon de carte (pas de `rounded-[22px]`).
- **Badges de navigation** (`lib/compteurs.ts`) : un badge signale ce qui attend l'utilisateur, jamais un total
  (« 23 véhicules » n'est pas une tâche). `genre: "action"` = pastille pleine (bleue, rouge si `alerte`) ;
  `genre: "statut"` = contour seul, couleur secondaire (ex. conteneurs en mer). Ne jamais mélanger les deux styles.
- Montants alignés à droite, classe `chiffres`. Codes (n° de facture, VIN, référence) : `font-mono`.
- Téléphone d'abord : cibles ≥ 44 px (`h-11` sur téléphone, `lg:h-10` au-delà — boutons, puces de filtre, onglets),
  action principale dans une barre collée en bas (`fixed inset-x-0 bottom-16 … lg:static`, voir la fiche véhicule),
  pas de défilement horizontal de page.
- **Rangées de filtres et d'onglets** : elles passent à la ligne (`flex flex-wrap gap-2`), jamais coupées au bord de
  l'écran. Une rangée qui défile horizontalement n'est admise que pour un carrousel (photos, véhicules), un tableau
  ou une frise, et porte alors `data-defilement="horizontal"` ; `verifier:mise-en-page` refuse toutes les autres.
- Chaque écran a ses états : squelette pendant le chargement, `EtatVide` avec l'action utile, `EtatErreur`
  avec « Réessayer ».
- Textes en français, vouvoiement, phrases courtes. Aucune mention d'un outil d'assistance dans le code.

## Vérification avant de rendre la main

`npm run typecheck`, `npm run lint`, `npx vitest run tests/unit` : verts. Puis `npm run build`,
`npm run verifier:mise-en-page` et `npm run verifier:accessibilite` (et `THEME=dark`).
