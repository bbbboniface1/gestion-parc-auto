"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Anchor, Plus, Timer } from "@phosphor-icons/react";
import { useLecture } from "@/lib/api/requetes";
import { useOrg } from "@/lib/session";
import type { ExpeditionListe } from "@/lib/api/types-metier";
import { peut } from "@/lib/domaine";
import { formatCourt, pluriel } from "@/lib/format";
import { decalage } from "@/lib/animation";
import { EnTetePage } from "@/components/coque/coque";
import { Bouton } from "@/components/ui/bouton";
import { Puces } from "@/components/ui/recherche";
import { TuileIndicateur } from "@/components/metier/tableau-bord";
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
      <Link href={`/expeditions/fiche/?id=${e.id}`} className="carte carte-lien group flex h-full flex-col gap-4 p-4 lg:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[18px] font-extrabold group-hover:text-primaire">{e.reference}</span>
              {/* La couleur dit l'état du conteneur (préparation, en mer, au port, clôturé). */}
              <span className="inline-flex h-6 items-center gap-1 rounded-full px-2 text-[12px] font-bold"
                style={{ background: `color-mix(in srgb, ${st.couleur} 13%, var(--surface))`, color: `color-mix(in srgb, ${st.couleur} 62%, var(--pole-texte))` }}>
                <span className="size-2 rounded-full" style={{ background: st.couleur }} />{st.libelle}
              </span>
            </div>
            <p className="mt-1 truncate text-[14px] text-encre-3">
              {[e.mode === "conteneur" ? "Conteneur" : "RoRo", e.compagnie, e.navire].filter(Boolean).join(" · ")}
              {e.numero_conteneur && <span className="font-mono"> · {e.numero_conteneur}</span>}
            </p>
          </div>
          {e.frais_xof !== null && (
            <span className="shrink-0 text-right">
              <span className="block text-[12px] text-encre-3">frais communs</span>
              <span className="chiffres block text-[16px] font-extrabold">{formatCourt(e.frais_xof)}</span>
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
          <span className="text-[14px] font-semibold text-encre-2">{pluriel(e.nb_vehicules, "véhicule")} à bord</span>
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

      {/*
        Deux niveaux (docs/CONVENTIONS_FRONT.md, « Mesures et hiérarchie ») :
         1. premier plan — ce qui appelle une action : la prochaine arrivée à préparer, les conteneurs au port à dédouaner ;
         2. second plan, plus calme — ce qui traverse (en mer) et le total des frais communs, puis la liste.
      */}
      <div className="flex flex-col gap-6 lg:gap-8">
        {data && (
          <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
            <div className="grid min-w-0 grid-cols-2 gap-4 lg:col-span-7 lg:gap-6">
              <TuileIndicateur index={0} libelle="Prochaine arrivée" valeur={prochaine?.jours_avant_arrivee ?? 0} format={(x) => (prochaine ? `${Math.round(x)} j` : "—")}
                complement={prochaine ? `${prochaine.reference} · ${prochaine.port_arrivee ?? ""}` : "aucune en mer"} couleur="var(--accent)" icone={<Timer className="size-5" />} />
              <TuileIndicateur index={1} libelle="Au port" valeur={toutes.filter((e) => e.statut === "arrivee").length} format={(x) => String(Math.round(x))}
                complement="à dédouaner" couleur="var(--etape-au-port)" icone={<Anchor className="size-5" />} />
            </div>
            <div className="carte apparition grid min-w-0 grid-cols-2 content-center gap-4 p-4 lg:col-span-5 lg:p-6" style={decalage(2, 60)}>
              {[
                { libelle: "En mer", valeur: String(enMer.length), precision: pluriel(enMer.reduce((s, e) => s + e.nb_vehicules, 0), "véhicule") },
                { libelle: "Frais communs", valeur: formatCourt(toutes.reduce((s, e) => s + (e.frais_xof ?? 0), 0)), precision: "FCFA, toutes expéditions" },
              ].map((m) => (
                <div key={m.libelle} className="min-w-0">
                  <span className="block truncate text-[14px] text-encre-3">{m.libelle}</span>
                  <span className="chiffres mt-1 block truncate text-[24px] leading-tight font-bold text-encre">{m.valeur}</span>
                  <span className="mt-1 block truncate text-[12px] text-encre-3">{m.precision}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {data && data.length > 0 && (
            <Puces valeur={filtre} onChange={setFiltre} libelle="Filtrer les expéditions" options={[
              { valeur: "toutes", libelle: "Toutes", nombre: toutes.length },
              ...(Object.keys(STATUTS_EXPEDITION) as Statut[]).map((s) => ({ valeur: s, libelle: STATUTS_EXPEDITION[s].libelle, nombre: toutes.filter((e) => e.statut === s).length, couleur: STATUTS_EXPEDITION[s].couleur })),
            ]} />
          )}

          {error && !data ? <EtatErreur erreur={error} onReessayer={() => void refetch()} /> : isPending ? <SqueletteListe /> : !visibles.length ? (
            <EtatVide titre="Aucune expédition" texte="Groupez vos véhicules par conteneur pour partager les frais de fret et suivre l'arrivée." />
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2 lg:gap-6">
              {visibles.map((e, i) => <CarteExpedition key={e.id} e={e} index={i} />)}
            </ul>
          )}
        </div>
      </div>

      <FeuilleExpedition ouverte={nouvelle} onFermer={() => setNouvelle(false)} />
    </>
  );
}
