// Icônes de l'application : un carré d'encre et la piste du voyage — huit segments, celui où en est le
// véhicule est jaune, plus haut et cerclé. C'est le composant signature de l'interface, réduit à l'essentiel.
// Génère les PNG exigés pour l'installation (192, 512, masquable) et l'icône iOS (180).
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dossier = path.join(racine, "public", "icones");
await mkdir(dossier, { recursive: true });

const ENCRE = "#0F1113";
const SIGNAL = "#F2C200";
const PASSE = "#ECEEF0";
const FUTUR = "#3A3F46";
const COURANT = 3; // quatrième étape : au port

/** `zone` : fraction de la largeur occupée par le motif (0,58 pour rester dans la zone sûre masquable). */
function svg({ taille = 512, zone = 0.7, arrondi = 0 }) {
  const w = taille * zone;
  const x0 = (taille - w) / 2;
  const n = 8;
  const gap = w * 0.02;
  const bar = (w - gap * (n - 1)) / n;
  const bas = w * 0.06;
  const haut = w * 0.22;
  const cy = taille / 2;
  const barres = [];
  for (let i = 0; i < n; i++) {
    const x = x0 + i * (bar + gap);
    if (i === COURANT) {
      barres.push(`<rect x="${x}" y="${cy - haut / 2}" width="${bar}" height="${haut}" fill="${SIGNAL}" stroke="${PASSE}" stroke-width="${w * 0.014}"/>`);
    } else {
      barres.push(`<rect x="${x}" y="${cy - bas / 2}" width="${bar}" height="${bas}" fill="${i < COURANT ? PASSE : FUTUR}"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${taille}" height="${taille}" viewBox="0 0 ${taille} ${taille}">
  <rect width="${taille}" height="${taille}" rx="${arrondi}" fill="${ENCRE}"/>
  ${barres.join("\n  ")}
</svg>`;
}

const sorties = [
  { fichier: "icone-192.png", taille: 192, svg: svg({ zone: 0.7, arrondi: 96 }) },
  { fichier: "icone-512.png", taille: 512, svg: svg({ zone: 0.7, arrondi: 96 }) },
  { fichier: "icone-masquable-512.png", taille: 512, svg: svg({ zone: 0.58 }) },
  { fichier: "apple-touch-icon.png", taille: 180, svg: svg({ zone: 0.62 }) },
  { fichier: "favicon-32.png", taille: 32, svg: svg({ zone: 0.8, arrondi: 110 }) },
];

for (const s of sorties) {
  await sharp(Buffer.from(s.svg)).resize(s.taille, s.taille).png({ compressionLevel: 9 }).toFile(path.join(dossier, s.fichier));
}
await writeFile(path.join(dossier, "icone.svg"), svg({ zone: 0.7, arrondi: 96 }));
console.log(`icônes : ${sorties.length} PNG + 1 SVG dans public/icones/`);
