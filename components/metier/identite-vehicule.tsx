import type { ReactNode } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import type { VehiculeDetail } from "@/lib/api/types";
import { CARBURANTS, SOURCES, TITRES, TRANSMISSIONS } from "@/lib/domaine";
import { formatNombre } from "@/lib/format";
import { grouperVin } from "@/lib/vin";
import { StatutCommercial } from "./carte-vehicule";

function Case({ libelle, children }: { libelle: string; children: ReactNode }) {
  return (
    <div className="min-w-0 border-t border-trait py-2">
      <dt className="etiquette text-petit text-encre-3">{libelle}</dt>
      <dd className="truncate font-mono text-petit font-medium">{children || "—"}</dd>
    </div>
  );
}

/**
 * Identité du véhicule : le nom, une ligne de caractéristiques, le VIN, puis les cases du connaissement
 * (lot, achat, conteneur, navire, ports). Le tampon du statut commercial n'apparaît qu'ici, une fois.
 */
export function IdentiteVehicule({ v, uniteCompteur = "km" }: { v: VehiculeDetail; uniteCompteur?: "km" | "mi" }) {
  const km = v.kilometrage_km;
  const compteur = km === null ? null : uniteCompteur === "mi" ? `${formatNombre(Math.round(km / 1.609344))} mi` : `${formatNombre(km)} km`;
  const e = v.expedition;
  // « Copart » + « Copart Houston » ou « MSC » + « MSC Aurora » : on ne répète pas le début.
  const sansRepetition = (a: string | null | undefined, b: string | null | undefined) =>
    [a && b && b.toLowerCase().startsWith(a.toLowerCase()) ? null : a, b].filter(Boolean).join(" ");
  const achat = sansRepetition(SOURCES[v.source ?? ""] ?? null, v.lieu_achat);
  const navire = sansRepetition(e?.compagnie, e?.navire);
  return (
    <section aria-label="Identité du véhicule">
      <p className="etiquette text-petit text-encre-3">
        {v.reference}{v.source ? ` · ${SOURCES[v.source] ?? v.source}` : ""}{v.titre ? ` · titre ${TITRES[v.titre]?.libelle ?? v.titre}` : ""}
      </p>
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-titre font-semibold">
          {v.marque} {v.modele}{v.finition ? <span className="font-normal text-encre-3"> {v.finition}</span> : null}
        </h1>
        {v.statut_commercial !== "disponible" && <span className="mt-1 shrink-0"><StatutCommercial v={v} tampon /></span>}
      </div>
      <p className="mt-1 text-encre-2">{[v.annee, v.couleur, compteur, v.carburant && CARBURANTS[v.carburant], v.transmission && TRANSMISSIONS[v.transmission]].filter(Boolean).join(" · ")}</p>
      {v.vin && (
        <p className="mt-2 flex items-center gap-2 font-mono font-medium tracking-wider">
          {grouperVin(v.vin)}
          {v.vin_cle_valide === true && <ShieldCheck className="size-4 text-gain" aria-label="Clé de contrôle du VIN valide" />}
          {v.vin_cle_valide === false && <ShieldAlert className="size-4 text-ocre" aria-label="Clé de contrôle du VIN incorrecte : vérifiez la saisie" />}
        </p>
      )}
      <dl className="mt-4 grid grid-cols-2 gap-x-6">
        <Case libelle="Lot">{v.lot_numero}</Case>
        <Case libelle="Achat">{achat}</Case>
        <Case libelle="Conteneur">{e?.numero_conteneur ?? (e?.mode === "roro" ? "RoRo" : null)}</Case>
        <Case libelle="Navire">{navire}</Case>
        <Case libelle="Ports">{e ? [e.port_depart, e.port_arrivee].filter(Boolean).join(" → ") : null}</Case>
      </dl>
    </section>
  );
}
