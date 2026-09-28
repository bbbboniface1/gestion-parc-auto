-- =============================================================================
-- 0005 — Frais de conteneur figés à la vente ; compte par défaut des frais payés
--
-- 1. Parts de frais d'expédition figées à la vente
--    Avant : chaque frais d'expédition était réparti à la volée entre les véhicules
--    présents dans le conteneur. Ajouter un véhicule ou un frais changeait le coût de
--    revient, donc la marge, de véhicules déjà vendus.
--    Désormais :
--      * à la création d'une vente, la part de chaque frais d'expédition portée par le
--        véhicule est figée (table frais_parts_figees) ;
--      * le reste du frais (montant − parts figées) est réparti entre les véhicules NON
--        vendus du conteneur, y compris ceux ajoutés plus tard ;
--      * un frais saisi après la vente ne touche que les véhicules non vendus ;
--      * annuler la vente libère les parts figées : le véhicule redevient un véhicule
--        non vendu comme les autres ;
--      * corriger le montant ou le mode de répartition d'un frais recalcule tout, parts
--        figées comprises ; le supprimer supprime ses parts ; le sortir du conteneur
--        (autre expédition, autre portée) supprime ses parts figées.
--    Reprise de l'existant : les ventes actives reçoivent pour parts figées exactement
--    les parts calculées avant cette migration. Aucune marge affichée ne change.
--
-- 2. Compte par défaut des frais payés
--    Un frais « payé » sans compte n'entrait dans aucun solde. Comme pour les
--    encaissements, le compte par défaut est désormais attribué : caisse d'abord, puis
--    premier compte actif (prive.compte_par_defaut). Cela s'applique à la création d'un
--    frais payé et au passage « à payer » → « payé ». Les frais déjà payés sans compte
--    restent tels quels.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Parts figées
-- -----------------------------------------------------------------------------
create table public.frais_parts_figees (
  org_id       uuid not null references public.organisations (id) on delete cascade,
  frais_id     uuid not null references public.frais (id) on delete cascade,
  vehicule_id  uuid not null,
  vente_id     uuid not null,
  part_xof     numeric(16,2) not null check (part_xof = round(part_xof)),
  created_at   timestamptz not null default clock_timestamp(),
  primary key (frais_id, vehicule_id),
  foreign key (org_id, vehicule_id) references public.vehicules (org_id, id) on delete cascade,
  foreign key (org_id, vente_id) references public.ventes (org_id, id) on delete cascade
);
create index frais_parts_figees_vente_idx on public.frais_parts_figees (vente_id);
create index frais_parts_figees_org_idx on public.frais_parts_figees (org_id);

alter table public.frais_parts_figees enable row level security;
revoke all on public.frais_parts_figees from anon, authenticated;

-- Reprise : les ventes actives figent les parts qu'elles portent aujourd'hui
-- (calculées par l'ancienne version de prive.parts_expedition, encore en place ici).
insert into public.frais_parts_figees (org_id, frais_id, vehicule_id, vente_id, part_xof)
select ve.org_id, p.frais_id, ve.vehicule_id, ve.id, p.part_xof
  from public.ventes ve
  cross join lateral prive.parts_expedition(ve.org_id) p
 where ve.statut = 'active'
   and p.vehicule_id = ve.vehicule_id;

-- Nouvelle répartition. p_vente_ignoree : calcule les parts comme si cette vente
-- n'existait pas (sert à figer les parts au moment où la vente est créée).
drop function prive.parts_expedition(uuid);

create function prive.parts_expedition(p_org uuid, p_vente_ignoree uuid default null)
returns table (frais_id uuid, expedition_id uuid, vehicule_id uuid, categorie text, part_xof numeric)
language sql
stable
set search_path = ''
as $$
  with figees as (
    select fp.frais_id, fp.vehicule_id, fp.part_xof
      from public.frais_parts_figees fp
      join public.ventes ve on ve.id = fp.vente_id
     where fp.org_id = p_org
       and ve.statut = 'active'
       and ve.id is distinct from p_vente_ignoree
  ),
  total_fige as (
    select g.frais_id, sum(g.part_xof) as total
      from figees g
     group by g.frais_id
  ),
  base as (
    select f.id as frais_id,
           f.expedition_id,
           f.categorie,
           f.repartition,
           f.montant_xof - coalesce(t.total, 0) as montant_xof,
           v.id as vehicule_id,
           v.achat_xof,
           row_number() over w as rang,
           count(*) over (partition by f.id) as nb,
           sum(v.achat_xof) over (partition by f.id) as total_achat
      from public.frais f
      left join total_fige t on t.frais_id = f.id
      join public.vehicules v on v.org_id = f.org_id and v.expedition_id = f.expedition_id
     where f.org_id = p_org
       and f.portee = 'expedition'
       and not exists (select 1 from public.ventes ve
                        where ve.vehicule_id = v.id and ve.statut = 'active'
                          and ve.id is distinct from p_vente_ignoree)
    window w as (partition by f.id order by v.reference, v.id)
  ),
  brut as (
    select b.*,
           case when b.repartition = 'valeur' and b.total_achat > 0
                then floor(b.montant_xof * b.achat_xof / b.total_achat)
                else floor(b.montant_xof / b.nb)
           end as part_brute
      from base b
  )
  select b.frais_id,
         b.expedition_id,
         b.vehicule_id,
         b.categorie,
         case when b.rang = b.nb
              then b.montant_xof - (sum(b.part_brute) over (partition by b.frais_id) - b.part_brute)
              else b.part_brute
         end as part_xof
    from brut b
  union all
  select g.frais_id, f.expedition_id, g.vehicule_id, f.categorie, g.part_xof
    from figees g
    join public.frais f on f.id = g.frais_id
   where f.portee = 'expedition'
$$;

-- Répartit p_montant entre p_vehicules, avec les mêmes règles que parts_expedition
-- (ordre référence puis id, plancher, reste au dernier).
create or replace function prive.repartir(p_montant numeric, p_repartition text, p_vehicules uuid[])
returns table (vehicule_id uuid, part_xof numeric)
language sql
stable
set search_path = ''
as $$
  with base as (
    select v.id,
           v.achat_xof,
           row_number() over (order by v.reference, v.id) as rang,
           count(*) over () as nb,
           sum(v.achat_xof) over () as total_achat
      from public.vehicules v
     where v.id = any (p_vehicules)
  ),
  brut as (
    select b.*,
           case when p_repartition = 'valeur' and b.total_achat > 0
                then floor(p_montant * b.achat_xof / b.total_achat)
                else floor(p_montant / b.nb)
           end as part_brute
      from base b
  )
  select b.id,
         case when b.rang = b.nb
              then p_montant - (sum(b.part_brute) over () - b.part_brute)
              else b.part_brute
         end
    from brut b
$$;

-- Vente créée : fige ses parts. Vente annulée : les libère.
create or replace function prive.ventes_figer_parts()
returns trigger
language plpgsql
volatile
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.statut = 'active' then
      insert into public.frais_parts_figees (org_id, frais_id, vehicule_id, vente_id, part_xof)
      select new.org_id, p.frais_id, new.vehicule_id, new.id, p.part_xof
        from prive.parts_expedition(new.org_id, new.id) p
       where p.vehicule_id = new.vehicule_id
      on conflict (frais_id, vehicule_id) do nothing;
    end if;
  elsif old.statut = 'active' and new.statut <> 'active' then
    delete from public.frais_parts_figees fp where fp.vente_id = new.id;
  end if;
  return null;
end
$$;

create trigger ventes_figer_parts
  after insert or update of statut on public.ventes
  for each row execute function prive.ventes_figer_parts();

-- Frais corrigé : recalcul complet, parts figées comprises.
create or replace function prive.frais_recalculer_parts()
returns trigger
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_figes        uuid[];
  v_participants uuid[];
begin
  select array_agg(fp.vehicule_id) into v_figes
    from public.frais_parts_figees fp
   where fp.frais_id = new.id;
  if v_figes is null then
    return null;
  end if;

  -- Le frais ne concerne plus ce conteneur : ses parts figées disparaissent.
  if new.portee <> 'expedition' or new.expedition_id is distinct from old.expedition_id then
    delete from public.frais_parts_figees fp where fp.frais_id = new.id;
    return null;
  end if;

  if new.montant_xof is not distinct from old.montant_xof
     and new.repartition is not distinct from old.repartition then
    return null;
  end if;

  select coalesce(array_agg(v.id), '{}') into v_participants
    from public.vehicules v
   where v.org_id = new.org_id
     and v.expedition_id = new.expedition_id
     and not exists (select 1 from public.ventes ve where ve.vehicule_id = v.id and ve.statut = 'active');

  update public.frais_parts_figees fp
     set part_xof = r.part_xof
    from prive.repartir(new.montant_xof, new.repartition, v_participants || v_figes) r
   where fp.frais_id = new.id
     and fp.vehicule_id = r.vehicule_id;
  return null;
end
$$;

create trigger frais_recalculer_parts
  after update on public.frais
  for each row execute function prive.frais_recalculer_parts();

-- -----------------------------------------------------------------------------
-- 2. Compte par défaut des frais payés
-- -----------------------------------------------------------------------------
create or replace function prive.frais_compte_par_defaut()
returns trigger
language plpgsql
volatile
set search_path = ''
as $$
begin
  if new.statut = 'paye' and new.compte_id is null
     and (tg_op = 'INSERT' or old.statut is distinct from 'paye') then
    new.compte_id := prive.compte_par_defaut(new.org_id, 'especes');
  end if;
  return new;
end
$$;

create trigger frais_compte_par_defaut
  before insert or update on public.frais
  for each row execute function prive.frais_compte_par_defaut();

revoke all on all functions in schema prive from public, anon, authenticated;
-- Seules fonctions de prive ouvertes à authenticated (politiques du stockage, 0004).
grant execute on function prive.stockage_peut_lire(text) to authenticated;
grant execute on function prive.stockage_peut_ecrire(text) to authenticated;
