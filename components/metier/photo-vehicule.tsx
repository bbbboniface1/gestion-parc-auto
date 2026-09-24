"use client";

import { cn } from "@/lib/cn";
import { useUrlFichier } from "@/lib/stockage";

/**
 * Photo d'un véhicule. Sans photo, on ne dessine pas de fausse voiture : un aplat neutre et le mot juste,
 * pour que l'absence se voie (et se corrige) au lieu d'être maquillée.
 */
export function PhotoVehicule({ path, alt, className, arrondi = true }: { path: string | null | undefined; alt: string; className?: string; arrondi?: boolean }) {
  const url = useUrlFichier(path);
  return (
    <div className={cn("relative overflow-hidden bg-surface-2", arrondi && "rounded-controle", className)}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- export statique, URL signées
        <img src={url} alt={alt} loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <span className="etiquette text-petit text-encre-3">{path ? "" : "Pas de photo"}</span>
        </div>
      )}
    </div>
  );
}
