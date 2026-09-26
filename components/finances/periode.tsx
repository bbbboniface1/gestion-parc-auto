"use client";

import { cn } from "@/lib/cn";

export interface Periode { du: string; au: string; }
export type CodePeriode = "mois" | "mois_precedent" | "trimestre" | "annee";

function iso(d: Date): string { return d.toISOString().slice(0, 10); }

export function periodePour(code: CodePeriode): Periode {
  const n = new Date();
  const debutMois = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  switch (code) {
    case "mois": return { du: iso(debutMois(n)), au: iso(n) };
    case "mois_precedent": {
      const prec = new Date(n.getFullYear(), n.getMonth() - 1, 1);
      return { du: iso(prec), au: iso(new Date(n.getFullYear(), n.getMonth(), 0)) };
    }
    case "trimestre": return { du: iso(new Date(n.getFullYear(), n.getMonth() - 2, 1)), au: iso(n) };
    case "annee": return { du: iso(new Date(n.getFullYear(), 0, 1)), au: iso(n) };
  }
}

const OPTIONS: { valeur: CodePeriode; libelle: string }[] = [
  { valeur: "mois", libelle: "Ce mois" }, { valeur: "mois_precedent", libelle: "Mois dernier" },
  { valeur: "trimestre", libelle: "3 mois" }, { valeur: "annee", libelle: "Cette année" },
];

export function SelecteurPeriode({ valeur, onChange }: { valeur: CodePeriode; onChange: (c: CodePeriode) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((o) => (
        <button key={o.valeur} type="button" aria-pressed={valeur === o.valeur} onClick={() => onChange(o.valeur)}
          className={cn("h-9 shrink-0 rounded-controle border px-3 text-[14px]", valeur === o.valeur ? "border-encre bg-encre text-surface" : "border-trait-fort bg-surface text-encre-2")}>
          {o.libelle}
        </button>
      ))}
    </div>
  );
}
