import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, IBM_Plex_Mono, Schibsted_Grotesk } from "next/font/google";
import { Fournisseurs } from "@/components/fournisseurs";
import "./globals.css";

// Polices embarquées au build (aucune requête vers Google au chargement) : l'app
// garde sa typographie hors ligne.
const texte = Schibsted_Grotesk({ subsets: ["latin"], variable: "--police-texte", display: "swap" });
const etiquette = Barlow_Condensed({ subsets: ["latin"], weight: ["600"], variable: "--police-etiquette", display: "swap" });
const code = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500"], variable: "--police-code", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Parc Auto", template: "%s · Parc Auto" },
  description: "Gestion des véhicules importés : achat à l'étranger, logistique, coût de revient, vente et facturation.",
  applicationName: "Parc Auto",
  appleWebApp: { capable: true, title: "Parc Auto", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icones/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icones/icone.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icones/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0F1113" },
    { media: "(prefers-color-scheme: dark)", color: "#08090A" },
  ],
};

// Applique le thème choisi avant le premier rendu (pas de flash clair → sombre).
const scriptTheme = `try{var t=localStorage.getItem("parc-auto:theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;var s=localStorage.getItem("parc-auto:texte");if(s==="1.125"||s==="1.25")document.documentElement.style.zoom=s}catch(e){}`;

export default function RacineLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${texte.variable} ${etiquette.variable} ${code.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTheme }} />
      </head>
      <body>
        <Fournisseurs>{children}</Fournisseurs>
      </body>
    </html>
  );
}
