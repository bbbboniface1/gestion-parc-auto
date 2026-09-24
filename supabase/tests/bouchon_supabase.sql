-- =============================================================================
-- Bouchon Supabase — UNIQUEMENT pour PGlite (tests Node et démo navigateur).
-- NE JAMAIS APPLIQUER EN PRODUCTION : sur Supabase, les rôles anon/authenticated,
-- le schéma auth (auth.users, auth.uid()) et le schéma storage existent déjà.
--
-- Reproduit le strict nécessaire pour que les migrations 0001 à 0004 s'appliquent
-- et se comportent comme sur Supabase :
--   * rôles anon / authenticated (sans connexion) ;
--   * auth.users(id, email) et auth.uid() lisant les « claims » du JWT ;
--   * storage.buckets, storage.objects (RLS activée) et storage.foldername().
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
end
$$;

-- Comme sur Supabase : le schéma public est utilisable par les deux rôles
-- (les droits sur les tables et fonctions sont ensuite retirés par les migrations).
grant usage on schema public to anon, authenticated;

-- -----------------------------------------------------------------------------
-- auth
-- -----------------------------------------------------------------------------
create schema if not exists auth;
grant usage on schema auth to anon, authenticated;

create table if not exists auth.users (
  id    uuid primary key,
  email text
);

-- Même définition que Supabase : sub du JWT, via l'ancien réglage
-- request.jwt.claim.sub ou via request.jwt.claims (JSON).
create or replace function auth.uid()
returns uuid
language sql
stable
set search_path = ''
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid
$$;

grant execute on function auth.uid() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- storage (sous-ensemble du schéma de Supabase Storage)
-- -----------------------------------------------------------------------------
create schema if not exists storage;
grant usage on schema storage to anon, authenticated;

create table if not exists storage.buckets (
  id         text primary key,
  name       text not null unique,
  owner      uuid,
  public     boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists storage.objects (
  id         uuid primary key default gen_random_uuid(),
  bucket_id  text references storage.buckets (id),
  name       text,
  owner      uuid,
  created_at timestamptz not null default now(),
  unique (bucket_id, name)
);

alter table storage.objects enable row level security;
alter table storage.buckets enable row level security;

grant select, insert, update, delete on storage.objects to anon, authenticated;
grant select on storage.buckets to anon, authenticated;

-- Même définition que Supabase : les dossiers d'un chemin, sans le nom de fichier.
create or replace function storage.foldername(name text)
returns text[]
language plpgsql
immutable
as $$
declare
  _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[1:array_length(_parts, 1) - 1];
end
$$;

grant execute on function storage.foldername(text) to anon, authenticated;
