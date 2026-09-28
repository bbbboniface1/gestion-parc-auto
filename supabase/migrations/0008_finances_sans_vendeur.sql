-- =============================================================================
-- 0008 — Finances interdites au rôle vendeur, quel que soit le réglage des coûts
--
-- Décision du 28/09/2026 : trésorerie, rentabilité et liste des dépenses sont
-- réservées au propriétaire, au gérant, au comptable et au rôle lecture seule.
-- Avant, un vendeur y accédait dès que « masquer les coûts aux vendeurs » était
-- désactivé. Ce réglage ne gouverne plus que les coûts et marges affichés sur les
-- véhicules, les ventes et le tableau de bord.
--
-- Seule la liste des rôles autorisés change : le corps des fonctions est repris
-- tel quel depuis le catalogue, la liste est remplacée, puis la fonction recréée.
-- =============================================================================

do $$
declare
  c_avant constant text := 'array[''proprietaire'', ''gerant'', ''vendeur'', ''comptable'', ''lecture'']';
  c_apres constant text := 'array[''proprietaire'', ''gerant'', ''comptable'', ''lecture'']';
  v_fonction text;
  v_def      text;
begin
  foreach v_fonction in array array[
    'public.tresorerie(uuid, date, date)',
    'public.rapport_marges(uuid, date, date)',
    'public.frais_lister(uuid, jsonb)'
  ] loop
    v_def := pg_catalog.pg_get_functiondef(v_fonction::regprocedure);
    if position(c_avant in v_def) = 0 then
      raise exception 'Migration 0008 : liste des rôles introuvable dans %', v_fonction;
    end if;
    execute replace(v_def, c_avant, c_apres);
  end loop;
end
$$;
