"use client";

import Link from "next/link";
import { ChevronRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ActionAFaire, Gravite } from "@/lib/api/types";

const COULEUR: Record<Gravite, string> = { haute: "var(--perte)", moyenne: "var(--ocre)", info: "var(--acier)" };
const LIBELLE_TYPE: Record<string, string> = {
  echeance_retard: "Échéance en retard",
  magasinage_port: "Magasinage",
  stock_dormant: "Stock dormant",
  arrivee_proche: "Arrivée",
  frais_a_payer: "À payer",
  reservation_echue: "Réservation échue",
  livraison_en_attente: "À livrer",
  demande_correspondante: "Demande client",
};

export function lienEntite(entite: string, id: string): string {
  switch (entite) {
    case "vehicule": return `/parc/vehicule/?id=${id}`;
    case "vente": return `/ventes/fiche/?id=${id}`;
    case "expedition": return `/expeditions/fiche/?id=${id}`;
    case "client": return `/clients/fiche/?id=${id}`;
    case "frais": return `/finances/?onglet=depenses&frais=${id}`;
    default: return "/accueil/";
  }
}

/** Ce qui demande une décision aujourd'hui : barre de gravité à gauche, type en capitales, détail. */
export function ListeActions({ actions, limite, className }: { actions: ActionAFaire[]; limite?: number; className?: string }) {
  const visibles = limite ? actions.slice(0, limite) : actions;
  if (actions.length === 0) {
    return (
      <div className={cn("flex items-center gap-3 border-t border-trait py-5", className)}>
        <CheckCircle2 className="size-6 text-gain" aria-hidden />
        <div>
          <p className="font-semibold">Rien d&apos;urgent</p>
          <p className="text-encre-2">Aucune échéance en retard, aucun véhicule oublié au port.</p>
        </div>
      </div>
    );
  }
  return (
    <ul className={cn("border-t-2 border-encre", className)}>
      {visibles.map((a, i) => (
        <li key={`${a.type}-${a.entite_id}-${i}`} className="border-b border-trait last:border-b-0">
          <Link href={lienEntite(a.entite, a.entite_id)} className="flex items-stretch gap-3 pr-3 hover:bg-surface-2 active:bg-surface-2">
            <span aria-hidden className="w-[3px] shrink-0" style={{ background: COULEUR[a.gravite] }} />
            <span className="min-w-0 flex-1 py-3">
              <span className="etiquette block text-petit" style={{ color: COULEUR[a.gravite] }}>
                {LIBELLE_TYPE[a.type] ?? a.type}
                <span className="sr-only"> — gravité {a.gravite}</span>
              </span>
              <span className="mt-0.5 block leading-snug font-semibold text-encre">{a.titre}</span>
              {a.detail && <span className="mt-0.5 block text-petit leading-snug text-encre-2">{a.detail}</span>}
            </span>
            <ChevronRight className="size-4 shrink-0 self-center text-encre-3" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
