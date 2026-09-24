-- =============================================================================
-- 0002 — Schéma « prive » : fonctions internes (jamais exposées par l'API)
--
-- Contrôle d'accès, numérotation, journal, conversions JSON avec messages en
-- français, calcul du coût de revient (répartition exacte des frais
-- d'expédition), statut de paiement et imputation des paiements sur les
-- échéances.
--
-- Le schéma n'est pas exposé par PostgREST ; anon/authenticated n'y ont aucun
-- droit (seules deux fonctions de contrôle du stockage leur sont accordées
-- dans 0004_stockage.sql, pour les politiques de storage.objects).
-- =============================================================================

create schema if not exists prive;
revoke all on schema prive from public;
alter default privileges in schema prive revoke execute on functions from public;

-- -----------------------------------------------------------------------------
-- Constantes
-- -----------------------------------------------------------------------------
create or replace function prive.etapes()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['achete', 'transport_usa', 'en_mer', 'au_port', 'convoi', 'douane', 'atelier', 'parc']
$$;

create or replace function prive.rang_etape(p_etape text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select pg_catalog.array_position(prive.etapes(), p_etape)
$$;

create or replace function prive.libelle_role(p_role text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_role
    when 'proprietaire' then 'propriétaire'
    when 'gerant' then 'gérant'
    when 'vendeur' then 'vendeur'
    when 'comptable' then 'comptable'
    when 'lecture' then 'lecture seule'
    else coalesce(p_role, '?')
  end
$$;

-- Montant lisible : 1 500 000 FCFA (espace insécable U+00A0 entre les milliers).
create or replace function prive.fcfa(p_montant numeric)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when p_montant is null then '—'
    else case when p_montant < 0 then '-' else '' end
      || regexp_replace(abs(round(p_montant))::bigint::text, '(\d)(?=(\d{3})+$)', E'\\1\u00a0', 'g')
      || E'\u00a0FCFA'
  end
$$;

create or replace function prive.date_fr(p_date date)
returns text
language sql
immutable
set search_path = ''
as $$
  select to_char(p_date, 'DD/MM/YYYY')
$$;

-- -----------------------------------------------------------------------------
-- Erreurs
-- -----------------------------------------------------------------------------
create or replace function prive.erreur(p_message text, p_code text default 'P0001')
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  raise exception using message = p_message, errcode = p_code;
end
$$;

create or replace function prive.introuvable(p_quoi text)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  raise exception using message = p_quoi || ' introuvable.', errcode = 'P0002';
end
$$;

create or replace function prive.acces_refuse(p_detail text default null)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  raise exception using
    message = 'Accès refusé' || coalesce(' : ' || p_detail, '.'),
    errcode = '42501';
end
$$;

-- -----------------------------------------------------------------------------
-- Lecture typée des données JSON (messages d'erreur en français)
-- -----------------------------------------------------------------------------
create or replace function prive.j_texte(p jsonb, k text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v jsonb := p -> k;
begin
  if v is null or jsonb_typeof(v) = 'null' then
    return null;
  end if;
  if jsonb_typeof(v) in ('object', 'array') then
    perform prive.erreur(format('Champ « %s » : texte attendu.', k), '22023');
  end if;
  return nullif(btrim(v #>> '{}'), '');
end
$$;

create or replace function prive.j_uuid(p jsonb, k text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text := prive.j_texte(p, k);
begin
  if v is null then
    return null;
  end if;
  begin
    return v::uuid;
  exception when others then
    perform prive.erreur(format('Champ « %s » : identifiant invalide.', k), '22023');
  end;
end
$$;

create or replace function prive.j_nombre(p jsonb, k text)
returns numeric
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text := prive.j_texte(p, k);
  n numeric;
begin
  if v is null then
    return null;
  end if;
  begin
    n := v::numeric;
  exception when others then
    perform prive.erreur(format('Champ « %s » : nombre attendu (reçu « %s »).', k, v), '22023');
  end;
  if n in ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric) or abs(n) >= 1e14 then
    perform prive.erreur(format('Champ « %s » : nombre hors limites.', k), '22023');
  end if;
  return n;
end
$$;

create or replace function prive.j_entier(p jsonb, k text)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text := prive.j_texte(p, k);
begin
  if v is null then
    return null;
  end if;
  begin
    return v::integer;
  exception when others then
    perform prive.erreur(format('Champ « %s » : nombre entier attendu (reçu « %s »).', k, v), '22023');
  end;
end
$$;

create or replace function prive.j_date(p jsonb, k text)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text := prive.j_texte(p, k);
  d date;
begin
  if v is null then
    return null;
  end if;
  begin
    d := v::date;
  exception when others then
    perform prive.erreur(format('Champ « %s » : date attendue au format AAAA-MM-JJ (reçu « %s »).', k, v), '22023');
  end;
  if not isfinite(d) or extract(year from d) not between 1900 and 2200 then
    perform prive.erreur(format('Champ « %s » : date hors limites.', k), '22023');
  end if;
  return d;
end
$$;

create or replace function prive.j_booleen(p jsonb, k text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v jsonb := p -> k;
begin
  if v is null or jsonb_typeof(v) = 'null' then
    return null;
  end if;
  if jsonb_typeof(v) = 'boolean' then
    return v::text::boolean;
  end if;
  begin
    return (v #>> '{}')::boolean;
  exception when others then
    perform prive.erreur(format('Champ « %s » : vrai ou faux attendu.', k), '22023');
  end;
end
$$;

create or replace function prive.j_uuids(p jsonb, k text)
returns uuid[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  v jsonb := p -> k;
  r uuid[];
begin
  if v is null or jsonb_typeof(v) = 'null' then
    return null;
  end if;
  if jsonb_typeof(v) <> 'array' then
    perform prive.erreur(format('Champ « %s » : liste d''identifiants attendue.', k), '22023');
  end if;
  begin
    select coalesce(array_agg(e::uuid), '{}') into r from jsonb_array_elements_text(v) e;
  exception when others then
    perform prive.erreur(format('Champ « %s » : liste d''identifiants invalide.', k), '22023');
  end;
  return r;
end
$$;

-- Vérifie une valeur d'énumération ; renvoie la valeur (ou null).
create or replace function prive.valeur_parmi(p_valeur text, p_valeurs text[], p_champ text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_valeur is not null and not (p_valeur = any (p_valeurs)) then
    perform prive.erreur(
      format('Champ « %s » : valeur « %s » invalide (valeurs possibles : %s).', p_champ, p_valeur, array_to_string(p_valeurs, ', ')),
      '22023');
  end if;
  return p_valeur;
end
$$;

-- Valide les types des clés autorisées d'un objet JSON d'après les colonnes
-- de la table cible, et renvoie un objet nettoyé (textes rognés, '' -> null,
-- clés non autorisées retirées), prêt pour jsonb_populate_record.
create or replace function prive.valider_types(p_data jsonb, p_table regclass, p_champs text[])
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_cle   text;
  v_val   jsonb;
  v_type  text;
  v_res   jsonb := '{}'::jsonb;
begin
  if p_data is null or jsonb_typeof(p_data) = 'null' then
    return '{}'::jsonb;
  end if;
  if jsonb_typeof(p_data) <> 'object' then
    perform prive.erreur('Données invalides : un objet JSON est attendu.', '22023');
  end if;

  for v_cle, v_val in select e.key, e.value from jsonb_each(p_data) e loop
    continue when not (v_cle = any (p_champs));

    if jsonb_typeof(v_val) = 'null' then
      v_res := v_res || jsonb_build_object(v_cle, null);
      continue;
    end if;

    select format_type(a.atttypid, null) into v_type
      from pg_catalog.pg_attribute a
     where a.attrelid = p_table and a.attname = v_cle and a.attnum > 0 and not a.attisdropped;

    if v_type is null then
      continue;
    elsif v_type in ('smallint', 'integer', 'bigint') then
      v_res := v_res || jsonb_build_object(v_cle, prive.j_entier(p_data, v_cle));
    elsif v_type = 'numeric' then
      v_res := v_res || jsonb_build_object(v_cle, prive.j_nombre(p_data, v_cle));
    elsif v_type = 'date' then
      v_res := v_res || jsonb_build_object(v_cle, prive.j_date(p_data, v_cle));
    elsif v_type = 'boolean' then
      v_res := v_res || jsonb_build_object(v_cle, prive.j_booleen(p_data, v_cle));
    elsif v_type = 'uuid' then
      v_res := v_res || jsonb_build_object(v_cle, prive.j_uuid(p_data, v_cle));
    elsif v_type = 'jsonb' then
      v_res := v_res || jsonb_build_object(v_cle, v_val);
    elsif v_type = 'text[]' then
      if jsonb_typeof(v_val) <> 'array'
         or exists (select 1 from jsonb_array_elements(v_val) x where jsonb_typeof(x) <> 'string') then
        perform prive.erreur(format('Champ « %s » : liste de textes attendue.', v_cle), '22023');
      end if;
      v_res := v_res || jsonb_build_object(v_cle,
        (select coalesce(jsonb_agg(btrim(x)), '[]'::jsonb) from jsonb_array_elements_text(v_val) x where btrim(x) <> ''));
    else
      v_res := v_res || jsonb_build_object(v_cle, prive.j_texte(p_data, v_cle));
    end if;
  end loop;

  return v_res;
end
$$;

-- Motif ILIKE « contient » avec les caractères spéciaux échappés (\ % _).
create or replace function prive.motif_contient(p_q text)
returns text
language sql
immutable
set search_path = ''
as $$
  select '%' || replace(replace(replace(p_q, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
$$;

-- -----------------------------------------------------------------------------
-- Appartenance et rôles
-- -----------------------------------------------------------------------------
create or replace function prive.role_dans(p_org uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
    from public.membres m
   where m.org_id = p_org
     and m.user_id = auth.uid()
     and m.actif
$$;

-- Lève « Accès refusé » si l'utilisateur n'est pas membre actif de p_org
-- ou si son rôle n'est pas dans p_roles. Renvoie le rôle.
create or replace function prive.exiger_role(p_org uuid, p_roles text[])
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  if auth.uid() is null then
    perform prive.acces_refuse('vous devez être connecté.');
  end if;
  v_role := prive.role_dans(p_org);
  if v_role is null then
    perform prive.acces_refuse('vous n''êtes pas membre actif de cette entreprise.');
  end if;
  if not (v_role = any (p_roles)) then
    perform prive.acces_refuse(format('le rôle « %s » ne permet pas cette action.', prive.libelle_role(v_role)));
  end if;
  return v_role;
end
$$;

-- Le membre voit-il les coûts, marges, frais et totaux de trésorerie ?
create or replace function prive.voit_couts(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case when m.role = 'vendeur' then not p.masquer_couts_vendeurs else true end
      from public.membres m
      join public.parametres p on p.org_id = m.org_id
     where m.org_id = p_org and m.user_id = auth.uid() and m.actif
  ), false)
$$;

-- Le membre voit-il le prix plancher ?
create or replace function prive.voit_plancher(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case when m.role = 'vendeur'
                then p.vendeur_voit_plancher or not p.masquer_couts_vendeurs
                else true end
      from public.membres m
      join public.parametres p on p.org_id = m.org_id
     where m.org_id = p_org and m.user_id = auth.uid() and m.actif
  ), false)
$$;

create or replace function prive.exiger_couts(p_org uuid)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not prive.voit_couts(p_org) then
    perform prive.acces_refuse('les coûts ne sont pas visibles pour votre rôle.');
  end if;
end
$$;

-- Si un identifiant fourni par le client existe déjà dans une AUTRE
-- organisation : « Accès refusé ». Renvoie vrai s'il existe dans p_org.
create or replace function prive.id_existant(p_org uuid, p_org_trouvee uuid)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_org_trouvee is null then
    return false;
  end if;
  if p_org_trouvee <> p_org then
    perform prive.acces_refuse('cet identifiant appartient à une autre entreprise.');
  end if;
  return true;
end
$$;

-- -----------------------------------------------------------------------------
-- Journal
-- -----------------------------------------------------------------------------
create or replace function prive.journaliser(
  p_org uuid,
  p_action text,
  p_entite text,
  p_entite_id uuid,
  p_details jsonb default '{}'::jsonb
)
returns void
language sql
volatile
set search_path = ''
as $$
  insert into public.journal (org_id, user_id, action, entite, entite_id, details)
  values (p_org, auth.uid(), p_action, p_entite, p_entite_id, coalesce(p_details, '{}'::jsonb))
$$;

-- -----------------------------------------------------------------------------
-- Numérotation sans trou
--
-- insert ... on conflict do update ... returning : le compteur est verrouillé
-- jusqu'à la fin de la transaction du document. Si le document échoue, la
-- transaction est annulée et le numéro n'est pas consommé.
-- -----------------------------------------------------------------------------
create or replace function prive.prochain_numero(p_org uuid, p_type text, p_date date default null)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_par      public.parametres%rowtype;
  v_date     date := coalesce(p_date, current_date);
  v_annee    integer;
  v_format   text;
  v_prefixe  text;
  v_num      integer;
  v_num_txt  text;
  v_numero   text;
  v_pris     boolean;
begin
  select * into v_par from public.parametres where org_id = p_org;
  if not found then
    perform prive.introuvable('Paramètres de l''entreprise');
  end if;

  if p_type in ('vehicule', 'expedition') then
    v_annee := 0;
    v_format := '{PREFIXE}-{NUM}';
  elsif p_type in ('facture', 'recu', 'proforma', 'avoir') then
    v_annee := case when v_par.remise_annuelle then extract(year from v_date)::integer else 0 end;
    v_format := v_par.format_numero;
  else
    perform prive.erreur(format('Type de numérotation inconnu : %s.', p_type));
  end if;

  v_prefixe := case p_type
    when 'facture' then v_par.prefixe_facture
    when 'proforma' then v_par.prefixe_proforma
    when 'recu' then v_par.prefixe_recu
    when 'avoir' then v_par.prefixe_avoir
    when 'vehicule' then v_par.prefixe_vehicule
    when 'expedition' then v_par.prefixe_expedition
  end;

  loop
    insert into public.compteurs as c (org_id, type, annee, dernier)
    values (p_org, p_type, v_annee, 1)
    on conflict (org_id, type, annee) do update set dernier = c.dernier + 1
    returning c.dernier into v_num;

    v_num_txt := v_num::text;
    if length(v_num_txt) < v_par.padding then
      v_num_txt := lpad(v_num_txt, v_par.padding, '0');
    end if;

    v_numero := replace(replace(replace(replace(v_format,
                  '{PREFIXE}', v_prefixe),
                  '{AAAA}', to_char(v_date, 'YYYY')),
                  '{AA}', to_char(v_date, 'YY')),
                  '{NUM}', v_num_txt);

    -- Garde-fou : si le format a changé (préfixe, remise annuelle), un numéro
    -- déjà attribué n'est jamais réutilisé.
    v_pris := case p_type
      when 'facture' then exists (select 1 from public.ventes where org_id = p_org and numero = v_numero)
      when 'avoir' then exists (select 1 from public.ventes where org_id = p_org and numero_avoir = v_numero)
      when 'recu' then exists (select 1 from public.paiements where org_id = p_org and numero_recu = v_numero)
      when 'proforma' then exists (select 1 from public.proformas where org_id = p_org and numero = v_numero)
      when 'vehicule' then exists (select 1 from public.vehicules where org_id = p_org and reference = v_numero)
      when 'expedition' then exists (select 1 from public.expeditions where org_id = p_org and reference = v_numero)
    end;
    exit when not v_pris;
  end loop;

  return v_numero;
end
$$;

-- Taux de conversion vers le FCFA pour une devise (paramètres de l'org).
create or replace function prive.taux_devise(p_org uuid, p_devise text)
returns numeric
language sql
stable
set search_path = ''
as $$
  select case p_devise
    when 'XOF' then 1::numeric
    when 'USD' then (select p.taux_usd from public.parametres p where p.org_id = p_org)
    when 'EUR' then (select p.taux_eur from public.parametres p where p.org_id = p_org)
  end
$$;

-- Hors taxe d'un montant TTC (FCFA, arrondi à l'unité).
create or replace function prive.hors_taxe(p_ttc numeric, p_taux numeric)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case when p_ttc is null then null
              when coalesce(p_taux, 0) = 0 then p_ttc
              else round(p_ttc / (1 + p_taux / 100)) end
$$;

-- -----------------------------------------------------------------------------
-- Coût de revient
--
-- achat_xof = arrondi(prix_achat × taux_achat)             (colonne générée)
-- frais directs = Σ frais de portée « vehicule »
-- parts d'expédition : chaque frais de portée « expedition » est réparti entre
--   les véhicules de l'expédition, par ordre stable (référence, id) :
--   egale  -> plancher(montant / n) ;
--   valeur -> plancher(montant × achat_xof / Σ achat_xof)  (egale si Σ = 0) ;
--   le dernier véhicule reçoit le reste : Σ des parts = montant exact.
-- prix_revient_xof = achat_xof + frais directs + parts d'expédition
-- -----------------------------------------------------------------------------
create or replace function prive.parts_expedition(p_org uuid)
returns table (frais_id uuid, expedition_id uuid, vehicule_id uuid, categorie text, part_xof numeric)
language sql
stable
set search_path = ''
as $$
  with base as (
    select f.id as frais_id,
           f.expedition_id,
           f.categorie,
           f.repartition,
           f.montant_xof,
           v.id as vehicule_id,
           v.achat_xof,
           row_number() over w as rang,
           count(*) over (partition by f.id) as nb,
           sum(v.achat_xof) over (partition by f.id) as total_achat
      from public.frais f
      join public.vehicules v on v.org_id = f.org_id and v.expedition_id = f.expedition_id
     where f.org_id = p_org
       and f.portee = 'expedition'
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
$$;

create or replace function prive.couts_vehicules(p_org uuid)
returns table (
  vehicule_id uuid,
  achat_xof numeric,
  frais_directs_xof numeric,
  frais_expedition_xof numeric,
  prix_revient_xof numeric
)
language sql
stable
set search_path = ''
as $$
  select v.id,
         v.achat_xof,
         coalesce(d.total, 0),
         coalesce(e.total, 0),
         v.achat_xof + coalesce(d.total, 0) + coalesce(e.total, 0)
    from public.vehicules v
    left join (
      select f.vehicule_id, sum(f.montant_xof) as total
        from public.frais f
       where f.org_id = p_org and f.portee = 'vehicule'
       group by f.vehicule_id
    ) d on d.vehicule_id = v.id
    left join (
      select p.vehicule_id, sum(p.part_xof) as total
        from prive.parts_expedition(p_org) p
       group by p.vehicule_id
    ) e on e.vehicule_id = v.id
   where v.org_id = p_org
$$;

-- Détail par catégorie pour un véhicule (« achat » + catégories de frais).
create or replace function prive.couts_par_categorie(p_org uuid, p_vehicule uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with lignes as (
    select 'achat'::text as categorie, v.achat_xof as montant, 0 as ordre
      from public.vehicules v
     where v.org_id = p_org and v.id = p_vehicule
    union all
    select f.categorie, f.montant_xof, 1
      from public.frais f
     where f.org_id = p_org and f.portee = 'vehicule' and f.vehicule_id = p_vehicule
    union all
    select p.categorie, p.part_xof, 1
      from prive.parts_expedition(p_org) p
     where p.vehicule_id = p_vehicule
  )
  select coalesce(jsonb_agg(jsonb_build_object('categorie', l.categorie, 'montant_xof', l.montant)
                            order by l.ordre, l.montant desc, l.categorie), '[]'::jsonb)
    from (select categorie, min(ordre) as ordre, sum(montant) as montant from lignes group by categorie) l
$$;

-- -----------------------------------------------------------------------------
-- Paiements : statut et imputation sur les échéances
-- -----------------------------------------------------------------------------
create or replace function prive.statut_paiement(p_encaisse numeric, p_ttc numeric)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when coalesce(p_encaisse, 0) <= 0 then 'non_paye'
              when p_encaisse >= p_ttc then 'paye'
              else 'partiel' end
$$;

-- Imputation dans l'ordre chronologique des échéances (date, id) de
-- l'encaissé net (Σ paiements non annulés, remboursements compris).
create or replace function prive.echeances_imputees(p_org uuid)
returns table (
  echeance_id uuid,
  vente_id uuid,
  date_echeance date,
  montant_xof numeric,
  impute_xof numeric,
  reste_xof numeric,
  en_retard boolean
)
language sql
stable
set search_path = ''
as $$
  with enc as (
    select p.vente_id, sum(p.montant_xof) as encaisse
      from public.paiements p
     where p.org_id = p_org and not p.annule
     group by p.vente_id
  ),
  e as (
    select e.id,
           e.vente_id,
           e.date_echeance,
           e.montant_xof,
           v.statut,
           greatest(coalesce(enc.encaisse, 0), 0) as encaisse,
           sum(e.montant_xof) over (partition by e.vente_id order by e.date_echeance, e.id) - e.montant_xof as cumul_avant
      from public.echeances e
      join public.ventes v on v.id = e.vente_id
      left join enc on enc.vente_id = e.vente_id
     where e.org_id = p_org
  )
  select e.id,
         e.vente_id,
         e.date_echeance,
         e.montant_xof,
         least(e.montant_xof, greatest(e.encaisse - e.cumul_avant, 0)),
         e.montant_xof - least(e.montant_xof, greatest(e.encaisse - e.cumul_avant, 0)),
         e.statut = 'active'
           and e.date_echeance < current_date
           and e.montant_xof - least(e.montant_xof, greatest(e.encaisse - e.cumul_avant, 0)) > 0
    from e
$$;

create or replace function prive.ventes_etat(p_org uuid)
returns table (
  vente_id uuid,
  statut text,
  montant_ttc numeric,
  encaisse_xof numeric,
  reste_xof numeric,
  statut_paiement text,
  retard_xof numeric,
  premiere_echeance_retard date,
  prochaine_echeance date,
  prochaine_echeance_xof numeric
)
language sql
stable
set search_path = ''
as $$
  with enc as (
    select p.vente_id, sum(p.montant_xof) as encaisse
      from public.paiements p
     where p.org_id = p_org and not p.annule
     group by p.vente_id
  ),
  ech as (
    select ei.vente_id,
           sum(ei.reste_xof) filter (where ei.en_retard) as retard,
           min(ei.date_echeance) filter (where ei.en_retard) as premiere_retard,
           min(ei.date_echeance) filter (where ei.reste_xof > 0 and ei.date_echeance >= current_date) as prochaine,
           (array_agg(ei.reste_xof order by ei.date_echeance, ei.echeance_id)
              filter (where ei.reste_xof > 0 and ei.date_echeance >= current_date))[1] as prochaine_montant
      from prive.echeances_imputees(p_org) ei
     group by ei.vente_id
  )
  select v.id,
         v.statut,
         v.montant_ttc,
         coalesce(enc.encaisse, 0),
         case when v.statut = 'active' then greatest(v.montant_ttc - coalesce(enc.encaisse, 0), 0) else 0 end,
         prive.statut_paiement(coalesce(enc.encaisse, 0), v.montant_ttc),
         coalesce(ech.retard, 0),
         ech.premiere_retard,
         ech.prochaine,
         ech.prochaine_montant
    from public.ventes v
    left join enc on enc.vente_id = v.id
    left join ech on ech.vente_id = v.id
   where v.org_id = p_org
$$;

-- -----------------------------------------------------------------------------
-- Représentations JSON
-- -----------------------------------------------------------------------------

-- Véhicules de l'organisation avec coûts, marge, réservation, expédition et
-- vente active (p_id : un seul véhicule). Non masqué : passer par prive.masquer_vehicule().
create or replace function prive.vehicules_vue(p_org uuid, p_id uuid default null)
returns table (
  id uuid,
  etape text,
  statut_commercial text,
  archive boolean,
  expedition_id uuid,
  created_at timestamptz,
  data jsonb
)
language sql
stable
set search_path = ''
as $$
  select v.id, v.etape, v.statut_commercial, v.archive, v.expedition_id, v.created_at,
         (to_jsonb(v) - 'org_id' - 'created_by')
         || jsonb_build_object(
              'libelle', concat_ws(' ', v.marque, v.modele, v.annee),
              'jours_etape', current_date - v.etape_depuis,
              'en_vente', v.etape = 'parc' and v.statut_commercial = 'disponible' and not v.archive,
              'frais_directs_xof', c.frais_directs_xof,
              'frais_expedition_xof', c.frais_expedition_xof,
              'frais_xof', c.frais_directs_xof + c.frais_expedition_xof,
              'prix_revient_xof', c.prix_revient_xof,
              'marge_xof', case
                  when ve.id is not null then ve.montant_ht - c.prix_revient_xof
                  when v.prix_affiche_xof is not null
                    then prive.hors_taxe(v.prix_affiche_xof, case when par.tva_active then par.tva_taux else 0 end) - c.prix_revient_xof
                end,
              'marge_type', case when ve.id is not null then 'reelle'
                                 when v.prix_affiche_xof is not null then 'previsionnelle' end,
              'reserve_client_nom', rc.nom,
              'reservation_echue', v.statut_commercial = 'reserve' and v.reserve_jusqu_au < current_date,
              'expedition', case when e.id is null then null else jsonb_build_object(
                  'id', e.id, 'reference', e.reference, 'mode', e.mode, 'statut', e.statut,
                  'numero_conteneur', e.numero_conteneur, 'compagnie', e.compagnie, 'navire', e.navire,
                  'port_depart', e.port_depart, 'port_arrivee', e.port_arrivee,
                  'date_depart', e.date_depart, 'date_arrivee_prevue', e.date_arrivee_prevue,
                  'date_arrivee_reelle', e.date_arrivee_reelle) end,
              'vente', case when ve.id is null then null else jsonb_build_object(
                  'id', ve.id, 'numero', ve.numero, 'client_id', ve.client_id, 'client_nom', vc.nom,
                  'date_vente', ve.date_vente, 'date_livraison', ve.date_livraison,
                  'montant_ttc', ve.montant_ttc, 'livree', ve.date_livraison is not null) end
            ) as data
    from public.vehicules v
    join public.parametres par on par.org_id = v.org_id
    join prive.couts_vehicules(p_org) c on c.vehicule_id = v.id
    left join public.clients rc on rc.id = v.reserve_client_id
    left join public.expeditions e on e.id = v.expedition_id
    left join public.ventes ve on ve.vehicule_id = v.id and ve.statut = 'active'
    left join public.clients vc on vc.id = ve.client_id
   where v.org_id = p_org and (p_id is null or v.id = p_id)
$$;

-- Masque coûts / marges / frais / plancher selon les droits du membre.
create or replace function prive.masquer_vehicule(p_data jsonb, p_couts boolean, p_plancher boolean)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select p_data
    || case when p_couts then '{}'::jsonb else jsonb_build_object(
         'prix_achat', null, 'devise_achat', null, 'taux_achat', null, 'achat_xof', null,
         'frais_directs_xof', null, 'frais_expedition_xof', null, 'frais_xof', null,
         'prix_revient_xof', null, 'marge_xof', null, 'marge_type', null) end
    || case when p_plancher then '{}'::jsonb else jsonb_build_object('prix_plancher_xof', null) end
$$;

create or replace function prive.client_json(p_client public.clients)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select to_jsonb(p_client) - 'org_id' - 'created_by'
$$;

create or replace function prive.frais_json(p_org uuid, p_frais public.frais)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select (to_jsonb(p_frais) - 'org_id' - 'created_by')
    || jsonb_build_object(
         'vehicule_reference', (select v.reference from public.vehicules v where v.id = p_frais.vehicule_id),
         'vehicule_libelle', (select concat_ws(' ', v.marque, v.modele, v.annee) from public.vehicules v where v.id = p_frais.vehicule_id),
         'expedition_reference', (select e.reference from public.expeditions e where e.id = p_frais.expedition_id),
         'compte_nom', (select c.nom from public.comptes c where c.id = p_frais.compte_id))
$$;

create or replace function prive.paiement_json(p_paiement public.paiements)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select (to_jsonb(p_paiement) - 'org_id' - 'created_by')
    || jsonb_build_object(
         'compte_nom', (select c.nom from public.comptes c where c.id = p_paiement.compte_id),
         'vente_numero', (select v.numero from public.ventes v where v.id = p_paiement.vente_id),
         'client_nom', (select cl.nom from public.ventes v join public.clients cl on cl.id = v.client_id
                         where v.id = p_paiement.vente_id),
         'type', case when p_paiement.montant_xof < 0 then 'remboursement' else 'encaissement' end)
$$;

create or replace function prive.proforma_json(p_proforma public.proformas)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select (to_jsonb(p_proforma) - 'org_id' - 'created_by')
    || jsonb_build_object(
         'statut_effectif', case when p_proforma.statut in ('emise', 'acceptee') and p_proforma.valide_jusqu_au < current_date
                                 then 'expiree' else p_proforma.statut end,
         'client_nom', (select c.nom from public.clients c where c.id = p_proforma.client_id),
         'client_telephone', (select c.telephone from public.clients c where c.id = p_proforma.client_id),
         'vehicule_reference', (select v.reference from public.vehicules v where v.id = p_proforma.vehicule_id),
         'vehicule_libelle', (select concat_ws(' ', v.marque, v.modele, v.annee) from public.vehicules v where v.id = p_proforma.vehicule_id),
         'vehicule_etape', (select v.etape from public.vehicules v where v.id = p_proforma.vehicule_id),
         'vente_numero', (select ve.numero from public.ventes ve where ve.id = p_proforma.vente_id))
$$;

-- Photographie figée d'un document (entreprise, client, véhicule).
create or replace function prive.snapshot_document(p_org uuid, p_client uuid, p_vehicule uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'entreprise', (
      select jsonb_build_object(
        'nom_commercial', p.nom_commercial, 'raison_sociale', p.raison_sociale, 'slogan', p.slogan,
        'adresse', p.adresse, 'ville', p.ville, 'pays', p.pays, 'telephones', to_jsonb(p.telephones),
        'whatsapp', p.whatsapp, 'email', p.email, 'site_web', p.site_web, 'nif', p.nif, 'rccm', p.rccm,
        'compte_bancaire', p.compte_bancaire, 'logo_path', p.logo_path, 'cachet_path', p.cachet_path,
        'signature_path', p.signature_path, 'couleur_documents', p.couleur_documents,
        'mention_tva', p.mention_tva, 'conditions_vente', p.conditions_vente,
        'pied_document', p.pied_document, 'garantie_texte', p.garantie_texte,
        'montant_en_lettres', p.montant_en_lettres, 'qr_verification', p.qr_verification,
        'tva_active', p.tva_active, 'unite_compteur', p.unite_compteur)
        from public.parametres p where p.org_id = p_org),
    'client', (
      select jsonb_build_object(
        'nom', c.nom, 'telephone', c.telephone, 'whatsapp', c.whatsapp, 'email', c.email,
        'ville', c.ville, 'adresse', c.adresse, 'type_piece', c.type_piece, 'numero_piece', c.numero_piece)
        from public.clients c where c.id = p_client and c.org_id = p_org),
    'vehicule', (
      select jsonb_build_object(
        'reference', v.reference, 'marque', v.marque, 'modele', v.modele, 'finition', v.finition,
        'annee', v.annee, 'couleur', v.couleur, 'vin', v.vin, 'kilometrage_km', v.kilometrage_km,
        'carburant', v.carburant, 'transmission', v.transmission, 'moteur', v.moteur,
        'immatriculation', v.immatriculation, 'lot_numero', v.lot_numero, 'etape', v.etape,
        'titre', v.titre)
        from public.vehicules v where v.id = p_vehicule and v.org_id = p_org),
    'mention_livraison', (
      select case when v.etape <> 'parc' then 'Livraison à l''arrivée du véhicule' end
        from public.vehicules v where v.id = p_vehicule and v.org_id = p_org)
  )
$$;

-- Compte par défaut pour un mode de paiement : nom évocateur, puis type, puis
-- premier compte actif.
create or replace function prive.compte_par_defaut(p_org uuid, p_mode text)
returns uuid
language sql
stable
set search_path = ''
as $$
  select c.id
    from public.comptes c
   where c.org_id = p_org and c.actif
   order by
     case when p_mode = 'orange_money' and c.nom ilike '%orange%' then 0
          when p_mode = 'moov_money' and c.nom ilike '%moov%' then 0
          when p_mode = 'wave' and c.nom ilike '%wave%' then 0
          else 1 end,
     case when c.type = case
                          when p_mode = 'especes' then 'caisse'
                          when p_mode in ('orange_money', 'moov_money', 'wave') then 'mobile_money'
                          when p_mode in ('virement', 'cheque') then 'banque'
                        end
          then 0 else 1 end,
     c.ordre, c.nom
   limit 1
$$;

-- Insère un paiement (numéro de reçu dans la transaction). Les contrôles de
-- montant par rapport à la vente sont faits par l'appelant.
create or replace function prive.paiement_inserer(
  p_org uuid,
  p_vente uuid,
  p_montant numeric,
  p_date date,
  p_mode text,
  p_reference text,
  p_compte uuid,
  p_notes text,
  p_id uuid default null
)
returns public.paiements
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_mode   text := coalesce(p_mode, 'especes');
  v_compte uuid := p_compte;
  v_date   date := coalesce(p_date, current_date);
  v_p      public.paiements;
begin
  perform prive.valeur_parmi(v_mode, array['especes', 'orange_money', 'moov_money', 'wave', 'virement', 'cheque', 'autre'], 'mode');
  if p_montant is null or p_montant = 0 then
    perform prive.erreur('Le montant du paiement doit être différent de zéro.', '22023');
  end if;
  if p_montant <> round(p_montant) then
    perform prive.erreur('Les montants en FCFA sont arrondis à l''unité.', '22023');
  end if;
  if v_date > current_date then
    perform prive.erreur('La date du paiement ne peut pas être dans le futur.', '22023');
  end if;
  if v_compte is not null then
    if not exists (select 1 from public.comptes c where c.id = v_compte and c.org_id = p_org) then
      perform prive.introuvable('Compte');
    end if;
  else
    v_compte := prive.compte_par_defaut(p_org, v_mode);
  end if;

  insert into public.paiements (id, org_id, vente_id, numero_recu, date, montant_xof, mode, reference, compte_id, notes, created_by)
  values (coalesce(p_id, gen_random_uuid()), p_org, p_vente, prive.prochain_numero(p_org, 'recu', v_date),
          v_date, p_montant, v_mode, p_reference, v_compte, p_notes, auth.uid())
  returning * into v_p;
  return v_p;
end
$$;

-- Clé de contrôle d'un VIN nord-américain (9e caractère). Informatif : les
-- VIN hors Amérique du Nord n'utilisent pas toujours cette clé.
create or replace function prive.vin_cle_valide(p_vin text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_poids   constant integer[] := array[8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  v_somme   integer := 0;
  v_c       text;
  v_val     integer;
  v_reste   integer;
begin
  if p_vin is null or p_vin !~ '^[A-HJ-NPR-Z0-9]{17}$' then
    return false;
  end if;
  for i in 1..17 loop
    v_c := substr(p_vin, i, 1);
    if v_c ~ '[0-9]' then
      v_val := v_c::integer;
    else
      -- Translittération : A=1 … H=8, J=1 … R=9 (P=7), S=2 … Z=9
      if v_c between 'A' and 'H' then v_val := ascii(v_c) - ascii('A') + 1;
      elsif v_c between 'J' and 'R' then v_val := ascii(v_c) - ascii('J') + 1;
      else v_val := ascii(v_c) - ascii('S') + 2;
      end if;
    end if;
    v_somme := v_somme + v_val * v_poids[i];
  end loop;
  v_reste := v_somme % 11;
  return substr(p_vin, 9, 1) = case when v_reste = 10 then 'X' else v_reste::text end;
end
$$;

-- -----------------------------------------------------------------------------
-- Trésorerie : mouvements (encaissements, remboursements, dépenses payées,
-- transferts) et soldes des comptes
-- -----------------------------------------------------------------------------
create or replace function prive.mouvements_tresorerie(p_org uuid)
returns table (
  date date,
  type text,
  libelle text,
  montant_xof numeric,
  compte_id uuid,
  entite text,
  entite_id uuid,
  created_at timestamptz
)
language sql
stable
set search_path = ''
as $$
  select p.date,
         case when p.montant_xof > 0 then 'encaissement' else 'remboursement' end,
         concat_ws(' — ', 'Reçu ' || p.numero_recu, v.numero, c.nom),
         p.montant_xof,
         p.compte_id,
         'vente',
         p.vente_id,
         p.created_at
    from public.paiements p
    join public.ventes v on v.id = p.vente_id
    join public.clients c on c.id = v.client_id
   where p.org_id = p_org and not p.annule
  union all
  select f.date,
         'depense',
         concat_ws(' — ', coalesce(f.libelle, f.categorie), veh.reference, e.reference, f.fournisseur),
         -f.montant_xof,
         f.compte_id,
         'frais',
         f.id,
         f.created_at
    from public.frais f
    left join public.vehicules veh on veh.id = f.vehicule_id
    left join public.expeditions e on e.id = f.expedition_id
   where f.org_id = p_org and f.statut = 'paye'
  union all
  select t.date, 'transfert_sortant', 'Transfert vers ' || cd.nom, -t.montant_xof, t.compte_source, 'transfert', t.id, t.created_at
    from public.transferts t
    join public.comptes cd on cd.id = t.compte_dest
   where t.org_id = p_org
  union all
  select t.date, 'transfert_entrant', 'Transfert depuis ' || cs.nom, t.montant_xof, t.compte_dest, 'transfert', t.id, t.created_at
    from public.transferts t
    join public.comptes cs on cs.id = t.compte_source
   where t.org_id = p_org
$$;

create or replace function prive.soldes_comptes(p_org uuid)
returns table (compte_id uuid, entrees_xof numeric, sorties_xof numeric, solde_xof numeric)
language sql
stable
set search_path = ''
as $$
  select c.id,
         coalesce(sum(m.montant_xof) filter (where m.montant_xof > 0), 0),
         coalesce(-sum(m.montant_xof) filter (where m.montant_xof < 0), 0),
         c.solde_initial + coalesce(sum(m.montant_xof), 0)
    from public.comptes c
    left join prive.mouvements_tresorerie(p_org) m on m.compte_id = c.id
   where c.org_id = p_org
   group by c.id, c.solde_initial
$$;

-- -----------------------------------------------------------------------------
-- Demandes clients × véhicules non vendus (ni archivés, ni réservés pour un
-- autre client) qui correspondent : marque identique, modèle contenu,
-- année dans l'intervalle, prix affiché dans le budget (ou non renseigné).
-- -----------------------------------------------------------------------------
create or replace function prive.correspondances(p_org uuid)
returns table (demande_id uuid, vehicule_id uuid)
language sql
stable
set search_path = ''
as $$
  select d.id, v.id
    from public.demandes d
    join public.vehicules v on v.org_id = d.org_id
   where d.org_id = p_org
     and d.statut = 'ouverte'
     and not v.archive
     and v.statut_commercial <> 'vendu'
     and not (v.statut_commercial = 'reserve'
              and v.reserve_client_id <> d.client_id
              and coalesce(v.reserve_jusqu_au, current_date) >= current_date)
     and (d.marque is null or lower(btrim(v.marque)) = lower(btrim(d.marque)))
     and (d.modele is null or v.modele ilike prive.motif_contient(btrim(d.modele)))
     and (d.annee_min is null or v.annee >= d.annee_min)
     and (d.annee_max is null or v.annee <= d.annee_max)
     and (d.budget_max_xof is null or v.prix_affiche_xof is null or v.prix_affiche_xof <= d.budget_max_xof)
$$;

-- État de paiement d'une vente (résumé renvoyé après un encaissement).
create or replace function prive.etat_vente_json(p_org uuid, p_vente uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
           'id', v.id, 'numero', v.numero, 'statut', v.statut, 'montant_ttc', v.montant_ttc,
           'encaisse_xof', e.encaisse_xof, 'reste_xof', e.reste_xof, 'statut_paiement', e.statut_paiement,
           'retard_xof', e.retard_xof,
           'a_rembourser_xof', case when v.statut = 'annulee' then greatest(e.encaisse_xof, 0) else 0 end)
    from public.ventes v
    join prive.ventes_etat(p_org) e on e.vente_id = v.id
   where v.org_id = p_org and v.id = p_vente
$$;

-- -----------------------------------------------------------------------------
-- Changement d'étape (historisé). L'appelant contrôle le rôle.
-- -----------------------------------------------------------------------------
create or replace function prive.changer_etape(
  p_org uuid,
  p_id uuid,
  p_etape text,
  p_date date,
  p_note text,
  p_journal boolean default true
)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_veh  public.vehicules%rowtype;
  v_date date := coalesce(p_date, current_date);
begin
  if p_etape is null then
    perform prive.erreur('L''étape est obligatoire.', '22023');
  end if;
  perform prive.valeur_parmi(p_etape, prive.etapes(), 'etape');
  if v_date > current_date then
    perform prive.erreur('La date de l''étape ne peut pas être dans le futur.', '22023');
  end if;

  select * into v_veh from public.vehicules where id = p_id and org_id = p_org for update;
  if not found then
    perform prive.introuvable('Véhicule');
  end if;

  update public.vehicules
     set etape = p_etape, etape_depuis = v_date, updated_at = now()
   where id = p_id;

  insert into public.vehicule_etapes (org_id, vehicule_id, etape, date, note, user_id)
  values (p_org, p_id, p_etape, v_date, nullif(btrim(p_note), ''), auth.uid());

  if p_journal then
    perform prive.journaliser(p_org, 'vehicule_etape', 'vehicule', p_id,
      jsonb_build_object('reference', v_veh.reference, 'de', v_veh.etape, 'vers', p_etape, 'date', v_date));
  end if;
end
$$;

revoke all on all functions in schema prive from public, anon, authenticated;
