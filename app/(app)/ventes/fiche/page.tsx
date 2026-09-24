"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, Download, FileText, MessageCircle, Phone, Printer, Receipt, ShieldX, Truck, XCircle,
} from "lucide-react";
import { useEcriture, useLecture } from "@/lib/api/requetes";
import { useParametres } from "@/lib/api/parametres";
import { useOrg } from "@/lib/session";
import type { VenteDetail } from "@/lib/api/types-metier";
import type { SnapshotDocument } from "@/lib/documents/depuis-vente";
import { peut, MODES_PAIEMENT } from "@/lib/domaine";
import { formatDate, formatDateLongue, aujourdhui } from "@/lib/format";
import { grouperVin } from "@/lib/vin";
import { lienWhatsApp, remplirModele } from "@/lib/whatsapp";
import { cn } from "@/lib/cn";
import { EnTetePage } from "@/components/coque/coque";
import { Registre } from "@/components/metier/registre";
import { FeuilleEncaisser } from "@/components/ventes/feuille-encaisser";
import { FeuilleAnnulerVente } from "@/components/ventes/feuille-annuler-vente";
import { FeuilleAnnulerPaiement } from "@/components/ventes/feuille-annuler-paiement";
import { Bouton, BoutonIcone } from "@/components/ui/bouton";
import { MenuActions } from "@/components/ui/menu";
import { EtatErreur, Squelette } from "@/components/ui/etats";
import { Montant, StatutTexte, Tampon } from "@/components/ui/signature";
import { Section } from "@/components/ui/section";
import { PhotoVehicule } from "@/components/metier/photo-vehicule";

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

  if (!id) return <EtatErreur erreur={new Error("Aucune vente indiquée.")} />;
  if (error && !v) return <EtatErreur erreur={error} onReessayer={() => void refetch()} />;
  if (isPending || !v || !reglages) {
    return <div className="flex flex-col gap-4"><Squelette className="h-40" /><Squelette className="h-64" /></div>;
  }

  const annulee = v.statut === "annulee";
  const soldee = !annulee && v.reste_xof === 0;
  const peutEncaisser = peut(org.role, "encaisser");
  const peutAnnuler = peut(org.role, "annulerVente");
  const peutLivrer = peut(org.role, "vendre");

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

  const menu = [
    { libelle: "Télécharger la facture", icone: <Download className="size-4" />, onSelect: () => void agir("facture", "telecharger") },
    { libelle: "Imprimer", icone: <Printer className="size-4" />, onSelect: () => void agir("facture", "imprimer") },
    { libelle: "Envoyer sur WhatsApp", icone: <MessageCircle className="size-4" />, onSelect: () => void envoyerWhatsApp(), masque: !v.client.telephone },
    { libelle: "Marquer livré", icone: <Truck className="size-4" />, onSelect: () => livrer.executer({ p_org: org.id, p_vente_id: v.id, p_date: aujourdhui() }), masque: annulee || v.livree || !peutLivrer },
    { libelle: "Relancer sur WhatsApp", icone: <MessageCircle className="size-4" />, onSelect: relancer, masque: annulee || v.reste_xof === 0 || !v.client.telephone },
    { libelle: "Télécharger l'avoir", icone: <ShieldX className="size-4" />, onSelect: () => void agir("avoir", "telecharger"), masque: !annulee },
    { libelle: "Annuler la vente", icone: <XCircle className="size-4" />, danger: true, onSelect: () => setFeuille("annuler"), masque: annulee || !peutAnnuler },
  ];

  return (
    <div className="pb-24 lg:pb-0">
      <Link href="/ventes/" className="mb-2 inline-flex h-10 items-center gap-1.5 text-corps text-encre-2 hover:text-encre"><ArrowLeft className="size-4" aria-hidden /> Ventes</Link>
      <EnTetePage
        titre={<span className="font-mono">{v.numero}</span>}
        surtitre={formatDateLongue(v.date_vente)}
        actions={
          <>
            {annulee ? <Tampon type="annule" grand /> : soldee ? <Tampon type="solde" /> : null}
            {!annulee && !v.livree && <StatutTexte type="a_livrer" />}
            <MenuActions entrees={menu} declencheur={<BoutonIcone libelle="Actions"><FileText className="size-5" /></BoutonIcone>} />
          </>
        }
      />

      <div className="grid gap-8 lg:grid-cols-12 lg:gap-x-10">
        <Section titre="Montants" className="lg:col-span-7">
          <div className="pt-1 pb-4">
            {annulee ? (
              <p className="figure text-chiffre text-perte">Annulée</p>
            ) : soldee ? (
              <p className="figure text-chiffre text-gain">Soldée</p>
            ) : (
              <>
                <p className="etiquette text-petit text-encre-3">Reste à encaisser</p>
                <Montant valeur={v.reste_xof} taille="xl" className="text-ocre" />
              </>
            )}
            {!annulee && v.montant_ttc > 0 && (
              <>
                <div className="mt-3 flex h-3 w-full bg-trait" role="img" aria-label={`${v.encaisse_xof.toLocaleString("fr-FR")} FCFA encaissés sur ${v.montant_ttc.toLocaleString("fr-FR")}`}>
                  <span className="h-full bg-encre" style={{ width: `${Math.min(100, (v.encaisse_xof / v.montant_ttc) * 100)}%` }} />
                </div>
                <p className="mt-1 text-petit text-encre-3">Encaissé {v.encaisse_xof.toLocaleString("fr-FR")} sur {v.montant_ttc.toLocaleString("fr-FR")} FCFA</p>
              </>
            )}
          </div>
          <Registre lignes={[
            ...(v.remise_xof ? [{ libelle: "Prix", valeur: v.prix_xof.toLocaleString("fr-FR") }, { libelle: "Remise", valeur: `− ${v.remise_xof.toLocaleString("fr-FR")}` }] : []),
            ...(v.tva_taux > 0 ? [{ libelle: "Hors taxes", valeur: v.montant_ht.toLocaleString("fr-FR") }, { libelle: `TVA ${v.tva_taux}%`, valeur: v.montant_tva.toLocaleString("fr-FR") }] : []),
            { libelle: "Total TTC", valeur: `${v.montant_ttc.toLocaleString("fr-FR")} FCFA`, fort: true },
            { libelle: "Encaissé", valeur: `${v.encaisse_xof.toLocaleString("fr-FR")} FCFA` },
            { libelle: "Reste", valeur: `${v.reste_xof.toLocaleString("fr-FR")} FCFA`, fort: v.reste_xof > 0 },
          ]} />
          {v.prix_revient_xof !== null && (
            <p className="mt-2 border-t border-trait pt-2 text-encre-2">
              Marge : <span className={cn("chiffres font-semibold", (v.marge_xof ?? 0) < 0 ? "text-perte" : "text-gain")}>{v.marge_xof?.toLocaleString("fr-FR")} FCFA</span> {v.marge_pct !== null && `(${v.marge_pct}%)`}
            </p>
          )}
          {!annulee && v.reste_xof > 0 && peutEncaisser && <Bouton variante="primaire" className="mt-4 hidden lg:inline-flex" icone={<Receipt className="size-4" />} onClick={() => setFeuille("encaisser")}>Encaisser</Bouton>}
          {annulee && v.a_rembourser_xof > 0 && peutEncaisser && <Bouton variante="secondaire" className="mt-4" onClick={() => setFeuille("rembourser")}>Rembourser {v.a_rembourser_xof.toLocaleString("fr-FR")} FCFA</Bouton>}
        </Section>

        <aside className="flex min-w-0 flex-col gap-8 lg:col-span-5 lg:row-span-3">
          <Section titre="Véhicule">
            <Link href={`/parc/vehicule/?id=${v.vehicule.id}`} className="block">
              <PhotoVehicule path={v.vehicule.photo_principale_path} alt={v.vehicule.libelle} className="aspect-[4/3] w-full" />
              <span className="mt-2 block font-semibold hover:underline">{v.vehicule.libelle}</span>
            </Link>
            {v.vehicule.vin && <p className="mt-0.5 font-mono text-petit text-encre-3">{grouperVin(v.vehicule.vin)}</p>}
            {v.vendeur_nom && <p className="mt-1 text-petit text-encre-3">Vendu par {v.vendeur_nom}</p>}
          </Section>
          <Section titre="Client">
            <Link href={`/clients/fiche/?id=${v.client.id}`} className="font-semibold hover:underline">{v.client.nom}</Link>
            {v.client.ville && <p className="text-petit text-encre-3">{v.client.ville}</p>}
            {v.client.telephone && (
              <div className="mt-3 flex gap-2">
                <a href={`tel:${v.client.telephone}`} className="inline-flex h-11 items-center gap-1.5 rounded-controle bg-surface-2 px-3 hover:bg-trait lg:h-9"><Phone className="size-3.5" aria-hidden /> Appeler</a>
                <a href={lienWhatsApp(v.client.telephone, `Bonjour ${v.client.nom},`)} target="_blank" rel="noopener" className="inline-flex h-11 items-center gap-1.5 rounded-controle bg-surface-2 px-3 hover:bg-trait lg:h-9"><MessageCircle className="size-3.5" aria-hidden /> WhatsApp</a>
              </div>
            )}
          </Section>
        </aside>

        <Section titre="Versements" compteur={v.paiements.filter((p) => !p.annule).length} className="lg:col-span-7">
          {v.paiements.length === 0 ? <p className="py-3 text-encre-3">Aucun versement.</p> : (
            <ul>
              {v.paiements.map((p) => (
                <li key={p.id} className={cn("flex items-center gap-3 border-b border-trait py-3 last:border-b-0", p.annule && "opacity-50")}>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{formatDate(p.date)} · {MODES_PAIEMENT[p.mode]?.libelle}{p.reference ? ` · ${p.reference}` : ""}</p>
                    <p className="font-mono text-petit text-encre-3">{p.numero_recu}{p.annule ? " · annulé" : ""}</p>
                  </div>
                  <Montant valeur={p.montant_xof} devise={null} className={p.montant_xof < 0 ? "text-perte" : undefined} />
                  {!p.annule && (
                    <>
                      <BoutonIcone libelle="Télécharger le reçu" onClick={() => void agir("recu", "telecharger", p.id)}><Download className="size-4" /></BoutonIcone>
                      {peutAnnuler && <BoutonIcone libelle="Annuler ce paiement" onClick={() => setAnnulerPaiement(p.id)}><XCircle className="size-4" /></BoutonIcone>}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>

        {v.echeances.length > 0 && (
          <Section titre="Échéancier" className="lg:col-span-7">
            <ul>
              {v.echeances.map((e) => (
                <li key={e.id} className="flex items-center gap-3 border-b border-trait py-3 last:border-b-0">
                  <span className="flex-1">{formatDate(e.date_echeance)}</span>
                  <span className={cn("etiquette text-petit", e.statut === "en_retard" ? "text-perte" : e.statut === "payee" ? "text-gain" : "text-encre-3")}>{LIBELLES_ECHEANCE[e.statut]}</span>
                  <Montant valeur={e.montant_xof} devise={null} />
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      {!annulee && v.reste_xof > 0 && peutEncaisser && (
        <div className="zone-sure-bas fixed inset-x-0 bottom-16 z-30 border-t border-trait bg-surface px-4 py-3 lg:hidden">
          <Bouton variante="primaire" pleineLargeur onClick={() => setFeuille("encaisser")}>Encaisser</Bouton>
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
