"use client";

// Photos et pièces jointes. Production : stockage Supabase privé, chemins « {org}/… »,
// lecture par URL signée. Démonstration : fichiers gardés dans le navigateur (IndexedDB).
// Les photos sont réduites sur l'appareil avant l'envoi : une photo de téléphone de 4 Mo
// part en ~300 Ko, ce qui compte sur un forfait mobile.

import { useEffect, useState } from "react";
import { get, set } from "idb-keyval";
import { modeActuel } from "@/lib/api/client";

const COMPARTIMENT = "parc-auto";
const PREFIXE_DEMO = "parc-auto:fichier:";

export async function compresserImage(fichier: File, cote = 1600, qualite = 0.82): Promise<Blob> {
  if (!fichier.type.startsWith("image/") || fichier.type === "image/gif") return fichier;
  try {
    const image = await createImageBitmap(fichier);
    const echelle = Math.min(1, cote / Math.max(image.width, image.height));
    const l = Math.round(image.width * echelle);
    const h = Math.round(image.height * echelle);
    const canvas = document.createElement("canvas");
    canvas.width = l;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(image, 0, 0, l, h);
    image.close();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", qualite));
    return blob && blob.size < fichier.size ? blob : fichier;
  } catch {
    return fichier;
  }
}

function extension(type: string, nom: string): string {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "application/pdf") return "pdf";
  return nom.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
}

/** Téléverse et renvoie le chemin à enregistrer en base. */
export async function televerser(org: string, dossier: string, fichier: File): Promise<{ path: string; taille: number }> {
  const contenu = fichier.type.startsWith("image/") ? await compresserImage(fichier) : fichier;
  const type = contenu.type || fichier.type || "application/octet-stream";
  const path = `${org}/${dossier}/${crypto.randomUUID()}.${extension(type, fichier.name)}`;
  if (modeActuel() === "demo") {
    await set(PREFIXE_DEMO + path, contenu);
    return { path, taille: contenu.size };
  }
  const { supabase } = await import("@/lib/api/supabase");
  const { error } = await supabase().storage.from(COMPARTIMENT).upload(path, contenu, { contentType: type, upsert: false });
  if (error) throw new Error("L'envoi du fichier a échoué. Vérifiez la connexion et réessayez.");
  return { path, taille: contenu.size };
}

const cacheUrls = new Map<string, { url: string; expire: number }>();

export async function urlFichier(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  if (/^(https?:|data:|blob:|\/)/.test(path)) return path; // illustrations de démonstration
  const connue = cacheUrls.get(path);
  if (connue && connue.expire > Date.now()) return connue.url;
  let url: string | null = null;
  if (modeActuel() === "demo") {
    const blob = await get<Blob>(PREFIXE_DEMO + path);
    url = blob ? URL.createObjectURL(blob) : null;
    if (url) cacheUrls.set(path, { url, expire: Number.MAX_SAFE_INTEGER });
    return url;
  }
  const { supabase } = await import("@/lib/api/supabase");
  const { data } = await supabase().storage.from(COMPARTIMENT).createSignedUrl(path, 3600);
  url = data?.signedUrl ?? null;
  if (url) cacheUrls.set(path, { url, expire: Date.now() + 50 * 60_000 });
  return url;
}

export function useUrlFichier(path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() => (path && cacheUrls.get(path)?.url) || null);
  useEffect(() => {
    let actif = true;
    void urlFichier(path).then((u) => actif && setUrl(u));
    return () => {
      actif = false;
    };
  }, [path]);
  return url;
}
