import { cn } from "@/lib/cn";
import { ETAPES, ORDRE_ETAPES, type Etape } from "@/lib/domaine";
import { formatDate, joursDepuis, lireDate } from "@/lib/format";

interface Passage {
  etape: Etape;
  date: string;
}

/** Jours passés à chaque étape, d'après l'historique (première date d'entrée dans l'étape). */
export function joursParEtape(historique: Passage[], actuelle: Etape, aujourdhui = new Date()): Map<Etape, number> {
  const entrees = new Map<Etape, Date>();
  for (const p of [...historique].sort((a, b) => a.date.localeCompare(b.date))) {
    const d = lireDate(p.date);
    if (d && !entrees.has(p.etape)) entrees.set(p.etape, d);
  }
  const atteintes = ORDRE_ETAPES.filter((e) => entrees.has(e) && ORDRE_ETAPES.indexOf(e) <= ORDRE_ETAPES.indexOf(actuelle));
  const jours = new Map<Etape, number>();
  atteintes.forEach((e, i) => {
    const debut = entrees.get(e)!;
    const suivante = atteintes[i + 1];
    const fin = suivante ? entrees.get(suivante)! : aujourdhui;
    jours.set(e, Math.max(0, joursDepuis(debut, fin) ?? 0));
  });
  return jours;
}

/**
 * Le trajet : une étape par point, pleins pour le passé, anneau pour l'étape en cours, vides pour
 * la suite ; sous chaque point, le nombre de jours qu'on y a passé. Au-dessus, les lieux.
 */
export function Trajet({ etape, historique, depart, port, arrivee, eta }: {
  etape: Etape;
  historique: Passage[];
  depart?: string | null;
  port?: string | null;
  arrivee?: string | null;
  eta?: string | null;
}) {
  const indexActuel = ORDRE_ETAPES.indexOf(etape);
  const jours = joursParEtape(historique, etape);
  const total = [...jours.values()].reduce((s, j) => s + j, 0);
  const lieux: Record<number, string> = { 0: depart || "États-Unis", 3: port || "Port", 5: arrivee || "Bamako" };

  return (
    <section aria-label="Trajet du véhicule" className="rounded-carte border border-trait bg-surface p-4 lg:p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="etiquette text-[12px] text-encre-3">Le trajet</h2>
        <p className="text-[13px] text-encre-2">
          {total > 0 && <span className="chiffres">{total} jours depuis l&apos;achat</span>}
          {eta && indexActuel <= ORDRE_ETAPES.indexOf("en_mer") && (
            <span className="ml-2 font-medium text-encre">· arrivée au port prévue le {formatDate(eta)}</span>
          )}
        </p>
      </div>
      <div className="sans-barre -mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        <ol className="relative grid min-w-[620px] grid-cols-8">
          {ETAPES.map((e, i) => {
            const etat = i < indexActuel ? "passee" : i === indexActuel ? "courante" : "future";
            const j = jours.get(e.code);
            return (
              <li key={e.code} className="relative flex flex-col items-center text-center" aria-current={etat === "courante" ? "step" : undefined}>
                <span className="etiquette h-4 text-[11px] text-encre-2">{lieux[i] ?? ""}</span>
                <div className="relative mt-1 flex h-6 w-full items-center justify-center">
                  {i > 0 && (
                    <span aria-hidden className={cn("absolute top-1/2 right-1/2 left-0 border-t-2", i <= indexActuel ? "border-solid" : "border-dashed border-trait-fort")}
                      style={i <= indexActuel ? { borderColor: ETAPES[i - 1]!.couleur } : undefined} />
                  )}
                  {i < ETAPES.length - 1 && (
                    <span aria-hidden className={cn("absolute top-1/2 right-0 left-1/2 border-t-2", i < indexActuel ? "border-solid" : "border-dashed border-trait-fort")}
                      style={i < indexActuel ? { borderColor: e.couleur } : undefined} />
                  )}
                  <span
                    aria-hidden
                    className={cn("relative z-10 rounded-full border-[3px] bg-surface", etat === "courante" ? "size-5" : "size-3.5")}
                    style={{ borderColor: etat === "future" ? "var(--trait-fort)" : e.couleur, background: etat === "passee" ? e.couleur : undefined }}
                  />
                </div>
                <span className={cn("mt-1.5 text-[12px] leading-tight", etat === "courante" ? "font-semibold text-encre" : etat === "passee" ? "text-encre-2" : "text-encre-3")}>
                  {e.libelle}
                </span>
                <span className="chiffres mt-0.5 h-4 text-[11px] text-encre-3">{j !== undefined ? `${j} j` : ""}</span>
                <span className="sr-only">{etat === "passee" ? "étape passée" : etat === "courante" ? "étape en cours" : "à venir"}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
