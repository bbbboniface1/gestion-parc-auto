"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff } from "lucide-react";

export function OnlineIndicator() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] h-1 transition-colors",
        online ? "bg-emerald-500" : "bg-red-500"
      )}
      title={online ? "En ligne" : "Hors ligne"}
      aria-label={online ? "Connexion active" : "Connexion perdue"}
    >
      {!online && (
        <div className="flex items-center justify-center gap-2 bg-red-500 text-white text-sm py-2 px-4">
          <WifiOff size={16} />
          Mode hors ligne — certaines actions peuvent échouer
        </div>
      )}
      {online && (
        <span className="sr-only">
          <Wifi size={16} />
          En ligne
        </span>
      )}
    </div>
  );
}
