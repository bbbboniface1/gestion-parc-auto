"use client";

import { useSyncExternalStore } from "react";
import { EnTetePage } from "@/components/coque/coque";
import { Groupe } from "@/components/parametres/commun";
import { Choix } from "@/components/ui/choix";

type Theme = "systeme" | "light" | "dark";
type Texte = "1" | "1.125" | "1.25";

const EVENEMENT = "parc-auto:preferences";
/** Si le stockage est indisponible (navigation privée), le réglage vaut pour la session en cours. */
const enMemoire = new Map<string, string>();

function lire<T extends string>(cle: string, defaut: T): T {
  try { return (localStorage.getItem(cle) as T | null) ?? defaut; } catch { return (enMemoire.get(cle) as T | undefined) ?? defaut; }
}

function ecrire(cle: string, valeur: string | null) {
  try {
    if (valeur === null) localStorage.removeItem(cle); else localStorage.setItem(cle, valeur);
  } catch {
    if (valeur === null) enMemoire.delete(cle); else enMemoire.set(cle, valeur);
  }
  window.dispatchEvent(new Event(EVENEMENT));
}

function abonner(rappel: () => void) {
  window.addEventListener("storage", rappel);
  window.addEventListener(EVENEMENT, rappel);
  return () => { window.removeEventListener("storage", rappel); window.removeEventListener(EVENEMENT, rappel); };
}

/** Réglages propres à cet appareil (pas partagés avec l'équipe). */
export default function PagePreferences() {
  const theme = useSyncExternalStore(abonner, () => lire<Theme>("parc-auto:theme", "systeme"), () => "systeme" as Theme);
  const texte = useSyncExternalStore(abonner, () => lire<Texte>("parc-auto:texte", "1"), () => "1" as Texte);

  function appliquerTheme(t: Theme) {
    if (t === "systeme") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
    ecrire("parc-auto:theme", t === "systeme" ? null : t);
  }

  function appliquerTexte(t: Texte) {
    // zoom agrandit toute l'interface (textes en px compris) et remet en page, comme le zoom du téléphone.
    document.documentElement.style.zoom = t === "1" ? "" : t;
    ecrire("parc-auto:texte", t === "1" ? null : t);
  }

  return (
    <>
      <EnTetePage titre="Préférences" sousTitre="Ces réglages ne concernent que cet appareil." />
      <div className="carte px-4 py-6 lg:px-8">
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
