"use client";

import { useState } from "react";
import { formatCourt, formatMoisCourt, formatNombre } from "@/lib/format";

interface Point {
  mois: string;
  ca: number;
  marge: number | null;
  nb: number;
}

/**
 * Chiffre d'affaires sur 12 mois, une seule échelle : chaque barre est le CA du mois,
 * sa partie haute en latérite est la marge. On lit d'un coup d'œil le volume et ce qu'il rapporte.
 */
export function GraphiqueMois({ points }: { points: Point[] }) {
  const [survol, setSurvol] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.ca));
  const actif = survol ?? points.length - 1;
  const p = points[actif];
  const voitMarge = points.some((x) => x.marge !== null);

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="etiquette text-[12px] text-encre-3">Ventes sur 12 mois</span>
        {p && (
          <span className="text-[13px] text-encre-2" aria-live="polite">
            {formatMoisCourt(p.mois)} : <span className="chiffres font-semibold text-encre">{formatCourt(p.ca)}</span>
            {voitMarge && p.marge !== null && <> · marge <span className="chiffres font-semibold text-primaire">{formatCourt(p.marge)}</span></>}
            {` · ${p.nb} vente${p.nb > 1 ? "s" : ""}`}
          </span>
        )}
      </figcaption>
      <div className="flex h-32 items-end gap-[3px]" onMouseLeave={() => setSurvol(null)}>
        {points.map((x, i) => {
          const h = (x.ca / max) * 100;
          const hm = x.marge && x.ca > 0 ? Math.max(0, Math.min(1, x.marge / x.ca)) * h : 0;
          return (
            <button
              key={x.mois}
              type="button"
              onMouseEnter={() => setSurvol(i)}
              onFocus={() => setSurvol(i)}
              onClick={() => setSurvol(i)}
              aria-label={`${formatMoisCourt(x.mois)} : ${formatNombre(x.ca)} FCFA de ventes${x.marge !== null ? `, marge ${formatNombre(x.marge)} FCFA` : ""}`}
              className="group relative flex h-full flex-1 flex-col justify-end"
            >
              <span className={`relative w-full rounded-t-[2px] ${i === actif ? "bg-encre-2" : "bg-trait-fort group-hover:bg-encre-3"}`} style={{ height: `${Math.max(h, x.ca > 0 ? 2 : 0)}%` }}>
                {hm > 0 && <span className="absolute inset-x-0 top-0 rounded-t-[2px] bg-primaire" style={{ height: `${(hm / h) * 100}%` }} />}
              </span>
            </button>
          );
        })}
      </div>
      <div aria-hidden className="flex gap-[3px]">
        {points.map((x, i) => (
          <span key={x.mois} className={`flex-1 text-center text-[10px] ${i === actif ? "font-semibold text-encre" : "text-encre-3"}`}>
            {formatMoisCourt(x.mois).slice(0, 1).toUpperCase()}
          </span>
        ))}
      </div>
    </figure>
  );
}
