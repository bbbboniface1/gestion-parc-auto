"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import type { Vehicule } from "@/lib/api/types";
import { etape as defEtape } from "@/lib/domaine";
import { finDeVin } from "@/lib/vin";
import { formatCourt, formatNombre } from "@/lib/format";
import { EtiquetteEtape, MiniPiste, Montant, Tampon } from "@/components/ui/signature";
import { PhotoVehicule } from "./photo-vehicule";
import { PastillesConteneur } from "./pastille-conteneur";

export function TamponCommercial({ v, compact = true }: { v: Pick<Vehicule, "statut_commercial" | "reserve_client_nom" | "vente">; compact?: boolean }) {
  if (v.statut_commercial === "reserve") return <Tampon type="reserve" detail={v.reserve_client_nom?.split(" ").slice(-1)[0]} grand={!compact} />;
  if (v.statut_commercial === "vendu") return <Tampon type={v.vente && !v.vente.livree ? "a_livrer" : "vendu"} grand={!compact} />;
  return null;
}

/**
 * Carte de galerie. Premier plan, sur la photo : l'étape (en haut) et le prix (en bas, 24 px).
 * Second plan, sous la photo : le modèle, ses détails, la mini-piste du voyage, la marge quand le rôle voit les coûts.
 */
export function CarteGalerie({ v, cochee, basculer, index = 0 }: { v: Vehicule; cochee?: boolean; basculer?: () => void; index?: number }) {
  const def = defEtape(v.etape);
  const prix = v.vente?.montant_ttc ?? v.prix_affiche_xof;
  const marge = v.marge_xof;
  return (
    // Carte, lien et corps en colonne pleine hauteur : le pied (VIN, marge) se cale en bas, aligné d'une carte à l'autre de la rangée.
    <article className={cn("carte carte-lien apparition group relative flex h-full flex-col overflow-hidden", cochee && "ring-2 ring-primaire")} style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}>
      <Link href={`/parc/vehicule/?id=${v.id}`} className="flex flex-1 flex-col">
        <div className="relative aspect-[4/3] overflow-hidden">
          <PhotoVehicule path={v.photo_principale_path} alt="" arrondi={false} className="size-full transition-transform duration-500 ease-out group-hover:scale-[1.03]" />
          <span aria-hidden className="voile-photo absolute inset-x-0 bottom-0 h-2/3" />
          <span className="absolute top-3 left-3 inline-flex h-7 items-center gap-2 rounded-full bg-white/90 px-3 text-[12px] font-bold text-nuit">
            <span className="size-2 rounded-full" style={{ background: def.couleur }} />
            {def.libelle}
          </span>
          {v.statut_commercial !== "disponible" && <span className="absolute top-3 right-3"><TamponCommercial v={v} /></span>}
          <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2 text-white">
            {prix !== null ? (
              <span className="chiffres text-[24px] leading-none font-extrabold tracking-tight">
                {formatCourt(prix)} <span className="text-[12px] font-semibold text-white/80">FCFA</span>
              </span>
            ) : <span className="text-[14px] font-semibold text-white/80">Prix à fixer</span>}
            <span className={cn("inline-flex h-6 shrink-0 items-center rounded-full px-2 text-[12px] font-bold", v.jours_etape > 30 ? "bg-accent-plein text-white" : "bg-white/20 text-white")}>
              {v.jours_etape} j
            </span>
          </div>
        </div>
        <div className="flex flex-1 flex-col p-4">
          <p className="truncate text-[16px] font-bold text-encre">{v.libelle}</p>
          <p className="mt-1 truncate text-[12px] text-encre-3">
            {[v.couleur, v.kilometrage_km ? `${formatNombre(v.kilometrage_km)} km` : null, v.reference].filter(Boolean).join(" · ")}
          </p>
          <MiniPiste etape={v.etape} className="mt-3" />
          <PastillesConteneur v={v} className="mt-2 empty:hidden" />
          <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-[12px]">
            <span className="truncate font-mono text-encre-3">{v.vin ? finDeVin(v.vin) : v.lot_numero ? `Lot ${v.lot_numero}` : ""}</span>
            {marge !== null && (
              <span className={cn("chiffres inline-flex h-6 shrink-0 items-center rounded-full px-2 font-bold", marge >= 0 ? "bg-gain-voile text-gain-texte" : "bg-perte-voile text-perte-texte")}>
                {marge >= 0 ? "+" : "−"}{formatCourt(Math.abs(marge))} {v.marge_type === "reelle" ? "marge" : "prévue"}
              </span>
            )}
          </div>
        </div>
      </Link>
      {basculer && (
        // La case (20 px) garde sa taille ; son étiquette porte la cible à 40 px (sélection réservée à l'ordinateur).
        <label className="absolute top-10 left-1 grid size-10 cursor-pointer place-items-center">
          <input type="checkbox" checked={!!cochee} onChange={basculer} aria-label={`Sélectionner ${v.libelle}`}
            className={cn("size-5 accent-[var(--primaire)] transition-opacity", cochee ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100")} />
        </label>
      )}
    </article>
  );
}

/** Ligne de liste compacte : photo, titre, référence, étape, prix. */
export function LigneVehicule({ v, selection }: { v: Vehicule; selection?: { cochee: boolean; basculer: () => void } }) {
  const prix = v.prix_affiche_xof;
  return (
    <div className="flex items-center gap-3 border-b border-trait/70 bg-surface px-3 py-3 transition-colors last:border-b-0 hover:bg-surface-2 lg:px-4">
      {selection && (
        <input type="checkbox" checked={selection.cochee} onChange={selection.basculer} aria-label={`Sélectionner ${v.libelle}`}
          className="size-5 shrink-0 accent-[var(--primaire)]" />
      )}
      <Link href={`/parc/vehicule/?id=${v.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <PhotoVehicule path={v.photo_principale_path} alt="" className="h-16 w-[88px] shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-bold text-encre">{v.libelle}</p>
            {prix !== null ? <Montant valeur={prix} court devise={null} className="shrink-0" /> : null}
          </div>
          <p className="truncate font-mono text-[12px] text-encre-3">{v.reference}{v.vin ? ` · ${finDeVin(v.vin)}` : ""}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <EtiquetteEtape etape={v.etape} compacte />
            <span className={cn("text-[12px] font-medium", v.jours_etape > 30 ? "text-ocre-texte" : "text-encre-3")}>{v.jours_etape} j</span>
            <TamponCommercial v={v} />
            <PastillesConteneur v={v} />
          </div>
        </div>
      </Link>
    </div>
  );
}

/** Carte de la vue en colonnes (ordinateur) : photo, nom, jours, prix. */
export function CarteKanban({ v, cochee, basculer, avancer }: { v: Vehicule; cochee: boolean; basculer: () => void; avancer?: () => void }) {
  return (
    <article className={cn("carte carte-lien group relative overflow-hidden", cochee && "ring-2 ring-primaire")}>
      <Link href={`/parc/vehicule/?id=${v.id}`} className="block">
        <PhotoVehicule path={v.photo_principale_path} alt="" arrondi={false} className="aspect-[16/10] w-full" />
        <div className="p-3">
          {/* Deux lignes plutôt qu'une coupe : l'année, en fin de nom, est ce qui distingue deux modèles. */}
          <p className="line-clamp-2 text-[14px] leading-tight font-bold">{v.libelle}</p>
          <p className="mt-1 truncate font-mono text-[12px] text-encre-3">{v.reference}{v.vin ? ` · ${finDeVin(v.vin)}` : ""}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className={cn("inline-flex h-6 items-center rounded-full px-2 text-[12px] font-bold", v.jours_etape > 30 ? "bg-ocre-voile text-ocre-texte" : "bg-surface-2 text-encre-3")}>{v.jours_etape} j</span>
            <span className="chiffres text-[14px] font-bold text-encre" title={v.prix_revient_xof !== null ? "Prix de revient" : "Prix affiché"}>
              {formatCourt(v.prix_revient_xof ?? v.prix_affiche_xof ?? 0)}
            </span>
          </div>
          {v.statut_commercial !== "disponible" && <div className="mt-2"><TamponCommercial v={v} /></div>}
          <PastillesConteneur v={v} className="mt-2" />
        </div>
      </Link>
      {/* Case de 16 px dans une étiquette de 40 px : la cible reste confortable sans grossir la case. */}
      <label className="absolute top-0 left-0 grid size-10 cursor-pointer place-items-center">
        <input type="checkbox" checked={cochee} onChange={basculer} aria-label={`Sélectionner ${v.libelle}`}
          className={cn("size-4 accent-[var(--primaire)] transition-opacity", cochee ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100")} />
      </label>
      {avancer && (
        <button type="button" onClick={avancer} title="Étape suivante"
          className="absolute top-2 right-2 hidden h-10 items-center rounded-full bg-nuit/85 px-3 text-[12px] font-semibold text-white backdrop-blur group-hover:inline-flex focus:inline-flex">
          Étape suivante →
        </button>
      )}
    </article>
  );
}
