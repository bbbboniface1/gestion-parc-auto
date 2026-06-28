-- ============================================================
-- Schéma Supabase — Gestion Parc Automobile Mali
-- Exécuter dans l'éditeur SQL de Supabase
-- ============================================================

-- Table voitures
create table if not exists voitures (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),

  marque text not null,
  modele text not null,
  annee integer not null,
  couleur text,
  numero_chassis text unique,
  kilometrage integer,
  carburant text check (carburant in ('Essence', 'Diesel', 'Hybride', 'Électrique')),
  transmission text check (transmission in ('Automatique', 'Manuelle')),
  photo_url text,

  statut text not null default 'commande' check (statut in (
    'commande', 'en_transit', 'arrivee', 'en_stock', 'vendue'
  )),

  prix_achat_usd numeric(12,2),
  frais_transport numeric(12,2),
  prix_vente_fcfa numeric(14,2),
  prix_vente_usd numeric(12,2),

  paiement_fournisseur text not null default 'non_paye' check (
    paiement_fournisseur in ('non_paye', 'partiel', 'paye')
  ),
  montant_paye_fournisseur numeric(12,2) default 0,
  date_paiement_fournisseur date,

  date_commande date,
  date_expedition date,
  date_arrivee_prevue date,
  date_arrivee_reelle date,
  numero_conteneur text,
  port_depart text default 'USA',
  notes text
);

-- Table ventes
create table if not exists ventes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  voiture_id uuid references voitures(id) not null,

  client_nom text not null,
  client_telephone text,
  client_adresse text,

  prix_vente_fcfa numeric(14,2) not null,
  montant_recu_fcfa numeric(14,2) not null default 0,
  mode_paiement text check (mode_paiement in ('Espèces', 'Virement', 'Orange Money', 'Wave', 'Chèque')),
  statut_paiement text not null default 'non_paye' check (
    statut_paiement in ('non_paye', 'partiel', 'paye')
  ),

  date_vente date default current_date,
  numero_facture text unique,
  notes text,
  status text not null default 'active' check (status in ('active', 'annulee')),
  cancelled_at timestamptz,
  cancelled_by text,
  cancel_reason text,
  cancelled_from_module text
);

-- Table paiements_vente
create table if not exists paiements_vente (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  vente_id uuid references ventes(id) not null,
  montant_fcfa numeric(14,2) not null,
  mode_paiement text,
  date_paiement date default current_date,
  notes text
);

-- Table parametres
create table if not exists parametres (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  nom_entreprise text default 'Auto Mali Import',
  adresse text default 'Bamako, Mali',
  telephone text default '+223 XX XX XX XX',
  email text,
  logo_url text,
  taux_change_usd_fcfa numeric(10,2) default 600
);

-- Insérer les paramètres par défaut
insert into parametres (nom_entreprise, adresse, telephone)
select 'Auto Mali Import', 'Bamako, Mali', '+223 XX XX XX XX'
where not exists (select 1 from parametres limit 1);

-- Vue dashboard
create or replace view dashboard_stats as
select
  count(*) filter (where statut = 'commande') as total_commandes,
  count(*) filter (where statut = 'en_transit') as total_en_transit,
  count(*) filter (where statut = 'arrivee') as total_arrivees,
  count(*) filter (where statut = 'en_stock') as total_en_stock,
  count(*) filter (where statut = 'vendue') as total_vendues,
  count(*) as total_parc,
  sum(
    case
      when paiement_fournisseur = 'paye' then prix_achat_usd
      when paiement_fournisseur = 'partiel' then coalesce(montant_paye_fournisseur, 0)
      else 0
    end
  ) as montant_paye_usa,
  sum(
    case
      when paiement_fournisseur = 'paye' then 0
      when paiement_fournisseur = 'partiel' then prix_achat_usd - coalesce(montant_paye_fournisseur, 0)
      else prix_achat_usd
    end
  ) as montant_du_usa,
  sum(prix_achat_usd) as montant_total_usa,
  sum(v2.montant_recu_fcfa) filter (where coalesce(v2.status, 'active') = 'active') as total_encaisse_fcfa,
  sum(greatest(v2.prix_vente_fcfa - v2.montant_recu_fcfa, 0)) filter (where coalesce(v2.status, 'active') = 'active') as total_restant_fcfa
from voitures v
left join ventes v2 on v.id = v2.voiture_id;

-- Fonction d'annulation atomique
create or replace function annuler_vente(
  p_vente_id uuid,
  p_cancel_reason text default null,
  p_cancelled_from_module text default 'factures',
  p_cancelled_by text default null
) returns void
language plpgsql
security definer
as $$
declare
  v_voiture_id uuid;
begin
  select voiture_id into v_voiture_id
  from ventes
  where id = p_vente_id and status = 'active';

  if v_voiture_id is null then
    raise exception 'Vente introuvable ou déjà annulée';
  end if;

  update ventes
  set
    status = 'annulee',
    cancelled_at = now(),
    cancelled_by = p_cancelled_by,
    cancel_reason = p_cancel_reason,
    cancelled_from_module = p_cancelled_from_module
  where id = p_vente_id;

  update voitures
  set statut = 'en_stock'
  where id = v_voiture_id;
end;
$$;

-- RLS
alter table voitures enable row level security;
alter table ventes enable row level security;
alter table paiements_vente enable row level security;
alter table parametres enable row level security;

create policy "Accès authentifié uniquement" on voitures
  for all using (auth.role() = 'authenticated');

create policy "Accès authentifié uniquement" on ventes
  for all using (auth.role() = 'authenticated');

create policy "Accès authentifié uniquement" on paiements_vente
  for all using (auth.role() = 'authenticated');

create policy "Accès authentifié uniquement" on parametres
  for all using (auth.role() = 'authenticated');

-- Storage bucket pour les photos
insert into storage.buckets (id, name, public)
values ('voitures-photos', 'voitures-photos', true)
on conflict (id) do nothing;

create policy "Photos publiques en lecture" on storage.objects
  for select using (bucket_id = 'voitures-photos');

create policy "Upload photos authentifié" on storage.objects
  for insert with check (bucket_id = 'voitures-photos' and auth.role() = 'authenticated');

create policy "Suppression photos authentifié" on storage.objects
  for delete using (bucket_id = 'voitures-photos' and auth.role() = 'authenticated');
