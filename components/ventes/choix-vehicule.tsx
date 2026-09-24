"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useLecture } from "@/lib/api/requetes";
import { useOrg } from "@/lib/session";
import type { Vehicule } from "@/lib/api/types";
import { finDeVin } from "@/lib/vin";
import { Montant } from "@/components/ui/signature";
import { PhotoVehicule } from "@/components/metier/photo-vehicule";

/** Recherche parmi les véhicules non vendus (en vente, réservés y compris) pour démarrer une vente ou une proforma. */
export function ChoixVehicule({ valeur, onChoix }: { valeur: Vehicule | null; onChoix: (v: Vehicule | null) => void }) {
  const org = useOrg();
  const [q, setQ] = useState("");
  const { data } = useLecture<Vehicule[]>("vehicules_lister", { p_org: org.id, p_filtres: { q: q.trim() || undefined } });
  const liste = (data ?? []).filter((v) => v.statut_commercial !== "vendu").slice(0, 8);

  if (valeur) {
    return (
      <div className="flex items-center gap-3 border-l-[3px] border-encre bg-signal-voile px-3 py-2.5">
        <PhotoVehicule path={valeur.photo_principale_path} alt="" className="size-12 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{valeur.libelle}</p>
          <p className="truncate font-mono text-petit text-encre-3">{valeur.reference}{valeur.vin ? ` · ${finDeVin(valeur.vin)}` : ""}</p>
        </div>
        {valeur.prix_affiche_xof !== null && <Montant valeur={valeur.prix_affiche_xof} devise={null} />}
        <button type="button" onClick={() => onChoix(null)} className="ml-1 text-petit font-medium text-lien hover:underline">Changer</button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <label className="relative">
        <span className="sr-only">Rechercher un véhicule</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-encre-3" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Modèle, VIN, référence…"
          className="h-11 w-full rounded-t-controle border-0 border-b-2 border-trait-fort bg-surface-2 pl-9 text-corps focus:border-encre focus:outline-none" />
      </label>
      <ul className="flex max-h-72 flex-col overflow-y-auto">
        {liste.map((v) => (
          <li key={v.id}>
            <button type="button" onClick={() => onChoix(v)} className="flex w-full items-center gap-3 border-b border-trait py-2 text-left hover:bg-surface-2">
              <PhotoVehicule path={v.photo_principale_path} alt="" className="size-11 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{v.libelle}</p>
                <p className="truncate font-mono text-petit text-encre-3">{v.reference}{v.statut_commercial === "reserve" ? " · réservé" : ""}</p>
              </div>
              {v.prix_affiche_xof !== null && <Montant valeur={v.prix_affiche_xof} devise={null} />}
            </button>
          </li>
        ))}
        {liste.length === 0 && <li className="py-4 text-center text-corps text-encre-3">Aucun véhicule disponible.</li>}
      </ul>
    </div>
  );
}
