# Garde « pas générique » — critères d'acceptation du design v2

Chaque écran redessiné est mesuré avant d'être conservé. **Un seul critère raté = l'écran est annulé**
(`git revert`), pas retouché en boucle. Les mesures 1 à 3 sont faites sur le DOM rendu, pas à l'œil.

## Mesures objectives

| # | Test | Seuil | Comment on mesure |
|---|---|---|---|
| 1 | Conteneurs | au plus 6 boîtes bordées et arrondies par écran, jamais imbriquées | comptage DOM : éléments avec `border` + `border-radius` |
| 2 | Photographie | tout écran qui montre un véhicule montre une vraie photo, jamais une silhouette | inspection : aucun visuel de remplacement dans les données de démonstration |
| 3 | Échelle typographique | au plus 4 tailles de texte utilisées, saut d'au moins ×1,5 entre le corps et le titre principal | calcul des `font-size` calculés |

Définition mesurée d'une « boîte » : bordure sur les quatre côtés et rayon > 0 (aplats gris et traits simples exclus).
Résultats : `DESIGN_V2.md`.

## Tests de jugement (avec capture, écran par écran)

4. **Point focal unique.** En plissant les yeux, un seul élément domine (photo, chiffre clé), pas une grille de blocs égaux.
5. **Ornement porteur de sens.** Tout élément décoratif porte une information (un tampon = un statut) ou disparaît.
6. **Test du nom effacé.** Sans logo ni nom, l'écran se reconnaît encore comme un outil d'import de véhicules
   (photos, trajet, langage du métier), et pas comme « n'importe quel tableau de bord SaaS ».
7. **Comparaison de référence.** Capture à côté d'une référence choisie, même largeur d'écran :
   densité et hiérarchie du même ordre.
8. **Lisibilité terrain.** Lisible en plein soleil sur un téléphone Android d'entrée de gamme (contraste AA, cibles ≥ 44 px).

## Références retenues (voir la recherche du 24/09/2026)

- Hiérarchie des écrans de données : Tekion (grammaire de logiciel grand public, mobile d'abord).
- Présentation du véhicule : Carvana (le véhicule est le héros de la page).
- Simplicité pour des utilisateurs peu techniques : Wave.
- Flux et vocabulaire du métier : DealerCenter (note de facilité d'usage 9,3 chez SelectHub).
