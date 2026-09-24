import { cn } from "@/lib/cn";
import { ETAPES, ORDRE_ETAPES, etape as defEtape, type Etape } from "@/lib/domaine";
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

/** Zones du voyage, dans l'ordre, avec le nombre d'étapes qu'elles couvrent. */
function zones(lieux: Record<string, string>) {
  const resultat: { nom: string; n: number }[] = [];
  let derniere = "";
  for (const e of ETAPES) {
    if (e.zone === derniere) resultat[resultat.length - 1]!.n += 1;
    else resultat.push({ nom: lieux[e.zone] ?? e.zone, n: 1 });
    derniere = e.zone;
  }
  return resultat;
}

/**
 * Le trajet : huit segments alignés, un par étape. Passé plein, étape en cours jaune et plus haute (cerclée
 * d'encre), suite en filet ; en dessous, les jours passés à chaque étape, puis les zones (États-Unis, mer,
 * port, Mali). Une seule ligne de texte dit où l'on en est.
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
  const courante = defEtape(etape);
  const joursCourante = jours.get(etape);
  const bandes = zones({ usa: depart || "États-Unis", mer: "En mer", afrique: port || "Port", mali: arrivee || "Bamako" });

  return (
    <section aria-label="Trajet du véhicule">
      <ol className="grid grid-cols-8 gap-[3px]">
        {ETAPES.map((e, i) => {
          const etat = i < indexActuel ? "passee" : i === indexActuel ? "courante" : "future";
          const j = jours.get(e.code);
          return (
            <li key={e.code} aria-current={etat === "courante" ? "step" : undefined} title={e.libelle} className="flex flex-col items-stretch">
              <span className="flex h-[16px] items-center">
                <span
                  aria-hidden
                  className={cn("block w-full", etat === "courante" ? "h-[16px] outline-[1.5px] outline-encre" : "h-[6px]")}
                  style={{ background: etat === "passee" ? "var(--encre)" : etat === "courante" ? "var(--signal)" : "var(--trait)" }}
                />
              </span>
              <span className={cn("chiffres mt-1 h-5 text-center text-petit", etat === "courante" ? "font-semibold text-encre" : "text-encre-3")}>{j !== undefined ? `${j} j` : ""}</span>
              <span className="sr-only">{`${e.libelle} : ${etat === "passee" ? "étape passée" : etat === "courante" ? "étape en cours" : "à venir"}`}</span>
            </li>
          );
        })}
      </ol>
      <div aria-hidden className="mt-0.5 grid grid-cols-8 gap-[3px]">
        {bandes.map((b) => (
          <span key={b.nom} style={{ gridColumn: `span ${b.n}` }} className="etiquette truncate border-t border-trait-fort pt-1 text-petit text-encre-3">{b.nom}</span>
        ))}
      </div>
      <p className="mt-3">
        <span className="etiquette text-petit text-encre">{courante.etiquette}</span>
        <span className="chiffres text-encre-2">
          {joursCourante !== undefined ? ` · depuis ${joursCourante} j` : ""}
          {total > 0 ? ` · ${total} jours depuis l'achat` : ""}
          {eta && indexActuel <= ORDRE_ETAPES.indexOf("en_mer") ? ` · arrivée au port prévue le ${formatDate(eta)}` : ""}
        </span>
      </p>
    </section>
  );
}
