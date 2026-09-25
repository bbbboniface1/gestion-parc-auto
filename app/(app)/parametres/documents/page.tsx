"use client";

import { useRef, useState } from "react";
import { Eye } from "@phosphor-icons/react";
import { toast } from "sonner";
import type { Parametres } from "@/lib/api/parametres";
import { formaterNumero, JETONS_NUMERO, verifierFormat } from "@/lib/numerotation";
import { remplirModele } from "@/lib/whatsapp";
import { formatNombre } from "@/lib/format";
import { urlFichier } from "@/lib/stockage";
import { cn } from "@/lib/cn";
import type { DonneesDocument } from "@/lib/documents/types";
import { EnTetePage } from "@/components/coque/coque";
import { BarreEnregistrement, Groupe, useBrouillon } from "@/components/parametres/commun";
import { Bouton } from "@/components/ui/bouton";
import { Champ, ChampNombre, Interrupteur, ZoneTexte } from "@/components/ui/champ";
import { EtatErreur, SqueletteListe } from "@/components/ui/etats";
import { Code } from "@/components/ui/signature";

const COULEURS = ["#B5461E", "#1B1D22", "#1F6F7A", "#1B7148", "#2F5A7A", "#7A3E5D"];
const VARIABLES_WHATSAPP = [
  ["client", "Moussa Traoré"], ["numero", "FAC-2026-0047"], ["montant", "14 500 000 FCFA"],
  ["reste", "7 500 000 FCFA"], ["vehicule", "Toyota RAV4 2018"], ["entreprise", "Sahel Auto Import"],
] as const;
const MODELE_PAR_DEFAUT = "Bonjour {client}, voici votre facture {numero} pour le {vehicule} : {montant}. Reste à payer : {reste}. Merci de votre confiance, {entreprise}.";

/** Document d'exemple construit avec les réglages en cours (même non enregistrés). */
function documentExemple(p: Parametres, logo: string | null, cachet: string | null, signature: string | null): DonneesDocument {
  const ttc = 14_500_000;
  const ht = p.tva_active ? Math.round(ttc / (1 + p.tva_taux / 100)) : ttc;
  return {
    type: "facture",
    numero: formaterNumero(p.format_numero, p.prefixe_facture, new Date(), 47, p.padding),
    date: new Date().toISOString().slice(0, 10),
    entreprise: {
      nom: p.nom_commercial, raison_sociale: p.raison_sociale, slogan: p.slogan, adresse: p.adresse, ville: p.ville, pays: p.pays,
      telephones: p.telephones, email: p.email, site_web: p.site_web, nif: p.nif, rccm: p.rccm, compte_bancaire: p.compte_bancaire,
      logo, cachet, signature,
    },
    client: { nom: "Moussa Traoré", telephone: "+223 76 00 11 22", ville: "Bamako", type_piece: "NINA", numero_piece: "1 98 07 01 0234 56" },
    vehicule: { marque: "Toyota", modele: "RAV4", finition: "XLE", annee: 2018, vin: "2T3RFREV0JW812345", couleur: "Gris", kilometrage_km: 68412, carburant: "Essence", transmission: "Automatique" },
    lignes: [{ designation: "Toyota RAV4 XLE 2018", detail: "Exemple — véhicule importé, dédouané", montant: ht }],
    tva: { active: p.tva_active, taux: p.tva_taux, mention: p.mention_tva },
    totaux: { ht, tva: ttc - ht, ttc },
    paiements: [{ date: new Date().toISOString().slice(0, 10), montant: 7_000_000, mode: "orange_money", reference: "MP260924.1532.C84121", numero_recu: formaterNumero(p.format_numero, p.prefixe_recu, new Date(), 113, p.padding) }],
    echeances: [{ date: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10), montant: 7_500_000, statut: "a_venir" }],
    mentions: { conditions: p.conditions_vente, pied: p.pied_document, garantie: p.garantie_texte },
    options: { montant_en_lettres: p.montant_en_lettres, qr_verification: p.qr_verification, couleur: p.couleur_documents },
    url_verification: `${window.location.origin}/verifier/?t=exemple-de-verification`,
  };
}

export default function PageDocuments() {
  const { brouillon: p, maj, sale, enregistrement, enregistrer, annuler, erreur, recharger } = useBrouillon();
  const [apercu, setApercu] = useState(false);
  const zoneMessage = useRef<HTMLTextAreaElement>(null);
  if (erreur && !p) return <EtatErreur erreur={erreur} onReessayer={() => void recharger()} />;
  if (!p) return <SqueletteListe lignes={4} />;

  const erreurFormat = verifierFormat(p.format_numero);
  const exemple = (prefixe: string) => erreurFormat ? "—" : formaterNumero(p.format_numero, prefixe, new Date(), 1, p.padding);
  const modele = p.modele_message_whatsapp ?? "";

  async function ouvrirApercu() {
    if (!p) return;
    setApercu(true);
    try {
      const [{ genererPDF }, logo, cachet, signature] = await Promise.all([
        import("@/lib/documents/generer"), urlFichier(p.logo_path), urlFichier(p.cachet_path), urlFichier(p.signature_path),
      ]);
      const blob = await genererPDF(documentExemple(p, logo, cachet, signature));
      window.open(URL.createObjectURL(blob), "_blank", "noopener");
    } catch {
      toast.error("Aperçu impossible pour le moment.");
    } finally {
      setApercu(false);
    }
  }

  function insererVariable(v: string) {
    const zone = zoneMessage.current;
    const texte = `{${v}}`;
    if (!zone) { maj("modele_message_whatsapp", modele + texte); return; }
    const debut = zone.selectionStart ?? modele.length;
    const fin = zone.selectionEnd ?? modele.length;
    maj("modele_message_whatsapp", modele.slice(0, debut) + texte + modele.slice(fin));
    requestAnimationFrame(() => { zone.focus(); zone.setSelectionRange(debut + texte.length, debut + texte.length); });
  }

  return (
    <>
      <EnTetePage
        titre="Documents et facturation"
        sousTitre="Factures, proformas, reçus et avoirs."
        actions={<Bouton icone={<Eye className="size-4" />} chargement={apercu} onClick={() => void ouvrirApercu()}>Aperçu d&apos;une facture</Bouton>}
      />
      <div className="carte px-4 py-6 lg:px-8">
        <Groupe titre="Numérotation" description="Numéros attribués par le serveur, sans trou ni doublon. Une vente annulée garde son numéro et reçoit un avoir.">
          <Champ libelle="Format" mono value={p.format_numero} onChange={(e) => maj("format_numero", e.target.value)} erreur={erreurFormat} />
          <div className="flex flex-wrap gap-1.5" aria-label="Jetons disponibles">
            {JETONS_NUMERO.map((j) => (
              <button key={j} type="button" onClick={() => maj("format_numero", p.format_numero + j)}
                className="h-8 rounded-[4px] border border-trait px-2 font-mono text-[12px] text-encre-2 hover:bg-surface-2">{j}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {([
              ["prefixe_facture", "Factures"], ["prefixe_proforma", "Proformas"], ["prefixe_recu", "Reçus"],
              ["prefixe_avoir", "Avoirs"], ["prefixe_vehicule", "Véhicules"], ["prefixe_expedition", "Expéditions"],
            ] as const).map(([cle, libelle]) => (
              <Champ key={cle} libelle={libelle} mono maxLength={8} value={p[cle]} onChange={(e) => maj(cle, e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ChampNombre libelle="Chiffres du numéro" valeur={p.padding} onChange={(v) => maj("padding", v ?? 4)} min={1} max={8} unite="chiffres" />
            <div className="flex items-end pb-1"><Interrupteur libelle="Repartir à 1 chaque année" actif={p.remise_annuelle} onChange={(v) => maj("remise_annuelle", v)} /></div>
          </div>
          <p className="rounded-controle bg-surface-2 px-3 py-2 text-[14px] text-encre-2">
            Exemples : <Code className="text-encre">{exemple(p.prefixe_facture)}</Code> · <Code className="text-encre">{exemple(p.prefixe_recu)}</Code> · <Code className="text-encre">{exemple(p.prefixe_avoir)}</Code>
          </p>
        </Groupe>

        <Groupe titre="TVA" description="Si votre entreprise n'est pas assujettie, indiquez la mention légale à imprimer.">
          <Interrupteur libelle="Facturer la TVA" description="Les prix saisis sont TTC ; le HT et la TVA sont calculés." actif={p.tva_active} onChange={(v) => maj("tva_active", v)} />
          {p.tva_active ? (
            <ChampNombre libelle="Taux de TVA" valeur={p.tva_taux} onChange={(v) => maj("tva_taux", v ?? 18)} min={0} max={99} decimales={2} unite="%" />
          ) : (
            <Champ libelle="Mention" placeholder="TVA non applicable." value={p.mention_tva ?? ""} onChange={(e) => maj("mention_tva", e.target.value || null)} />
          )}
        </Groupe>

        <Groupe titre="Mentions" description="Imprimées en bas de chaque facture.">
          <ZoneTexte libelle="Conditions de vente" rows={3} value={p.conditions_vente ?? ""} onChange={(e) => maj("conditions_vente", e.target.value || null)}
            placeholder="Tout acompte versé reste acquis en cas de désistement. Le véhicule reste la propriété du vendeur jusqu'au paiement intégral." />
          <ZoneTexte libelle="Garantie" facultatif rows={2} value={p.garantie_texte ?? ""} onChange={(e) => maj("garantie_texte", e.target.value || null)}
            placeholder="Garantie moteur et boîte : 3 mois ou 3 000 km." />
          <Champ libelle="Pied de page" facultatif value={p.pied_document ?? ""} onChange={(e) => maj("pied_document", e.target.value || null)}
            aide="Par défaut : nom, RCCM et NIF." />
          <ChampNombre libelle="Validité des proformas" valeur={p.validite_proforma_jours} onChange={(v) => maj("validite_proforma_jours", v ?? 15)} min={1} max={365} unite="jours" />
        </Groupe>

        <Groupe titre="Présentation">
          <Interrupteur libelle="Montant en toutes lettres" description="« Arrêtée la présente facture à la somme de : quatorze millions… »" actif={p.montant_en_lettres} onChange={(v) => maj("montant_en_lettres", v)} />
          <Interrupteur libelle="QR code de vérification" description="Le client scanne et vérifie que la facture existe vraiment et n'a pas été annulée." actif={p.qr_verification} onChange={(v) => maj("qr_verification", v)} />
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium text-encre-2">Couleur d&apos;accent</legend>
            <div className="flex flex-wrap items-center gap-2">
              {COULEURS.map((c) => (
                <button key={c} type="button" aria-label={`Couleur ${c}`} aria-pressed={p.couleur_documents.toUpperCase() === c}
                  onClick={() => maj("couleur_documents", c)}
                  className={cn("size-9 rounded-controle border-2", p.couleur_documents.toUpperCase() === c ? "border-encre" : "border-transparent")}
                  style={{ background: c }} />
              ))}
              <label className="ml-1 flex items-center gap-2 text-[13px] text-encre-2">
                Autre
                <input type="color" value={p.couleur_documents} onChange={(e) => maj("couleur_documents", e.target.value.toUpperCase())} className="h-9 w-12 cursor-pointer rounded-controle border border-trait" />
              </label>
            </div>
          </fieldset>
        </Groupe>

        <Groupe titre="Message WhatsApp" description="Envoyé avec la facture. Touchez une variable pour l'insérer à l'endroit du curseur.">
          <ZoneTexte ref={zoneMessage} libelle="Modèle" rows={4} value={modele} placeholder={MODELE_PAR_DEFAUT}
            onChange={(e) => maj("modele_message_whatsapp", e.target.value || null)} />
          <div className="flex flex-wrap gap-1.5">
            {VARIABLES_WHATSAPP.map(([v]) => (
              <button key={v} type="button" onClick={() => insererVariable(v)} className="h-8 rounded-[4px] border border-trait bg-surface-2/50 px-2 font-mono text-[12px] text-encre-2 hover:bg-surface-2">{`{${v}}`}</button>
            ))}
          </div>
          <div className="rounded-carte bg-[#e7f7e1] p-3 text-[14px] text-[#17171a] dark:bg-[#1f3a24] dark:text-sur-nuit">
            <p className="etiquette mb-1 text-[11px] opacity-70">Aperçu</p>
            <p className="whitespace-pre-line">{remplirModele(modele || MODELE_PAR_DEFAUT, Object.fromEntries(VARIABLES_WHATSAPP))}</p>
          </div>
          {!modele && <Bouton variante="fantome" taille="sm" className="self-start" onClick={() => maj("modele_message_whatsapp", MODELE_PAR_DEFAUT)}>Utiliser le modèle proposé</Bouton>}
        </Groupe>
      </div>
      <p className="mt-3 text-[13px] text-encre-3">
        Les factures déjà émises ne changent pas : elles gardent les informations du jour de leur émission. Montant de l&apos;exemple : {formatNombre(14_500_000)} FCFA.
      </p>
      <BarreEnregistrement sale={sale} enregistrement={enregistrement} onEnregistrer={enregistrer} onAnnuler={annuler} />
    </>
  );
}
