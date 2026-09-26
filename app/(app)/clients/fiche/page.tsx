"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  BookmarkSimple, CalendarBlank, CurrencyCircleDollar, Handshake, IdentificationCard, Invoice, MagnifyingGlassPlus, MapPin, PencilSimple, Phone, Plus, Trash, UsersThree, WhatsappLogo,
} from "@phosphor-icons/react";
import { useEcriture, useLecture } from "@/lib/api/requetes";
import { useOrg } from "@/lib/session";
import type { ClientDetail, Correspondance } from "@/lib/api/types-metier";
import { peut } from "@/lib/domaine";
import { formatCourt, formatDate, pluriel } from "@/lib/format";
import { lienWhatsApp } from "@/lib/whatsapp";
import { cn } from "@/lib/cn";
import { decalage } from "@/lib/animation";
import { useCompteursNavigation } from "@/lib/compteurs";
import { EtiquetteEtape, Montant, Tampon } from "@/components/ui/signature";
import { Bouton } from "@/components/ui/bouton";
import { Avatar } from "@/components/ui/avatar";
import { FilAriane } from "@/components/ui/fil-ariane";
import { Indicateur } from "@/components/ui/recherche";
import { Picto } from "@/components/ui/picto";
import { EtatErreur, Squelette } from "@/components/ui/etats";
import { FeuilleClient } from "@/components/clients/feuille-client";
import { FeuilleDemande } from "@/components/clients/feuille-demande";
import { PhotoVehicule } from "@/components/metier/photo-vehicule";

const DEMANDES: Record<string, { libelle: string; couleur: string }> = {
  ouverte: { libelle: "En recherche", couleur: "var(--acier)" },
  satisfaite: { libelle: "Trouvé", couleur: "var(--gain)" },
  abandonnee: { libelle: "Abandonnée", couleur: "var(--encre-3)" },
};

function Fiche() {
  const id = useSearchParams().get("id") ?? "";
  const org = useOrg();
  const router = useRouter();
  const peutModifier = peut(org.role, "vendre");
  const peutSupprimer = peut(org.role, "annulerVente");
  const compteurs = useCompteursNavigation();
  const { data: c, error, isPending, refetch } = useLecture<ClientDetail>("client_obtenir", { p_org: org.id, p_id: id }, { enabled: !!id });
  const { data: correspondances } = useLecture<Correspondance[]>("demandes_correspondances", { p_org: org.id }, { enabled: !!c && c.demandes.some((d) => d.statut === "ouverte") });
  const [feuille, setFeuille] = useState<null | "modifier" | "demande">(null);
  const supprimer = useEcriture("client_supprimer", {
    onSuccess: () => { toast.success("Client supprimé"); router.push("/clients/"); },
    onError: (e) => toast.error(e.message),
  });

  if (!id) return <EtatErreur erreur={new Error("Aucun client indiqué.")} />;
  if (error && !c) return <EtatErreur erreur={error} onReessayer={() => void refetch()} />;
  if (isPending || !c) return <div className="flex flex-col gap-4"><Squelette className="h-44 rounded-[22px]" /><Squelette className="h-64 rounded-[22px]" /></div>;

  const nosDemandesId = new Set(c.demandes.map((d) => d.id));
  const nosCorrespondances = (correspondances ?? []).filter((co) => nosDemandesId.has(co.demande.id));
  const tel = c.whatsapp || c.telephone;
  const actives = c.ventes.filter((v) => v.statut === "active");
  // Le détail ne porte pas « derniere_vente » (seule la liste des clients l'a) : on la déduit des ventes actives.
  const derniereVente = actives.map((v) => v.date_vente).sort().at(-1) ?? null;
  const prenom = c.nom.split(/\s+/)[0] ?? c.nom;

  return (
    <div>
      <FilAriane retour={{ href: "/clients/", libelle: "Clients", icone: UsersThree, couleur: "var(--reserve)", detail: compteurs.clients?.sens }} etapes={[c.nom]} />

      {/* En-tête : la personne et comment la joindre */}
      <section className="apparition relative overflow-hidden rounded-carte bg-heros p-5 text-white shadow-flottante lg:p-7">
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar nom={c.nom} taille={72} className="ring-4 ring-white/20" />
            <div className="min-w-0">
              <h1 className="text-[26px] leading-tight font-extrabold tracking-tight lg:text-[32px]">{c.nom}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-white/80">
                {c.ville && <span className="inline-flex items-center gap-1"><MapPin size={15} weight="fill" aria-hidden />{c.ville}</span>}
                {c.telephone && <span className="inline-flex items-center gap-1"><Phone size={15} weight="fill" aria-hidden />{c.telephone}</span>}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {c.telephone && (
              <a href={`tel:${c.telephone}`} className="onde inline-flex h-11 items-center gap-2 rounded-full bg-white px-4 font-semibold text-nuit shadow-lg transition-transform hover:-translate-y-0.5">
                <Phone size={18} weight="fill" className="text-primaire" aria-hidden /> Appeler {prenom}
              </a>
            )}
            {tel && (
              <a href={lienWhatsApp(tel, `Bonjour ${c.nom},`)} target="_blank" rel="noopener" className="onde inline-flex h-11 items-center gap-2 rounded-full bg-marque-whatsapp px-4 font-semibold text-sur-marque-whatsapp transition-transform hover:-translate-y-px">
                <WhatsappLogo size={19} weight="fill" aria-hidden /> WhatsApp
              </a>
            )}
            {peutModifier && (
              <button type="button" onClick={() => setFeuille("modifier")} className="onde inline-flex h-11 items-center gap-2 rounded-full bg-white/12 px-4 font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white/20">
                <PencilSimple size={18} weight="duotone" aria-hidden /> Modifier la fiche
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicateur index={0} libelle="Achats" valeur={actives.length} format={(x) => String(Math.round(x))} precision={derniereVente ? `dernier le ${formatDate(derniereVente)}` : "aucun pour l'instant"} icone={Invoice} couleur="var(--gain)" />
        <Indicateur index={1} libelle="Total acheté" valeur={c.total_achats_xof} format={formatCourt} precision="FCFA" icone={Handshake} couleur="var(--primaire)" />
        <Indicateur index={2} libelle="Reste dû" valeur={c.reste_du_xof} format={formatCourt} precision={c.reste_du_xof > 0 ? "à encaisser" : "tout est réglé"} icone={CurrencyCircleDollar} couleur={c.reste_du_xof > 0 ? "var(--accent)" : "var(--gain)"} />
        <Indicateur index={3} libelle="Recherche" valeur={c.demandes.filter((d) => d.statut === "ouverte").length} format={(x) => String(Math.round(x))} precision={nosCorrespondances.length ? `${pluriel(nosCorrespondances.length, "véhicule")} correspond` : "demande ouverte"} icone={MagnifyingGlassPlus} couleur="var(--acier)" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-12 lg:gap-6">
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-7 xl:col-span-8">
          <section className="carte apparition p-4 lg:p-5" aria-labelledby="titre-achats">
            <h2 id="titre-achats" className="mb-3 text-[17px] font-bold">Ses achats</h2>
            {c.ventes.length === 0 ? <p className="py-2 text-encre-3">Aucun achat pour l&apos;instant.</p> : (
              <ul className="flex flex-col gap-2">
                {c.ventes.map((v, i) => {
                  const part = v.montant_ttc > 0 ? Math.min(1, v.encaisse_xof / v.montant_ttc) : 0;
                  return (
                    <li key={v.id} className="apparition" style={decalage(i, 50)}>
                      <Link href={`/ventes/fiche/?id=${v.id}`} className="group flex items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-surface-2">
                        <Picto icone={Invoice} couleur={v.statut === "annulee" ? "var(--perte)" : part >= 1 ? "var(--gain)" : "var(--accent)"} taille="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate font-bold group-hover:text-primaire">{v.vehicule_libelle}</span>
                            {v.statut === "annulee" && <Tampon type="annule" />}
                          </p>
                          <p className="truncate font-mono text-[12px] text-encre-3">{v.numero} · {formatDate(v.date_vente)}</p>
                          {v.statut === "active" && (
                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                              <div className="h-full origin-left rounded-full [animation:remplit_900ms_both]" style={{ width: `${part * 100}%`, background: part >= 1 ? "var(--gain)" : v.retard_xof > 0 ? "var(--perte)" : "var(--accent)" }} />
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <Montant valeur={v.montant_ttc} devise={null} court />
                          {v.reste_xof > 0 && v.statut === "active" && <p className="chiffres text-[12px] font-bold text-ocre-texte">reste {formatCourt(v.reste_xof)}</p>}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {c.proformas.length > 0 && (
            <section className="carte apparition p-4 lg:p-5" aria-labelledby="titre-proformas">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 id="titre-proformas" className="text-[17px] font-bold">Ses proformas</h2>
                <Link href="/ventes/?onglet=proformas" className="text-[13px] font-semibold text-primaire hover:underline">Toutes les proformas</Link>
              </div>
              <ul className="flex flex-col gap-2">
                {c.proformas.map((p) => (
                  <li key={p.id}>
                    <Link href={p.vente_id ? `/ventes/fiche/?id=${p.vente_id}` : `/parc/vehicule/?id=${p.vehicule_id}`} className="group flex items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-surface-2">
                      <Picto icone={Invoice} couleur="var(--acier)" taille="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold group-hover:text-primaire">{p.vehicule_libelle ?? p.vehicule_reference ?? "Véhicule"}</p>
                        <p className="truncate font-mono text-[12px] text-encre-3">{p.numero} · valable jusqu&apos;au {formatDate(p.valide_jusqu_au)}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <Montant valeur={p.montant_ttc} devise={null} court />
                        <p className="text-[11px] font-semibold text-encre-3">{{ emise: "Émise", acceptee: "Acceptée", expiree: "Expirée", convertie: "Convertie", annulee: "Annulée" }[p.statut_effectif] ?? p.statut_effectif}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="carte apparition p-4 lg:p-5" aria-labelledby="titre-demandes">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 id="titre-demandes" className="text-[17px] font-bold">Ce que {prenom} cherche</h2>
              {peutModifier && <Bouton variante="secondaire" taille="sm" icone={<Plus size={16} weight="bold" />} onClick={() => setFeuille("demande")}>Noter une demande</Bouton>}
            </div>
            {c.demandes.length === 0 ? <p className="py-2 text-encre-3">Aucune demande. Notez le modèle et le budget : l&apos;application vous préviendra dès qu&apos;un véhicule correspond.</p> : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {c.demandes.map((d) => {
                  const st = DEMANDES[d.statut] ?? DEMANDES.ouverte!;
                  return (
                    <li key={d.id} className="rounded-2xl p-3" style={{ background: `color-mix(in srgb, ${st.couleur} 9%, var(--surface))` }}>
                      <p className="font-bold">{[d.marque, d.modele].filter(Boolean).join(" ") || "Tout modèle"}</p>
                      <p className="text-[13px] text-encre-2">
                        {(d.annee_min || d.annee_max) ? `${d.annee_min ?? ""}${d.annee_min && d.annee_max ? "–" : ""}${d.annee_max ?? ""}` : "Toute année"}
                        {d.budget_max_xof ? ` · jusqu'à ${formatCourt(d.budget_max_xof)} FCFA` : ""}
                      </p>
                      <p className="mt-1 text-[12px] font-bold" style={{ color: `color-mix(in srgb, ${st.couleur} 70%, var(--pole-texte))` }}>{st.libelle}</p>
                    </li>
                  );
                })}
              </ul>
            )}
            {nosCorrespondances.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-[13px] font-bold text-acier">Dans votre parc, ça pourrait lui plaire :</p>
                <ul data-defilement="horizontal" className="sans-barre -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
                  {nosCorrespondances.map((co) => (
                    <li key={co.vehicule.id} className="w-56 shrink-0">
                      <Link href={`/parc/vehicule/?id=${co.vehicule.id}`} className="carte carte-lien group block overflow-hidden">
                        <PhotoVehicule path={co.vehicule.photo_principale_path} alt="" arrondi={false} className="aspect-[16/10] w-full" />
                        <div className="p-3">
                          <p className="truncate font-bold group-hover:text-primaire">{co.vehicule.libelle}</p>
                          <div className="mt-1.5 flex items-center justify-between gap-2">
                            <EtiquetteEtape etape={co.vehicule.etape} compacte />
                            {co.vehicule.prix_affiche_xof !== null && <Montant valeur={co.vehicule.prix_affiche_xof} devise={null} court />}
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-5 lg:col-span-5 xl:col-span-4">
          <section className="carte apparition p-4 lg:p-5">
            <h2 className="mb-3 text-[17px] font-bold">Coordonnées</h2>
            <ul className="flex flex-col gap-3 text-[14px]">
              {c.telephone && <li className="flex items-center gap-3"><Picto icone={Phone} couleur="var(--primaire)" taille="xs" /><span className="flex-1 text-encre-3">Téléphone</span><span className="font-semibold">{c.telephone}</span></li>}
              {c.whatsapp && c.whatsapp !== c.telephone && <li className="flex items-center gap-3"><Picto icone={WhatsappLogo} couleur="var(--marque-whatsapp)" taille="xs" /><span className="flex-1 text-encre-3">WhatsApp</span><span className="font-semibold">{c.whatsapp}</span></li>}
              {c.adresse && <li className="flex items-center gap-3"><Picto icone={MapPin} couleur="var(--accent)" taille="xs" /><span className="flex-1 text-encre-3">Adresse</span><span className="text-right font-semibold">{c.adresse}</span></li>}
              {c.numero_piece && <li className="flex items-center gap-3"><Picto icone={IdentificationCard} couleur="var(--reserve)" taille="xs" /><span className="flex-1 text-encre-3">{c.type_piece ?? "Pièce"}</span><span className="font-mono text-[13px] font-semibold">{c.numero_piece}</span></li>}
            </ul>
            {c.notes && <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-[13px] text-encre-2">{c.notes}</p>}
          </section>
          {c.reservations.length > 0 && (
            <section className="carte apparition p-4 lg:p-5">
              <h2 className="mb-3 flex items-center gap-2 text-[17px] font-bold"><BookmarkSimple size={20} weight="duotone" className="text-reserve-texte" aria-hidden /> Réservé pour {prenom}</h2>
              <ul className="flex flex-col gap-2">
                {c.reservations.map((r) => (
                  <li key={r.vehicule_id}>
                    <Link href={`/parc/vehicule/?id=${r.vehicule_id}`} className="flex items-center justify-between gap-2 rounded-xl bg-reserve-voile px-3 py-2 font-semibold text-reserve-texte hover:underline">
                      <span className="truncate">{r.libelle}</span>
                      {r.reserve_jusqu_au && <span className="flex shrink-0 items-center gap-1 text-[12px]"><CalendarBlank size={14} aria-hidden />{formatDate(r.reserve_jusqu_au)}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <p className={cn("text-[12px] text-encre-3")}>{pluriel(c.paiements.length, "versement")} enregistré{c.paiements.length > 1 ? "s" : ""} pour ce client.</p>
          {peutSupprimer && (
            <div className="border-t border-trait pt-4">
              {c.ventes.length > 0 || c.proformas.length > 0 ? (
                <p className="text-[13px] text-encre-3">Un client qui a des ventes ou des proformas ne peut pas être supprimé : son historique doit rester complet.</p>
              ) : (
                <Bouton variante="danger" taille="sm" icone={<Trash size={16} weight="duotone" />} chargement={supprimer.isPending}
                  onClick={() => { if (window.confirm(`Supprimer ${c.nom} ? Cette action est définitive.`)) supprimer.executer({ p_org: org.id, p_id: c.id }); }}>
                  Supprimer ce client
                </Bouton>
              )}
            </div>
          )}
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
