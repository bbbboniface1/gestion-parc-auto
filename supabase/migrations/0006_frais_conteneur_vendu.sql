-- =============================================================================
-- 0006 — Frais saisi sur un conteneur dont tous les véhicules sont vendus
--
-- Règle 0005 : un frais d'expédition est réparti entre les véhicules non vendus du
-- conteneur. Quand ils sont tous vendus, le frais n'allait sur personne et n'entrait
-- dans aucun coût de revient.
-- Désormais (décision du 28/09/2026) : dans ce cas, le frais est réparti entre tous
-- les véhicules du conteneur, vendus compris, et ces parts sont aussitôt figées
-- (un véhicule ajouté plus tard ne les reprend pas). La marge des ventes concernées
-- baisse d'autant. Les règles de 0005 (correction, suppression, annulation de vente)
-- s'appliquent ensuite normalement.
-- =============================================================================

create or replace function prive.frais_repartir_si_tous_vendus()
returns trigger
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_vehicules uuid[];
begin
  if new.portee <> 'expedition' or new.expedition_id is null then
    return null;
  end if;
  if tg_op = 'UPDATE'
     and new.expedition_id is not distinct from old.expedition_id
     and new.portee is not distinct from old.portee then
    return null;
  end if;
  if exists (select 1 from public.frais_parts_figees fp where fp.frais_id = new.id) then
    return null;
  end if;

  select array_agg(v.id) into v_vehicules
    from public.vehicules v
   where v.org_id = new.org_id and v.expedition_id = new.expedition_id;
  if v_vehicules is null then
    return null;
  end if;
  if exists (select 1 from public.vehicules v
              where v.id = any (v_vehicules)
                and not exists (select 1 from public.ventes ve where ve.vehicule_id = v.id and ve.statut = 'active')) then
    return null;
  end if;

  insert into public.frais_parts_figees (org_id, frais_id, vehicule_id, vente_id, part_xof)
  select new.org_id, new.id, r.vehicule_id, ve.id, r.part_xof
    from prive.repartir(new.montant_xof, new.repartition, v_vehicules) r
    join public.ventes ve on ve.vehicule_id = r.vehicule_id and ve.statut = 'active';
  return null;
end
$$;

-- Nom choisi pour passer après frais_recalculer_parts (ordre alphabétique des déclencheurs) :
-- quand un frais change de conteneur, ses anciennes parts figées sont d'abord supprimées.
create trigger frais_repartir_si_tous_vendus
  after insert or update on public.frais
  for each row execute function prive.frais_repartir_si_tous_vendus();

revoke all on all functions in schema prive from public, anon, authenticated;
grant execute on function prive.stockage_peut_lire(text) to authenticated;
grant execute on function prive.stockage_peut_ecrire(text) to authenticated;
