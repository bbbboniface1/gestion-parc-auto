"use client";

// Génération des documents dans le navigateur (aucun serveur) : fonctionne aussi hors ligne.
// Le moteur PDF (~1 Mo) n'est chargé qu'au premier document demandé.

import type { DonneesDocument } from "./types";

/** Charge une image distante en data URL (le moteur PDF gère mal certaines URL signées). */
export async function versDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const blob = await r.blob();
    return await new Promise((ok) => {
      const lecteur = new FileReader();
      lecteur.onload = () => ok(String(lecteur.result));
      lecteur.onerror = () => ok(null);
      lecteur.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function urlVerification(jeton: string | null | undefined): string | null {
  if (!jeton || typeof window === "undefined") return null;
  return `${window.location.origin}/verifier/?t=${encodeURIComponent(jeton)}`;
}

export async function genererPDF(donnees: DonneesDocument): Promise<Blob> {
  const [{ pdf }, { DocumentPDF, enregistrerPolices }, QRCode] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/documents/document-pdf"),
    import("qrcode"),
  ]);
  enregistrerPolices(window.location.origin);

  const d: DonneesDocument = { ...donnees };
  if (d.url_verification && d.options?.qr_verification !== false && !d.qr) {
    d.qr = await QRCode.toDataURL(d.url_verification, { margin: 0, width: 280, errorCorrectionLevel: "M", color: { dark: "#17171A", light: "#FFFFFF" } });
  }
  const [logo, cachet, signature] = await Promise.all([
    versDataUrl(d.entreprise.logo), versDataUrl(d.entreprise.cachet), versDataUrl(d.entreprise.signature),
  ]);
  d.entreprise = { ...d.entreprise, logo, cachet, signature };

  return pdf(<DocumentPDF d={d} />).toBlob();
}

export function nomFichier(d: Pick<DonneesDocument, "type" | "numero" | "client">): string {
  const client = d.client.nom.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${d.numero}${client ? `-${client}` : ""}.pdf`;
}

export function telecharger(blob: Blob, nom: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function imprimer(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const fenetre = window.open(url, "_blank");
  if (fenetre) fenetre.addEventListener("load", () => fenetre.print(), { once: true });
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
