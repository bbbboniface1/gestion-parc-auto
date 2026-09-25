"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Anchor, ArrowSquareOut, Boat, CarProfile, CheckCircle, CurrencyCircleDollar, PencilSimple, Plus, SealCheck } from "@phosphor-icons/react";
import { useEcriture, useLecture } from "@/lib/api/requetes";
import { useOrg } from "@/lib/session";
import type { ExpeditionDetail } from "@/lib/api/types-metier";
import { libelleCategorie, peut } from "@/lib/domaine";
import { aujourdhui, formatCourt, formatDate, pluriel } from "@/lib/format";
import { urlSuiviConteneur } from "@/lib/suivi-conteneur";
import { decalage } from "@/lib/animation";
import { celebrer } from "@/lib/celebration";
import { useCompteursNavigation } from "@/lib/compteurs";
import { PhotoVehicule } from "@/components/metier/photo-vehicule";
import { FeuilleFrais } from "@/components/metier/feuille-frais";
import { FeuilleExpedition } from "@/components/expeditions/feuille-expedition";
import { FeuilleAffecter } from "@/components/expeditions/feuille-affecter";
import { RouteMaritime, STATUTS_EXPEDITION } from "@/components/expeditions/route-maritime";
import { Bouton } from "@/components/ui/bouton";
import { FilAriane } from "@/components/ui/fil-ariane";
import { PanneauActions, type ActionVisible } from "@/components/ui/panneau-actions";
import { EtatErreur, Squelette } from "@/components/ui/etats";
import { EtiquetteEtape, Montant } from "@/components/ui/signature";

function Fiche() {
  const id = useSearchParams().get("id") ?? "";
  const org = useOrg();
  const peutGerer = peut(org.role, "modifierVehicule");
  const compteurs = useCompteursNavigation();
  const { data: e, error, isPending, refetch } = useLecture<ExpeditionDetail>("expedition_obtenir", { p_org: org.id, p_id: id }, { enabled: !!id });
  const [feuille, setFeuille] = useState<null | "modifier" | "affecter" | "frais">(null);

  const changerStatut = useEcriture<{ vehicules_mis_a_jour: number }>("expedition_changer_statut", {
    onSuccess: (r, p) => {
      const statut = (p as { p_statut?: string }).p_statut;
      const n = r?.vehicules_mis_a_jour ?? 0;
      if (statut === "en_mer") celebrer({ type: "etape", titre: "Le conteneur a embarqué", detail: n ? `${pluriel(n, "véhicule")} passent « En mer ».` : undefined, couleur: "var(--etape-en-mer)" });
      else if (statut === "arrivee") celebrer({ type: "etape", titre: "Arrivé au port !", detail: n ? `${pluriel(n, "véhicule")} passent « Au port ».` : undefined, couleur: "var(--etape-au-port)" });
      else toast.success("Expédition clôturée");
    },
    onError: (err) => toast.error(err.message),
  });

  if (!id) return <EtatErreur erreur={new Error("Aucune expédition indiquée.")} />;
  if (error && !e) return <EtatErreur erreur={error} onReessayer={() => void refetch()} />;
  if (isPending || !e) return <div className="flex flex-col gap-4"><Squelette className="h-56 rounded-[22px]" /><Squelette className="h-64 rounded-[22px]" /></div>;

  const lienSuivi = urlSuiviConteneur(e.compagnie, e.numero_conteneur);
  const voitCouts = e.frais !== null;
  const st = STATUTS_EXPEDITION[e.statut];

  const actions: ActionVisible[] = [
    { cle: "embarque", titre: "Marquer comme embarqué", detail: `Les ${pluriel(e.nb_vehicules, "véhicule")} passent « En mer »`, icone: Boat, couleur: "var(--etape-en-mer)", principale: true, onClick: () => changerStatut.executerAsync({ p_org: org.id, p_id: e.id, p_statut: "en_mer", p_date: aujourdhui() }), masque: !peutGerer || e.statut !== "preparation" },
    { cle: "arrive", titre: `Arrivé à ${e.port_arrivee ?? "destination"}`, detail: "Les véhicules passent « Au port », daté d'aujourd'hui", icone: Anchor, couleur: "var(--etape-au-port)", principale: true, onClick: () => changerStatut.executerAsync({ p_org: org.id, p_id: e.id, p_statut: "arrivee", p_date: aujourdhui() }), masque: !peutGerer || e.statut !== "en_mer" },
    { cle: "suivre", titre: `Suivre sur le site ${e.compagnie ?? "de la compagnie"}`, detail: e.numero_conteneur ? `Conteneur ${e.numero_conteneur}` : undefined, icone: ArrowSquareOut, couleur: "var(--acier)", onClick: () => { if (lienSuivi) window.open(lienSuivi, "_blank", "noopener"); }, masque: !lienSuivi },
    { cle: "affecter", titre: "Choisir les véhicules à bord", detail: `${pluriel(e.nb_vehicules, "véhicule")} affecté${e.nb_vehicules > 1 ? "s" : ""}`, icone: CarProfile, couleur: "var(--etape-achete)", onClick: () => setFeuille("affecter"), masque: !peutGerer || e.statut === "cloturee" },
    { cle: "frais", titre: "Ajouter un frais commun", detail: "Fret, manutention : réparti entre les véhicules", icone: CurrencyCircleDollar, couleur: "var(--accent)", onClick: () => setFeuille("frais"), masque: !peutGerer || !voitCouts },
    { cle: "cloturer", titre: "Clôturer l'expédition", detail: "Tout est dédouané, plus rien à suivre", icone: SealCheck, couleur: "var(--gain)", onClick: () => changerStatut.executerAsync({ p_org: org.id, p_id: e.id, p_statut: "cloturee" }), masque: !peutGerer || e.statut !== "arrivee" },
    { cle: "modifier", titre: "Modifier l'expédition", detail: "Navire, dates, numéro de conteneur, BL", icone: PencilSimple, couleur: "var(--primaire)", onClick: () => setFeuille("modifier"), masque: !peutGerer },
  ];

  return (
    <div>
      <FilAriane retour={{ href: "/expeditions/", libelle: "Expéditions", icone: Boat, couleur: "var(--etape-en-mer)", detail: compteurs.expeditions?.sens }} etapes={[e.reference]} />

      <section className="apparition relative overflow-hidden rounded-[22px] bg-[radial-gradient(120%_140%_at_100%_0%,#0ea5e9_0%,#16275a_50%,#0b1633_100%)] p-5 text-white shadow-[0_24px_48px_-20px_rgb(11_22_51/0.7)] lg:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="etiquette text-[11px] text-white/70">{e.mode === "conteneur" ? "Conteneur" : "RoRo"}{e.numero_conteneur ? ` · ${e.numero_conteneur}` : ""}</p>
            <h1 className="mt-1 text-[28px] leading-tight font-extrabold tracking-tight lg:text-[34px]">{e.reference}</h1>
            <p className="mt-1 text-white/80">{[e.compagnie, e.navire].filter(Boolean).join(" · ") || "Compagnie à préciser"}</p>
          </div>
          <span className="inline-flex h-8 items-center gap-2 rounded-full bg-white/12 px-3.5 text-[13px] font-bold ring-1 ring-white/20">
            <span className="size-2 rounded-full" style={{ background: st.couleur, boxShadow: `0 0 10px ${st.couleur}` }} />{st.libelle}
          </span>
        </div>
        <RouteMaritime v={e} sombre className="mt-6" />
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Connaissement (BL)", e.numero_bl],
            ["Départ", e.date_depart ? formatDate(e.date_depart) : null],
            ["Arrivée", e.date_arrivee_reelle ? formatDate(e.date_arrivee_reelle) : e.date_arrivee_prevue ? `${formatDate(e.date_arrivee_prevue)} (prévue)` : null],
            ["À bord", pluriel(e.nb_vehicules, "véhicule")],
          ].map(([libelle, valeur]) => (
            <div key={libelle} className="rounded-xl bg-white/[0.07] px-3 py-2 ring-1 ring-white/10">
              <dt className="text-[11px] font-semibold text-white/65">{libelle}</dt>
              <dd className="mt-0.5 truncate font-mono text-[13px] font-semibold">{valeur ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-12 lg:gap-6">
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-7 xl:col-span-8">
          <PanneauActions titre="Que voulez-vous faire ?" actions={actions} />

          <section className="carte apparition p-4 lg:p-5" aria-labelledby="titre-bord">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 id="titre-bord" className="text-[17px] font-bold">À bord · {e.nb_vehicules}</h2>
              {peutGerer && e.statut !== "cloturee" && <Bouton taille="sm" variante="secondaire" icone={<Plus size={16} weight="bold" />} onClick={() => setFeuille("affecter")}>Ajouter un véhicule</Bouton>}
            </div>
            {e.vehicules.length === 0 ? <p className="py-2 text-encre-3">Aucun véhicule à bord pour l&apos;instant.</p> : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {e.vehicules.map((v, i) => (
                  <li key={v.id} className="apparition" style={decalage(i, 50)}>
                    <Link href={`/parc/vehicule/?id=${v.id}`} className="carte carte-lien group flex items-center gap-3 overflow-hidden p-2">
                      <PhotoVehicule path={v.photo_principale_path} alt="" className="aspect-[4/3] w-24 shrink-0 rounded-xl" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold group-hover:text-primaire">{v.libelle}</p>
                        <p className="truncate font-mono text-[12px] text-encre-3">{v.reference}{v.vin ? ` · …${v.vin.slice(-6)}` : ""}</p>
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <EtiquetteEtape etape={v.etape} compacte />
                          {voitCouts && v.part_frais_xof != null && <span className="chiffres text-[12px] font-bold text-encre-2" title="Part des frais communs">+{formatCourt(v.part_frais_xof)}</span>}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {voitCouts && (
          <aside className="min-w-0 lg:col-span-5 xl:col-span-4">
            <section className="carte apparition p-4 lg:p-5">
              <h2 className="text-[17px] font-bold">Frais communs</h2>
              <p className="text-[13px] text-encre-3">Répartis entre les véhicules à bord</p>
              <p className="chiffres mt-2 text-[28px] leading-tight font-extrabold tracking-tight">{formatCourt(e.total_frais_xof ?? 0)} <span className="text-[14px] font-semibold text-encre-3">FCFA</span></p>
              {!e.frais || e.frais.length === 0 ? <p className="mt-3 text-encre-3">Aucun frais commun saisi.</p> : (
                <ul className="mt-3 flex flex-col gap-2">
                  {e.frais.map((f) => (
                    <li key={f.id} className="rounded-xl bg-surface-2 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{libelleCategorie(f.categorie)}</span>
                        <Montant valeur={f.montant_xof} devise={null} />
                      </div>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-encre-3">
                        {f.statut === "a_payer" ? <span className="font-bold text-ocre-texte">à payer</span> : <CheckCircle size={13} weight="fill" className="text-gain" aria-label="payé" />}
                        {formatDate(f.date)}{f.fournisseur ? ` · ${f.fournisseur}` : ""} · {pluriel(f.parts.length, "véhicule")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
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
