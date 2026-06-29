-- Migration : annulation soft delete des ventes
-- Exécuter dans l'éditeur SQL Supabase (après schema.sql)

alter table ventes
  add column if not exists status text not null default 'active'
    check (status in ('active', 'annulee')),
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by text,
  add column if not exists cancel_reason text,
  add column if not exists cancelled_from_module text;

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
