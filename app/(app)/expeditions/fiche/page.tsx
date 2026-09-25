"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Pencil, Plus, Ship, Users } from "lucide-react";
import { useEcriture, useLecture } from "@/lib/api/requetes";
import { useOrg } from "@/lib/session";
import type { ExpeditionDetail } from "@/lib/api/types-metier";
import { libelleCategorie, peut } from "@/lib/domaine";
import { aujourdhui, formatDate } from "@/lib/format";
import { urlSuiviConteneur } from "@/lib/suivi-conteneur";
import { cn } from "@/lib/cn";
import { PhotoVehicule } from "@/components/metier/photo-vehicule";
import { FeuilleFrais } from "@/components/metier/feuille-frais";
import { FeuilleExpedition } from "@/components/expeditions/feuille-expedition";
import { FeuilleAffecter } from "@/components/expeditions/feuille-affecter";
import { Bouton, BoutonIcone } from "@/components/ui/bouton";
import { EtatErreur, Squelette } from "@/components/ui/etats";
import { EtiquetteEtape, Montant } from "@/components/ui/signature";

const LIBELLES: Record<string, string> = { preparation: "Préparation", en_mer: "En mer", arrivee: "Arrivée", cloturee: "Clôturée" };

function Fiche() {
  const id = useSearchParams().get("id") ?? "";
  const org = useOrg();
  const peutGerer = peut(org.role, "modifierVehicule");
  const { data: e, error, isPending, refetch } = useLecture<ExpeditionDetail>("expedition_obtenir", { p_org: org.id, p_id: id }, { enabled: !!id });
  const [feuille, setFeuille] = useState<null | "modifier" | "affecter" | "frais">(null);

  const changerStatut = useEcriture<{ vehicules_mis_a_jour: number }>("expedition_changer_statut", {
    onSuccess: (r) => toast.success(r?.vehicules_mis_a_jour ? `${r.vehicules_mis_a_jour} véhicule(s) mis à jour` : "Statut mis à jour"),
    onError: (err) => toast.error(err.message),
  });

  if (!id) return <EtatErreur erreur={new Error("Aucune expédition indiquée.")} />;
  if (error && !e) return <EtatErreur erreur={error} onReessayer={() => void refetch()} />;
  if (isPending || !e) return <div className="flex flex-col gap-4"><Squelette className="h-40 rounded-carte" /><Squelette className="h-64 rounded-carte" /></div>;

  const lienSuivi = urlSuiviConteneur(e.compagnie, e.numero_conteneur);
  const voitCouts = e.frais !== null;

  return (
    <div>
      <Link href="/expeditions/" className="mb-2 inline-flex h-10 items-center gap-1.5 text-[14px] text-encre-2 hover:text-encre"><ArrowLeft className="size-4" aria-hidden /> Expéditions</Link>

      <section className="relative overflow-hidden rounded-carte bg-nuit text-sur-nuit">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between lg:p-6">
          <div className="min-w-0">
            <p className="etiquette text-[12px] text-sur-nuit-2">{e.mode === "conteneur" ? "CONTENEUR" : "RORO"} · {LIBELLES[e.statut]}</p>
            <h1 className="mt-1 text-[24px] leading-tight font-semibold tracking-tight lg:text-[28px]">{e.reference}</h1>
            <p className="mt-1 text-sur-nuit-2">{[e.compagnie, e.navire].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {peutGerer && <BoutonIcone libelle="Modifier" surNuit onClick={() => setFeuille("modifier")}><Pencil className="size-4" /></BoutonIcone>}
          </div>
        </div>
        <div aria-hidden className="relative h-5">
          <span className="absolute top-1/2 -left-2.5 size-5 -translate-y-1/2 rounded-full bg-papier" />
          <span className="absolute top-1/2 -right-2.5 size-5 -translate-y-1/2 rounded-full bg-papier" />
          <span className="absolute top-1/2 right-4 left-4 border-t-2 border-dashed border-white/20" />
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 pt-1 pb-4 sm:grid-cols-3 lg:grid-cols-5 lg:px-6 lg:pb-6">
          {[
            ["Conteneur", e.numero_conteneur], ["Connaissement", e.numero_bl],
            ["Ports", [e.port_depart, e.port_arrivee].filter(Boolean).join(" → ") || null],
            ["Départ", e.date_depart ? formatDate(e.date_depart) : null],
            ["Arrivée", e.date_arrivee_reelle ? formatDate(e.date_arrivee_reelle) : e.date_arrivee_prevue ? `${formatDate(e.date_arrivee_prevue)} (prévue)` : null],
          ].map(([libelle, valeur]) => valeur ? (
            <div key={libelle} className="min-w-0">
              <dt className="etiquette text-[11px] text-sur-nuit-2">{libelle}</dt>
              <dd className="mt-0.5 truncate font-mono text-[13px] font-medium">{valeur}</dd>
            </div>
          ) : null)}
        </dl>
      </section>

      <div className="mt-4 flex flex-wrap gap-2">
        {peutGerer && lienSuivi && (
          <a href={lienSuivi} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-1.5 rounded-controle border border-trait-fort bg-surface px-3 text-[14px]">
            <ExternalLink className="size-4" aria-hidden /> Suivre le conteneur
          </a>
        )}
        {peutGerer && e.statut === "preparation" && (
          <Bouton icone={<Ship className="size-4" />} chargement={changerStatut.isPending} onClick={() => changerStatut.executer({ p_org: org.id, p_id: e.id, p_statut: "en_mer", p_date: aujourdhui() })}>Embarqué</Bouton>
        )}
        {peutGerer && e.statut === "en_mer" && (
          <Bouton icone={<Ship className="size-4" />} chargement={changerStatut.isPending} onClick={() => changerStatut.executer({ p_org: org.id, p_id: e.id, p_statut: "arrivee", p_date: aujourdhui() })}>Arrivé au port</Bouton>
        )}
        {peutGerer && e.statut === "arrivee" && (
          <Bouton variante="secondaire" chargement={changerStatut.isPending} onClick={() => changerStatut.executer({ p_org: org.id, p_id: e.id, p_statut: "cloturee" })}>Clôturer</Bouton>
        )}
        {peutGerer && e.statut !== "cloturee" && (
          <Bouton variante="fantome" icone={<Users className="size-4" />} onClick={() => setFeuille("affecter")}>Affecter des véhicules</Bouton>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12 lg:gap-5">
        <div className="lg:col-span-7">
          <section className="overflow-hidden carte">
            <h2 className="etiquette border-b border-trait px-4 py-2.5 text-[12px] text-encre-3 lg:px-5">Véhicules · {e.nb_vehicules}</h2>
            {e.vehicules.length === 0 ? <p className="px-4 py-4 text-encre-3 lg:px-5">Aucun véhicule affecté.</p> : e.vehicules.map((v) => (
              <Link key={v.id} href={`/parc/vehicule/?id=${v.id}`} className="flex items-center gap-3 border-b border-trait px-4 py-3 last:border-b-0 hover:bg-surface-2/50 lg:px-5">
                <PhotoVehicule path={v.photo_principale_path} alt="" className="size-12 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{v.libelle}</p>
                  <p className="truncate font-mono text-[12px] text-encre-3">{v.reference}{v.vin ? ` · …${v.vin.slice(-6)}` : ""}</p>
                </div>
                <EtiquetteEtape etape={v.etape} compacte />
                {voitCouts && v.part_frais_xof !== undefined && v.part_frais_xof !== null && <Montant valeur={v.part_frais_xof} devise={null} />}
              </Link>
            ))}
          </section>
        </div>

        {voitCouts && (
          <div className="lg:col-span-5">
            <section className="carte p-4 lg:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="etiquette text-[12px] text-encre-3">Frais communs · {e.total_frais_xof?.toLocaleString("fr-FR")} FCFA</h2>
                {peutGerer && <Bouton variante="fantome" taille="sm" icone={<Plus className="size-4" />} onClick={() => setFeuille("frais")}>Ajouter</Bouton>}
              </div>
              {!e.frais || e.frais.length === 0 ? <p className="text-encre-3">Aucun frais commun saisi.</p> : (
                <ul className="flex flex-col">
                  {e.frais.map((f) => (
                    <li key={f.id} className="border-b border-trait py-2.5 last:border-b-0">
                      <div className="flex items-center justify-between gap-2">
                        <span>{libelleCategorie(f.categorie)}{f.statut === "a_payer" && <span className="etiquette ml-2 text-[11px] text-ocre-texte">à payer</span>}</span>
                        <Montant valeur={f.montant_xof} devise={null} />
                      </div>
                      <p className={cn("mt-0.5 text-[12px] text-encre-3")}>{formatDate(f.date)}{f.fournisseur ? ` · ${f.fournisseur}` : ""} · réparti sur {f.parts.length} véhicule(s)</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>

      <FeuilleExpedition ouverte={feuille === "modifier"} onFermer={() => setFeuille(null)} expedition={e} />
      <FeuilleAffecter ouverte={feuille === "affecter"} onFermer={() => setFeuille(null)} expeditionId={e.id} actuels={e.vehicules.map((v) => v.id)} />
      <FeuilleFrais ouverte={feuille === "frais"} onFermer={() => setFeuille(null)} expeditionId={e.id} />
    </div>
  );
}

export default function PageFicheExpedition() {
  return (
    <Suspense>
      <Fiche />
    </Suspense>
  );
}
