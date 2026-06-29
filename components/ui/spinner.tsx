import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  size?: number;
}

export function Spinner({ className, size = 32 }: SpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center py-8", className)}>
      <Loader2 className="animate-spin text-primary" size={size} />
    </div>
  );
}
