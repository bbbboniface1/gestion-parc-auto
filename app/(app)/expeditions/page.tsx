"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Anchor, Boat, Package, Plus, Timer } from "@phosphor-icons/react";
import { useLecture } from "@/lib/api/requetes";
import { useOrg } from "@/lib/session";
import type { ExpeditionListe } from "@/lib/api/types-metier";
import { peut } from "@/lib/domaine";
import { formatCourt, pluriel } from "@/lib/format";
import { decalage } from "@/lib/animation";
import { EnTetePage } from "@/components/coque/coque";
import { Bouton } from "@/components/ui/bouton";
import { Indicateur, Puces } from "@/components/ui/recherche";
import { EtatErreur, EtatVide, SqueletteListe } from "@/components/ui/etats";
import { PhotoVehicule } from "@/components/metier/photo-vehicule";
import { FeuilleExpedition } from "@/components/expeditions/feuille-expedition";
import { RouteMaritime, STATUTS_EXPEDITION } from "@/components/expeditions/route-maritime";

type Statut = ExpeditionListe["statut"];

function CarteExpedition({ e, index }: { e: ExpeditionListe; index: number }) {
  const st = STATUTS_EXPEDITION[e.statut];
  const photos = e.vehicules.slice(0, 4);
  return (
    <li className="apparition" style={decalage(Math.min(index, 10), 50)}>
      <Link href={`/expeditions/fiche/?id=${e.id}`} className="carte carte-lien group flex h-full flex-col gap-4 p-4 lg:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[18px] font-extrabold group-hover:text-primaire">{e.reference}</span>
              <span className="inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-bold"
                style={{ background: `color-mix(in srgb, ${st.couleur} 13%, var(--surface))`, color: `color-mix(in srgb, ${st.couleur} 62%, var(--pole-texte))` }}>
                <span className="size-1.5 rounded-full" style={{ background: st.couleur }} />{st.libelle}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[13px] text-encre-3">
              {[e.mode === "conteneur" ? "Conteneur" : "RoRo", e.compagnie, e.navire].filter(Boolean).join(" · ")}
              {e.numero_conteneur && <span className="font-mono"> · {e.numero_conteneur}</span>}
            </p>
          </div>
          {e.frais_xof !== null && (
            <span className="shrink-0 text-right">
              <span className="block text-[11px] text-encre-3">frais communs</span>
              <span className="chiffres font-extrabold">{formatCourt(e.frais_xof)}</span>
            </span>
          )}
        </div>
        <RouteMaritime v={e} />
        <div className="mt-auto flex items-center gap-3">
          <div className="flex -space-x-3">
            {photos.map((v) => (
              <PhotoVehicule key={v.id} path={v.photo_principale_path} alt="" className="size-10 rounded-full ring-2 ring-surface" />
            ))}
          </div>
          <span className="text-[13px] font-semibold text-encre-2">{pluriel(e.nb_vehicules, "véhicule")} à bord</span>
        </div>
      </Link>
    </li>
  );
}

export default function PageExpeditions() {
  const org = useOrg();
  const peutCreer = peut(org.role, "modifierVehicule");
  const { data, error, isPending, refetch } = useLecture<ExpeditionListe[]>("expeditions_lister", { p_org: org.id, p_filtres: {} });
  const [nouvelle, setNouvelle] = useState(false);
  const [filtre, setFiltre] = useState<"toutes" | Statut>("toutes");

  const toutes = useMemo(() => data ?? [], [data]);
  const visibles = filtre === "toutes" ? toutes : toutes.filter((e) => e.statut === filtre);
  const enMer = toutes.filter((e) => e.statut === "en_mer");
  const prochaine = enMer.filter((e) => e.jours_avant_arrivee !== null).sort((a, b) => (a.jours_avant_arrivee ?? 0) - (b.jours_avant_arrivee ?? 0))[0];

  return (
    <>
      <EnTetePage titre="Expéditions" sousTitre="Conteneurs et navires : ce qui traverse, ce qui arrive."
        actions={peutCreer ? <Bouton variante="primaire" icone={<Plus size={18} weight="bold" />} onClick={() => setNouvelle(true)}>Nouvelle expédition</Bouton> : undefined} />

      {data && (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Indicateur index={0} libelle="En mer" valeur={enMer.length} format={(x) => String(Math.round(x))} precision={pluriel(enMer.reduce((s, e) => s + e.nb_vehicules, 0), "véhicule")} icone={Boat} couleur="var(--etape-en-mer)" />
          <Indicateur index={1} libelle="Prochaine arrivée" valeur={prochaine?.jours_avant_arrivee ?? 0} format={(x) => (prochaine ? `${Math.round(x)} j` : "—")} precision={prochaine ? `${prochaine.reference} · ${prochaine.port_arrivee ?? ""}` : "aucune en mer"} icone={Timer} couleur="var(--accent)" />
          <Indicateur index={2} libelle="Au port" valeur={toutes.filter((e) => e.statut === "arrivee").length} format={(x) => String(Math.round(x))} precision="à dédouaner" icone={Anchor} couleur="var(--etape-au-port)" />
          <Indicateur index={3} libelle="Frais communs" valeur={toutes.reduce((s, e) => s + (e.frais_xof ?? 0), 0)} format={formatCourt} precision="FCFA, toutes expéditions" icone={Package} couleur="var(--etape-achete)" />
        </div>
      )}

      {data && data.length > 0 && (
        <Puces className="mb-4" valeur={filtre} onChange={setFiltre} libelle="Filtrer les expéditions" options={[
          { valeur: "toutes", libelle: "Toutes", nombre: toutes.length },
          ...(Object.keys(STATUTS_EXPEDITION) as Statut[]).map((s) => ({ valeur: s, libelle: STATUTS_EXPEDITION[s].libelle, nombre: toutes.filter((e) => e.statut === s).length, couleur: STATUTS_EXPEDITION[s].couleur })),
        ]} />
      )}

      {error && !data ? <EtatErreur erreur={error} onReessayer={() => void refetch()} /> : isPending ? <SqueletteListe /> : !visibles.length ? (
        <EtatVide titre="Aucune expédition" texte="Groupez vos véhicules par conteneur pour partager les frais de fret et suivre l'arrivée." />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {visibles.map((e, i) => <CarteExpedition key={e.id} e={e} index={i} />)}
        </ul>
      )}

      <FeuilleExpedition ouverte={nouvelle} onFermer={() => setNouvelle(false)} />
    </>
  );
}
