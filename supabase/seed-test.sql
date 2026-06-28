-- Données de test — exécuter après schema.sql (avec un compte authentifié actif)
-- Compte de test suggéré : demo@automali.ml / demo123456

-- Voitures de démonstration
insert into voitures (
  marque, modele, annee, couleur, numero_chassis, kilometrage, carburant, transmission,
  statut, prix_achat_usd, frais_transport, prix_vente_fcfa,
  paiement_fournisseur, montant_paye_fournisseur, date_paiement_fournisseur,
  date_commande, date_expedition, date_arrivee_prevue, date_arrivee_reelle, numero_conteneur, notes
) values
  ('Toyota', 'Camry', 2020, 'Blanc', '1HGBH41JXMN109186', 45000, 'Essence', 'Automatique',
   'en_stock', 12500, 2500000, 9500000, 'paye', 12500, '2025-11-10',
   '2025-09-01', '2025-10-01', '2025-11-01', '2025-11-05', 'MSCU123456', 'Voiture en excellent état'),
  ('Honda', 'CR-V', 2019, 'Noir', '2HKRW2H50KH123456', 62000, 'Essence', 'Automatique',
   'en_transit', 15000, 2800000, 11000000, 'partiel', 8000, '2025-12-01',
   '2025-10-15', '2025-12-10', '2026-01-20', null, 'MSCU789012', null),
  ('BMW', 'X5', 2018, 'Gris', '5UXKR0C58J0A12345', 78000, 'Diesel', 'Automatique',
   'commande', 25000, 3500000, 18000000, 'non_paye', 0, null,
   '2026-01-05', null, '2026-03-01', null, null, 'Commande récente'),
  ('Mercedes', 'C300', 2021, 'Bleu', 'WDDWF4KB0MR123456', 32000, 'Essence', 'Automatique',
   'arrivee', 18000, 3000000, 13500000, 'paye', 18000, '2025-12-20',
   '2025-08-01', '2025-11-01', '2025-12-15', '2025-12-18', 'MSCU345678', 'Au port')
on conflict (numero_chassis) do nothing;

-- Vente de test (Toyota RAV4 vendue)
insert into voitures (
  marque, modele, annee, couleur, numero_chassis, kilometrage, carburant, transmission,
  statut, prix_achat_usd, frais_transport, prix_vente_fcfa,
  paiement_fournisseur, montant_paye_fournisseur, numero_conteneur
) values
  ('Toyota', 'RAV4', 2020, 'Rouge', 'JTMB1RFV0LD123456', 51000, 'Hybride', 'Automatique',
   'vendue', 14000, 2600000, 10500000, 'paye', 14000, 'MSCU567890')
on conflict (numero_chassis) do nothing;

insert into ventes (
  voiture_id, client_nom, client_telephone, client_adresse,
  prix_vente_fcfa, montant_recu_fcfa, mode_paiement, statut_paiement,
  date_vente, numero_facture
)
select
  v.id, 'Moussa Traoré', '+223 70 00 00 00', 'Bamako, Commune III',
  10500000, 10500000, 'Orange Money', 'paye',
  '2025-07-15', 'FAC-2025-001'
from voitures v
where v.numero_chassis = 'JTMB1RFV0LD123456'
on conflict (numero_facture) do nothing;
