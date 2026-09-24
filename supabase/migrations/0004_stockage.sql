-- =============================================================================
-- 0004 — Stockage des fichiers (Supabase Storage)
--
-- Bucket privé « parc-auto ». Tout fichier est rangé sous le dossier de son
-- entreprise : {org_id}/vehicules/{vehicule_id}/..., {org_id}/documents/...,
-- {org_id}/parametres/logo.png, etc.
--   * lecture : membres actifs de l'entreprise du premier segment du chemin ;
--   * écriture (ajout, remplacement, suppression) : mêmes membres, sauf le
--     rôle « lecture ».
-- Les politiques s'appuient sur deux fonctions « security definer » du schéma
-- prive, seules fonctions de ce schéma accessibles au rôle authenticated.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('parc-auto', 'parc-auto', false)
on conflict (id) do update set public = false;

create or replace function prive.stockage_peut_lire(p_dossier text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_dossier is null or p_dossier !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    return false;
  end if;
  return prive.role_dans(p_dossier::uuid) is not null;
end
$$;

create or replace function prive.stockage_peut_ecrire(p_dossier text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_dossier is null or p_dossier !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    return false;
  end if;
  return coalesce(prive.role_dans(p_dossier::uuid) in ('proprietaire', 'gerant', 'vendeur', 'comptable'), false);
end
$$;

revoke all on function prive.stockage_peut_lire(text) from public, anon;
revoke all on function prive.stockage_peut_ecrire(text) from public, anon;
grant usage on schema prive to authenticated;
grant execute on function prive.stockage_peut_lire(text) to authenticated;
grant execute on function prive.stockage_peut_ecrire(text) to authenticated;

drop policy if exists "parc_auto_lecture" on storage.objects;
drop policy if exists "parc_auto_ajout" on storage.objects;
drop policy if exists "parc_auto_modification" on storage.objects;
drop policy if exists "parc_auto_suppression" on storage.objects;

create policy "parc_auto_lecture" on storage.objects
  for select to authenticated
  using (bucket_id = 'parc-auto' and prive.stockage_peut_lire((storage.foldername(name))[1]));

create policy "parc_auto_ajout" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'parc-auto' and prive.stockage_peut_ecrire((storage.foldername(name))[1]));

create policy "parc_auto_modification" on storage.objects
  for update to authenticated
  using (bucket_id = 'parc-auto' and prive.stockage_peut_ecrire((storage.foldername(name))[1]))
  with check (bucket_id = 'parc-auto' and prive.stockage_peut_ecrire((storage.foldername(name))[1]));

create policy "parc_auto_suppression" on storage.objects
  for delete to authenticated
  using (bucket_id = 'parc-auto' and prive.stockage_peut_ecrire((storage.foldername(name))[1]));
