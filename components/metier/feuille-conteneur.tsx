"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Boat, Plus } from "@phosphor-icons/react";
import { useEcriture, useLecture } from "@/lib/api/requetes";
import { useOrg } from "@/lib/session";
import type { ExpeditionListe } from "@/lib/api/types-metier";
import { celebrer } from "@/lib/celebration";
import { pluriel } from "@/lib/format";
import { Feuille } from "@/components/ui/feuille";
import { Bouton } from "@/components/ui/bouton";
import { EtatVide, SqueletteListe } from "@/components/ui/etats";
import { FeuilleExpedition } from "@/components/expeditions/feuille-expedition";
import { RouteMaritime, STATUTS_EXPEDITION } from "@/components/expeditions/route-maritime";

/**
 * « Dans quel conteneur ? » : choisir un conteneur existant (préparation, en mer ou arrivé) ou en créer un nouveau.
 * Le véhicule prend tout de suite l'étape du conteneur s'il est en retard sur lui (règle appliquée par le serveur).
 */
export function FeuilleConteneur({ ouverte, onFermer, vehiculeId, vehiculeLibelle, actuel }: {
  ouverte: boolean;
  onFermer: () => void;
  vehiculeId: string;
  vehiculeLibelle: string;
  /** Conteneur actuel : mis en évidence, non re-sélectionnable. */
  actuel?: string | null;
}) {
  const org = useOrg();
  const [creation, setCreation] = useState(false);
  const { data, isPending } = useLecture<ExpeditionListe[]>("expeditions_lister", { p_org: org.id, p_filtres: {} }, { enabled: ouverte });

  const affecter = useEcriture<{ etape: string; expedition: { reference: string } | null }>("vehicule_expedition_affecter", {
    onSuccess: (v) => {
      celebrer({ type: "etape", titre: v?.expedition ? `Dans ${v.expedition.reference}` : "Retiré du conteneur", detail: v?.expedition ? `${vehiculeLibelle} voyage dans ce conteneur.` : undefined, couleur: "var(--etape-en-mer)" });
      onFermer();
    },
    onError: (e) => toast.error(e.message),
  });

  const ouverts = (data ?? []).filter((e) => e.statut !== "cloturee");

  return (
    <>
      <Feuille ouverte={ouverte && !creation} onFermer={onFermer} titre="Dans quel conteneur ?" description={`Choisissez celui qui emmène ${vehiculeLibelle}.`} largeur="lg"
        pied={<Bouton variante="secondaire" icone={<Plus size={18} weight="bold" />} onClick={() => setCreation(true)}>Nouveau conteneur</Bouton>}>
        {isPending ? <SqueletteListe lignes={3} /> : ouverts.length === 0 ? (
          <EtatVide titre="Aucun conteneur ouvert" texte="Créez le conteneur qui emmène ce véhicule : vous pourrez y ajouter les autres ensuite." />
        ) : (
          <ul className="flex flex-col gap-3">
            {ouverts.map((e) => {
              const st = STATUTS_EXPEDITION[e.statut];
              const ici = e.id === actuel;
              return (
                <li key={e.id}>
                  <button type="button" disabled={ici || affecter.isPending}
                    onClick={() => affecter.executer({ p_org: org.id, p_vehicule_id: vehiculeId, p_expedition_id: e.id })}
                    className="onde carte carte-lien group flex w-full flex-col gap-3 p-4 text-left disabled:opacity-60">
                    <span className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="text-[16px] font-extrabold group-hover:text-primaire">{e.reference}</span>
                        <span className="inline-flex h-6 items-center gap-2 rounded-full px-2 text-[12px] font-bold" style={{ background: `color-mix(in srgb, ${st.couleur} 13%, var(--surface))`, color: `color-mix(in srgb, ${st.couleur} 62%, var(--pole-texte))` }}>
                          <span className="size-2 rounded-full" style={{ background: st.couleur }} />{st.libelle}
                        </span>
                      </span>
                      <span className="shrink-0 text-[14px] font-semibold text-encre-2">{pluriel(e.nb_vehicules, "véhicule")}</span>
                    </span>
                    <span className="truncate text-[14px] text-encre-3">{[e.compagnie, e.navire, e.numero_conteneur].filter(Boolean).join(" · ") || "Compagnie à préciser"}</span>
                    <RouteMaritime v={e} />
                    <span className="flex items-center justify-end gap-1 text-[14px] font-bold text-primaire">
                      {ici ? "Il est déjà dans ce conteneur" : <>Mettre dans {e.reference} <ArrowRight size={14} weight="bold" aria-hidden /></>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {actuel && (
          <Bouton className="mt-4" variante="fantome" icone={<Boat size={18} weight="duotone" />} chargement={affecter.isPending}
            onClick={() => affecter.executer({ p_org: org.id, p_vehicule_id: vehiculeId, p_expedition_id: null })}>
            Le sortir de son conteneur
          </Bouton>
        )}
      </Feuille>
      <FeuilleExpedition ouverte={ouverte && creation} onFermer={() => setCreation(false)}
        onCree={(id) => { setCreation(false); affecter.executer({ p_org: org.id, p_vehicule_id: vehiculeId, p_expedition_id: id }); }} />
    </>
  );
}
