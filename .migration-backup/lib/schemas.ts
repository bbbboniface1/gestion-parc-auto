import { z } from "zod";

export const voitureSchema = z.object({
  marque: z.string().min(1, "La marque est obligatoire"),
  modele: z.string().min(1, "Le modèle est obligatoire"),
  annee: z.coerce.number().min(2000, "Année minimum 2000").max(2030, "Année maximum 2030"),
  couleur: z.string().optional().nullable(),
  numero_chassis: z.string().optional().nullable(),
  kilometrage: z.coerce.number().optional().nullable(),
  carburant: z.enum(["Essence", "Diesel", "Hybride", "Électrique"]).optional().nullable(),
  transmission: z.enum(["Automatique", "Manuelle"]).optional().nullable(),
  photo_url: z.string().optional().nullable(),
  statut: z.enum(["commande", "en_transit", "arrivee", "en_stock", "vendue"]),
  prix_achat_usd: z.coerce.number().positive("Le prix doit être positif"),
  frais_transport: z.coerce.number().optional().nullable(),
  prix_vente_fcfa: z.coerce.number().positive("Le prix de vente est obligatoire"),
  prix_vente_usd: z.coerce.number().optional().nullable(),
  paiement_fournisseur: z.enum(["non_paye", "partiel", "paye"]),
  montant_paye_fournisseur: z.coerce.number().optional().nullable(),
  date_paiement_fournisseur: z.string().optional().nullable(),
  date_commande: z.string().optional().nullable(),
  date_expedition: z.string().optional().nullable(),
  date_arrivee_prevue: z.string().optional().nullable(),
  date_arrivee_reelle: z.string().optional().nullable(),
  numero_conteneur: z.string().optional().nullable(),
  port_depart: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type VoitureSchemaType = z.infer<typeof voitureSchema>;

export const venteSchema = z
  .object({
    client_nom: z.string().min(1, "Le nom du client est obligatoire"),
    client_telephone: z.string().optional(),
    client_adresse: z.string().optional(),
    prix_vente_fcfa: z.coerce.number().positive("Le prix de vente est obligatoire"),
    montant_recu_fcfa: z.coerce.number().min(0, "Le montant ne peut pas être négatif"),
    mode_paiement: z.enum(["Espèces", "Virement", "Orange Money", "Wave", "Chèque"]).optional(),
    date_vente: z.string().min(1, "La date est obligatoire"),
    notes: z.string().optional(),
  })
  .refine((data) => data.montant_recu_fcfa <= data.prix_vente_fcfa, {
    message: "Le montant reçu ne peut pas dépasser le prix de vente",
    path: ["montant_recu_fcfa"],
  });

export type VenteSchemaType = z.infer<typeof venteSchema>;

export const parametresSchema = z.object({
  nom_entreprise: z.string().min(1, "Le nom est obligatoire"),
  adresse: z.string().min(1, "L'adresse est obligatoire"),
  telephone: z.string().min(1, "Le téléphone est obligatoire"),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  logo_url: z.string().optional().nullable(),
  taux_change_usd_fcfa: z.coerce.number().positive("Le taux doit être positif"),
});

export type ParametresSchemaType = z.infer<typeof parametresSchema>;
