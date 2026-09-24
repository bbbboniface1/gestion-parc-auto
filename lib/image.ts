"use client";

// Traitements d'image faits sur l'appareil, avant l'envoi.

/**
 * Détourage : rend transparent le fond clair d'un cachet ou d'une signature photographiés sur
 * du papier blanc, pour qu'ils se posent proprement sur la facture. Les pixels presque blancs
 * deviennent transparents, les pixels intermédiaires gardent une transparence partielle
 * (pas de bord crénelé).
 */
export async function detourer(fichier: Blob, seuilHaut = 225, seuilBas = 170, cote = 900): Promise<Blob> {
  const image = await createImageBitmap(fichier);
  const echelle = Math.min(1, cote / Math.max(image.width, image.height));
  const l = Math.round(image.width * echelle);
  const h = Math.round(image.height * echelle);
  const canvas = document.createElement("canvas");
  canvas.width = l;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0, l, h);
  image.close();
  const pixels = ctx.getImageData(0, 0, l, h);
  const d = pixels.data;
  for (let i = 0; i < d.length; i += 4) {
    const luminance = 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!;
    if (luminance >= seuilHaut) d[i + 3] = 0;
    else if (luminance > seuilBas) d[i + 3] = Math.round(255 * (1 - (luminance - seuilBas) / (seuilHaut - seuilBas)));
  }
  ctx.putImageData(pixels, 0, 0);
  return new Promise((ok, ko) => canvas.toBlob((b) => (b ? ok(b) : ko(new Error("Image illisible"))), "image/png"));
}
