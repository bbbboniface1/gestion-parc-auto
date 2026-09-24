"use client";

import { useEffect, useState } from "react";
import { EnTetePage } from "@/components/coque/coque";
import { Groupe } from "@/components/parametres/commun";
import { Choix } from "@/components/ui/choix";

type Theme = "systeme" | "light" | "dark";
type Texte = "1" | "1.125" | "1.25";

function lire<T extends string>(cle: string, defaut: T): T {
  try { return (localStorage.getItem(cle) as T) ?? defaut; } catch { return defaut; }
}

/** Réglages propres à cet appareil (pas partagés avec l'équipe). */
export default function PagePreferences() {
  const [theme, setTheme] = useState<Theme>("systeme");
  const [texte, setTexte] = useState<Texte>("1");

  useEffect(() => {
    setTheme(lire<Theme>("parc-auto:theme", "systeme"));
    setTexte(lire<Texte>("parc-auto:texte", "1"));
  }, []);

  function appliquerTheme(t: Theme) {
    setTheme(t);
    try {
      if (t === "systeme") { localStorage.removeItem("parc-auto:theme"); delete document.documentElement.dataset.theme; }
      else { localStorage.setItem("parc-auto:theme", t); document.documentElement.dataset.theme = t; }
    } catch { /* stockage indisponible : le réglage vaut pour cette session */ }
  }

  function appliquerTexte(t: Texte) {
    setTexte(t);
    // zoom agrandit toute l'interface (textes en px compris) et remet en page, comme le zoom du téléphone.
    document.documentElement.style.zoom = t === "1" ? "" : t;
    try { if (t === "1") localStorage.removeItem("parc-auto:texte"); else localStorage.setItem("parc-auto:texte", t); } catch { /* idem */ }
  }

  return (
    <>
      <EnTetePage titre="Préférences" sousTitre="Ces réglages ne concernent que cet appareil." />
      <div className="border-t-2 border-encre pt-4">
        <Groupe titre="Apparence" description="Le thème sombre repose les yeux le soir et économise la batterie des écrans OLED.">
          <Choix libelle="Thème" colonnes={3} valeur={theme} onChange={(v) => v && appliquerTheme(v)}
            options={[{ valeur: "systeme", libelle: "Automatique" }, { valeur: "light", libelle: "Clair" }, { valeur: "dark", libelle: "Sombre" }]} />
        </Groupe>
        <Groupe titre="Lisibilité" description="Agrandit tous les textes de l'application.">
          <Choix libelle="Taille du texte" colonnes={3} valeur={texte} onChange={(v) => v && appliquerTexte(v)}
            options={[{ valeur: "1", libelle: "Normale" }, { valeur: "1.125", libelle: "Grande" }, { valeur: "1.25", libelle: "Très grande" }]} />
          <p className="rounded-controle bg-surface-2 px-3 py-2 text-encre-2">Aperçu : Toyota RAV4 2018 · 14 500 000 FCFA</p>
        </Groupe>
      </div>
    </>
  );
}
