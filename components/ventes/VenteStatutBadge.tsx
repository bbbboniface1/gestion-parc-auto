"use client";

import type { Vente } from "@/types";
import { getStatutVenteConfig } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface VenteStatutBadgeProps {
  status: Vente["status"];
}

export function VenteStatutBadge({ status }: VenteStatutBadgeProps) {
  const config = getStatutVenteConfig(status ?? "active");
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold",
        config.bg,
        config.text
      )}
    >
      {config.label}
    </span>
  );
}
