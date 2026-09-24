-- =============================================================================
-- 0003 — API : fonctions publiques appelées en RPC
--
-- Chaque fonction :
--   * est « security definer » avec search_path vide et des noms qualifiés ;
--   * commence par prive.exiger_role(p_org, rôles) : un non-membre ou un rôle
--     insuffisant reçoit « Accès refusé » avant tout autre contrôle ;
--   * renvoie du jsonb (clés en snake_case français).
-- Seule verifier_document(p_token) est accessible au rôle anon.
-- Les rôles autorisés de chaque fonction sont documentés dans supabase/API.md.
--
-- Idempotence (reprise hors ligne) : les fonctions de création acceptent un
-- « id » fourni par le client. Si la ligne existe déjà dans l'organisation,
-- rien n'est recréé ni renuméroté ; si elle existe dans une autre
-- organisation : « Accès refusé ».
-- =============================================================================

-- =============================================================================
-- Organisation et équipe
-- =============================================================================

create or replace function public.mes_organisations()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    perform prive.acces_refuse('vous devez être connecté.');
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', o.id,
             'nom', o.nom,
             'ville', p.ville,
             'role', m.role,
             'plan', o.plan,
             'essai_fin', o.essai_fin,
             'logo_path', p.logo_path,
             'nom_affiche', m.nom_affiche
           ) order by o.nom, o.id)
      from public.membres m
      join public.organisations o on o.id = m.org_id
      join public.parametres p on p.org_id = o.id
     where m.user_id = auth.uid() and m.actif
  ), '[]'::jsonb);
end
$$;

create or replace function public.organisation_creer(p_nom text, p_ville text default null, p_taux_usd numeric default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_nom    text := nullif(btrim(p_nom), '');
  v_ville  text := nullif(btrim(p_ville), '');
  v_email  text;
  v_org    uuid;
begin
  if v_uid is null then
    perform prive.acces_refuse('vous devez être connecté.');
  end if;
  select u.email into v_email from auth.users u where u.id = v_uid;
  if not found then
    perform prive.acces_refuse('utilisateur inconnu.');
  end if;
  if v_nom is null then
    perform prive.erreur('Le nom de l''entreprise est obligatoire.', '22023');
  end if;
  if length(v_nom) > 120 then
    perform prive.erreur('Le nom de l''entreprise est trop long (120 caractères au plus).', '22023');
  end if;
  if p_taux_usd is not null and (p_taux_usd <= 0 or p_taux_usd >= 100000) then
    perform prive.erreur('Le taux du dollar doit être un nombre positif.', '22023');
  end if;

  insert into public.organisations (nom, essai_fin)
  values (v_nom, current_date + 30)
  returning id into v_org;

  insert into public.parametres (org_id, nom_commercial, ville, taux_usd, mention_tva, conditions_vente, modele_message_whatsapp)
  values (
    v_org, v_nom, v_ville, coalesce(p_taux_usd, 570),
    'TVA non applicable',
    'Véhicule vendu en l''état, vu et essayé par l''acheteur. La propriété est transférée après paiement intégral du prix.',
    'Bonjour {client}, voici votre {document} n° {numero} d''un montant de {montant}. Merci de votre confiance. {entreprise}'
  );

  insert into public.comptes (org_id, nom, type, ordre) values (v_org, 'Caisse', 'caisse', 0);

  insert into public.referentiels (org_id, type, libelle, ordre, meta)
  select v_org, r.type, r.libelle, r.ordre, r.meta::jsonb
    from (values
      ('port_depart', 'Houston', 1, '{"pays": "US", "code": "USHOU"}'),
      ('port_depart', 'Savannah', 2, '{"pays": "US", "code": "USSAV"}'),
      ('port_depart', 'Baltimore', 3, '{"pays": "US", "code": "USBAL"}'),
      ('port_depart', 'Newark', 4, '{"pays": "US", "code": "USEWR"}'),
      ('port_depart', 'Jacksonville', 5, '{"pays": "US", "code": "USJAX"}'),
      ('port_arrivee', 'Cotonou', 1, '{"pays": "BJ", "code": "BJCOO"}'),
      ('port_arrivee', 'Dakar', 2, '{"pays": "SN", "code": "SNDKR"}'),
      ('port_arrivee', 'Lomé', 3, '{"pays": "TG", "code": "TGLFW"}'),
      ('port_arrivee', 'Abidjan', 4, '{"pays": "CI", "code": "CIABJ"}'),
      ('port_arrivee', 'Conakry', 5, '{"pays": "GN", "code": "GNCKY"}'),
      ('compagnie', 'MSC', 1, '{}'),
      ('compagnie', 'Maersk', 2, '{}'),
      ('compagnie', 'CMA CGM', 3, '{}'),
      ('compagnie', 'Grimaldi', 4, '{}'),
      ('compagnie', 'Hapag-Lloyd', 5, '{}'),
      ('categorie_frais', 'frais_enchere', 1, '{"nom": "Frais d''enchère", "portees": ["vehicule", "expedition"]}'),
      ('categorie_frais', 'remorquage', 2, '{"nom": "Remorquage", "portees": ["vehicule", "expedition"]}'),
      ('categorie_frais', 'fret', 3, '{"nom": "Fret maritime", "portees": ["vehicule", "expedition"]}'),
      ('categorie_frais', 'assurance', 4, '{"nom": "Assurance", "portees": ["vehicule", "expedition"]}'),
      ('categorie_frais', 'port', 5, '{"nom": "Frais de port", "portees": ["vehicule", "expedition"]}'),
      ('categorie_frais', 'convoi', 6, '{"nom": "Convoi", "portees": ["vehicule", "expedition"]}'),
      ('categorie_frais', 'douane', 7, '{"nom": "Douane", "portees": ["vehicule", "expedition"]}'),
      ('categorie_frais', 'transitaire', 8, '{"nom": "Transitaire", "portees": ["vehicule", "expedition"]}'),
      ('categorie_frais', 'atelier', 9, '{"nom": "Atelier", "portees": ["vehicule", "expedition"]}'),
      ('categorie_frais', 'pieces', 10, '{"nom": "Pièces", "portees": ["vehicule", "expedition"]}'),
      ('categorie_frais', 'carte_grise', 11, '{"nom": "Carte grise", "portees": ["vehicule", "expedition"]}'),
      ('categorie_frais', 'commission', 12, '{"nom": "Commission", "portees": ["vehicule", "expedition"]}'),
      ('categorie_frais', 'divers', 13, '{"nom": "Divers", "portees": ["vehicule", "expedition"]}'),
      ('categorie_frais', 'loyer', 20, '{"nom": "Loyer", "portees": ["generale"]}'),
      ('categorie_frais', 'salaires', 21, '{"nom": "Salaires", "portees": ["generale"]}'),
      ('categorie_frais', 'electricite', 22, '{"nom": "Électricité", "portees": ["generale"]}'),
      ('categorie_frais', 'communication', 23, '{"nom": "Communication", "portees": ["generale"]}'),
      ('categorie_frais', 'carburant', 24, '{"nom": "Carburant", "portees": ["generale"]}'),
      ('categorie_frais', 'autre', 25, '{"nom": "Autre", "portees": ["generale"]}')
    ) as r(type, libelle, ordre, meta);

  insert into public.membres (org_id, user_id, role, nom_affiche)
  values (v_org, v_uid, 'proprietaire', nullif(split_part(coalesce(v_email, ''), '@', 1), ''));

  perform prive.journaliser(v_org, 'organisation_creer', 'organisation', v_org, jsonb_build_object('nom', v_nom));

  return jsonb_build_object('id', v_org, 'nom', v_nom, 'ville', v_ville, 'role', 'proprietaire');
end
$$;

create or replace function public.invitation_creer(p_org uuid, p_role text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  c_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_octets bytea;
  v_code   text;
  v_inv    public.invitations%rowtype;
  v_i      integer;
begin
  perform prive.exiger_role(p_org, array['proprietaire']);
  if p_role is null then
    perform prive.erreur('Le rôle de l''invitation est obligatoire.', '22023');
  end if;
  perform prive.valeur_parmi(p_role, array['gerant', 'vendeur', 'comptable', 'lecture'], 'role');

  loop
    v_octets := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    v_code := '';
    foreach v_i in array array[0, 1, 2, 3, 4, 5, 9, 10] loop
      v_code := v_code || substr(c_alphabet, 1 + get_byte(v_octets, v_i) % 32, 1);
    end loop;
    exit when not exists (select 1 from public.invitations i where i.code = v_code);
  end loop;

  insert into public.invitations (org_id, code, role, expire_le, created_by)
  values (p_org, v_code, p_role, now() + interval '7 days', auth.uid())
  returning * into v_inv;

  perform prive.journaliser(p_org, 'invitation_creer', 'invitation', v_inv.id, jsonb_build_object('role', p_role));

  return jsonb_build_object('id', v_inv.id, 'code', v_inv.code, 'role', v_inv.role,
                            'expire_le', v_inv.expire_le, 'created_at', v_inv.created_at);
end
$$;

create or replace function public.invitation_accepter(p_code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_code  text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_inv   public.invitations%rowtype;
  v_m     public.membres%rowtype;
  v_email text;
begin
  if v_uid is null then
    perform prive.acces_refuse('vous devez être connecté.');
  end if;
  select u.email into v_email from auth.users u where u.id = v_uid;
  if not found then
    perform prive.acces_refuse('utilisateur inconnu.');
  end if;

  select * into v_inv from public.invitations i where i.code = v_code for update;
  if v_inv.id is null then
    perform prive.erreur('Code d''invitation invalide.', 'P0002');
  end if;
  if v_inv.utilisee_le is not null then
    perform prive.erreur('Ce code d''invitation a déjà été utilisé.');
  end if;
  if v_inv.expire_le < now() then
    perform prive.erreur('Ce code d''invitation a expiré : demandez-en un nouveau.');
  end if;

  select * into v_m from public.membres m where m.org_id = v_inv.org_id and m.user_id = v_uid for update;
  if v_m.user_id is not null and v_m.actif then
    perform prive.erreur('Vous êtes déjà membre de cette entreprise.');
  end if;

  if v_m.user_id is not null then
    update public.membres set role = v_inv.role, actif = true
     where org_id = v_inv.org_id and user_id = v_uid;
  else
    insert into public.membres (org_id, user_id, role, nom_affiche)
    values (v_inv.org_id, v_uid, v_inv.role, nullif(split_part(coalesce(v_email, ''), '@', 1), ''));
  end if;

  update public.invitations set utilisee_par = v_uid, utilisee_le = now() where id = v_inv.id;

  perform prive.journaliser(v_inv.org_id, 'invitation_accepter', 'membre', v_uid, jsonb_build_object('role', v_inv.role));

  return (select jsonb_build_object('id', o.id, 'nom', o.nom, 'role', v_inv.role)
            from public.organisations o where o.id = v_inv.org_id);
end
$$;

create or replace function public.invitation_annuler(p_org uuid, p_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform prive.exiger_role(p_org, array['proprietaire']);
  delete from public.invitations i
   where i.id = p_id and i.org_id = p_org and i.utilisee_le is null;
  if not found then
    perform prive.introuvable('Invitation');
  end if;
  perform prive.journaliser(p_org, 'invitation_annuler', 'invitation', p_id);
  return jsonb_build_object('id', p_id, 'supprime', true);
end
$$;

create or replace function public.membres_lister(p_org uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  v_role := prive.exiger_role(p_org, array['proprietaire', 'gerant']);
  return jsonb_build_object(
    'membres', coalesce((
      select jsonb_agg(jsonb_build_object(
               'user_id', m.user_id,
               'email', u.email,
               'nom_affiche', m.nom_affiche,
               'telephone', m.telephone,
               'role', m.role,
               'actif', m.actif,
               'created_at', m.created_at,
               'moi', m.user_id = auth.uid()
             ) order by m.actif desc, array_position(array['proprietaire', 'gerant', 'comptable', 'vendeur', 'lecture'], m.role),
                        m.nom_affiche, m.user_id)
        from public.membres m
        left join auth.users u on u.id = m.user_id
       where m.org_id = p_org
    ), '[]'::jsonb),
    'invitations', case when v_role = 'proprietaire' then coalesce((
      select jsonb_agg(jsonb_build_object('id', i.id, 'code', i.code, 'role', i.role,
                                          'expire_le', i.expire_le, 'created_at', i.created_at)
                       order by i.created_at desc)
        from public.invitations i
       where i.org_id = p_org and i.utilisee_le is null and i.expire_le > now()
    ), '[]'::jsonb) else '[]'::jsonb end
  );
end
$$;

create or replace function public.membre_modifier(p_org uuid, p_user uuid, p_role text default null, p_actif boolean default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_m     public.membres%rowtype;
  v_role  text;
  v_actif boolean;
begin
  perform prive.exiger_role(p_org, array['proprietaire']);
  perform prive.valeur_parmi(p_role, array['proprietaire', 'gerant', 'vendeur', 'comptable', 'lecture'], 'role');

  select * into v_m from public.membres m where m.org_id = p_org and m.user_id = p_user for update;
  if v_m.user_id is null then
    perform prive.introuvable('Membre');
  end if;

  v_role := coalesce(p_role, v_m.role);
  v_actif := coalesce(p_actif, v_m.actif);

  if v_m.role = 'proprietaire' and v_m.actif and (v_role <> 'proprietaire' or not v_actif)
     and not exists (select 1 from public.membres m
                      where m.org_id = p_org and m.role = 'proprietaire' and m.actif and m.user_id <> p_user) then
    perform prive.erreur('L''entreprise doit garder au moins un propriétaire actif.');
  end if;

  update public.membres set role = v_role, actif = v_actif
   where org_id = p_org and user_id = p_user;

  perform prive.journaliser(p_org, 'membre_modifier', 'membre', p_user,
    jsonb_build_object('role', v_role, 'actif', v_actif, 'ancien_role', v_m.role, 'ancien_actif', v_m.actif));

  return (select jsonb_build_object('user_id', m.user_id, 'email', u.email, 'nom_affiche', m.nom_affiche,
                                    'telephone', m.telephone, 'role', m.role, 'actif', m.actif,
                                    'created_at', m.created_at, 'moi', m.user_id = auth.uid())
            from public.membres m left join auth.users u on u.id = m.user_id
           where m.org_id = p_org and m.user_id = p_user);
end
$$;

-- =============================================================================
-- Paramètres, référentiels, comptes, transferts
-- =============================================================================

create or replace function public.parametres_obtenir(p_org uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  v_role := prive.exiger_role(p_org, array['proprietaire', 'gerant', 'vendeur', 'comptable', 'lecture']);
  return (
    select jsonb_build_object(
      'organisation', jsonb_build_object('id', o.id, 'nom', o.nom, 'pays', o.pays, 'devise', o.devise,
                                         'plan', o.plan, 'essai_fin', o.essai_fin, 'created_at', o.created_at),
      'mon_role', v_role,
      'voit_couts', prive.voit_couts(p_org),
      'voit_plancher', prive.voit_plancher(p_org),
      'parametres', to_jsonb(p) - 'org_id'
    )
      from public.organisations o
      join public.parametres p on p.org_id = o.id
     where o.id = p_org
  );
end
$$;

create or replace function public.parametres_enregistrer(p_org uuid, p_patch jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  c_champs constant text[] := array[
    'nom_commercial', 'raison_sociale', 'slogan', 'adresse', 'ville', 'pays', 'telephones', 'whatsapp', 'email',
    'site_web', 'nif', 'rccm', 'compte_bancaire', 'logo_path', 'cachet_path', 'signature_path',
    'format_numero', 'padding', 'remise_annuelle', 'prefixe_facture', 'prefixe_proforma', 'prefixe_recu',
    'prefixe_avoir', 'prefixe_vehicule', 'prefixe_expedition', 'tva_active', 'tva_taux', 'mention_tva',
    'conditions_vente', 'pied_document', 'validite_proforma_jours', 'montant_en_lettres', 'qr_verification',
    'couleur_documents', 'garantie_texte', 'modele_message_whatsapp', 'taux_usd', 'taux_eur',
    'modes_paiement', 'commission_vendeur_pct', 'alerte_stock_jours', 'alerte_port_jours',
    'masquer_couts_vendeurs', 'vendeur_voit_plancher', 'unite_compteur', 'bareme_douane'];
  v_p    jsonb;
  v_old  public.parametres%rowtype;
  v_new  public.parametres%rowtype;
  v_cle  text;
  v_modifies text[];
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant']);
  v_p := prive.valider_types(p_patch, 'public.parametres'::regclass, c_champs);

  -- Une colonne obligatoire ne peut pas être vidée.
  for v_cle in select e.key from jsonb_each(v_p) e where jsonb_typeof(e.value) = 'null' loop
    if exists (select 1 from pg_catalog.pg_attribute a
                where a.attrelid = 'public.parametres'::regclass and a.attname = v_cle and a.attnotnull) then
      perform prive.erreur(format('Le paramètre « %s » ne peut pas être vide.', v_cle), '22023');
    end if;
  end loop;

  select * into v_old from public.parametres where org_id = p_org for update;
  v_new := jsonb_populate_record(v_old, v_p);

  if position('{NUM}' in v_new.format_numero) = 0 then
    perform prive.erreur('Le format de numérotation doit contenir {NUM}.', '22023');
  end if;
  if length(v_new.format_numero) > 60 then
    perform prive.erreur('Le format de numérotation est trop long.', '22023');
  end if;
  if v_new.padding not between 1 and 8 then
    perform prive.erreur('Le nombre de chiffres de la numérotation doit être compris entre 1 et 8.', '22023');
  end if;
  if not (v_new.prefixe_facture ~ '^[A-Za-z0-9]{1,8}$' and v_new.prefixe_proforma ~ '^[A-Za-z0-9]{1,8}$'
          and v_new.prefixe_recu ~ '^[A-Za-z0-9]{1,8}$' and v_new.prefixe_avoir ~ '^[A-Za-z0-9]{1,8}$'
          and v_new.prefixe_vehicule ~ '^[A-Za-z0-9]{1,8}$' and v_new.prefixe_expedition ~ '^[A-Za-z0-9]{1,8}$') then
    perform prive.erreur('Les préfixes ne contiennent que des lettres et des chiffres (8 au plus).', '22023');
  end if;
  if v_new.tva_taux < 0 or v_new.tva_taux >= 100 then
    perform prive.erreur('Le taux de TVA doit être compris entre 0 et 100.', '22023');
  end if;
  if v_new.taux_usd <= 0 or v_new.taux_eur <= 0 then
    perform prive.erreur('Les taux de change doivent être positifs.', '22023');
  end if;
  if not (v_new.modes_paiement <@ array['especes', 'orange_money', 'moov_money', 'wave', 'virement', 'cheque', 'autre']) then
    perform prive.erreur('Modes de paiement possibles : especes, orange_money, moov_money, wave, virement, cheque, autre.', '22023');
  end if;
  if v_new.couleur_documents !~ '^#[0-9A-Fa-f]{6}$' then
    perform prive.erreur('La couleur des documents doit être au format #RRGGBB.', '22023');
  end if;
  perform prive.valeur_parmi(v_new.unite_compteur, array['km', 'mi'], 'unite_compteur');
  if v_new.commission_vendeur_pct not between 0 and 100 then
    perform prive.erreur('La commission du vendeur doit être comprise entre 0 et 100 %.', '22023');
  end if;
  if v_new.alerte_stock_jours not between 1 and 3650 or v_new.alerte_port_jours not between 1 and 3650 then
    perform prive.erreur('Les délais d''alerte doivent être compris entre 1 et 3650 jours.', '22023');
  end if;
  if v_new.validite_proforma_jours not between 1 and 365 then
    perform prive.erreur('La validité des proformas doit être comprise entre 1 et 365 jours.', '22023');
  end if;
  if jsonb_typeof(v_new.bareme_douane) <> 'object' then
    perform prive.erreur('Le barème de douane doit être un objet JSON.', '22023');
  end if;
  if length(btrim(v_new.nom_commercial)) not between 1 and 120 then
    perform prive.erreur('Le nom commercial est obligatoire (120 caractères au plus).', '22023');
  end if;

  if v_new.taux_usd is distinct from v_old.taux_usd or v_new.taux_eur is distinct from v_old.taux_eur then
    v_new.taux_maj_le := now();
  end if;

  select array_agg(n.key order by n.key) into v_modifies
    from jsonb_each(to_jsonb(v_new)) n
   where n.value is distinct from to_jsonb(v_old) -> n.key;

  if v_modifies is null then
    return public.parametres_obtenir(p_org);
  end if;

  update public.parametres set
    nom_commercial = v_new.nom_commercial, raison_sociale = v_new.raison_sociale, slogan = v_new.slogan,
    adresse = v_new.adresse, ville = v_new.ville, pays = v_new.pays, telephones = v_new.telephones,
    whatsapp = v_new.whatsapp, email = v_new.email, site_web = v_new.site_web, nif = v_new.nif,
    rccm = v_new.rccm, compte_bancaire = v_new.compte_bancaire, logo_path = v_new.logo_path,
    cachet_path = v_new.cachet_path, signature_path = v_new.signature_path,
    format_numero = v_new.format_numero, padding = v_new.padding, remise_annuelle = v_new.remise_annuelle,
    prefixe_facture = v_new.prefixe_facture, prefixe_proforma = v_new.prefixe_proforma,
    prefixe_recu = v_new.prefixe_recu, prefixe_avoir = v_new.prefixe_avoir,
    prefixe_vehicule = v_new.prefixe_vehicule, prefixe_expedition = v_new.prefixe_expedition,
    tva_active = v_new.tva_active, tva_taux = v_new.tva_taux, mention_tva = v_new.mention_tva,
    conditions_vente = v_new.conditions_vente, pied_document = v_new.pied_document,
    validite_proforma_jours = v_new.validite_proforma_jours, montant_en_lettres = v_new.montant_en_lettres,
    qr_verification = v_new.qr_verification, couleur_documents = v_new.couleur_documents,
    garantie_texte = v_new.garantie_texte, modele_message_whatsapp = v_new.modele_message_whatsapp,
    taux_usd = v_new.taux_usd, taux_eur = v_new.taux_eur, taux_maj_le = v_new.taux_maj_le,
    modes_paiement = v_new.modes_paiement, commission_vendeur_pct = v_new.commission_vendeur_pct,
    alerte_stock_jours = v_new.alerte_stock_jours, alerte_port_jours = v_new.alerte_port_jours,
    masquer_couts_vendeurs = v_new.masquer_couts_vendeurs, vendeur_voit_plancher = v_new.vendeur_voit_plancher,
    unite_compteur = v_new.unite_compteur, bareme_douane = v_new.bareme_douane,
    updated_at = now()
  where org_id = p_org;

  if v_new.nom_commercial is distinct from v_old.nom_commercial then
    update public.organisations set nom = btrim(v_new.nom_commercial) where id = p_org;
  end if;

  perform prive.journaliser(p_org, 'parametres_enregistrer', 'parametres', p_org,
    jsonb_build_object('champs', to_jsonb(v_modifies)));

  return public.parametres_obtenir(p_org);
end
$$;

create or replace function public.referentiels_lister(p_org uuid, p_type text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'vendeur', 'comptable', 'lecture']);
  perform prive.valeur_parmi(p_type, array['port_depart', 'port_arrivee', 'transitaire', 'compagnie', 'fournisseur', 'categorie_frais'], 'type');
  return coalesce((
    select jsonb_agg(to_jsonb(r) - 'org_id' order by r.type, r.ordre, r.libelle)
      from public.referentiels r
     where r.org_id = p_org and (p_type is null or r.type = p_type)
  ), '[]'::jsonb);
end
$$;

create or replace function public.referentiel_enregistrer(p_org uuid, p_data jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_p   jsonb;
  v_id  uuid;
  v_org uuid;
  v_old public.referentiels%rowtype;
  v_new public.referentiels%rowtype;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant']);
  v_p := prive.valider_types(p_data, 'public.referentiels'::regclass, array['id', 'type', 'libelle', 'actif', 'ordre', 'meta']);
  v_id := (v_p ->> 'id')::uuid;

  if v_id is not null then
    select r.org_id into v_org from public.referentiels r where r.id = v_id;
    if prive.id_existant(p_org, v_org) then
      select * into v_old from public.referentiels r where r.id = v_id for update;
    end if;
  end if;

  if v_old.id is null then
    v_new := jsonb_populate_record(null::public.referentiels, v_p);
    v_new.id := coalesce(v_id, gen_random_uuid());
    v_new.org_id := p_org;
    v_new.actif := coalesce(v_new.actif, true);
    v_new.ordre := coalesce(v_new.ordre, 0);
    v_new.meta := coalesce(v_new.meta, '{}'::jsonb);
  else
    v_new := jsonb_populate_record(v_old, v_p - 'id');
  end if;

  if v_new.type is null then
    perform prive.erreur('Le type de référentiel est obligatoire.', '22023');
  end if;
  perform prive.valeur_parmi(v_new.type, array['port_depart', 'port_arrivee', 'transitaire', 'compagnie', 'fournisseur', 'categorie_frais'], 'type');
  if v_new.libelle is null then
    perform prive.erreur('Le libellé est obligatoire.', '22023');
  end if;
  if jsonb_typeof(coalesce(v_new.meta, '{}'::jsonb)) <> 'object' then
    perform prive.erreur('Champ « meta » : objet JSON attendu.', '22023');
  end if;
  v_new.actif := coalesce(v_new.actif, true);
  v_new.ordre := coalesce(v_new.ordre, 0);
  v_new.meta := coalesce(v_new.meta, '{}'::jsonb);
  if exists (select 1 from public.referentiels r
              where r.org_id = p_org and r.type = v_new.type and r.libelle = v_new.libelle and r.id <> v_new.id) then
    perform prive.erreur(format('« %s » existe déjà dans ce référentiel.', v_new.libelle));
  end if;

  if v_old.id is null then
    insert into public.referentiels (id, org_id, type, libelle, actif, ordre, meta)
    values (v_new.id, p_org, v_new.type, v_new.libelle, v_new.actif, v_new.ordre, v_new.meta);
    perform prive.journaliser(p_org, 'referentiel_creer', 'referentiel', v_new.id,
      jsonb_build_object('type', v_new.type, 'libelle', v_new.libelle));
  elsif to_jsonb(v_new) is distinct from to_jsonb(v_old) then
    update public.referentiels
       set type = v_new.type, libelle = v_new.libelle, actif = v_new.actif, ordre = v_new.ordre, meta = v_new.meta
     where id = v_new.id;
    perform prive.journaliser(p_org, 'referentiel_modifier', 'referentiel', v_new.id,
      jsonb_build_object('type', v_new.type, 'libelle', v_new.libelle));
  end if;

  return (select to_jsonb(r) - 'org_id' from public.referentiels r where r.id = v_new.id);
end
$$;

create or replace function public.referentiel_supprimer(p_org uuid, p_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_r public.referentiels%rowtype;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant']);
  delete from public.referentiels r where r.id = p_id and r.org_id = p_org returning * into v_r;
  if v_r.id is null then
    perform prive.introuvable('Élément du référentiel');
  end if;
  perform prive.journaliser(p_org, 'referentiel_supprimer', 'referentiel', p_id,
    jsonb_build_object('type', v_r.type, 'libelle', v_r.libelle));
  return jsonb_build_object('id', p_id, 'supprime', true);
end
$$;

create or replace function public.comptes_lister(p_org uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_couts boolean;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'vendeur', 'comptable', 'lecture']);
  v_couts := prive.voit_couts(p_org);
  return coalesce((
    select jsonb_agg((to_jsonb(c) - 'org_id')
                     || jsonb_build_object('solde_xof', case when v_couts then s.solde_xof end)
                     || case when v_couts then '{}'::jsonb else jsonb_build_object('solde_initial', null) end
                     order by c.ordre, c.nom)
      from public.comptes c
      join prive.soldes_comptes(p_org) s on s.compte_id = c.id
     where c.org_id = p_org
  ), '[]'::jsonb);
end
$$;

create or replace function public.compte_enregistrer(p_org uuid, p_data jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_p   jsonb;
  v_id  uuid;
  v_org uuid;
  v_old public.comptes%rowtype;
  v_new public.comptes%rowtype;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'comptable']);
  v_p := prive.valider_types(p_data, 'public.comptes'::regclass, array['id', 'nom', 'type', 'solde_initial', 'actif', 'ordre']);
  v_id := (v_p ->> 'id')::uuid;

  if v_id is not null then
    select c.org_id into v_org from public.comptes c where c.id = v_id;
    if prive.id_existant(p_org, v_org) then
      select * into v_old from public.comptes c where c.id = v_id for update;
    end if;
  end if;

  if v_old.id is null then
    v_new := jsonb_populate_record(null::public.comptes, v_p);
    v_new.id := coalesce(v_id, gen_random_uuid());
    v_new.org_id := p_org;
  else
    v_new := jsonb_populate_record(v_old, v_p - 'id');
  end if;
  v_new.solde_initial := round(coalesce(v_new.solde_initial, 0));
  v_new.actif := coalesce(v_new.actif, true);
  v_new.ordre := coalesce(v_new.ordre, 0);

  if v_new.nom is null then
    perform prive.erreur('Le nom du compte est obligatoire.', '22023');
  end if;
  if v_new.type is null then
    perform prive.erreur('Le type de compte est obligatoire (caisse, mobile_money, banque).', '22023');
  end if;
  perform prive.valeur_parmi(v_new.type, array['caisse', 'mobile_money', 'banque'], 'type');
  if exists (select 1 from public.comptes c where c.org_id = p_org and c.nom = v_new.nom and c.id <> v_new.id) then
    perform prive.erreur(format('Un compte « %s » existe déjà.', v_new.nom));
  end if;

  if v_old.id is null then
    insert into public.comptes (id, org_id, nom, type, solde_initial, actif, ordre)
    values (v_new.id, p_org, v_new.nom, v_new.type, v_new.solde_initial, v_new.actif, v_new.ordre);
    perform prive.journaliser(p_org, 'compte_creer', 'compte', v_new.id, jsonb_build_object('nom', v_new.nom));
  elsif to_jsonb(v_new) is distinct from to_jsonb(v_old) then
    update public.comptes
       set nom = v_new.nom, type = v_new.type, solde_initial = v_new.solde_initial, actif = v_new.actif, ordre = v_new.ordre
     where id = v_new.id;
    perform prive.journaliser(p_org, 'compte_modifier', 'compte', v_new.id, jsonb_build_object('nom', v_new.nom));
  end if;

  return (select (to_jsonb(c) - 'org_id') || jsonb_build_object('solde_xof', s.solde_xof)
            from public.comptes c join prive.soldes_comptes(p_org) s on s.compte_id = c.id
           where c.id = v_new.id);
end
$$;

create or replace function public.transfert_enregistrer(p_org uuid, p_data jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id      uuid;
  v_org     uuid;
  v_source  uuid;
  v_dest    uuid;
  v_montant numeric;
  v_date    date;
  v_t       public.transferts%rowtype;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'comptable']);
  v_id := prive.j_uuid(p_data, 'id');
  if v_id is not null then
    select t.org_id into v_org from public.transferts t where t.id = v_id;
    if prive.id_existant(p_org, v_org) then
      select * into v_t from public.transferts t where t.id = v_id;
    end if;
  end if;

  if v_t.id is null then
    v_source := prive.j_uuid(p_data, 'compte_source');
    v_dest := prive.j_uuid(p_data, 'compte_dest');
    v_montant := prive.j_nombre(p_data, 'montant_xof');
    v_date := coalesce(prive.j_date(p_data, 'date'), current_date);
    if v_source is null or v_dest is null then
      perform prive.erreur('Les comptes source et destination sont obligatoires.', '22023');
    end if;
    if v_source = v_dest then
      perform prive.erreur('Les comptes source et destination doivent être différents.', '22023');
    end if;
    if not exists (select 1 from public.comptes c where c.id = v_source and c.org_id = p_org)
       or not exists (select 1 from public.comptes c where c.id = v_dest and c.org_id = p_org) then
      perform prive.introuvable('Compte');
    end if;
    if v_montant is null or v_montant <= 0 or v_montant <> round(v_montant) then
      perform prive.erreur('Le montant du transfert doit être un nombre entier positif de FCFA.', '22023');
    end if;
    if v_date > current_date then
      perform prive.erreur('La date du transfert ne peut pas être dans le futur.', '22023');
    end if;
    insert into public.transferts (id, org_id, compte_source, compte_dest, montant_xof, date, note, created_by)
    values (coalesce(v_id, gen_random_uuid()), p_org, v_source, v_dest, v_montant, v_date,
            prive.j_texte(p_data, 'note'), auth.uid())
    returning * into v_t;
    perform prive.journaliser(p_org, 'transfert_creer', 'transfert', v_t.id,
      jsonb_build_object('montant_xof', v_montant, 'compte_source', v_source, 'compte_dest', v_dest));
  end if;

  return (select (to_jsonb(t) - 'org_id')
                 || jsonb_build_object('compte_source_nom', cs.nom, 'compte_dest_nom', cd.nom)
            from public.transferts t
            join public.comptes cs on cs.id = t.compte_source
            join public.comptes cd on cd.id = t.compte_dest
           where t.id = v_t.id);
end
$$;

create or replace function public.transfert_supprimer(p_org uuid, p_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_t public.transferts%rowtype;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'comptable']);
  delete from public.transferts t where t.id = p_id and t.org_id = p_org returning * into v_t;
  if v_t.id is null then
    perform prive.introuvable('Transfert');
  end if;
  perform prive.journaliser(p_org, 'transfert_supprimer', 'transfert', p_id,
    jsonb_build_object('montant_xof', v_t.montant_xof, 'date', v_t.date));
  return jsonb_build_object('id', p_id, 'supprime', true);
end
$$;

-- =============================================================================
-- Véhicules
-- =============================================================================

create or replace function public.vehicules_lister(p_org uuid, p_filtres jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_couts     boolean;
  v_plancher  boolean;
  v_etapes    text[];
  v_statut    text;
  v_exp       uuid;
  v_archives  boolean;
  v_seul_arch boolean;
  v_en_vente  boolean;
  v_q         text;
  v_motif     text;
  v_e         text;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'vendeur', 'comptable', 'lecture']);
  v_couts := prive.voit_couts(p_org);
  v_plancher := prive.voit_plancher(p_org);

  if jsonb_typeof(p_filtres -> 'etape') = 'array' then
    select array_agg(x) into v_etapes from jsonb_array_elements_text(p_filtres -> 'etape') x;
  elsif prive.j_texte(p_filtres, 'etape') is not null then
    v_etapes := array[prive.j_texte(p_filtres, 'etape')];
  end if;
  if v_etapes is not null then
    foreach v_e in array v_etapes loop
      perform prive.valeur_parmi(v_e, prive.etapes(), 'etape');
    end loop;
  end if;
  v_statut := prive.valeur_parmi(prive.j_texte(p_filtres, 'statut_commercial'), array['disponible', 'reserve', 'vendu'], 'statut_commercial');
  v_exp := prive.j_uuid(p_filtres, 'expedition_id');
  v_archives := coalesce(prive.j_booleen(p_filtres, 'inclure_archives'), false);
  v_seul_arch := coalesce(prive.j_booleen(p_filtres, 'archives_seulement'), false);
  v_en_vente := prive.j_booleen(p_filtres, 'en_vente');
  v_q := prive.j_texte(p_filtres, 'q');
  v_motif := prive.motif_contient(v_q);

  return coalesce((
    select jsonb_agg(prive.masquer_vehicule(x.data, v_couts, v_plancher) order by x.created_at desc, x.id)
      from prive.vehicules_vue(p_org) x
     where (case when v_seul_arch then x.archive when v_archives then true else not x.archive end)
       and (v_etapes is null or x.etape = any (v_etapes))
       and (v_statut is null or x.statut_commercial = v_statut)
       and (v_exp is null or x.expedition_id = v_exp)
       and (v_en_vente is null or (x.data ->> 'en_vente')::boolean = v_en_vente)
       and (v_q is null
            or x.data ->> 'reference' ilike v_motif
            or x.data ->> 'vin' ilike v_motif
            or x.data ->> 'lot_numero' ilike v_motif
            or x.data ->> 'libelle' ilike v_motif
            or x.data ->> 'immatriculation' ilike v_motif)
  ), '[]'::jsonb);
end
$$;

create or replace function public.vehicule_obtenir(p_org uuid, p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_couts    boolean;
  v_plancher boolean;
  v_data     jsonb;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'vendeur', 'comptable', 'lecture']);
  v_couts := prive.voit_couts(p_org);
  v_plancher := prive.voit_plancher(p_org);

  select x.data into v_data from prive.vehicules_vue(p_org, p_id) x;
  if v_data is null then
    perform prive.introuvable('Véhicule');
  end if;

  return prive.masquer_vehicule(v_data, v_couts, v_plancher) || jsonb_build_object(
    'etapes', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'etape', e.etape, 'date', e.date, 'note', e.note,
                                          'user_id', e.user_id, 'user_nom', m.nom_affiche, 'created_at', e.created_at)
                       order by e.date desc, e.created_at desc)
        from public.vehicule_etapes e
        left join public.membres m on m.org_id = e.org_id and m.user_id = e.user_id
       where e.org_id = p_org and e.vehicule_id = p_id), '[]'::jsonb),
    'photos', coalesce((
      select jsonb_agg(jsonb_build_object('id', ph.id, 'path', ph.path, 'ordre', ph.ordre) order by ph.ordre, ph.created_at)
        from public.vehicule_photos ph
       where ph.org_id = p_org and ph.vehicule_id = p_id), '[]'::jsonb),
    'documents', coalesce((
      select jsonb_agg(to_jsonb(d) - 'org_id' - 'created_by' order by d.created_at desc)
        from public.documents d
       where d.org_id = p_org and d.vehicule_id = p_id), '[]'::jsonb),
    'frais', case when v_couts then coalesce((
      select jsonb_agg(x.j order by x.date desc, x.created_at desc)
        from (
          select prive.frais_json(p_org, f) || jsonb_build_object('part_xof', f.montant_xof) as j, f.date, f.created_at
            from public.frais f
           where f.org_id = p_org and f.portee = 'vehicule' and f.vehicule_id = p_id
          union all
          select prive.frais_json(p_org, f) || jsonb_build_object('part_xof', pe.part_xof), f.date, f.created_at
            from prive.parts_expedition(p_org) pe
            join public.frais f on f.id = pe.frais_id
           where pe.vehicule_id = p_id
        ) x), '[]'::jsonb) end,
    'couts_par_categorie', case when v_couts then prive.couts_par_categorie(p_org, p_id) end,
    'historique_ventes', coalesce((
      select jsonb_agg(jsonb_build_object('id', ve.id, 'numero', ve.numero, 'statut', ve.statut,
                                          'date_vente', ve.date_vente, 'client_id', ve.client_id, 'client_nom', c.nom,
                                          'montant_ttc', ve.montant_ttc, 'numero_avoir', ve.numero_avoir)
                       order by ve.date_vente desc, ve.created_at desc)
        from public.ventes ve join public.clients c on c.id = ve.client_id
       where ve.org_id = p_org and ve.vehicule_id = p_id), '[]'::jsonb),
    'proformas', coalesce((
      select jsonb_agg(jsonb_build_object('id', pr.id, 'numero', pr.numero, 'statut', pr.statut,
                                          'statut_effectif', prive.proforma_json(pr) ->> 'statut_effectif',
                                          'client_id', pr.client_id, 'client_nom', c.nom,
                                          'montant_ttc', pr.montant_ttc, 'valide_jusqu_au', pr.valide_jusqu_au)
                       order by pr.created_at desc)
        from public.proformas pr join public.clients c on c.id = pr.client_id
       where pr.org_id = p_org and pr.vehicule_id = p_id), '[]'::jsonb),
    'vin_cle_valide', case when v_data ->> 'vin' is null then null else prive.vin_cle_valide(v_data ->> 'vin') end
  );
end
$$;

create or replace function public.vehicule_enregistrer(p_org uuid, p_data jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  c_champs constant text[] := array[
    'vin', 'marque', 'modele', 'finition', 'annee', 'couleur', 'carburant', 'transmission', 'kilometrage_km',
    'moteur', 'source', 'lot_numero', 'date_achat', 'lieu_achat', 'titre', 'dommage_principal', 'cles',
    'demarre', 'prix_achat', 'devise_achat', 'taux_achat', 'prix_affiche_xof', 'prix_plancher_xof',
    'immatriculation', 'carte_grise', 'photo_principale_path', 'notes'];
  v_p      jsonb;
  v_id     uuid;
  v_org    uuid;
  v_old    public.vehicules%rowtype;
  v_new    public.vehicules%rowtype;
  v_ref    text;
  v_modifies text[];
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant']);
  v_p := prive.valider_types(p_data, 'public.vehicules'::regclass, c_champs || array['id', 'etape', 'etape_depuis']);
  v_id := (v_p ->> 'id')::uuid;

  if v_id is not null then
    select v.org_id into v_org from public.vehicules v where v.id = v_id;
    if prive.id_existant(p_org, v_org) then
      select * into v_old from public.vehicules v where v.id = v_id for update;
    end if;
  end if;

  if v_old.id is null then
    v_new := jsonb_populate_record(null::public.vehicules, v_p);
    v_new.id := coalesce(v_id, gen_random_uuid());
    v_new.org_id := p_org;
    v_new.etape := coalesce(v_new.etape, 'achete');
    v_new.etape_depuis := coalesce(v_new.etape_depuis, case when v_new.etape = 'achete' then v_new.date_achat end, current_date);
    v_new.statut_commercial := 'disponible';
    v_new.source := coalesce(v_new.source, 'autre');
    v_new.devise_achat := coalesce(v_new.devise_achat, 'USD');
    v_new.prix_achat := coalesce(v_new.prix_achat, 0);
    v_new.carte_grise := coalesce(v_new.carte_grise, 'a_faire');
    v_new.archive := false;
  else
    -- Étape, statut commercial, référence, expédition : fonctions dédiées.
    v_new := jsonb_populate_record(v_old, v_p - 'id' - 'etape' - 'etape_depuis');
    if v_new.devise_achat is distinct from v_old.devise_achat and not (v_p ? 'taux_achat') then
      v_new.taux_achat := null;
    end if;
    v_new.devise_achat := coalesce(v_new.devise_achat, v_old.devise_achat);
    v_new.prix_achat := coalesce(v_new.prix_achat, 0);
    v_new.source := coalesce(v_new.source, 'autre');
    v_new.carte_grise := coalesce(v_new.carte_grise, 'a_faire');
  end if;

  -- Normalisation et contrôles
  v_new.marque := btrim(v_new.marque);
  v_new.modele := btrim(v_new.modele);
  if v_new.marque is null or v_new.marque = '' then
    perform prive.erreur('La marque est obligatoire.', '22023');
  end if;
  if v_new.modele is null or v_new.modele = '' then
    perform prive.erreur('Le modèle est obligatoire.', '22023');
  end if;
  if v_new.vin is not null then
    v_new.vin := upper(regexp_replace(v_new.vin, '[\s-]', '', 'g'));
    if v_new.vin !~ '^[A-HJ-NPR-Z0-9]{17}$' then
      perform prive.erreur('Le VIN doit comporter 17 caractères (chiffres et lettres, sans I, O ni Q).', '22023');
    end if;
    select v.reference into v_ref from public.vehicules v
     where v.org_id = p_org and v.vin = v_new.vin and v.id <> v_new.id;
    if v_ref is not null then
      perform prive.erreur(format('Ce VIN est déjà enregistré pour le véhicule %s.', v_ref));
    end if;
  end if;
  if v_new.annee is not null and (v_new.annee < 1950 or v_new.annee > extract(year from current_date)::integer + 1) then
    perform prive.erreur('Année du véhicule invalide.', '22023');
  end if;
  if v_new.kilometrage_km is not null and v_new.kilometrage_km < 0 then
    perform prive.erreur('Le kilométrage ne peut pas être négatif.', '22023');
  end if;
  perform prive.valeur_parmi(v_new.etape, prive.etapes(), 'etape');
  perform prive.valeur_parmi(v_new.carburant, array['essence', 'diesel', 'hybride', 'electrique', 'gpl', 'autre'], 'carburant');
  perform prive.valeur_parmi(v_new.transmission, array['automatique', 'manuelle'], 'transmission');
  perform prive.valeur_parmi(v_new.source, array['copart', 'iaai', 'manheim', 'concession', 'particulier', 'autre'], 'source');
  perform prive.valeur_parmi(v_new.titre, array['clean', 'salvage', 'rebuilt', 'autre'], 'titre');
  perform prive.valeur_parmi(v_new.devise_achat, array['XOF', 'USD', 'EUR'], 'devise_achat');
  perform prive.valeur_parmi(v_new.carte_grise, array['a_faire', 'en_cours', 'obtenue'], 'carte_grise');
  if v_new.prix_achat < 0 then
    perform prive.erreur('Le prix d''achat ne peut pas être négatif.', '22023');
  end if;
  if v_new.devise_achat = 'XOF' then
    v_new.taux_achat := 1;
  elsif v_new.taux_achat is null then
    v_new.taux_achat := prive.taux_devise(p_org, v_new.devise_achat);
  end if;
  if v_new.taux_achat <= 0 then
    perform prive.erreur('Le taux de change doit être positif.', '22023');
  end if;
  v_new.prix_affiche_xof := round(v_new.prix_affiche_xof);
  v_new.prix_plancher_xof := round(v_new.prix_plancher_xof);
  if v_new.prix_affiche_xof < 0 or v_new.prix_plancher_xof < 0 then
    perform prive.erreur('Les prix ne peuvent pas être négatifs.', '22023');
  end if;
  if v_new.photo_principale_path is not null and v_new.photo_principale_path not like p_org::text || '/%' then
    perform prive.erreur('Chemin de photo invalide.', '22023');
  end if;
  if v_new.etape_depuis > current_date then
    perform prive.erreur('La date de l''étape ne peut pas être dans le futur.', '22023');
  end if;

  if v_old.id is null then
    v_new.reference := prive.prochain_numero(p_org, 'vehicule', current_date);
    insert into public.vehicules (
      id, org_id, reference, vin, marque, modele, finition, annee, couleur, carburant, transmission,
      kilometrage_km, moteur, source, lot_numero, date_achat, lieu_achat, titre, dommage_principal, cles,
      demarre, etape, etape_depuis, statut_commercial, prix_achat, devise_achat, taux_achat,
      prix_affiche_xof, prix_plancher_xof, immatriculation, carte_grise, photo_principale_path, notes,
      archive, created_by)
    values (
      v_new.id, p_org, v_new.reference, v_new.vin, v_new.marque, v_new.modele, v_new.finition, v_new.annee,
      v_new.couleur, v_new.carburant, v_new.transmission, v_new.kilometrage_km, v_new.moteur, v_new.source,
      v_new.lot_numero, v_new.date_achat, v_new.lieu_achat, v_new.titre, v_new.dommage_principal, v_new.cles,
      v_new.demarre, v_new.etape, v_new.etape_depuis, 'disponible', v_new.prix_achat, v_new.devise_achat,
      v_new.taux_achat, v_new.prix_affiche_xof, v_new.prix_plancher_xof, v_new.immatriculation,
      v_new.carte_grise, v_new.photo_principale_path, v_new.notes, false, auth.uid());

    insert into public.vehicule_etapes (org_id, vehicule_id, etape, date, note, user_id)
    values (p_org, v_new.id, v_new.etape, v_new.etape_depuis, 'Enregistrement du véhicule', auth.uid());

    perform prive.journaliser(p_org, 'vehicule_creer', 'vehicule', v_new.id,
      jsonb_build_object('reference', v_new.reference, 'libelle', concat_ws(' ', v_new.marque, v_new.modele, v_new.annee)));
  else
    select array_agg(n.key order by n.key) into v_modifies
      from jsonb_each(to_jsonb(v_new)) n
     where n.key not in ('achat_xof', 'updated_at') and n.value is distinct from to_jsonb(v_old) -> n.key;

    if v_modifies is not null then
      update public.vehicules set
        vin = v_new.vin, marque = v_new.marque, modele = v_new.modele, finition = v_new.finition,
        annee = v_new.annee, couleur = v_new.couleur, carburant = v_new.carburant,
        transmission = v_new.transmission, kilometrage_km = v_new.kilometrage_km, moteur = v_new.moteur,
        source = v_new.source, lot_numero = v_new.lot_numero, date_achat = v_new.date_achat,
        lieu_achat = v_new.lieu_achat, titre = v_new.titre, dommage_principal = v_new.dommage_principal,
        cles = v_new.cles, demarre = v_new.demarre, prix_achat = v_new.prix_achat,
        devise_achat = v_new.devise_achat, taux_achat = v_new.taux_achat,
        prix_affiche_xof = v_new.prix_affiche_xof, prix_plancher_xof = v_new.prix_plancher_xof,
        immatriculation = v_new.immatriculation, carte_grise = v_new.carte_grise,
        photo_principale_path = v_new.photo_principale_path, notes = v_new.notes, updated_at = now()
      where id = v_new.id;
      perform prive.journaliser(p_org, 'vehicule_modifier', 'vehicule', v_new.id,
        jsonb_build_object('reference', v_old.reference, 'champs', to_jsonb(v_modifies)));
    end if;
  end if;

  return public.vehicule_obtenir(p_org, v_new.id);
end
$$;

create or replace function public.vehicule_changer_etape(
  p_org uuid,
  p_id uuid,
  p_etape text,
  p_date date default null,
  p_note text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant']);
  perform prive.changer_etape(p_org, p_id, p_etape, p_date, p_note);
  return public.vehicule_obtenir(p_org, p_id);
end
$$;

create or replace function public.vehicules_changer_etape_lot(
  p_org uuid,
  p_ids uuid[],
  p_etape text,
  p_date date default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_nb integer := 0;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant']);
  if p_ids is null or cardinality(p_ids) = 0 then
    perform prive.erreur('Aucun véhicule sélectionné.', '22023');
  end if;
  foreach v_id in array (select array_agg(distinct x) from unnest(p_ids) x) loop
    perform prive.changer_etape(p_org, v_id, p_etape, p_date, null);
    v_nb := v_nb + 1;
  end loop;
  return jsonb_build_object('nb', v_nb, 'etape', p_etape, 'date', coalesce(p_date, current_date),
                            'vehicule_ids', to_jsonb((select array_agg(distinct x) from unnest(p_ids) x)));
end
$$;

create or replace function public.vehicule_reserver(
  p_org uuid,
  p_id uuid,
  p_client_id uuid,
  p_jusqu_au date default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_veh public.vehicules%rowtype;
  v_cli public.clients%rowtype;
  v_autre text;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'vendeur']);
  select * into v_veh from public.vehicules v where v.id = p_id and v.org_id = p_org for update;
  if v_veh.id is null then
    perform prive.introuvable('Véhicule');
  end if;
  select * into v_cli from public.clients c where c.id = p_client_id and c.org_id = p_org;
  if v_cli.id is null then
    perform prive.introuvable('Client');
  end if;
  if v_veh.archive then
    perform prive.erreur('Ce véhicule est archivé.');
  end if;
  if v_veh.statut_commercial = 'vendu' then
    perform prive.erreur('Ce véhicule est déjà vendu.');
  end if;
  if v_veh.statut_commercial = 'reserve' and v_veh.reserve_client_id <> p_client_id
     and coalesce(v_veh.reserve_jusqu_au, current_date) >= current_date then
    select c.nom into v_autre from public.clients c where c.id = v_veh.reserve_client_id;
    perform prive.erreur(format('Ce véhicule est déjà réservé pour %s.', v_autre));
  end if;
  if p_jusqu_au is not null and p_jusqu_au < current_date then
    perform prive.erreur('La date limite de réservation est déjà passée.', '22023');
  end if;

  update public.vehicules
     set statut_commercial = 'reserve', reserve_client_id = p_client_id, reserve_jusqu_au = p_jusqu_au, updated_at = now()
   where id = p_id;

  perform prive.journaliser(p_org, 'vehicule_reserver', 'vehicule', p_id,
    jsonb_build_object('reference', v_veh.reference, 'client_id', p_client_id, 'client_nom', v_cli.nom, 'jusqu_au', p_jusqu_au));

  return public.vehicule_obtenir(p_org, p_id);
end
$$;

create or replace function public.vehicule_liberer(p_org uuid, p_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_veh public.vehicules%rowtype;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'vendeur']);
  select * into v_veh from public.vehicules v where v.id = p_id and v.org_id = p_org for update;
  if v_veh.id is null then
    perform prive.introuvable('Véhicule');
  end if;
  if v_veh.statut_commercial <> 'reserve' then
    perform prive.erreur('Ce véhicule n''est pas réservé.');
  end if;
  update public.vehicules
     set statut_commercial = 'disponible', reserve_client_id = null, reserve_jusqu_au = null, updated_at = now()
   where id = p_id;
  perform prive.journaliser(p_org, 'vehicule_liberer', 'vehicule', p_id,
    jsonb_build_object('reference', v_veh.reference, 'client_id', v_veh.reserve_client_id));
  return public.vehicule_obtenir(p_org, p_id);
end
$$;

create or replace function public.vehicule_archiver(p_org uuid, p_id uuid, p_archive boolean default true)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_veh public.vehicules%rowtype;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant']);
  select * into v_veh from public.vehicules v where v.id = p_id and v.org_id = p_org for update;
  if v_veh.id is null then
    perform prive.introuvable('Véhicule');
  end if;
  if coalesce(p_archive, true) and v_veh.statut_commercial = 'reserve' then
    perform prive.erreur('Levez la réservation avant d''archiver ce véhicule.');
  end if;
  update public.vehicules set archive = coalesce(p_archive, true), updated_at = now() where id = p_id;
  perform prive.journaliser(p_org, case when coalesce(p_archive, true) then 'vehicule_archiver' else 'vehicule_desarchiver' end,
    'vehicule', p_id, jsonb_build_object('reference', v_veh.reference));
  return public.vehicule_obtenir(p_org, p_id);
end
$$;

create or replace function public.vehicule_photo_ajouter(p_org uuid, p_vehicule_id uuid, p_path text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_veh   public.vehicules%rowtype;
  v_photo public.vehicule_photos%rowtype;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant']);
  select * into v_veh from public.vehicules v where v.id = p_vehicule_id and v.org_id = p_org for update;
  if v_veh.id is null then
    perform prive.introuvable('Véhicule');
  end if;
  if p_path is null or p_path not like p_org::text || '/%' or p_path like '%..%' then
    perform prive.erreur('Chemin de photo invalide : il doit commencer par l''identifiant de l''entreprise.', '22023');
  end if;

  insert into public.vehicule_photos (org_id, vehicule_id, path, ordre)
  values (p_org, p_vehicule_id, p_path,
          coalesce((select max(ph.ordre) + 1 from public.vehicule_photos ph where ph.vehicule_id = p_vehicule_id), 0))
  returning * into v_photo;

  if v_veh.photo_principale_path is null then
    update public.vehicules set photo_principale_path = p_path, updated_at = now() where id = p_vehicule_id;
  end if;

  perform prive.journaliser(p_org, 'photo_ajouter', 'vehicule', p_vehicule_id, jsonb_build_object('path', p_path));

  return jsonb_build_object('id', v_photo.id, 'vehicule_id', p_vehicule_id, 'path', v_photo.path, 'ordre', v_photo.ordre,
                            'principale', v_veh.photo_principale_path is null);
end
$$;

create or replace function public.vehicule_photo_supprimer(p_org uuid, p_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_photo public.vehicule_photos%rowtype;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant']);
  delete from public.vehicule_photos ph where ph.id = p_id and ph.org_id = p_org returning * into v_photo;
  if v_photo.id is null then
    perform prive.introuvable('Photo');
  end if;
  update public.vehicules v
     set photo_principale_path = (select ph.path from public.vehicule_photos ph
                                   where ph.vehicule_id = v.id order by ph.ordre, ph.created_at limit 1),
         updated_at = now()
   where v.id = v_photo.vehicule_id and v.photo_principale_path = v_photo.path;
  perform prive.journaliser(p_org, 'photo_supprimer', 'vehicule', v_photo.vehicule_id, jsonb_build_object('path', v_photo.path));
  return jsonb_build_object('id', p_id, 'vehicule_id', v_photo.vehicule_id, 'path', v_photo.path, 'supprime', true);
end
$$;

create or replace function public.vehicule_photo_ordonner(p_org uuid, p_vehicule_id uuid, p_ids uuid[])
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant']);
  if not exists (select 1 from public.vehicules v where v.id = p_vehicule_id and v.org_id = p_org) then
    perform prive.introuvable('Véhicule');
  end if;
  if p_ids is null or exists (
       select 1 from unnest(p_ids) x
        where not exists (select 1 from public.vehicule_photos ph
                           where ph.id = x and ph.vehicule_id = p_vehicule_id and ph.org_id = p_org)) then
    perform prive.introuvable('Photo');
  end if;

  update public.vehicule_photos ph
     set ordre = o.pos - 1
    from unnest(p_ids) with ordinality as o(id, pos)
   where ph.id = o.id and ph.vehicule_id = p_vehicule_id;

  update public.vehicules v
     set photo_principale_path = (select ph.path from public.vehicule_photos ph
                                   where ph.vehicule_id = v.id order by ph.ordre, ph.created_at limit 1),
         updated_at = now()
   where v.id = p_vehicule_id;

  return coalesce((
    select jsonb_agg(jsonb_build_object('id', ph.id, 'path', ph.path, 'ordre', ph.ordre) order by ph.ordre, ph.created_at)
      from public.vehicule_photos ph where ph.vehicule_id = p_vehicule_id), '[]'::jsonb);
end
$$;

create or replace function public.document_ajouter(p_org uuid, p_data jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_veh  uuid := prive.j_uuid(p_data, 'vehicule_id');
  v_ven  uuid := prive.j_uuid(p_data, 'vente_id');
  v_exp  uuid := prive.j_uuid(p_data, 'expedition_id');
  v_type text := coalesce(prive.j_texte(p_data, 'type'), 'autre');
  v_nom  text := prive.j_texte(p_data, 'nom');
  v_path text := prive.j_texte(p_data, 'path');
  v_doc  public.documents%rowtype;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'comptable']);
  perform prive.valeur_parmi(v_type, array['bl', 'titre', 'facture_achat', 'declaration_douane', 'carte_grise', 'autre'], 'type');
  if num_nonnulls(v_veh, v_ven, v_exp) > 1 then
    perform prive.erreur('Un document est rattaché à un seul élément (véhicule, vente ou expédition).', '22023');
  end if;
  if v_veh is not null and not exists (select 1 from public.vehicules v where v.id = v_veh and v.org_id = p_org) then
    perform prive.introuvable('Véhicule');
  end if;
  if v_ven is not null and not exists (select 1 from public.ventes v where v.id = v_ven and v.org_id = p_org) then
    perform prive.introuvable('Vente');
  end if;
  if v_exp is not null and not exists (select 1 from public.expeditions e where e.id = v_exp and e.org_id = p_org) then
    perform prive.introuvable('Expédition');
  end if;
  if v_nom is null then
    perform prive.erreur('Le nom du document est obligatoire.', '22023');
  end if;
  if v_path is null or v_path not like p_org::text || '/%' or v_path like '%..%' then
    perform prive.erreur('Chemin de fichier invalide : il doit commencer par l''identifiant de l''entreprise.', '22023');
  end if;

  insert into public.documents (org_id, vehicule_id, vente_id, expedition_id, type, nom, path, taille, created_by)
  values (p_org, v_veh, v_ven, v_exp, v_type, v_nom, v_path, prive.j_entier(p_data, 'taille'), auth.uid())
  returning * into v_doc;

  perform prive.journaliser(p_org, 'document_ajouter', 'document', v_doc.id,
    jsonb_build_object('nom', v_nom, 'type', v_type, 'vehicule_id', v_veh, 'vente_id', v_ven, 'expedition_id', v_exp));

  return to_jsonb(v_doc) - 'org_id' - 'created_by';
end
$$;

create or replace function public.document_supprimer(p_org uuid, p_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_doc public.documents%rowtype;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'comptable']);
  delete from public.documents d where d.id = p_id and d.org_id = p_org returning * into v_doc;
  if v_doc.id is null then
    perform prive.introuvable('Document');
  end if;
  perform prive.journaliser(p_org, 'document_supprimer', 'document', p_id, jsonb_build_object('nom', v_doc.nom, 'path', v_doc.path));
  return jsonb_build_object('id', p_id, 'path', v_doc.path, 'supprime', true);
end
$$;

-- =============================================================================
-- Frais
-- =============================================================================

create or replace function public.frais_lister(p_org uuid, p_filtres jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_portee text;
  v_veh    uuid;
  v_exp    uuid;
  v_statut text;
  v_cat    text;
  v_compte uuid;
  v_du     date;
  v_au     date;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'vendeur', 'comptable', 'lecture']);
  perform prive.exiger_couts(p_org);
  v_portee := prive.valeur_parmi(prive.j_texte(p_filtres, 'portee'), array['vehicule', 'expedition', 'generale'], 'portee');
  v_veh := prive.j_uuid(p_filtres, 'vehicule_id');
  v_exp := prive.j_uuid(p_filtres, 'expedition_id');
  v_statut := prive.valeur_parmi(prive.j_texte(p_filtres, 'statut'), array['paye', 'a_payer'], 'statut');
  v_cat := prive.j_texte(p_filtres, 'categorie');
  v_compte := prive.j_uuid(p_filtres, 'compte_id');
  v_du := prive.j_date(p_filtres, 'du');
  v_au := prive.j_date(p_filtres, 'au');

  return coalesce((
    select jsonb_agg(prive.frais_json(p_org, f) order by f.date desc, f.created_at desc)
      from public.frais f
     where f.org_id = p_org
       and (v_portee is null or f.portee = v_portee)
       and (v_veh is null or f.vehicule_id = v_veh)
       and (v_exp is null or f.expedition_id = v_exp)
       and (v_statut is null or f.statut = v_statut)
       and (v_cat is null or f.categorie = v_cat)
       and (v_compte is null or f.compte_id = v_compte)
       and (v_du is null or f.date >= v_du)
       and (v_au is null or f.date <= v_au)
  ), '[]'::jsonb);
end
$$;

create or replace function public.frais_enregistrer(p_org uuid, p_data jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  c_champs constant text[] := array[
    'id', 'portee', 'vehicule_id', 'expedition_id', 'categorie', 'libelle', 'montant', 'devise', 'taux',
    'repartition', 'fournisseur', 'date', 'statut', 'compte_id', 'piece_path'];
  v_p   jsonb;
  v_id  uuid;
  v_org uuid;
  v_old public.frais%rowtype;
  v_new public.frais%rowtype;
  v_modifies text[];
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'comptable']);
  v_p := prive.valider_types(p_data, 'public.frais'::regclass, c_champs);
  v_id := (v_p ->> 'id')::uuid;

  if v_id is not null then
    select f.org_id into v_org from public.frais f where f.id = v_id;
    if prive.id_existant(p_org, v_org) then
      select * into v_old from public.frais f where f.id = v_id for update;
    end if;
  end if;

  if v_old.id is null then
    v_new := jsonb_populate_record(null::public.frais, v_p);
    v_new.id := coalesce(v_id, gen_random_uuid());
    v_new.org_id := p_org;
    v_new.portee := coalesce(v_new.portee,
                             case when v_new.vehicule_id is not null then 'vehicule'
                                  when v_new.expedition_id is not null then 'expedition'
                                  else 'generale' end);
    v_new.devise := coalesce(v_new.devise, 'XOF');
    v_new.statut := coalesce(v_new.statut, 'paye');
    v_new.date := coalesce(v_new.date, current_date);
  else
    v_new := jsonb_populate_record(v_old, v_p - 'id');
    if v_new.devise is distinct from v_old.devise and not (v_p ? 'taux') then
      v_new.taux := null;
    end if;
    v_new.devise := coalesce(v_new.devise, 'XOF');
    v_new.statut := coalesce(v_new.statut, 'paye');
    v_new.date := coalesce(v_new.date, v_old.date);
  end if;

  perform prive.valeur_parmi(v_new.portee, array['vehicule', 'expedition', 'generale'], 'portee');
  perform prive.valeur_parmi(v_new.devise, array['XOF', 'USD', 'EUR'], 'devise');
  perform prive.valeur_parmi(v_new.statut, array['paye', 'a_payer'], 'statut');
  perform prive.valeur_parmi(v_new.repartition, array['egale', 'valeur'], 'repartition');
  if v_new.categorie is null then
    perform prive.erreur('La catégorie du frais est obligatoire.', '22023');
  end if;
  if v_new.montant is null or v_new.montant <= 0 then
    perform prive.erreur('Le montant du frais doit être positif.', '22023');
  end if;

  if v_new.portee = 'vehicule' then
    if v_new.vehicule_id is null then
      perform prive.erreur('Choisissez le véhicule concerné par ce frais.', '22023');
    end if;
    if not exists (select 1 from public.vehicules v where v.id = v_new.vehicule_id and v.org_id = p_org) then
      perform prive.introuvable('Véhicule');
    end if;
    v_new.expedition_id := null;
    v_new.repartition := null;
  elsif v_new.portee = 'expedition' then
    if v_new.expedition_id is null then
      perform prive.erreur('Choisissez l''expédition concernée par ce frais.', '22023');
    end if;
    if not exists (select 1 from public.expeditions e where e.id = v_new.expedition_id and e.org_id = p_org) then
      perform prive.introuvable('Expédition');
    end if;
    v_new.vehicule_id := null;
    v_new.repartition := coalesce(v_new.repartition, 'egale');
  else
    v_new.vehicule_id := null;
    v_new.expedition_id := null;
    v_new.repartition := null;
  end if;

  if v_new.devise = 'XOF' then
    v_new.taux := 1;
  elsif v_new.taux is null then
    v_new.taux := prive.taux_devise(p_org, v_new.devise);
  end if;
  if v_new.taux <= 0 then
    perform prive.erreur('Le taux de change doit être positif.', '22023');
  end if;
  if v_new.compte_id is not null
     and not exists (select 1 from public.comptes c where c.id = v_new.compte_id and c.org_id = p_org) then
    perform prive.introuvable('Compte');
  end if;
  if v_new.piece_path is not null and (v_new.piece_path not like p_org::text || '/%' or v_new.piece_path like '%..%') then
    perform prive.erreur('Chemin de pièce justificative invalide.', '22023');
  end if;

  if v_old.id is null then
    insert into public.frais (id, org_id, portee, vehicule_id, expedition_id, categorie, libelle, montant, devise,
                              taux, repartition, fournisseur, date, statut, compte_id, piece_path, created_by)
    values (v_new.id, p_org, v_new.portee, v_new.vehicule_id, v_new.expedition_id, v_new.categorie, v_new.libelle,
            v_new.montant, v_new.devise, v_new.taux, v_new.repartition, v_new.fournisseur, v_new.date,
            v_new.statut, v_new.compte_id, v_new.piece_path, auth.uid());
    perform prive.journaliser(p_org, 'frais_creer', 'frais', v_new.id,
      jsonb_build_object('categorie', v_new.categorie, 'montant', v_new.montant, 'devise', v_new.devise,
                         'portee', v_new.portee, 'vehicule_id', v_new.vehicule_id, 'expedition_id', v_new.expedition_id));
  else
    select array_agg(n.key order by n.key) into v_modifies
      from jsonb_each(to_jsonb(v_new)) n
     where n.key not in ('montant_xof', 'updated_at') and n.value is distinct from to_jsonb(v_old) -> n.key;
    if v_modifies is not null then
      update public.frais set
        portee = v_new.portee, vehicule_id = v_new.vehicule_id, expedition_id = v_new.expedition_id,
        categorie = v_new.categorie, libelle = v_new.libelle, montant = v_new.montant, devise = v_new.devise,
        taux = v_new.taux, repartition = v_new.repartition, fournisseur = v_new.fournisseur, date = v_new.date,
        statut = v_new.statut, compte_id = v_new.compte_id, piece_path = v_new.piece_path, updated_at = now()
      where id = v_new.id;
      perform prive.journaliser(p_org, 'frais_modifier', 'frais', v_new.id, jsonb_build_object('champs', to_jsonb(v_modifies)));
    end if;
  end if;

  return (select prive.frais_json(p_org, f) from public.frais f where f.id = v_new.id);
end
$$;

create or replace function public.frais_supprimer(p_org uuid, p_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_f public.frais%rowtype;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'comptable']);
  delete from public.frais f where f.id = p_id and f.org_id = p_org returning * into v_f;
  if v_f.id is null then
    perform prive.introuvable('Frais');
  end if;
  perform prive.journaliser(p_org, 'frais_supprimer', 'frais', p_id,
    jsonb_build_object('categorie', v_f.categorie, 'montant', v_f.montant, 'devise', v_f.devise, 'montant_xof', v_f.montant_xof));
  return jsonb_build_object('id', p_id, 'piece_path', v_f.piece_path, 'supprime', true);
end
$$;

-- =============================================================================
-- Expéditions
-- =============================================================================

create or replace function public.expeditions_lister(p_org uuid, p_filtres jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_couts  boolean;
  v_statut text;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'vendeur', 'comptable', 'lecture']);
  v_couts := prive.voit_couts(p_org);
  v_statut := prive.valeur_parmi(prive.j_texte(p_filtres, 'statut'), array['preparation', 'en_mer', 'arrivee', 'cloturee'], 'statut');

  return coalesce((
    select jsonb_agg((to_jsonb(e) - 'org_id' - 'created_by')
                     || jsonb_build_object(
                          'nb_vehicules', (select count(*) from public.vehicules v where v.expedition_id = e.id),
                          'frais_xof', case when v_couts then
                              (select coalesce(sum(f.montant_xof), 0) from public.frais f where f.expedition_id = e.id) end,
                          'jours_avant_arrivee', case when e.statut in ('preparation', 'en_mer') and e.date_arrivee_prevue is not null
                                                     then e.date_arrivee_prevue - current_date end,
                          'vehicules', coalesce((
                              select jsonb_agg(jsonb_build_object('id', v.id, 'reference', v.reference,
                                                                  'libelle', concat_ws(' ', v.marque, v.modele, v.annee),
                                                                  'etape', v.etape, 'statut_commercial', v.statut_commercial)
                                               order by v.reference)
                                from public.vehicules v where v.expedition_id = e.id), '[]'::jsonb))
                     order by array_position(array['en_mer', 'preparation', 'arrivee', 'cloturee'], e.statut),
                              e.date_depart desc nulls first, e.created_at desc)
      from public.expeditions e
     where e.org_id = p_org and (v_statut is null or e.statut = v_statut)
  ), '[]'::jsonb);
end
$$;

create or replace function public.expedition_obtenir(p_org uuid, p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_couts boolean;
  v_exp   public.expeditions%rowtype;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'vendeur', 'comptable', 'lecture']);
  v_couts := prive.voit_couts(p_org);
  select * into v_exp from public.expeditions e where e.id = p_id and e.org_id = p_org;
  if v_exp.id is null then
    perform prive.introuvable('Expédition');
  end if;

  return (to_jsonb(v_exp) - 'org_id' - 'created_by') || jsonb_build_object(
    'jours_avant_arrivee', case when v_exp.statut in ('preparation', 'en_mer') and v_exp.date_arrivee_prevue is not null
                               then v_exp.date_arrivee_prevue - current_date end,
    'vehicules', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', v.id, 'reference', v.reference, 'libelle', concat_ws(' ', v.marque, v.modele, v.annee),
               'marque', v.marque, 'modele', v.modele, 'annee', v.annee, 'vin', v.vin, 'etape', v.etape,
               'statut_commercial', v.statut_commercial, 'photo_principale_path', v.photo_principale_path,
               'achat_xof', case when v_couts then v.achat_xof end,
               'part_frais_xof', case when v_couts then
                   (select coalesce(sum(pe.part_xof), 0) from prive.parts_expedition(p_org) pe
                     where pe.vehicule_id = v.id and pe.expedition_id = p_id) end)
             order by v.reference, v.id)
        from public.vehicules v
       where v.org_id = p_org and v.expedition_id = p_id), '[]'::jsonb),
    'frais', case when v_couts then coalesce((
      select jsonb_agg(prive.frais_json(p_org, f) || jsonb_build_object(
               'parts', coalesce((
                 select jsonb_agg(jsonb_build_object('vehicule_id', pe.vehicule_id, 'vehicule_reference', v.reference,
                                                     'part_xof', pe.part_xof)
                                  order by v.reference, v.id)
                   from prive.parts_expedition(p_org) pe
                   join public.vehicules v on v.id = pe.vehicule_id
                  where pe.frais_id = f.id), '[]'::jsonb))
             order by f.date, f.created_at)
        from public.frais f
       where f.org_id = p_org and f.expedition_id = p_id), '[]'::jsonb) end,
    'total_frais_xof', case when v_couts then
      (select coalesce(sum(f.montant_xof), 0) from public.frais f where f.org_id = p_org and f.expedition_id = p_id) end,
    'documents', coalesce((
      select jsonb_agg(to_jsonb(d) - 'org_id' - 'created_by' order by d.created_at desc)
        from public.documents d where d.org_id = p_org and d.expedition_id = p_id), '[]'::jsonb)
  );
end
$$;

create or replace function public.expedition_enregistrer(p_org uuid, p_data jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  c_champs constant text[] := array[
    'id', 'reference', 'mode', 'numero_conteneur', 'numero_bl', 'compagnie', 'navire', 'port_depart',
    'port_arrivee', 'date_depart', 'date_arrivee_prevue', 'date_arrivee_reelle', 'notes'];
  v_p   jsonb;
  v_id  uuid;
  v_org uuid;
  v_old public.expeditions%rowtype;
  v_new public.expeditions%rowtype;
  v_modifies text[];
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant']);
  v_p := prive.valider_types(p_data, 'public.expeditions'::regclass, c_champs);
  v_id := (v_p ->> 'id')::uuid;

  if v_id is not null then
    select e.org_id into v_org from public.expeditions e where e.id = v_id;
    if prive.id_existant(p_org, v_org) then
      select * into v_old from public.expeditions e where e.id = v_id for update;
    end if;
  end if;

  if v_old.id is null then
    v_new := jsonb_populate_record(null::public.expeditions, v_p);
    v_new.id := coalesce(v_id, gen_random_uuid());
    v_new.org_id := p_org;
    v_new.mode := coalesce(v_new.mode, 'conteneur');
    v_new.statut := 'preparation';
  else
    v_new := jsonb_populate_record(v_old, v_p - 'id');
    v_new.mode := coalesce(v_new.mode, v_old.mode);
    v_new.reference := coalesce(v_new.reference, v_old.reference);
  end if;

  perform prive.valeur_parmi(v_new.mode, array['conteneur', 'roro'], 'mode');
  v_new.numero_conteneur := upper(regexp_replace(v_new.numero_conteneur, '\s', '', 'g'));
  if v_new.date_depart is not null and v_new.date_arrivee_prevue is not null and v_new.date_arrivee_prevue < v_new.date_depart then
    perform prive.erreur('La date d''arrivée prévue précède la date de départ.', '22023');
  end if;
  if v_new.date_depart is not null and v_new.date_arrivee_reelle is not null and v_new.date_arrivee_reelle < v_new.date_depart then
    perform prive.erreur('La date d''arrivée précède la date de départ.', '22023');
  end if;
  if v_new.reference is not null then
    if length(v_new.reference) > 40 then
      perform prive.erreur('La référence est trop longue (40 caractères au plus).', '22023');
    end if;
    if exists (select 1 from public.expeditions e where e.org_id = p_org and e.reference = v_new.reference and e.id <> v_new.id) then
      perform prive.erreur(format('La référence d''expédition « %s » existe déjà.', v_new.reference));
    end if;
  end if;

  if v_old.id is null then
    v_new.reference := coalesce(v_new.reference, prive.prochain_numero(p_org, 'expedition', current_date));
    insert into public.expeditions (id, org_id, reference, mode, numero_conteneur, numero_bl, compagnie, navire,
                                    port_depart, port_arrivee, date_depart, date_arrivee_prevue,
                                    date_arrivee_reelle, statut, notes, created_by)
    values (v_new.id, p_org, v_new.reference, v_new.mode, v_new.numero_conteneur, v_new.numero_bl, v_new.compagnie,
            v_new.navire, v_new.port_depart, v_new.port_arrivee, v_new.date_depart, v_new.date_arrivee_prevue,
            v_new.date_arrivee_reelle, 'preparation', v_new.notes, auth.uid());
    perform prive.journaliser(p_org, 'expedition_creer', 'expedition', v_new.id, jsonb_build_object('reference', v_new.reference));
  else
    select array_agg(n.key order by n.key) into v_modifies
      from jsonb_each(to_jsonb(v_new)) n
     where n.key <> 'updated_at' and n.value is distinct from to_jsonb(v_old) -> n.key;
    if v_modifies is not null then
      update public.expeditions set
        reference = v_new.reference, mode = v_new.mode, numero_conteneur = v_new.numero_conteneur,
        numero_bl = v_new.numero_bl, compagnie = v_new.compagnie, navire = v_new.navire,
        port_depart = v_new.port_depart, port_arrivee = v_new.port_arrivee, date_depart = v_new.date_depart,
        date_arrivee_prevue = v_new.date_arrivee_prevue, date_arrivee_reelle = v_new.date_arrivee_reelle,
        notes = v_new.notes, updated_at = now()
      where id = v_new.id;
      perform prive.journaliser(p_org, 'expedition_modifier', 'expedition', v_new.id,
        jsonb_build_object('reference', v_new.reference, 'champs', to_jsonb(v_modifies)));
    end if;
  end if;

  return public.expedition_obtenir(p_org, v_new.id);
end
$$;

-- Remplace la liste des véhicules de l'expédition par p_vehicule_ids.
create or replace function public.expedition_affecter(p_org uuid, p_id uuid, p_vehicule_ids uuid[])
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_exp   public.expeditions%rowtype;
  v_ids   uuid[] := coalesce(p_vehicule_ids, '{}');
  v_ajout integer;
  v_ret   integer;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant']);
  select * into v_exp from public.expeditions e where e.id = p_id and e.org_id = p_org for update;
  if v_exp.id is null then
    perform prive.introuvable('Expédition');
  end if;
  if v_exp.statut = 'cloturee' then
    perform prive.erreur('Cette expédition est clôturée : rouvrez-la pour modifier ses véhicules.');
  end if;
  if exists (select 1 from unnest(v_ids) x
              where not exists (select 1 from public.vehicules v where v.id = x and v.org_id = p_org)) then
    perform prive.introuvable('Véhicule');
  end if;

  update public.vehicules v set expedition_id = null, updated_at = now()
   where v.org_id = p_org and v.expedition_id = p_id and not (v.id = any (v_ids));
  get diagnostics v_ret = row_count;

  update public.vehicules v set expedition_id = p_id, updated_at = now()
   where v.org_id = p_org and v.id = any (v_ids) and v.expedition_id is distinct from p_id;
  get diagnostics v_ajout = row_count;

  if v_ajout > 0 or v_ret > 0 then
    perform prive.journaliser(p_org, 'expedition_affecter', 'expedition', p_id,
      jsonb_build_object('reference', v_exp.reference, 'vehicule_ids', to_jsonb(v_ids), 'ajoutes', v_ajout, 'retires', v_ret));
  end if;

  return public.expedition_obtenir(p_org, p_id);
end
$$;

-- Change le statut et propage l'étape aux véhicules qui n'ont pas encore
-- dépassé l'étape correspondante : en_mer -> « en_mer », arrivee -> « au_port ».
create or replace function public.expedition_changer_statut(p_org uuid, p_id uuid, p_statut text, p_date date default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_exp   public.expeditions%rowtype;
  v_date  date := coalesce(p_date, current_date);
  v_etape text;
  v_veh   record;
  v_nb    integer := 0;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant']);
  if p_statut is null then
    perform prive.erreur('Le statut est obligatoire.', '22023');
  end if;
  perform prive.valeur_parmi(p_statut, array['preparation', 'en_mer', 'arrivee', 'cloturee'], 'statut');
  if v_date > current_date then
    perform prive.erreur('La date ne peut pas être dans le futur.', '22023');
  end if;
  select * into v_exp from public.expeditions e where e.id = p_id and e.org_id = p_org for update;
  if v_exp.id is null then
    perform prive.introuvable('Expédition');
  end if;
  if p_statut = 'arrivee' and v_exp.date_depart is not null and v_date < v_exp.date_depart then
    perform prive.erreur('La date d''arrivée précède la date de départ.', '22023');
  end if;

  update public.expeditions e set
    statut = p_statut,
    date_depart = case when p_statut = 'en_mer' then v_date else e.date_depart end,
    date_arrivee_reelle = case when p_statut = 'arrivee' then v_date
                               when p_statut in ('preparation', 'en_mer') then null
                               else e.date_arrivee_reelle end,
    updated_at = now()
  where e.id = p_id;

  v_etape := case p_statut when 'en_mer' then 'en_mer' when 'arrivee' then 'au_port' end;
  if v_etape is not null then
    for v_veh in
      select v.id from public.vehicules v
       where v.org_id = p_org and v.expedition_id = p_id and not v.archive
         and prive.rang_etape(v.etape) < prive.rang_etape(v_etape)
       order by v.reference
    loop
      perform prive.changer_etape(p_org, v_veh.id, v_etape, v_date,
        format('Expédition %s : %s', v_exp.reference, case p_statut when 'en_mer' then 'départ' else 'arrivée au port' end),
        false);
      v_nb := v_nb + 1;
    end loop;
  end if;

  perform prive.journaliser(p_org, 'expedition_statut', 'expedition', p_id,
    jsonb_build_object('reference', v_exp.reference, 'de', v_exp.statut, 'vers', p_statut, 'date', v_date,
                       'vehicules_mis_a_jour', v_nb));

  return public.expedition_obtenir(p_org, p_id) || jsonb_build_object('vehicules_mis_a_jour', v_nb);
end
$$;

-- =============================================================================
-- Clients et demandes
-- =============================================================================

create or replace function public.clients_lister(p_org uuid, p_recherche text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_q      text := nullif(btrim(p_recherche), '');
  v_motif  text;
  v_chiff  text;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'vendeur', 'comptable', 'lecture']);
  v_motif := prive.motif_contient(v_q);
  v_chiff := regexp_replace(coalesce(v_q, ''), '\D', '', 'g');

  return coalesce((
    select jsonb_agg(prive.client_json(c) || jsonb_build_object(
             'nb_achats', coalesce(s.nb, 0),
             'total_achats_xof', coalesce(s.total, 0),
             'reste_du_xof', coalesce(s.reste, 0),
             'derniere_vente', s.derniere,
             'nb_demandes_ouvertes', coalesce(d.nb, 0))
           order by lower(c.nom), c.id)
      from public.clients c
      left join (
        select ve.client_id, count(*) as nb, sum(ve.montant_ttc) as total, sum(e.reste_xof) as reste, max(ve.date_vente) as derniere
          from public.ventes ve
          join prive.ventes_etat(p_org) e on e.vente_id = ve.id
         where ve.org_id = p_org and ve.statut = 'active'
         group by ve.client_id
      ) s on s.client_id = c.id
      left join (
        select dm.client_id, count(*) as nb from public.demandes dm
         where dm.org_id = p_org and dm.statut = 'ouverte' group by dm.client_id
      ) d on d.client_id = c.id
     where c.org_id = p_org
       and (v_q is null
            or c.nom ilike v_motif
            or c.telephone ilike v_motif
            or c.whatsapp ilike v_motif
            or c.email ilike v_motif
            or c.numero_piece ilike v_motif
            or c.ville ilike v_motif
            or (length(v_chiff) >= 4 and regexp_replace(coalesce(c.telephone, '') || ' ' || coalesce(c.whatsapp, ''), '\D', '', 'g')
                                         like '%' || v_chiff || '%'))
  ), '[]'::jsonb);
end
$$;

create or replace function public.client_obtenir(p_org uuid, p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_cli public.clients%rowtype;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'vendeur', 'comptable', 'lecture']);
  select * into v_cli from public.clients c where c.id = p_id and c.org_id = p_org;
  if v_cli.id is null then
    perform prive.introuvable('Client');
  end if;

  return prive.client_json(v_cli) || jsonb_build_object(
    'ventes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', ve.id, 'numero', ve.numero, 'date_vente', ve.date_vente, 'date_livraison', ve.date_livraison,
               'statut', ve.statut, 'numero_avoir', ve.numero_avoir, 'montant_ttc', ve.montant_ttc,
               'encaisse_xof', e.encaisse_xof, 'reste_xof', e.reste_xof, 'statut_paiement', e.statut_paiement,
               'retard_xof', e.retard_xof, 'vehicule_id', v.id, 'vehicule_reference', v.reference,
               'vehicule_libelle', concat_ws(' ', v.marque, v.modele, v.annee))
             order by ve.date_vente desc, ve.created_at desc)
        from public.ventes ve
        join prive.ventes_etat(p_org) e on e.vente_id = ve.id
        join public.vehicules v on v.id = ve.vehicule_id
       where ve.org_id = p_org and ve.client_id = p_id), '[]'::jsonb),
    'paiements', coalesce((
      select jsonb_agg(prive.paiement_json(pa) order by pa.date desc, pa.created_at desc)
        from public.paiements pa join public.ventes ve on ve.id = pa.vente_id
       where pa.org_id = p_org and ve.client_id = p_id), '[]'::jsonb),
    'proformas', coalesce((
      select jsonb_agg(prive.proforma_json(pr) order by pr.created_at desc)
        from public.proformas pr where pr.org_id = p_org and pr.client_id = p_id), '[]'::jsonb),
    'demandes', coalesce((
      select jsonb_agg((to_jsonb(dm) - 'org_id' - 'created_by')
                       || jsonb_build_object('nb_correspondances',
                            (select count(*) from prive.correspondances(p_org) co where co.demande_id = dm.id))
                       order by dm.statut = 'ouverte' desc, dm.created_at desc)
        from public.demandes dm where dm.org_id = p_org and dm.client_id = p_id), '[]'::jsonb),
    'reservations', coalesce((
      select jsonb_agg(jsonb_build_object('vehicule_id', v.id, 'reference', v.reference,
                                          'libelle', concat_ws(' ', v.marque, v.modele, v.annee),
                                          'reserve_jusqu_au', v.reserve_jusqu_au, 'etape', v.etape)
                       order by v.reference)
        from public.vehicules v
       where v.org_id = p_org and v.statut_commercial = 'reserve' and v.reserve_client_id = p_id), '[]'::jsonb),
    'total_achats_xof', coalesce((select sum(ve.montant_ttc) from public.ventes ve
                                   where ve.org_id = p_org and ve.client_id = p_id and ve.statut = 'active'), 0),
    'reste_du_xof', coalesce((select sum(e.reste_xof) from prive.ventes_etat(p_org) e
                               join public.ventes ve on ve.id = e.vente_id
                              where ve.client_id = p_id and ve.statut = 'active'), 0)
  );
end
$$;

create or replace function public.client_enregistrer(p_org uuid, p_data jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  c_champs constant text[] := array['id', 'nom', 'telephone', 'whatsapp', 'email', 'ville', 'adresse',
                                    'type_piece', 'numero_piece', 'notes'];
  v_p   jsonb;
  v_id  uuid;
  v_org uuid;
  v_old public.clients%rowtype;
  v_new public.clients%rowtype;
  v_modifies text[];
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'vendeur']);
  v_p := prive.valider_types(p_data, 'public.clients'::regclass, c_champs);
  v_id := (v_p ->> 'id')::uuid;

  if v_id is not null then
    select c.org_id into v_org from public.clients c where c.id = v_id;
    if prive.id_existant(p_org, v_org) then
      select * into v_old from public.clients c where c.id = v_id for update;
    end if;
  end if;

  if v_old.id is null then
    v_new := jsonb_populate_record(null::public.clients, v_p);
    v_new.id := coalesce(v_id, gen_random_uuid());
    v_new.org_id := p_org;
  else
    v_new := jsonb_populate_record(v_old, v_p - 'id');
  end if;

  if v_new.nom is null then
    perform prive.erreur('Le nom du client est obligatoire.', '22023');
  end if;
  if length(v_new.nom) > 160 then
    perform prive.erreur('Le nom du client est trop long.', '22023');
  end if;
  perform prive.valeur_parmi(v_new.type_piece, array['NINA', 'CNI', 'passeport', 'autre'], 'type_piece');

  if v_old.id is null then
    insert into public.clients (id, org_id, nom, telephone, whatsapp, email, ville, adresse, type_piece, numero_piece, notes, created_by)
    values (v_new.id, p_org, v_new.nom, v_new.telephone, v_new.whatsapp, v_new.email, v_new.ville, v_new.adresse,
            v_new.type_piece, v_new.numero_piece, v_new.notes, auth.uid());
    perform prive.journaliser(p_org, 'client_creer', 'client', v_new.id, jsonb_build_object('nom', v_new.nom));
  else
    select array_agg(n.key order by n.key) into v_modifies
      from jsonb_each(to_jsonb(v_new)) n
     where n.key <> 'updated_at' and n.value is distinct from to_jsonb(v_old) -> n.key;
    if v_modifies is not null then
      update public.clients set
        nom = v_new.nom, telephone = v_new.telephone, whatsapp = v_new.whatsapp, email = v_new.email,
        ville = v_new.ville, adresse = v_new.adresse, type_piece = v_new.type_piece,
        numero_piece = v_new.numero_piece, notes = v_new.notes, updated_at = now()
      where id = v_new.id;
      perform prive.journaliser(p_org, 'client_modifier', 'client', v_new.id,
        jsonb_build_object('nom', v_new.nom, 'champs', to_jsonb(v_modifies)));
    end if;
  end if;

  return (select prive.client_json(c) from public.clients c where c.id = v_new.id);
end
$$;

create or replace function public.client_supprimer(p_org uuid, p_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_cli public.clients%rowtype;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant']);
  select * into v_cli from public.clients c where c.id = p_id and c.org_id = p_org for update;
  if v_cli.id is null then
    perform prive.introuvable('Client');
  end if;
  if exists (select 1 from public.ventes v where v.client_id = p_id)
     or exists (select 1 from public.proformas p where p.client_id = p_id) then
    perform prive.erreur('Ce client a des ventes ou des proformas : il ne peut pas être supprimé.');
  end if;
  if exists (select 1 from public.vehicules v where v.reserve_client_id = p_id) then
    perform prive.erreur('Un véhicule est réservé pour ce client : levez la réservation d''abord.');
  end if;
  delete from public.clients c where c.id = p_id;
  perform prive.journaliser(p_org, 'client_supprimer', 'client', p_id, jsonb_build_object('nom', v_cli.nom));
  return jsonb_build_object('id', p_id, 'supprime', true);
end
$$;

create or replace function public.demande_enregistrer(p_org uuid, p_data jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  c_champs constant text[] := array['id', 'client_id', 'marque', 'modele', 'annee_min', 'annee_max',
                                    'budget_max_xof', 'notes', 'statut'];
  v_p   jsonb;
  v_id  uuid;
  v_org uuid;
  v_old public.demandes%rowtype;
  v_new public.demandes%rowtype;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'vendeur']);
  v_p := prive.valider_types(p_data, 'public.demandes'::regclass, c_champs);
  v_id := (v_p ->> 'id')::uuid;

  if v_id is not null then
    select d.org_id into v_org from public.demandes d where d.id = v_id;
    if prive.id_existant(p_org, v_org) then
      select * into v_old from public.demandes d where d.id = v_id for update;
    end if;
  end if;

  if v_old.id is null then
    v_new := jsonb_populate_record(null::public.demandes, v_p);
    v_new.id := coalesce(v_id, gen_random_uuid());
    v_new.org_id := p_org;
    v_new.statut := coalesce(v_new.statut, 'ouverte');
  else
    v_new := jsonb_populate_record(v_old, v_p - 'id');
    v_new.statut := coalesce(v_new.statut, v_old.statut);
  end if;

  if v_new.client_id is null then
    perform prive.erreur('Le client est obligatoire.', '22023');
  end if;
  if not exists (select 1 from public.clients c where c.id = v_new.client_id and c.org_id = p_org) then
    perform prive.introuvable('Client');
  end if;
  perform prive.valeur_parmi(v_new.statut, array['ouverte', 'satisfaite', 'abandonnee'], 'statut');
  if v_new.annee_min is not null and v_new.annee_max is not null and v_new.annee_min > v_new.annee_max then
    perform prive.erreur('L''année minimale dépasse l''année maximale.', '22023');
  end if;
  if (v_new.annee_min is not null and v_new.annee_min not between 1950 and 2100)
     or (v_new.annee_max is not null and v_new.annee_max not between 1950 and 2100) then
    perform prive.erreur('Année invalide.', '22023');
  end if;
  v_new.budget_max_xof := round(v_new.budget_max_xof);
  if v_new.budget_max_xof < 0 then
    perform prive.erreur('Le budget ne peut pas être négatif.', '22023');
  end if;

  if v_old.id is null then
    insert into public.demandes (id, org_id, client_id, marque, modele, annee_min, annee_max, budget_max_xof, notes, statut, created_by)
    values (v_new.id, p_org, v_new.client_id, v_new.marque, v_new.modele, v_new.annee_min, v_new.annee_max,
            v_new.budget_max_xof, v_new.notes, v_new.statut, auth.uid());
    perform prive.journaliser(p_org, 'demande_creer', 'demande', v_new.id,
      jsonb_build_object('client_id', v_new.client_id, 'marque', v_new.marque, 'modele', v_new.modele));
  elsif to_jsonb(v_new) - 'updated_at' is distinct from to_jsonb(v_old) - 'updated_at' then
    update public.demandes set
      client_id = v_new.client_id, marque = v_new.marque, modele = v_new.modele, annee_min = v_new.annee_min,
      annee_max = v_new.annee_max, budget_max_xof = v_new.budget_max_xof, notes = v_new.notes,
      statut = v_new.statut, updated_at = now()
    where id = v_new.id;
    perform prive.journaliser(p_org, 'demande_modifier', 'demande', v_new.id, jsonb_build_object('statut', v_new.statut));
  end if;

  return (select (to_jsonb(d) - 'org_id' - 'created_by')
                 || jsonb_build_object('client_nom', c.nom,
                                       'nb_correspondances', (select count(*) from prive.correspondances(p_org) co where co.demande_id = d.id))
            from public.demandes d join public.clients c on c.id = d.client_id
           where d.id = v_new.id);
end
$$;

create or replace function public.demandes_correspondances(p_org uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'vendeur', 'comptable', 'lecture']);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'demande', (to_jsonb(d) - 'org_id' - 'created_by')
                        || jsonb_build_object('client_nom', c.nom, 'client_telephone', c.telephone),
             'vehicule', jsonb_build_object(
                'id', v.id, 'reference', v.reference, 'libelle', concat_ws(' ', v.marque, v.modele, v.annee),
                'marque', v.marque, 'modele', v.modele, 'annee', v.annee, 'etape', v.etape,
                'statut_commercial', v.statut_commercial, 'prix_affiche_xof', v.prix_affiche_xof,
                'photo_principale_path', v.photo_principale_path,
                'date_arrivee_prevue', e.date_arrivee_prevue))
           order by d.created_at, v.reference)
      from prive.correspondances(p_org) co
      join public.demandes d on d.id = co.demande_id
      join public.clients c on c.id = d.client_id
      join public.vehicules v on v.id = co.vehicule_id
      left join public.expeditions e on e.id = v.expedition_id
  ), '[]'::jsonb);
end
$$;

-- =============================================================================
-- Ventes, proformas, encaissements
-- =============================================================================

create or replace function public.vente_obtenir(p_org uuid, p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_couts boolean;
  v_ve    public.ventes%rowtype;
  v_rev   numeric;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'vendeur', 'comptable', 'lecture']);
  v_couts := prive.voit_couts(p_org);
  select * into v_ve from public.ventes ve where ve.id = p_id and ve.org_id = p_org;
  if v_ve.id is null then
    perform prive.introuvable('Vente');
  end if;
  select c.prix_revient_xof into v_rev from prive.couts_vehicules(p_org) c where c.vehicule_id = v_ve.vehicule_id;

  return (to_jsonb(v_ve) - 'org_id' - 'created_by')
    || prive.etat_vente_json(p_org, p_id) - 'id' - 'numero' - 'statut' - 'montant_ttc'
    || jsonb_build_object(
      'livree', v_ve.date_livraison is not null,
      'client', (select prive.client_json(c) from public.clients c where c.id = v_ve.client_id),
      'vehicule', (select jsonb_build_object('id', v.id, 'reference', v.reference,
                                             'libelle', concat_ws(' ', v.marque, v.modele, v.annee),
                                             'marque', v.marque, 'modele', v.modele, 'annee', v.annee, 'vin', v.vin,
                                             'etape', v.etape, 'statut_commercial', v.statut_commercial,
                                             'photo_principale_path', v.photo_principale_path)
                     from public.vehicules v where v.id = v_ve.vehicule_id),
      'vendeur_nom', (select m.nom_affiche from public.membres m where m.org_id = p_org and m.user_id = v_ve.vendeur_id),
      'paiements', coalesce((
         select jsonb_agg(prive.paiement_json(pa) order by pa.date, pa.created_at)
           from public.paiements pa where pa.vente_id = p_id), '[]'::jsonb),
      'echeances', coalesce((
         select jsonb_agg(jsonb_build_object(
                  'id', ei.echeance_id, 'date_echeance', ei.date_echeance, 'montant_xof', ei.montant_xof,
                  'impute_xof', ei.impute_xof, 'reste_xof', ei.reste_xof,
                  'statut', case when ei.reste_xof = 0 then 'payee'
                                 when ei.en_retard then 'en_retard'
                                 when ei.impute_xof > 0 then 'partielle'
                                 else 'a_venir' end)
                  order by ei.date_echeance, ei.echeance_id)
           from prive.echeances_imputees(p_org) ei where ei.vente_id = p_id), '[]'::jsonb),
      'proforma', (select jsonb_build_object('id', pr.id, 'numero', pr.numero)
                     from public.proformas pr where pr.vente_id = p_id limit 1),
      'documents', coalesce((
         select jsonb_agg(to_jsonb(d) - 'org_id' - 'created_by' order by d.created_at desc)
           from public.documents d where d.vente_id = p_id), '[]'::jsonb),
      'prix_revient_xof', case when v_couts then v_rev end,
      'marge_xof', case when v_couts and v_ve.statut = 'active' then v_ve.montant_ht - v_rev end,
      'marge_pct', case when v_couts and v_ve.statut = 'active' and v_ve.montant_ht > 0
                        then round((v_ve.montant_ht - v_rev) * 100 / v_ve.montant_ht, 1) end
    );
end
$$;

create or replace function public.ventes_lister(p_org uuid, p_filtres jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_couts   boolean;
  v_statut  text;
  v_sp      text;
  v_du      date;
  v_au      date;
  v_client  uuid;
  v_veh     uuid;
  v_livree  boolean;
  v_q       text;
  v_motif   text;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'vendeur', 'comptable', 'lecture']);
  v_couts := prive.voit_couts(p_org);
  v_statut := prive.valeur_parmi(prive.j_texte(p_filtres, 'statut'), array['active', 'annulee'], 'statut');
  v_sp := prive.valeur_parmi(prive.j_texte(p_filtres, 'statut_paiement'), array['non_paye', 'partiel', 'paye'], 'statut_paiement');
  v_du := prive.j_date(p_filtres, 'du');
  v_au := prive.j_date(p_filtres, 'au');
  v_client := prive.j_uuid(p_filtres, 'client_id');
  v_veh := prive.j_uuid(p_filtres, 'vehicule_id');
  v_livree := prive.j_booleen(p_filtres, 'livree');
  v_q := prive.j_texte(p_filtres, 'q');
  v_motif := prive.motif_contient(v_q);

  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', ve.id, 'numero', ve.numero, 'date_vente', ve.date_vente, 'date_livraison', ve.date_livraison,
             'livree', ve.date_livraison is not null, 'statut', ve.statut, 'mode', ve.mode,
             'numero_avoir', ve.numero_avoir, 'client_id', c.id, 'client_nom', c.nom, 'client_telephone', c.telephone,
             'vehicule_id', v.id, 'vehicule_reference', v.reference,
             'vehicule_libelle', concat_ws(' ', v.marque, v.modele, v.annee), 'vehicule_etape', v.etape,
             'montant_ttc', ve.montant_ttc, 'montant_ht', ve.montant_ht,
             'encaisse_xof', e.encaisse_xof, 'reste_xof', e.reste_xof, 'statut_paiement', e.statut_paiement,
             'retard_xof', e.retard_xof, 'prochaine_echeance', e.prochaine_echeance,
             'prochaine_echeance_xof', e.prochaine_echeance_xof,
             'marge_xof', case when v_couts and ve.statut = 'active' then ve.montant_ht - cv.prix_revient_xof end)
           order by ve.date_vente desc, ve.created_at desc)
      from public.ventes ve
      join public.clients c on c.id = ve.client_id
      join public.vehicules v on v.id = ve.vehicule_id
      join prive.ventes_etat(p_org) e on e.vente_id = ve.id
      join prive.couts_vehicules(p_org) cv on cv.vehicule_id = ve.vehicule_id
     where ve.org_id = p_org
       and (v_statut is null or ve.statut = v_statut)
       and (v_sp is null or e.statut_paiement = v_sp)
       and (v_du is null or ve.date_vente >= v_du)
       and (v_au is null or ve.date_vente <= v_au)
       and (v_client is null or ve.client_id = v_client)
       and (v_veh is null or ve.vehicule_id = v_veh)
       and (v_livree is null or (ve.date_livraison is not null) = v_livree)
       and (v_q is null or ve.numero ilike v_motif or ve.numero_avoir ilike v_motif or c.nom ilike v_motif
            or v.reference ilike v_motif or concat_ws(' ', v.marque, v.modele, v.annee) ilike v_motif)
  ), '[]'::jsonb);
end
$$;

create or replace function public.vente_creer(p_org uuid, p_data jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_role      text;
  v_id        uuid;
  v_org       uuid;
  v_par       public.parametres%rowtype;
  v_client_id uuid;
  v_cli       public.clients%rowtype;
  v_veh       public.vehicules%rowtype;
  v_autre     text;
  v_prix      numeric;
  v_remise    numeric;
  v_ttc       numeric;
  v_ht        numeric;
  v_tva_taux  numeric;
  v_date      date;
  v_mode      text;
  v_vendeur   uuid;
  v_numero    text;
  v_vente     public.ventes%rowtype;
  v_acompte   jsonb;
  v_acompte_m numeric := 0;
  v_echs      jsonb;
  v_e         jsonb;
  v_e_date    date;
  v_e_mont    numeric;
  v_total     numeric := 0;
begin
  v_role := prive.exiger_role(p_org, array['proprietaire', 'gerant', 'vendeur']);
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    perform prive.erreur('Données de la vente manquantes.', '22023');
  end if;

  -- Idempotence : une vente déjà créée avec cet id est renvoyée telle quelle.
  v_id := prive.j_uuid(p_data, 'id');
  if v_id is not null then
    select ve.org_id into v_org from public.ventes ve where ve.id = v_id;
    if prive.id_existant(p_org, v_org) then
      return public.vente_obtenir(p_org, v_id);
    end if;
  end if;

  select * into v_par from public.parametres where org_id = p_org;

  -- Client : existant, ou créé à la volée depuis p_data.client
  v_client_id := prive.j_uuid(p_data, 'client_id');
  if v_client_id is null and jsonb_typeof(p_data -> 'client') = 'object' then
    v_client_id := (public.client_enregistrer(p_org, p_data -> 'client') ->> 'id')::uuid;
  end if;
  if v_client_id is null then
    perform prive.erreur('Le client est obligatoire.', '22023');
  end if;
  select * into v_cli from public.clients c where c.id = v_client_id and c.org_id = p_org;
  if v_cli.id is null then
    perform prive.introuvable('Client');
  end if;

  -- Véhicule (verrouillé jusqu'à la fin de la transaction)
  select * into v_veh from public.vehicules v
   where v.id = prive.j_uuid(p_data, 'vehicule_id') and v.org_id = p_org
     for update;
  if v_veh.id is null then
    perform prive.introuvable('Véhicule');
  end if;
  if v_veh.archive then
    perform prive.erreur('Ce véhicule est archivé : il ne peut pas être vendu.');
  end if;
  if v_veh.statut_commercial = 'vendu' then
    select ve.numero into v_autre from public.ventes ve where ve.vehicule_id = v_veh.id and ve.statut = 'active';
    perform prive.erreur(format('Ce véhicule est déjà vendu (facture %s).', coalesce(v_autre, '?')));
  end if;
  if v_veh.statut_commercial = 'reserve' and v_veh.reserve_client_id <> v_client_id
     and coalesce(v_veh.reserve_jusqu_au, current_date) >= current_date then
    select c.nom into v_autre from public.clients c where c.id = v_veh.reserve_client_id;
    perform prive.erreur(format('Ce véhicule est réservé pour %s : levez la réservation avant de le vendre à un autre client.', v_autre));
  end if;

  -- Prix
  v_prix := round(coalesce(prive.j_nombre(p_data, 'prix_xof'), v_veh.prix_affiche_xof));
  if v_prix is null or v_prix <= 0 then
    perform prive.erreur('Le prix de vente est obligatoire.', '22023');
  end if;
  v_remise := round(coalesce(prive.j_nombre(p_data, 'remise_xof'), 0));
  if v_remise < 0 or v_remise >= v_prix then
    perform prive.erreur('La remise doit être positive et inférieure au prix.', '22023');
  end if;
  v_ttc := v_prix - v_remise;
  if v_role = 'vendeur' and v_veh.prix_plancher_xof is not null and v_ttc < v_veh.prix_plancher_xof then
    perform prive.erreur('Prix en dessous du minimum autorisé pour ce véhicule : l''accord d''un gérant est nécessaire.');
  end if;
  v_tva_taux := case when v_par.tva_active then v_par.tva_taux else 0 end;
  v_ht := prive.hors_taxe(v_ttc, v_tva_taux);

  v_date := coalesce(prive.j_date(p_data, 'date_vente'), current_date);
  if v_date > current_date then
    perform prive.erreur('La date de vente ne peut pas être dans le futur.', '22023');
  end if;
  v_mode := coalesce(prive.j_texte(p_data, 'mode'), 'comptant');
  perform prive.valeur_parmi(v_mode, array['comptant', 'echelonne'], 'mode');
  v_vendeur := coalesce(prive.j_uuid(p_data, 'vendeur_id'), auth.uid());
  if not exists (select 1 from public.membres m where m.org_id = p_org and m.user_id = v_vendeur) then
    perform prive.introuvable('Vendeur');
  end if;

  -- Numéro attribué dans la transaction : en cas d'échec plus bas, rien n'est consommé.
  v_numero := prive.prochain_numero(p_org, 'facture', v_date);

  insert into public.ventes (id, org_id, numero, vehicule_id, client_id, vendeur_id, date_vente, prix_xof, remise_xof,
                             tva_taux, montant_ht, montant_tva, montant_ttc, mode, statut, token_verification,
                             snapshot, notes, created_by)
  values (coalesce(v_id, gen_random_uuid()), p_org, v_numero, v_veh.id, v_client_id, v_vendeur, v_date, v_prix, v_remise,
          v_tva_taux, v_ht, v_ttc - v_ht, v_ttc, v_mode, 'active',
          replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
          prive.snapshot_document(p_org, v_client_id, v_veh.id)
            || jsonb_build_object('vendeur_nom', (select m.nom_affiche from public.membres m
                                                   where m.org_id = p_org and m.user_id = v_vendeur),
                                  'tva_taux', v_tva_taux),
          prive.j_texte(p_data, 'notes'), auth.uid())
  returning * into v_vente;

  -- Acompte
  v_acompte := p_data -> 'acompte';
  if v_acompte is not null and jsonb_typeof(v_acompte) not in ('object', 'null') then
    perform prive.erreur('Champ « acompte » : objet attendu.', '22023');
  end if;
  if jsonb_typeof(v_acompte) = 'object' then
    v_acompte_m := round(coalesce(prive.j_nombre(v_acompte, 'montant_xof'), 0));
    if v_acompte_m < 0 then
      perform prive.erreur('L''acompte ne peut pas être négatif.', '22023');
    end if;
    if v_acompte_m > v_ttc then
      perform prive.erreur(format('L''acompte (%s) dépasse le montant de la vente (%s).', prive.fcfa(v_acompte_m), prive.fcfa(v_ttc)));
    end if;
    if v_acompte_m > 0 then
      perform prive.paiement_inserer(p_org, v_vente.id, v_acompte_m,
        coalesce(prive.j_date(v_acompte, 'date'), v_date), prive.j_texte(v_acompte, 'mode'),
        prive.j_texte(v_acompte, 'reference'), prive.j_uuid(v_acompte, 'compte_id'), prive.j_texte(v_acompte, 'notes'));
    end if;
  end if;

  -- Échéancier : l'acompte est la première échéance ; la somme doit faire le TTC.
  v_echs := p_data -> 'echeances';
  if v_mode = 'echelonne' then
    if v_echs is null or jsonb_typeof(v_echs) <> 'array' or jsonb_array_length(v_echs) = 0 then
      perform prive.erreur('Une vente échelonnée demande au moins une échéance.', '22023');
    end if;
    if v_acompte_m > 0 then
      insert into public.echeances (org_id, vente_id, date_echeance, montant_xof) values (p_org, v_vente.id, v_date, v_acompte_m);
      v_total := v_acompte_m;
    end if;
    for v_e in select x from jsonb_array_elements(v_echs) x loop
      if jsonb_typeof(v_e) <> 'object' then
        perform prive.erreur('Chaque échéance est un objet { date_echeance, montant_xof }.', '22023');
      end if;
      v_e_date := prive.j_date(v_e, 'date_echeance');
      v_e_mont := round(prive.j_nombre(v_e, 'montant_xof'));
      if v_e_date is null or v_e_mont is null or v_e_mont <= 0 then
        perform prive.erreur('Chaque échéance doit avoir une date et un montant positif.', '22023');
      end if;
      if v_e_date < v_date then
        perform prive.erreur('Une échéance ne peut pas précéder la date de vente.', '22023');
      end if;
      insert into public.echeances (org_id, vente_id, date_echeance, montant_xof) values (p_org, v_vente.id, v_e_date, v_e_mont);
      v_total := v_total + v_e_mont;
    end loop;
    if v_total <> v_ttc then
      perform prive.erreur(format('La somme de l''acompte et des échéances (%s) doit être égale au montant de la vente (%s).',
                                  prive.fcfa(v_total), prive.fcfa(v_ttc)));
    end if;
  elsif jsonb_typeof(v_echs) = 'array' and jsonb_array_length(v_echs) > 0 then
    perform prive.erreur('Les échéances ne s''utilisent qu''avec le mode « echelonne ».', '22023');
  end if;

  update public.vehicules
     set statut_commercial = 'vendu', reserve_client_id = null, reserve_jusqu_au = null, updated_at = now()
   where id = v_veh.id;

  perform prive.journaliser(p_org, 'vente_creer', 'vente', v_vente.id,
    jsonb_build_object('numero', v_numero, 'vehicule', v_veh.reference, 'client', v_cli.nom,
                       'montant_ttc', v_ttc, 'acompte', v_acompte_m, 'mode', v_mode));

  return public.vente_obtenir(p_org, v_vente.id);
end
$$;

create or replace function public.vente_annuler(p_org uuid, p_id uuid, p_motif text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_ve    public.ventes%rowtype;
  v_motif text := nullif(btrim(p_motif), '');
  v_avoir text;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant']);
  select * into v_ve from public.ventes ve where ve.id = p_id and ve.org_id = p_org for update;
  if v_ve.id is null then
    perform prive.introuvable('Vente');
  end if;
  if v_ve.statut = 'annulee' then
    perform prive.erreur(format('Cette vente est déjà annulée (avoir %s).', v_ve.numero_avoir));
  end if;
  if v_motif is null then
    perform prive.erreur('Le motif d''annulation est obligatoire.', '22023');
  end if;

  perform 1 from public.vehicules v where v.id = v_ve.vehicule_id for update;
  v_avoir := prive.prochain_numero(p_org, 'avoir', current_date);

  update public.ventes
     set statut = 'annulee', annulee_le = now(), annulee_par = auth.uid(), motif_annulation = v_motif, numero_avoir = v_avoir
   where id = p_id;

  update public.vehicules
     set statut_commercial = 'disponible', reserve_client_id = null, reserve_jusqu_au = null, updated_at = now()
   where id = v_ve.vehicule_id and statut_commercial = 'vendu';

  perform prive.journaliser(p_org, 'vente_annuler', 'vente', p_id,
    jsonb_build_object('numero', v_ve.numero, 'numero_avoir', v_avoir, 'motif', v_motif));

  return public.vente_obtenir(p_org, p_id);
end
$$;

create or replace function public.vente_livrer(p_org uuid, p_vente_id uuid, p_date date default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_ve   public.ventes%rowtype;
  v_date date := coalesce(p_date, current_date);
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'vendeur']);
  select * into v_ve from public.ventes ve where ve.id = p_vente_id and ve.org_id = p_org for update;
  if v_ve.id is null then
    perform prive.introuvable('Vente');
  end if;
  if v_ve.statut <> 'active' then
    perform prive.erreur('Cette vente est annulée.');
  end if;
  if v_date > current_date then
    perform prive.erreur('La date de livraison ne peut pas être dans le futur.', '22023');
  end if;
  if v_date < v_ve.date_vente then
    perform prive.erreur('La date de livraison précède la date de vente.', '22023');
  end if;
  update public.ventes set date_livraison = v_date where id = p_vente_id;
  perform prive.journaliser(p_org, 'vente_livrer', 'vente', p_vente_id,
    jsonb_build_object('numero', v_ve.numero, 'date_livraison', v_date, 'precedente', v_ve.date_livraison));
  return public.vente_obtenir(p_org, p_vente_id);
end
$$;

create or replace function public.paiement_ajouter(p_org uuid, p_data jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id       uuid;
  v_org      uuid;
  v_ve       public.ventes%rowtype;
  v_montant  numeric;
  v_encaisse numeric;
  v_p        public.paiements%rowtype;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'vendeur', 'comptable']);
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    perform prive.erreur('Données du paiement manquantes.', '22023');
  end if;

  v_id := prive.j_uuid(p_data, 'id');
  if v_id is not null then
    select pa.org_id into v_org from public.paiements pa where pa.id = v_id;
    if prive.id_existant(p_org, v_org) then
      select * into v_p from public.paiements pa where pa.id = v_id;
      return jsonb_build_object('paiement', prive.paiement_json(v_p), 'vente', prive.etat_vente_json(p_org, v_p.vente_id));
    end if;
  end if;

  select * into v_ve from public.ventes ve where ve.id = prive.j_uuid(p_data, 'vente_id') and ve.org_id = p_org for update;
  if v_ve.id is null then
    perform prive.introuvable('Vente');
  end if;
  v_montant := round(prive.j_nombre(p_data, 'montant_xof'));
  if v_montant is null or v_montant = 0 then
    perform prive.erreur('Le montant du paiement est obligatoire.', '22023');
  end if;
  select coalesce(sum(pa.montant_xof), 0) into v_encaisse
    from public.paiements pa where pa.vente_id = v_ve.id and not pa.annule;

  if v_ve.statut = 'active' then
    if v_montant < 0 then
      perform prive.erreur('Un remboursement n''est possible que sur une vente annulée ; pour corriger une erreur, annulez le paiement.');
    end if;
    if v_encaisse + v_montant > v_ve.montant_ttc then
      perform prive.erreur(format('Le paiement (%s) dépasse le reste à payer (%s).',
                                  prive.fcfa(v_montant), prive.fcfa(v_ve.montant_ttc - v_encaisse)));
    end if;
  else
    if v_montant > 0 then
      perform prive.erreur('Vente annulée : seul un remboursement (montant négatif) peut être enregistré.');
    end if;
    if v_encaisse + v_montant < 0 then
      perform prive.erreur(format('Le remboursement (%s) dépasse le montant encaissé (%s).',
                                  prive.fcfa(-v_montant), prive.fcfa(v_encaisse)));
    end if;
  end if;

  v_p := prive.paiement_inserer(p_org, v_ve.id, v_montant, prive.j_date(p_data, 'date'), prive.j_texte(p_data, 'mode'),
                                prive.j_texte(p_data, 'reference'), prive.j_uuid(p_data, 'compte_id'),
                                prive.j_texte(p_data, 'notes'), v_id);

  perform prive.journaliser(p_org, case when v_montant > 0 then 'paiement_ajouter' else 'remboursement_ajouter' end,
    'vente', v_ve.id,
    jsonb_build_object('numero_recu', v_p.numero_recu, 'montant_xof', v_montant, 'mode', v_p.mode, 'paiement_id', v_p.id));

  return jsonb_build_object('paiement', prive.paiement_json(v_p), 'vente', prive.etat_vente_json(p_org, v_ve.id));
end
$$;

create or replace function public.paiement_annuler(p_org uuid, p_id uuid, p_motif text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_p        public.paiements%rowtype;
  v_encaisse numeric;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'comptable']);
  select * into v_p from public.paiements pa where pa.id = p_id and pa.org_id = p_org for update;
  if v_p.id is null then
    perform prive.introuvable('Paiement');
  end if;
  if v_p.annule then
    perform prive.erreur('Ce paiement est déjà annulé.');
  end if;
  perform 1 from public.ventes ve where ve.id = v_p.vente_id for update;
  select coalesce(sum(pa.montant_xof), 0) into v_encaisse
    from public.paiements pa where pa.vente_id = v_p.vente_id and not pa.annule;
  if v_encaisse - v_p.montant_xof < 0 then
    perform prive.erreur('Annulez d''abord le remboursement : l''encaissé de la vente deviendrait négatif.');
  end if;

  update public.paiements
     set annule = true, annule_le = now(), annule_par = auth.uid(), motif_annulation = nullif(btrim(p_motif), '')
   where id = p_id
  returning * into v_p;

  perform prive.journaliser(p_org, 'paiement_annuler', 'vente', v_p.vente_id,
    jsonb_build_object('numero_recu', v_p.numero_recu, 'montant_xof', v_p.montant_xof, 'motif', v_p.motif_annulation,
                       'paiement_id', v_p.id));

  return jsonb_build_object('paiement', prive.paiement_json(v_p), 'vente', prive.etat_vente_json(p_org, v_p.vente_id));
end
$$;

create or replace function public.paiements_lister(p_org uuid, p_filtres jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_du      date;
  v_au      date;
  v_compte  uuid;
  v_mode    text;
  v_vente   uuid;
  v_client  uuid;
  v_annules boolean;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'vendeur', 'comptable', 'lecture']);
  v_du := prive.j_date(p_filtres, 'du');
  v_au := prive.j_date(p_filtres, 'au');
  v_compte := prive.j_uuid(p_filtres, 'compte_id');
  v_mode := prive.valeur_parmi(prive.j_texte(p_filtres, 'mode'),
                               array['especes', 'orange_money', 'moov_money', 'wave', 'virement', 'cheque', 'autre'], 'mode');
  v_vente := prive.j_uuid(p_filtres, 'vente_id');
  v_client := prive.j_uuid(p_filtres, 'client_id');
  v_annules := coalesce(prive.j_booleen(p_filtres, 'inclure_annules'), false);

  return coalesce((
    select jsonb_agg(prive.paiement_json(pa) order by pa.date desc, pa.created_at desc)
      from public.paiements pa
      join public.ventes ve on ve.id = pa.vente_id
     where pa.org_id = p_org
       and (v_annules or not pa.annule)
       and (v_du is null or pa.date >= v_du)
       and (v_au is null or pa.date <= v_au)
       and (v_compte is null or pa.compte_id = v_compte)
       and (v_mode is null or pa.mode = v_mode)
       and (v_vente is null or pa.vente_id = v_vente)
       and (v_client is null or ve.client_id = v_client)
  ), '[]'::jsonb);
end
$$;

-- -----------------------------------------------------------------------------
-- Proformas
-- -----------------------------------------------------------------------------

create or replace function public.proforma_obtenir(p_org uuid, p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_pr public.proformas%rowtype;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'vendeur', 'comptable', 'lecture']);
  select * into v_pr from public.proformas pr where pr.id = p_id and pr.org_id = p_org;
  if v_pr.id is null then
    perform prive.introuvable('Proforma');
  end if;
  return prive.proforma_json(v_pr) || jsonb_build_object(
    'client', (select prive.client_json(c) from public.clients c where c.id = v_pr.client_id),
    'vehicule', (select jsonb_build_object('id', v.id, 'reference', v.reference,
                                           'libelle', concat_ws(' ', v.marque, v.modele, v.annee),
                                           'etape', v.etape, 'statut_commercial', v.statut_commercial,
                                           'photo_principale_path', v.photo_principale_path)
                   from public.vehicules v where v.id = v_pr.vehicule_id));
end
$$;

create or replace function public.proformas_lister(p_org uuid, p_filtres jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_statut text;
  v_client uuid;
  v_veh    uuid;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'vendeur', 'comptable', 'lecture']);
  v_statut := prive.valeur_parmi(prive.j_texte(p_filtres, 'statut'),
                                 array['emise', 'acceptee', 'expiree', 'convertie', 'annulee'], 'statut');
  v_client := prive.j_uuid(p_filtres, 'client_id');
  v_veh := prive.j_uuid(p_filtres, 'vehicule_id');
  return coalesce((
    select jsonb_agg(x.j order by x.created_at desc)
      from (select prive.proforma_json(pr) as j, pr.created_at
              from public.proformas pr
             where pr.org_id = p_org
               and (v_client is null or pr.client_id = v_client)
               and (v_veh is null or pr.vehicule_id = v_veh)) x
     where v_statut is null or x.j ->> 'statut_effectif' = v_statut
  ), '[]'::jsonb);
end
$$;

create or replace function public.proforma_creer(p_org uuid, p_data jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_role      text;
  v_id        uuid;
  v_org       uuid;
  v_par       public.parametres%rowtype;
  v_client_id uuid;
  v_veh       public.vehicules%rowtype;
  v_autre     text;
  v_prix      numeric;
  v_remise    numeric;
  v_ttc       numeric;
  v_ht        numeric;
  v_tva_taux  numeric;
  v_date      date;
  v_valide    date;
  v_pr        public.proformas%rowtype;
begin
  v_role := prive.exiger_role(p_org, array['proprietaire', 'gerant', 'vendeur']);
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    perform prive.erreur('Données de la proforma manquantes.', '22023');
  end if;

  v_id := prive.j_uuid(p_data, 'id');
  if v_id is not null then
    select pr.org_id into v_org from public.proformas pr where pr.id = v_id;
    if prive.id_existant(p_org, v_org) then
      return public.proforma_obtenir(p_org, v_id);
    end if;
  end if;

  select * into v_par from public.parametres where org_id = p_org;

  v_client_id := prive.j_uuid(p_data, 'client_id');
  if v_client_id is null and jsonb_typeof(p_data -> 'client') = 'object' then
    v_client_id := (public.client_enregistrer(p_org, p_data -> 'client') ->> 'id')::uuid;
  end if;
  if v_client_id is null then
    perform prive.erreur('Le client est obligatoire.', '22023');
  end if;
  if not exists (select 1 from public.clients c where c.id = v_client_id and c.org_id = p_org) then
    perform prive.introuvable('Client');
  end if;

  select * into v_veh from public.vehicules v where v.id = prive.j_uuid(p_data, 'vehicule_id') and v.org_id = p_org;
  if v_veh.id is null then
    perform prive.introuvable('Véhicule');
  end if;
  if v_veh.archive then
    perform prive.erreur('Ce véhicule est archivé.');
  end if;
  if v_veh.statut_commercial = 'vendu' then
    perform prive.erreur('Ce véhicule est déjà vendu.');
  end if;
  if v_veh.statut_commercial = 'reserve' and v_veh.reserve_client_id <> v_client_id
     and coalesce(v_veh.reserve_jusqu_au, current_date) >= current_date then
    select c.nom into v_autre from public.clients c where c.id = v_veh.reserve_client_id;
    perform prive.erreur(format('Ce véhicule est réservé pour %s.', v_autre));
  end if;

  v_prix := round(coalesce(prive.j_nombre(p_data, 'prix_xof'), v_veh.prix_affiche_xof));
  if v_prix is null or v_prix <= 0 then
    perform prive.erreur('Le prix est obligatoire.', '22023');
  end if;
  v_remise := round(coalesce(prive.j_nombre(p_data, 'remise_xof'), 0));
  if v_remise < 0 or v_remise >= v_prix then
    perform prive.erreur('La remise doit être positive et inférieure au prix.', '22023');
  end if;
  v_ttc := v_prix - v_remise;
  if v_role = 'vendeur' and v_veh.prix_plancher_xof is not null and v_ttc < v_veh.prix_plancher_xof then
    perform prive.erreur('Prix en dessous du minimum autorisé pour ce véhicule : l''accord d''un gérant est nécessaire.');
  end if;
  v_tva_taux := case when v_par.tva_active then v_par.tva_taux else 0 end;
  v_ht := prive.hors_taxe(v_ttc, v_tva_taux);
  v_date := coalesce(prive.j_date(p_data, 'date'), current_date);
  if v_date > current_date then
    perform prive.erreur('La date de la proforma ne peut pas être dans le futur.', '22023');
  end if;
  v_valide := coalesce(prive.j_date(p_data, 'valide_jusqu_au'), v_date + v_par.validite_proforma_jours);
  if v_valide < v_date then
    perform prive.erreur('La date de validité précède la date de la proforma.', '22023');
  end if;

  insert into public.proformas (id, org_id, numero, vehicule_id, client_id, prix_xof, remise_xof, tva_taux, montant_ht,
                                montant_tva, montant_ttc, date, valide_jusqu_au, statut, snapshot, notes, created_by)
  values (coalesce(v_id, gen_random_uuid()), p_org, prive.prochain_numero(p_org, 'proforma', v_date), v_veh.id, v_client_id,
          v_prix, v_remise, v_tva_taux, v_ht, v_ttc - v_ht, v_ttc, v_date, v_valide, 'emise',
          prive.snapshot_document(p_org, v_client_id, v_veh.id)
            || jsonb_build_object('vendeur_nom', (select m.nom_affiche from public.membres m
                                                   where m.org_id = p_org and m.user_id = auth.uid()),
                                  'tva_taux', v_tva_taux),
          prive.j_texte(p_data, 'notes'), auth.uid())
  returning * into v_pr;

  perform prive.journaliser(p_org, 'proforma_creer', 'proforma', v_pr.id,
    jsonb_build_object('numero', v_pr.numero, 'vehicule', v_veh.reference, 'montant_ttc', v_ttc));

  return public.proforma_obtenir(p_org, v_pr.id);
end
$$;

-- acceptee : réserve le véhicule pour le client jusqu'à la fin de validité ;
-- annulee / expiree : lève la réservation posée par la proforma.
create or replace function public.proforma_changer_statut(p_org uuid, p_id uuid, p_statut text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_pr    public.proformas%rowtype;
  v_veh   public.vehicules%rowtype;
  v_autre text;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'vendeur']);
  if p_statut is null then
    perform prive.erreur('Le statut est obligatoire.', '22023');
  end if;
  perform prive.valeur_parmi(p_statut, array['emise', 'acceptee', 'expiree', 'annulee'], 'statut');
  select * into v_pr from public.proformas pr where pr.id = p_id and pr.org_id = p_org for update;
  if v_pr.id is null then
    perform prive.introuvable('Proforma');
  end if;
  if v_pr.statut in ('convertie', 'annulee') then
    perform prive.erreur(format('Cette proforma est %s : son statut ne peut plus changer.',
                                case v_pr.statut when 'convertie' then 'convertie en vente' else 'annulée' end));
  end if;
  select * into v_veh from public.vehicules v where v.id = v_pr.vehicule_id for update;

  if p_statut = 'acceptee' then
    if v_veh.statut_commercial = 'vendu' then
      perform prive.erreur('Ce véhicule est déjà vendu.');
    end if;
    if v_veh.statut_commercial = 'reserve' and v_veh.reserve_client_id <> v_pr.client_id
       and coalesce(v_veh.reserve_jusqu_au, current_date) >= current_date then
      select c.nom into v_autre from public.clients c where c.id = v_veh.reserve_client_id;
      perform prive.erreur(format('Ce véhicule est déjà réservé pour %s.', v_autre));
    end if;
    update public.vehicules
       set statut_commercial = 'reserve', reserve_client_id = v_pr.client_id,
           reserve_jusqu_au = greatest(v_pr.valide_jusqu_au, current_date), updated_at = now()
     where id = v_veh.id;
  elsif v_pr.statut = 'acceptee' and v_veh.statut_commercial = 'reserve' and v_veh.reserve_client_id = v_pr.client_id then
    update public.vehicules
       set statut_commercial = 'disponible', reserve_client_id = null, reserve_jusqu_au = null, updated_at = now()
     where id = v_veh.id;
  end if;

  update public.proformas set statut = p_statut, updated_at = now() where id = p_id;
  perform prive.journaliser(p_org, 'proforma_statut', 'proforma', p_id,
    jsonb_build_object('numero', v_pr.numero, 'de', v_pr.statut, 'vers', p_statut));
  return public.proforma_obtenir(p_org, p_id);
end
$$;

create or replace function public.proforma_convertir(p_org uuid, p_id uuid, p_data jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_pr    public.proformas%rowtype;
  v_vente jsonb;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'vendeur']);
  select * into v_pr from public.proformas pr where pr.id = p_id and pr.org_id = p_org for update;
  if v_pr.id is null then
    perform prive.introuvable('Proforma');
  end if;
  if v_pr.statut = 'convertie' then
    return public.vente_obtenir(p_org, v_pr.vente_id);
  end if;
  if v_pr.statut = 'annulee' then
    perform prive.erreur('Cette proforma est annulée.');
  end if;
  if p_data is not null and jsonb_typeof(p_data) not in ('object', 'null') then
    perform prive.erreur('Données de la vente invalides.', '22023');
  end if;

  v_vente := public.vente_creer(p_org,
    (coalesce(p_data, '{}'::jsonb) - 'client' - 'vehicule_id' - 'client_id' - 'prix_xof' - 'remise_xof')
    || jsonb_build_object('vehicule_id', v_pr.vehicule_id, 'client_id', v_pr.client_id,
                          'prix_xof', v_pr.prix_xof, 'remise_xof', v_pr.remise_xof));

  update public.proformas set statut = 'convertie', vente_id = (v_vente ->> 'id')::uuid, updated_at = now() where id = p_id;
  perform prive.journaliser(p_org, 'proforma_convertir', 'proforma', p_id,
    jsonb_build_object('numero', v_pr.numero, 'vente', v_vente ->> 'numero'));

  return public.vente_obtenir(p_org, (v_vente ->> 'id')::uuid);
end
$$;

-- =============================================================================
-- Pilotage
-- =============================================================================

create or replace function public.tableau_de_bord(p_org uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_couts       boolean;
  v_par         public.parametres%rowtype;
  v_debut_mois  date := date_trunc('month', current_date::timestamp)::date;
  v_indic       jsonb;
  v_actions     jsonb;
  v_series      jsonb;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'vendeur', 'comptable', 'lecture']);
  v_couts := prive.voit_couts(p_org);
  select * into v_par from public.parametres where org_id = p_org;

  -- Indicateurs
  with couts as (
    select * from prive.couts_vehicules(p_org)
  ),
  stock as (
    select v.etape, v.statut_commercial, c.prix_revient_xof
      from public.vehicules v
      join couts c on c.vehicule_id = v.id
     where v.org_id = p_org and not v.archive and v.statut_commercial <> 'vendu'
  ),
  ventes_mois as (
    select ve.montant_ht, c.prix_revient_xof
      from public.ventes ve
      join couts c on c.vehicule_id = ve.vehicule_id
     where ve.org_id = p_org and ve.statut = 'active' and ve.date_vente >= v_debut_mois
  )
  select jsonb_build_object(
    'valeur_stock_revient', case when v_couts then (select coalesce(sum(s.prix_revient_xof), 0) from stock s) end,
    'nb_au_parc_disponibles', (select count(*) from stock s where s.etape = 'parc' and s.statut_commercial = 'disponible'),
    'capital_par_etape', (
      select jsonb_agg(jsonb_build_object('etape', e.etape, 'nb', coalesce(g.nb, 0),
                                          'montant', case when v_couts then coalesce(g.montant, 0) end)
                       order by e.rang)
        from unnest(prive.etapes()) with ordinality as e(etape, rang)
        left join (select s.etape, count(*) as nb, sum(s.prix_revient_xof) as montant from stock s group by s.etape) g
               on g.etape = e.etape),
    'ventes_mois', (select jsonb_build_object('nb', count(*), 'ca', coalesce(sum(vm.montant_ht), 0),
                                              'marge', case when v_couts then coalesce(sum(vm.montant_ht - vm.prix_revient_xof), 0) end)
                      from ventes_mois vm),
    'encaisse_mois', (select coalesce(sum(pa.montant_xof), 0) from public.paiements pa
                       where pa.org_id = p_org and not pa.annule and pa.date >= v_debut_mois),
    'creances_total', (select coalesce(sum(e.reste_xof), 0) from prive.ventes_etat(p_org) e where e.statut = 'active'),
    'a_payer_fournisseurs', case when v_couts then (select coalesce(sum(f.montant_xof), 0) from public.frais f
                                                     where f.org_id = p_org and f.statut = 'a_payer') end
  ) into v_indic;

  -- Actions à faire
  with a as (
    -- Échéances en retard (une action par vente)
    select 'echeance_retard'::text as type, 'haute'::text as gravite,
           'Échéance en retard — ' || c.nom as titre,
           format('%s dus depuis le %s (facture %s)', prive.fcfa(sum(ei.reste_xof)), prive.date_fr(min(ei.date_echeance)), ve.numero) as detail,
           'vente'::text as entite, ve.id as entite_id, min(ei.date_echeance) as date
      from prive.echeances_imputees(p_org) ei
      join public.ventes ve on ve.id = ei.vente_id
      join public.clients c on c.id = ve.client_id
     where ei.en_retard
     group by ve.id, ve.numero, c.nom
    union all
    -- Magasinage au port : une action par véhicule, regroupées au-delà de 3.
    select 'magasinage_port',
           case when bool_or(p.jours > 2 * v_par.alerte_port_jours) then 'haute' else 'moyenne' end,
           case when count(*) = 1 then 'Magasinage au port — ' || min(p.libelle)
                else format('%s véhicules en magasinage au port', count(*)) end,
           case when count(*) = 1
                then format('%s au port %s depuis %s jours (seuil : %s jours)', min(p.reference), min(p.port),
                            max(p.jours), v_par.alerte_port_jours)
                else format('%s — le plus ancien au port depuis %s jours (seuil : %s jours)',
                            string_agg(p.reference, ', ' order by p.etape_depuis, p.reference), max(p.jours),
                            v_par.alerte_port_jours) end,
           'vehicule',
           (array_agg(p.id order by p.etape_depuis, p.reference))[1],
           min(p.etape_depuis)
      from (
        select v.id, v.reference, v.etape_depuis, current_date - v.etape_depuis as jours,
               concat_ws(' ', v.marque, v.modele, v.annee) as libelle,
               coalesce(e.port_arrivee, 'd''arrivée') as port,
               case when count(*) over () > 3 then 0 else row_number() over (order by v.etape_depuis, v.id) end as groupe
          from public.vehicules v
          left join public.expeditions e on e.id = v.expedition_id
         where v.org_id = p_org and not v.archive and v.etape = 'au_port'
           and current_date - v.etape_depuis > v_par.alerte_port_jours
      ) p
     group by p.groupe
    union all
    -- Stock dormant
    select 'stock_dormant', 'moyenne',
           'Stock dormant — ' || concat_ws(' ', v.marque, v.modele, v.annee),
           format('%s au parc depuis %s jours sans vente%s', v.reference, current_date - v.etape_depuis,
                  case when v.prix_affiche_xof is not null then ', prix affiché ' || prive.fcfa(v.prix_affiche_xof) else '' end),
           'vehicule', v.id, v.etape_depuis
      from public.vehicules v
     where v.org_id = p_org and not v.archive and v.etape = 'parc' and v.statut_commercial = 'disponible'
       and current_date - v.etape_depuis > v_par.alerte_stock_jours
    union all
    -- Arrivées proches (ou en retard) des expéditions en mer
    select 'arrivee_proche',
           case when e.date_arrivee_prevue < current_date then 'moyenne' else 'info' end,
           'Arrivée prévue — ' || e.reference,
           format('%s véhicule(s), %s → %s, %s le %s',
                  (select count(*) from public.vehicules v where v.expedition_id = e.id),
                  coalesce(e.port_depart, '?'), coalesce(e.port_arrivee, '?'),
                  case when e.date_arrivee_prevue < current_date then 'arrivée attendue depuis' else 'arrivée prévue' end,
                  prive.date_fr(e.date_arrivee_prevue)),
           'expedition', e.id, e.date_arrivee_prevue
      from public.expeditions e
     where e.org_id = p_org and e.statut = 'en_mer' and e.date_arrivee_prevue is not null
       and e.date_arrivee_prevue <= current_date + 7
    union all
    -- Frais à payer : UNE action qui les regroupe tous (absente pour un vendeur
    -- sans accès aux coûts). entite_id = le plus ancien.
    select 'frais_a_payer',
           case when bool_or(f.date < current_date - 30) then 'haute' else 'moyenne' end,
           case when count(*) = 1 then '1 frais à payer' else format('%s frais à payer', count(*)) end,
           format('%s au total — le plus ancien du %s (%s)', prive.fcfa(sum(f.montant_xof)), prive.date_fr(min(f.date)),
                  (array_agg(coalesce(f.fournisseur, f.libelle, f.categorie) order by f.date, f.created_at))[1]),
           'frais',
           (array_agg(f.id order by f.date, f.created_at))[1],
           min(f.date)
      from public.frais f
     where v_couts and f.org_id = p_org and f.statut = 'a_payer'
    having count(*) > 0
    union all
    -- Réservations échues
    select 'reservation_echue', 'moyenne',
           'Réservation échue — ' || concat_ws(' ', v.marque, v.modele, v.annee),
           format('%s réservé pour %s jusqu''au %s', v.reference, c.nom, prive.date_fr(v.reserve_jusqu_au)),
           'vehicule', v.id, v.reserve_jusqu_au
      from public.vehicules v
      join public.clients c on c.id = v.reserve_client_id
     where v.org_id = p_org and v.statut_commercial = 'reserve' and v.reserve_jusqu_au < current_date
    union all
    -- Vendu, au parc, non livré depuis plus de 7 jours
    select 'livraison_en_attente', 'moyenne',
           'Livraison en attente — ' || concat_ws(' ', v.marque, v.modele, v.annee),
           format('Vendu à %s le %s (facture %s), au parc depuis %s jours', c.nom, prive.date_fr(ve.date_vente), ve.numero,
                  current_date - v.etape_depuis),
           'vente', ve.id, greatest(ve.date_vente, v.etape_depuis)
      from public.ventes ve
      join public.vehicules v on v.id = ve.vehicule_id
      join public.clients c on c.id = ve.client_id
     where ve.org_id = p_org and ve.statut = 'active' and ve.date_livraison is null and v.etape = 'parc'
       and current_date - greatest(ve.date_vente, v.etape_depuis) > 7
    union all
    -- Demandes clients qui trouvent un véhicule
    select 'demande_correspondante', 'info',
           'Demande correspondante — ' || c.nom,
           format('%s recherche %s : %s %s (%s)%s', c.nom,
                  coalesce(nullif(concat_ws(' ', d.marque, d.modele), ''), 'un véhicule'),
                  v.reference, concat_ws(' ', v.marque, v.modele, v.annee),
                  case v.etape when 'parc' then 'au parc' when 'en_mer' then 'en mer' else replace(v.etape, '_', ' ') end,
                  case when v.prix_affiche_xof is not null then ', ' || prive.fcfa(v.prix_affiche_xof) else '' end),
           'vehicule', v.id, d.created_at::date
      from prive.correspondances(p_org) co
      join public.demandes d on d.id = co.demande_id
      join public.clients c on c.id = d.client_id
      join public.vehicules v on v.id = co.vehicule_id
  )
  select coalesce(jsonb_agg(jsonb_build_object('type', a.type, 'gravite', a.gravite, 'titre', a.titre, 'detail', a.detail,
                                               'entite', a.entite, 'entite_id', a.entite_id, 'date', a.date)
                            order by array_position(array['haute', 'moyenne', 'info'], a.gravite), a.date nulls last, a.titre),
                  '[]'::jsonb)
    into v_actions
    from a;

  -- Séries sur 12 mois (mois courant inclus)
  with couts as (
    select * from prive.couts_vehicules(p_org)
  ),
  mois as (
    select generate_series(date_trunc('month', current_date::timestamp) - interval '11 months',
                           date_trunc('month', current_date::timestamp), interval '1 month') as m
  ),
  s as (
    select date_trunc('month', ve.date_vente::timestamp) as m, count(*) as nb, sum(ve.montant_ht) as ca,
           sum(ve.montant_ht - c.prix_revient_xof) as marge
      from public.ventes ve
      join couts c on c.vehicule_id = ve.vehicule_id
     where ve.org_id = p_org and ve.statut = 'active'
       and ve.date_vente >= (date_trunc('month', current_date::timestamp) - interval '11 months')::date
     group by 1
  )
  select jsonb_agg(jsonb_build_object('mois', to_char(mois.m, 'YYYY-MM'), 'ca', coalesce(s.ca, 0),
                                      'marge', case when v_couts then coalesce(s.marge, 0) end, 'nb', coalesce(s.nb, 0))
                   order by mois.m)
    into v_series
    from mois left join s on s.m = mois.m;

  return jsonb_build_object('indicateurs', v_indic, 'actions', v_actions, 'series', v_series);
end
$$;

create or replace function public.rapport_marges(p_org uuid, p_du date default null, p_au date default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_du date := coalesce(p_du, date_trunc('year', current_date::timestamp)::date);
  v_au date := coalesce(p_au, current_date);
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'vendeur', 'comptable', 'lecture']);
  perform prive.exiger_couts(p_org);
  if v_au < v_du then
    perform prive.erreur('La fin de période précède le début.', '22023');
  end if;

  return (
    with l as (
      select ve.id as vente_id, ve.numero, ve.date_vente, ve.montant_ht, ve.montant_ttc,
             v.id as vehicule_id, v.reference, concat_ws(' ', v.marque, v.modele, v.annee) as libelle, v.marque,
             v.date_achat, c.nom as client_nom, cv.prix_revient_xof,
             ve.montant_ht - cv.prix_revient_xof as marge
        from public.ventes ve
        join public.vehicules v on v.id = ve.vehicule_id
        join public.clients c on c.id = ve.client_id
        join prive.couts_vehicules(p_org) cv on cv.vehicule_id = ve.vehicule_id
       where ve.org_id = p_org and ve.statut = 'active' and ve.date_vente between v_du and v_au
    )
    select jsonb_build_object(
      'periode', jsonb_build_object('du', v_du, 'au', v_au),
      'totaux', (select jsonb_build_object(
                   'nb', count(*), 'ca', coalesce(sum(l.montant_ht), 0),
                   'prix_revient', coalesce(sum(l.prix_revient_xof), 0), 'marge', coalesce(sum(l.marge), 0),
                   'marge_pct', case when coalesce(sum(l.montant_ht), 0) > 0
                                     then round(sum(l.marge) * 100 / sum(l.montant_ht), 1) end,
                   'jours_stock_moyen', round(avg(l.date_vente - l.date_achat)))
                   from l),
      'ventes', coalesce((select jsonb_agg(jsonb_build_object(
                   'vente_id', l.vente_id, 'numero', l.numero, 'date_vente', l.date_vente,
                   'vehicule_id', l.vehicule_id, 'vehicule_reference', l.reference, 'vehicule_libelle', l.libelle,
                   'client_nom', l.client_nom, 'montant_ht', l.montant_ht, 'montant_ttc', l.montant_ttc,
                   'prix_revient_xof', l.prix_revient_xof, 'marge_xof', l.marge,
                   'marge_pct', case when l.montant_ht > 0 then round(l.marge * 100 / l.montant_ht, 1) end,
                   'jours_stock', l.date_vente - l.date_achat)
                 order by l.date_vente desc, l.numero desc) from l), '[]'::jsonb),
      'par_marque', coalesce((select jsonb_agg(jsonb_build_object('marque', g.marque, 'nb', g.nb, 'ca', g.ca, 'marge', g.marge,
                                                                  'marge_pct', case when g.ca > 0 then round(g.marge * 100 / g.ca, 1) end)
                                               order by g.marge desc, g.marque)
                                from (select l.marque, count(*) as nb, sum(l.montant_ht) as ca, sum(l.marge) as marge
                                        from l group by l.marque) g), '[]'::jsonb)
    )
  );
end
$$;

create or replace function public.tresorerie(p_org uuid, p_du date default null, p_au date default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_du date := coalesce(p_du, date_trunc('month', current_date::timestamp)::date);
  v_au date := coalesce(p_au, current_date);
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'vendeur', 'comptable', 'lecture']);
  perform prive.exiger_couts(p_org);
  if v_au < v_du then
    perform prive.erreur('La fin de période précède le début.', '22023');
  end if;

  return (
    with m as (
      select * from prive.mouvements_tresorerie(p_org)
    ),
    etat as (
      select * from prive.ventes_etat(p_org)
    )
    select jsonb_build_object(
      'periode', jsonb_build_object('du', v_du, 'au', v_au),
      'comptes', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', c.id, 'nom', c.nom, 'type', c.type, 'actif', c.actif, 'solde_initial', c.solde_initial,
                 'solde_xof', c.solde_initial + coalesce((select sum(m.montant_xof) from m where m.compte_id = c.id), 0),
                 'entrees_periode', coalesce((select sum(m.montant_xof) from m
                                               where m.compte_id = c.id and m.montant_xof > 0 and m.date between v_du and v_au), 0),
                 'sorties_periode', coalesce((select -sum(m.montant_xof) from m
                                               where m.compte_id = c.id and m.montant_xof < 0 and m.date between v_du and v_au), 0))
               order by c.ordre, c.nom)
          from public.comptes c where c.org_id = p_org), '[]'::jsonb),
      'mouvements', coalesce((
        select jsonb_agg(jsonb_build_object('date', m.date, 'type', m.type, 'libelle', m.libelle,
                                            'montant_xof', m.montant_xof, 'compte_id', m.compte_id,
                                            'compte_nom', c.nom, 'entite', m.entite, 'entite_id', m.entite_id)
                         order by m.date desc, m.created_at desc)
          from m left join public.comptes c on c.id = m.compte_id
         where m.date between v_du and v_au), '[]'::jsonb),
      'depenses_par_categorie', coalesce((
        select jsonb_agg(jsonb_build_object('categorie', g.categorie, 'montant_xof', g.total) order by g.total desc, g.categorie)
          from (select f.categorie, sum(f.montant_xof) as total from public.frais f
                 where f.org_id = p_org and f.date between v_du and v_au group by f.categorie) g), '[]'::jsonb),
      'creances', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'vente_id', ve.id, 'numero', ve.numero, 'date_vente', ve.date_vente,
                 'client_id', c.id, 'client_nom', c.nom, 'client_telephone', c.telephone,
                 'vehicule_reference', v.reference, 'vehicule_libelle', concat_ws(' ', v.marque, v.modele, v.annee),
                 'montant_ttc', ve.montant_ttc, 'encaisse_xof', e.encaisse_xof, 'reste_xof', e.reste_xof,
                 'retard_xof', e.retard_xof, 'premiere_echeance_retard', e.premiere_echeance_retard,
                 'jours_retard', current_date - e.premiere_echeance_retard,
                 'jours_depuis_vente', current_date - ve.date_vente)
               order by e.retard_xof desc, ve.date_vente)
          from etat e
          join public.ventes ve on ve.id = e.vente_id
          join public.clients c on c.id = ve.client_id
          join public.vehicules v on v.id = ve.vehicule_id
         where e.statut = 'active' and e.reste_xof > 0), '[]'::jsonb),
      'totaux', jsonb_build_object(
        'solde_total', (select coalesce(sum(c.solde_initial), 0) from public.comptes c where c.org_id = p_org)
                       + coalesce((select sum(m.montant_xof) from m where m.compte_id is not null), 0),
        'entrees_periode', coalesce((select sum(m.montant_xof) from m
                                      where m.montant_xof > 0 and m.type <> 'transfert_entrant' and m.date between v_du and v_au), 0),
        'sorties_periode', coalesce((select -sum(m.montant_xof) from m
                                      where m.montant_xof < 0 and m.type <> 'transfert_sortant' and m.date between v_du and v_au), 0),
        'achats_vehicules_periode', coalesce((select sum(v.achat_xof) from public.vehicules v
                                               where v.org_id = p_org and v.date_achat between v_du and v_au), 0),
        'creances_total', (select coalesce(sum(e.reste_xof), 0) from etat e where e.statut = 'active'),
        'a_payer_fournisseurs', (select coalesce(sum(f.montant_xof), 0) from public.frais f
                                  where f.org_id = p_org and f.statut = 'a_payer'))
    )
  );
end
$$;

-- Recherche globale. La saisie n'est jamais concaténée dans du SQL : elle est
-- passée comme valeur, et les caractères spéciaux de LIKE (\ % _) sont échappés.
create or replace function public.recherche(p_org uuid, p_q text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_q     text := nullif(btrim(p_q), '');
  v_motif text;
  v_chiff text;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'vendeur', 'comptable', 'lecture']);
  if v_q is null or length(v_q) < 2 then
    return jsonb_build_object('q', coalesce(v_q, ''), 'vehicules', '[]'::jsonb, 'clients', '[]'::jsonb,
                              'ventes', '[]'::jsonb, 'proformas', '[]'::jsonb, 'expeditions', '[]'::jsonb);
  end if;
  v_q := left(v_q, 100);
  v_motif := prive.motif_contient(v_q);
  v_chiff := regexp_replace(v_q, '\D', '', 'g');

  return jsonb_build_object(
    'q', v_q,
    'vehicules', coalesce((
      select jsonb_agg(x.j order by x.o, x.r) from (
        select jsonb_build_object('id', v.id, 'reference', v.reference,
                                  'libelle', concat_ws(' ', v.marque, v.modele, v.annee), 'vin', v.vin,
                                  'lot_numero', v.lot_numero, 'etape', v.etape, 'statut_commercial', v.statut_commercial,
                                  'archive', v.archive, 'photo_principale_path', v.photo_principale_path) as j,
               case when v.archive then 1 else 0 end as o, v.reference as r
          from public.vehicules v
         where v.org_id = p_org
           and (v.reference ilike v_motif or v.vin ilike v_motif or v.lot_numero ilike v_motif
                or concat_ws(' ', v.marque, v.modele, v.finition, v.annee) ilike v_motif
                or v.immatriculation ilike v_motif)
         order by o, r limit 10) x), '[]'::jsonb),
    'clients', coalesce((
      select jsonb_agg(x.j order by x.n) from (
        select jsonb_build_object('id', c.id, 'nom', c.nom, 'telephone', c.telephone, 'ville', c.ville) as j, lower(c.nom) as n
          from public.clients c
         where c.org_id = p_org
           and (c.nom ilike v_motif or c.telephone ilike v_motif or c.whatsapp ilike v_motif
                or c.numero_piece ilike v_motif or c.email ilike v_motif
                or (length(v_chiff) >= 4
                    and regexp_replace(coalesce(c.telephone, '') || ' ' || coalesce(c.whatsapp, ''), '\D', '', 'g')
                        like '%' || v_chiff || '%'))
         order by n limit 10) x), '[]'::jsonb),
    'ventes', coalesce((
      select jsonb_agg(x.j order by x.d desc) from (
        select jsonb_build_object('id', ve.id, 'numero', ve.numero, 'numero_avoir', ve.numero_avoir, 'statut', ve.statut,
                                  'date_vente', ve.date_vente, 'client_nom', c.nom, 'montant_ttc', ve.montant_ttc,
                                  'vehicule_libelle', concat_ws(' ', v.marque, v.modele, v.annee)) as j,
               ve.date_vente as d
          from public.ventes ve
          join public.clients c on c.id = ve.client_id
          join public.vehicules v on v.id = ve.vehicule_id
         where ve.org_id = p_org
           and (ve.numero ilike v_motif or ve.numero_avoir ilike v_motif
                or exists (select 1 from public.paiements pa where pa.vente_id = ve.id
                            and (pa.numero_recu ilike v_motif or pa.reference ilike v_motif)))
         order by d desc limit 10) x), '[]'::jsonb),
    'proformas', coalesce((
      select jsonb_agg(x.j order by x.d desc) from (
        select jsonb_build_object('id', pr.id, 'numero', pr.numero, 'statut', pr.statut, 'date', pr.date,
                                  'client_nom', c.nom, 'montant_ttc', pr.montant_ttc) as j, pr.date as d
          from public.proformas pr join public.clients c on c.id = pr.client_id
         where pr.org_id = p_org and pr.numero ilike v_motif
         order by d desc limit 10) x), '[]'::jsonb),
    'expeditions', coalesce((
      select jsonb_agg(x.j order by x.d desc nulls last) from (
        select jsonb_build_object('id', e.id, 'reference', e.reference, 'numero_conteneur', e.numero_conteneur,
                                  'numero_bl', e.numero_bl, 'navire', e.navire, 'statut', e.statut) as j,
               e.date_depart as d
          from public.expeditions e
         where e.org_id = p_org
           and (e.reference ilike v_motif or e.numero_conteneur ilike v_motif or e.numero_bl ilike v_motif
                or e.navire ilike v_motif)
         order by d desc nulls last limit 10) x), '[]'::jsonb)
  );
end
$$;

create or replace function public.journal_lister(p_org uuid, p_filtres jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_entite    text;
  v_entite_id uuid;
  v_action    text;
  v_user      uuid;
  v_avant     timestamptz;
  v_limite    integer;
begin
  perform prive.exiger_role(p_org, array['proprietaire', 'gerant', 'comptable']);
  v_entite := prive.j_texte(p_filtres, 'entite');
  v_entite_id := prive.j_uuid(p_filtres, 'entite_id');
  v_action := prive.j_texte(p_filtres, 'action');
  v_user := prive.j_uuid(p_filtres, 'user_id');
  begin
    v_avant := (prive.j_texte(p_filtres, 'avant'))::timestamptz;
  exception when others then
    perform prive.erreur('Champ « avant » : date et heure invalides.', '22023');
  end;
  v_limite := least(greatest(coalesce(prive.j_entier(p_filtres, 'limite'), 100), 1), 500);

  return coalesce((
    select jsonb_agg(x.j order by x.created_at desc, x.id desc) from (
      select jsonb_build_object('id', j.id, 'created_at', j.created_at, 'user_id', j.user_id, 'user_nom', m.nom_affiche,
                                'action', j.action, 'entite', j.entite, 'entite_id', j.entite_id, 'details', j.details) as j,
             j.created_at, j.id
        from public.journal j
        left join public.membres m on m.org_id = j.org_id and m.user_id = j.user_id
       where j.org_id = p_org
         and (v_entite is null or j.entite = v_entite)
         and (v_entite_id is null or j.entite_id = v_entite_id)
         and (v_action is null or j.action = v_action)
         and (v_user is null or j.user_id = v_user)
         and (v_avant is null or j.created_at < v_avant)
       order by j.created_at desc, j.id desc
       limit v_limite) x
  ), '[]'::jsonb);
end
$$;

-- =============================================================================
-- Public (rôle anon) : vérification d'une facture par son QR code.
-- Renvoie uniquement : entreprise, numéro, date, montant, statut.
-- =============================================================================
create or replace function public.verifier_document(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_res jsonb;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{32,128}$' then
    return jsonb_build_object('valide', false);
  end if;
  select jsonb_build_object(
           'valide', true,
           'entreprise', coalesce(ve.snapshot -> 'entreprise' ->> 'nom_commercial', o.nom),
           'numero', ve.numero,
           'date', ve.date_vente,
           'montant', ve.montant_ttc,
           'statut', ve.statut)
    into v_res
    from public.ventes ve
    join public.organisations o on o.id = ve.org_id
   where ve.token_verification = p_token;
  return coalesce(v_res, jsonb_build_object('valide', false));
end
$$;

-- =============================================================================
-- Droits d'exécution
-- =============================================================================
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

grant execute on all functions in schema public to authenticated;
grant execute on function public.verifier_document(text) to anon;
