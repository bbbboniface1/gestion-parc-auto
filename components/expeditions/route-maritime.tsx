"use client";

import { Anchor, Boat } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { formatDate, joursDepuis, lireDate } from "@/lib/format";

export const STATUTS_EXPEDITION: Record<"preparation" | "en_mer" | "arrivee" | "cloturee", { libelle: string; couleur: string }> = {
  preparation: { libelle: "En préparation", couleur: "var(--etape-achete)" },
  en_mer: { libelle: "En mer", couleur: "var(--etape-en-mer)" },
  arrivee: { libelle: "Arrivée au port", couleur: "var(--etape-au-port)" },
  cloturee: { libelle: "Clôturée", couleur: "var(--encre-3)" },
};

interface Voyage {
  statut: "preparation" | "en_mer" | "arrivee" | "cloturee";
  port_depart: string | null;
  port_arrivee: string | null;
  date_depart: string | null;
  date_arrivee_prevue: string | null;
  date_arrivee_reelle: string | null;
}

/** Part du trajet effectuée (0 à 1), d'après le statut et les dates. */
export function avancement(v: Voyage, aujourdhui = new Date()): number {
  if (v.statut === "preparation") return 0;
  if (v.statut === "arrivee" || v.statut === "cloturee") return 1;
  const d = lireDate(v.date_depart);
  const a = lireDate(v.date_arrivee_prevue);
  if (!d || !a || a <= d) return 0.5;
  return Math.min(0.96, Math.max(0.04, (aujourdhui.getTime() - d.getTime()) / (a.getTime() - d.getTime())));
}

function libelleArrivee(v: Voyage): string {
  if (v.statut === "arrivee" || v.statut === "cloturee") return v.date_arrivee_reelle ? `Arrivé le ${formatDate(v.date_arrivee_reelle)}` : "Arrivé";
  if (!v.date_arrivee_prevue) return "Date d'arrivée à préciser";
  const j = joursDepuis(new Date(), lireDate(v.date_arrivee_prevue) ?? new Date()) ?? 0;
  if (j > 1) return `Arrivée dans ${j} jours`;
  if (j === 1) return "Arrivée demain";
  if (j === 0) return "Arrivée aujourd'hui";
  return `En retard de ${-j} jour${j < -1 ? "s" : ""}`;
}

/**
 * La traversée : le port de départ, le port d'arrivée, la mer entre les deux et le bateau placé selon
 * les dates. À l'ouverture, le bateau part du quai et glisse jusqu'à sa position du jour.
 */
export function RouteMaritime({ v, sombre, className }: { v: Voyage; sombre?: boolean; className?: string }) {
  const p = avancement(v);
  const position = `${6 + p * 88}%`;
  const retard = v.statut === "en_mer" && libelleArrivee(v).startsWith("En retard");
  return (
    <div className={cn("relative", className)}>
      <div className="relative h-14">
        {/* La mer */}
        <svg aria-hidden viewBox="0 0 400 56" preserveAspectRatio="none" className="absolute inset-0 size-full">
          <path d="M22 38 Q 200 6 378 38" fill="none" stroke={sombre ? "rgb(255 255 255 / 0.25)" : "var(--trait-fort)"} strokeWidth="2" strokeDasharray="3 7" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path d="M22 38 Q 200 6 378 38" fill="none" stroke="var(--etape-en-mer)" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke"
            pathLength={1} strokeDasharray={`${p} 1`} className="[animation:trace_1400ms_cubic-bezier(0.22,1,0.36,1)_both]" style={{ ["--longueur" as string]: 1 }} />
        </svg>
        {/* Les ports */}
        <span aria-hidden className={cn("absolute bottom-1 left-0 grid size-7 place-items-center rounded-full", sombre ? "bg-white/15 text-white" : "bg-acier-voile text-acier")}><Anchor size={15} weight="fill" /></span>
        <span aria-hidden className={cn("absolute right-0 bottom-1 grid size-7 place-items-center rounded-full", p >= 1 ? "bg-gain text-white" : sombre ? "bg-white/15 text-white" : "bg-surface-2 text-encre-3")}><Anchor size={15} weight="fill" /></span>
        {/* Le bateau */}
        <span aria-hidden className="absolute top-0 -translate-x-1/2 [animation:voyage_1400ms_cubic-bezier(0.22,1,0.36,1)_both]" style={{ left: position, ["--depart" as string]: "6%", ["--arrivee" as string]: position }}>
          <span className={cn("grid size-9 place-items-center rounded-xl text-white shadow-carte [animation:flotte_2.6s_ease-in-out_infinite]", retard ? "bg-perte" : "bg-primaire-plein")}>
            <Boat size={20} weight="fill" />
          </span>
        </span>
      </div>
      <div className={cn("mt-1 flex items-start justify-between gap-3 text-[12px]", sombre ? "text-white/75" : "text-encre-3")}>
        <span className="min-w-0">
          <span className={cn("block truncate font-bold", sombre ? "text-white" : "text-encre")}>{v.port_depart ?? "Départ"}</span>
          {v.date_depart ? `Parti le ${formatDate(v.date_depart)}` : v.statut === "preparation" ? "En préparation" : ""}
        </span>
        <span className="min-w-0 text-right">
          <span className={cn("block truncate font-bold", sombre ? "text-white" : "text-encre")}>{v.port_arrivee ?? "Arrivée"}</span>
          <span className={cn(retard && "font-bold text-perte-texte", retard && sombre && "text-nuit-perte")}>{libelleArrivee(v)}</span>
        </span>
      </div>
    </div>
  );
}
