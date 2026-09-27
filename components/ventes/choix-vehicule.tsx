"use client";

import { useState } from "react";
import { ArrowsClockwise, MagnifyingGlass } from "@phosphor-icons/react";
import { useLecture } from "@/lib/api/requetes";
import { useOrg } from "@/lib/session";
import type { Vehicule } from "@/lib/api/types";
import { finDeVin } from "@/lib/vin";
import { cn } from "@/lib/cn";
import { EtiquetteEtape, Montant } from "@/components/ui/signature";
import { PhotoVehicule } from "@/components/metier/photo-vehicule";

/**
 * Recherche parmi les véhicules non vendus (en vente, réservés y compris) pour démarrer une vente ou une proforma.
 * `limite` : nombre de véhicules proposés avant recherche ; plus court dans une fenêtre, pour que les champs
 * suivants (client, prix) restent visibles sans défiler.
 */
export function ChoixVehicule({ valeur, onChoix, limite = 8 }: { valeur: Vehicule | null; onChoix: (v: Vehicule | null) => void; limite?: number }) {
  const org = useOrg();
  const [q, setQ] = useState("");
  const { data } = useLecture<Vehicule[]>("vehicules_lister", { p_org: org.id, p_filtres: { q: q.trim() || undefined } });
  const liste = (data ?? []).filter((v) => v.statut_commercial !== "vendu").slice(0, limite);

  if (valeur) {
    return (
      <div className="apparition overflow-hidden rounded-2xl bg-primaire-voile ring-2 ring-primaire/40">
        <PhotoVehicule path={valeur.photo_principale_path} alt="" arrondi={false} className="aspect-[16/8] w-full" />
        <div className="px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[18px] leading-tight font-extrabold">{valeur.libelle}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-encre-3">
                <span className="font-mono">{valeur.reference}{valeur.vin ? ` · ${finDeVin(valeur.vin)}` : ""}</span>
                <EtiquetteEtape etape={valeur.etape} compacte />
              </p>
            </div>
            <button type="button" onClick={() => onChoix(null)} className="onde inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-surface px-4 text-[14px] font-semibold text-primaire shadow-champ hover:bg-primaire-plein hover:text-sur-primaire lg:h-10">
              <ArrowsClockwise size={16} weight="bold" aria-hidden />Changer
            </button>
          </div>
          {valeur.prix_affiche_xof !== null && <p className="mt-2 flex items-baseline gap-2 text-[14px] text-encre-3">Prix affiché <Montant valeur={valeur.prix_affiche_xof} devise={null} className="text-[16px] text-encre" /></p>}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <label className="relative">
        <span className="sr-only">Rechercher un véhicule</span>
        <MagnifyingGlass className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-encre-3" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Modèle, VIN, référence…"
          className="h-12 w-full rounded-full border border-trait bg-surface pr-4 pl-11 shadow-champ transition-all placeholder:text-encre-3/70 focus:border-primaire focus:shadow-[0_0_0_4px_var(--primaire-voile)] focus:outline-none" />
      </label>
      <ul className="grid gap-2 @xl:grid-cols-2">
        {liste.map((v, i) => (
          <li key={v.id} className="apparition" style={{ animationDelay: `${i * 35}ms` }}>
            <button type="button" onClick={() => onChoix(v)} className="onde carte carte-lien group flex w-full items-center gap-3 p-2 text-left">
              <PhotoVehicule path={v.photo_principale_path} alt="" className="h-14 w-[76px] shrink-0 rounded-xl" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold group-hover:text-primaire">{v.libelle}</span>
                <span className={cn("block truncate font-mono text-[12px]", v.statut_commercial === "reserve" ? "text-reserve-texte" : "text-encre-3")}>{v.reference}{v.statut_commercial === "reserve" ? " · réservé" : ""}</span>
                {v.prix_affiche_xof !== null && <Montant valeur={v.prix_affiche_xof} court devise={null} className="text-[14px]" />}
              </span>
            </button>
          </li>
        ))}
        {liste.length === 0 && <li className="col-span-full py-4 text-center text-[14px] text-encre-3">Aucun véhicule disponible.</li>}
      </ul>
    </div>
  );
}
