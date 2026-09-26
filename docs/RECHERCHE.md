# Recherche — logiciels de gestion pour négociants automobiles (septembre 2026)

## 1. Ce que font les meilleurs

| Produit | Marché | Ce qu'on en retient | Prix affiché |
|---|---|---|---|
| **Tekion** | Concessions USA | Interface la plus moderne du secteur, inspirée des logiciels grand public (hiérarchie claire, typographie soignée) ; conçu mobile d'abord (travail sur le parc depuis le téléphone) | Sur devis |
| **DealerCenter** | Marchands indépendants USA | Modulaire : DMS, CRM, site, crédit « buy here pay here » | 50 à 199 $ par module et par mois ; 295 $ à plus de 500 $/mois pour un ensemble réaliste |
| **Frazer** | Marchands indépendants USA | Stock, vente, financement, recouvrement, comptabilité | — |
| **Iziscar** | Marchands VO France | Saisie par plaque, documents légaux générés, estimation de marge, stock dormant, ventes par vendeur, export comptable | 29 € à 149 €/mois |
| **AutoCerfa** | Marchands VO France | Livre de police, marge nette, durée de rotation, **masquage des prix et marges pour les employés**, coffre-fort de documents | 39 € à 59 €/mois |
| **VISCO, Syspro, CARVO** | Importateurs (tous secteurs) | Coût de revient importé (landed cost) : fret, assurance, droits, transitaire, stockage, **répartis entre les articles d'une même expédition** ; suivi de conteneur | Sur devis |

Point commun absent de tous : **aucun ne gère le flux enchère USA → port africain → Bamako**
avec un coût de revient en FCFA ligne par ligne. C'est la place à prendre.

## 2. Contexte malien vérifié

- **Voies d'importation** : ports de Dakar, Abidjan, Cotonou, puis route ; délai total USA → Mali
  généralement 45 à 60 jours (achat et remorquage 5–10 j, mer 25–35 j, dédouanement et livraison 5–10 j).
- **Ports de départ USA** : Houston est le premier port d'export de véhicules (vers l'Afrique de l'Ouest
  notamment) ; Savannah, Baltimore, Newark, Jacksonville aussi.
- **Frais d'enchère** : chez Copart, les frais ajoutent environ 20 % à l'enchère gagnante
  (frais acheteur par paliers, frais d'enchère en ligne, portail, environnement, titre).
  Remorquage vers le port : 350 à 1 400 $ selon la distance, +150 à 300 $ si le véhicule ne roule pas.
- **Douane** : les sources en ligne donnent « 20 % + prélèvement CEDEAO », TVA 18 % sur la valeur CAF
  majorée des droits — **toutes précisent que les taux sont approximatifs**. → barème paramétrable,
  jamais codé en dur.
- **Immatriculation** : depuis le **30 juin 2026**, la circulation des véhicules sans plaque est interdite
  au Mali, avec facilités de régularisation (exonération sous 30 M FCFA de valeur en douane, 12 mois
  pour payer). → suivi de la carte grise par véhicule.
- **Facture normalisée** : le Mali a institué par décret un système sécurisé de factures normalisées
  (DGI). Les mentions exactes ne sont pas publiées en détail en ligne → NIF, RCCM, mentions et TVA
  paramétrables ; QR de vérification propre à l'app.
- **Mobile money** : Orange Money Mali (leader, ~65 % des transactions numériques en 2026, plafond
  1 000 000 FCFA par transaction) et Moov Money / Sama Money (plafond 500 000 FCFA). Conséquence
  pratique : une voiture se paie en **plusieurs versements** → encaissements multiples avec
  référence de transaction et reçu numéroté.

## 3. Ergonomie

- **Wave** : parcours client simplifié à l'extrême, pensé aussi pour des utilisateurs peu à l'aise
  avec l'écrit (intermédiaires qui aident, QR codes). → une action principale par écran, gros chiffres.
- **Tekion** : le mobile n'est pas une version réduite ; le travail sur le parc se fait au téléphone.
- **PWA** : icônes 192 et 512 px obligatoires pour l'installation Chrome, variante « maskable »
  recommandée sur Android, 180 px pour iOS ; mise en cache de l'enveloppe de l'app pour le hors ligne.

## 4. Prix pratiqués (base de la recommandation tarifaire)

| Référence | Prix mensuel |
|---|---|
| Logiciels de gestion généralistes en Afrique de l'Ouest (STOCKALIO, GestoclocPro, DIAM POS) | 12 000 à 25 000 FCFA |
| Logiciels spécialisés VO en France (Iziscar, AutoCerfa) | 29 € à 149 € ≈ 19 000 à 98 000 FCFA (parité fixe 655,957) |
| DealerCenter (USA) | 295 $ à plus de 500 $ |

## Sources

- [Guideflow — dealership management software 2026](https://www.guideflow.com/blog/dealership-management-software)
- [Lotpop — 7 best used car dealer software 2026](https://www.lotpop.com/7-best-used-car-dealer-software-tools-for-2026)
- [Ringlead — Tekion review 2026](https://www.ringlead.ca/blog/dealership-ai/tekion-review-2026/)
- [DealerVLO — DealerCenter pricing 2026](https://www.dealervlo.com/blog/dealercenter-pricing-explained)
- [TrustRadius — DealerCenter pricing](https://www.trustradius.com/products/dealercenter/pricing)
- [Iziscar](https://iziscar.com/) · [AutoCerfa](https://www.autocerfa.com/)
- [VISCO — landed cost](https://viscosoftware.com/product-info/landed-costs/) · [Syspro — landed cost tracking](https://www.syspro.com/product/landed-cost-tracking/)
- [SimpliFi Bénin — importer une voiture au port de Cotonou](https://simplifi-bj.com/blog/importer-voiture-port-cotonou-guide)
- [CarRadar — expédier une voiture vers le Mali](https://carrader.com/fr/shipping/mali)
- [voitures.ci — dédouanement des véhicules](https://www.voitures.ci/en/posts/dedouanement-des-vehicules-couts-et-procedures)
- [Fasso Actu — Mali, interdiction de circulation des véhicules non immatriculés (01/07/2026)](https://fassoactu.com/2026/07/01/mali-le-gouvernement-interdit-la-circulation-des-vehicules-non-immatricules-et-accorde-des-facilites-de-regularisation/)
- [DGI Mali — système sécurisé de factures normalisées](https://www.dgi.gouv.ml/institution-du-systeme-securise-de-factures-normalisee-le-president-de-la-transition-signe-le-decret/)
- [Kolonell — paiement mobile money Mali 2026](https://kolonell.com/fr/blog/paiement-mobile-money-mali-orange-money-moov-site-2026)
- [CarFlipIQ — Copart fees 2026](https://carflipiq.com/blog/how-much-are-copart-fees-2026) · [Y7 — export Copart vers les ports](https://www.y7agency.com/exporters)
- [STOCKALIO](https://www.stockalio.com/) · [GestoclocPro](https://gestoclocpro.com/) · [DIAM POS](https://www.diampos.net/)
- [Rest of World — Wave au Sénégal](https://restofworld.org/2022/how-wave-is-disrupting-francophone-africas-mobile-money-market/)
- [Datadog Security Labs — CVE-2025-29927](https://securitylabs.datadoghq.com/articles/nextjs-middleware-auth-bypass/)
- [Next.js — guide PWA](https://nextjs.org/docs/app/guides/progressive-web-apps)
