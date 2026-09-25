"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  BellRinging, CalendarCheck, FilePdf, FileX, HandCoins, Invoice, Key, Phone, Printer, UserCircle, WhatsappLogo, XCircle,
} from "@phosphor-icons/react";
import { useEcriture, useLecture } from "@/lib/api/requetes";
import { useParametres } from "@/lib/api/parametres";
import { useOrg } from "@/lib/session";
import type { VenteDetail } from "@/lib/api/types-metier";
import type { SnapshotDocument } from "@/lib/documents/depuis-vente";
import { peut, MODES_PAIEMENT } from "@/lib/domaine";
import { formatCourt, formatDate, formatDateLongue, aujourdhui } from "@/lib/format";
import { grouperVin } from "@/lib/vin";
import { lienWhatsApp, remplirModele } from "@/lib/whatsapp";
import { cn } from "@/lib/cn";
import { Registre } from "@/components/metier/registre";
import { FeuilleEncaisser } from "@/components/ventes/feuille-encaisser";
import { FeuilleAnnulerVente } from "@/components/ventes/feuille-annuler-vente";
import { FeuilleAnnulerPaiement } from "@/components/ventes/feuille-annuler-paiement";
import { Bouton } from "@/components/ui/bouton";
import { FilAriane } from "@/components/ui/fil-ariane";
import { PanneauActions, type ActionVisible } from "@/components/ui/panneau-actions";
import { PhotoVehicule } from "@/components/metier/photo-vehicule";
import { AnneauPaiement, MODES_VISUELS } from "@/components/ventes/paiement-visuel";
import { useCompteursNavigation } from "@/lib/compteurs";
import { useCompteur } from "@/lib/animation";
import { EtatErreur, Squelette } from "@/components/ui/etats";
import { Montant, Tampon } from "@/components/ui/signature";

function initiales(nom: string) {
  return nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]!.toUpperCase()).join("");
}

const LIBELLES_ECHEANCE: Record<string, string> = { payee: "Payée", partielle: "Partielle", en_retard: "En retard", a_venir: "À venir" };

async function genererEtOuvrir(v: VenteDetail, type: "facture" | "avoir" | "recu", parametresActuels: unknown, paiementId?: string, action: "telecharger" | "imprimer" = "telecharger") {
  const [{ documentFacture, documentAvoir, documentRecu, avecImages }, { genererPDF, telecharger, imprimer, nomFichier, urlVerification }, { urlFichier }] = await Promise.all([
    import("@/lib/documents/depuis-vente"),
    import("@/lib/documents/generer"),
    import("@/lib/stockage"),
  ]);
  const p = parametresActuels as Parameters<typeof documentFacture>[1];
  const venteDoc = { ...v, snapshot: v.snapshot as SnapshotDocument | null };
  const d = type === "facture" ? documentFacture(venteDoc, p, urlVerification(v.token_verification))
    : type === "avoir" ? documentAvoir(venteDoc, p)
    : documentRecu(venteDoc, v.paiements.find((pa) => pa.id === paiementId)!, p);
  const avecLogos = await avecImages(d, urlFichier);
  const blob = await genererPDF(avecLogos);
  if (action === "imprimer") imprimer(blob);
  else telecharger(blob, nomFichier(d));
  return blob;
}

function Fiche() {
  const id = useSearchParams().get("id") ?? "";
  const org = useOrg();
  const { data: reglages } = useParametres();
  const { data: v, error, isPending, refetch } = useLecture<VenteDetail>("vente_obtenir", { p_org: org.id, p_id: id }, { enabled: !!id });

  const [feuille, setFeuille] = useState<null | "encaisser" | "rembourser" | "annuler">(null);
  const [annulerPaiement, setAnnulerPaiement] = useState<string | null>(null);

  const livrer = useEcriture("vente_livrer", { onSuccess: () => toast.success("Vente marquée livrée"), onError: (e) => toast.error(e.message) });
  const compteurs = useCompteursNavigation();
  const reste = useCompteur(v?.reste_xof ?? 0);

  if (!id) return <EtatErreur erreur={new Error("Aucune vente indiquée.")} />;
  if (error && !v) return <EtatErreur erreur={error} onReessayer={() => void refetch()} />;
  if (isPending || !v || !reglages) {
    return <div className="flex flex-col gap-4"><Squelette className="h-40 rounded-carte" /><Squelette className="h-64 rounded-carte" /></div>;
  }

  const annulee = v.statut === "annulee";
  const soldee = !annulee && v.reste_xof === 0;
  const peutEncaisser = peut(org.role, "encaisser");
  const peutAnnuler = peut(org.role, "annulerVente");
  const peutLivrer = peut(org.role, "vendre");
  const prenom = v.client.nom.split(/\s+/)[0] ?? v.client.nom;

  async function agir(type: "facture" | "avoir" | "recu", action: "telecharger" | "imprimer", paiementId?: string) {
    try { await genererEtOuvrir(v!, type, reglages!.parametres, paiementId, action); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Génération impossible"); }
  }

  async function envoyerWhatsApp() {
    try {
      const blob = await genererEtOuvrir(v!, "facture", reglages!.parametres, undefined, "telecharger");
      const { partagerFichier } = await import("@/lib/whatsapp");
      const { nomFichier } = await import("@/lib/documents/generer");
      const fichier = new File([blob], nomFichier({ type: "facture", numero: v!.numero, client: v!.client }), { type: "application/pdf" });
      const message = remplirModele(reglages!.parametres.modele_message_whatsapp || "Bonjour {client}, voici votre facture {numero} : {montant}. Reste à payer : {reste}.", {
        client: v!.client.nom, numero: v!.numero, montant: `${v!.montant_ttc.toLocaleString("fr-FR")} FCFA`, reste: `${v!.reste_xof.toLocaleString("fr-FR")} FCFA`,
      });
      const partage = await partagerFichier(fichier, `Facture ${v!.numero}`, message);
      if (!partage) window.open(lienWhatsApp(v!.client.telephone, message), "_blank", "noopener");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Envoi impossible"); }
  }

  function relancer() {
    const message = `Bonjour ${v!.client.nom}, un rappel amical concernant votre facture ${v!.numero} (${v!.vehicule.libelle}) : il reste ${v!.reste_xof.toLocaleString("fr-FR")} FCFA à régler. Merci de votre confiance.`;
    window.open(lienWhatsApp(v!.client.telephone, message), "_blank", "noopener");
  }

  const actions: ActionVisible[] = [
    { cle: "encaisser", titre: "Encaisser un versement", detail: `Reste ${v.reste_xof.toLocaleString("fr-FR")} FCFA · espèces, Orange Money, Wave…`, icone: HandCoins, couleur: "var(--primaire)", principale: true, onClick: () => setFeuille("encaisser"), masque: annulee || v.reste_xof === 0 || !peutEncaisser },
    { cle: "facture", titre: "Télécharger la facture", detail: `PDF ${v.numero} · avec QR de vérification`, icone: FilePdf, couleur: "#dc2626", onClick: () => agir("facture", "telecharger") },
    { cle: "whatsapp", titre: `Envoyer à ${prenom} sur WhatsApp`, detail: `Facture PDF + message · ${v.client.telephone ?? ""}`, icone: WhatsappLogo, couleur: "#25d366", onClick: () => envoyerWhatsApp(), masque: !v.client.telephone },
    { cle: "imprimer", titre: "Imprimer la facture", detail: "Format A4, cachet et signature inclus", icone: Printer, couleur: "var(--encre-3)", onClick: () => agir("facture", "imprimer") },
    { cle: "relancer", titre: `Relancer ${prenom}`, detail: `Rappel amical : ${v.reste_xof.toLocaleString("fr-FR")} FCFA à régler`, icone: BellRinging, couleur: "var(--ocre)", onClick: relancer, masque: annulee || v.reste_xof === 0 || !v.client.telephone },
    { cle: "livrer", titre: "Marquer comme livré", detail: "Le client a reçu le véhicule et les clés", icone: Key, couleur: "var(--etape-parc)", onClick: () => livrer.executerAsync({ p_org: org.id, p_vente_id: v.id, p_date: aujourdhui() }), masque: annulee || v.livree || !peutLivrer },
    { cle: "avoir", titre: "Télécharger l'avoir", detail: v.numero_avoir ? `PDF ${v.numero_avoir}` : "Document d'annulation", icone: FileX, couleur: "var(--perte)", onClick: () => agir("avoir", "telecharger"), masque: !annulee },
    { cle: "annuler", titre: "Annuler la vente", detail: "Crée un avoir ; le véhicule redevient disponible", icone: XCircle, couleur: "var(--perte)", danger: true, onClick: () => setFeuille("annuler"), masque: annulee || !peutAnnuler },
  ];

  return (
    <div className="pb-24 lg:pb-0">
      <FilAriane
        retour={{ href: "/ventes/", libelle: "Ventes", icone: Invoice, couleur: "var(--gain)", detail: compteurs.ventes?.sens }}
        etapes={[v.client.nom, v.numero]}
      />

      {/* En-tête : le véhicule vendu, le client, l'argent */}
      <section className="carte apparition overflow-hidden lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Link href={`/parc/vehicule/?id=${v.vehicule.id}`} className="group relative block aspect-[16/10] overflow-hidden lg:aspect-auto lg:min-h-[260px]">
          <PhotoVehicule path={v.vehicule.photo_principale_path} alt={v.vehicule.libelle} arrondi={false} className="absolute inset-0 size-full transition-transform duration-500 group-hover:scale-105" />
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0b1633]/85 via-[#0b1633]/20 to-transparent" />
          <span className="absolute inset-x-4 bottom-4 text-white">
            <span className="block text-[20px] leading-tight font-extrabold drop-shadow">{v.vehicule.libelle}</span>
            {v.vehicule.vin && <span className="mt-1 block font-mono text-[12px] text-white/80">{grouperVin(v.vehicule.vin)}</span>}
          </span>
        </Link>
        <div className="flex flex-col gap-4 p-5 lg:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="etiquette text-[11px] text-primaire">{formatDateLongue(v.date_vente)}</p>
              <h1 className="font-mono text-[26px] leading-tight font-bold tracking-tight">{v.numero}</h1>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {annulee ? <Tampon type="annule" grand /> : soldee ? <Tampon type="solde" grand /> : null}
              {!annulee && !v.livree && <Tampon type="a_livrer" grand />}
            </div>
          </div>
          <Link href={`/clients/fiche/?id=${v.client.id}`} className="group flex items-center gap-3 rounded-2xl bg-surface-2 p-3 transition-colors hover:bg-primaire-voile">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#b388ff] to-[#7c3aed] text-[15px] font-bold text-white">{initiales(v.client.nom)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold group-hover:text-primaire">{v.client.nom}</span>
              <span className="block truncate text-[13px] text-encre-3">{[v.client.telephone, v.client.ville].filter(Boolean).join(" · ") || "Client"}</span>
            </span>
            <UserCircle size={22} weight="duotone" className="text-encre-3" aria-hidden />
          </Link>
          <div className="flex items-center gap-5">
            <AnneauPaiement encaisse={v.encaisse_xof} total={v.montant_ttc} taille={116} />
            <div className="min-w-0">
              {annulee ? (
                <p className="text-[15px] font-semibold text-perte-texte">Vente annulée{v.a_rembourser_xof > 0 ? ` · ${v.a_rembourser_xof.toLocaleString("fr-FR")} FCFA à rembourser` : ""}</p>
              ) : soldee ? (
                <p className="text-[18px] font-extrabold text-gain-texte">Tout est payé</p>
              ) : (
                <>
                  <p className="text-[13px] font-semibold text-encre-3">Reste à encaisser</p>
                  <p className="chiffres text-[30px] leading-tight font-extrabold tracking-tight text-ocre-texte">{formatCourt(reste)}<span className="ml-1 text-[14px] font-semibold opacity-70">FCFA</span></p>
                </>
              )}
              <p className="mt-1 text-[13px] text-encre-3">
                <span className="chiffres font-semibold text-encre">{v.encaisse_xof.toLocaleString("fr-FR")}</span> encaissés sur <span className="chiffres font-semibold text-encre">{v.montant_ttc.toLocaleString("fr-FR")}</span> FCFA
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-12 lg:gap-6">
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-7 xl:col-span-8">
          <PanneauActions titre="Que voulez-vous faire ?" actions={actions} />

          <section className="carte apparition p-4 lg:p-5" aria-labelledby="titre-versements">
            <h2 id="titre-versements" className="mb-3 flex items-center gap-2 text-[17px] font-bold">
              Versements <span className="chiffres rounded-full bg-surface-2 px-2 text-[12px] text-encre-3">{v.paiements.filter((p) => !p.annule).length}</span>
            </h2>
            {v.paiements.length === 0 ? <p className="py-2 text-encre-3">Aucun versement pour l&apos;instant.</p> : (
              <ol className="relative flex flex-col gap-3 before:absolute before:top-2 before:bottom-2 before:left-[21px] before:w-0.5 before:bg-trait">
                {v.paiements.map((p, i) => {
                  const mv = MODES_VISUELS[p.mode] ?? MODES_VISUELS.autre!;
                  return (
                    <li key={p.id} className={cn("apparition relative flex items-center gap-3", p.annule && "opacity-50")} style={{ animationDelay: `${i * 60}ms` }}>
                      <span className="relative z-10 grid size-11 shrink-0 place-items-center rounded-full text-white ring-4 ring-surface" style={{ background: mv.couleur }}>
                        <mv.icone size={20} weight="fill" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{MODES_PAIEMENT[p.mode]?.libelle}<span className="font-medium text-encre-3"> · {formatDate(p.date)}</span></p>
                        <p className="truncate font-mono text-[12px] text-encre-3">{p.numero_recu}{p.reference ? ` · ${p.reference}` : ""}{p.annule ? " · annulé" : ""}</p>
                      </div>
                      <Montant valeur={p.montant_xof} devise={null} className={cn("shrink-0", p.montant_xof < 0 ? "text-perte" : "text-gain-texte")} />
                      {!p.annule && (
                        <div className="flex shrink-0 gap-1.5">
                          <button type="button" onClick={() => void agir("recu", "telecharger", p.id)} className="onde inline-flex h-9 items-center gap-1 rounded-full bg-surface-2 px-3 text-[12px] font-semibold text-encre-2 hover:bg-primaire-voile hover:text-primaire">
                            <FilePdf size={16} weight="duotone" aria-hidden /> Reçu
                          </button>
                          {peutAnnuler && (
                            <button type="button" onClick={() => setAnnulerPaiement(p.id)} aria-label={`Annuler le versement ${p.numero_recu}`} className="onde inline-flex h-9 items-center gap-1 rounded-full px-2.5 text-[12px] font-semibold text-encre-3 hover:bg-perte-voile hover:text-perte-texte">
                              <XCircle size={16} weight="duotone" aria-hidden /> Annuler
                            </button>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {v.echeances.length > 0 && (
            <section className="carte apparition p-4 lg:p-5" aria-labelledby="titre-echeances">
              <h2 id="titre-echeances" className="mb-3 text-[17px] font-bold">Échéancier</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {v.echeances.map((e) => {
                  const c = e.statut === "en_retard" ? "var(--perte)" : e.statut === "payee" ? "var(--gain)" : e.statut === "partielle" ? "var(--ocre)" : "var(--acier)";
                  return (
                    <li key={e.id} className="flex items-center gap-3 rounded-2xl p-3" style={{ background: `color-mix(in srgb, ${c} 9%, var(--surface))` }}>
                      <CalendarCheck size={24} weight="duotone" style={{ color: c }} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">{formatDate(e.date_echeance)}</span>
                        <span className="block text-[12px] font-semibold" style={{ color: `color-mix(in srgb, ${c} 70%, var(--pole-texte))` }}>{LIBELLES_ECHEANCE[e.statut]}</span>
                      </span>
                      <Montant valeur={e.montant_xof} devise={null} />
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-5 lg:col-span-5 xl:col-span-4">
          <section className="carte apparition p-4 lg:p-5">
            <h2 className="mb-2 text-[17px] font-bold">Montants</h2>
            <Registre lignes={[
              ...(v.remise_xof ? [{ libelle: "Prix", valeur: v.prix_xof.toLocaleString("fr-FR") }, { libelle: "Remise", valeur: `− ${v.remise_xof.toLocaleString("fr-FR")}` }] : []),
              ...(v.tva_taux > 0 ? [{ libelle: "Hors taxes", valeur: v.montant_ht.toLocaleString("fr-FR") }, { libelle: `TVA ${v.tva_taux}%`, valeur: v.montant_tva.toLocaleString("fr-FR") }] : []),
              { libelle: "Total TTC", valeur: `${v.montant_ttc.toLocaleString("fr-FR")} FCFA`, fort: true },
              { libelle: "Encaissé", valeur: `${v.encaisse_xof.toLocaleString("fr-FR")} FCFA` },
              { libelle: "Reste", valeur: `${v.reste_xof.toLocaleString("fr-FR")} FCFA`, fort: v.reste_xof > 0 },
            ]} />
            {v.prix_revient_xof !== null && (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-gain-voile px-3 py-2">
                <span className="text-[13px] font-semibold text-gain-texte">Marge sur cette vente</span>
                <span className={cn("chiffres font-extrabold", (v.marge_xof ?? 0) < 0 ? "text-perte" : "text-gain-texte")}>{v.marge_xof?.toLocaleString("fr-FR")} {v.marge_pct !== null && <span className="text-[12px]">({v.marge_pct} %)</span>}</span>
              </div>
            )}
            {annulee && v.a_rembourser_xof > 0 && peutEncaisser && <Bouton variante="secondaire" className="mt-4" onClick={() => setFeuille("rembourser")}>Rembourser {v.a_rembourser_xof.toLocaleString("fr-FR")} FCFA</Bouton>}
          </section>
          {v.client.telephone && (
            <section className="carte apparition p-4 lg:p-5">
              <h2 className="mb-3 text-[17px] font-bold">Joindre {prenom}</h2>
              <div className="grid grid-cols-2 gap-2">
                <a href={`tel:${v.client.telephone}`} className="onde flex h-12 items-center justify-center gap-2 rounded-2xl bg-primaire-voile font-semibold text-primaire transition-transform hover:-translate-y-0.5">
                  <Phone size={20} weight="fill" aria-hidden /> Appeler
                </a>
                <a href={lienWhatsApp(v.client.telephone, `Bonjour ${v.client.nom},`)} target="_blank" rel="noopener" className="onde flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#25d366] font-semibold text-white shadow-[0_8px_18px_-8px_#25d366] transition-transform hover:-translate-y-0.5">
                  <WhatsappLogo size={20} weight="fill" aria-hidden /> WhatsApp
                </a>
              </div>
              {v.vendeur_nom && <p className="mt-3 text-[13px] text-encre-3">Vendu par {v.vendeur_nom}</p>}
            </section>
          )}
        </aside>
      </div>

      {!annulee && v.reste_xof > 0 && peutEncaisser && (
        <div className="zone-sure-bas fixed inset-x-0 bottom-16 z-30 border-t border-trait/70 bg-surface/90 px-4 py-3 shadow-[0_-8px_24px_-12px_rgb(15_23_42/0.18)] backdrop-blur-xl lg:hidden">
          <Bouton variante="primaire" pleineLargeur icone={<HandCoins size={20} weight="fill" />} onClick={() => setFeuille("encaisser")}>Encaisser · reste {formatCourt(v.reste_xof)} FCFA</Bouton>
        </div>
      )}

      <FeuilleEncaisser ouverte={feuille === "encaisser"} onFermer={() => setFeuille(null)} venteId={v.id} reste={v.reste_xof} prochaineEcheance={v.echeances.find((e) => e.reste_xof > 0)?.reste_xof} />
      <FeuilleEncaisser ouverte={feuille === "rembourser"} onFermer={() => setFeuille(null)} venteId={v.id} reste={v.a_rembourser_xof} venteAnnulee />
      <FeuilleAnnulerVente ouverte={feuille === "annuler"} onFermer={() => setFeuille(null)} venteId={v.id} onAnnulee={() => void refetch()} />
      {annulerPaiement && <FeuilleAnnulerPaiement ouverte onFermer={() => setAnnulerPaiement(null)} paiementId={annulerPaiement} />}
    </div>
  );
}

export default function PageFicheVente() {
  return (
    <Suspense>
      <Fiche />
    </Suspense>
  );
}
