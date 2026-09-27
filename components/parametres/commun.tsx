"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Anchor, Buildings, ClockCounterClockwise, CurrencyDollar, Database, Invoice, Palette, Stamp, Storefront, UsersThree, type Icon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { useEcriture } from "@/lib/api/requetes";
import { useParametres, type Parametres } from "@/lib/api/parametres";
import { useOrg } from "@/lib/session";
import type { Role } from "@/lib/domaine";
import { Bouton } from "@/components/ui/bouton";
import { useAuChangement } from "@/lib/reinitialiser";

export interface SectionParametres {
  cle: string;
  libelle: string;
  description: string;
  icone: Icon;
  couleur: string;
  roles: Role[];
}

/**
 * Une seule teinte, neutre, pour toutes les sections : une couleur par section ne portait aucun sens et
 * empruntait celles des étapes du voyage. L'accent (`var(--primaire)`) est réservé à la vue d'ensemble,
 * pour une section dont la préparation des factures est incomplète.
 */
export const TEINTE_SECTION = "var(--encre-3)";

export const SECTIONS: SectionParametres[] = [
  { cle: "entreprise", libelle: "Entreprise", description: "Nom, adresse, NIF, RCCM, logo, cachet et signature", icone: Buildings, couleur: TEINTE_SECTION, roles: ["proprietaire", "gerant"] },
  { cle: "documents", libelle: "Documents et facturation", description: "Numérotation, TVA, mentions, modèle WhatsApp", icone: Invoice, couleur: TEINTE_SECTION, roles: ["proprietaire", "gerant"] },
  { cle: "devises", libelle: "Devises et taux", description: "Taux du dollar, parité de l'euro", icone: CurrencyDollar, couleur: TEINTE_SECTION, roles: ["proprietaire", "gerant"] },
  { cle: "douane", libelle: "Frais et douane", description: "Barème de dédouanement, hypothèses du simulateur", icone: Stamp, couleur: TEINTE_SECTION, roles: ["proprietaire", "gerant"] },
  { cle: "logistique", libelle: "Logistique", description: "Ports, transitaires, compagnies, fournisseurs", icone: Anchor, couleur: TEINTE_SECTION, roles: ["proprietaire", "gerant"] },
  { cle: "ventes", libelle: "Ventes et alertes", description: "Modes de paiement, alertes, confidentialité des coûts", icone: Storefront, couleur: TEINTE_SECTION, roles: ["proprietaire", "gerant"] },
  { cle: "equipe", libelle: "Équipe", description: "Membres, rôles, invitations", icone: UsersThree, couleur: TEINTE_SECTION, roles: ["proprietaire", "gerant"] },
  { cle: "preferences", libelle: "Préférences", description: "Thème, taille du texte sur cet appareil", icone: Palette, couleur: TEINTE_SECTION, roles: ["proprietaire", "gerant", "vendeur", "comptable", "lecture"] },
  { cle: "donnees", libelle: "Données", description: "Exports, sauvegarde, démonstration", icone: Database, couleur: TEINTE_SECTION, roles: ["proprietaire", "gerant", "comptable"] },
  { cle: "journal", libelle: "Journal", description: "Qui a fait quoi, et quand", icone: ClockCounterClockwise, couleur: TEINTE_SECTION, roles: ["proprietaire", "gerant", "comptable"] },
];

export function sectionsPour(role: Role): SectionParametres[] {
  return SECTIONS.filter((s) => s.roles.includes(role));
}

/**
 * Brouillon des paramètres : l'écran modifie une copie locale ; seuls les champs changés
 * partent au serveur (parametres_enregistrer n'accepte qu'un patch).
 */
export function useBrouillon() {
  const org = useOrg();
  const { data, isPending, error, refetch } = useParametres();
  const [brouillon, setBrouillon] = useState<Parametres | null>(null);

  const enregistres = data?.parametres;
  useAuChangement([enregistres], () => {
    if (enregistres) setBrouillon(enregistres);
  });

  const modifies = useMemo(() => {
    if (!brouillon || !enregistres) return {} as Partial<Parametres>;
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(brouillon)) {
      const avant = (enregistres as unknown as Record<string, unknown>)[k];
      if (JSON.stringify(v) !== JSON.stringify(avant)) patch[k] = v;
    }
    return patch as Partial<Parametres>;
  }, [brouillon, enregistres]);

  const ecriture = useEcriture("parametres_enregistrer", {
    onSuccess: () => toast.success("Paramètres enregistrés"),
    onError: (e) => toast.error(e.message),
  });

  return {
    donnees: data,
    brouillon,
    chargement: isPending,
    erreur: error,
    recharger: refetch,
    maj: <K extends keyof Parametres>(cle: K, valeur: Parametres[K]) => setBrouillon((b) => (b ? { ...b, [cle]: valeur } : b)),
    sale: Object.keys(modifies).length > 0,
    enregistrement: ecriture.isPending,
    enregistrer: () => ecriture.executer({ p_org: org.id, p_patch: modifies }),
    annuler: () => data?.parametres && setBrouillon(data.parametres),
  };
}

/** Barre collée en bas, visible seulement quand il y a des modifications non enregistrées. */
export function BarreEnregistrement({ sale, enregistrement, onEnregistrer, onAnnuler }: {
  sale: boolean; enregistrement: boolean; onEnregistrer: () => void; onAnnuler: () => void;
}) {
  useEffect(() => {
    if (!sale) return;
    const avertir = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avertir);
    return () => window.removeEventListener("beforeunload", avertir);
  }, [sale]);
  if (!sale) return null;
  return (
    <>
      {/* Place réservée dans le flux : la barre fixe ne recouvre jamais le bas de la dernière carte, même tout en bas
          de la page (elle s'ajoute au padding de <main>, prévu pour la seule barre de navigation). */}
      <div aria-hidden className="h-24 sm:h-16" />
      <div role="region" aria-label="Modifications non enregistrées"
        className="zone-sure-bas apparition fixed inset-x-4 bottom-20 z-40 rounded-carte bg-heros px-4 py-3 text-sur-nuit shadow-flottante lg:bottom-6 lg:left-[calc(5rem+2rem)] rail:left-[calc(16rem+2rem)] lg:right-8">
        {/* Téléphone : le message sur sa propre ligne, les boutons dessous à droite ; il ne se casse plus mot par mot. */}
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-3 gap-y-2">
          <span className="flex basis-full items-center gap-2 text-[14px] font-semibold sm:flex-1 sm:basis-auto">
            {/* Le point pulse trois fois pour attirer l'œil, puis reste fixe ; aucune pulsation si l'on a demandé moins d'animations. */}
            <span aria-hidden className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-nuit-ocre opacity-60 [animation-iteration-count:3] motion-reduce:hidden" /><span className="relative inline-flex size-2 rounded-full bg-nuit-ocre" /></span>
            Modifications non enregistrées
          </span>
          <span className="ml-auto flex gap-3">
            <Bouton variante="sur-nuit" taille="sm" onClick={onAnnuler}>Annuler</Bouton>
            <Bouton variante="primaire" taille="sm" chargement={enregistrement} onClick={onEnregistrer}>Enregistrer</Bouton>
          </span>
        </div>
      </div>
    </>
  );
}

/**
 * Bloc de réglages : titre et explication à gauche sur ordinateur, champs à droite.
 * Titre de section en 18 px, explication en 14 px : les champs restent au premier plan.
 */
export function Groupe({ titre, description, children }: { titre: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="carte apparition p-4 lg:p-6 xl:grid xl:grid-cols-[240px_1fr] xl:gap-8">
      <div className="mb-4 xl:mb-0">
        <h2 className="text-[18px] leading-tight font-bold tracking-tight">{titre}</h2>
        {description && <p className="mt-1 text-[14px] leading-snug text-encre-3">{description}</p>}
      </div>
      <div className="flex max-w-xl flex-col gap-4">{children}</div>
    </section>
  );
}
