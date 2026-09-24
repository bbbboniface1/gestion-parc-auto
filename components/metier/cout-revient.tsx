import { cn } from "@/lib/cn";
import { libelleCategorie } from "@/lib/domaine";
import type { LigneCoutVehicule } from "@/lib/estimation";
import { formatCourt, formatNombre, formatPourcent } from "@/lib/format";
import { Montant } from "@/components/ui/signature";
import { Section } from "@/components/ui/section";

/**
 * Chaque catégorie prend un gris de la rampe, du clair (achat) au noir (dernier frais) dans l'ordre où
 * l'argent part : la barre se lit comme le voyage.
 */
const ORDRE_CATEGORIES = ["achat", "frais_enchere", "remorquage", "fret", "assurance", "port", "convoi", "douane", "transitaire", "atelier", "pieces", "carte_grise"];
function couleur(c: string) {
  const i = ORDRE_CATEGORIES.indexOf(c);
  const part = i < 0 ? 50 : Math.round((i / (ORDRE_CATEGORIES.length - 1)) * 100);
  return `color-mix(in srgb, var(--etape-achete), var(--etape-parc) ${part}%)`;
}

function fond(l: LigneCoutVehicule) {
  const c = couleur(l.categorie);
  return l.estime
    ? { backgroundImage: `repeating-linear-gradient(135deg, ${c} 0 3px, transparent 3px 7px)`, boxShadow: `inset 0 0 0 1.5px ${c}` }
    : { background: c };
}

/**
 * Coût de revient : le total en grand, la marge à côté, une barre empilée par catégorie avec le repère du
 * prix, puis le registre ligne par ligne. Les montants estimés (douane pas encore payée) sont hachurés.
 */
export function CoutRevient({ lignes, prixAffiche, prixPlancher, margeReelle, prixVente }: {
  lignes: LigneCoutVehicule[];
  prixAffiche: number | null;
  prixPlancher?: number | null;
  /** Vente conclue : marge réelle (HT) et prix de vente */
  margeReelle?: number | null;
  prixVente?: number | null;
}) {
  const ordonnees = [...lignes].sort((a, b) => (a.categorie === "achat" ? -1 : b.categorie === "achat" ? 1 : Number(!!a.estime) - Number(!!b.estime) || b.montant_xof - a.montant_xof));
  const total = ordonnees.reduce((s, l) => s + l.montant_xof, 0);
  const estime = ordonnees.filter((l) => l.estime).reduce((s, l) => s + l.montant_xof, 0);
  const reference = prixVente ?? prixAffiche;
  const echelle = Math.max(total, reference ?? 0, 1);
  const marge = margeReelle ?? (reference !== null ? reference - total : null);
  const tauxMarge = marge !== null && reference ? (marge / reference) * 100 : null;
  const perte = marge !== null && marge < 0;

  return (
    <Section titre={`Coût de revient${estime > 0 ? " prévisionnel" : ""}`} id="titre-cout">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 pt-1">
        <div>
          <Montant valeur={total} taille="xl" />
          {estime > 0 && <p className="text-encre-2">dont <span className="chiffres font-semibold">{formatNombre(estime)}</span> FCFA estimés</p>}
        </div>
        {marge !== null && (
          <div className="text-right">
            <p className="etiquette text-petit text-encre-3">{margeReelle !== undefined && margeReelle !== null ? "Marge réelle" : "Marge prévue"}</p>
            <p className={cn("figure chiffres text-titre", perte ? "text-perte" : "text-gain")}>
              {perte ? "−" : "+"}{formatCourt(Math.abs(marge))}
              {tauxMarge !== null && <span className="ml-2 font-sans text-corps font-semibold">{formatPourcent(tauxMarge, 1)}</span>}
            </p>
          </div>
        )}
      </div>

      {/* La barre */}
      <div className="relative mt-7 mb-6">
        {reference !== null && (
          <div className="absolute -top-5 flex -translate-x-full flex-col items-end" style={{ left: `${(reference / echelle) * 100}%` }}>
            <span className="text-petit whitespace-nowrap text-encre-2">{prixVente ? "Prix de vente" : "Prix affiché"} {formatCourt(reference)}</span>
          </div>
        )}
        <div className="flex h-4 w-full overflow-hidden bg-surface-2" role="img"
          aria-label={`Coût de revient ${formatNombre(total)} FCFA${reference ? `, prix ${formatNombre(reference)} FCFA` : ""}`}>
          {ordonnees.map((l, i) => (
            <span key={`${l.categorie}-${i}`} className="h-full border-r-2 border-surface last:border-r-0" style={{ width: `${(l.montant_xof / echelle) * 100}%`, ...fond(l) }} title={`${libelleCategorie(l.categorie)} : ${formatNombre(l.montant_xof)} FCFA`} />
          ))}
          {reference !== null && reference > total && (
            <span className="h-full bg-signal-voile" style={{ width: `${((reference - total) / echelle) * 100}%` }} />
          )}
        </div>
        {reference !== null && <span aria-hidden className="absolute -top-1 -bottom-1 w-0.5 bg-encre" style={{ left: `calc(${(reference / echelle) * 100}% - 1px)` }} />}
        {prixPlancher && prixPlancher <= echelle && (
          <span aria-hidden title={`Plancher ${formatNombre(prixPlancher)} FCFA`} className="absolute -bottom-2 h-2 w-px bg-encre-3" style={{ left: `${(prixPlancher / echelle) * 100}%` }} />
        )}
        {perte && <p className="mt-3 font-semibold text-perte">Le coût dépasse le prix : ce véhicule se vendrait à perte.</p>}
      </div>

      <ul>
        {ordonnees.map((l, i) => (
          <li key={`${l.categorie}-${i}`} className="flex items-center gap-3 border-b border-trait py-2.5 last:border-b-0">
            <span aria-hidden className="size-3 shrink-0" style={fond(l)} />
            <span className="flex-1">
              {libelleCategorie(l.categorie)}
              {l.estime && <span className="etiquette ml-2 text-petit text-ocre">estimé</span>}
            </span>
            <Montant valeur={l.montant_xof} devise={null} className={l.estime ? "font-normal text-encre-2" : undefined} />
          </li>
        ))}
      </ul>
    </Section>
  );
}
