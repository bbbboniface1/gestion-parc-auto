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
import { Section } from "@/components/ui/section";
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
  if (isPending || !e) return <div className="flex flex-col gap-4"><Squelette className="h-40" /><Squelette className="h-64" /></div>;

  const lienSuivi = urlSuiviConteneur(e.compagnie, e.numero_conteneur);
  const voitCouts = e.frais !== null;

  return (
    <div>
      <Link href="/expeditions/" className="mb-2 inline-flex h-10 items-center gap-1.5 text-corps text-encre-2 hover:text-encre"><ArrowLeft className="size-4" aria-hidden /> Expéditions</Link>

      <section aria-label="Identité de l'expédition">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="etiquette text-petit text-encre-3">{e.mode === "conteneur" ? "Conteneur" : "RoRo"}</p>
            <h1 className="text-titre font-semibold">{e.reference}</h1>
            <p className="mt-1 text-encre-2">{[e.compagnie, e.navire].filter(Boolean).join(" · ")}</p>
          </div>
          {peutGerer && <BoutonIcone libelle="Modifier" onClick={() => setFeuille("modifier")}><Pencil className="size-4" /></BoutonIcone>}
        </div>
        <ol className="mt-4 grid grid-cols-4 gap-[3px]" aria-label="Avancement de l'expédition">
          {(["preparation", "en_mer", "arrivee", "cloturee"] as const).map((st, i, tous) => {
            const cur = tous.indexOf(e.statut as (typeof tous)[number]);
            return (
              <li key={st} aria-current={i === cur ? "step" : undefined}>
                <span aria-hidden className={cn("block", i === cur ? "h-[14px] outline-[1.5px] outline-encre" : "h-[6px]")}
                  style={{ background: i < cur ? "var(--encre)" : i === cur ? "var(--signal)" : "var(--trait)" }} />
                <span className={cn("etiquette mt-1 block text-petit", i === cur ? "text-encre" : "text-encre-3")}>{LIBELLES[st]}</span>
              </li>
            );
          })}
        </ol>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 sm:grid-cols-3 lg:grid-cols-5">
          {[
            ["Conteneur", e.numero_conteneur], ["Connaissement", e.numero_bl],
            ["Ports", [e.port_depart, e.port_arrivee].filter(Boolean).join(" → ") || null],
            ["Départ", e.date_depart ? formatDate(e.date_depart) : null],
            ["Arrivée", e.date_arrivee_reelle ? formatDate(e.date_arrivee_reelle) : e.date_arrivee_prevue ? `${formatDate(e.date_arrivee_prevue)} (prévue)` : null],
          ].map(([libelle, valeur]) => valeur ? (
            <div key={libelle} className="min-w-0 border-t border-trait py-2">
              <dt className="etiquette text-petit text-encre-3">{libelle}</dt>
              <dd className="truncate font-mono text-petit font-medium">{valeur}</dd>
            </div>
          ) : null)}
        </dl>
      </section>

      <div className="mt-4 flex flex-wrap gap-2">
        {peutGerer && lienSuivi && (
          <a href={lienSuivi} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-1.5 rounded-controle bg-surface-2 px-3 hover:bg-trait">
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

      <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:gap-x-10">
        <div className="min-w-0 lg:col-span-7">
          <Section titre="Véhicules" compteur={e.nb_vehicules}>
            {e.vehicules.length === 0 ? <p className="py-3 text-encre-3">Aucun véhicule affecté.</p> : e.vehicules.map((v) => (
              <Link key={v.id} href={`/parc/vehicule/?id=${v.id}`} className="flex items-center gap-3 border-b border-trait py-3 last:border-b-0 hover:bg-surface-2">
                <PhotoVehicule path={v.photo_principale_path} alt="" className="aspect-[4/3] w-20 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{v.libelle}</p>
                  <p className="truncate font-mono text-petit text-encre-3">{v.reference}{v.vin ? ` · …${v.vin.slice(-6)}` : ""}</p>
                </div>
                <EtiquetteEtape etape={v.etape} />
                {voitCouts && v.part_frais_xof !== undefined && v.part_frais_xof !== null && <Montant valeur={v.part_frais_xof} devise={null} />}
              </Link>
            ))}
          </Section>
        </div>

        {voitCouts && (
          <div className="min-w-0 lg:col-span-5">
            <section className="border-t-2 border-encre pt-3">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="etiquette text-petit text-encre-3">Frais communs · {e.total_frais_xof?.toLocaleString("fr-FR")} FCFA</h2>
                {peutGerer && <Bouton variante="fantome" taille="sm" icone={<Plus className="size-4" />} onClick={() => setFeuille("frais")}>Ajouter</Bouton>}
              </div>
              {!e.frais || e.frais.length === 0 ? <p className="text-encre-3">Aucun frais commun saisi.</p> : (
                <ul className="flex flex-col">
                  {e.frais.map((f) => (
                    <li key={f.id} className="border-b border-trait py-2.5 last:border-b-0">
                      <div className="flex items-center justify-between gap-2">
                        <span>{libelleCategorie(f.categorie)}{f.statut === "a_payer" && <span className="etiquette ml-2 text-petit text-ocre">à payer</span>}</span>
                        <Montant valeur={f.montant_xof} devise={null} />
                      </div>
                      <p className={cn("mt-0.5 text-petit text-encre-3")}>{formatDate(f.date)}{f.fournisseur ? ` · ${f.fournisseur}` : ""} · réparti sur {f.parts.length} véhicule(s)</p>
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
