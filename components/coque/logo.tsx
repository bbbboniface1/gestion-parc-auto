"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

/**
 * Marque Parc Auto : carré arrondi en dégradé orange, une route qui mène d'un point de départ (enchère)
 * à un point d'arrivée (Bamako). Même dessin que l'icône de l'application (scripts/generer-icones.mjs).
 */
export function Logo({ className }: { className?: string }) {
  // Identifiant unique : le logo apparaît deux fois (barre latérale masquée + en-tête mobile).
  const id = `logo-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cn("shrink-0", className)}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF9A3D" />
          <stop offset="1" stopColor="#F2541B" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${id})`} />
      <path d="M11 28c4-9 14-4 18-14" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeDasharray="0.1 5.2" />
      <circle cx="11" cy="28" r="3.4" fill="#fff" />
      <circle cx="29" cy="13" r="4.2" fill="#0B1633" stroke="#fff" strokeWidth="2.4" />
    </svg>
  );
}
