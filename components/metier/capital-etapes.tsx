"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { ETAPES, etape as defEtape, type Etape } from "@/lib/domaine";
import { formatCourt, formatNombre, pluriel } from "@/lib/format";
import { Montant } from "@/components/ui/signature";

interface Tranche {
  etape: Etape;
  nb: number;
  montant: number | null;
}

/**
 * « Où est votre argent ? » — le capital immobilisé, découpé le long du voyage du véhicule.
 * La barre se lit de gauche à droite comme le trajet : États-Unis, mer, port, Bamako.
 * Pour un rôle qui ne voit pas les coûts, la même barre se construit sur le nombre de véhicules.
 */
export function CapitalParEtape({ tranches, className }: { tranches: Tranche[]; className?: string }) {
  const voitCouts = tranches.some((t) => t.montant !== null);
  const valeur = (t: Tranche) => (voitCouts ? t.montant ?? 0 : t.nb);
  const total = tranches.reduce((s, t) => s + valeur(t), 0);
  const nbTotal = tranches.reduce((s, t) => s + t.nb, 0);
  const presentes = ETAPES.map((e) => tranches.find((t) => t.etape === e.code) ?? { etape: e.code, nb: 0, montant: voitCouts ? 0 : null });

  return (
    <section aria-labelledby="titre-capital" className={cn("carte p-4 lg:p-6", className)}>
      <h2 id="titre-capital" className="etiquette text-[12px] text-encre-3">{voitCouts ? "Où est votre argent ?" : "Où sont vos véhicules ?"}</h2>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {voitCouts ? <Montant valeur={total} court taille="heros" /> : <span className="chiffres text-[40px] leading-none font-semibold tracking-tight">{nbTotal}</span>}
        <span className="text-encre-2">
          {voitCouts ? `immobilisés dans ${pluriel(nbTotal, "véhicule")}` : pluriel(nbTotal, "véhicule") + " en cours"}
        </span>
      </div>

      {/* La barre : un segment par étape, séparés d'un filet couleur papier */}
      <div className="mt-5 flex h-4 w-full overflow-hidden rounded-[3px] bg-surface-2" role="img"
        aria-label={presentes.filter((t) => valeur(t) > 0).map((t) => `${defEtape(t.etape).libelle} : ${voitCouts ? `${formatNombre(t.montant ?? 0)} FCFA` : pluriel(t.nb, "véhicule")}`).join(", ")}>
        {total > 0 && presentes.map((t) => {
          const part = valeur(t) / total;
          if (part <= 0) return null;
          return <span key={t.etape} className="h-full border-r-2 border-surface last:border-r-0" style={{ width: `${part * 100}%`, background: defEtape(t.etape).couleur }} />;
        })}
      </div>
      <div aria-hidden className="etiquette mt-1.5 flex justify-between text-[11px] text-encre-3">
        <span>États-Unis</span>
        <span className="mx-3 flex-1 self-center border-t border-dashed border-trait-fort" />
        <span>En mer</span>
        <span className="mx-3 flex-1 self-center border-t border-dashed border-trait-fort" />
        <span>Bamako</span>
      </div>

      <ul className="mt-5 grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-4">
        {presentes.map((t) => {
          const def = defEtape(t.etape);
          return (
            <li key={t.etape}>
              <Link href={`/parc/?etape=${t.etape}`}
                className={cn("flex items-center gap-3 border-b border-trait py-2.5 hover:bg-surface-2/60 lg:py-2", t.nb === 0 && "opacity-55")}>
                <span aria-hidden className="h-6 w-[3px] rounded-sm" style={{ background: def.couleur }} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium text-encre">{def.libelle}</span>
                  <span className="block text-[12px] text-encre-3">{pluriel(t.nb, "véhicule")}</span>
                </span>
                {voitCouts && <span className="chiffres text-[15px] font-semibold lg:text-sm">{formatCourt(t.montant ?? 0)}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
