import type { PaiementFournisseur } from "@/types";
import { getPaiementConfig } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface PaiementBadgeProps {
  paiement: PaiementFournisseur;
  className?: string;
}

export function PaiementBadge({ paiement, className }: PaiementBadgeProps) {
  const config = getPaiementConfig(paiement);
  const icon = paiement === "paye" ? "✅" : paiement === "partiel" ? "⚠️" : "🔴";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold",
        config.bg,
        config.text,
        className
      )}
    >
      {icon} {config.label}
    </span>
  );
}
