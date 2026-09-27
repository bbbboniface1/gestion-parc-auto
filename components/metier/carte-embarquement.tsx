import type { ReactNode } from "react";
import { ShieldCheck, ShieldWarning } from "@phosphor-icons/react";
import type { VehiculeDetail } from "@/lib/api/types";
import { CARBURANTS, SOURCES, TITRES, TRANSMISSIONS } from "@/lib/domaine";
import { formatNombre } from "@/lib/format";
import { grouperVin } from "@/lib/vin";
import { EtiquetteEtape } from "@/components/ui/signature";
import { cn } from "@/lib/cn";
import { TamponCommercial } from "./carte-vehicule";
import { PhotoVehicule } from "./photo-vehicule";

/** Case du talon. `code` : chasse fixe (numéro de lot, de conteneur) ; sinon police de texte, sur deux lignes au besoin. */
function Case({ libelle, code, children }: { libelle: string; code?: boolean; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="etiquette text-[12px] text-sur-nuit-2">{libelle}</dt>
      <dd className={cn("mt-1 text-[14px] font-medium text-sur-nuit", code ? "truncate font-mono" : "line-clamp-2 break-words")}>{children || "—"}</dd>
    </div>
  );
}

/**
 * En-tête de la fiche véhicule, dessiné comme une carte d'embarquement :
 * identité en haut, ligne perforée avec ses encoches, puis les cases du connaissement.
 */
export function CarteEmbarquement({ v, uniteCompteur = "km", photo }: { v: VehiculeDetail; uniteCompteur?: "km" | "mi"; photo?: string | null }) {
  const km = v.kilometrage_km;
  const compteur = km === null ? null : uniteCompteur === "mi" ? `${formatNombre(Math.round(km / 1.609344))} mi` : `${formatNombre(km)} km`;
  const e = v.expedition;
  // « Copart » + « Copart Houston » ou « MSC » + « MSC Aurora » : on ne répète pas le début.
  const sansRepetition = (a: string | null | undefined, b: string | null | undefined) =>
    [a && b && b.toLowerCase().startsWith(a.toLowerCase()) ? null : a, b].filter(Boolean).join(" ");
  return (
    <section aria-label="Identité du véhicule" className="apparition relative overflow-hidden rounded-carte bg-heros text-sur-nuit shadow-flottante">
      {/* La photo en tête, l'identité posée dessus */}
      <div className={cn("relative", photo && "sm:min-h-[336px] lg:min-h-[400px]")}>
        {photo && (
          <div className="relative aspect-[16/10] sm:absolute sm:inset-0 sm:aspect-auto">
            <PhotoVehicule path={photo} alt={v.libelle} arrondi={false} className="absolute inset-0 size-full" />
            <span aria-hidden className="voile-photo absolute inset-x-0 bottom-0 h-1/2 sm:h-full" />
          </div>
        )}
        <div className={cn("relative flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between lg:p-8", photo && "-mt-14 sm:absolute sm:inset-x-0 sm:bottom-0 sm:mt-0")}>
          <div className="min-w-0">
            <p className="etiquette text-[12px] text-white/75">
              {v.reference}{v.source ? ` · ${SOURCES[v.source] ?? v.source}` : ""}{v.titre ? ` · titre ${TITRES[v.titre]?.libelle ?? v.titre}` : ""}
            </p>
            <h1 className="mt-1 text-[24px] leading-tight font-extrabold tracking-tight text-white drop-shadow lg:text-[32px]">
              {v.marque} {v.modele}{v.finition ? <span className="font-semibold text-white/70"> {v.finition}</span> : null}
            </h1>
            <p className="mt-1 text-white/80">{[v.annee, v.couleur, compteur, v.carburant && CARBURANTS[v.carburant], v.transmission && TRANSMISSIONS[v.transmission]].filter(Boolean).join(" · ")}</p>
            {v.vin && (
              <p className="mt-3 inline-flex h-8 items-center gap-2 rounded-lg bg-white/10 px-3 font-mono text-[14px] font-medium tracking-wider ring-1 ring-white/15 backdrop-blur">
                {grouperVin(v.vin)}
                {v.vin_cle_valide === true && <ShieldCheck className="size-4 text-nuit-gain" aria-label="Clé de contrôle du VIN valide" />}
                {v.vin_cle_valide === false && <ShieldWarning className="size-4 text-nuit-ocre" aria-label="Clé de contrôle du VIN incorrecte : vérifiez la saisie" />}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-row flex-wrap items-center gap-2 sm:flex-col sm:items-end">
            <EtiquetteEtape etape={v.etape} />
            <span className="inline-flex h-7 items-center rounded-full bg-white/10 px-3 text-[12px] font-semibold text-white/85 backdrop-blur">{v.jours_etape} j à cette étape</span>
            <TamponCommercial v={v} />
          </div>
        </div>
      </div>

      {/* Ligne perforée et encoches : la « déchirure » du billet */}
      <div aria-hidden className="relative h-6">
        <span className="absolute top-1/2 -left-3 size-6 -translate-y-1/2 rounded-full bg-papier" />
        <span className="absolute top-1/2 -right-3 size-6 -translate-y-1/2 rounded-full bg-papier" />
        <span className="absolute top-1/2 right-6 left-6 border-t-2 border-dashed border-white/20" />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 px-6 pt-2 pb-6 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-6 lg:px-8 lg:pb-8">
        <Case libelle="Lot" code>{v.lot_numero}</Case>
        <Case libelle="Achat">{sansRepetition(SOURCES[v.source ?? ""] ?? null, v.lieu_achat)}</Case>
        <Case libelle="Conteneur" code>{e?.numero_conteneur ?? (e?.mode === "roro" ? "RoRo" : null)}</Case>
        <Case libelle="Navire">{sansRepetition(e?.compagnie, e?.navire)}</Case>
        <Case libelle="Ports">{e ? [e.port_depart, e.port_arrivee].filter(Boolean).join(" → ") : null}</Case>
      </dl>
    </section>
  );
}
