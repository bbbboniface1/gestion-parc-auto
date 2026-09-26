"use client";

import Link from "next/link";
import { BellRinging, Boat, CaretRight, CheckCircle, Clock, type Icon, Tag, Truck, UserCircle, Wallet, Warehouse, Warning } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import type { ActionAFaire, Gravite } from "@/lib/api/types";
import { decalage } from "@/lib/animation";

const COULEUR: Record<Gravite, string> = { haute: "var(--perte)", moyenne: "var(--ocre)", info: "var(--acier)" };
const TYPES: Record<string, { libelle: string; icone: Icon }> = {
  echeance_retard: { libelle: "Échéance en retard", icone: Warning },
  magasinage_port: { libelle: "Magasinage", icone: Warehouse },
  stock_dormant: { libelle: "Stock dormant", icone: Clock },
  arrivee_proche: { libelle: "Arrivée", icone: Boat },
  frais_a_payer: { libelle: "À payer", icone: Wallet },
  reservation_echue: { libelle: "Réservation échue", icone: Tag },
  livraison_en_attente: { libelle: "À livrer", icone: Truck },
  demande_correspondante: { libelle: "Demande client", icone: UserCircle },
  incoherence_conteneur: { libelle: "À vérifier", icone: Warning },
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

/** Ce qui demande une décision aujourd'hui : une icône dans une bulle de la couleur de l'urgence, le type, le détail. */
export function ListeActions({ actions, limite, className }: { actions: ActionAFaire[]; limite?: number; className?: string }) {
  const visibles = limite ? actions.slice(0, limite) : actions;
  if (actions.length === 0) {
    return (
      <div className={cn("carte flex items-center gap-3 px-4 py-5", className)}>
        <span className="grid size-11 place-items-center rounded-2xl bg-gain-voile text-gain-texte"><CheckCircle className="size-6" aria-hidden /></span>
        <div>
          <p className="font-bold">Rien d&apos;urgent</p>
          <p className="text-[14px] text-encre-3">Aucune échéance en retard, aucun véhicule oublié au port.</p>
        </div>
      </div>
    );
  }
  return (
    <ul className={cn("carte divide-y divide-trait/70 overflow-hidden", className)}>
      {visibles.map((a, i) => {
        const type = TYPES[a.type] ?? { libelle: a.type, icone: BellRinging };
        const couleur = COULEUR[a.gravite] ?? "var(--acier)";
        return (
          <li key={`${a.type}-${a.entite_id}-${i}`} className="apparition" style={decalage(i, 50)}>
            <Link href={lienEntite(a.entite, a.entite_id)} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${couleur} 13%, var(--surface))`, color: couleur }}>
                <type.icone className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold tracking-wide uppercase" style={{ color: `color-mix(in srgb, ${couleur} 70%, var(--pole-texte))` }}>
                  {type.libelle}
                  <span className="sr-only"> — gravité {a.gravite}</span>
                </span>
                <span className="block truncate text-[14px] font-semibold text-encre">{a.titre}</span>
                {a.detail && <span className="block truncate text-[13px] text-encre-3">{a.detail}</span>}
              </span>
              <CaretRight className="size-4 shrink-0 text-encre-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </li>
        );
      })}
      {limite && actions.length > limite && (
        <li className="px-4 py-2.5 text-[13px] font-semibold text-encre-3">Et {actions.length - limite} autre{actions.length - limite > 1 ? "s" : ""} à traiter</li>
      )}
    </ul>
  );
}
