"use client";

import { isDemoMode } from "@/lib/demo";
import { resetDemoStore } from "@/lib/demo/storage";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";

export function DemoBanner() {
  if (!isDemoMode()) return null;

  const handleReset = () => {
    resetDemoStore();
    toast.success("Données de démo réinitialisées");
    window.location.reload();
  };

  return (
    <div className="bg-amber-100 border-b border-amber-300 text-amber-900 px-4 py-2 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <span>
        🧪 <strong>Mode démo local</strong> — données fictives enregistrées dans votre navigateur
      </span>
      <Button variant="outline" size="sm" onClick={handleReset} className="min-h-10 bg-white">
        <RotateCcw size={16} />
        Réinitialiser les données test
      </Button>
    </div>
  );
}
