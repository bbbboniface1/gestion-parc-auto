"use client";

import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  size?: number;
}

export function Spinner({ className, size = 44 }: SpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-10 gap-3", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <div
          className="absolute inset-0 rounded-full border-[3px] border-primary/15"
        />
        <div
          className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-primary animate-spin"
          style={{ animationDuration: "0.7s" }}
        />
        <div
          className="absolute inset-[6px] rounded-full border-[2px] border-transparent border-t-primary/40 animate-spin"
          style={{ animationDuration: "1.1s", animationDirection: "reverse" }}
        />
      </div>
    </div>
  );
}
