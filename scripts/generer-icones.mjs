// Icônes de l'application : même dessin que le logo (components/coque/logo.tsx) — carré en dégradé orange,
// une route pointillée qui va du point de départ (l'enchère) au point d'arrivée (Bamako).
// Génère les PNG exigés pour l'installation (192, 512, masquable) et l'icône iOS (180).
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dossier = path.join(racine, "public", "icones");
await mkdir(dossier, { recursive: true });

/** `zone` : fraction occupée par le motif (0,6 pour rester dans la zone sûre des icônes masquables). */
function svg({ taille = 512, zone = 0.8, arrondi = 0 }) {
  const k = (taille * zone) / 40;
  const d = (taille - 40 * k) / 2;
  const p = (x, y) => `${(d + x * k).toFixed(1)} ${(d + y * k).toFixed(1)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${taille}" height="${taille}" viewBox="0 0 ${taille} ${taille}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF9A3D"/><stop offset="1" stop-color="#F2541B"/></linearGradient></defs>
  <rect width="${taille}" height="${taille}" rx="${arrondi}" fill="url(#g)"/>
  <path d="M${p(11, 28)} C${p(15, 19)} ${p(25, 24)} ${p(29, 14)}" fill="none" stroke="#fff" stroke-width="${3 * k}" stroke-linecap="round" stroke-dasharray="${0.1 * k} ${5.2 * k}"/>
  <circle cx="${d + 11 * k}" cy="${d + 28 * k}" r="${3.4 * k}" fill="#fff"/>
  <circle cx="${d + 29 * k}" cy="${d + 13 * k}" r="${4.2 * k}" fill="#0B1633" stroke="#fff" stroke-width="${2.4 * k}"/>
</svg>`;
}

const sorties = [
  { fichier: "icone-192.png", taille: 192, svg: svg({ zone: 0.9, arrondi: 110 }) },
  { fichier: "icone-512.png", taille: 512, svg: svg({ zone: 0.9, arrondi: 110 }) },
  { fichier: "icone-masquable-512.png", taille: 512, svg: svg({ zone: 0.62 }) },
  { fichier: "apple-touch-icon.png", taille: 180, svg: svg({ zone: 0.8 }) },
  { fichier: "favicon-32.png", taille: 32, svg: svg({ zone: 1, arrondi: 120 }) },
];

for (const s of sorties) {
  await sharp(Buffer.from(s.svg)).resize(s.taille, s.taille).png({ compressionLevel: 9 }).toFile(path.join(dossier, s.fichier));
}
await writeFile(path.join(dossier, "icone.svg"), svg({ zone: 0.9, arrondi: 110 }));
console.log(`icônes : ${sorties.length} PNG + 1 SVG dans public/icones/`);
