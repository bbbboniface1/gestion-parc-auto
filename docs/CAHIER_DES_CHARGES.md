# Cahier des charges — Refonte « Parc Auto »

Application de gestion pour les négociants qui **achètent des véhicules à l'étranger
(principalement enchères USA : Copart, IAAI, Manheim) et les revendent au Mali**.
Document de référence pour le développement : toute décision d'implémentation qui
s'en écarte doit être notée ici.

---

## 1. Ce que l'ancienne version ne faisait pas (diagnostic du 24/09/2026)

| # | Problème constaté dans le code | Conséquence |
|---|---|---|
| 1 | `package-lock.json` désynchronisé de `package.json` | `npm ci` échoue : aucun déploiement reproductible |
| 2 | Next.js 14.2.0 | Faille critique CVE-2025-29927 (contournement du middleware d'authentification, CVSS 9.1) + 7 avis de sécurité `npm audit` |
| 3 | RLS `auth.role() = 'authenticated'` + inscription ouverte | **Toute personne qui crée un compte voit et modifie toutes les données** de l'entreprise |
| 4 | Vue `dashboard_stats` : jointure voitures × ventes | Une voiture vendue, annulée puis revendue est comptée deux fois (parc, montants USA) |
| 5 | Numéro de facture = `count(*) + 1` côté navigateur | Doublons possibles, collision avec la contrainte `unique` → vente bloquée |
| 6 | Vente = 3 requêtes séparées (vente, statut voiture, paiement) | Une coupure réseau au milieu laisse des données incohérentes |
| 7 | Aucun coût de revient : seulement `prix_achat_usd` + un `frais_transport` sans devise | Impossible de connaître la marge réelle d'un véhicule — le chiffre qui compte le plus dans ce métier |
| 8 | Recherche injectée telle quelle dans le filtre `.or()` | Une virgule ou une parenthèse dans la recherche casse la requête |
| 9 | Statut modifiable librement (on peut mettre « vendue » sans vente) | Stock faux |
| 10 | Modification d'une vente écrase `montant_recu` sans historique | Pas de trace des encaissements, pas de reçus |
| 11 | Service worker qui ne met rien en cache + icône SVG seule | App non installable sur Android (192/512 PNG requis), inutilisable hors ligne |
| 12 | `maximumScale: 1` | Zoom bloqué : défaut d'accessibilité |
| 13 | 4 bibliothèques d'icônes, emojis partout, dégradés | Un aspect standard, sans identité |

## 2. Principes produit

1. **Le coût de revient en FCFA est le cœur.** Chaque franc dépensé sur un véhicule
   (enchère, frais d'enchère, remorquage, fret, port, convoi, douane, atelier, carte grise)
   est une ligne, dans sa devise, avec le taux du jour. La marge est calculée, jamais saisie.
2. **Le voyage du véhicule est visible.** Un véhicule traverse 10 étapes, de l'enchère
   aux USA jusqu'à la vente à Bamako. L'app montre où il est, depuis combien de jours,
   et ce qu'il a déjà coûté.
3. **Une action principale par écran, atteignable au pouce.** Référence : Wave.
4. **Les chiffres sont lisibles.** Montants groupés (8 500 000), saisie rapide
   (« 8,5M » → 8 500 000), abréviations dans les indicateurs avec la valeur exacte au toucher.
5. **Rien ne se perd.** Numérotation sans trou côté serveur, annulation = avoir,
   journal de qui a fait quoi, documents figés à l'émission.
6. **Fonctionne avec un réseau faible.** Données consultables hors ligne,
   un seul aller-retour réseau par écran.
7. **Le vendeur ne voit pas les coûts** (paramétrable), comme chez les éditeurs VO
   européens (AutoCerfa : « masquage prix/marge pour les employés »).

## 3. Rôles

| Rôle | Peut |
|---|---|
| `proprietaire` | Tout, y compris l'équipe, les paramètres et la suppression |
| `gerant` | Tout sauf gérer l'équipe et supprimer l'organisation |
| `vendeur` | Voir le parc **sans coûts ni marges** (si `masquer_couts_vendeurs`), clients, proformas, ventes, encaissements. **Jamais** la trésorerie, la rentabilité ni la liste des dépenses, même coûts visibles (décision du 28/09/2026) |
| `comptable` | Lecture complète, frais, encaissements, trésorerie, rapports ; pas de modification des véhicules |
| `lecture` | Lecture seule (coûts visibles), pas d'équipe |

`vendeur_voit_plancher` (booléen) : le vendeur voit-il le prix plancher ?

## 4. Le véhicule a deux dimensions : où il est, et à qui il est

Au Mali, on vend couramment un véhicule **encore en mer** (« vente sur arrivage », avec acompte).
Un pipeline unique « … → en mer → … → vendu » l'interdirait. On sépare donc :

### 4.1 Étape logistique (`etape`) — où est le véhicule

| Code | Libellé | Signification |
|---|---|---|
| `achete` | Acheté | Enchère gagnée / achat conclu |
| `transport_usa` | Vers le port | Remorquage vers le port de départ |
| `en_mer` | En mer | Embarqué (conteneur ou RoRo) |
| `au_port` | Au port | Arrivé au port de destination (Cotonou, Dakar, Lomé, Abidjan…) |
| `convoi` | Convoi | En route vers Bamako |
| `douane` | Douane | Dédouanement en cours |
| `atelier` | Atelier | Préparation, réparation, carte grise |
| `parc` | Au parc | Au parc de Bamako, prêt à être livré |

### 4.2 Statut commercial (`statut_commercial`) — à qui il est

| Code | Libellé | Comment on y arrive |
|---|---|---|
| `disponible` | Disponible | Par défaut ; après annulation d'une vente ou levée d'une réservation |
| `reserve` | Réservé | Proforma acceptée ou réservation manuelle (client + date limite facultative) |
| `vendu` | Vendu | **Uniquement** par la création d'une vente ; on n'en sort que par l'annulation |

Une vente porte `date_livraison` : vide tant que le véhicule n'a pas été remis au client.
« En vente » dans l'interface = `parc` + `disponible`.

Règles :
- Toute transition d'étape est historisée (`vehicule_etapes`) avec date, note, auteur.
- On peut sauter des étapes (achat local : directement `parc`) et revenir en arrière (correction).
- Une vente est possible à n'importe quelle étape ; si l'étape n'est pas `parc`, la facture porte
  la mention « livraison à l'arrivée du véhicule ».
- Alertes : `au_port` depuis plus de `alerte_port_jours` (magasinage), `parc` + `disponible` depuis
  plus de `alerte_stock_jours` (stock dormant), réservation échue, vendu non livré depuis plus de 7 jours.

## 5. Modèle de données (Postgres / Supabase)

Toutes les tables métier portent `org_id` (multi-entreprise). Montants en `numeric(16,2)`,
montants FCFA arrondis à l'unité. Horodatages en `timestamptz`.

- **organisations** : id, nom, pays (`ML`), devise (`XOF`), plan (`essai`/`standard`/`pro`), essai_fin, created_at
- **membres** : org_id, user_id, role, nom_affiche, telephone, actif, created_at — PK (org_id, user_id)
- **invitations** : id, org_id, code (8 caractères, unique), role, expire_le, utilisee_par, utilisee_le, created_by
- **parametres** (1 ligne par org) :
  - identité : nom_commercial, raison_sociale, slogan, adresse, ville, pays, telephones text[], whatsapp, email, site_web, nif, rccm, compte_bancaire, logo_path, cachet_path, signature_path
  - facturation : format_numero (`{PREFIXE}-{AAAA}-{NUM}`), padding (4), remise_annuelle, prefixe_facture (`FAC`), prefixe_proforma (`PRO`), prefixe_recu (`REC`), prefixe_avoir (`AV`), prefixe_vehicule (`V`), tva_active (false), tva_taux (18), mention_tva, conditions_vente, pied_document, validite_proforma_jours (15), montant_en_lettres (true), qr_verification (true), couleur_documents, garantie_texte, modele_message_whatsapp
  - devises : taux_usd, taux_eur (655.957, parité fixe), taux_maj_le
  - ventes et alertes : modes_paiement text[], commission_vendeur_pct, alerte_stock_jours (60), alerte_port_jours (10), masquer_couts_vendeurs (true), vendeur_voit_plancher (false)
  - préférences : unite_compteur (`km`/`mi` — les compteurs US sont en miles), bareme_douane jsonb (estimation seulement, voir §8)
- **referentiels** : id, org_id, type (`port_depart`, `port_arrivee`, `transitaire`, `compagnie`, `fournisseur`, `categorie_frais`), libelle, actif, ordre, meta jsonb
- **vehicules** : id, org_id, reference (`V-0042`, séquentielle), vin (17 car., unique par org si renseigné), marque, modele, finition, annee, couleur, carburant, transmission, kilometrage_km, moteur,
  source (`copart`, `iaai`, `manheim`, `concession`, `particulier`, `autre`), lot_numero, date_achat, lieu_achat, titre (`clean`, `salvage`, `rebuilt`, `autre`), dommage_principal, cles (bool), demarre (bool),
  etape, etape_depuis, statut_commercial, reserve_client_id, reserve_jusqu_au, expedition_id, prix_achat, devise_achat, taux_achat, prix_affiche_xof, prix_plancher_xof,
  immatriculation, carte_grise (`a_faire`, `en_cours`, `obtenue`), photo_principale_path, notes, archive, created_by, created_at, updated_at
- **vehicule_etapes** : id, org_id, vehicule_id, etape, date, note, user_id, created_at
- **vehicule_photos** : id, org_id, vehicule_id, path, ordre, created_at
- **documents** : id, org_id, vehicule_id?, vente_id?, expedition_id?, type (`bl`, `titre`, `facture_achat`, `declaration_douane`, `carte_grise`, `autre`), nom, path, taille, created_at
- **expeditions** : id, org_id, reference, mode (`conteneur`, `roro`), numero_conteneur, numero_bl, compagnie, navire, port_depart, port_arrivee, date_depart, date_arrivee_prevue, date_arrivee_reelle, statut (`preparation`, `en_mer`, `arrivee`, `cloturee`), notes
- **frais** (toute sortie d'argent) : id, org_id, portee (`vehicule`, `expedition`, `generale`), vehicule_id?, expedition_id?, categorie, libelle, montant, devise (`XOF`, `USD`, `EUR`), taux, montant_xof (calculé : arrondi(montant × taux)), repartition (`egale`, `valeur` — pour la portée expédition), fournisseur, date, statut (`paye`, `a_payer`), compte_id?, piece_path, created_by, created_at
- **clients** : id, org_id, nom, telephone, whatsapp, email, ville, adresse, type_piece (`NINA`, `CNI`, `passeport`, `autre`), numero_piece, notes, created_at
- **demandes** (ce que cherche un client) : id, org_id, client_id, marque, modele, annee_min, annee_max, budget_max_xof, notes, statut (`ouverte`, `satisfaite`, `abandonnee`), created_at
- **proformas** : id, org_id, numero, vehicule_id, client_id, prix_xof, remise_xof, valide_jusqu_au, statut (`emise`, `acceptee`, `expiree`, `convertie`, `annulee`), vente_id?, snapshot jsonb, created_by, created_at
- **ventes** : id, org_id, numero, vehicule_id, client_id, vendeur_id, date_vente, date_livraison, prix_xof, remise_xof, tva_taux, montant_ht, montant_tva, montant_ttc, mode (`comptant`, `echelonne`), statut (`active`, `annulee`), annulee_le, annulee_par, motif_annulation, numero_avoir, token_verification, snapshot jsonb (entreprise, client, véhicule figés à l'émission), notes, created_at
- **echeances** : id, org_id, vente_id, date_echeance, montant_xof
- **paiements** (encaissements, montant négatif = remboursement) : id, org_id, vente_id, numero_recu, date, montant_xof, mode (`especes`, `orange_money`, `moov_money`, `wave`, `virement`, `cheque`, `autre`), reference, compte_id, notes, annule, created_by, created_at
- **comptes** (trésorerie) : id, org_id, nom, type (`caisse`, `mobile_money`, `banque`), solde_initial, actif, ordre
- **transferts** : id, org_id, compte_source, compte_dest, montant_xof, date, note, created_by
- **compteurs** : org_id, type (`facture`, `recu`, `proforma`, `avoir`, `vehicule`), annee, dernier — PK (org_id, type, annee)
- **journal** : id, org_id, user_id, action, entite, entite_id, details jsonb, created_at

### Calculs

- `achat_xof = arrondi(prix_achat × taux_achat)`
- Part d'un frais d'expédition pour un véhicule : `egale` → montant_xof / nb véhicules de l'expédition ;
  `valeur` → au prorata de `achat_xof`. **Somme des parts = montant exact** (le reste d'arrondi va au dernier véhicule).
  **Part figée à la vente** (décision du 28/09/2026) : à la création d'une vente, la part de chaque frais d'expédition
  portée par le véhicule est figée. Le reste du frais est réparti entre les véhicules **non vendus** du conteneur, y compris
  ceux ajoutés plus tard ; un frais saisi après la vente ne touche que les non vendus. Annuler la vente libère ses parts.
  Corriger le montant ou la répartition d'un frais recalcule tout, parts figées comprises ; le supprimer supprime ses parts.
  Si tous les véhicules du conteneur sont vendus, un nouveau frais est réparti entre tous, vendus compris, et ces parts
  sont figées aussitôt (migration 0006).
- Frais payé sans compte précisé : imputé au compte par défaut (caisse, sinon premier compte actif), comme un encaissement.
- Trésorerie : l'achat du véhicule (`prix_achat`) **n'est pas** un mouvement de compte (décision du 28/09/2026). Il est affiché à part (« Achats de véhicules ») et n'entre pas dans les sorties.
- `prix_revient_xof = achat_xof + Σ frais directs + Σ parts d'expédition`
- `marge_xof = prix_vente_ttc − montant_tva − prix_revient_xof` (ou prix affiché si pas vendu : marge prévisionnelle)
- Statut de paiement d'une vente : `encaisse = Σ paiements non annulés` ; `non_paye` si 0, `paye` si ≥ montant_ttc, sinon `partiel`
- Échéance en retard : l'imputation des paiements se fait dans l'ordre chronologique des échéances

## 6. API (fonctions Postgres appelées en RPC)

**Aucun accès direct aux tables** depuis le navigateur : les droits sur les tables sont retirés
à `anon` et `authenticated`, la RLS est activée sans politique (refus par défaut), et chaque
fonction `security definer` vérifie elle-même l'appartenance et le rôle. La même SQL tourne
en production (Supabase) et en démo (PGlite dans le navigateur), et elle est testée en Node
avec PGlite.

Toutes les fonctions prennent `p_org uuid` en premier paramètre (sauf mention) et renvoient du `jsonb`.

- Organisation : `mes_organisations()`, `organisation_creer(p_nom, p_ville, p_taux_usd)`, `invitation_creer(p_org, p_role)`, `invitation_accepter(p_code)`, `membres_lister`, `membre_modifier(p_org, p_user, p_role, p_actif)`
- Paramètres : `parametres_obtenir`, `parametres_enregistrer(p_org, p_patch jsonb)`, `referentiels_lister(p_org, p_type)`, `referentiel_enregistrer`, `referentiel_supprimer`, `comptes_lister`, `compte_enregistrer`
- Véhicules : `vehicules_lister(p_org, p_filtres jsonb)`, `vehicule_obtenir(p_org, p_id)`, `vehicule_enregistrer(p_org, p_data jsonb)`, `vehicule_changer_etape(p_org, p_id, p_etape, p_date, p_note)`, `vehicules_changer_etape_lot(p_org, p_ids uuid[], p_etape, p_date)`, `vehicule_reserver(p_org, p_id, p_client_id, p_jusqu_au)`, `vehicule_liberer`, `vente_livrer(p_org, p_vente_id, p_date)`, `vehicule_archiver`, `vehicule_photo_ajouter/supprimer/ordonner`, `document_ajouter/supprimer`
- Frais : `frais_lister(p_org, p_filtres)`, `frais_enregistrer`, `frais_supprimer`
- Expéditions : `expeditions_lister`, `expedition_obtenir`, `expedition_enregistrer`, `expedition_affecter(p_org, p_id, p_vehicule_ids uuid[])`, `expedition_changer_statut` (propage l'étape aux véhicules : `en_mer`, `au_port`)
- Clients : `clients_lister(p_org, p_recherche)`, `client_obtenir`, `client_enregistrer`, `demande_enregistrer`, `demandes_correspondances(p_org)` (demandes ouvertes × véhicules non vendus qui correspondent)
- Ventes : `proforma_creer`, `proforma_convertir`, `vente_creer(p_org, p_data)` (atomique), `vente_obtenir`, `ventes_lister`, `vente_annuler(p_org, p_id, p_motif)`, `paiement_ajouter`, `paiement_annuler`
- Pilotage : `tableau_de_bord(p_org)` (indicateurs, actions à faire, séries 12 mois), `rapport_marges(p_org, p_du, p_au)`, `tresorerie(p_org, p_du, p_au)`, `recherche(p_org, p_q)`, `journal_lister`
- Public (rôle `anon`) : `verifier_document(p_token)` → nom de l'entreprise, numéro, date, montant, statut. Rien d'autre.

Numérotation : `prochain_numero(org, type)` interne, par `insert … on conflict do update … returning`,
dans la même transaction que le document : si la vente échoue, le numéro n'est pas consommé.

## 7. Écrans (routes, export statique)

URL à paramètres (`?id=`) pour que tout le site soit statique et entièrement consultable hors ligne.

- `/connexion`, `/inscription`, `/bienvenue` (création de l'entreprise en 3 étapes), `/rejoindre?code=`
- `/accueil` — **Aujourd'hui** : actions à faire, indicateurs, capital immobilisé par étape, ventes du mois
- `/parc` — liste par étapes (onglets sur mobile, tableau Kanban sur ordinateur) ; `/parc/vehicule?id=` ; `/parc/nouveau` ; `/parc/modifier?id=`
- `/expeditions`, `/expeditions/fiche?id=`
- `/ventes` (ventes, proformas, encaissements), `/ventes/fiche?id=`, `/ventes/nouvelle?vehicule=`
- `/clients`, `/clients/fiche?id=`
- `/finances` — trésorerie par compte, dépenses, créances (qui doit quoi, depuis quand), rapports de marge
- `/outils/simulateur` — **enchère maximale** : à partir du prix de vente visé à Bamako et de la marge voulue, l'enchère maximale à ne pas dépasser (frais d'enchère, remorquage, fret, port, convoi, douane estimés depuis les paramètres)
- `/parametres` et ses sections : entreprise, documents & facturation, devises, frais & douane, logistique, ventes & alertes, équipe, préférences, données, journal
- `/verifier?t=` — page publique de vérification d'une facture (QR code imprimé)
- `/hors-ligne`

## 8. Ce que l'app ne prétend pas savoir

Les taux de douane publiés en ligne pour le Mali sont tous donnés comme approximatifs
(« 20 % + prélèvement CEDEAO », TVA 18 % sur CAF + droits). Le barème de dédouanement est donc
**un paramètre modifiable**, utilisé uniquement pour l'estimation du simulateur. Le coût réel
est le montant payé au transitaire, saisi comme un frais. Les valeurs par défaut sont
affichées avec la mention « à confirmer avec votre transitaire ».

## 9. Sources de la recherche

Voir `docs/RECHERCHE.md`.
