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
 * Carte de galerie : grande photo (zoom au survol), prix en surimpression, badge d'étape, mini-piste du
 * voyage, marge prévue quand le rôle voit les coûts.
 */
export function CarteGalerie({ v, cochee, basculer, index = 0 }: { v: Vehicule; cochee?: boolean; basculer?: () => void; index?: number }) {
  const def = defEtape(v.etape);
  const prix = v.vente?.montant_ttc ?? v.prix_affiche_xof;
  const marge = v.marge_xof;
  return (
    <article className={cn("carte carte-lien apparition group relative overflow-hidden", cochee && "ring-2 ring-primaire")} style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}>
      <Link href={`/parc/vehicule/?id=${v.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden">
          <PhotoVehicule path={v.photo_principale_path} alt="" arrondi={false} className="size-full transition-transform duration-500 ease-out group-hover:scale-[1.06]" />
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#0b1633]/80 via-[#0b1633]/25 to-transparent" />
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/92 px-2.5 py-1 text-[12px] font-bold text-[#0b1633] shadow-sm backdrop-blur">
            <span className="size-2 rounded-full" style={{ background: def.couleur }} />
            {def.libelle}
          </span>
          {v.statut_commercial !== "disponible" && <span className="absolute top-3 right-3 shadow-sm"><TamponCommercial v={v} /></span>}
          <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2 text-white">
            {prix !== null ? (
              <span className="chiffres text-[22px] leading-none font-extrabold tracking-tight drop-shadow">
                {formatCourt(prix)} <span className="text-[12px] font-semibold text-white/80">FCFA</span>
              </span>
            ) : <span className="text-[13px] font-semibold text-white/80">Prix à fixer</span>}
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold backdrop-blur", v.jours_etape > 30 ? "bg-[#c2410c] text-white" : "bg-white/20 text-white")}>
              {v.jours_etape} j
            </span>
          </div>
        </div>
        <div className="p-4">
          <p className="truncate text-[16px] font-bold text-encre">{v.libelle}</p>
          <p className="mt-0.5 truncate text-[13px] text-encre-3">
            {[v.couleur, v.kilometrage_km ? `${formatNombre(v.kilometrage_km)} km` : null, v.reference].filter(Boolean).join(" · ")}
          </p>
          <MiniPiste etape={v.etape} className="mt-3" />
          <PastillesConteneur v={v} className="mt-2.5 empty:hidden" />
          <div className="mt-3 flex items-center justify-between gap-2 text-[12px]">
            <span className="truncate font-mono text-encre-3">{v.vin ? finDeVin(v.vin) : v.lot_numero ? `Lot ${v.lot_numero}` : ""}</span>
            {marge !== null && (
              <span className={cn("chiffres shrink-0 rounded-full px-2 py-0.5 font-bold", marge >= 0 ? "bg-gain-voile text-gain-texte" : "bg-perte-voile text-perte-texte")}>
                {marge >= 0 ? "+" : "−"}{formatCourt(Math.abs(marge))} {v.marge_type === "reelle" ? "marge" : "prévue"}
              </span>
            )}
          </div>
        </div>
      </Link>
      {basculer && (
        <input type="checkbox" checked={!!cochee} onChange={basculer} aria-label={`Sélectionner ${v.libelle}`}
          className={cn("absolute top-12 left-3 size-5 accent-[var(--primaire)] transition-opacity", cochee ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100")} />
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
            <p className="truncate text-[15px] font-bold text-encre lg:text-sm">{v.libelle}</p>
            {prix !== null ? <Montant valeur={prix} court devise={null} className="shrink-0" /> : null}
          </div>
          <p className="truncate font-mono text-[12px] text-encre-3">{v.reference}{v.vin ? ` · ${finDeVin(v.vin)}` : ""}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
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
        <div className="p-2.5">
          <p className="truncate text-[13px] leading-tight font-bold">{v.libelle}</p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-encre-3">{v.reference}{v.vin ? ` · ${finDeVin(v.vin)}` : ""}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className={cn("rounded-full px-1.5 text-[11px] font-bold", v.jours_etape > 30 ? "bg-ocre-voile text-ocre-texte" : "bg-surface-2 text-encre-3")}>{v.jours_etape} j</span>
            <span className="chiffres text-[12px] font-bold text-encre-2" title={v.prix_revient_xof !== null ? "Prix de revient" : "Prix affiché"}>
              {formatCourt(v.prix_revient_xof ?? v.prix_affiche_xof ?? 0)}
            </span>
          </div>
          {v.statut_commercial !== "disponible" && <div className="mt-2"><TamponCommercial v={v} /></div>}
          <PastillesConteneur v={v} className="mt-2" />
        </div>
      </Link>
      <input type="checkbox" checked={cochee} onChange={basculer} aria-label={`Sélectionner ${v.libelle}`}
        className={cn("absolute top-2 left-2 size-4 accent-[var(--primaire)] transition-opacity", cochee ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100")} />
      {avancer && (
        <button type="button" onClick={avancer} title="Étape suivante"
          className="absolute top-2 right-2 hidden h-7 items-center rounded-full bg-nuit/85 px-2.5 text-[11px] font-semibold text-white backdrop-blur group-hover:inline-flex focus:inline-flex">
          Étape suivante →
        </button>
      )}
    </article>
  );
}
