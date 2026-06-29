import type { StatutVoiture } from "@/types";
import { STATUT_ORDER, getStatutConfig } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Check, Circle } from "lucide-react";

interface StatutTimelineProps {
  currentStatut: StatutVoiture;
}

export function StatutTimeline({ currentStatut }: StatutTimelineProps) {
  const currentIndex = STATUT_ORDER.indexOf(currentStatut);

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex items-center min-w-[500px] px-2">
        {STATUT_ORDER.map((statut, index) => {
          const config = getStatutConfig(statut);
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <div key={statut} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                    isCompleted && "bg-green-500 border-green-500 text-white",
                    isCurrent && `${config.bg} border-current ${config.text} ring-2 ring-offset-2`,
                    isPending && "bg-gray-100 border-gray-300 text-gray-400"
                  )}
                >
                  {isCompleted ? (
                    <Check size={18} />
                  ) : isCurrent ? (
                    <span className="text-sm">⏳</span>
                  ) : (
                    <Circle size={14} />
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs mt-2 text-center font-medium",
                    isCurrent ? config.text : "text-gray-500"
                  )}
                >
                  {config.label}
                </span>
              </div>
              {index < STATUT_ORDER.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-1",
                    index < currentIndex ? "bg-green-500" : "bg-gray-200"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
