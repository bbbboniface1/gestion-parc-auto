"use client";

import { useRouter } from "next/navigation";
import { VoitureForm } from "@/components/voitures/VoitureForm";
import type { Voiture } from "@/types";

export default function AjouterVoiturePage() {
  const router = useRouter();

  const handleSuccess = (voiture: Voiture) => {
    router.push("/voitures");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">➕ Ajouter une voiture</h1>
        <p className="text-muted-foreground mt-1">Enregistrez une nouvelle voiture importée</p>
      </div>
      <VoitureForm onSuccess={handleSuccess} />
    </div>
  );
}
