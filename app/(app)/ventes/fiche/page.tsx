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
import { formatCourt, formatDate, formatDateLongue, aujourdhui, formatNombre } from "@/lib/format";
import { grouperVin } from "@/lib/vin";
import { lienWhatsApp, remplirModele } from "@/lib/whatsapp";
import { cn } from "@/lib/cn";
import { Registre } from "@/components/metier/registre";
import { FeuilleEncaisser } from "@/components/ventes/feuille-encaisser";
import { FeuilleAnnulerVente } from "@/components/ventes/feuille-annuler-vente";
import { FeuilleAnnulerPaiement } from "@/components/ventes/feuille-annuler-paiement";
import { Bouton } from "@/components/ui/bouton";
import { Avatar } from "@/components/ui/avatar";
import { FilAriane } from "@/components/ui/fil-ariane";
import { PanneauActions, type ActionVisible } from "@/components/ui/panneau-actions";
import { PhotoVehicule } from "@/components/metier/photo-vehicule";
import { AnneauPaiement, BadgeRetard, MODES_VISUELS } from "@/components/ventes/paiement-visuel";
import { useCompteursNavigation } from "@/lib/compteurs";
import { useCompteur } from "@/lib/animation";
import { EtatErreur, Squelette } from "@/components/ui/etats";
import { Montant, Tampon } from "@/components/ui/signature";

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
  // Même condition que la liste : le retard reste au premier plan, en rouge, de la liste à la fiche.
  const enRetard = !annulee && v.reste_xof > 0 && v.retard_xof > 0;
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
        client: v!.client.nom, numero: v!.numero, montant: `${formatNombre(v!.montant_ttc)} FCFA`, reste: `${formatNombre(v!.reste_xof)} FCFA`,
        document: "facture", vehicule: v!.vehicule.libelle, entreprise: reglages!.parametres.nom_commercial,
      });
      const partage = await partagerFichier(fichier, `Facture ${v!.numero}`, message);
      if (!partage) window.open(lienWhatsApp(v!.client.telephone, message), "_blank", "noopener");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Envoi impossible"); }
  }

  function relancer() {
    const message = `Bonjour ${v!.client.nom}, un rappel amical concernant votre facture ${v!.numero} (${v!.vehicule.libelle}) : il reste ${formatNombre(v!.reste_xof)} FCFA à régler. Merci de votre confiance.`;
    window.open(lienWhatsApp(v!.client.telephone, message), "_blank", "noopener");
  }

  const actions: ActionVisible[] = [
    { cle: "encaisser", titre: "Encaisser un versement", detail: `Reste ${formatNombre(v.reste_xof)} FCFA · espèces, Orange Money, Wave…`, icone: HandCoins, couleur: "var(--primaire)", principale: true, onClick: () => setFeuille("encaisser"), masque: annulee || v.reste_xof === 0 || !peutEncaisser },
    { cle: "facture", titre: "Télécharger la facture", detail: `PDF ${v.numero} · avec QR de vérification`, icone: FilePdf, couleur: "var(--encre-3)", onClick: () => agir("facture", "telecharger") },
    { cle: "whatsapp", titre: `Envoyer à ${prenom} sur WhatsApp`, detail: `Facture PDF + message · ${v.client.telephone ?? ""}`, icone: WhatsappLogo, couleur: "var(--marque-whatsapp)", onClick: () => envoyerWhatsApp(), masque: !v.client.telephone },
    { cle: "imprimer", titre: "Imprimer la facture", detail: "Format A4, cachet et signature inclus", icone: Printer, couleur: "var(--encre-3)", onClick: () => agir("facture", "imprimer") },
    { cle: "relancer", titre: `Relancer ${prenom}`, detail: `Rappel amical : ${formatNombre(v.reste_xof)} FCFA à régler`, icone: BellRinging, couleur: "var(--ocre)", onClick: relancer, masque: annulee || v.reste_xof === 0 || !v.client.telephone },
    { cle: "livrer", titre: "Marquer comme livré", detail: "Le client a reçu le véhicule et les clés", icone: Key, couleur: "var(--encre-3)", onClick: () => livrer.executerAsync({ p_org: org.id, p_vente_id: v.id, p_date: aujourdhui() }), masque: annulee || v.livree || !peutLivrer },
    { cle: "avoir", titre: "Télécharger l'avoir", detail: v.numero_avoir ? `PDF ${v.numero_avoir}` : "Document d'annulation", icone: FileX, couleur: "var(--encre-3)", onClick: () => agir("avoir", "telecharger"), masque: !annulee },
    { cle: "annuler", titre: "Annuler la vente", detail: "Crée un avoir ; le véhicule redevient disponible", icone: XCircle, couleur: "var(--perte)", danger: true, onClick: () => setFeuille("annuler"), masque: annulee || !peutAnnuler },
  ];

  return (
    <div className="pb-24 lg:pb-0">
      <FilAriane
        retour={{ href: "/ventes/", libelle: "Ventes", icone: Invoice, couleur: "var(--gain)", detail: compteurs.ventes?.sens }}
        etapes={[v.client.nom, v.numero]}
      />

      {/* Deux niveaux (docs/CONVENTIONS_FRONT.md, « Hiérarchie ») :
       *  1. premier plan — le client, le montant, le reste à encaisser, puis l'action d'encaisser ;
       *  2. second plan, plus calme — les versements, l'échéancier, les montants détaillés, les documents. */}
      <div className="flex flex-col gap-6 lg:gap-8">
        <section className="carte apparition overflow-hidden lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <Link href={`/parc/vehicule/?id=${v.vehicule.id}`} className="group relative block aspect-[16/10] overflow-hidden lg:aspect-auto lg:min-h-[256px]">
            <PhotoVehicule path={v.vehicule.photo_principale_path} alt={v.vehicule.libelle} arrondi={false} className="absolute inset-0 size-full transition-transform duration-500 group-hover:scale-[1.03]" />
            <span aria-hidden className="voile-photo absolute inset-0" />
            <span className="absolute inset-x-4 bottom-4 text-white">
              <span className="block text-[18px] leading-tight font-extrabold drop-shadow">{v.vehicule.libelle}</span>
              {v.vehicule.vin && <span className="mt-1 block font-mono text-[12px] text-white/80">{grouperVin(v.vehicule.vin)}</span>}
            </span>
          </Link>
          <div className="flex flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="etiquette text-[12px] text-primaire">{formatDateLongue(v.date_vente)}</p>
                <h1 className="font-mono text-[24px] leading-tight font-bold tracking-tight">{v.numero}</h1>
              </div>
              <div className="flex flex-wrap gap-2">
                {annulee ? <Tampon type="annule" grand /> : soldee ? <Tampon type="solde" grand /> : null}
                {enRetard && <BadgeRetard grand />}
                {!annulee && !v.livree && <Tampon type="a_livrer" grand />}
              </div>
            </div>
            <Link href={`/clients/fiche/?id=${v.client.id}`} className="group flex items-center gap-3 rounded-2xl bg-surface-2 p-3 transition-colors hover:bg-primaire-voile">
              <Avatar nom={v.client.nom} taille={44} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[18px] leading-tight font-bold group-hover:text-primaire">{v.client.nom}</span>
                <span className="mt-1 block truncate text-[14px] text-encre-3">{[v.client.telephone, v.client.ville].filter(Boolean).join(" · ") || "Client"}</span>
              </span>
              <UserCircle size={24} weight="duotone" className="text-encre-3" aria-hidden />
            </Link>
            <div className="flex items-center gap-4 lg:gap-6">
              <AnneauPaiement encaisse={v.encaisse_xof} total={v.montant_ttc} enRetard={enRetard} taille={112} />
              <div className="min-w-0">
                {annulee ? (
                  <p className="text-[16px] font-semibold text-perte-texte">Vente annulée{v.a_rembourser_xof > 0 ? ` · ${formatNombre(v.a_rembourser_xof)} FCFA à rembourser` : ""}</p>
                ) : soldee ? (
                  <p className="text-[18px] font-extrabold text-gain-texte">Tout est payé</p>
                ) : (
                  <>
                    <p className="text-[14px] font-semibold text-encre-3">Reste à encaisser</p>
                    <p className={cn("chiffres mt-1 text-[32px] leading-none font-extrabold tracking-tight", enRetard ? "text-perte-texte" : "text-ocre-texte")}>{formatCourt(reste)}<span className="ml-1 text-[14px] font-semibold">FCFA</span></p>
                  </>
                )}
                <p className="mt-2 text-[14px] text-encre-3">
                  <span className="chiffres font-semibold text-encre">{formatNombre(v.encaisse_xof)}</span> encaissés sur <span className="chiffres font-semibold text-encre">{formatNombre(v.montant_ttc)}</span> FCFA
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
          <div className="flex min-w-0 flex-col gap-4 lg:col-span-7 lg:gap-6 xl:col-span-8">
            <PanneauActions titre="Que voulez-vous faire ?" actions={actions} />

            <section className="carte apparition p-4 lg:p-6" aria-labelledby="titre-versements">
              <h2 id="titre-versements" className="mb-3 flex items-center gap-2 text-[18px] font-bold">
                Versements <span className="chiffres rounded-full bg-surface-2 px-2 text-[12px] text-encre-3">{v.paiements.filter((p) => !p.annule).length}</span>
              </h2>
              {v.paiements.length === 0 ? <p className="py-2 text-encre-3">Aucun versement pour l&apos;instant.</p> : (
                <ol className="relative flex flex-col gap-3 before:absolute before:top-2 before:bottom-2 before:left-[21px] before:w-0.5 before:bg-trait">
                  {v.paiements.map((p, i) => {
                    const mv = MODES_VISUELS[p.mode] ?? MODES_VISUELS.autre!;
                    return (
                      <li key={p.id} className={cn("apparition relative flex flex-wrap items-center gap-x-3 gap-y-2", p.annule && "opacity-50")} style={{ animationDelay: `${i * 60}ms` }}>
                        <span className="relative z-10 grid size-11 shrink-0 place-items-center rounded-full ring-4 ring-surface" style={{ background: mv.couleur, color: mv.texte }}>
                          <mv.icone size={20} weight="fill" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          {/* Seul le mode de paiement peut être coupé, jamais la date. */}
                          <p className="flex min-w-0 gap-1 font-bold"><span className="truncate">{MODES_PAIEMENT[p.mode]?.libelle}</span><span className="shrink-0 font-medium whitespace-nowrap text-encre-3">· {formatDate(p.date)}</span></p>
                          <p className="truncate font-mono text-[12px] text-encre-3">{p.numero_recu}{p.reference ? ` · ${p.reference}` : ""}{p.annule ? " · annulé" : ""}</p>
                        </div>
                        <Montant valeur={p.montant_xof} devise={null} className={cn("shrink-0", p.montant_xof < 0 ? "text-perte-texte" : "text-gain-texte")} />
                        {!p.annule && (
                          <div className="flex shrink-0 basis-full gap-2 pl-14 sm:basis-auto sm:pl-0">
                            <button type="button" onClick={() => void agir("recu", "telecharger", p.id)} className="onde inline-flex h-11 items-center gap-1 rounded-full bg-surface-2 px-3 text-[12px] font-semibold text-encre-2 hover:bg-primaire-voile hover:text-primaire lg:h-10">
                              <FilePdf size={16} weight="duotone" aria-hidden /> Reçu
                            </button>
                            {peutAnnuler && (
                              <button type="button" onClick={() => setAnnulerPaiement(p.id)} aria-label={`Annuler le versement ${p.numero_recu}`} className="onde inline-flex h-11 items-center gap-1 rounded-full px-3 text-[12px] font-semibold text-encre-3 hover:bg-perte-voile hover:text-perte-texte lg:h-10">
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
              <section className="carte apparition p-4 lg:p-6" aria-labelledby="titre-echeances">
                <h2 id="titre-echeances" className="mb-3 text-[18px] font-bold">Échéancier</h2>
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

          <aside className="flex min-w-0 flex-col gap-4 lg:col-span-5 lg:gap-6 xl:col-span-4">
            <section className="carte apparition p-4 lg:p-6">
              <h2 className="mb-2 text-[18px] font-bold">Montants</h2>
              <Registre lignes={[
                ...(v.remise_xof ? [{ libelle: "Prix", valeur: formatNombre(v.prix_xof) }, { libelle: "Remise", valeur: `− ${formatNombre(v.remise_xof)}` }] : []),
                ...(v.tva_taux > 0 ? [{ libelle: "Hors taxes", valeur: formatNombre(v.montant_ht) }, { libelle: `TVA ${v.tva_taux}%`, valeur: formatNombre(v.montant_tva) }] : []),
                { libelle: "Total TTC", valeur: `${formatNombre(v.montant_ttc)} FCFA`, fort: true },
                { libelle: "Encaissé", valeur: `${formatNombre(v.encaisse_xof)} FCFA` },
                { libelle: "Reste", valeur: `${formatNombre(v.reste_xof)} FCFA`, fort: v.reste_xof > 0 },
              ]} />
              {v.prix_revient_xof !== null && (
                // Libellé et valeur passent à la ligne comme un tout : la valeur n'est jamais coupée, le pourcentage
                // s'écrit à la française (virgule, espace insécable avant %).
                <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-xl bg-gain-voile px-3 py-2">
                  <span className="text-[14px] font-semibold text-gain-texte">Marge sur cette vente</span>
                  <span className={cn("chiffres font-extrabold whitespace-nowrap", (v.marge_xof ?? 0) < 0 ? "text-perte-texte" : "text-gain-texte")}>{formatNombre(v.marge_xof ?? 0)} {v.marge_pct !== null && <span className="text-[12px]">({formatNombre(v.marge_pct, Number.isInteger(v.marge_pct) ? 0 : 1)}{" "}%)</span>}</span>
                </div>
              )}
              {annulee && v.a_rembourser_xof > 0 && peutEncaisser && <Bouton variante="secondaire" className="mt-4" onClick={() => setFeuille("rembourser")}>Rembourser {formatNombre(v.a_rembourser_xof)} FCFA</Bouton>}
            </section>
            {v.client.telephone && (
              <section className="carte apparition p-4 lg:p-6">
                <h2 className="mb-3 text-[18px] font-bold">Joindre {prenom}</h2>
                <div className="grid grid-cols-2 gap-2">
                  <a href={`tel:${v.client.telephone}`} className="onde flex h-12 items-center justify-center gap-2 rounded-controle bg-primaire-voile font-semibold text-primaire transition-transform hover:-translate-y-px">
                    <Phone size={20} weight="fill" aria-hidden /> Appeler
                  </a>
                  <a href={lienWhatsApp(v.client.telephone, `Bonjour ${v.client.nom},`)} target="_blank" rel="noopener" className="onde flex h-12 items-center justify-center gap-2 rounded-controle bg-marque-whatsapp font-semibold text-sur-marque-whatsapp transition-transform hover:-translate-y-px">
                    <WhatsappLogo size={20} weight="fill" aria-hidden /> WhatsApp
                  </a>
                </div>
                {v.vendeur_nom && <p className="mt-3 text-[14px] text-encre-3">Vendu par {v.vendeur_nom}</p>}
              </section>
            )}
          </aside>
        </div>
      </div>

      {!annulee && v.reste_xof > 0 && peutEncaisser && (
        <div className="zone-sure-bas fixed inset-x-0 bottom-16 z-30 border-t border-trait/70 bg-surface/90 px-4 py-3 shadow-barre-bas backdrop-blur-xl lg:hidden">
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
