"use client";

import { FiltresTexte } from "@/components/ui/recherche";

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
  return <FiltresTexte valeur={valeur} onChange={onChange} libelle="Période" options={OPTIONS.map((o) => [o.valeur, o.libelle] as const)} />;
}
