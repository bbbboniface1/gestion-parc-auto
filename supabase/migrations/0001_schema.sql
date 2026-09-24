-- =============================================================================
-- 0001 — Schéma de données « Parc Auto » (Postgres 15 et plus)
--
-- Toutes les tables métier portent org_id (multi-entreprise).
-- AUCUNE table n'est accessible directement depuis le navigateur :
--   * la RLS est activée sur chaque table SANS aucune politique (refus par défaut) ;
--   * tous les droits sont retirés aux rôles anon et authenticated.
-- L'accès passe exclusivement par les fonctions de l'API (0003_api.sql),
-- en « security definer », qui contrôlent l'appartenance et le rôle.
--
-- Les relations internes utilisent des clés étrangères composites (org_id, id) :
-- une ligne ne peut jamais pointer vers une ligne d'une autre entreprise.
-- Montants : numeric(16,2) ; montants en FCFA arrondis à l'unité.
-- created_at vaut clock_timestamp() (et non now()) : plusieurs lignes écrites
-- dans une même transaction (vente + reçu + journal) gardent leur ordre.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Organisations et équipe
-- -----------------------------------------------------------------------------
create table public.organisations (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null check (length(btrim(nom)) between 1 and 120),
  pays        text not null default 'ML',
  devise      text not null default 'XOF',
  plan        text not null default 'essai' check (plan in ('essai', 'standard', 'pro')),
  essai_fin   date,
  created_at  timestamptz not null default clock_timestamp()
);

create table public.membres (
  org_id       uuid not null references public.organisations (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         text not null check (role in ('proprietaire', 'gerant', 'vendeur', 'comptable', 'lecture')),
  nom_affiche  text,
  telephone    text,
  actif        boolean not null default true,
  created_at   timestamptz not null default clock_timestamp(),
  primary key (org_id, user_id)
);
create index membres_user_idx on public.membres (user_id);

create table public.invitations (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organisations (id) on delete cascade,
  code          text not null unique check (code ~ '^[A-Z0-9]{8}$'),
  role          text not null check (role in ('gerant', 'vendeur', 'comptable', 'lecture')),
  expire_le     timestamptz not null,
  utilisee_par  uuid references auth.users (id) on delete set null,
  utilisee_le   timestamptz,
  created_by    uuid,
  created_at    timestamptz not null default clock_timestamp()
);
create index invitations_org_idx on public.invitations (org_id);

-- -----------------------------------------------------------------------------
-- Paramètres (une ligne par organisation)
-- -----------------------------------------------------------------------------
create table public.parametres (
  org_id                   uuid primary key references public.organisations (id) on delete cascade,
  -- identité
  nom_commercial           text not null check (length(btrim(nom_commercial)) between 1 and 120),
  raison_sociale           text,
  slogan                   text,
  adresse                  text,
  ville                    text,
  pays                     text not null default 'Mali',
  telephones               text[] not null default '{}',
  whatsapp                 text,
  email                    text,
  site_web                 text,
  nif                      text,
  rccm                     text,
  compte_bancaire          text,
  logo_path                text,
  cachet_path              text,
  signature_path           text,
  -- facturation
  format_numero            text not null default '{PREFIXE}-{AAAA}-{NUM}'
                             check (position('{NUM}' in format_numero) > 0 and length(format_numero) <= 60),
  padding                  smallint not null default 4 check (padding between 1 and 8),
  remise_annuelle          boolean not null default true,
  prefixe_facture          text not null default 'FAC' check (prefixe_facture ~ '^[A-Za-z0-9]{1,8}$'),
  prefixe_proforma         text not null default 'PRO' check (prefixe_proforma ~ '^[A-Za-z0-9]{1,8}$'),
  prefixe_recu             text not null default 'REC' check (prefixe_recu ~ '^[A-Za-z0-9]{1,8}$'),
  prefixe_avoir            text not null default 'AV'  check (prefixe_avoir ~ '^[A-Za-z0-9]{1,8}$'),
  prefixe_vehicule         text not null default 'V'   check (prefixe_vehicule ~ '^[A-Za-z0-9]{1,8}$'),
  prefixe_expedition       text not null default 'EXP' check (prefixe_expedition ~ '^[A-Za-z0-9]{1,8}$'),
  tva_active               boolean not null default false,
  tva_taux                 numeric(5,2) not null default 18 check (tva_taux >= 0 and tva_taux < 100),
  mention_tva              text,
  conditions_vente         text,
  pied_document            text,
  validite_proforma_jours  smallint not null default 15 check (validite_proforma_jours between 1 and 365),
  montant_en_lettres       boolean not null default true,
  qr_verification          boolean not null default true,
  couleur_documents        text not null default '#B5461E' check (couleur_documents ~ '^#[0-9A-Fa-f]{6}$'),
  garantie_texte           text,
  modele_message_whatsapp  text,
  -- devises
  taux_usd                 numeric(16,6) not null default 570 check (taux_usd > 0),
  taux_eur                 numeric(16,6) not null default 655.957 check (taux_eur > 0),
  taux_maj_le              timestamptz not null default now(),
  -- ventes et alertes
  modes_paiement           text[] not null
                             default array['especes', 'orange_money', 'moov_money', 'wave', 'virement', 'cheque']
                             check (modes_paiement <@ array['especes', 'orange_money', 'moov_money', 'wave', 'virement', 'cheque', 'autre']),
  commission_vendeur_pct   numeric(5,2) not null default 0 check (commission_vendeur_pct between 0 and 100),
  alerte_stock_jours       smallint not null default 60 check (alerte_stock_jours between 1 and 3650),
  alerte_port_jours        smallint not null default 10 check (alerte_port_jours between 1 and 3650),
  masquer_couts_vendeurs   boolean not null default true,
  vendeur_voit_plancher    boolean not null default false,
  -- préférences
  unite_compteur           text not null default 'km' check (unite_compteur in ('km', 'mi')),
  bareme_douane            jsonb not null default jsonb_build_object(
                             'mention', 'Estimation indicative, à confirmer avec votre transitaire',
                             'base', 'caf',
                             'droit_douane_pct', 20,
                             'redevance_statistique_pct', 1,
                             'prelevement_communautaire_pct', 1.5,
                             'tva_pct', 18,
                             'frais_fixes_xof', 150000
                           ) check (jsonb_typeof(bareme_douane) = 'object'),
  updated_at               timestamptz not null default now()
);

create table public.referentiels (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organisations (id) on delete cascade,
  type        text not null check (type in ('port_depart', 'port_arrivee', 'transitaire', 'compagnie', 'fournisseur', 'categorie_frais')),
  libelle     text not null check (length(btrim(libelle)) between 1 and 120),
  actif       boolean not null default true,
  ordre       integer not null default 0,
  meta        jsonb not null default '{}'::jsonb check (jsonb_typeof(meta) = 'object'),
  created_at  timestamptz not null default clock_timestamp(),
  unique (org_id, type, libelle)
);

-- -----------------------------------------------------------------------------
-- Trésorerie : comptes
-- -----------------------------------------------------------------------------
create table public.comptes (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organisations (id) on delete cascade,
  nom            text not null check (length(btrim(nom)) between 1 and 80),
  type           text not null check (type in ('caisse', 'mobile_money', 'banque')),
  solde_initial  numeric(16,2) not null default 0 check (solde_initial = round(solde_initial)),
  actif          boolean not null default true,
  ordre          integer not null default 0,
  created_at     timestamptz not null default clock_timestamp(),
  unique (org_id, id),
  unique (org_id, nom)
);

-- -----------------------------------------------------------------------------
-- Clients et demandes
-- -----------------------------------------------------------------------------
create table public.clients (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organisations (id) on delete cascade,
  nom           text not null check (length(btrim(nom)) between 1 and 160),
  telephone     text,
  whatsapp      text,
  email         text,
  ville         text,
  adresse       text,
  type_piece    text check (type_piece in ('NINA', 'CNI', 'passeport', 'autre')),
  numero_piece  text,
  notes         text,
  created_by    uuid,
  created_at    timestamptz not null default clock_timestamp(),
  updated_at    timestamptz not null default now(),
  unique (org_id, id)
);
create index clients_org_nom_idx on public.clients (org_id, nom);

create table public.demandes (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organisations (id) on delete cascade,
  client_id       uuid not null,
  marque          text,
  modele          text,
  annee_min       smallint check (annee_min between 1950 and 2100),
  annee_max       smallint check (annee_max between 1950 and 2100),
  budget_max_xof  numeric(16,2) check (budget_max_xof >= 0 and budget_max_xof = round(budget_max_xof)),
  notes           text,
  statut          text not null default 'ouverte' check (statut in ('ouverte', 'satisfaite', 'abandonnee')),
  created_by      uuid,
  created_at      timestamptz not null default clock_timestamp(),
  updated_at      timestamptz not null default now(),
  check (annee_min is null or annee_max is null or annee_min <= annee_max),
  foreign key (org_id, client_id) references public.clients (org_id, id) on delete cascade
);
create index demandes_org_idx on public.demandes (org_id, statut);
create index demandes_client_idx on public.demandes (client_id);

-- -----------------------------------------------------------------------------
-- Logistique : expéditions et véhicules
-- -----------------------------------------------------------------------------
create table public.expeditions (
  id                   uuid primary key default gen_random_uuid(),
  org_id               uuid not null references public.organisations (id) on delete cascade,
  reference            text not null check (length(btrim(reference)) between 1 and 40),
  mode                 text not null default 'conteneur' check (mode in ('conteneur', 'roro')),
  numero_conteneur     text,
  numero_bl            text,
  compagnie            text,
  navire               text,
  port_depart          text,
  port_arrivee         text,
  date_depart          date,
  date_arrivee_prevue  date,
  date_arrivee_reelle  date,
  statut               text not null default 'preparation' check (statut in ('preparation', 'en_mer', 'arrivee', 'cloturee')),
  notes                text,
  created_by           uuid,
  created_at           timestamptz not null default clock_timestamp(),
  updated_at           timestamptz not null default now(),
  unique (org_id, id),
  unique (org_id, reference)
);
create index expeditions_org_statut_idx on public.expeditions (org_id, statut);

create table public.vehicules (
  id                     uuid primary key default gen_random_uuid(),
  org_id                 uuid not null references public.organisations (id) on delete cascade,
  reference              text not null,
  vin                    text check (vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  marque                 text not null check (length(btrim(marque)) between 1 and 60),
  modele                 text not null check (length(btrim(modele)) between 1 and 80),
  finition               text,
  annee                  smallint check (annee between 1950 and 2100),
  couleur                text,
  carburant              text check (carburant in ('essence', 'diesel', 'hybride', 'electrique', 'gpl', 'autre')),
  transmission           text check (transmission in ('automatique', 'manuelle')),
  kilometrage_km         integer check (kilometrage_km >= 0),
  moteur                 text,
  source                 text not null default 'autre'
                           check (source in ('copart', 'iaai', 'manheim', 'concession', 'particulier', 'autre')),
  lot_numero             text,
  date_achat             date,
  lieu_achat             text,
  titre                  text check (titre in ('clean', 'salvage', 'rebuilt', 'autre')),
  dommage_principal      text,
  cles                   boolean,
  demarre                boolean,
  etape                  text not null default 'achete'
                           check (etape in ('achete', 'transport_usa', 'en_mer', 'au_port', 'convoi', 'douane', 'atelier', 'parc')),
  etape_depuis           date not null default current_date,
  statut_commercial      text not null default 'disponible' check (statut_commercial in ('disponible', 'reserve', 'vendu')),
  reserve_client_id      uuid,
  reserve_jusqu_au       date,
  expedition_id          uuid,
  prix_achat             numeric(16,2) not null default 0 check (prix_achat >= 0),
  devise_achat           text not null default 'USD' check (devise_achat in ('XOF', 'USD', 'EUR')),
  taux_achat             numeric(16,6) not null default 1 check (taux_achat > 0),
  achat_xof              numeric(16,2) generated always as (round(prix_achat * taux_achat, 0)) stored,
  prix_affiche_xof       numeric(16,2) check (prix_affiche_xof >= 0 and prix_affiche_xof = round(prix_affiche_xof)),
  prix_plancher_xof      numeric(16,2) check (prix_plancher_xof >= 0 and prix_plancher_xof = round(prix_plancher_xof)),
  immatriculation        text,
  carte_grise            text not null default 'a_faire' check (carte_grise in ('a_faire', 'en_cours', 'obtenue')),
  photo_principale_path  text,
  notes                  text,
  archive                boolean not null default false,
  created_by             uuid,
  created_at             timestamptz not null default clock_timestamp(),
  updated_at             timestamptz not null default now(),
  unique (org_id, id),
  unique (org_id, reference),
  check (devise_achat <> 'XOF' or taux_achat = 1),
  check (statut_commercial = 'reserve' or (reserve_client_id is null and reserve_jusqu_au is null)),
  check (statut_commercial <> 'reserve' or reserve_client_id is not null),
  foreign key (org_id, reserve_client_id) references public.clients (org_id, id),
  foreign key (org_id, expedition_id) references public.expeditions (org_id, id)
);
create unique index vehicules_vin_uidx on public.vehicules (org_id, vin) where vin is not null;
create index vehicules_org_etape_idx on public.vehicules (org_id, etape) where not archive;
create index vehicules_org_statut_idx on public.vehicules (org_id, statut_commercial);
create index vehicules_expedition_idx on public.vehicules (expedition_id) where expedition_id is not null;
create index vehicules_reserve_client_idx on public.vehicules (reserve_client_id) where reserve_client_id is not null;

create table public.vehicule_etapes (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organisations (id) on delete cascade,
  vehicule_id  uuid not null,
  etape        text not null check (etape in ('achete', 'transport_usa', 'en_mer', 'au_port', 'convoi', 'douane', 'atelier', 'parc')),
  date         date not null,
  note         text,
  user_id      uuid,
  created_at   timestamptz not null default clock_timestamp(),
  foreign key (org_id, vehicule_id) references public.vehicules (org_id, id) on delete cascade
);
create index vehicule_etapes_vehicule_idx on public.vehicule_etapes (vehicule_id, date);

create table public.vehicule_photos (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organisations (id) on delete cascade,
  vehicule_id  uuid not null,
  path         text not null,
  ordre        integer not null default 0,
  created_at   timestamptz not null default clock_timestamp(),
  foreign key (org_id, vehicule_id) references public.vehicules (org_id, id) on delete cascade
);
create index vehicule_photos_vehicule_idx on public.vehicule_photos (vehicule_id, ordre);

-- -----------------------------------------------------------------------------
-- Ventes, échéances, encaissements, proformas
-- -----------------------------------------------------------------------------
create table public.ventes (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references public.organisations (id) on delete cascade,
  numero              text not null,
  vehicule_id         uuid not null,
  client_id           uuid not null,
  vendeur_id          uuid,
  date_vente          date not null default current_date,
  date_livraison      date,
  prix_xof            numeric(16,2) not null check (prix_xof > 0 and prix_xof = round(prix_xof)),
  remise_xof          numeric(16,2) not null default 0 check (remise_xof >= 0 and remise_xof = round(remise_xof)),
  tva_taux            numeric(5,2) not null default 0 check (tva_taux >= 0 and tva_taux < 100),
  montant_ht          numeric(16,2) not null,
  montant_tva         numeric(16,2) not null default 0,
  montant_ttc         numeric(16,2) not null check (montant_ttc > 0),
  mode                text not null default 'comptant' check (mode in ('comptant', 'echelonne')),
  statut              text not null default 'active' check (statut in ('active', 'annulee')),
  annulee_le          timestamptz,
  annulee_par         uuid,
  motif_annulation    text,
  numero_avoir        text,
  token_verification  text not null unique check (length(token_verification) >= 32),
  snapshot            jsonb not null default '{}'::jsonb,
  notes               text,
  created_by          uuid,
  created_at          timestamptz not null default clock_timestamp(),
  unique (org_id, id),
  unique (org_id, numero),
  check (remise_xof < prix_xof),
  check (montant_ttc = prix_xof - remise_xof),
  check (montant_ht + montant_tva = montant_ttc),
  check (date_livraison is null or date_livraison >= date_vente),
  check ((statut = 'annulee') = (numero_avoir is not null)),
  foreign key (org_id, vehicule_id) references public.vehicules (org_id, id),
  foreign key (org_id, client_id) references public.clients (org_id, id)
);
-- Un véhicule n'a jamais deux ventes actives.
create unique index ventes_vehicule_active_uidx on public.ventes (vehicule_id) where statut = 'active';
create unique index ventes_numero_avoir_uidx on public.ventes (org_id, numero_avoir) where numero_avoir is not null;
create index ventes_org_date_idx on public.ventes (org_id, date_vente);
create index ventes_client_idx on public.ventes (client_id);

create table public.echeances (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organisations (id) on delete cascade,
  vente_id       uuid not null,
  date_echeance  date not null,
  montant_xof    numeric(16,2) not null check (montant_xof > 0 and montant_xof = round(montant_xof)),
  created_at     timestamptz not null default clock_timestamp(),
  foreign key (org_id, vente_id) references public.ventes (org_id, id) on delete cascade
);
create index echeances_vente_idx on public.echeances (vente_id, date_echeance);

create table public.paiements (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references public.organisations (id) on delete cascade,
  vente_id          uuid not null,
  numero_recu       text not null,
  date              date not null default current_date,
  montant_xof       numeric(16,2) not null check (montant_xof <> 0 and montant_xof = round(montant_xof)),
  mode              text not null check (mode in ('especes', 'orange_money', 'moov_money', 'wave', 'virement', 'cheque', 'autre')),
  reference         text,
  compte_id         uuid,
  notes             text,
  annule            boolean not null default false,
  annule_le         timestamptz,
  annule_par        uuid,
  motif_annulation  text,
  created_by        uuid,
  created_at        timestamptz not null default clock_timestamp(),
  unique (org_id, numero_recu),
  foreign key (org_id, vente_id) references public.ventes (org_id, id),
  foreign key (org_id, compte_id) references public.comptes (org_id, id)
);
create index paiements_vente_idx on public.paiements (vente_id);
create index paiements_org_date_idx on public.paiements (org_id, date);

create table public.proformas (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organisations (id) on delete cascade,
  numero          text not null,
  vehicule_id     uuid not null,
  client_id       uuid not null,
  prix_xof        numeric(16,2) not null check (prix_xof > 0 and prix_xof = round(prix_xof)),
  remise_xof      numeric(16,2) not null default 0 check (remise_xof >= 0 and remise_xof = round(remise_xof)),
  tva_taux        numeric(5,2) not null default 0,
  montant_ht      numeric(16,2) not null,
  montant_tva     numeric(16,2) not null default 0,
  montant_ttc     numeric(16,2) not null check (montant_ttc > 0),
  date            date not null default current_date,
  valide_jusqu_au date not null,
  statut          text not null default 'emise' check (statut in ('emise', 'acceptee', 'expiree', 'convertie', 'annulee')),
  vente_id        uuid,
  snapshot        jsonb not null default '{}'::jsonb,
  notes           text,
  created_by      uuid,
  created_at      timestamptz not null default clock_timestamp(),
  updated_at      timestamptz not null default now(),
  unique (org_id, numero),
  check (remise_xof < prix_xof),
  check (montant_ttc = prix_xof - remise_xof),
  check ((statut = 'convertie') = (vente_id is not null)),
  foreign key (org_id, vehicule_id) references public.vehicules (org_id, id),
  foreign key (org_id, client_id) references public.clients (org_id, id),
  foreign key (org_id, vente_id) references public.ventes (org_id, id)
);
create index proformas_org_idx on public.proformas (org_id, statut);
create index proformas_vehicule_idx on public.proformas (vehicule_id);

-- -----------------------------------------------------------------------------
-- Frais (toute sortie d'argent) et documents
-- -----------------------------------------------------------------------------
create table public.frais (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organisations (id) on delete cascade,
  portee         text not null check (portee in ('vehicule', 'expedition', 'generale')),
  vehicule_id    uuid,
  expedition_id  uuid,
  categorie      text not null check (length(btrim(categorie)) between 1 and 60),
  libelle        text,
  montant        numeric(16,2) not null check (montant > 0),
  devise         text not null default 'XOF' check (devise in ('XOF', 'USD', 'EUR')),
  taux           numeric(16,6) not null default 1 check (taux > 0),
  montant_xof    numeric(16,2) generated always as (round(montant * taux, 0)) stored,
  repartition    text check (repartition in ('egale', 'valeur')),
  fournisseur    text,
  date           date not null default current_date,
  statut         text not null default 'paye' check (statut in ('paye', 'a_payer')),
  compte_id      uuid,
  piece_path     text,
  created_by     uuid,
  created_at     timestamptz not null default clock_timestamp(),
  updated_at     timestamptz not null default now(),
  check (devise <> 'XOF' or taux = 1),
  check (
       (portee = 'vehicule'   and vehicule_id is not null and expedition_id is null and repartition is null)
    or (portee = 'expedition' and expedition_id is not null and vehicule_id is null and repartition is not null)
    or (portee = 'generale'   and vehicule_id is null and expedition_id is null and repartition is null)
  ),
  foreign key (org_id, vehicule_id) references public.vehicules (org_id, id),
  foreign key (org_id, expedition_id) references public.expeditions (org_id, id),
  foreign key (org_id, compte_id) references public.comptes (org_id, id)
);
create index frais_vehicule_idx on public.frais (vehicule_id) where vehicule_id is not null;
create index frais_expedition_idx on public.frais (expedition_id) where expedition_id is not null;
create index frais_org_date_idx on public.frais (org_id, date);
create index frais_org_statut_idx on public.frais (org_id, statut);

create table public.documents (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organisations (id) on delete cascade,
  vehicule_id    uuid,
  vente_id       uuid,
  expedition_id  uuid,
  type           text not null check (type in ('bl', 'titre', 'facture_achat', 'declaration_douane', 'carte_grise', 'autre')),
  nom            text not null check (length(btrim(nom)) between 1 and 200),
  path           text not null,
  taille         bigint check (taille >= 0),
  created_by     uuid,
  created_at     timestamptz not null default clock_timestamp(),
  check (num_nonnulls(vehicule_id, vente_id, expedition_id) <= 1),
  foreign key (org_id, vehicule_id) references public.vehicules (org_id, id),
  foreign key (org_id, vente_id) references public.ventes (org_id, id),
  foreign key (org_id, expedition_id) references public.expeditions (org_id, id)
);
create index documents_vehicule_idx on public.documents (vehicule_id) where vehicule_id is not null;
create index documents_vente_idx on public.documents (vente_id) where vente_id is not null;
create index documents_expedition_idx on public.documents (expedition_id) where expedition_id is not null;

-- -----------------------------------------------------------------------------
-- Trésorerie : transferts entre comptes
-- -----------------------------------------------------------------------------
create table public.transferts (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organisations (id) on delete cascade,
  compte_source uuid not null,
  compte_dest   uuid not null,
  montant_xof   numeric(16,2) not null check (montant_xof > 0 and montant_xof = round(montant_xof)),
  date          date not null default current_date,
  note          text,
  created_by    uuid,
  created_at    timestamptz not null default clock_timestamp(),
  check (compte_source <> compte_dest),
  foreign key (org_id, compte_source) references public.comptes (org_id, id),
  foreign key (org_id, compte_dest) references public.comptes (org_id, id)
);
create index transferts_org_date_idx on public.transferts (org_id, date);

-- -----------------------------------------------------------------------------
-- Numérotation et journal
-- -----------------------------------------------------------------------------
-- annee = 0 pour les séquences sans remise annuelle (véhicules, expéditions,
-- ou documents quand parametres.remise_annuelle est faux).
create table public.compteurs (
  org_id   uuid not null references public.organisations (id) on delete cascade,
  type     text not null check (type in ('facture', 'recu', 'proforma', 'avoir', 'vehicule', 'expedition')),
  annee    integer not null check (annee >= 0),
  dernier  integer not null check (dernier >= 0),
  primary key (org_id, type, annee)
);

create table public.journal (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organisations (id) on delete cascade,
  user_id     uuid,
  action      text not null,
  entite      text,
  entite_id   uuid,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default clock_timestamp()
);
create index journal_org_date_idx on public.journal (org_id, created_at desc);
create index journal_entite_idx on public.journal (org_id, entite, entite_id);

-- -----------------------------------------------------------------------------
-- Verrouillage : RLS sans politique + retrait de tous les droits
-- -----------------------------------------------------------------------------
alter table public.organisations   enable row level security;
alter table public.membres         enable row level security;
alter table public.invitations     enable row level security;
alter table public.parametres      enable row level security;
alter table public.referentiels    enable row level security;
alter table public.comptes         enable row level security;
alter table public.clients         enable row level security;
alter table public.demandes        enable row level security;
alter table public.expeditions     enable row level security;
alter table public.vehicules       enable row level security;
alter table public.vehicule_etapes enable row level security;
alter table public.vehicule_photos enable row level security;
alter table public.ventes          enable row level security;
alter table public.echeances       enable row level security;
alter table public.paiements       enable row level security;
alter table public.proformas       enable row level security;
alter table public.frais           enable row level security;
alter table public.documents       enable row level security;
alter table public.transferts      enable row level security;
alter table public.compteurs       enable row level security;
alter table public.journal         enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Les futures tables créées par le rôle de migration ne seront pas non plus
-- exposées automatiquement (Supabase accorde sinon tout à anon/authenticated).
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
