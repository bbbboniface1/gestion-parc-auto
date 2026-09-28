-- =============================================================================
-- Données de démonstration « Sahel Auto Import » (Bamako)
--
-- UNIQUEMENT pour la démo PGlite (navigateur) et les tests. Jamais en production.
--
-- demo_initialiser(p_user, p_email) crée l'utilisateur s'il n'existe pas, une
-- entreprise complète et renvoie son id. Toutes les dates sont relatives à
-- current_date : la démo reste « vivante » quel que soit le jour d'ouverture.
-- Les données passent par l'API publique (numérotation, coûts, journal réels),
-- l'appel se faisant au nom de p_user.
--
-- Contenu : 24 véhicules sur toutes les étapes (2 vendus encore en mer,
-- 1 réservé, 1 archivé), 3 expéditions (conteneur MSC en mer Houston → Cotonou,
-- RoRo Grimaldi arrivé à Dakar, conteneur Maersk clôturé), frais USD et FCFA
-- dont des « à payer », 8 clients, 10 ventes sur 8 mois (une échelonnée avec
-- une échéance en retard, une annulée avec avoir et remboursement), 2 proformas,
-- 2 demandes clients, dépenses générales, 3 comptes et 2 transferts.
-- Taux : 1 USD = 570 FCFA.
-- =============================================================================

create schema if not exists demo;
revoke all on schema demo from public;

-- Date à laquelle les données de démo sont « calées » : un instantané de base
-- fabriqué au build est recalé au jour d'ouverture par demo_actualiser().
create table if not exists demo.reference (
  org_id    uuid primary key references public.organisations (id) on delete cascade,
  date_ref  date not null
);
revoke all on demo.reference from public;

-- Enchaîne des changements d'étape datés (décalages en jours depuis aujourd'hui).
-- Même règle que vehicule_changer_etape, sans reconstruire la fiche à chaque pas.
create or replace function demo.parcours(p_org uuid, p_vehicule uuid, p_etapes text[], p_jours integer[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_etapes is null then
    return;
  end if;
  for i in 1 .. coalesce(array_length(p_etapes, 1), 0) loop
    perform prive.changer_etape(p_org, p_vehicule, p_etapes[i], current_date + p_jours[i], null);
  end loop;
end
$$;

-- Renumérote factures, avoirs, reçus et proformas dans l'ordre chronologique :
-- après un décalage de dates, l'année du numéro suit toujours la date du document.
create or replace function demo.renumeroter(p_org uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  r record;
begin
  update public.ventes
     set numero = 'TMP-' || id,
         numero_avoir = case when numero_avoir is not null then 'TMPAV-' || id end
   where org_id = p_org;
  update public.paiements set numero_recu = 'TMP-' || id where org_id = p_org;
  update public.proformas set numero = 'TMP-' || id where org_id = p_org;
  delete from public.compteurs where org_id = p_org and type in ('facture', 'recu', 'proforma', 'avoir');

  for r in select id, date_vente from public.ventes where org_id = p_org order by date_vente, created_at, id loop
    update public.ventes set numero = prive.prochain_numero(p_org, 'facture', r.date_vente) where id = r.id;
  end loop;
  for r in select id, annulee_le from public.ventes where org_id = p_org and statut = 'annulee' order by annulee_le, id loop
    update public.ventes set numero_avoir = prive.prochain_numero(p_org, 'avoir', r.annulee_le::date) where id = r.id;
  end loop;
  for r in select id, date from public.paiements where org_id = p_org order by date, created_at, id loop
    update public.paiements set numero_recu = prive.prochain_numero(p_org, 'recu', r.date) where id = r.id;
  end loop;
  for r in select id, date from public.proformas where org_id = p_org order by date, created_at, id loop
    update public.proformas set numero = prive.prochain_numero(p_org, 'proforma', r.date) where id = r.id;
  end loop;
end
$$;

-- Décale de p_jours TOUTES les dates et horodatages métier de l'organisation
-- (achats, étapes, expéditions, frais, ventes, livraisons, échéances,
-- paiements, proformas, réservations, demandes, journal…), renumérote les
-- documents annuels et avance la date de référence d'autant.
-- Renvoie la nouvelle date de référence.
create or replace function public.demo_decaler_dates(p_org uuid, p_jours integer)
returns date
language plpgsql
volatile
set search_path = ''
as $$
declare
  j integer := coalesce(p_jours, 0);
  i interval := make_interval(days => coalesce(p_jours, 0));
  v_ref date;
begin
  if not exists (select 1 from public.organisations where id = p_org) then
    raise exception using message = 'Entreprise de démonstration introuvable.', errcode = 'P0002';
  end if;
  if j = 0 then
    select date_ref into v_ref from demo.reference where org_id = p_org;
    return v_ref;
  end if;

  update public.organisations set essai_fin = essai_fin + j, created_at = created_at + i where id = p_org;
  update public.membres set created_at = created_at + i where org_id = p_org;
  update public.invitations
     set expire_le = expire_le + i, utilisee_le = utilisee_le + i, created_at = created_at + i
   where org_id = p_org;
  update public.parametres set taux_maj_le = taux_maj_le + i, updated_at = updated_at + i where org_id = p_org;
  update public.referentiels set created_at = created_at + i where org_id = p_org;
  update public.comptes set created_at = created_at + i where org_id = p_org;
  update public.clients set created_at = created_at + i, updated_at = updated_at + i where org_id = p_org;
  update public.demandes set created_at = created_at + i, updated_at = updated_at + i where org_id = p_org;
  update public.expeditions
     set date_depart = date_depart + j, date_arrivee_prevue = date_arrivee_prevue + j,
         date_arrivee_reelle = date_arrivee_reelle + j, created_at = created_at + i, updated_at = updated_at + i
   where org_id = p_org;
  update public.vehicules
     set date_achat = date_achat + j, etape_depuis = etape_depuis + j, reserve_jusqu_au = reserve_jusqu_au + j,
         created_at = created_at + i, updated_at = updated_at + i
   where org_id = p_org;
  update public.vehicule_etapes set date = date + j, created_at = created_at + i where org_id = p_org;
  update public.vehicule_photos set created_at = created_at + i where org_id = p_org;
  update public.documents set created_at = created_at + i where org_id = p_org;
  update public.ventes
     set date_vente = date_vente + j, date_livraison = date_livraison + j, annulee_le = annulee_le + i,
         created_at = created_at + i
   where org_id = p_org;
  update public.echeances set date_echeance = date_echeance + j, created_at = created_at + i where org_id = p_org;
  update public.paiements set date = date + j, annule_le = annule_le + i, created_at = created_at + i where org_id = p_org;
  update public.proformas
     set date = date + j, valide_jusqu_au = valide_jusqu_au + j, created_at = created_at + i, updated_at = updated_at + i
   where org_id = p_org;
  update public.frais set date = date + j, created_at = created_at + i, updated_at = updated_at + i where org_id = p_org;
  update public.frais_parts_figees set created_at = created_at + i where org_id = p_org;
  update public.transferts set date = date + j, created_at = created_at + i where org_id = p_org;
  update public.journal set created_at = created_at + i where org_id = p_org;

  perform demo.renumeroter(p_org);

  insert into demo.reference as r (org_id, date_ref) values (p_org, current_date + j)
  on conflict (org_id) do update set date_ref = r.date_ref + j
  returning r.date_ref into v_ref;
  return v_ref;
end
$$;

-- À appeler à chaque ouverture de la démo : recale les données sur aujourd'hui.
-- Renvoie le nombre de jours de décalage appliqué (0 si déjà à jour).
create or replace function public.demo_actualiser(p_org uuid)
returns integer
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_ref date;
  v_jours integer;
begin
  select date_ref into v_ref from demo.reference where org_id = p_org;
  if v_ref is null then
    raise exception using message = 'Entreprise de démonstration introuvable.', errcode = 'P0002';
  end if;
  v_jours := current_date - v_ref;
  if v_jours <> 0 then
    perform public.demo_decaler_dates(p_org, v_jours);
  end if;
  return v_jours;
end
$$;

create or replace function public.demo_initialiser(p_user uuid, p_email text)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  d          date := current_date;
  o          uuid;
  u_vendeur  uuid := gen_random_uuid();
  u_membre   uuid;
  c_caisse   uuid;
  c_om       uuid;
  c_banque   uuid;
  cl         uuid[] := array[]::uuid[];
  v          uuid[] := array[]::uuid[];
  e_a        uuid;
  e_b        uuid;
  e_c        uuid;
  s          uuid[] := array[]::uuid[];
  dm1        uuid;
  dm2        uuid;
  r          record;
  m          date;
begin
  if p_user is null then
    raise exception using message = 'Utilisateur de démonstration manquant.';
  end if;

  -- Agir au nom de l'utilisateur de démo (le temps de la transaction).
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);

  insert into auth.users (id, email) values (p_user, coalesce(p_email, 'demo@sahelautoimport.ml'))
  on conflict (id) do nothing;

  -- ---------------------------------------------------------------------------
  -- Entreprise, paramètres, équipe, comptes
  -- ---------------------------------------------------------------------------
  o := (public.organisation_creer('Sahel Auto Import', 'Bamako', 570) ->> 'id')::uuid;

  perform public.parametres_enregistrer(o, jsonb_build_object(
    'raison_sociale', 'Sahel Auto Import SARL',
    'slogan', 'Véhicules des États-Unis, dédouanés et prêts à rouler à Bamako',
    'adresse', 'Hamdallaye ACI 2000, rue 405, porte 112',
    'telephones', jsonb_build_array('+223 20 29 45 67', '+223 76 45 12 89'),
    'whatsapp', '+223 76 45 12 89',
    'email', 'contact@sahelautoimport.ml',
    'nif', '084123456M',
    'rccm', 'MA.BKO.2021.B.4521',
    'compte_bancaire', 'BDM-SA — ML016 01201 020401234567 89',
    'garantie_texte', 'Garantie moteur et boîte de vitesses : 1 mois ou 1 000 km, selon la première échéance.',
    'pied_document', 'Merci de votre confiance. Sahel Auto Import — Hamdallaye ACI 2000, Bamako.'));

  update public.membres set nom_affiche = 'Adama Sidibé', telephone = '+223 76 45 12 89'
   where org_id = o and user_id = p_user;

  insert into auth.users (id, email) values (u_vendeur, 'seydou.konate@sahelautoimport.ml');
  insert into public.membres (org_id, user_id, role, nom_affiche, telephone)
  values (o, u_vendeur, 'vendeur', 'Seydou Konaté', '+223 66 18 40 27');

  -- Un membre par rôle restant : la démonstration peut s'ouvrir sous chacun d'eux (écran de connexion).
  for r in select * from (values
      ('gerant', 'Mamadou Keïta', 'mamadou.keita@sahelautoimport.ml', '+223 76 22 81 05'),
      ('comptable', 'Awa Diarra', 'awa.diarra@sahelautoimport.ml', '+223 66 90 13 44'),
      ('lecture', 'Boubacar Cissé', 'boubacar.cisse@sahelautoimport.ml', '+223 79 51 36 20')
    ) as t(role, nom, email, telephone)
  loop
    insert into auth.users (id, email) values (gen_random_uuid(), r.email) returning id into u_membre;
    insert into public.membres (org_id, user_id, role, nom_affiche, telephone) values (o, u_membre, r.role, r.nom, r.telephone);
  end loop;

  select id into c_caisse from public.comptes where org_id = o and nom = 'Caisse';
  perform public.compte_enregistrer(o, jsonb_build_object('id', c_caisse, 'solde_initial', 3000000));
  c_om := (public.compte_enregistrer(o, jsonb_build_object('nom', 'Orange Money', 'type', 'mobile_money', 'ordre', 1)) ->> 'id')::uuid;
  c_banque := (public.compte_enregistrer(o, jsonb_build_object('nom', 'Banque BDM', 'type', 'banque', 'ordre', 2,
                                                                'solde_initial', 25000000)) ->> 'id')::uuid;

  -- ---------------------------------------------------------------------------
  -- Clients
  -- ---------------------------------------------------------------------------
  for r in
    select * from (values
      (1, 'Moussa Traoré',    '+223 76 12 34 56', 'Bamako', 'Hamdallaye, rue 312',        'NINA',      '18503120012345K'),
      (2, 'Aminata Diallo',   '+223 66 45 78 12', 'Bamako', 'Badalabougou, rue 22',       'NINA',      '19107250034871F'),
      (3, 'Oumar Coulibaly',  '+223 79 23 56 89', 'Kati',   'Quartier Malibougou',        'NINA',      '17811040027714B'),
      (4, 'Fatoumata Keïta',  '+223 65 87 21 43', 'Bamako', 'ACI 2000, rue 470',          'NINA',      '19302180041296D'),
      (5, 'Ibrahim Sangaré',  '+223 90 34 67 21', 'Ségou',  'Quartier Pelengana',         'CNI',       'CNI-0412-778-2019'),
      (6, 'Mariam Touré',     '+223 76 98 12 45', 'Bamako', 'Kalaban Coura, rue 95',      'NINA',      '18809090019452H'),
      (7, 'Bakary Dembélé',   '+223 70 56 43 21', 'Sikasso','Quartier Wayerma',           'passeport', 'AA2917354'),
      (8, 'Kadiatou Konaté',  '+223 69 21 87 54', 'Bamako', 'Faladié Sokoro, rue 830',    'NINA',      '19512300052183A')
    ) as t(n, nom, tel, ville, adresse, piece, numero)
    order by n
  loop
    cl := cl || (public.client_enregistrer(o, jsonb_build_object(
            'nom', r.nom, 'telephone', r.tel, 'whatsapp', r.tel, 'ville', r.ville, 'adresse', r.adresse,
            'type_piece', r.piece, 'numero_piece', r.numero)) ->> 'id')::uuid;
  end loop;

  -- ---------------------------------------------------------------------------
  -- Véhicules : création à la date d'achat, puis étapes jusqu'à l'embarquement
  -- (les véhicules d'une expédition sont mis en mer par l'expédition).
  -- ---------------------------------------------------------------------------
  for r in
    select * from (values
      ( 1, 'Toyota', 'Corolla', 'LE', 2019, 'Gris', 61200, 'copart', '43518276', 6400, -300, 'Copart Houston North, TX', 'clean', 'Avant léger', '2T1BURHE5KC027415', 9200000, 8600000,
        array['transport_usa','en_mer','au_port','convoi','douane','atelier','parc'], array[-297,-290,-258,-252,-248,-244,-238]),
      ( 2, 'Honda', 'CR-V', 'EX AWD', 2019, 'Gris', 54800, 'iaai', '35912478', 10900, -262, 'IAA Houston, TX', 'clean', 'Arrière', '2HKRW2H56KH506231', 13900000, 13000000,
        array['transport_usa','en_mer','au_port','convoi','douane','atelier','parc'], array[-259,-252,-220,-214,-210,-206,-200]),
      ( 3, 'Toyota', 'Camry', 'SE', 2020, 'Rouge', 48300, 'copart', '44102953', 9800, -235, 'Copart Savannah, GA', 'clean', 'Latéral droit', '4T1G11AK0LU318842', 13000000, 12300000,
        array['transport_usa','en_mer','au_port','convoi','douane','atelier','parc'], array[-232,-225,-193,-188,-184,-179,-173]),
      ( 4, 'Hyundai', 'Santa Fe', 'Sport 2.4', 2018, 'Argent', 72500, 'copart', '42877105', 7900, -215, 'Copart Houston South, TX', 'salvage', 'Avant', '5XYZU3LB8JG093517', 11500000, 10800000,
        array['transport_usa','en_mer','au_port','convoi','douane','atelier','parc'], array[-212,-205,-173,-167,-163,-159,-153]),
      ( 5, 'Lexus', 'RX 350', 'Premium', 2016, 'Argent', 88900, 'manheim', 'MH-2291047', 13800, -150, 'Manheim Dallas, TX', 'clean', null, '2T2BZMCAXGC104386', 16900000, 16000000,
        array['transport_usa','en_mer','au_port','convoi','douane','atelier','parc'], array[-147,-140,-110,-104,-100,-95,-88]),
      ( 6, 'Mercedes-Benz', 'GLE 350', '4MATIC', 2016, 'Gris', 79400, 'copart', '43365820', 16500, -135, 'Copart Atlanta East, GA', 'clean', 'Pare-chocs avant', '4JGDA5HB6GA661209', 19900000, 18800000,
        array['transport_usa'], array[-131]),
      ( 7, 'Toyota', 'Highlander', 'XLE', 2017, 'Argent', 70100, 'iaai', '36024517', 13200, -133, 'IAA Atlanta, GA', 'clean', 'Arrière', '5TDJZRFH5HS409731', 16200000, 15300000,
        array['transport_usa'], array[-129]),
      ( 8, 'Toyota', 'RAV4', 'XLE', 2018, 'Rouge', 58600, 'copart', '43390162', 10200, -131, 'Copart Savannah, GA', 'clean', 'Latéral gauche', '2T3RFREV5JW781254', 12500000, 11800000,
        array['transport_usa'], array[-127]),
      ( 9, 'Toyota', 'Camry', 'SE', 2018, 'Gris', 66700, 'copart', '43412087', 5600, -128, 'Copart Savannah, GA', 'salvage', 'Avant', '5YFBURHE7JP112058', 7900000, 7400000,
        array['transport_usa'], array[-125]),
      (10, 'Ford', 'Explorer', 'XLT', 2017, 'Argent', 84200, 'copart', '44871320', 9400, -40, 'Copart Houston North, TX', 'clean', 'Avant léger', '1FM5K8D87HGA63190', 12900000, 12000000,
        array['transport_usa'], array[-37]),
      (11, 'Kia', 'Sorento', 'LX', 2019, 'Gris', 51300, 'iaai', '36688214', 8900, -38, 'IAA Houston, TX', 'clean', 'Arrière', '5XYPG4A36KG541867', 11900000, 11200000,
        array['transport_usa'], array[-35]),
      (12, 'Toyota', 'RAV4', 'LE', 2019, 'Blanc', 44900, 'copart', '44930518', 11300, -36, 'Copart Houston South, TX', 'clean', 'Latéral droit', '2T3H1RFV5KW035476', 12800000, 12000000,
        array['transport_usa'], array[-33]),
      (13, 'Honda', 'Accord', 'Sport', 2018, 'Bleu', 62400, 'copart', '44905233', 7200, -33, 'Copart Houston North, TX', 'clean', 'Avant', '1HGCV1F38JA087214', 9200000, 8700000,
        array['transport_usa'], array[-30]),
      (14, 'Toyota', 'Camry', 'XSE', 2018, 'Blanc', 57300, 'iaai', '36301144', 8600, -60, 'IAA Baltimore, MD', 'clean', 'Avant léger', '4T1B61HK7JU662019', 11000000, 10300000,
        array['transport_usa'], array[-56]),
      (15, 'Hyundai', 'Tucson', 'SEL', 2019, 'Blanc', 49800, 'copart', '44215907', 7800, -57, 'Copart Baltimore, MD', 'clean', 'Arrière', 'KM8J33A41KU963205', 10200000, 9600000,
        array['transport_usa'], array[-54]),
      (16, 'Lexus', 'RX 350', 'F Sport', 2017, 'Blanc nacré', 69900, 'manheim', 'MH-2340518', 12900, -52, 'Manheim Baltimore-Washington, MD', 'clean', null, '58ABK1GGXHU047329', 16000000, 15200000,
        array['transport_usa'], array[-49]),
      (17, 'Toyota', 'RAV4', 'SE', 2017, 'Noir', 91800, 'copart', '43958211', 14200, -70, 'Copart Dallas, TX', 'clean', 'Latéral gauche', 'JTEBU5JR6H5215478', 18000000, 17000000,
        array['transport_usa','en_mer','au_port','convoi','douane'], array[-66,-58,-22,-14,-6]),
      (18, 'Nissan', 'Pathfinder', 'SV', 2017, 'Noir', 95600, 'iaai', '35788309', 7100, -170, 'IAA Houston, TX', 'clean', 'Moteur', '5N1DR2MM8HC657120', 10500000, 9800000,
        array['transport_usa','en_mer','au_port','convoi','douane','atelier','parc'], array[-167,-160,-128,-122,-118,-112,-75]),
      (19, 'Toyota', 'Camry', 'LE', 2019, 'Blanc', 39700, 'copart', '44020671', 7300, -95, 'Copart Houston North, TX', 'clean', 'Avant léger', '5YFEPRAE7LP022913', 9500000, 9000000,
        array['transport_usa','en_mer','au_port','convoi','douane','atelier','parc'], array[-92,-85,-53,-47,-43,-38,-20]),
      (20, 'Honda', 'CR-V', 'LX', 2017, 'Gris', 102300, 'copart', '43877524', 8800, -110, 'Copart Savannah, GA', 'clean', 'Arrière', '5FNYF6H54GB038251', 12200000, 11500000,
        array['transport_usa','en_mer','au_port','convoi','douane','atelier','parc'], array[-107,-100,-68,-62,-58,-52,-35]),
      (21, 'Kia', 'Sorento', 'LX', 2018, 'Gris bleu', 77400, 'copart', '45120964', 5200, -8, 'Copart Houston South, TX', 'salvage', 'Avant', '5XXGT4L30JG214683', null, null,
        array['transport_usa'], array[-4]),
      (22, 'Toyota', 'Highlander', 'LE', 2019, 'Blanc', 46200, 'iaai', '37012835', 17400, -2, 'IAA Dallas, TX', 'clean', 'Latéral droit', '5TDZZRFH4KS512794', null, null,
        null::text[], null::integer[]),
      (23, 'Hyundai', 'Santa Fe', 'SEL', 2019, 'Rouge', 53100, 'manheim', 'MH-2366812', 6100, -5, 'Manheim Houston, TX', 'clean', null, '5NPD84LFXKH801347', null, null,
        null::text[], null::integer[]),
      (24, 'Mercedes-Benz', 'GLE 350', '4MATIC', 2017, 'Blanc', 68800, 'copart', '44466309', 11600, -85, 'Copart Houston North, TX', 'clean', 'Avant', '55SWF4JB9HU195236', 15800000, 15000000,
        array['transport_usa','en_mer','au_port','convoi','douane','atelier'], array[-82,-75,-43,-37,-15,-9])
    ) as t(n, marque, modele, finition, annee, couleur, km, source, lot, usd, j_achat, lieu, titre, dommage, vin,
           affiche, plancher, etapes, jours)
    order by n
  loop
    v := v || (public.vehicule_enregistrer(o, jsonb_build_object(
           'marque', r.marque, 'modele', r.modele, 'finition', r.finition, 'annee', r.annee, 'couleur', r.couleur,
           'carburant', 'essence', 'transmission', 'automatique', 'kilometrage_km', r.km, 'source', r.source,
           'lot_numero', r.lot, 'date_achat', d + r.j_achat, 'lieu_achat', r.lieu, 'titre', r.titre,
           'dommage_principal', r.dommage, 'cles', true, 'demarre', true, 'vin', r.vin,
           'prix_achat', r.usd, 'devise_achat', 'USD', 'taux_achat', 570,
           'prix_affiche_xof', r.affiche, 'prix_plancher_xof', r.plancher,
           'carte_grise', case when r.n <= 8 or r.n in (18, 19, 20) then 'obtenue'
                               when r.n in (9, 24) then 'en_cours' else 'a_faire' end)) ->> 'id')::uuid;
    perform demo.parcours(o, v[r.n], r.etapes, r.jours);
  end loop;
  -- Photos de démonstration : fichiers livrés avec l'application (public/demo/vehicules/), crédits dans
  -- credits.json. Mise à jour directe : l'API refuse, à raison, tout chemin hors du dossier de l'entreprise.
  update public.vehicules ve
     set photo_principale_path = '/demo/vehicules/v' || lpad(t.n::text, 2, '0') || '.jpg'
    from unnest(v) with ordinality as t(id, n)
   where ve.id = t.id;
  insert into public.vehicule_photos (org_id, vehicule_id, path, ordre)
  select o, t.id, '/demo/vehicules/v' || lpad(t.n::text, 2, '0') || '.jpg', 0
    from unnest(v) with ordinality as t(id, n);
  update public.vehicules set created_at = coalesce(date_achat, d)::timestamptz + interval '10 hours'
   where org_id = o;

  -- ---------------------------------------------------------------------------
  -- Expéditions
  -- ---------------------------------------------------------------------------
  -- C : conteneur Maersk Savannah → Cotonou, arrivé et clôturé.
  e_c := (public.expedition_enregistrer(o, jsonb_build_object(
           'mode', 'conteneur', 'numero_conteneur', 'MSKU 739201-4', 'numero_bl', 'MAEU 238814590',
           'compagnie', 'Maersk', 'navire', 'Maersk Kalmar', 'port_depart', 'Savannah', 'port_arrivee', 'Cotonou',
           'date_arrivee_prevue', d - 90, 'notes', '4 véhicules — 40 pieds HC')) ->> 'id')::uuid;
  perform public.expedition_affecter(o, e_c, array[v[6], v[7], v[8], v[9]]);
  perform public.expedition_changer_statut(o, e_c, 'en_mer', d - 118);
  perform public.expedition_changer_statut(o, e_c, 'arrivee', d - 88);
  perform public.vehicules_changer_etape_lot(o, array[v[6], v[7], v[8], v[9]], 'convoi', d - 84);
  perform public.vehicules_changer_etape_lot(o, array[v[6], v[7], v[8], v[9]], 'douane', d - 80);
  perform demo.parcours(o, v[6], array['atelier', 'parc'], array[-74, -66]);
  perform demo.parcours(o, v[7], array['atelier', 'parc'], array[-74, -40]);
  perform demo.parcours(o, v[8], array['atelier', 'parc'], array[-72, -50]);
  perform demo.parcours(o, v[9], array['parc', 'atelier'], array[-60, -15]);
  perform public.expedition_changer_statut(o, e_c, 'cloturee', d - 45);

  -- B : RoRo Grimaldi Baltimore → Dakar, arrivé au port.
  e_b := (public.expedition_enregistrer(o, jsonb_build_object(
           'mode', 'roro', 'numero_bl', 'GRI BAL 2604417', 'compagnie', 'Grimaldi', 'navire', 'Grande Dakar',
           'port_depart', 'Baltimore', 'port_arrivee', 'Dakar', 'date_arrivee_prevue', d - 14,
           'notes', 'RoRo, 3 véhicules roulants')) ->> 'id')::uuid;
  perform public.expedition_affecter(o, e_b, array[v[14], v[15], v[16]]);
  perform public.expedition_changer_statut(o, e_b, 'en_mer', d - 38);
  perform public.expedition_changer_statut(o, e_b, 'arrivee', d - 12);
  perform demo.parcours(o, v[16], array['convoi'], array[-3]);

  -- A : conteneur MSC Houston → Cotonou, en mer.
  e_a := (public.expedition_enregistrer(o, jsonb_build_object(
           'mode', 'conteneur', 'numero_conteneur', 'MSCU 482913-6', 'numero_bl', 'MEDUH 4471902',
           'compagnie', 'MSC', 'navire', 'MSC Aurora', 'port_depart', 'Houston', 'port_arrivee', 'Cotonou',
           'date_arrivee_prevue', d + 6, 'notes', '4 véhicules — 40 pieds HC, chargement à Houston')) ->> 'id')::uuid;
  perform public.expedition_affecter(o, e_a, array[v[10], v[11], v[12], v[13]]);
  perform public.expedition_changer_statut(o, e_a, 'en_mer', d - 16);

  -- ---------------------------------------------------------------------------
  -- Frais : n = véhicule (portée vehicule) ; x = expédition (portée expedition) ;
  -- g = frais généraux. Compte : B = banque, C = caisse, O = Orange Money.
  -- ---------------------------------------------------------------------------
  for r in
    select * from (values
      -- Véhicule 1 — Corolla 2019
      ( 1, null, 'frais_enchere', 650, 'USD', -300, 'paye', 'B', 'Copart', 'Frais acheteur Copart', null),
      ( 1, null, 'remorquage', 300, 'USD', -298, 'paye', 'B', 'Dispatch Auto Houston', 'Remorquage vers le port', null),
      ( 1, null, 'fret', 1250, 'USD', -290, 'paye', 'B', 'MSC', 'Fret maritime Houston → Cotonou (part)', null),
      ( 1, null, 'port', 350000, 'XOF', -258, 'paye', 'C', 'Port autonome de Cotonou', 'Manutention et parc', null),
      ( 1, null, 'convoi', 450000, 'XOF', -252, 'paye', 'C', 'Transports Diarra & Fils', 'Convoi Cotonou → Bamako', null),
      ( 1, null, 'douane', 1250000, 'XOF', -248, 'paye', 'B', 'Transit Sahel Express', 'Droits et taxes de douane', null),
      ( 1, null, 'transitaire', 150000, 'XOF', -248, 'paye', 'B', 'Transit Sahel Express', 'Honoraires transitaire', null),
      ( 1, null, 'atelier', 180000, 'XOF', -244, 'paye', 'C', 'Garage Modibo', 'Débosselage avant et peinture', null),
      ( 1, null, 'carte_grise', 150000, 'XOF', -240, 'paye', 'C', 'DRTT Bamako', 'Immatriculation', null),
      -- Véhicule 2 — CR-V 2019
      ( 2, null, 'frais_enchere', 900, 'USD', -262, 'paye', 'B', 'IAAI', 'Frais acheteur IAA', null),
      ( 2, null, 'remorquage', 350, 'USD', -260, 'paye', 'B', 'Dispatch Auto Houston', 'Remorquage vers le port', null),
      ( 2, null, 'fret', 1300, 'USD', -252, 'paye', 'B', 'MSC', 'Fret maritime Houston → Cotonou (part)', null),
      ( 2, null, 'port', 350000, 'XOF', -220, 'paye', 'C', 'Port autonome de Cotonou', 'Manutention et parc', null),
      ( 2, null, 'convoi', 450000, 'XOF', -214, 'paye', 'C', 'Transports Diarra & Fils', 'Convoi Cotonou → Bamako', null),
      ( 2, null, 'douane', 1950000, 'XOF', -210, 'paye', 'B', 'Transit Sahel Express', 'Droits et taxes de douane', null),
      ( 2, null, 'transitaire', 150000, 'XOF', -210, 'paye', 'B', 'Transit Sahel Express', 'Honoraires transitaire', null),
      ( 2, null, 'atelier', 220000, 'XOF', -206, 'paye', 'C', 'Garage Modibo', 'Hayon arrière', null),
      ( 2, null, 'carte_grise', 150000, 'XOF', -202, 'paye', 'C', 'DRTT Bamako', 'Immatriculation', null),
      -- Véhicule 3 — Camry 2020
      ( 3, null, 'frais_enchere', 850, 'USD', -235, 'paye', 'B', 'Copart', 'Frais acheteur Copart', null),
      ( 3, null, 'remorquage', 300, 'USD', -233, 'paye', 'B', 'Peach State Towing', 'Remorquage vers le port', null),
      ( 3, null, 'fret', 1250, 'USD', -225, 'paye', 'B', 'Maersk', 'Fret maritime Savannah → Cotonou (part)', null),
      ( 3, null, 'port', 350000, 'XOF', -193, 'paye', 'C', 'Port autonome de Cotonou', 'Manutention et parc', null),
      ( 3, null, 'convoi', 450000, 'XOF', -188, 'paye', 'C', 'Transports Diarra & Fils', 'Convoi Cotonou → Bamako', null),
      ( 3, null, 'douane', 1800000, 'XOF', -184, 'paye', 'B', 'Transit Sahel Express', 'Droits et taxes de douane', null),
      ( 3, null, 'transitaire', 150000, 'XOF', -184, 'paye', 'B', 'Transit Sahel Express', 'Honoraires transitaire', null),
      ( 3, null, 'atelier', 350000, 'XOF', -179, 'paye', 'C', 'Garage Modibo', 'Portière droite et peinture', null),
      ( 3, null, 'carte_grise', 150000, 'XOF', -175, 'paye', 'C', 'DRTT Bamako', 'Immatriculation', null),
      -- Véhicule 4 — Santa Fe 2018
      ( 4, null, 'frais_enchere', 750, 'USD', -215, 'paye', 'B', 'Copart', 'Frais acheteur Copart', null),
      ( 4, null, 'remorquage', 350, 'USD', -213, 'paye', 'B', 'Dispatch Auto Houston', 'Remorquage vers le port', null),
      ( 4, null, 'fret', 1300, 'USD', -205, 'paye', 'B', 'MSC', 'Fret maritime Houston → Cotonou (part)', null),
      ( 4, null, 'port', 350000, 'XOF', -173, 'paye', 'C', 'Port autonome de Cotonou', 'Manutention et parc', null),
      ( 4, null, 'convoi', 450000, 'XOF', -167, 'paye', 'C', 'Transports Diarra & Fils', 'Convoi Cotonou → Bamako', null),
      ( 4, null, 'douane', 1500000, 'XOF', -163, 'paye', 'B', 'Transit Sahel Express', 'Droits et taxes de douane', null),
      ( 4, null, 'transitaire', 150000, 'XOF', -163, 'paye', 'B', 'Transit Sahel Express', 'Honoraires transitaire', null),
      ( 4, null, 'atelier', 480000, 'XOF', -159, 'paye', 'C', 'Garage Modibo', 'Pare-chocs, phare et calandre', null),
      ( 4, null, 'carte_grise', 150000, 'XOF', -155, 'paye', 'C', 'DRTT Bamako', 'Immatriculation', null),
      -- Véhicule 5 — RX 350 2016
      ( 5, null, 'frais_enchere', 950, 'USD', -150, 'paye', 'B', 'Manheim', 'Frais acheteur Manheim', null),
      ( 5, null, 'remorquage', 400, 'USD', -148, 'paye', 'B', 'Lone Star Towing', 'Remorquage Dallas → Houston', null),
      ( 5, null, 'fret', 1400, 'USD', -140, 'paye', 'B', 'MSC', 'Fret maritime Houston → Cotonou (part)', null),
      ( 5, null, 'port', 380000, 'XOF', -110, 'paye', 'C', 'Port autonome de Cotonou', 'Manutention et parc', null),
      ( 5, null, 'convoi', 450000, 'XOF', -104, 'paye', 'C', 'Transports Diarra & Fils', 'Convoi Cotonou → Bamako', null),
      ( 5, null, 'douane', 2650000, 'XOF', -100, 'paye', 'B', 'Transit Sahel Express', 'Droits et taxes de douane', null),
      ( 5, null, 'transitaire', 150000, 'XOF', -100, 'paye', 'B', 'Transit Sahel Express', 'Honoraires transitaire', null),
      ( 5, null, 'atelier', 420000, 'XOF', -95, 'paye', 'C', 'Garage Modibo', 'Révision complète et pneus', null),
      ( 5, null, 'carte_grise', 150000, 'XOF', -91, 'paye', 'C', 'DRTT Bamako', 'Immatriculation', null),
      -- Expédition C (Maersk, clôturée) et ses véhicules 6 à 9
      (null, 'C', 'fret', 4600, 'USD', -118, 'paye', 'B', 'Maersk', 'Fret conteneur 40 pieds Savannah → Cotonou', 'egale'),
      (null, 'C', 'assurance', 380, 'USD', -118, 'paye', 'B', 'Maersk', 'Assurance maritime', 'valeur'),
      (null, 'C', 'port', 1400000, 'XOF', -88, 'paye', 'C', 'Port autonome de Cotonou', 'Dépotage et manutention du conteneur', 'egale'),
      (null, 'C', 'transitaire', 400000, 'XOF', -80, 'paye', 'B', 'Transit Sahel Express', 'Honoraires transitaire (conteneur)', 'egale'),
      ( 6, null, 'frais_enchere', 1100, 'USD', -135, 'paye', 'B', 'Copart', 'Frais acheteur Copart', null),
      ( 6, null, 'remorquage', 400, 'USD', -133, 'paye', 'B', 'Peach State Towing', 'Remorquage vers le port', null),
      ( 6, null, 'convoi', 450000, 'XOF', -84, 'paye', 'C', 'Transports Diarra & Fils', 'Convoi Cotonou → Bamako', null),
      ( 6, null, 'douane', 3300000, 'XOF', -80, 'paye', 'B', 'Transit Sahel Express', 'Droits et taxes de douane', null),
      ( 6, null, 'atelier', 550000, 'XOF', -74, 'paye', 'C', 'Garage Modibo', 'Pare-chocs avant et capteurs', null),
      ( 6, null, 'carte_grise', 175000, 'XOF', -68, 'paye', 'C', 'DRTT Bamako', 'Immatriculation', null),
      ( 7, null, 'frais_enchere', 950, 'USD', -133, 'paye', 'B', 'IAAI', 'Frais acheteur IAA', null),
      ( 7, null, 'remorquage', 350, 'USD', -131, 'paye', 'B', 'Peach State Towing', 'Remorquage vers le port', null),
      ( 7, null, 'convoi', 450000, 'XOF', -84, 'paye', 'C', 'Transports Diarra & Fils', 'Convoi Cotonou → Bamako', null),
      ( 7, null, 'douane', 2500000, 'XOF', -80, 'paye', 'B', 'Transit Sahel Express', 'Droits et taxes de douane', null),
      ( 7, null, 'atelier', 300000, 'XOF', -74, 'paye', 'C', 'Garage Modibo', 'Hayon et feux arrière', null),
      ( 7, null, 'carte_grise', 150000, 'XOF', -45, 'paye', 'C', 'DRTT Bamako', 'Immatriculation', null),
      ( 8, null, 'frais_enchere', 850, 'USD', -131, 'paye', 'B', 'Copart', 'Frais acheteur Copart', null),
      ( 8, null, 'remorquage', 300, 'USD', -129, 'paye', 'B', 'Peach State Towing', 'Remorquage vers le port', null),
      ( 8, null, 'convoi', 450000, 'XOF', -84, 'paye', 'C', 'Transports Diarra & Fils', 'Convoi Cotonou → Bamako', null),
      ( 8, null, 'douane', 1900000, 'XOF', -80, 'paye', 'B', 'Transit Sahel Express', 'Droits et taxes de douane', null),
      ( 8, null, 'atelier', 200000, 'XOF', -72, 'paye', 'C', 'Garage Modibo', 'Portière gauche', null),
      ( 8, null, 'carte_grise', 150000, 'XOF', -55, 'paye', 'C', 'DRTT Bamako', 'Immatriculation', null),
      ( 9, null, 'frais_enchere', 600, 'USD', -128, 'paye', 'B', 'Copart', 'Frais acheteur Copart', null),
      ( 9, null, 'remorquage', 250, 'USD', -126, 'paye', 'B', 'Peach State Towing', 'Remorquage vers le port', null),
      ( 9, null, 'convoi', 450000, 'XOF', -84, 'paye', 'C', 'Transports Diarra & Fils', 'Convoi Cotonou → Bamako', null),
      ( 9, null, 'douane', 1100000, 'XOF', -80, 'paye', 'B', 'Transit Sahel Express', 'Droits et taxes de douane', null),
      ( 9, null, 'atelier', 350000, 'XOF', -10, 'a_payer', 'C', 'Garage Modibo', 'Train avant et parallélisme', null),
      -- Expédition A (MSC, en mer) et ses véhicules 10 à 13
      (null, 'A', 'fret', 4800, 'USD', -16, 'paye', 'B', 'MSC', 'Fret conteneur 40 pieds Houston → Cotonou', 'egale'),
      (null, 'A', 'assurance', 420, 'USD', -16, 'paye', 'B', 'MSC', 'Assurance maritime', 'valeur'),
      (null, 'A', 'divers', 380, 'USD', -18, 'paye', 'B', 'Houston Auto Loading', 'Chargement et calage du conteneur', 'egale'),
      (null, 'A', 'port', 1450000, 'XOF', -10, 'a_payer', 'C', 'Port autonome de Cotonou', 'Dépotage et manutention (à l''arrivée)', 'egale'),
      (10, null, 'frais_enchere', 820, 'USD', -40, 'paye', 'B', 'Copart', 'Frais acheteur Copart', null),
      (10, null, 'remorquage', 380, 'USD', -38, 'paye', 'B', 'Dispatch Auto Houston', 'Remorquage vers le port', null),
      (10, null, 'douane', 1900000, 'XOF', -12, 'a_payer', 'B', 'Transit Sahel Express', 'Douane (estimation du transitaire)', null),
      (10, null, 'convoi', 450000, 'XOF', -12, 'a_payer', 'C', 'Transports Diarra & Fils', 'Convoi Cotonou → Bamako (réservé)', null),
      (11, null, 'frais_enchere', 780, 'USD', -38, 'paye', 'B', 'IAAI', 'Frais acheteur IAA', null),
      (11, null, 'remorquage', 320, 'USD', -36, 'paye', 'B', 'Dispatch Auto Houston', 'Remorquage vers le port', null),
      (11, null, 'douane', 1700000, 'XOF', -6, 'a_payer', 'B', 'Transit Sahel Express', 'Douane (estimation du transitaire)', null),
      (11, null, 'convoi', 450000, 'XOF', -6, 'a_payer', 'C', 'Transports Diarra & Fils', 'Convoi Cotonou → Bamako (réservé)', null),
      (12, null, 'frais_enchere', 900, 'USD', -36, 'paye', 'B', 'Copart', 'Frais acheteur Copart', null),
      (12, null, 'remorquage', 350, 'USD', -34, 'paye', 'B', 'Dispatch Auto Houston', 'Remorquage vers le port', null),
      (13, null, 'frais_enchere', 700, 'USD', -33, 'paye', 'B', 'Copart', 'Frais acheteur Copart', null),
      (13, null, 'remorquage', 300, 'USD', -31, 'paye', 'B', 'Dispatch Auto Houston', 'Remorquage vers le port', null),
      -- Expédition B (Grimaldi RoRo, arrivée à Dakar) et ses véhicules 14 à 16
      (null, 'B', 'fret', 4050, 'USD', -38, 'paye', 'B', 'Grimaldi', 'Fret RoRo Baltimore → Dakar (3 véhicules)', 'egale'),
      (null, 'B', 'port', 540000, 'XOF', -5, 'a_payer', 'C', 'Port autonome de Dakar', 'Magasinage et manutention', 'egale'),
      (14, null, 'frais_enchere', 800, 'USD', -60, 'paye', 'B', 'IAAI', 'Frais acheteur IAA', null),
      (14, null, 'remorquage', 300, 'USD', -58, 'paye', 'B', 'Chesapeake Towing', 'Remorquage vers le port', null),
      (15, null, 'frais_enchere', 720, 'USD', -57, 'paye', 'B', 'Copart', 'Frais acheteur Copart', null),
      (15, null, 'remorquage', 300, 'USD', -55, 'paye', 'B', 'Chesapeake Towing', 'Remorquage vers le port', null),
      (16, null, 'frais_enchere', 1000, 'USD', -52, 'paye', 'B', 'Manheim', 'Frais acheteur Manheim', null),
      (16, null, 'remorquage', 350, 'USD', -50, 'paye', 'B', 'Chesapeake Towing', 'Remorquage vers le port', null),
      (16, null, 'convoi', 650000, 'XOF', -3, 'paye', 'C', 'Transports Diarra & Fils', 'Convoi Dakar → Bamako', null),
      -- Véhicules hors expédition suivie
      (17, null, 'frais_enchere', 1050, 'USD', -70, 'paye', 'B', 'Copart', 'Frais acheteur Copart', null),
      (17, null, 'remorquage', 400, 'USD', -68, 'paye', 'B', 'Lone Star Towing', 'Remorquage Dallas → Houston', null),
      (17, null, 'fret', 1400, 'USD', -58, 'paye', 'B', 'MSC', 'Fret maritime Houston → Cotonou (part)', null),
      (17, null, 'port', 380000, 'XOF', -22, 'paye', 'C', 'Port autonome de Cotonou', 'Manutention et parc', null),
      (17, null, 'convoi', 450000, 'XOF', -14, 'paye', 'C', 'Transports Diarra & Fils', 'Convoi Cotonou → Bamako', null),
      (17, null, 'transitaire', 150000, 'XOF', -6, 'paye', 'B', 'Transit Sahel Express', 'Honoraires transitaire', null),
      (17, null, 'douane', 3100000, 'XOF', -6, 'a_payer', 'B', 'Transit Sahel Express', 'Droits et taxes de douane (liquidation en cours)', null),
      (18, null, 'frais_enchere', 700, 'USD', -170, 'paye', 'B', 'IAAI', 'Frais acheteur IAA', null),
      (18, null, 'remorquage', 350, 'USD', -168, 'paye', 'B', 'Dispatch Auto Houston', 'Remorquage vers le port', null),
      (18, null, 'fret', 1250, 'USD', -160, 'paye', 'B', 'MSC', 'Fret maritime Houston → Cotonou (part)', null),
      (18, null, 'port', 350000, 'XOF', -128, 'paye', 'C', 'Port autonome de Cotonou', 'Manutention et parc', null),
      (18, null, 'convoi', 450000, 'XOF', -122, 'paye', 'C', 'Transports Diarra & Fils', 'Convoi Cotonou → Bamako', null),
      (18, null, 'douane', 1450000, 'XOF', -118, 'paye', 'B', 'Transit Sahel Express', 'Droits et taxes de douane', null),
      (18, null, 'transitaire', 150000, 'XOF', -118, 'paye', 'B', 'Transit Sahel Express', 'Honoraires transitaire', null),
      (18, null, 'atelier', 650000, 'XOF', -112, 'paye', 'C', 'Garage Modibo', 'Joint de culasse et courroie', null),
      (18, null, 'carte_grise', 150000, 'XOF', -80, 'paye', 'C', 'DRTT Bamako', 'Immatriculation', null),
      (19, null, 'frais_enchere', 700, 'USD', -95, 'paye', 'B', 'Copart', 'Frais acheteur Copart', null),
      (19, null, 'remorquage', 300, 'USD', -93, 'paye', 'B', 'Dispatch Auto Houston', 'Remorquage vers le port', null),
      (19, null, 'fret', 1250, 'USD', -85, 'paye', 'B', 'MSC', 'Fret maritime Houston → Cotonou (part)', null),
      (19, null, 'port', 350000, 'XOF', -53, 'paye', 'C', 'Port autonome de Cotonou', 'Manutention et parc', null),
      (19, null, 'convoi', 450000, 'XOF', -47, 'paye', 'C', 'Transports Diarra & Fils', 'Convoi Cotonou → Bamako', null),
      (19, null, 'douane', 1400000, 'XOF', -43, 'paye', 'B', 'Transit Sahel Express', 'Droits et taxes de douane', null),
      (19, null, 'transitaire', 150000, 'XOF', -43, 'paye', 'B', 'Transit Sahel Express', 'Honoraires transitaire', null),
      (19, null, 'atelier', 150000, 'XOF', -38, 'paye', 'C', 'Garage Modibo', 'Pare-chocs avant', null),
      (19, null, 'carte_grise', 150000, 'XOF', -25, 'paye', 'C', 'DRTT Bamako', 'Immatriculation', null),
      (20, null, 'frais_enchere', 820, 'USD', -110, 'paye', 'B', 'Copart', 'Frais acheteur Copart', null),
      (20, null, 'remorquage', 350, 'USD', -108, 'paye', 'B', 'Peach State Towing', 'Remorquage vers le port', null),
      (20, null, 'fret', 1350, 'USD', -100, 'paye', 'B', 'Maersk', 'Fret maritime Savannah → Cotonou (part)', null),
      (20, null, 'port', 350000, 'XOF', -68, 'paye', 'C', 'Port autonome de Cotonou', 'Manutention et parc', null),
      (20, null, 'convoi', 450000, 'XOF', -62, 'paye', 'C', 'Transports Diarra & Fils', 'Convoi Cotonou → Bamako', null),
      (20, null, 'douane', 1700000, 'XOF', -58, 'paye', 'B', 'Transit Sahel Express', 'Droits et taxes de douane', null),
      (20, null, 'transitaire', 150000, 'XOF', -58, 'paye', 'B', 'Transit Sahel Express', 'Honoraires transitaire', null),
      (20, null, 'atelier', 300000, 'XOF', -52, 'paye', 'C', 'Garage Modibo', 'Hayon et optiques', null),
      (20, null, 'carte_grise', 150000, 'XOF', -40, 'paye', 'C', 'DRTT Bamako', 'Immatriculation', null),
      (21, null, 'frais_enchere', 580, 'USD', -8, 'paye', 'B', 'Copart', 'Frais acheteur Copart', null),
      (21, null, 'remorquage', 280, 'USD', -4, 'a_payer', 'B', 'Dispatch Auto Houston', 'Remorquage vers le port', null),
      (22, null, 'frais_enchere', 1150, 'USD', -2, 'a_payer', 'B', 'IAAI', 'Frais acheteur IAA (à régler sous 3 jours)', null),
      (23, null, 'frais_enchere', 650, 'USD', -5, 'paye', 'B', 'Manheim', 'Frais acheteur Manheim', null),
      (24, null, 'frais_enchere', 950, 'USD', -85, 'paye', 'B', 'Copart', 'Frais acheteur Copart', null),
      (24, null, 'remorquage', 350, 'USD', -83, 'paye', 'B', 'Dispatch Auto Houston', 'Remorquage vers le port', null),
      (24, null, 'fret', 1350, 'USD', -75, 'paye', 'B', 'MSC', 'Fret maritime Houston → Cotonou (part)', null),
      (24, null, 'port', 380000, 'XOF', -43, 'paye', 'C', 'Port autonome de Cotonou', 'Manutention et parc', null),
      (24, null, 'convoi', 450000, 'XOF', -37, 'paye', 'C', 'Transports Diarra & Fils', 'Convoi Cotonou → Bamako', null),
      (24, null, 'transitaire', 150000, 'XOF', -15, 'paye', 'B', 'Transit Sahel Express', 'Honoraires transitaire', null),
      (24, null, 'douane', 2600000, 'XOF', -15, 'paye', 'B', 'Transit Sahel Express', 'Droits et taxes de douane', null),
      (24, null, 'atelier', 800000, 'XOF', -9, 'a_payer', 'C', 'Garage Modibo', 'Carrosserie avant et airbags', null)
    ) as t(n, exp, categorie, montant, devise, j, statut, compte, fournisseur, libelle, repartition)
  loop
    perform public.frais_enregistrer(o, jsonb_build_object(
      'portee', case when r.n is not null then 'vehicule' else 'expedition' end,
      'vehicule_id', case when r.n is not null then v[r.n] end,
      'expedition_id', case r.exp when 'A' then e_a when 'B' then e_b when 'C' then e_c end,
      'categorie', r.categorie, 'libelle', r.libelle, 'montant', r.montant, 'devise', r.devise,
      'taux', case when r.devise = 'USD' then 570 end, 'repartition', r.repartition,
      'fournisseur', r.fournisseur, 'date', d + r.j, 'statut', r.statut,
      'compte_id', case when r.statut = 'paye' then case r.compte when 'B' then c_banque when 'O' then c_om else c_caisse end end));
  end loop;

  -- Dépenses générales des 8 derniers mois (loyer, salaires, électricité, communication).
  for m in select generate_series(date_trunc('month', d::timestamp) - interval '7 months',
                                  date_trunc('month', d::timestamp), interval '1 month')::date
  loop
    if m + 4 <= d then
      perform public.frais_enregistrer(o, jsonb_build_object('portee', 'generale', 'categorie', 'loyer',
        'libelle', 'Loyer du parc — ' || to_char(m, 'MM/YYYY'), 'montant', 350000, 'date', m + 4,
        'fournisseur', 'SCI Hamdallaye', 'compte_id', c_banque));
    end if;
    if m + 11 <= d then
      perform public.frais_enregistrer(o, jsonb_build_object('portee', 'generale', 'categorie', 'electricite',
        'libelle', 'Facture EDM — ' || to_char(m, 'MM/YYYY'), 'montant', 65000, 'date', m + 11,
        'fournisseur', 'EDM-SA', 'compte_id', c_caisse));
    end if;
    if m + 14 <= d then
      perform public.frais_enregistrer(o, jsonb_build_object('portee', 'generale', 'categorie', 'communication',
        'libelle', 'Forfaits téléphone et internet', 'montant', 35000, 'date', m + 14,
        'fournisseur', 'Orange Mali', 'compte_id', c_om));
    end if;
    if m + 27 <= d then
      perform public.frais_enregistrer(o, jsonb_build_object('portee', 'generale', 'categorie', 'salaires',
        'libelle', 'Salaires (vendeur, gardien, mécanicien) — ' || to_char(m, 'MM/YYYY'), 'montant', 450000,
        'date', m + 27, 'compte_id', c_caisse));
    end if;
  end loop;

  -- ---------------------------------------------------------------------------
  -- Ventes et encaissements, dans l'ordre chronologique (numéros croissants).
  -- ---------------------------------------------------------------------------
  -- S1 : Corolla 2019 → Moussa Traoré, comptant, soldée en espèces.
  s := s || (public.vente_creer(o, jsonb_build_object('vehicule_id', v[1], 'client_id', cl[1], 'prix_xof', 8900000,
        'date_vente', d - 235, 'acompte', jsonb_build_object('montant_xof', 8900000, 'mode', 'especes', 'date', d - 235)))
        ->> 'id')::uuid;
  perform public.vente_livrer(o, s[1], d - 233);

  -- S2 : CR-V → Aminata Diallo, virement puis Orange Money.
  s := s || (public.vente_creer(o, jsonb_build_object('vehicule_id', v[2], 'client_id', cl[2], 'prix_xof', 13500000,
        'date_vente', d - 196, 'acompte', jsonb_build_object('montant_xof', 10000000, 'mode', 'virement', 'date', d - 196,
        'reference', 'VIR BDM ' || to_char(d - 196, 'YYYYMMDD') || '-004512', 'compte_id', c_banque)))
        ->> 'id')::uuid;
  perform public.paiement_ajouter(o, jsonb_build_object('vente_id', s[2], 'montant_xof', 1000000, 'mode', 'orange_money',
    'date', d - 189, 'reference', 'CI' || to_char(d - 189, 'YYMMDD') || '.1432.C48213', 'compte_id', c_om));
  perform public.paiement_ajouter(o, jsonb_build_object('vente_id', s[2], 'montant_xof', 2500000, 'mode', 'especes',
    'date', d - 189, 'compte_id', c_caisse));
  perform public.vente_livrer(o, s[2], d - 189);

  -- S3 : Camry 2020 → Oumar Coulibaly (vendeur : Seydou), remise 200 000.
  s := s || (public.vente_creer(o, jsonb_build_object('vehicule_id', v[3], 'client_id', cl[3], 'prix_xof', 13000000,
        'remise_xof', 200000, 'date_vente', d - 165, 'vendeur_id', u_vendeur,
        'acompte', jsonb_build_object('montant_xof', 11800000, 'mode', 'especes', 'date', d - 165)))
        ->> 'id')::uuid;
  perform public.paiement_ajouter(o, jsonb_build_object('vente_id', s[3], 'montant_xof', 1000000, 'mode', 'wave',
    'date', d - 165, 'reference', 'T_7KZ2Q4MXJ9' || to_char(d - 165, 'DD'), 'compte_id', c_om));
  perform public.vente_livrer(o, s[3], d - 163);

  -- S4 : Santa Fe → Ibrahim Sangaré, puis annulée (financement refusé) et acompte remboursé.
  s := s || (public.vente_creer(o, jsonb_build_object('vehicule_id', v[4], 'client_id', cl[5], 'prix_xof', 11200000,
        'date_vente', d - 140, 'acompte', jsonb_build_object('montant_xof', 2000000, 'mode', 'orange_money', 'date', d - 140,
        'reference', 'CI' || to_char(d - 140, 'YYMMDD') || '.0917.A20476', 'compte_id', c_om)))
        ->> 'id')::uuid;
  perform public.vente_annuler(o, s[4], 'Désistement du client : financement bancaire refusé.');
  update public.ventes set annulee_le = (d - 128)::timestamptz + interval '11 hours' where id = s[4];
  perform public.paiement_ajouter(o, jsonb_build_object('vente_id', s[4], 'montant_xof', -2000000, 'mode', 'orange_money',
    'date', d - 126, 'reference', 'CI' || to_char(d - 126, 'YYMMDD') || '.1605.R11820', 'compte_id', c_om,
    'notes', 'Remboursement de l''acompte après annulation'));

  -- S5 : Santa Fe revendu → Fatoumata Keïta, virement.
  s := s || (public.vente_creer(o, jsonb_build_object('vehicule_id', v[4], 'client_id', cl[4], 'prix_xof', 11000000,
        'date_vente', d - 95, 'acompte', jsonb_build_object('montant_xof', 11000000, 'mode', 'virement', 'date', d - 95,
        'reference', 'VIR ECOBANK ' || to_char(d - 95, 'YYYYMMDD') || '-118802', 'compte_id', c_banque)))
        ->> 'id')::uuid;
  perform public.vente_livrer(o, s[5], d - 93);

  -- S6 : RX 350 → Mariam Touré, vente échelonnée (une échéance en retard).
  s := s || (public.vente_creer(o, jsonb_build_object('vehicule_id', v[5], 'client_id', cl[6], 'prix_xof', 16500000,
        'date_vente', d - 80, 'mode', 'echelonne',
        'acompte', jsonb_build_object('montant_xof', 6000000, 'mode', 'especes', 'date', d - 80),
        'echeances', jsonb_build_array(
          jsonb_build_object('date_echeance', d - 50, 'montant_xof', 3500000),
          jsonb_build_object('date_echeance', d - 20, 'montant_xof', 3500000),
          jsonb_build_object('date_echeance', d + 10, 'montant_xof', 3500000))))
        ->> 'id')::uuid;
  perform public.vente_livrer(o, s[6], d - 78);

  -- S7 : GLE 350 → Bakary Dembélé (vendeur : Seydou).
  s := s || (public.vente_creer(o, jsonb_build_object('vehicule_id', v[6], 'client_id', cl[7], 'prix_xof', 19500000,
        'date_vente', d - 60, 'vendeur_id', u_vendeur,
        'acompte', jsonb_build_object('montant_xof', 18000000, 'mode', 'virement', 'date', d - 60,
        'reference', 'VIR BDM ' || to_char(d - 60, 'YYYYMMDD') || '-007731', 'compte_id', c_banque)))
        ->> 'id')::uuid;
  perform public.paiement_ajouter(o, jsonb_build_object('vente_id', s[7], 'montant_xof', 1500000, 'mode', 'especes',
    'date', d - 57, 'compte_id', c_caisse));
  perform public.vente_livrer(o, s[7], d - 55);

  perform public.paiement_ajouter(o, jsonb_build_object('vente_id', s[6], 'montant_xof', 3500000, 'mode', 'virement',
    'date', d - 49, 'reference', 'VIR BICIM ' || to_char(d - 49, 'YYYYMMDD') || '-220914', 'compte_id', c_banque));

  -- Transfert : versement des espèces à la banque.
  perform public.transfert_enregistrer(o, jsonb_build_object('compte_source', c_caisse, 'compte_dest', c_banque,
    'montant_xof', 8000000, 'date', d - 40, 'note', 'Versement d''espèces à la BDM'));

  -- S8 : Highlander 2017 → Moussa Traoré (client fidèle), au parc, pas encore livré.
  s := s || (public.vente_creer(o, jsonb_build_object('vehicule_id', v[7], 'client_id', cl[1], 'prix_xof', 15800000,
        'date_vente', d - 30,
        'acompte', jsonb_build_object('montant_xof', 10000000, 'mode', 'virement', 'date', d - 30,
        'reference', 'VIR BDM ' || to_char(d - 30, 'YYYYMMDD') || '-009904', 'compte_id', c_banque)))
        ->> 'id')::uuid;
  perform public.paiement_ajouter(o, jsonb_build_object('vente_id', s[8], 'montant_xof', 3000000, 'mode', 'especes',
    'date', d - 22, 'compte_id', c_caisse));
  perform public.paiement_ajouter(o, jsonb_build_object('vente_id', s[6], 'montant_xof', 1500000, 'mode', 'especes',
    'date', d - 18, 'compte_id', c_caisse));

  perform public.transfert_enregistrer(o, jsonb_build_object('compte_source', c_om, 'compte_dest', c_caisse,
    'montant_xof', 1500000, 'date', d - 15, 'note', 'Retrait Orange Money'));

  -- S9 : Explorer, encore en mer → Kadiatou Konaté (vente sur arrivage, vendeur : Seydou).
  s := s || (public.vente_creer(o, jsonb_build_object('vehicule_id', v[10], 'client_id', cl[8], 'prix_xof', 12500000,
        'date_vente', d - 12, 'vendeur_id', u_vendeur,
        'acompte', jsonb_build_object('montant_xof', 5000000, 'mode', 'especes', 'date', d - 12),
        'notes', 'Vente sur arrivage : livraison à Bamako après dédouanement.'))
        ->> 'id')::uuid;

  -- S10 : Sorento, encore en mer → Ibrahim Sangaré.
  s := s || (public.vente_creer(o, jsonb_build_object('vehicule_id', v[11], 'client_id', cl[5], 'prix_xof', 11500000,
        'date_vente', d - 6,
        'acompte', jsonb_build_object('montant_xof', 3000000, 'mode', 'especes', 'date', d - 6),
        'notes', 'Vente sur arrivage.'))
        ->> 'id')::uuid;
  perform public.paiement_ajouter(o, jsonb_build_object('vente_id', s[10], 'montant_xof', 1000000, 'mode', 'wave',
    'date', d - 6, 'reference', 'T_Q8M3ZP2WX' || to_char(d - 6, 'DD'), 'compte_id', c_om));
  perform public.paiement_ajouter(o, jsonb_build_object('vente_id', s[9], 'montant_xof', 1000000, 'mode', 'orange_money',
    'date', d - 5, 'reference', 'CI' || to_char(d - 5, 'YYMMDD') || '.1122.C90344', 'compte_id', c_om));
  perform public.paiement_ajouter(o, jsonb_build_object('vente_id', s[10], 'montant_xof', 500000, 'mode', 'moov_money',
    'date', d - 2, 'reference', 'MM' || to_char(d - 2, 'YYMMDD') || '.0932.A11254', 'compte_id', c_om));

  -- ---------------------------------------------------------------------------
  -- Proformas, réservation, demandes, archivage
  -- ---------------------------------------------------------------------------
  perform public.proforma_creer(o, jsonb_build_object('vehicule_id', v[20], 'client_id', cl[8], 'prix_xof', 12200000,
    'date', d - 30, 'valide_jusqu_au', d - 15));
  perform public.proforma_creer(o, jsonb_build_object('vehicule_id', v[19], 'client_id', cl[7], 'prix_xof', 9500000,
    'remise_xof', 200000, 'date', d - 3));

  perform public.vehicule_reserver(o, v[8], cl[2], d + 4);

  dm1 := (public.demande_enregistrer(o, jsonb_build_object('client_id', cl[4], 'marque', 'Toyota', 'modele', 'RAV4',
            'annee_min', 2018, 'annee_max', 2020, 'budget_max_xof', 13000000,
            'notes', 'Pour son mari ; couleur claire de préférence.')) ->> 'id')::uuid;
  update public.demandes set created_at = (d - 20)::timestamptz + interval '10 hours', updated_at = (d - 20)::timestamptz + interval '10 hours' where id = dm1;
  dm2 := (public.demande_enregistrer(o, jsonb_build_object('client_id', cl[3], 'marque', 'Toyota',
            'modele', 'Land Cruiser', 'annee_min', 2015, 'budget_max_xof', 25000000,
            'notes', 'Version 7 places, diesel si possible.')) ->> 'id')::uuid;
  update public.demandes set created_at = (d - 9)::timestamptz + interval '16 hours', updated_at = (d - 9)::timestamptz + interval '16 hours' where id = dm2;

  perform public.vehicule_archiver(o, v[1], true);

  -- Horodatages de saisie vraisemblables : le jour de l'opération, en heures de
  -- bureau, dans l'ordre réel de saisie.
  update public.ventes t set created_at = x.h from (
    select id, date_vente + interval '9 hours' + row_number() over (partition by date_vente order by created_at, id) * interval '17 minutes' as h
      from public.ventes where org_id = o) x where t.id = x.id;
  update public.paiements t set created_at = x.h from (
    select id, date + interval '9 hours' + row_number() over (partition by date order by created_at, id) * interval '23 minutes' as h
      from public.paiements where org_id = o) x where t.id = x.id;
  update public.frais t set created_at = x.h, updated_at = x.h from (
    select id, date + interval '8 hours' + row_number() over (partition by date order by created_at, id) * interval '11 minutes' as h
      from public.frais where org_id = o) x where t.id = x.id;
  update public.vehicule_etapes t set created_at = x.h from (
    select id, date + interval '8 hours' + row_number() over (partition by date order by created_at, id) * interval '5 minutes' as h
      from public.vehicule_etapes where org_id = o) x where t.id = x.id;
  update public.proformas set created_at = date + interval '15 hours', updated_at = date + interval '15 hours' where org_id = o;
  update public.transferts set created_at = date + interval '17 hours' where org_id = o;
  update public.expeditions t set created_at = coalesce(x.debut, d) + interval '14 hours', updated_at = coalesce(x.debut, d) + interval '14 hours'
    from (select e.id, least(e.date_depart, (select min(ve.date) from public.vehicule_etapes ve
                                             join public.vehicules v on v.id = ve.vehicule_id
                                            where v.expedition_id = e.id and ve.etape = 'en_mer')) - 3 as debut
            from public.expeditions e where e.org_id = o) x
   where t.id = x.id;
  update public.clients c set created_at = coalesce(x.premier, d - 30) + interval '9 hours', updated_at = coalesce(x.premier, d - 30) + interval '9 hours'
    from (select c2.id, (select min(y) from (select min(ve.date_vente) as y from public.ventes ve where ve.client_id = c2.id
                                             union all select min(p.date) from public.proformas p where p.client_id = c2.id
                                             union all select min(dm.created_at)::date from public.demandes dm where dm.client_id = c2.id) z) - 2 as premier
            from public.clients c2 where c2.org_id = o) x
   where c.id = x.id;
  update public.journal j set created_at = coalesce(
      (select p.created_at from public.paiements p where p.id = (j.details ->> 'paiement_id')::uuid),
      (j.details ->> 'date')::date + interval '8 hours 30 minutes',
      (j.details ->> 'date_livraison')::date + interval '16 hours',
      case j.action
        when 'vente_creer' then (select ve.created_at from public.ventes ve where ve.id = j.entite_id)
        when 'vente_annuler' then (select ve.annulee_le from public.ventes ve where ve.id = j.entite_id)
        when 'frais_creer' then (select f.created_at from public.frais f where f.id = j.entite_id)
        when 'vehicule_creer' then (select v.created_at from public.vehicules v where v.id = j.entite_id)
        when 'proforma_creer' then (select p.created_at from public.proformas p where p.id = j.entite_id)
        when 'transfert_creer' then (select t.created_at from public.transferts t where t.id = j.entite_id)
        when 'expedition_creer' then (select e.created_at from public.expeditions e where e.id = j.entite_id)
        when 'client_creer' then (select c.created_at from public.clients c where c.id = j.entite_id)
        when 'demande_creer' then (select dm.created_at from public.demandes dm where dm.id = j.entite_id)
      end,
      j.created_at)
   where j.org_id = o;

  -- Numéros de documents alignés sur les dates (l'avoir porte la date d'annulation).
  perform demo.renumeroter(o);
  insert into demo.reference (org_id, date_ref) values (o, d)
  on conflict (org_id) do update set date_ref = excluded.date_ref;

  return o;
end
$$;

revoke all on function public.demo_initialiser(uuid, text) from public;
revoke all on function public.demo_decaler_dates(uuid, integer) from public;
revoke all on function public.demo_actualiser(uuid) from public;
revoke all on function demo.parcours(uuid, uuid, text[], integer[]) from public;
revoke all on function demo.renumeroter(uuid) from public;
do $$
begin
  if exists (select 1 from pg_catalog.pg_roles where rolname = 'anon') then
    revoke all on function public.demo_initialiser(uuid, text) from anon, authenticated;
    revoke all on function public.demo_decaler_dates(uuid, integer) from anon, authenticated;
    revoke all on function public.demo_actualiser(uuid) from anon, authenticated;
  end if;
end
$$;
