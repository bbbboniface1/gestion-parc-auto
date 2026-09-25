import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Parc Auto — véhicules importés",
    short_name: "Parc Auto",
    description: "Achat à l'étranger, logistique, coût de revient, vente et facturation des véhicules importés.",
    lang: "fr",
    dir: "ltr",
    start_url: "/accueil/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#F2F5FA",
    theme_color: "#0B1633",
    categories: ["business", "finance", "productivity"],
    icons: [
      { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icones/icone-masquable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Ajouter un véhicule", short_name: "Véhicule", url: "/parc/nouveau/", icons: [{ src: "/icones/icone-192.png", sizes: "192x192" }] },
      { name: "Nouvelle vente", short_name: "Vente", url: "/ventes/nouvelle/", icons: [{ src: "/icones/icone-192.png", sizes: "192x192" }] },
      { name: "Simulateur d'enchère", short_name: "Simulateur", url: "/outils/simulateur/", icons: [{ src: "/icones/icone-192.png", sizes: "192x192" }] },
    ],
  };
}
