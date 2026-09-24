"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, MessageCircle, Pencil, Phone, Plus } from "lucide-react";
import { useLecture } from "@/lib/api/requetes";
import { useOrg } from "@/lib/session";
import type { ClientDetail, Correspondance } from "@/lib/api/types-metier";
import { peut } from "@/lib/domaine";
import { formatDate, pluriel } from "@/lib/format";
import { lienWhatsApp } from "@/lib/whatsapp";
import { cn } from "@/lib/cn";
import { EnTetePage } from "@/components/coque/coque";
import { EtiquetteEtape, Montant } from "@/components/ui/signature";
import { Bouton, BoutonIcone } from "@/components/ui/bouton";
import { EtatErreur, Squelette } from "@/components/ui/etats";
import { FeuilleClient } from "@/components/clients/feuille-client";
import { FeuilleDemande } from "@/components/clients/feuille-demande";
import { PhotoVehicule } from "@/components/metier/photo-vehicule";

const LIBELLES_DEMANDE: Record<string, string> = { ouverte: "Ouverte", satisfaite: "Satisfaite", abandonnee: "Abandonnée" };

function Fiche() {
  const id = useSearchParams().get("id") ?? "";
  const org = useOrg();
  const peutModifier = peut(org.role, "vendre");
  const { data: c, error, isPending, refetch } = useLecture<ClientDetail>("client_obtenir", { p_org: org.id, p_id: id }, { enabled: !!id });
  const { data: correspondances } = useLecture<Correspondance[]>("demandes_correspondances", { p_org: org.id }, { enabled: !!c && c.demandes.some((d) => d.statut === "ouverte") });
  const [feuille, setFeuille] = useState<null | "modifier" | "demande">(null);

  if (!id) return <EtatErreur erreur={new Error("Aucun client indiqué.")} />;
  if (error && !c) return <EtatErreur erreur={error} onReessayer={() => void refetch()} />;
  if (isPending || !c) return <div className="flex flex-col gap-4"><Squelette className="h-32 rounded-carte" /><Squelette className="h-64 rounded-carte" /></div>;

  const nosDemandesId = new Set(c.demandes.map((d) => d.id));
  const nosCorrespondances = (correspondances ?? []).filter((co) => nosDemandesId.has(co.demande.id));

  return (
    <div>
      <Link href="/clients/" className="mb-2 inline-flex h-10 items-center gap-1.5 text-[14px] text-encre-2 hover:text-encre"><ArrowLeft className="size-4" aria-hidden /> Clients</Link>
      <EnTetePage titre={c.nom} sousTitre={c.ville ?? undefined}
        actions={
          <>
            {c.telephone && <a href={`tel:${c.telephone}`} className="inline-flex h-11 items-center gap-1.5 rounded-controle border border-trait-fort bg-surface px-3 text-[14px] lg:h-10"><Phone className="size-4" aria-hidden /> Appeler</a>}
            {c.telephone && <a href={lienWhatsApp(c.telephone, `Bonjour ${c.nom},`)} target="_blank" rel="noopener" className="inline-flex h-11 items-center gap-1.5 rounded-controle border border-trait-fort bg-surface px-3 text-[14px] lg:h-10"><MessageCircle className="size-4" aria-hidden /> WhatsApp</a>}
            {peutModifier && <BoutonIcone libelle="Modifier" onClick={() => setFeuille("modifier")}><Pencil className="size-4" /></BoutonIcone>}
          </>
        } />

      <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        <div className="flex flex-col gap-4 lg:col-span-8">
          <section className="rounded-carte border border-trait bg-surface">
            <h2 className="etiquette border-b border-trait px-4 py-2.5 text-[12px] text-encre-3 lg:px-5">Achats · {c.ventes.length}</h2>
            {c.ventes.length === 0 ? <p className="px-4 py-4 text-encre-3 lg:px-5">Aucun achat pour l&apos;instant.</p> : (
              <ul>
                {c.ventes.map((v) => (
                  <li key={v.id}>
                    <Link href={`/ventes/fiche/?id=${v.id}`} className="flex items-center gap-3 border-b border-trait px-4 py-3 last:border-b-0 hover:bg-surface-2/50 lg:px-5">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[13px] font-semibold">{v.numero}{v.statut === "annulee" ? " · annulée" : ""}</p>
                        <p className="truncate text-[14px]">{v.vehicule_libelle} · {formatDate(v.date_vente)}</p>
                      </div>
                      <Montant valeur={v.montant_ttc} devise={null} />
                      {v.reste_xof > 0 && <span className="chiffres text-[13px] text-ocre">reste {v.reste_xof.toLocaleString("fr-FR")}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-carte border border-trait bg-surface">
            <div className="flex items-center justify-between border-b border-trait px-4 py-2.5 lg:px-5">
              <h2 className="etiquette text-[12px] text-encre-3">Ce qu&apos;il cherche</h2>
              {peutModifier && <Bouton variante="fantome" taille="sm" icone={<Plus className="size-4" />} onClick={() => setFeuille("demande")}>Ajouter</Bouton>}
            </div>
            {c.demandes.length === 0 ? <p className="px-4 py-4 text-encre-3 lg:px-5">Aucune demande enregistrée.</p> : (
              <ul>
                {c.demandes.map((d) => (
                  <li key={d.id} className="border-b border-trait px-4 py-3 last:border-b-0 lg:px-5">
                    <p className="font-medium">
                      {[d.marque, d.modele].filter(Boolean).join(" ") || "Tout modèle"}
                      {(d.annee_min || d.annee_max) && ` · ${d.annee_min ?? ""}${d.annee_min && d.annee_max ? "–" : ""}${d.annee_max ?? ""}`}
                      {d.budget_max_xof && ` · ≤ ${d.budget_max_xof.toLocaleString("fr-FR")} FCFA`}
                    </p>
                    <p className="text-[13px] text-encre-3">{LIBELLES_DEMANDE[d.statut]}</p>
                  </li>
                ))}
              </ul>
            )}
            {nosCorrespondances.length > 0 && (
              <div className="border-t border-trait px-4 py-3 lg:px-5">
                <p className="etiquette mb-2 text-[11px] text-acier">Véhicules correspondants</p>
                <ul className="flex flex-col gap-2">
                  {nosCorrespondances.map((co) => (
                    <li key={co.vehicule.id}>
                      <Link href={`/parc/vehicule/?id=${co.vehicule.id}`} className="flex items-center gap-3 rounded-controle border border-acier/30 bg-acier-voile/40 p-2 hover:bg-acier-voile">
                        <PhotoVehicule path={co.vehicule.photo_principale_path} alt="" className="size-11 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{co.vehicule.libelle}</p>
                          <div className="mt-0.5 flex items-center gap-1.5"><EtiquetteEtape etape={co.vehicule.etape} compacte />{co.vehicule.date_arrivee_prevue && <span className="text-[12px] text-encre-3">arrivée {formatDate(co.vehicule.date_arrivee_prevue)}</span>}</div>
                        </div>
                        {co.vehicule.prix_affiche_xof !== null && <Montant valeur={co.vehicule.prix_affiche_xof} devise={null} />}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-4 lg:col-span-4">
          <section className="rounded-carte border border-trait bg-surface p-4 lg:p-5">
            <h2 className="etiquette mb-2 text-[12px] text-encre-3">Coordonnées</h2>
            <dl className="flex flex-col gap-1.5 text-[14px]">
              {c.telephone && <div className="flex justify-between"><dt className="text-encre-3">Téléphone</dt><dd>{c.telephone}</dd></div>}
              {c.adresse && <div className="flex justify-between gap-2"><dt className="text-encre-3">Adresse</dt><dd className="text-right">{c.adresse}</dd></div>}
              {c.numero_piece && <div className="flex justify-between gap-2"><dt className="text-encre-3">{c.type_piece ?? "Pièce"}</dt><dd className="font-mono text-[13px]">{c.numero_piece}</dd></div>}
            </dl>
            {c.notes && <p className="mt-3 rounded-controle bg-surface-2 px-3 py-2 text-[13px] text-encre-2">{c.notes}</p>}
          </section>
          {(c.total_achats_xof > 0 || c.reste_du_xof > 0) && (
            <section className="rounded-carte border border-trait bg-surface p-4 lg:p-5">
              <h2 className="etiquette mb-2 text-[12px] text-encre-3">Résumé</h2>
              <p className="text-[14px]">Total achats <Montant valeur={c.total_achats_xof} devise={null} className="ml-1" /></p>
              {c.reste_du_xof > 0 && <p className="mt-1 text-[14px]">Reste dû <Montant valeur={c.reste_du_xof} devise={null} className="ml-1 text-ocre" /></p>}
            </section>
          )}
          {c.reservations.length > 0 && (
            <section className="rounded-carte border border-trait bg-surface p-4 lg:p-5">
              <h2 className="etiquette mb-2 text-[12px] text-encre-3">Réservé pour lui</h2>
              {c.reservations.map((r) => (
                <Link key={r.vehicule_id} href={`/parc/vehicule/?id=${r.vehicule_id}`} className="block py-1 text-[14px] hover:underline">{r.libelle}{r.reserve_jusqu_au ? ` · jusqu'au ${formatDate(r.reserve_jusqu_au)}` : ""}</Link>
              ))}
            </section>
          )}
          <p className="text-[12px] text-encre-3">{pluriel(c.paiements.length, "encaissement")}</p>
        </aside>
      </div>

      <FeuilleClient ouverte={feuille === "modifier"} onFermer={() => setFeuille(null)} client={c} />
      <FeuilleDemande ouverte={feuille === "demande"} onFermer={() => setFeuille(null)} clientId={c.id} />
    </div>
  );
}

export default function PageFicheClient() {
  return (
    <Suspense>
      <Fiche />
    </Suspense>
  );
}
