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

export const SECTIONS: SectionParametres[] = [
  { cle: "entreprise", libelle: "Entreprise", description: "Nom, adresse, NIF, RCCM, logo, cachet et signature", icone: Buildings, couleur: "var(--primaire)", roles: ["proprietaire", "gerant"] },
  { cle: "documents", libelle: "Documents et facturation", description: "Numérotation, TVA, mentions, modèle WhatsApp", icone: Invoice, couleur: "var(--gain)", roles: ["proprietaire", "gerant"] },
  { cle: "devises", libelle: "Devises et taux", description: "Taux du dollar, parité de l'euro", icone: CurrencyDollar, couleur: "var(--accent)", roles: ["proprietaire", "gerant"] },
  { cle: "douane", libelle: "Frais et douane", description: "Barème de dédouanement, hypothèses du simulateur", icone: Stamp, couleur: "var(--etape-douane)", roles: ["proprietaire", "gerant"] },
  { cle: "logistique", libelle: "Logistique", description: "Ports, transitaires, compagnies, fournisseurs", icone: Anchor, couleur: "var(--etape-en-mer)", roles: ["proprietaire", "gerant"] },
  { cle: "ventes", libelle: "Ventes et alertes", description: "Modes de paiement, alertes, confidentialité des coûts", icone: Storefront, couleur: "var(--reserve)", roles: ["proprietaire", "gerant"] },
  { cle: "equipe", libelle: "Équipe", description: "Membres, rôles, invitations", icone: UsersThree, couleur: "var(--etape-achete)", roles: ["proprietaire", "gerant"] },
  { cle: "preferences", libelle: "Préférences", description: "Thème, taille du texte sur cet appareil", icone: Palette, couleur: "var(--etape-atelier)", roles: ["proprietaire", "gerant", "vendeur", "comptable", "lecture"] },
  { cle: "donnees", libelle: "Données", description: "Exports, sauvegarde, démonstration", icone: Database, couleur: "var(--etape-au-port)", roles: ["proprietaire", "gerant", "comptable"] },
  { cle: "journal", libelle: "Journal", description: "Qui a fait quoi, et quand", icone: ClockCounterClockwise, couleur: "var(--encre-3)", roles: ["proprietaire", "gerant", "comptable"] },
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
    <div role="region" aria-label="Modifications non enregistrées"
      className="zone-sure-bas apparition fixed inset-x-4 bottom-20 z-40 rounded-2xl bg-nuit px-4 py-3 text-sur-nuit shadow-flottante lg:bottom-6 lg:left-[calc(16rem+2rem)] lg:right-8">
      <div className="mx-auto flex max-w-[1280px] items-center gap-3">
        <span className="flex flex-1 items-center gap-2.5 text-[14px] font-semibold">
          <span aria-hidden className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-[#ff9447] opacity-60" /><span className="relative inline-flex size-2.5 rounded-full bg-[#ff9447]" /></span>
          Modifications non enregistrées
        </span>
        <Bouton variante="sur-nuit" taille="sm" onClick={onAnnuler}>Annuler</Bouton>
        <Bouton variante="primaire" taille="sm" chargement={enregistrement} onClick={onEnregistrer}>Enregistrer</Bouton>
      </div>
    </div>
  );
}

/** Bloc de réglages : titre et explication à gauche sur ordinateur, champs à droite. */
export function Groupe({ titre, description, children }: { titre: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="carte apparition p-4 lg:p-6 xl:grid xl:grid-cols-[240px_1fr] xl:gap-10">
      <div className="mb-4 xl:mb-0">
        <h2 className="flex items-center gap-2.5 text-[16px] font-bold tracking-tight">
          <span aria-hidden className="h-5 w-1 shrink-0 rounded-full bg-[var(--section,var(--primaire))]" />{titre}
        </h2>
        {description && <p className="mt-1.5 pl-[14px] text-[13px] leading-snug text-encre-3">{description}</p>}
      </div>
      <div className="flex max-w-xl flex-col gap-4">{children}</div>
    </section>
  );
}
