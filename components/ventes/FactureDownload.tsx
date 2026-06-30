"use client";

import { useEffect } from "react";
import { usePDF } from "@react-pdf/renderer";
import type { Vente, Voiture, Parametres } from "@/types";
import { FacturePDF } from "./FacturePDF";
import { Button } from "@/components/ui/button";
import { ArrowDownTrayIcon } from "@heroicons/react/24/solid";

interface FactureDownloadProps {
  vente: Vente;
  voiture: Voiture;
  parametres: Parametres;
}

export function FactureDownload({ vente, voiture, parametres }: FactureDownloadProps) {
  const [instance, updateInstance] = usePDF();

  useEffect(() => {
    updateInstance(
      <FacturePDF vente={vente} voiture={voiture} parametres={parametres} />
    );
  }, [vente, voiture, parametres, updateInstance]);

  const handleDownload = () => {
    if (!instance.url) return;
    const link = document.createElement("a");
    link.href = instance.url;
    link.download = `${vente.numero_facture}.pdf`;
    link.click();
  };

  return (
    <Button size="lg" disabled={instance.loading || !instance.url} onClick={handleDownload} className="gap-2">
      <ArrowDownTrayIcon className="w-5 h-5" />
      {instance.loading ? "Préparation..." : "Télécharger la facture PDF"}
    </Button>
  );
}
