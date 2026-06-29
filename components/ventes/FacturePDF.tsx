"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { Vente, Voiture, Parametres } from "@/types";
import { formatFCFAPdf, formatDate, getResteAPayer } from "@/lib/utils";

// ── Palette ────────────────────────────────────────────────────────────────
const NAVY       = "#0f172a";
const NAVY_MID   = "#1e293b";
const GOLD       = "#d97706";
const GOLD_LIGHT = "#fef3c7";
const WHITE      = "#ffffff";
const SLATE_50   = "#f8fafc";
const SLATE_100  = "#f1f5f9";
const SLATE_200  = "#e2e8f0";
const SLATE_400  = "#94a3b8";
const SLATE_600  = "#475569";
const SLATE_800  = "#1e293b";
const GREEN      = "#059669";
const GREEN_BG   = "#d1fae5";
const RED        = "#dc2626";
const RED_BG     = "#fee2e2";

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: WHITE,
  },

  // ── Watermark ─────────────────────────────────────────────────────────
  watermark: {
    position: "absolute",
    top: 300,
    left: 60,
    fontSize: 54,
    color: "rgba(220, 38, 38, 0.15)",
    fontWeight: "bold",
    transform: "rotate(-35deg)",
    letterSpacing: 3,
  },

  // ── Header ────────────────────────────────────────────────────────────
  header: {
    backgroundColor: NAVY,
    paddingTop: 30,
    paddingBottom: 26,
    paddingHorizontal: 34,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  logoWrapper: {
    width: 62,
    height: 62,
    backgroundColor: WHITE,
    borderRadius: 8,
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  logo: {
    width: 54,
    height: 54,
    borderRadius: 4,
  },
  companyBlock: {
    flex: 1,
  },
  companyName: {
    fontSize: 17,
    fontWeight: "bold",
    color: WHITE,
    marginBottom: 5,
    letterSpacing: 0.5,
  },
  companyDetail: {
    fontSize: 9,
    color: "#94a3b8",
    lineHeight: 1.6,
  },
  headerRight: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
  },
  invoiceBadge: {
    backgroundColor: GOLD,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 10,
  },
  invoiceBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: WHITE,
    letterSpacing: 2,
  },
  invoiceNumber: {
    fontSize: 22,
    fontWeight: "bold",
    color: WHITE,
    marginBottom: 5,
  },
  invoiceDate: {
    fontSize: 9,
    color: "#94a3b8",
  },

  // ── Gold stripe ───────────────────────────────────────────────────────
  goldStripe: {
    height: 4,
    backgroundColor: GOLD,
  },

  // ── Status band ───────────────────────────────────────────────────────
  statusBand: {
    backgroundColor: SLATE_50,
    paddingHorizontal: 34,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: SLATE_200,
  },
  statusBandText: {
    fontSize: 9,
    color: SLATE_600,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusPillText: {
    fontSize: 8,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },

  // ── Body ──────────────────────────────────────────────────────────────
  body: {
    paddingHorizontal: 34,
    paddingTop: 22,
    paddingBottom: 28,
  },

  // ── Section title ─────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: GOLD,
    letterSpacing: 1.5,
    marginBottom: 8,
  },

  // ── Info cards ────────────────────────────────────────────────────────
  cardsRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 22,
  },
  card: {
    flex: 1,
    backgroundColor: SLATE_50,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: SLATE_200,
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
  },
  cardRow: {
    flexDirection: "row",
    marginBottom: 5,
    flexWrap: "wrap",
  },
  cardLabel: {
    fontSize: 8,
    color: SLATE_400,
    width: 52,
    flexShrink: 0,
    paddingTop: 1,
  },
  cardValue: {
    fontSize: 9.5,
    color: SLATE_800,
    fontWeight: "bold",
    flex: 1,
    lineHeight: 1.4,
  },
  cardValuePrimary: {
    fontSize: 11,
    color: NAVY,
    fontWeight: "bold",
    marginBottom: 6,
  },

  // ── Financial table ───────────────────────────────────────────────────
  tableSection: {
    marginBottom: 20,
  },
  table: {
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: SLATE_200,
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: NAVY,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  tableHeadCell: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#94a3b8",
    letterSpacing: 1,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: SLATE_100,
    backgroundColor: WHITE,
  },
  tableRowAlt: {
    backgroundColor: SLATE_50,
  },
  tableRowHighlightGreen: {
    backgroundColor: GREEN_BG,
  },
  tableRowHighlightRed: {
    backgroundColor: RED_BG,
  },
  tableCellLabel: {
    flex: 2,
    fontSize: 10,
    color: SLATE_600,
  },
  tableCellValue: {
    flex: 1,
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "right",
    color: NAVY,
  },
  tableCellValueGreen: {
    color: GREEN,
  },
  tableCellValueRed: {
    color: RED,
  },

  // ── Payment mode ──────────────────────────────────────────────────────
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
    gap: 8,
  },
  paymentLabel: {
    fontSize: 9,
    color: SLATE_400,
  },
  paymentValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: NAVY,
    backgroundColor: GOLD_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },

  // ── Notes ─────────────────────────────────────────────────────────────
  notesBox: {
    backgroundColor: SLATE_50,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: SLATE_200,
    padding: 10,
    marginBottom: 22,
  },
  notesText: {
    fontSize: 9,
    color: SLATE_600,
    lineHeight: 1.5,
  },

  // ── Signatures ────────────────────────────────────────────────────────
  signaturesRow: {
    flexDirection: "row",
    gap: 28,
    marginBottom: 26,
  },
  signatureBox: {
    flex: 1,
    borderTopWidth: 1.5,
    borderTopColor: SLATE_400,
    paddingTop: 8,
    alignItems: "center",
  },
  signatureLabel: {
    fontSize: 8,
    color: SLATE_400,
    letterSpacing: 0.5,
  },
  signatureSpace: {
    height: 38,
  },

  // ── Footer ────────────────────────────────────────────────────────────
  footer: {
    backgroundColor: NAVY_MID,
    paddingVertical: 12,
    paddingHorizontal: 34,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLeft: {
    flex: 1,
  },
  footerText: {
    fontSize: 8,
    color: "#64748b",
    lineHeight: 1.6,
  },
  footerRight: {
    alignItems: "flex-end",
  },
  footerCompany: {
    fontSize: 9,
    color: GOLD,
    fontWeight: "bold",
  },
  footerTimestamp: {
    fontSize: 7.5,
    color: "#475569",
    marginTop: 2,
  },
});

interface FacturePDFProps {
  vente: Vente;
  voiture: Voiture;
  parametres: Parametres;
}

export function FacturePDF({ vente, voiture, parametres }: FacturePDFProps) {
  const resteAPayer = getResteAPayer(vente.prix_vente_fcfa, vente.montant_recu_fcfa);
  const isAnnulee = vente.status === "annulee";
  const soldee = resteAPayer === 0;

  const dateImpression = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  const statutPaiementLabel = isAnnulee
    ? "ANNULÉE"
    : soldee
    ? "SOLDÉE"
    : "PAIEMENT PARTIEL";

  const statutBgColor = isAnnulee ? RED : soldee ? GREEN : GOLD;
  const statutTextColor = WHITE;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark vente annulée */}
        {isAnnulee && <Text style={styles.watermark}>ANNULÉE</Text>}

        {/* ── HEADER ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {parametres.logo_url && (
              <View style={styles.logoWrapper}>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image src={parametres.logo_url} style={styles.logo} />
              </View>
            )}
            <View style={styles.companyBlock}>
              <Text style={styles.companyName}>{parametres.nom_entreprise}</Text>
              <Text style={styles.companyDetail}>{parametres.adresse}</Text>
              <Text style={styles.companyDetail}>Tél : {parametres.telephone}</Text>
              {parametres.email ? (
                <Text style={styles.companyDetail}>{parametres.email}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.invoiceBadge}>
              <Text style={styles.invoiceBadgeText}>FACTURE</Text>
            </View>
            <Text style={styles.invoiceNumber}>{vente.numero_facture ?? "—"}</Text>
            <Text style={styles.invoiceDate}>Date : {formatDate(vente.date_vente)}</Text>
          </View>
        </View>

        {/* ── GOLD STRIPE ── */}
        <View style={styles.goldStripe} />

        {/* ── STATUS BAND ── */}
        <View style={styles.statusBand}>
          <Text style={styles.statusBandText}>
            Émis le {formatDate(vente.date_vente)} · Réf. {vente.numero_facture ?? "—"}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: statutBgColor }]}>
            <Text style={[styles.statusPillText, { color: statutTextColor }]}>
              {statutPaiementLabel}
            </Text>
          </View>
        </View>

        {/* ── BODY ── */}
        <View style={styles.body}>

          {/* ── CLIENT + VÉHICULE ── */}
          <View style={styles.cardsRow}>
            {/* Client */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>CLIENT</Text>
              <Text style={styles.cardValuePrimary}>{vente.client_nom}</Text>
              {vente.client_telephone ? (
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>Tél</Text>
                  <Text style={styles.cardValue}>{vente.client_telephone}</Text>
                </View>
              ) : null}
              {vente.client_adresse ? (
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>Adresse</Text>
                  <Text style={styles.cardValue}>{vente.client_adresse}</Text>
                </View>
              ) : null}
            </View>

            {/* Véhicule */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>VÉHICULE</Text>
              <Text style={styles.cardValuePrimary}>
                {voiture.marque} {voiture.modele} {voiture.annee}
              </Text>
              {voiture.couleur ? (
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>Couleur</Text>
                  <Text style={styles.cardValue}>{voiture.couleur}</Text>
                </View>
              ) : null}
              {voiture.numero_chassis ? (
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>VIN</Text>
                  <Text style={styles.cardValue}>{voiture.numero_chassis}</Text>
                </View>
              ) : null}
              {voiture.kilometrage != null ? (
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>Kilom.</Text>
                  <Text style={styles.cardValue}>
                    {voiture.kilometrage.toLocaleString("fr-FR")} km
                  </Text>
                </View>
              ) : null}
              {(voiture.carburant || voiture.transmission) ? (
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>Motoris.</Text>
                  <Text style={styles.cardValue}>
                    {[voiture.carburant, voiture.transmission].filter(Boolean).join(" · ")}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* ── TABLEAU FINANCIER ── */}
          <View style={styles.tableSection}>
            <Text style={styles.sectionTitle}>RÉCAPITULATIF FINANCIER</Text>
            <View style={styles.table}>
              {/* En-tête */}
              <View style={styles.tableHead}>
                <Text style={[styles.tableHeadCell, { flex: 2 }]}>DÉSIGNATION</Text>
                <Text style={[styles.tableHeadCell, { flex: 1, textAlign: "right" }]}>
                  MONTANT
                </Text>
              </View>

              {/* Prix de vente */}
              <View style={styles.tableRow}>
                <Text style={styles.tableCellLabel}>Prix de vente</Text>
                <Text style={styles.tableCellValue}>
                  {formatFCFAPdf(vente.prix_vente_fcfa)}
                </Text>
              </View>

              {/* Total payé */}
              <View style={[styles.tableRow, styles.tableRowAlt]}>
                <Text style={styles.tableCellLabel}>Montant encaissé</Text>
                <Text style={styles.tableCellValue}>
                  {formatFCFAPdf(vente.montant_recu_fcfa)}
                </Text>
              </View>

              {/* Reste à payer — ligne mise en valeur */}
              <View
                style={[
                  styles.tableRow,
                  soldee ? styles.tableRowHighlightGreen : styles.tableRowHighlightRed,
                ]}
              >
                <Text style={[styles.tableCellLabel, { fontWeight: "bold", color: NAVY }]}>
                  {soldee ? "✓  Solde réglé" : "Reste à payer"}
                </Text>
                <Text
                  style={[
                    styles.tableCellValue,
                    soldee ? styles.tableCellValueGreen : styles.tableCellValueRed,
                  ]}
                >
                  {soldee ? "Intégralement payé" : formatFCFAPdf(resteAPayer)}
                </Text>
              </View>
            </View>
          </View>

          {/* ── MODE DE PAIEMENT ── */}
          {vente.mode_paiement ? (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Mode de paiement :</Text>
              <Text style={styles.paymentValue}>{vente.mode_paiement}</Text>
            </View>
          ) : null}

          {/* ── NOTES ── */}
          {vente.notes ? (
            <View style={styles.notesBox}>
              <Text style={[styles.sectionTitle, { marginBottom: 5 }]}>NOTES</Text>
              <Text style={styles.notesText}>{vente.notes}</Text>
            </View>
          ) : null}

          {/* ── SIGNATURES ── */}
          <Text style={[styles.sectionTitle, { marginBottom: 14 }]}>SIGNATURES</Text>
          <View style={styles.signaturesRow}>
            <View style={styles.signatureBox}>
              <View style={styles.signatureSpace} />
              <Text style={styles.signatureLabel}>Signature du vendeur</Text>
            </View>
            <View style={styles.signatureBox}>
              <View style={styles.signatureSpace} />
              <Text style={styles.signatureLabel}>Signature de l&apos;acheteur</Text>
            </View>
          </View>
        </View>

        {/* ── FOOTER ── */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Text style={styles.footerText}>
              Merci pour votre confiance. Cette facture fait office de reçu officiel.
            </Text>
            <Text style={styles.footerText}>
              Imprimée le {dateImpression}
            </Text>
          </View>
          <View style={styles.footerRight}>
            <Text style={styles.footerCompany}>{parametres.nom_entreprise}</Text>
            {parametres.email ? (
              <Text style={styles.footerTimestamp}>{parametres.email}</Text>
            ) : null}
          </View>
        </View>
      </Page>
    </Document>
  );
}
