"use client";

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
