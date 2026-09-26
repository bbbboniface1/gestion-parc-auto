"use client";

import { useEffect, useRef } from "react";
import { Boat, Car, Check, Stamp, Truck, Warehouse, Wrench, type Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { ETAPES, ORDRE_ETAPES, type Etape } from "@/lib/domaine";
import { formatDate, joursDepuis, lireDate } from "@/lib/format";

interface Passage {
  etape: Etape;
  date: string;
}

/** Jours passés à chaque étape, d'après l'historique (première date d'entrée dans l'étape). */
export function joursParEtape(historique: Passage[], actuelle: Etape, aujourdhui = new Date()): Map<Etape, number> {
  const entrees = new Map<Etape, Date>();
  for (const p of [...historique].sort((a, b) => a.date.localeCompare(b.date))) {
    const d = lireDate(p.date);
    if (d && !entrees.has(p.etape)) entrees.set(p.etape, d);
  }
  const atteintes = ORDRE_ETAPES.filter((e) => entrees.has(e) && ORDRE_ETAPES.indexOf(e) <= ORDRE_ETAPES.indexOf(actuelle));
  const jours = new Map<Etape, number>();
  atteintes.forEach((e, i) => {
    const debut = entrees.get(e)!;
    const suivante = atteintes[i + 1];
    const fin = suivante ? entrees.get(suivante)! : aujourdhui;
    jours.set(e, Math.max(0, joursDepuis(debut, fin) ?? 0));
  });
  return jours;
}

/** Ce qui transporte le véhicule à chaque étape. */
const VEHICULE: Record<Etape, Icon> = {
  achete: Car, transport_usa: Truck, en_mer: Boat, au_port: Warehouse, convoi: Truck, douane: Stamp, atelier: Wrench, parc: Car,
};

/**
 * Le trajet : la ligne se trace depuis l'enchère jusqu'à l'étape en cours, les étapes franchies sont cochées
 * dans leur couleur, et le moyen de transport (camion, bateau…) flotte au-dessus de l'étape actuelle.
 */
export function Trajet({ etape, historique, depart, port, arrivee, eta }: {
  etape: Etape;
  historique: Passage[];
  depart?: string | null;
  port?: string | null;
  arrivee?: string | null;
  eta?: string | null;
}) {
  const indexActuel = ORDRE_ETAPES.indexOf(etape);
  const jours = joursParEtape(historique, etape);
  const total = [...jours.values()].reduce((s, j) => s + j, 0);
  const lieux: Record<number, string> = { 0: depart || "États-Unis", 3: port || "Port", 7: arrivee || "Bamako" };
  const courante = ETAPES[indexActuel]!;
  const Transport = VEHICULE[etape];
  const piste = useRef<HTMLDivElement>(null);
  const cible = useRef<HTMLLIElement>(null);

  // Sur téléphone la piste défile : on amène l'étape en cours au centre.
  useEffect(() => {
    const p = piste.current, c = cible.current;
    if (!p || !c || p.scrollWidth <= p.clientWidth) return;
    p.scrollTo({ left: c.offsetLeft - p.clientWidth / 2 + c.clientWidth / 2, behavior: "smooth" });
  }, [etape]);

  const pas = 100 / ETAPES.length;
  const finLigne = pas * indexActuel + pas / 2;

  return (
    <section aria-label="Trajet du véhicule" className="carte apparition p-4 lg:p-6">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[18px] font-bold">Le trajet</h2>
        <p className="text-[14px] text-encre-3">
          {total > 0 && <span className="chiffres font-semibold text-encre">{total} jours depuis l&apos;achat</span>}
          {eta && indexActuel <= ORDRE_ETAPES.indexOf("en_mer") && (
            <span className="ml-2 inline-flex h-6 items-center rounded-full bg-acier-voile px-2 text-[12px] font-semibold text-acier">Arrivée au port prévue le {formatDate(eta)}</span>
          )}
        </p>
      </div>

      <div ref={piste} tabIndex={0} role="region" aria-label="Étapes du trajet" data-defilement="horizontal" className="sans-barre -mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        <div className="relative min-w-[500px] pt-14 pb-1">
          {/* Lieux */}
          <div aria-hidden className="absolute inset-x-0 top-0 h-4">
            {Object.entries(lieux).map(([i, lieu]) => (
              <span key={i} className="etiquette absolute -translate-x-1/2 text-[12px] leading-4 whitespace-nowrap text-encre-3" style={{ left: `${pas * Number(i) + pas / 2}%` }}>{lieu}</span>
            ))}
          </div>

          {/* Ligne de fond, puis ligne parcourue qui se trace */}
          <div aria-hidden className="absolute top-[68px] h-2 rounded-full bg-surface-2" style={{ left: `${pas / 2}%`, right: `${pas / 2}%` }} />
          <div aria-hidden className="absolute top-[68px] h-2 origin-left rounded-full [animation:remplit_1100ms_cubic-bezier(0.22,1,0.36,1)_both]"
            style={{ left: `${pas / 2}%`, width: `${finLigne - pas / 2}%`, background: courante.couleur }} />

          {/* Le transport, au-dessus de l'étape en cours */}
          <div aria-hidden className="absolute top-3 -translate-x-1/2 [animation:apparition_500ms_700ms_both]" style={{ left: `${finLigne}%` }}>
            <span className="grid size-10 place-items-center rounded-xl text-white shadow-flottante [animation:flotte_2.4s_ease-in-out_infinite]"
              style={{ background: courante.couleur }}>
              <Transport size={22} weight="fill" />
            </span>
          </div>

          <ol className="relative grid grid-cols-8">
            {ETAPES.map((e, i) => {
              const etat = i < indexActuel ? "passee" : i === indexActuel ? "courante" : "future";
              const j = jours.get(e.code);
              return (
                <li key={e.code} ref={etat === "courante" ? cible : undefined} className="relative flex flex-col items-center text-center" aria-current={etat === "courante" ? "step" : undefined}>
                  <span className="relative grid h-8 place-items-center">
                    {etat === "courante" && <span aria-hidden className="absolute size-8 rounded-full [animation:anneau_1.8s_ease-out_infinite]" style={{ background: e.couleur }} />}
                    <span aria-hidden
                      className={cn("relative z-10 grid place-items-center rounded-full ring-4 ring-surface", etat === "courante" ? "size-8" : "size-6", etat === "future" && "bg-surface-2")}
                      style={etat === "future" ? { boxShadow: "inset 0 0 0 2px var(--trait-fort)" } : { background: e.couleur, animation: `apparition 400ms ${i * 60}ms both` }}>
                      {etat === "passee" && <Check size={13} weight="bold" className="text-white" />}
                      {etat === "courante" && <span className="size-2 rounded-full bg-white" />}
                    </span>
                  </span>
                  <span className={cn("mt-2 text-[12px] leading-tight", etat === "courante" ? "font-extrabold text-encre" : etat === "passee" ? "font-semibold text-encre-2" : "text-encre-3")}>
                    {e.libelle}
                  </span>
                  <span className={cn("chiffres mt-1 h-4 text-[12px] leading-4", etat === "courante" ? "font-bold" : "text-encre-3")} style={etat === "courante" ? { color: `color-mix(in srgb, ${e.couleur} 65%, var(--pole-texte))` } : undefined}>
                    {j !== undefined ? `${j} j` : ""}
                  </span>
                  <span className="sr-only">{etat === "passee" ? "étape passée" : etat === "courante" ? "étape en cours" : "à venir"}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
