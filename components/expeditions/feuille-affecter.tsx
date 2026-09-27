"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useEcriture, useLecture } from "@/lib/api/requetes";
import { useOrg } from "@/lib/session";
import { etape as defEtape } from "@/lib/domaine";
import { etapeMinimale, type StatutExpedition } from "@/lib/workflow";
import { pluriel } from "@/lib/format";
import type { Vehicule } from "@/lib/api/types";
import { finDeVin } from "@/lib/vin";
import { EtiquetteEtape } from "@/components/ui/signature";
import { Feuille } from "@/components/ui/feuille";
import { Bouton } from "@/components/ui/bouton";
import { useAuChangement } from "@/lib/reinitialiser";

export function FeuilleAffecter({ ouverte, onFermer, expeditionId, reference, statut, actuels }: {
  ouverte: boolean; onFermer: () => void; expeditionId: string; reference?: string; statut?: StatutExpedition; actuels: string[];
}) {
  const org = useOrg();
  const { data } = useLecture<Vehicule[]>("vehicules_lister", { p_org: org.id, p_filtres: {} }, { enabled: ouverte });
  const [selection, setSelection] = useState<Set<string>>(new Set());

  useAuChangement([ouverte, actuels.join(",")], () => { if (ouverte) setSelection(new Set(actuels)); });

  const affecter = useEcriture<{ vehicules_mis_a_jour?: number }>("expedition_affecter", {
    onSuccess: (r) => {
      const n = r?.vehicules_mis_a_jour ?? 0;
      toast.success(n ? `Véhicules mis à jour · ${pluriel(n, "véhicule prend", "véhicules prennent")} l'étape du conteneur` : "Véhicules mis à jour");
      onFermer();
    },
    onError: (e) => toast.error(e.message),
  });
  const mini = statut ? etapeMinimale(statut) : null;

  const disponibles = (data ?? []).filter((v) => v.statut_commercial !== "vendu" && !v.archive && (v.expedition_id === null || v.expedition_id === expeditionId));

  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre="Affecter des véhicules" description="Un véhicule déjà dans une autre expédition n'apparaît pas ici." pleinEcran
      pied={<>
        <Bouton variante="secondaire" onClick={onFermer}>Annuler</Bouton>
        <Bouton variante="primaire" chargement={affecter.isPending} onClick={() => affecter.executer({ p_org: org.id, p_id: expeditionId, p_vehicule_ids: [...selection] })}>
          Enregistrer ({selection.size})
        </Bouton>
      </>}>
      {mini && (
        <p className="mb-3 rounded-xl bg-primaire-voile px-3 py-2.5 text-[13px] leading-snug text-encre-2">
          {reference ?? "Ce conteneur"} est déjà « {statut === "en_mer" ? "en mer" : "arrivé au port"} » : un véhicule ajouté passe directement à « {defEtape(mini).libelle} ».
        </p>
      )}
      <ul className="flex flex-col">
        {disponibles.map((v) => {
          const cochee = selection.has(v.id);
          return (
            <li key={v.id}>
              <label className="flex items-center gap-3 border-b border-trait py-2.5 last:border-b-0">
                <input type="checkbox" checked={cochee} className="size-5 accent-[var(--primaire)]"
                  onChange={() => setSelection((s) => { const n = new Set(s); if (n.has(v.id)) n.delete(v.id); else n.add(v.id); return n; })} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{v.libelle}</span>
                  <span className="block truncate font-mono text-[12px] text-encre-3">{v.reference}{v.vin ? ` · ${finDeVin(v.vin)}` : ""}</span>
                </span>
                <EtiquetteEtape etape={v.etape} compacte />
              </label>
            </li>
          );
        })}
        {disponibles.length === 0 && <li className="py-6 text-center text-encre-3">Aucun véhicule disponible.</li>}
      </ul>
    </Feuille>
  );
}
