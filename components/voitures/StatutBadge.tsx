import type { StatutVoiture } from "@/types";
import { getStatutConfig } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface StatutBadgeProps {
  statut: StatutVoiture;
  className?: string;
}

export function StatutBadge({ statut, className }: StatutBadgeProps) {
  const config = getStatutConfig(statut);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold",
        config.bg,
        config.text,
        className
      )}
    >
      {config.icon} {config.label}
    </span>
  );
}
