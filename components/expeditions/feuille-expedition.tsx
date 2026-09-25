"use client";

import { useState } from "react";
import { toast } from "sonner";
import { nouvelId, useEcriture, useLecture } from "@/lib/api/requetes";
import { useOrg } from "@/lib/session";
import type { ExpeditionListe } from "@/lib/api/types-metier";
import { Feuille } from "@/components/ui/feuille";
import { Bouton } from "@/components/ui/bouton";
import { Champ, Selection, ZoneTexte } from "@/components/ui/champ";
import { Choix } from "@/components/ui/choix";
import { useAuChangement } from "@/lib/reinitialiser";

interface Referentiel { id: string; type: string; libelle: string; actif: boolean }

export function FeuilleExpedition({ ouverte, onFermer, expedition, onCree }: {
  ouverte: boolean; onFermer: () => void; expedition?: ExpeditionListe | null; onCree?: (id: string) => void;
}) {
  const org = useOrg();
  const { data: refs } = useLecture<Referentiel[]>("referentiels_lister", { p_org: org.id }, { enabled: ouverte });
  const ports = (refs ?? []).filter((r) => r.actif && (r.type === "port_depart" || r.type === "port_arrivee"));
  const compagnies = (refs ?? []).filter((r) => r.actif && r.type === "compagnie");

  const [reference, setReference] = useState("");
  const [mode, setMode] = useState<"conteneur" | "roro">("conteneur");
  const [numeroConteneur, setNumeroConteneur] = useState("");
  const [numeroBl, setNumeroBl] = useState("");
  const [compagnie, setCompagnie] = useState("");
  const [navire, setNavire] = useState("");
  const [portDepart, setPortDepart] = useState("");
  const [portArrivee, setPortArrivee] = useState("");
  const [dateDepart, setDateDepart] = useState("");
  const [dateArriveePrevue, setDateArriveePrevue] = useState("");
  const [notes, setNotes] = useState("");
  const [id, setId] = useState(nouvelId);

  useAuChangement([ouverte, expedition?.id], () => {
    if (!ouverte) return;
    setReference(expedition?.reference ?? ""); setMode(expedition?.mode ?? "conteneur");
    setNumeroConteneur(expedition?.numero_conteneur ?? ""); setNumeroBl(expedition?.numero_bl ?? "");
    setCompagnie(expedition?.compagnie ?? ""); setNavire(expedition?.navire ?? "");
    setPortDepart(expedition?.port_depart ?? ""); setPortArrivee(expedition?.port_arrivee ?? "");
    setDateDepart(expedition?.date_depart ?? ""); setDateArriveePrevue(expedition?.date_arrivee_prevue ?? "");
    setNotes(expedition?.notes ?? ""); setId(expedition?.id ?? nouvelId());
  });

  const enregistrer = useEcriture<{ id: string }>("expedition_enregistrer", {
    onSuccess: (e) => { toast.success(expedition ? "Expédition modifiée" : "Expédition créée"); onFermer(); onCree?.(e?.id ?? id); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre={expedition ? "Modifier l'expédition" : "Nouvelle expédition"} pleinEcran
      pied={<>
        <Bouton variante="secondaire" onClick={onFermer}>Annuler</Bouton>
        <Bouton variante="primaire" chargement={enregistrer.isPending} onClick={() => enregistrer.executer({
          p_org: org.id, p_data: {
            id, reference: reference.trim() || null, mode, numero_conteneur: numeroConteneur.trim() || null,
            numero_bl: numeroBl.trim() || null, compagnie: compagnie.trim() || null, navire: navire.trim() || null,
            port_depart: portDepart.trim() || null, port_arrivee: portArrivee.trim() || null,
            date_depart: dateDepart || null, date_arrivee_prevue: dateArriveePrevue || null, notes: notes.trim() || null,
          },
        })}>Enregistrer</Bouton>
      </>}>
      <div className="flex flex-col gap-4">
        <Choix libelle="Mode" colonnes={2} valeur={mode} onChange={(v) => v && setMode(v)} options={[{ valeur: "conteneur", libelle: "Conteneur" }, { valeur: "roro", libelle: "RoRo" }]} />
        <Champ libelle="Référence" facultatif mono value={reference} onChange={(e) => setReference(e.target.value)} aide="Laissez vide pour une référence automatique." />
        {mode === "conteneur" && <Champ libelle="Numéro de conteneur" facultatif mono value={numeroConteneur} onChange={(e) => setNumeroConteneur(e.target.value.toUpperCase())} placeholder="MSCU4471203" />}
        <Champ libelle="Numéro de connaissement (BL)" facultatif mono value={numeroBl} onChange={(e) => setNumeroBl(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Selection libelle="Compagnie" facultatif vide="Choisir…" value={compagnie} onChange={(e) => setCompagnie(e.target.value)}
            options={compagnies.length ? compagnies.map((c) => ({ valeur: c.libelle, libelle: c.libelle })) : [{ valeur: "MSC", libelle: "MSC" }, { valeur: "Maersk", libelle: "Maersk" }, { valeur: "CMA CGM", libelle: "CMA CGM" }, { valeur: "Grimaldi", libelle: "Grimaldi" }]} />
          <Champ libelle="Navire" facultatif value={navire} onChange={(e) => setNavire(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Selection libelle="Port de départ" facultatif vide="Choisir…" value={portDepart} onChange={(e) => setPortDepart(e.target.value)}
            options={ports.filter((p) => p.type === "port_depart").map((p) => ({ valeur: p.libelle, libelle: p.libelle }))} />
          <Selection libelle="Port d'arrivée" facultatif vide="Choisir…" value={portArrivee} onChange={(e) => setPortArrivee(e.target.value)}
            options={ports.filter((p) => p.type === "port_arrivee").map((p) => ({ valeur: p.libelle, libelle: p.libelle }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Champ libelle="Date de départ" facultatif type="date" value={dateDepart} onChange={(e) => setDateDepart(e.target.value)} />
          <Champ libelle="Arrivée prévue" facultatif type="date" value={dateArriveePrevue} onChange={(e) => setDateArriveePrevue(e.target.value)} />
        </div>
        <ZoneTexte libelle="Notes" facultatif value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </Feuille>
  );
}
