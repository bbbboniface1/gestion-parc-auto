# Direction artistique — « Connaissement »

> **Remplacé le 24/09/2026 par [DESIGN_V2.md](DESIGN_V2.md)** (palette encre + jaune signal, filets, photo en héros).
> Ce document décrit l'ancienne direction « Connaissement » et n'est conservé que pour l'historique.

Le métier de nos utilisateurs est un voyage : une voiture quitte un parc d'enchères à Houston,
traverse l'Atlantique dans un conteneur, débarque à Cotonou ou Dakar, remonte en convoi
jusqu'à Bamako, passe la douane, l'atelier, puis le parc de vente.
L'interface emprunte son vocabulaire visuel **aux documents de ce voyage** — connaissement
(bill of lading), étiquettes de conteneur, cartes d'embarquement, tampons de douane — et à la
palette de la terre de Bamako (latérite, banco, ocre). Exécuté avec la rigueur d'une grille
suisse, jamais en décor folklorique.

## Ce qu'on s'interdit (l'aspect « généré »)

- Emojis dans l'interface. Dégradés décoratifs. Violet/indigo « startup ».
- Cartes aux coins très arrondis (> 12 px) avec ombre douce partout.
- Grille de 4 « stat cards » avec icône dans un rond pastel.
- Pastilles de statut en pilule pastel pour tout.
- Inter / Poppins / Montserrat.
- Titres de page du type « 🏠 Tableau de bord » + sous-titre générique.

## Typographie

| Usage | Police | Détails |
|---|---|---|
| Interface, titres, montants | **Schibsted Grotesk** | 400 / 500 / 600 / 700 ; chiffres tabulaires pour les colonnes de montants |
| Étiquettes d'étape, surtitres, en-têtes de colonnes | **Barlow Condensed** SemiBold | MAJUSCULES, interlettrage +4 %, 11–13 px — la « marque de conteneur » |
| Codes : VIN, n° de lot, conteneur, BL, facture | **IBM Plex Mono** Medium | 12–14 px ; le VIN s'affiche par groupes ISO 3 · 6 · 8 : `2T3 RFREV0 JW812345` ; forme courte `…812345` |

Échelle (mobile / ordinateur) : 12, 13, 14 (corps ordinateur), 15 (corps mobile), 17, 20, 24, 32 (montant principal), 44 (montant héros).
Interlignage : 1,45 pour le corps, 1,1 pour les montants.

## Couleurs

### Clair
| Jeton | Valeur | Usage |
|---|---|---|
| `papier` | `#F5F3EE` | Fond de l'application (blanc cassé chaud, pas gris froid) |
| `surface` | `#FFFFFF` | Cartes, feuilles, tableaux |
| `surface-2` | `#EFECE5` | Zones en retrait, lignes survolées |
| `trait` | `#E3DED3` | Bordures 1 px (on sépare par des traits, pas par des ombres) |
| `trait-fort` | `#CFC8BA` | Bordure des champs |
| `encre` | `#17171A` | Texte principal |
| `encre-2` | `#5B5A57` | Texte secondaire |
| `encre-3` | `#6B6861` | Texte tertiaire, légendes |
| `laterite` | `#B5461E` | **Couleur de marque** : action principale, focus, sélection |
| `laterite-fonce` | `#9C3A17` | Survol / appui |
| `laterite-voile` | `#F6E6DE` | Fond de sélection |
| `nuit` | `#1B1D22` | En-tête « carte d'embarquement », barre de navigation ordinateur |
| `gain` | `#1B7148` / voile `#E1F0E7` | Argent reçu, marge positive |
| `perte` | `#B3261E` / voile `#F8E1DE` | Retard, marge négative, suppression |
| `ocre` | `#8E5F08` / voile `#F6EBD6` | Attention (magasinage, échéance proche) |
| `acier` | `#2F5A7A` / voile `#E1EAF1` | Information |

### Sombre
`papier #121316`, `surface #1A1C20`, `surface-2 #22252A`, `trait #2A2D33`, `trait-fort #3A3E45`,
`encre #EDEAE3`, `encre-2 #A6A29A`, `encre-3 #96928A`, `laterite #E0724A`.

### Couleurs d'étape — la géographie du voyage
Froid aux USA, bleu-vert en mer, terre en arrivant au Mali, vert quand c'est vendu.

| Étape | Couleur |
|---|---|
| Acheté | `#5E6B7A` ardoise |
| Vers le port | `#3F6784` acier |
| En mer | `#1F6F7A` océan |
| Au port | `#76673D` sable |
| Convoi | `#8A5F23` ocre |
| Douane | `#A34F26` argile |
| Atelier | `#8A4B2E` terre brûlée |
| Au parc | `#B5461E` latérite |

### Statut commercial — indépendant de l'étape
Un véhicule peut être vendu alors qu'il est encore en mer. Le statut commercial ne remplace donc
jamais l'étiquette d'étape : il s'affiche **à côté**, sous forme de tampon compact.

| Statut | Rendu |
|---|---|
| Disponible | rien (état par défaut, pas de bruit visuel) |
| Réservé | tampon `#7A3E5D` teinture bogolan, « RÉSERVÉ · M. TRAORÉ » |
| Vendu | tampon `#1B7148` vert, « VENDU » ; « VENDU · À LIVRER » si pas encore remis |

## Formes

- Rayons : 6 px (champs, boutons), 10 px (cartes), 16 px (feuilles mobiles, haut uniquement).
- Bordures 1 px `trait`. Ombre **uniquement** sur ce qui flotte (feuille, menu, popover) : `0 8 24 rgba(23,23,26,.12)`.
- Grille de 4 px. Marges mobiles 16 px. Cibles tactiles ≥ 44 px (48 px pour l'action principale).
- Icônes : Lucide, trait 1,75, 20 px (18 px dans les listes denses).

## Composants signature

1. **Étiquette d'étape** — rectangle 4 px de rayon, barre de couleur de 3 px à gauche, texte Barlow
   Condensed MAJUSCULES dans la couleur de l'étape, fond `surface`. Jamais une pilule pastel.
2. **Carte d'embarquement** (en-tête de la fiche véhicule) — fond `nuit`, texte clair ; à gauche
   marque/modèle/année en grand, VIN en mono par groupes ; à droite référence `V-0042` et étape ;
   séparation par une **ligne perforée** (tirets) avec deux encoches demi-cercle sur les bords,
   comme un billet ; en dessous : LOT, CONTENEUR, NAVIRE, PORT en colonnes de petites capitales.
3. **Le trajet** — rail horizontal : HOUSTON → (navire) → COTONOU → (camion) → BAMAKO, avec un point
   par étape (plein = passée, anneau = en cours, vide = à venir) et, sous chaque segment, le nombre
   de jours passés. ETA à droite. Sur mobile, le rail défile horizontalement.
4. **Barre de coût de revient** — barre horizontale empilée, un segment par catégorie de frais
   (achat, enchère, remorquage, fret, port, convoi, douane, atelier, divers), avec au-dessus
   le prix de revient et, à droite, un repère vertical « prix affiché » : l'écart visible = la marge.
   Légende en liste dessous avec montants alignés à droite.
5. **Montant** — le chiffre en 600, l'unité « FCFA » en 400 couleur `encre-3`, plus petite.
   Les grands montants s'abrègent (`8,5 M`) dans les indicateurs ; valeur exacte au toucher.
6. **Champ montant** — clavier numérique, groupement en direct (`8 500 000`), accepte `8,5M` et `850k`,
   devise en suffixe cliquable (FCFA / USD / EUR) qui affiche la conversion en dessous.
7. **Tampon** — sur une facture annulée ou une vente soldée : cadre à double trait, légèrement
   incliné (−4°), capitales Barlow Condensed (« SOLDÉ », « ANNULÉ ») — l'équivalent du cachet.

## Navigation

- **Mobile** : barre du bas à 5 positions — Aujourd'hui · Parc · **＋** (bouton central latérite, ouvre
  une feuille d'actions : véhicule, vente, encaissement, dépense) · Ventes · Plus. En-tête : titre
  à gauche, recherche et avatar d'organisation à droite. Les formulaires s'ouvrent en feuilles
  plein écran avec la barre d'action collée en bas.
- **Ordinateur (≥ 1024 px)** : rail gauche 240 px fond `nuit` (texte clair, élément actif avec barre
  latérite à gauche), barre supérieure avec recherche globale (Ctrl K) et sélecteur d'entreprise.
  Contenu sur fond `papier`, largeur max 1280 px.

## Écrans à maquetter (validation avant développement)

1. Fondations : couleurs, typographie, étiquettes d'étape, boutons, champs (dont champ montant),
   carte véhicule, ligne de tableau, navigation.
2. **Aujourd'hui** — mobile 390 et ordinateur 1440.
3. **Parc** — Kanban ordinateur ; liste à onglets d'étapes sur mobile.
4. **Fiche véhicule** — mobile et ordinateur (carte d'embarquement, trajet, coût de revient, documents).
5. **Vente** — parcours mobile en feuille : client → prix → encaissement → facture émise.
6. **Facture A4** — avec montant en lettres, QR de vérification, cachet et signature.
7. **Paramètres** — sommaire + section « Documents & facturation » (ordinateur et mobile).

## Données de démonstration (réalistes, contexte Bamako)

Véhicules : Toyota RAV4 2018, Toyota Corolla 2019, Toyota Highlander 2017, Lexus RX 350 2016,
Honda CR-V 2019, Hyundai Santa Fe 2018, Ford Explorer 2017, Mercedes-Benz GLE 350 2016,
Toyota Camry 2020, Kia Sorento 2019. Ports : Houston, Savannah, Baltimore → Cotonou, Dakar.
Clients : Moussa Traoré, Aminata Diallo, Oumar Coulibaly, Fatoumata Keïta, Ibrahim Sangaré,
Mariam Touré. Prix de vente typiques : 6 500 000 à 22 000 000 FCFA.
