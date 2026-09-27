import { cn } from "@/lib/cn";
import { couleurCategorie } from "@/lib/depenses";
import { libelleCategorie } from "@/lib/domaine";
import type { LigneCoutVehicule } from "@/lib/estimation";
import { formatCourt, formatNombre, formatPourcent } from "@/lib/format";
import { Montant } from "@/components/ui/signature";

/**
 * Chaque frais prend la couleur de l'étape du voyage où il est payé (table commune : lib/depenses.ts) :
 * la barre raconte le voyage de l'argent.
 */
const couleur = couleurCategorie;

function fond(l: LigneCoutVehicule) {
  const c = couleur(l.categorie);
  return l.estime
    ? { backgroundImage: `repeating-linear-gradient(135deg, ${c} 0 3px, transparent 3px 7px)`, boxShadow: `inset 0 0 0 1.5px ${c}` }
    : { background: c };
}

/**
 * Coût de revient : barre empilée par catégorie, repère du prix affiché, marge visible entre les deux.
 * Premier plan de la fiche : la marge (32 px) ; le coût total reste en second rang (24 px).
 * Les montants estimés (douane pas encore payée) sont hachurés et comptés à part.
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
    <section aria-labelledby="titre-cout" className="carte p-4 lg:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="titre-cout" className="etiquette text-[12px] text-encre-3">Coût de revient{estime > 0 ? " prévisionnel" : ""}</h2>
          <Montant valeur={total} taille="lg" className="mt-1 block" />
          {estime > 0 && <p className="mt-1 text-[14px] text-encre-2">dont <span className="chiffres font-medium">{formatNombre(estime)}</span> FCFA estimés</p>}
        </div>
        {marge !== null && (
          // Téléphone : la marge passe sous le coût, alignée à gauche comme lui ; à droite seulement quand elle est à côté.
          <div className="text-left sm:text-right">
            <p className="etiquette text-[12px] text-encre-3">{margeReelle !== undefined && margeReelle !== null ? "Marge réelle" : "Marge prévue"}</p>
            <p className={cn("chiffres mt-1 text-[32px] leading-none font-extrabold tracking-tight", perte ? "text-perte-texte" : "text-gain-texte")}>
              {perte ? "−" : "+"}{formatCourt(Math.abs(marge))}
              {tauxMarge !== null && <span className="ml-2 text-[14px] font-medium">{formatPourcent(tauxMarge, 1)}</span>}
            </p>
          </div>
        )}
      </div>

      {/* La barre */}
      <div className="relative mt-8 mb-6">
        {reference !== null && (
          <div className="absolute -top-6 flex -translate-x-full flex-col items-end" style={{ left: `${(reference / echelle) * 100}%` }}>
            <span className="text-[12px] whitespace-nowrap text-encre-2">{prixVente ? "Prix de vente" : "Prix affiché"} {formatCourt(reference)}</span>
          </div>
        )}
        <div className="flex h-6 w-full overflow-hidden rounded-sm bg-surface-2" role="img"
          aria-label={`Coût de revient ${formatNombre(total)} FCFA${reference ? `, prix ${formatNombre(reference)} FCFA` : ""}`}>
          {ordonnees.map((l, i) => (
            <span key={`${l.categorie}-${i}`} className="h-full border-r border-surface last:border-r-0" style={{ width: `${(l.montant_xof / echelle) * 100}%`, ...fond(l) }} title={`${libelleCategorie(l.categorie)} : ${formatNombre(l.montant_xof)} FCFA`} />
          ))}
          {reference !== null && reference > total && (
            // Segment de marge : fond teinté et contour en couleur de gain, lisible (≥ 3:1) sur la carte dans les deux thèmes.
            <span className="flex h-full items-center justify-center bg-gain/25 ring-1 ring-gain ring-inset" style={{ width: `${((reference - total) / echelle) * 100}%` }} />
          )}
        </div>
        {reference !== null && <span aria-hidden className="absolute -top-1 -bottom-1 w-0.5 bg-encre" style={{ left: `calc(${(reference / echelle) * 100}% - 1px)` }} />}
        {prixPlancher && prixPlancher <= echelle && (
          <span aria-hidden title={`Plancher ${formatNombre(prixPlancher)} FCFA`} className="absolute -bottom-2 h-2 w-px bg-encre-3" style={{ left: `${(prixPlancher / echelle) * 100}%` }} />
        )}
        {perte && <p className="mt-2 text-[14px] font-medium text-perte-texte">Le coût dépasse le prix : ce véhicule se vendrait à perte.</p>}
      </div>

      <ul className="flex flex-col">
        {ordonnees.map((l, i) => (
          <li key={`${l.categorie}-${i}`} className="flex items-center gap-3 border-b border-trait py-2 last:border-b-0">
            <span aria-hidden className="size-3 shrink-0 rounded-xs" style={fond(l)} />
            <span className="flex-1 text-[14px]">
              {libelleCategorie(l.categorie)}
              {l.estime && <span className="etiquette ml-2 text-[12px] text-ocre-texte">estimé</span>}
            </span>
            <Montant valeur={l.montant_xof} devise={null} className={l.estime ? "font-normal text-encre-2" : undefined} />
          </li>
        ))}
      </ul>
    </section>
  );
}
