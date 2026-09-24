// Modèle PDF unique pour facture, proforma, reçu et avoir.
// Sobre et imprimable en noir et blanc : la couleur du document (latérite par défaut)
// n'apparaît qu'en filet d'accent et dans les tampons.

import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { DonneesDocument, EcheanceDocument, PaiementDocument } from "@/lib/documents/types";
import { montantEnLettres } from "@/lib/lettres";
import { formatDateLongue, formatDate, formatNombre } from "@/lib/format";
import { grouperVin } from "@/lib/vin";
import { MODES_PAIEMENT, type ModePaiement } from "@/lib/domaine";

let policesEnregistrees = false;
export function enregistrerPolices(origine = "") {
  if (policesEnregistrees) return;
  Font.register({
    family: "Schibsted",
    fonts: [400, 500, 600, 700].map((w) => ({ src: `${origine}/polices/schibsted-grotesk-${w}.woff`, fontWeight: w })),
  });
  Font.register({ family: "PlexMono", src: `${origine}/polices/ibm-plex-mono-500.woff`, fontWeight: 500 });
  Font.register({ family: "Barlow", src: `${origine}/polices/barlow-condensed-600.woff`, fontWeight: 600 });
  // Pas de coupure de mots : un nom de client ou un montant ne se coupe jamais.
  Font.registerHyphenationCallback((mot) => [mot]);
  policesEnregistrees = true;
}

const ENCRE = "#17171A";
const ENCRE_2 = "#5B5A57";
const ENCRE_3 = "#6B6861";
const TRAIT = "#E3DED3";
const FOND = "#F5F3EE";
const GAIN = "#1B7148";
const PERTE = "#B3261E";

const TITRES: Record<DonneesDocument["type"], string> = {
  facture: "FACTURE",
  proforma: "FACTURE PROFORMA",
  recu: "REÇU DE PAIEMENT",
  avoir: "AVOIR",
};

const s = StyleSheet.create({
  page: { fontFamily: "Schibsted", fontSize: 9, color: ENCRE, paddingTop: 30, paddingBottom: 52, paddingHorizontal: 40, lineHeight: 1.3 },
  filet: { position: "absolute", top: 0, left: 0, right: 0, height: 5 },
  entete: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  identite: { flexDirection: "row", gap: 12, maxWidth: 300 },
  logo: { width: 52, height: 52, objectFit: "contain" },
  nom: { fontSize: 15, fontWeight: 700, letterSpacing: -0.2, lineHeight: 1.2, marginBottom: 1 },
  petit: { fontSize: 8, color: ENCRE_2, lineHeight: 1.35 },
  bloctitre: { alignItems: "flex-end" },
  titre: { fontFamily: "Barlow", fontSize: 22, letterSpacing: 1.4, lineHeight: 1.1 },
  numero: { fontFamily: "PlexMono", fontSize: 10.5, marginTop: 3, lineHeight: 1.2 },
  surtitre: { fontFamily: "Barlow", fontSize: 8.5, letterSpacing: 0.8, color: ENCRE_3, marginBottom: 4 },
  regle: { borderBottomWidth: 1, borderBottomColor: TRAIT, marginVertical: 12 },
  colonnes: { flexDirection: "row", gap: 14 },
  boite: { flex: 1, borderWidth: 1, borderColor: TRAIT, borderRadius: 4, paddingVertical: 8, paddingHorizontal: 10 },
  valeurForte: { fontSize: 11, fontWeight: 600, marginBottom: 3, lineHeight: 1.25 },
  ligneInfo: { flexDirection: "row", marginTop: 1.5 },
  libelleInfo: { width: 70, color: ENCRE_3 },
  mono: { fontFamily: "PlexMono", fontSize: 9 },
  tableau: { marginTop: 12 },
  teteTableau: { flexDirection: "row", backgroundColor: FOND, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 3 },
  ligneTableau: { flexDirection: "row", paddingVertical: 4.5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: TRAIT },
  celluleTete: { fontFamily: "Barlow", fontSize: 8.5, letterSpacing: 0.8, color: ENCRE_3 },
  droite: { textAlign: "right" },
  totaux: { marginTop: 8, alignSelf: "flex-end", width: 250 },
  ligneTotal: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  total: { flexDirection: "row", justifyContent: "space-between", paddingTop: 7, marginTop: 4, borderTopWidth: 1.5 },
  totalTexte: { fontSize: 12, fontWeight: 700, lineHeight: 1.2 },
  lettres: { marginTop: 10, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: FOND, borderRadius: 3 },
  // react-pdf 4.9 ignore « bottom » sur un élément fixe : on le place depuis le haut (A4 = 841,89 pt).
  basDePage: { position: "absolute", left: 40, right: 40, top: 804, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: TRAIT, paddingTop: 6 },
  tampon: { position: "absolute", borderWidth: 3, borderStyle: "solid", borderRadius: 3, paddingVertical: 5, paddingHorizontal: 10, fontFamily: "Barlow", fontSize: 22, letterSpacing: 1.5 },
});

const fcfa = (n: number) => `${formatNombre(Math.round(n))} FCFA`;
const mode = (m: string) => MODES_PAIEMENT[m as ModePaiement]?.libelle ?? m;
const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function Info({ libelle, valeur, mono }: { libelle: string; valeur?: string | number | null; mono?: boolean }) {
  if (valeur === null || valeur === undefined || valeur === "") return null;
  return (
    <View style={s.ligneInfo}>
      <Text style={s.libelleInfo}>{libelle}</Text>
      <Text style={mono ? s.mono : undefined}>{String(valeur)}</Text>
    </View>
  );
}

function TableauPaiements({ paiements }: { paiements: PaiementDocument[] }) {
  return (
    <View wrap={false} style={{ marginTop: 10 }}>
      <Text style={s.surtitre}>VERSEMENTS REÇUS</Text>
      <View style={s.teteTableau}>
        <Text style={[s.celluleTete, { width: 80 }]}>DATE</Text>
        <Text style={[s.celluleTete, { width: 90 }]}>MODE</Text>
        <Text style={[s.celluleTete, { flex: 1 }]}>RÉFÉRENCE</Text>
        <Text style={[s.celluleTete, s.droite, { width: 110 }]}>MONTANT</Text>
      </View>
      {paiements.map((p, i) => (
        <View key={i} style={s.ligneTableau}>
          <Text style={{ width: 80 }}>{formatDate(p.date)}</Text>
          <Text style={{ width: 90 }}>{mode(p.mode)}</Text>
          <Text style={[s.mono, { flex: 1, fontSize: 8 }]}>{[p.numero_recu, p.reference].filter(Boolean).join(" · ") || "—"}</Text>
          <Text style={[s.droite, { width: 110, color: p.montant < 0 ? PERTE : ENCRE }]}>{fcfa(p.montant)}</Text>
        </View>
      ))}
    </View>
  );
}

function TableauEcheances({ echeances }: { echeances: EcheanceDocument[] }) {
  const libelles = { payee: "Payée", partielle: "Partielle", en_retard: "En retard", a_venir: "À venir" } as const;
  return (
    <View wrap={false} style={{ marginTop: 10 }}>
      <Text style={s.surtitre}>ÉCHÉANCIER</Text>
      {echeances.map((e, i) => (
        <View key={i} style={s.ligneTableau}>
          <Text style={{ width: 24, color: ENCRE_3 }}>{i + 1}.</Text>
          <Text style={{ flex: 1 }}>{formatDateLongue(e.date)}</Text>
          <Text style={{ width: 90, color: e.statut === "en_retard" ? PERTE : e.statut === "payee" ? GAIN : ENCRE_2 }}>{e.statut ? libelles[e.statut] : ""}</Text>
          <Text style={[s.droite, { width: 110 }]}>{fcfa(e.montant)}</Text>
        </View>
      ))}
    </View>
  );
}

export function DocumentPDF({ d }: { d: DonneesDocument }) {
  const accent = d.options?.couleur || "#B5461E";
  const e = d.entreprise;
  const encaisse = (d.paiements ?? []).reduce((t, p) => t + p.montant, 0);
  const reste = Math.max(0, d.totaux.ttc - encaisse);
  // Le tampon « ANNULÉE » va sur la facture annulée ; l'avoir, lui, est le document d'annulation.
  const annulee = d.annule && d.type !== "avoir";
  const solde = d.type === "facture" && !d.annule && d.totaux.ttc > 0 && reste === 0;
  const montantPrincipal = d.type === "recu" ? d.paiement?.montant ?? 0 : d.totaux.ttc;
  const telephones = (e.telephones ?? []).filter(Boolean).join(" · ");
  const vin = d.vehicule?.vin ? grouperVin(d.vehicule.vin) : null;

  return (
    <Document title={`${TITRES[d.type]} ${d.numero}`} author={e.nom} creator={e.nom} producer={e.nom} language="fr">
      <Page size="A4" style={s.page}>
        <View fixed style={[s.filet, { backgroundColor: accent }]} />
        <View fixed style={s.basDePage}>
          <Text style={[s.petit, { maxWidth: 420 }]}>{d.mentions?.pied || [e.nom, e.rccm && `RCCM ${e.rccm}`, e.nif && `NIF ${e.nif}`].filter(Boolean).join(" · ")}</Text>
          <Text style={s.petit} render={({ pageNumber, totalPages }) => `${d.numero} · ${pageNumber}/${totalPages}`} />
        </View>

        {/* ── En-tête : émetteur et document ─────────────────────────────── */}
        <View style={s.entete}>
          <View style={s.identite}>
            {e.logo ? <Image src={e.logo} style={s.logo} /> : null}
            <View style={{ flexShrink: 1 }}>
              <Text style={s.nom}>{e.nom}</Text>
              {e.raison_sociale && e.raison_sociale !== e.nom ? <Text style={s.petit}>{e.raison_sociale}</Text> : null}
              {e.slogan ? <Text style={[s.petit, { marginBottom: 3 }]}>{e.slogan}</Text> : null}
              <Text style={s.petit}>{[e.adresse, e.ville, e.pays].filter(Boolean).join(", ")}</Text>
              {telephones ? <Text style={s.petit}>Tél. {telephones}</Text> : null}
              {e.email || e.site_web ? <Text style={s.petit}>{[e.email, e.site_web].filter(Boolean).join(" · ")}</Text> : null}
              {e.nif || e.rccm ? (
                <Text style={[s.petit, { marginTop: 2 }]}>{[e.nif && `NIF ${e.nif}`, e.rccm && `RCCM ${e.rccm}`].filter(Boolean).join(" · ")}</Text>
              ) : null}
            </View>
          </View>
          <View style={s.bloctitre}>
            <Text style={[s.titre, { color: annulee ? PERTE : ENCRE }]}>{TITRES[d.type]}</Text>
            <Text style={s.numero}>N° {d.numero}</Text>
            <Text style={[s.petit, { marginTop: 3 }]}>Date : {formatDateLongue(d.date)}</Text>
            {d.type === "proforma" && d.valide_jusqu_au ? <Text style={s.petit}>Valable jusqu&apos;au {formatDateLongue(d.valide_jusqu_au)}</Text> : null}
            {d.reference_facture ? <Text style={s.petit}>Facture N° {d.reference_facture}</Text> : null}
          </View>
        </View>

        <View style={s.regle} />

        {/* ── Client et véhicule ───────────────────────────────────────────── */}
        <View style={s.colonnes}>
          <View style={s.boite}>
            <Text style={s.surtitre}>{d.type === "recu" ? "REÇU DE" : "CLIENT"}</Text>
            <Text style={s.valeurForte}>{d.client.nom}</Text>
            <Info libelle="Téléphone" valeur={d.client.telephone} />
            <Info libelle="Adresse" valeur={[d.client.adresse, d.client.ville].filter(Boolean).join(", ") || null} />
            <Info libelle={d.client.type_piece ?? "Pièce"} valeur={d.client.numero_piece} mono />
          </View>
          {d.vehicule ? (
            <View style={s.boite}>
              <Text style={s.surtitre}>VÉHICULE</Text>
              <Text style={s.valeurForte}>
                {[d.vehicule.marque, d.vehicule.modele, d.vehicule.finition].filter(Boolean).join(" ")} {d.vehicule.annee ?? ""}
              </Text>
              <Info libelle="VIN" valeur={vin} mono />
              <Info libelle="Couleur" valeur={d.vehicule.couleur} />
              <Info libelle="Kilométrage" valeur={d.vehicule.kilometrage_km ? `${formatNombre(d.vehicule.kilometrage_km)} km` : null} />
              <Info libelle="Motorisation" valeur={[d.vehicule.carburant, d.vehicule.transmission].filter(Boolean).join(" · ") || null} />
              {d.livraison_a_l_arrivee && d.type !== "avoir" ? <Text style={[s.petit, { marginTop: 5, color: accent }]}>Livraison à l&apos;arrivée du véhicule à Bamako.</Text> : null}
            </View>
          ) : null}
        </View>

        {/* ── Corps ────────────────────────────────────────────────────────── */}
        {d.type === "recu" && d.paiement ? (
          <View style={{ marginTop: 18 }}>
            <View style={s.ligneTotal}><Text style={{ color: ENCRE_2 }}>Mode de paiement</Text><Text>{mode(d.paiement.mode)}</Text></View>
            {d.paiement.reference ? <View style={s.ligneTotal}><Text style={{ color: ENCRE_2 }}>Référence de transaction</Text><Text style={s.mono}>{d.paiement.reference}</Text></View> : null}
            <View style={s.ligneTotal}><Text style={{ color: ENCRE_2 }}>Total de la facture</Text><Text>{fcfa(d.totaux.ttc)}</Text></View>
            <View style={s.ligneTotal}><Text style={{ color: ENCRE_2 }}>Total versé à ce jour</Text><Text>{fcfa(encaisse)}</Text></View>
            <View style={[s.total, { borderTopColor: ENCRE }]}>
              <Text style={s.totalTexte}>Montant reçu</Text>
              <Text style={s.totalTexte}>{fcfa(d.paiement.montant)}</Text>
            </View>
            <View style={s.ligneTotal}><Text style={{ color: ENCRE_2 }}>Reste à payer</Text><Text style={{ fontWeight: 600 }}>{fcfa(reste)}</Text></View>
          </View>
        ) : (
          <>
            <View style={s.tableau}>
              <View style={s.teteTableau}>
                <Text style={[s.celluleTete, { flex: 1 }]}>DÉSIGNATION</Text>
                <Text style={[s.celluleTete, s.droite, { width: 130 }]}>MONTANT</Text>
              </View>
              {d.lignes.map((l, i) => (
                <View key={i} style={s.ligneTableau} wrap={false}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 500 }}>{l.designation}</Text>
                    {l.detail ? <Text style={s.petit}>{l.detail}</Text> : null}
                  </View>
                  <Text style={[s.droite, { width: 130 }]}>{fcfa(l.montant)}</Text>
                </View>
              ))}
            </View>
            <View style={s.totaux} wrap={false}>
              {d.remise ? <View style={s.ligneTotal}><Text style={{ color: ENCRE_2 }}>Remise</Text><Text>− {fcfa(d.remise)}</Text></View> : null}
              {d.tva.active ? (
                <>
                  <View style={s.ligneTotal}><Text style={{ color: ENCRE_2 }}>Total hors taxes</Text><Text>{fcfa(d.totaux.ht)}</Text></View>
                  <View style={s.ligneTotal}><Text style={{ color: ENCRE_2 }}>TVA {formatNombre(d.tva.taux, d.tva.taux % 1 ? 1 : 0)} %</Text><Text>{fcfa(d.totaux.tva)}</Text></View>
                </>
              ) : null}
              <View style={[s.total, { borderTopColor: accent }]}>
                <Text style={s.totalTexte}>{d.type === "avoir" ? "Montant de l'avoir" : d.tva.active ? "Total TTC" : "Total"}</Text>
                <Text style={s.totalTexte}>{fcfa(d.totaux.ttc)}</Text>
              </View>
              {!d.tva.active && d.tva.mention ? <Text style={[s.petit, s.droite, { marginTop: 3 }]}>{d.tva.mention}</Text> : null}
            </View>
          </>
        )}

        {d.options?.montant_en_lettres !== false && montantPrincipal > 0 ? (
          <View style={s.lettres} wrap={false}>
            <Text>
              {d.type === "recu" ? "Reçu la somme de : " : d.type === "avoir" ? "Arrêté le présent avoir à la somme de : " : d.type === "proforma" ? "Arrêtée la présente proforma à la somme de : " : "Arrêtée la présente facture à la somme de : "}
              <Text style={{ fontWeight: 600 }}>{majuscule(montantEnLettres(montantPrincipal))}</Text>.
            </Text>
          </View>
        ) : null}

        {d.type === "avoir" && d.motif_annulation ? (
          <View style={{ marginTop: 12 }}><Text style={s.surtitre}>MOTIF</Text><Text>{d.motif_annulation}</Text></View>
        ) : null}

        {d.type === "facture" && d.paiements && d.paiements.length > 0 ? (
          <>
            <TableauPaiements paiements={d.paiements} />
            <View style={[s.ligneTotal, { marginTop: 6, alignSelf: "flex-end", width: 250 }]}>
              <Text style={{ fontWeight: 600 }}>Reste à payer</Text>
              <Text style={{ fontWeight: 700, color: reste > 0 ? ENCRE : GAIN }}>{fcfa(reste)}</Text>
            </View>
          </>
        ) : null}

        {d.echeances && d.echeances.length > 0 && (d.type === "facture" || d.type === "proforma") && !annulee ? <TableauEcheances echeances={d.echeances} /> : null}

        {/* ── Signatures et vérification ───────────────────────────────────── */}
        <View wrap={false} style={{ marginTop: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <View style={{ width: 230 }}>
            <Text style={s.surtitre}>CACHET ET SIGNATURE</Text>
            <View style={{ height: 70, borderWidth: 1, borderColor: TRAIT, borderStyle: "dashed", borderRadius: 4, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 4 }}>
              {e.cachet ? <Image src={e.cachet} style={{ height: 68, width: 68, objectFit: "contain" }} /> : null}
              {e.signature ? <Image src={e.signature} style={{ height: 52, width: 110, objectFit: "contain" }} /> : null}
            </View>
          </View>
          {d.options?.qr_verification !== false && d.qr ? (
            <View style={{ alignItems: "center", width: 120 }}>
              <Image src={d.qr} style={{ width: 70, height: 70 }} />
              <Text style={[s.petit, { textAlign: "center", marginTop: 3 }]}>Scannez pour vérifier l&apos;authenticité</Text>
            </View>
          ) : null}
        </View>

        {d.mentions?.garantie && d.type === "facture" ? <Text style={[s.petit, { marginTop: 12 }]}>{d.mentions.garantie}</Text> : null}
        {d.mentions?.conditions ? <Text style={[s.petit, { marginTop: 6 }]}>{d.mentions.conditions}</Text> : null}
        {d.type === "proforma" ? <Text style={[s.petit, { marginTop: 6 }]}>Cette proforma n&apos;est pas une facture. Elle vaut engagement de prix jusqu&apos;à sa date de validité.</Text> : null}
        {e.compte_bancaire ? <Text style={[s.petit, { marginTop: 6 }]}>Règlement par virement : {e.compte_bancaire}</Text> : null}

        {/* ── Tampons ──────────────────────────────────────────────────────── */}
        {annulee ? (
          <Text style={[s.tampon, { top: 300, left: 170, color: PERTE, borderColor: PERTE, transform: "rotate(-12deg)", fontSize: 44, opacity: 0.8 }]}>ANNULÉE</Text>
        ) : solde ? (
          <Text style={[s.tampon, { top: 150, right: 60, color: GAIN, borderColor: GAIN, transform: "rotate(-6deg)" }]}>SOLDÉE</Text>
        ) : null}


      </Page>
    </Document>
  );
}
