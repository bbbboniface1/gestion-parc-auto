"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import type { Vehicule } from "@/lib/api/types";
import { etape as defEtape } from "@/lib/domaine";
import { finDeVin } from "@/lib/vin";
import { formatCourt } from "@/lib/format";
import { Montant, Piste, StatutTexte, Tampon } from "@/components/ui/signature";
import { PhotoVehicule } from "./photo-vehicule";

type Commercial = Pick<Vehicule, "statut_commercial" | "reserve_client_nom" | "vente">;

/** Statut commercial : texte seul dans les listes, tampon quand `tampon` (une fois par écran, sur la fiche). */
export function StatutCommercial({ v, tampon, grand }: { v: Commercial; tampon?: boolean; grand?: boolean }) {
  if (v.statut_commercial === "disponible") return null;
  const type = v.statut_commercial === "reserve" ? "reserve" : v.vente && !v.vente.livree ? "a_livrer" : "vendu";
  const detail = v.statut_commercial === "reserve" ? v.reserve_client_nom?.split(" ").slice(-1)[0]?.toUpperCase() : null;
  return tampon ? <Tampon type={type} detail={detail} grand={grand} /> : <StatutTexte type={type} detail={detail} />;
}

/** Ligne de liste (téléphone) : photo, titre, référence, piste, jours, prix. Pas de cadre : des filets. */
export function LigneVehicule({ v, selection }: { v: Vehicule; selection?: { cochee: boolean; basculer: () => void } }) {
  const prix = v.prix_affiche_xof;
  return (
    <li className="flex items-center gap-3 border-b border-trait py-3">
      {selection && (
        <input type="checkbox" checked={selection.cochee} onChange={selection.basculer} aria-label={`Sélectionner ${v.libelle}`}
          className="size-5 shrink-0 accent-[var(--encre)]" />
      )}
      <Link href={`/parc/vehicule/?id=${v.id}`} className="flex min-w-0 flex-1 gap-3">
        <PhotoVehicule path={v.photo_principale_path} alt="" className="aspect-[4/3] w-[104px] shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5">
          <div className="min-w-0">
            <p className="truncate font-semibold text-encre">{v.libelle}</p>
            <p className="truncate font-mono text-petit text-encre-3">{v.reference}{v.vin ? ` · ${finDeVin(v.vin)}` : ""}</p>
          </div>
          <Piste etape={v.etape} />
          <div className="flex items-baseline justify-between gap-2">
            <span className="etiquette truncate text-petit text-encre-2">
              {defEtape(v.etape).libelle}
              <span className={cn("chiffres ml-1.5 font-sans font-normal normal-case", v.jours_etape > 30 ? "font-semibold text-ocre" : "text-encre-3")}>{v.jours_etape} j</span>
            </span>
            {v.statut_commercial !== "disponible" ? <StatutCommercial v={v} /> : prix !== null ? <Montant valeur={prix} court devise={null} /> : null}
          </div>
        </div>
      </Link>
    </li>
  );
}

/** Carte de la vue en colonnes (ordinateur) : la photo, deux lignes, la piste. Sans cadre. */
export function CarteColonne({ v, cochee, basculer, avancer }: { v: Vehicule; cochee: boolean; basculer: () => void; avancer?: () => void }) {
  return (
    <article className={cn("group relative pb-3", cochee && "outline-2 outline-offset-2 outline-encre")}>
      <Link href={`/parc/vehicule/?id=${v.id}`} className="block">
        <PhotoVehicule path={v.photo_principale_path} alt="" className="mb-2 aspect-[4/3] w-full" />
        <p className="truncate font-semibold">{v.libelle}</p>
        <p className="truncate font-mono text-petit text-encre-3">{v.reference}{v.vin ? ` · ${finDeVin(v.vin)}` : ""}</p>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <span className={cn("chiffres text-petit", v.jours_etape > 30 ? "font-semibold text-ocre" : "text-encre-3")}>{v.jours_etape} j</span>
          {v.statut_commercial !== "disponible" ? (
            <StatutCommercial v={v} />
          ) : (
            <span className="chiffres text-petit font-semibold text-encre-2" title={v.prix_revient_xof !== null ? "Prix de revient" : "Prix affiché"}>
              {formatCourt(v.prix_revient_xof ?? v.prix_affiche_xof ?? 0)}
            </span>
          )}
        </div>
      </Link>
      <input type="checkbox" checked={cochee} onChange={basculer} aria-label={`Sélectionner ${v.libelle}`}
        className={cn("absolute top-2 left-2 size-5 accent-[var(--encre)] transition-opacity", cochee ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100")} />
      {avancer && (
        <button type="button" onClick={avancer} title="Étape suivante"
          className="absolute top-2 right-2 hidden h-7 items-center rounded-controle bg-nuit px-2 text-petit font-medium text-sur-nuit group-hover:inline-flex focus:inline-flex">
          Étape suivante →
        </button>
      )}
    </article>
  );
}
