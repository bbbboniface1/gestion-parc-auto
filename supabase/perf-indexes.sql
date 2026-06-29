-- ============================================================
-- INDEXES DE PERFORMANCE — À exécuter dans l'éditeur SQL Supabase
-- Une seule fois, après avoir créé les tables
-- ============================================================

-- Voitures : filtres fréquents
create index if not exists idx_voitures_statut
  on voitures (statut);

create index if not exists idx_voitures_paiement_fournisseur
  on voitures (paiement_fournisseur);

create index if not exists idx_voitures_created_at
  on voitures (created_at desc);

-- Recherche textuelle sur voitures (marque, modèle, châssis)
create index if not exists idx_voitures_marque_trgm
  on voitures using gin (marque gin_trgm_ops);

create index if not exists idx_voitures_modele_trgm
  on voitures using gin (modele gin_trgm_ops);

create index if not exists idx_voitures_chassis_trgm
  on voitures using gin (numero_chassis gin_trgm_ops);

-- Ventes : filtres fréquents
create index if not exists idx_ventes_status
  on ventes (status);

create index if not exists idx_ventes_statut_paiement
  on ventes (statut_paiement);

create index if not exists idx_ventes_date_vente
  on ventes (date_vente desc);

create index if not exists idx_ventes_voiture_id
  on ventes (voiture_id);

-- Recherche textuelle sur ventes
create index if not exists idx_ventes_client_nom_trgm
  on ventes using gin (client_nom gin_trgm_ops);

create index if not exists idx_ventes_numero_facture_trgm
  on ventes using gin (numero_facture gin_trgm_ops);

create index if not exists idx_ventes_telephone_trgm
  on ventes using gin (client_telephone gin_trgm_ops);

-- Index composite pour les requêtes combinées (status + statut_paiement)
create index if not exists idx_ventes_status_paiement
  on ventes (status, statut_paiement);

-- ============================================================
-- ACTIVER L'EXTENSION pg_trgm (nécessaire pour les index trgm)
-- À exécuter EN PREMIER si pas déjà fait
-- ============================================================
-- create extension if not exists pg_trgm;

-- ============================================================
-- VUE DASHBOARD — Convertir en MATERIALIZED VIEW pour la perf
-- Rafraîchit automatiquement à chaque changement via trigger
-- ============================================================

-- Supprimer l'ancienne vue simple
drop view if exists dashboard_stats;

-- Créer la materialized view
create materialized view if not exists dashboard_stats as
select
  count(*) filter (where statut = 'commande') as total_commandes,
  count(*) filter (where statut = 'en_transit') as total_en_transit,
  count(*) filter (where statut = 'arrivee') as total_arrivees,
  count(*) filter (where statut = 'en_stock') as total_en_stock,
  count(*) filter (where statut = 'vendue') as total_vendues,
  count(*) as total_parc,
  sum(
    case
      when paiement_fournisseur = 'paye' then coalesce(prix_achat_usd, 0)
      when paiement_fournisseur = 'partiel' then coalesce(montant_paye_fournisseur, 0)
      else 0
    end
  ) as montant_paye_usa,
  sum(
    case
      when paiement_fournisseur != 'paye'
        then coalesce(prix_achat_usd, 0) - coalesce(montant_paye_fournisseur, 0)
      else 0
    end
  ) as montant_du_usa,
  sum(coalesce(prix_achat_usd, 0)) as montant_total_usa
from voitures;

-- Ajouter les totaux des ventes dans la même vue
-- Note: Supabase ne supporte pas les UNION dans les MV, on étend via une seule requête
-- On utilise une vue classique qui wrappe la MV + les agrégats ventes
create or replace view dashboard_stats_full as
select
  ds.*,
  coalesce(v.total_encaisse_fcfa, 0) as total_encaisse_fcfa,
  coalesce(v.total_ventes_fcfa - v.total_encaisse_fcfa, 0) as total_restant_fcfa
from dashboard_stats ds
cross join (
  select
    sum(montant_recu_fcfa) as total_encaisse_fcfa,
    sum(prix_vente_fcfa) as total_ventes_fcfa
  from ventes
  where status = 'active'
) v;

-- Trigger pour rafraîchir la MV après chaque modification
create or replace function refresh_dashboard_stats()
returns trigger language plpgsql as $$
begin
  refresh materialized view concurrently dashboard_stats;
  return null;
end;
$$;

-- Triggers sur voitures et ventes
drop trigger if exists trg_refresh_dashboard_voitures on voitures;
create trigger trg_refresh_dashboard_voitures
  after insert or update or delete on voitures
  for each statement execute function refresh_dashboard_stats();

drop trigger if exists trg_refresh_dashboard_ventes on ventes;
create trigger trg_refresh_dashboard_ventes
  after insert or update or delete on ventes
  for each statement execute function refresh_dashboard_stats();

-- Index unique nécessaire pour CONCURRENTLY
create unique index if not exists idx_dashboard_stats_unique
  on dashboard_stats ((1));
