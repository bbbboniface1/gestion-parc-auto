import type { ReactNode } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import type { VehiculeDetail } from "@/lib/api/types";
import { CARBURANTS, SOURCES, TITRES, TRANSMISSIONS } from "@/lib/domaine";
import { formatNombre } from "@/lib/format";
import { grouperVin } from "@/lib/vin";
import { EtiquetteEtape } from "@/components/ui/signature";
import { TamponCommercial } from "./carte-vehicule";

function Case({ libelle, children }: { libelle: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="etiquette text-[11px] text-sur-nuit-2">{libelle}</dt>
      <dd className="mt-0.5 truncate font-mono text-[13px] font-medium text-sur-nuit">{children || "—"}</dd>
    </div>
  );
}

/**
 * En-tête de la fiche véhicule, dessiné comme une carte d'embarquement :
 * identité en haut, ligne perforée avec ses encoches, puis les cases du connaissement.
 */
export function CarteEmbarquement({ v, uniteCompteur = "km" }: { v: VehiculeDetail; uniteCompteur?: "km" | "mi" }) {
  const km = v.kilometrage_km;
  const compteur = km === null ? null : uniteCompteur === "mi" ? `${formatNombre(Math.round(km / 1.609344))} mi` : `${formatNombre(km)} km`;
  const e = v.expedition;
  // « Copart » + « Copart Houston » ou « MSC » + « MSC Aurora » : on ne répète pas le début.
  const sansRepetition = (a: string | null | undefined, b: string | null | undefined) =>
    [a && b && b.toLowerCase().startsWith(a.toLowerCase()) ? null : a, b].filter(Boolean).join(" ");
  return (
    <section aria-label="Identité du véhicule" className="relative overflow-hidden rounded-carte bg-nuit text-sur-nuit">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between lg:p-6">
        <div className="min-w-0">
          <p className="etiquette text-[12px] text-sur-nuit-2">
            {v.reference}{v.source ? ` · ${SOURCES[v.source] ?? v.source}` : ""}{v.titre ? ` · titre ${TITRES[v.titre]?.libelle ?? v.titre}` : ""}
          </p>
          <h1 className="mt-1 text-[26px] leading-tight font-semibold tracking-tight lg:text-[30px]">
            {v.marque} {v.modele}{v.finition ? <span className="text-sur-nuit-2"> {v.finition}</span> : null}
          </h1>
          <p className="mt-0.5 text-sur-nuit-2">{[v.annee, v.couleur, compteur, v.carburant && CARBURANTS[v.carburant], v.transmission && TRANSMISSIONS[v.transmission]].filter(Boolean).join(" · ")}</p>
          {v.vin && (
            <p className="mt-3 flex items-center gap-2 font-mono text-[15px] font-medium tracking-wider">
              {grouperVin(v.vin)}
              {v.vin_cle_valide === true && <ShieldCheck className="size-4 text-[#7fd1a6]" aria-label="Clé de contrôle du VIN valide" />}
              {v.vin_cle_valide === false && <ShieldAlert className="size-4 text-[#e7b25a]" aria-label="Clé de contrôle du VIN incorrecte : vérifiez la saisie" />}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-row flex-wrap items-center gap-2 sm:flex-col sm:items-end">
          <EtiquetteEtape etape={v.etape} />
          <span className="text-[13px] text-sur-nuit-2">{v.jours_etape} j à cette étape</span>
          <span className="rounded-[3px] bg-surface px-1"><TamponCommercial v={v} /></span>
        </div>
      </div>

      {/* Ligne perforée et encoches : la « déchirure » du billet */}
      <div aria-hidden className="relative h-5">
        <span className="absolute top-1/2 -left-2.5 size-5 -translate-y-1/2 rounded-full bg-papier" />
        <span className="absolute top-1/2 -right-2.5 size-5 -translate-y-1/2 rounded-full bg-papier" />
        <span className="absolute top-1/2 right-4 left-4 border-t-2 border-dashed border-white/20" />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 pt-1 pb-4 sm:grid-cols-3 lg:grid-cols-5 lg:px-6 lg:pb-6">
        <Case libelle="Lot">{v.lot_numero}</Case>
        <Case libelle="Achat">{sansRepetition(SOURCES[v.source ?? ""] ?? null, v.lieu_achat)}</Case>
        <Case libelle="Conteneur">{e?.numero_conteneur ?? (e?.mode === "roro" ? "RoRo" : null)}</Case>
        <Case libelle="Navire">{sansRepetition(e?.compagnie, e?.navire)}</Case>
        <Case libelle="Ports">{e ? [e.port_depart, e.port_arrivee].filter(Boolean).join(" → ") : null}</Case>
      </dl>
    </section>
  );
}
