"use client";

import { useEffect } from "react";
import { usePDF } from "@react-pdf/renderer";
import type { Vente, Voiture, Parametres } from "@/types";
import { FacturePDF } from "./FacturePDF";
import { Button } from "@/components/ui/button";
import { ArrowDownTrayIcon, PrinterIcon } from "@heroicons/react/24/solid";

interface FactureActionsProps {
  vente: Vente;
  voiture: Voiture;
  parametres: Parametres;
}

export function FactureActions({ vente, voiture, parametres }: FactureActionsProps) {
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
    link.download = `${vente.numero_facture ?? "facture"}.pdf`;
    link.click();
  };

  const handlePrint = () => {
    if (!instance.url) return;
    const win = window.open(instance.url, "_blank");
    win?.print();
  };

  const disabled = instance.loading || !instance.url;

  return (
    <div className="flex flex-wrap gap-3">
      <Button size="lg" disabled={disabled} onClick={handleDownload} title="Télécharger le PDF" className="gap-2 transition-all hover:shadow-md">
        <ArrowDownTrayIcon className="w-5 h-5" />
        Télécharger PDF
      </Button>
      <Button size="lg" variant="outline" disabled={disabled} onClick={handlePrint} title="Imprimer la facture" className="gap-2 transition-all hover:shadow-sm">
        <PrinterIcon className="w-5 h-5" />
        Imprimer
      </Button>
    </div>
  );
}
