"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import type { Vehicule } from "@/lib/api/types";
import { finDeVin } from "@/lib/vin";
import { formatCourt } from "@/lib/format";
import { EtiquetteEtape, Montant, Tampon } from "@/components/ui/signature";
import { PhotoVehicule } from "./photo-vehicule";

export function TamponCommercial({ v, compact = true }: { v: Pick<Vehicule, "statut_commercial" | "reserve_client_nom" | "vente">; compact?: boolean }) {
  if (v.statut_commercial === "reserve") return <Tampon type="reserve" detail={v.reserve_client_nom?.split(" ").slice(-1)[0]?.toUpperCase()} grand={!compact} />;
  if (v.statut_commercial === "vendu") return <Tampon type={v.vente && !v.vente.livree ? "a_livrer" : "vendu"} grand={!compact} />;
  return null;
}

/** Ligne de liste (téléphone) : photo, titre, référence et fin de VIN, étape, prix. */
export function LigneVehicule({ v, selection }: { v: Vehicule; selection?: { cochee: boolean; basculer: () => void } }) {
  const prix = v.prix_affiche_xof;
  return (
    <div className="flex items-center gap-3 border-b border-trait bg-surface px-3 py-3 last:border-b-0 lg:px-4">
      {selection && (
        <input type="checkbox" checked={selection.cochee} onChange={selection.basculer} aria-label={`Sélectionner ${v.libelle}`}
          className="size-5 shrink-0 accent-[var(--laterite)]" />
      )}
      <Link href={`/parc/vehicule/?id=${v.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <PhotoVehicule path={v.photo_principale_path} alt="" className="h-14 w-[72px] shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[15px] font-semibold text-encre lg:text-sm">{v.libelle}</p>
            {prix !== null ? <Montant valeur={prix} court devise={null} className="shrink-0" /> : null}
          </div>
          <p className="truncate font-mono text-[12px] text-encre-3">
            {v.reference}{v.vin ? ` · ${finDeVin(v.vin)}` : ""}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <EtiquetteEtape etape={v.etape} compacte />
            <span className={cn("text-[12px]", v.jours_etape > 30 ? "text-ocre" : "text-encre-3")}>{v.jours_etape} j</span>
            <TamponCommercial v={v} />
          </div>
        </div>
      </Link>
    </div>
  );
}

/** Carte Kanban (ordinateur) : dense, lisible à 200 px de large. */
export function CarteKanban({ v, cochee, basculer, avancer }: { v: Vehicule; cochee: boolean; basculer: () => void; avancer?: () => void }) {
  return (
    <article className={cn("group relative rounded-controle border bg-surface transition-colors", cochee ? "border-laterite ring-1 ring-laterite" : "border-trait hover:border-trait-fort")}>
      <Link href={`/parc/vehicule/?id=${v.id}`} className="block p-2.5">
        <PhotoVehicule path={v.photo_principale_path} alt="" className="mb-2 aspect-[16/9] w-full" />
        <p className="truncate text-[13px] leading-tight font-semibold">{v.libelle}</p>
        <p className="mt-0.5 truncate font-mono text-[11px] text-encre-3">{v.reference}{v.vin ? ` · ${finDeVin(v.vin)}` : ""}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className={cn("text-[12px]", v.jours_etape > 30 ? "font-medium text-ocre" : "text-encre-3")}>{v.jours_etape} j</span>
          {v.prix_revient_xof !== null ? (
            <span className="chiffres text-[12px] font-medium text-encre-2" title="Prix de revient">{formatCourt(v.prix_revient_xof)}</span>
          ) : v.prix_affiche_xof !== null ? (
            <span className="chiffres text-[12px] font-medium text-encre-2">{formatCourt(v.prix_affiche_xof)}</span>
          ) : null}
        </div>
        {v.statut_commercial !== "disponible" && <div className="mt-2"><TamponCommercial v={v} /></div>}
      </Link>
      <input type="checkbox" checked={cochee} onChange={basculer} aria-label={`Sélectionner ${v.libelle}`}
        className={cn("absolute top-4 left-4 size-4 accent-[var(--laterite)] transition-opacity", cochee ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100")} />
      {avancer && (
        <button type="button" onClick={avancer} title="Étape suivante"
          className="absolute top-4 right-4 hidden h-7 items-center rounded-[4px] bg-nuit/85 px-2 text-[11px] font-medium text-white group-hover:inline-flex focus:inline-flex">
          Étape suivante →
        </button>
      )}
    </article>
  );
}
