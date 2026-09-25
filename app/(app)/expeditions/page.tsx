"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useLecture } from "@/lib/api/requetes";
import { useOrg } from "@/lib/session";
import type { ExpeditionListe } from "@/lib/api/types-metier";
import { peut } from "@/lib/domaine";
import { formatCourt, formatDate, pluriel } from "@/lib/format";
import { cn } from "@/lib/cn";
import { EnTetePage } from "@/components/coque/coque";
import { Bouton } from "@/components/ui/bouton";
import { EtatErreur, EtatVide, SqueletteListe } from "@/components/ui/etats";
import { FeuilleExpedition } from "@/components/expeditions/feuille-expedition";

const LIBELLES: Record<string, string> = { preparation: "Préparation", en_mer: "En mer", arrivee: "Arrivée", cloturee: "Clôturée" };
const COULEURS: Record<string, string> = { preparation: "var(--etape-achete)", en_mer: "var(--etape-en-mer)", arrivee: "var(--etape-au-port)", cloturee: "var(--encre-3)" };

export default function PageExpeditions() {
  const org = useOrg();
  const peutCreer = peut(org.role, "modifierVehicule");
  const { data, error, isPending, refetch } = useLecture<ExpeditionListe[]>("expeditions_lister", { p_org: org.id, p_filtres: {} });
  const [nouvelle, setNouvelle] = useState(false);

  return (
    <>
      <EnTetePage titre="Expéditions" sousTitre={data ? pluriel(data.length, "expédition") : undefined}
        actions={peutCreer ? <Bouton variante="primaire" icone={<Plus className="size-4" />} onClick={() => setNouvelle(true)}>Nouvelle expédition</Bouton> : undefined} />

      {error && !data ? <EtatErreur erreur={error} onReessayer={() => void refetch()} /> : isPending ? <SqueletteListe /> : !data?.length ? (
        <EtatVide titre="Aucune expédition" texte="Groupez vos véhicules par conteneur pour partager les frais de fret et suivre l'arrivée." />
      ) : (
        <ul className="flex flex-col gap-2">
          {data.map((e) => (
            <li key={e.id} className="carte">
              <Link href={`/expeditions/fiche/?id=${e.id}`} className="flex flex-col gap-2 p-4 hover:bg-surface-2/40 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[14px] font-semibold">{e.reference}</span>
                    <span className="etiquette rounded-[4px] px-1.5 py-0.5 text-[11px]" style={{ color: COULEURS[e.statut], background: "var(--surface-2)" }}>{LIBELLES[e.statut]}</span>
                    {e.numero_conteneur && <span className="font-mono text-[12px] text-encre-3">{e.numero_conteneur}</span>}
                  </div>
                  <p className="mt-0.5">{[e.compagnie, e.navire].filter(Boolean).join(" · ")}</p>
                  <p className="text-[13px] text-encre-3">
                    {[e.port_depart, e.port_arrivee].filter(Boolean).join(" → ")}
                    {e.date_arrivee_prevue && ` · arrivée ${formatDate(e.date_arrivee_prevue)}`}
                    {e.jours_avant_arrivee !== null && e.jours_avant_arrivee !== undefined && (
                      <span className={cn(e.jours_avant_arrivee <= 3 && "font-medium text-ocre-texte")}> ({e.jours_avant_arrivee} j)</span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4 text-right">
                  <div><p className="text-[12px] text-encre-3">Véhicules</p><p className="chiffres font-semibold">{e.nb_vehicules}</p></div>
                  {e.frais_xof !== null && <div><p className="text-[12px] text-encre-3">Frais</p><p className="chiffres font-semibold">{formatCourt(e.frais_xof)}</p></div>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <FeuilleExpedition ouverte={nouvelle} onFermer={() => setNouvelle(false)} />
    </>
  );
}
