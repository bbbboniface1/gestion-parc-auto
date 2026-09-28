-- =============================================================================
-- 0007 — Stockage : droits d'écriture alignés sur l'API, dossier par dossier
--
-- 0004 laissait tout membre sauf « lecture » ajouter, remplacer ou supprimer
-- n'importe quel fichier de son entreprise. Un vendeur pouvait ainsi supprimer le
-- logo, le cachet ou les photos, que l'API lui interdit de modifier.
-- Désormais l'écriture suit les mêmes rôles que les fonctions de l'API :
--   {org}/entreprise/...                 logo, cachet, signature   parametres_enregistrer : propriétaire, gérant
--   {org}/vehicules/{id}/documents/...   BL, titre, douane…        document_ajouter : propriétaire, gérant, comptable
--   {org}/vehicules/{id}/...             photos                    vehicule_photo_ajouter : propriétaire, gérant
--   tout autre dossier                                              propriétaire, gérant, comptable
-- La lecture ne change pas : tout membre actif de l'entreprise.
-- =============================================================================

create or replace function prive.stockage_peut_ecrire_chemin(p_nom text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_dossiers text[] := storage.foldername(p_nom);
  v_role     text;
begin
  if v_dossiers[1] is null
     or v_dossiers[1] !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    return false;
  end if;
  v_role := prive.role_dans(v_dossiers[1]::uuid);
  if v_role is null then
    return false;
  end if;
  if v_dossiers[2] = 'entreprise' then
    return v_role in ('proprietaire', 'gerant');
  elsif v_dossiers[2] = 'vehicules' and v_dossiers[4] = 'documents' then
    return v_role in ('proprietaire', 'gerant', 'comptable');
  elsif v_dossiers[2] = 'vehicules' then
    return v_role in ('proprietaire', 'gerant');
  end if;
  return v_role in ('proprietaire', 'gerant', 'comptable');
end
$$;

revoke all on function prive.stockage_peut_ecrire_chemin(text) from public, anon;
grant execute on function prive.stockage_peut_ecrire_chemin(text) to authenticated;

drop policy if exists "parc_auto_ajout" on storage.objects;
drop policy if exists "parc_auto_modification" on storage.objects;
drop policy if exists "parc_auto_suppression" on storage.objects;

create policy "parc_auto_ajout" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'parc-auto' and prive.stockage_peut_ecrire_chemin(name));

create policy "parc_auto_modification" on storage.objects
  for update to authenticated
  using (bucket_id = 'parc-auto' and prive.stockage_peut_ecrire_chemin(name))
  with check (bucket_id = 'parc-auto' and prive.stockage_peut_ecrire_chemin(name));

create policy "parc_auto_suppression" on storage.objects
  for delete to authenticated
  using (bucket_id = 'parc-auto' and prive.stockage_peut_ecrire_chemin(name));
