# Design v2 — « fiche de lot » (24/09/2026)

Remplace la direction « Connaissement » (latérite, papier crème, cartes arrondies) de
`DIRECTION_ARTISTIQUE.md`, jugée générique. Mesuré avec `GARDE_ANTI_GENERIQUE.md`.

## Pourquoi changer

Terre cuite + crème + cartes à coins arrondis + pastilles : c'est la palette « éditoriale chaleureuse » que
produit n'importe quel générateur d'interface. Le test du nom effacé échouait : rien ne disait « import de véhicules ».

## Principes

1. **Des filets, pas des boîtes.** Une section = un filet d'encre de 2 px + un titre en capitales condensées, posée
   sur la page (`components/ui/section.tsx`). Aucune carte bordée dans le contenu ; arêtes de 2 px ; pas d'ombre
   (sauf menus et feuilles flottants).
2. **Une seule couleur vive, le jaune signal `#F2C200`, qui désigne toujours « où en est le véhicule ».**
   Elle marque l'étape en cours dans la *piste* (huit segments), l'onglet actif du rail, le bouton principal.
   Le jaune fait 1,7:1 sur blanc : il n'est jamais seul (segment cerclé d'encre, texte d'encre dessus, jamais du texte jaune).
3. **La photo est le héros.** Fiche véhicule : photo pleine largeur ; listes : photo à chaque ligne (parc, ventes,
   expéditions, choix du véhicule) ; page d'entrée : fiche de lot avec vraie photo. Sans photo : le mot « Pas de photo »,
   jamais une fausse silhouette.
4. **Les étapes se lisent en gris**, du clair (acheté) au noir (au parc) : plus c'est foncé, plus c'est près de la vente.
5. **Quatre tailles de texte : 13 / 15 / 24 / 44 px** (`petit`, `corps`, `titre`, `chiffre`). Les grandes valeurs
   (prix, capital, reste à encaisser) sont en chiffres condensés, comme un numéro de lot.
6. **Le tampon (double trait, incliné) est réservé au statut du dossier**, une fois par écran ; dans les listes le
   statut est du texte en capitales.

## Composants signature

| Composant | Rôle |
|---|---|
| `Piste` | 8 segments : passé plein, étape en cours jaune + cerclée, suite en filet (listes, tableau) |
| `Trajet` | la même piste en grand, jours passés à chaque étape, zones (Houston · mer · Cotonou · Bamako) |
| `FiltreRoute` | le parc lu comme le voyage : une colonne par étape, chiffre puis nom, qui sert de filtre |
| `Section` / `LigneRegistre` | filet d'encre + titre ; ligne libellé/valeur à filet |
| `Montant` | gros chiffres condensés (`xl`), unité en 13 px |
| `StatutTexte` / `Tampon` | statut en liste / statut du dossier |

## Références et recherche

Références retenues (détail et sources dans `RECHERCHE.md`) : Tekion pour la grammaire des écrans de données,
Carvana pour le véhicule comme héros, Wave pour la simplicité, DealerCenter pour le flux et le vocabulaire.
Limites : les notes d'avis publiques sont des échantillons biaisés (avis sollicités par les éditeurs, marché
américain) ; aucun fichier Figma de la communauté n'a été retenu, et la maquette Figma du projet reste limitée aux
fondations et à un écran (quota du compte gratuit).

## Résultats du garde-fou (mesure sur le DOM rendu, données de démonstration)

Boîte = élément avec bordure sur les quatre côtés **et** rayon > 0. Un aplat gris (bouton secondaire, champ) n'est
pas compté ; les champs ont un trait en bas, pas de cadre. Mesuré à **390 px** (téléphone) sur tous les écrans, et à
**1024 px** sur Parc, fiche véhicule, Aujourd'hui, listes et Paramètres. **Non mesuré à 1280 px et plus.**

| Écran | Boîtes | Tailles (px) |
|---|---|---|
| Aujourd'hui, Parc, Ventes, Clients, Expéditions, Finances | 0 | 13/15/24(/44) |
| Fiche véhicule, fiche client, fiche expédition, simulateur, nouvelle vente, nouveau véhicule | 0 | 13/15/24(/44) |
| Fiche vente | 1 (le tampon du statut) | 13/15/24/44 |
| Paramètres (vue d'ensemble + 10 sous-pages) | 0 | 13/15/24 |

Avant la refonte : Ventes 22 boîtes, Paramètres 11, Finances 8.

## Limites connues

- Les tests 4 à 8 du garde-fou (point focal, nom effacé, comparaison de référence, lisibilité au soleil) sont des
  jugements ; ils n'ont été faits que sur captures, pas sur un téléphone Android d'entrée de gamme.
- Facture PDF : conserve son papier crème ; seule la couleur d'accent par défaut passe à l'encre.
- Mode sombre : jetons définis et contrastes calculés, écrans non passés en revue un par un.
- 21 erreurs ESLint restent (règles React Compiler `set-state-in-effect`, motif « réinitialiser à l'ouverture »).
