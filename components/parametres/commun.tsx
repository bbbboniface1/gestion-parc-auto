"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Building2, Coins, Database, FileText, History, Landmark, Palette, Ship, Store, Users, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useEcriture } from "@/lib/api/requetes";
import { useParametres, type Parametres } from "@/lib/api/parametres";
import { useOrg } from "@/lib/session";
import type { Role } from "@/lib/domaine";
import { Bouton } from "@/components/ui/bouton";

export interface SectionParametres {
  cle: string;
  libelle: string;
  description: string;
  icone: LucideIcon;
  roles: Role[];
}

export const SECTIONS: SectionParametres[] = [
  { cle: "entreprise", libelle: "Entreprise", description: "Nom, adresse, NIF, RCCM, logo, cachet et signature", icone: Building2, roles: ["proprietaire", "gerant"] },
  { cle: "documents", libelle: "Documents et facturation", description: "Numérotation, TVA, mentions, modèle WhatsApp", icone: FileText, roles: ["proprietaire", "gerant"] },
  { cle: "devises", libelle: "Devises et taux", description: "Taux du dollar, parité de l'euro", icone: Coins, roles: ["proprietaire", "gerant"] },
  { cle: "douane", libelle: "Frais et douane", description: "Barème de dédouanement, hypothèses du simulateur", icone: Landmark, roles: ["proprietaire", "gerant"] },
  { cle: "logistique", libelle: "Logistique", description: "Ports, transitaires, compagnies, fournisseurs", icone: Ship, roles: ["proprietaire", "gerant"] },
  { cle: "ventes", libelle: "Ventes et alertes", description: "Modes de paiement, alertes, confidentialité des coûts", icone: Store, roles: ["proprietaire", "gerant"] },
  { cle: "equipe", libelle: "Équipe", description: "Membres, rôles, invitations", icone: Users, roles: ["proprietaire", "gerant"] },
  { cle: "preferences", libelle: "Préférences", description: "Thème, taille du texte sur cet appareil", icone: Palette, roles: ["proprietaire", "gerant", "vendeur", "comptable", "lecture"] },
  { cle: "donnees", libelle: "Données", description: "Exports, sauvegarde, démonstration", icone: Database, roles: ["proprietaire", "gerant", "comptable"] },
  { cle: "journal", libelle: "Journal", description: "Qui a fait quoi, et quand", icone: History, roles: ["proprietaire", "gerant", "comptable"] },
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

  useEffect(() => {
    if (data?.parametres) setBrouillon(data.parametres);
  }, [data?.parametres]);

  const modifies = useMemo(() => {
    if (!brouillon || !data?.parametres) return {} as Partial<Parametres>;
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(brouillon)) {
      const avant = (data.parametres as unknown as Record<string, unknown>)[k];
      if (JSON.stringify(v) !== JSON.stringify(avant)) patch[k] = v;
    }
    return patch as Partial<Parametres>;
  }, [brouillon, data?.parametres]);

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
      className="zone-sure-bas fixed inset-x-0 bottom-16 z-40 border-t border-trait bg-nuit px-4 py-3 text-sur-nuit lg:bottom-0 lg:left-60">
      <div className="mx-auto flex max-w-[1280px] items-center gap-3">
        <span className="flex-1 text-[14px]">Modifications non enregistrées</span>
        <Bouton variante="sur-nuit" taille="sm" onClick={onAnnuler}>Annuler</Bouton>
        <Bouton variante="primaire" taille="sm" chargement={enregistrement} onClick={onEnregistrer}>Enregistrer</Bouton>
      </div>
    </div>
  );
}

/** Bloc de réglages : titre et explication à gauche sur ordinateur, champs à droite. */
export function Groupe({ titre, description, children }: { titre: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-b border-trait py-6 first:pt-0 last:border-b-0 lg:grid lg:grid-cols-[240px_1fr] lg:gap-10">
      <div className="mb-4 lg:mb-0">
        <h2 className="text-[16px] font-semibold tracking-tight">{titre}</h2>
        {description && <p className="mt-1 text-[13px] leading-snug text-encre-3">{description}</p>}
      </div>
      <div className="flex max-w-xl flex-col gap-4">{children}</div>
    </section>
  );
}
