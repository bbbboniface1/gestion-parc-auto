import type { StatutVoiture } from "@/types";
import { STATUT_ORDER, getStatutConfig } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { CheckIcon } from "@heroicons/react/24/solid";

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
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    isCompleted && "bg-green-500 border-green-500 text-white shadow-md shadow-green-200",
                    isCurrent && `${config.bg} border-current ${config.text} ring-2 ring-offset-2 ring-current/30 shadow-md`,
                    isPending && "bg-gray-100 border-gray-200 text-gray-300"
                  )}
                >
                  {isCompleted ? (
                    <CheckIcon className="w-5 h-5" />
                  ) : isCurrent ? (
                    <span className="text-sm">⏳</span>
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs mt-2 text-center font-medium transition-colors",
                    isCurrent ? config.text : isCompleted ? "text-green-600" : "text-gray-400"
                  )}
                >
                  {config.label}
                </span>
              </div>
              {index < STATUT_ORDER.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-1 transition-colors duration-300",
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
