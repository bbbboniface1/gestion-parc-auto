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

const BLUE = "#1e40af";
const BLUE_LIGHT = "#eff6ff";
const GRAY = "#64748b";
const GREEN = "#16a34a";
const RED = "#dc2626";

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  headerBand: {
    backgroundColor: BLUE,
    padding: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: { flex: 1 },
  logo: { width: 56, height: 56, marginBottom: 8, borderRadius: 4 },
  companyName: { fontSize: 20, fontWeight: "bold", color: "#ffffff", marginBottom: 4 },
  headerInfo: { fontSize: 9, color: "#dbeafe", lineHeight: 1.5 },
  headerRight: { alignItems: "flex-end" },
  factureLabel: { fontSize: 11, color: "#bfdbfe", marginBottom: 4 },
  factureNumber: { fontSize: 18, fontWeight: "bold", color: "#ffffff" },
  factureDate: { fontSize: 10, color: "#dbeafe", marginTop: 6 },
  body: { padding: 28 },
  sectionRow: { flexDirection: "row", gap: 16, marginBottom: 20 },
  card: {
    flex: 1,
    backgroundColor: BLUE_LIGHT,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  cardTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: BLUE,
    marginBottom: 10,
    letterSpacing: 1,
  },
  cardLine: { fontSize: 10, color: "#1e293b", marginBottom: 4, lineHeight: 1.4 },
  cardLabel: { color: GRAY },
  table: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  tableHeaderCell: { fontSize: 9, fontWeight: "bold", color: GRAY, letterSpacing: 0.5 },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  tableRowLast: { borderBottomWidth: 0 },
  tableCellLabel: { flex: 1, fontSize: 10, color: "#334155" },
  tableCellValue: { flex: 1, fontSize: 11, fontWeight: "bold", textAlign: "right", color: "#0f172a" },
  tableCellGreen: { color: GREEN },
  tableCellRed: { color: RED },
  signatures: { flexDirection: "row", gap: 24, marginTop: 8, marginBottom: 28 },
  signatureBox: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: "#334155",
    paddingTop: 10,
    alignItems: "center",
  },
  signatureLabel: { fontSize: 9, color: GRAY },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 14,
    alignItems: "center",
  },
  footerText: { fontSize: 9, color: GRAY, marginBottom: 3 },
  watermark: {
    position: "absolute",
    top: 320,
    left: 80,
    fontSize: 52,
    color: "rgba(220, 38, 38, 0.18)",
    fontWeight: "bold",
    transform: "rotate(-35deg)",
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
  const dateImpression = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  const rows = [
    { label: "Prix de vente", value: formatFCFAPdf(vente.prix_vente_fcfa), color: "default" as const },
    { label: "Total payé", value: formatFCFAPdf(vente.montant_recu_fcfa), color: "default" as const },
    {
      label: "Reste à payer",
      value: formatFCFAPdf(resteAPayer),
      color: resteAPayer === 0 ? ("green" as const) : ("red" as const),
    },
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {isAnnulee && <Text style={styles.watermark}>VENTE ANNULÉE</Text>}

        <View style={styles.headerBand}>
          <View style={styles.headerLeft}>
            {parametres.logo_url && (
              // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer
              <Image src={parametres.logo_url} style={styles.logo} />
            )}
            <Text style={styles.companyName}>{parametres.nom_entreprise}</Text>
            <Text style={styles.headerInfo}>{parametres.adresse}</Text>
            <Text style={styles.headerInfo}>Tél : {parametres.telephone}</Text>
            {parametres.email && <Text style={styles.headerInfo}>{parametres.email}</Text>}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.factureLabel}>FACTURE</Text>
            <Text style={styles.factureNumber}>N° {vente.numero_facture}</Text>
            <Text style={styles.factureDate}>Date : {formatDate(vente.date_vente)}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.sectionRow}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>CLIENT</Text>
              <Text style={styles.cardLine}>
                <Text style={styles.cardLabel}>Nom : </Text>
                {vente.client_nom}
              </Text>
              {vente.client_telephone && (
                <Text style={styles.cardLine}>
                  <Text style={styles.cardLabel}>Tél : </Text>
                  {vente.client_telephone}
                </Text>
              )}
              {vente.client_adresse && (
                <Text style={styles.cardLine}>
                  <Text style={styles.cardLabel}>Adresse : </Text>
                  {vente.client_adresse}
                </Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>VÉHICULE</Text>
              <Text style={styles.cardLine}>
                {voiture.marque} {voiture.modele} {voiture.annee}
                {voiture.couleur ? ` — ${voiture.couleur}` : ""}
              </Text>
              {voiture.numero_chassis && (
                <Text style={styles.cardLine}>
                  <Text style={styles.cardLabel}>VIN : </Text>
                  {voiture.numero_chassis}
                </Text>
              )}
              {voiture.kilometrage != null && (
                <Text style={styles.cardLine}>
                  <Text style={styles.cardLabel}>Km : </Text>
                  {voiture.kilometrage.toLocaleString("fr-FR")} km
                </Text>
              )}
              {(voiture.carburant || voiture.transmission) && (
                <Text style={styles.cardLine}>
                  {voiture.carburant ?? "—"} / {voiture.transmission ?? "—"}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>DÉSIGNATION</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "right" }]}>VALEUR</Text>
            </View>
            {rows.map((row, i) => (
              <View
                key={row.label}
                style={[styles.tableRow, i === rows.length - 1 ? styles.tableRowLast : {}]}
              >
                <Text style={styles.tableCellLabel}>{row.label}</Text>
                <Text
                  style={[
                    styles.tableCellValue,
                    row.color === "green" ? styles.tableCellGreen : {},
                    row.color === "red" ? styles.tableCellRed : {},
                  ]}
                >
                  {row.value}
                </Text>
              </View>
            ))}
          </View>

          {vente.mode_paiement && (
            <Text style={{ fontSize: 10, color: GRAY, marginBottom: 16 }}>
              Mode de paiement : <Text style={{ fontWeight: "bold", color: "#0f172a" }}>{vente.mode_paiement}</Text>
            </Text>
          )}

          <View style={styles.signatures}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Signature vendeur</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Signature acheteur</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Merci pour votre confiance.</Text>
            <Text style={styles.footerText}>Cette facture fait office de reçu officiel.</Text>
            <Text style={styles.footerText}>Date d&apos;impression : {dateImpression}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
