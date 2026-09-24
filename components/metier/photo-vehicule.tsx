"use client";

import { cn } from "@/lib/cn";
import { useUrlFichier } from "@/lib/stockage";

/** Silhouette neutre quand il n'y a pas encore de photo (jamais d'emoji). */
function Silhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 60" aria-hidden className={cn("text-encre-3/60", className)} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M8 42h8m24 0h40m24 0h8v-9c0-3-2-5-5-6l-14-3-12-11c-2-2-4-3-7-3H46c-3 0-5 1-7 3l-9 11-14 2c-4 1-7 4-7 8v8" />
      <circle cx="28" cy="42" r="8" />
      <circle cx="92" cy="42" r="8" />
      <path d="M36 24h52M60 13v11" />
    </svg>
  );
}

export function PhotoVehicule({ path, alt, className, arrondi = true }: { path: string | null | undefined; alt: string; className?: string; arrondi?: boolean }) {
  const url = useUrlFichier(path);
  return (
    <div className={cn("relative overflow-hidden bg-surface-2", arrondi && "rounded-controle", className)}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- export statique, URL signées
        <img src={url} alt={alt} loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <Silhouette className="w-3/5" />
        </div>
      )}
    </div>
  );
}
