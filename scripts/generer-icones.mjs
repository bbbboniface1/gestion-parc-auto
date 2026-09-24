// Icônes de l'application : une carte d'embarquement crème sur fond latérite,
// avec sa ligne perforée et ses deux encoches — le composant signature de l'interface.
// Génère les PNG exigés pour l'installation (192, 512, masquable) et l'icône iOS (180).
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dossier = path.join(racine, "public", "icones");
await mkdir(dossier, { recursive: true });

const LATERITE = "#B5461E";
const CREME = "#F5F3EE";
const NUIT = "#1B1D22";

/** `zone` : fraction de la largeur occupée par le motif (0,62 pour rester dans la zone sûre masquable). */
function svg({ taille = 512, zone = 0.66, arrondi = 0 }) {
  const w = taille * zone;
  const h = w * 0.62;
  const x = (taille - w) / 2;
  const y = (taille - h) / 2;
  const r = w * 0.06;
  const coupe = x + w * 0.66; // position de la perforation
  const encoche = w * 0.075;
  const tirets = [];
  const n = 5;
  const pas = (h - 2 * encoche) / (2 * n - 1);
  for (let i = 0; i < n; i++) {
    const ty = y + encoche + i * 2 * pas;
    tirets.push(`<rect x="${coupe - w * 0.012}" y="${ty}" width="${w * 0.024}" height="${pas}" fill="${LATERITE}"/>`);
  }
  // Trois points reliés : Houston → Cotonou → Bamako, sur la partie gauche du billet.
  const cy = y + h * 0.5;
  const x1 = x + w * 0.14, x2 = x + w * 0.33, x3 = x + w * 0.52;
  const p = w * 0.035;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${taille}" height="${taille}" viewBox="0 0 ${taille} ${taille}">
  <rect width="${taille}" height="${taille}" rx="${arrondi}" fill="${LATERITE}"/>
  <mask id="m">
    <rect width="${taille}" height="${taille}" fill="white"/>
    <circle cx="${coupe}" cy="${y}" r="${encoche}" fill="black"/>
    <circle cx="${coupe}" cy="${y + h}" r="${encoche}" fill="black"/>
  </mask>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${CREME}" mask="url(#m)"/>
  ${tirets.join("\n  ")}
  <line x1="${x1}" y1="${cy}" x2="${x3}" y2="${cy}" stroke="${NUIT}" stroke-width="${w * 0.022}" stroke-linecap="round"/>
  <circle cx="${x1}" cy="${cy}" r="${p}" fill="${NUIT}"/>
  <circle cx="${x2}" cy="${cy}" r="${p}" fill="${CREME}" stroke="${NUIT}" stroke-width="${w * 0.022}"/>
  <circle cx="${x3}" cy="${cy}" r="${p * 1.25}" fill="${LATERITE}"/>
  <rect x="${coupe + w * 0.07}" y="${y + h * 0.3}" width="${w * 0.2}" height="${h * 0.1}" rx="${h * 0.03}" fill="${NUIT}" opacity="0.85"/>
  <rect x="${coupe + w * 0.07}" y="${y + h * 0.5}" width="${w * 0.14}" height="${h * 0.1}" rx="${h * 0.03}" fill="${NUIT}" opacity="0.35"/>
</svg>`;
}

const sorties = [
  { fichier: "icone-192.png", taille: 192, svg: svg({ taille: 512, zone: 0.7, arrondi: 96 }) },
  { fichier: "icone-512.png", taille: 512, svg: svg({ taille: 512, zone: 0.7, arrondi: 96 }) },
  { fichier: "icone-masquable-512.png", taille: 512, svg: svg({ taille: 512, zone: 0.58 }) },
  { fichier: "apple-touch-icon.png", taille: 180, svg: svg({ taille: 512, zone: 0.62 }) },
  { fichier: "favicon-32.png", taille: 32, svg: svg({ taille: 512, zone: 0.8, arrondi: 110 }) },
];

for (const s of sorties) {
  await sharp(Buffer.from(s.svg)).resize(s.taille, s.taille).png({ compressionLevel: 9 }).toFile(path.join(dossier, s.fichier));
}
await writeFile(path.join(dossier, "icone.svg"), svg({ taille: 512, zone: 0.7, arrondi: 96 }));
console.log(`icônes : ${sorties.length} PNG + 1 SVG dans public/icones/`);
