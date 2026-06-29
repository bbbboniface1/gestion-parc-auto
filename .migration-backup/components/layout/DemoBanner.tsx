"use client";

import { useEffect, useState } from "react";
import { isDemoMode, deactivateDemoMode } from "@/lib/demo";
import { resetDemoStore } from "@/lib/demo/storage";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RotateCcw, X } from "lucide-react";

export function DemoBanner() {
  const [visible, setVisible] = useState(false);

  // Vérifier côté client uniquement (localStorage)
  useEffect(() => {
    setVisible(isDemoMode());
  }, []);

  if (!visible) return null;

  const handleReset = () => {
    resetDemoStore();
    toast.success("Données de démo réinitialisées");
    window.location.reload();
  };

  const handleQuitDemo = () => {
    deactivateDemoMode();
    toast.success("Mode démo désactivé");
    window.location.href = "/connexion";
  };

  return (
    <div className="bg-amber-100 border-b border-amber-300 text-amber-900 px-4 py-2 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <span>
        🧪 <strong>Mode démo local</strong> — données fictives enregistrées dans votre navigateur
      </span>
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={handleReset} className="min-h-10 bg-white">
          <RotateCcw size={16} />
          Réinitialiser
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleQuitDemo}
          className="min-h-10 bg-white text-red-600 border-red-200 hover:bg-red-50"
        >
          <X size={16} />
          Quitter le mode démo
        </Button>
      </div>
    </div>
  );
}
