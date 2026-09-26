"use client";

import { useEffect, useState } from "react";
import { Boat, Car, CheckCircle, HandCoins, Invoice, SealCheck, type Icon } from "@phosphor-icons/react";
import { ecouterCelebrations, type Celebration } from "@/lib/celebration";

const APPARENCE: Record<Celebration["type"], { icone: Icon; couleur: string }> = {
  vente: { icone: Invoice, couleur: "var(--gain)" },
  encaissement: { icone: HandCoins, couleur: "var(--primaire)" },
  solde: { icone: SealCheck, couleur: "var(--gain)" },
  etape: { icone: Boat, couleur: "var(--etape-en-mer)" },
  vehicule: { icone: Car, couleur: "var(--etape-achete)" },
  simple: { icone: CheckCircle, couleur: "var(--gain)" },
};
const COULEURS_CONFETTI = ["var(--primaire)", "var(--accent)", "var(--gain)", "var(--ocre)", "var(--reserve)", "var(--acier)"];

function mouvementReduit() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Effets de toute l'application :
 *  - une onde part du doigt sur chaque élément marqué `onde` (boutons, tuiles) ;
 *  - une célébration (pictogramme, confettis, message) après un événement du métier : vente, encaissement,
 *    vente soldée, changement d'étape, véhicule ajouté. Elle se ferme seule ou au toucher.
 */
export function EffetsGlobaux() {
  const [fete, setFete] = useState<(Celebration & { cle: number }) | null>(null);

  useEffect(() => {
    const toucher = (e: PointerEvent) => {
      if (mouvementReduit()) return;
      const cible = (e.target as HTMLElement | null)?.closest<HTMLElement>(".onde");
      if (!cible) return;
      const r = cible.getBoundingClientRect();
      const d = Math.hypot(r.width, r.height) * 2;
      const g = document.createElement("span");
      g.className = "onde-goutte";
      g.style.width = g.style.height = `${d}px`;
      g.style.left = `${e.clientX - r.left}px`;
      g.style.top = `${e.clientY - r.top}px`;
      cible.appendChild(g);
      g.addEventListener("animationend", () => g.remove());
    };
    document.addEventListener("pointerdown", toucher);
    return () => document.removeEventListener("pointerdown", toucher);
  }, []);

  useEffect(() => ecouterCelebrations((c) => setFete({ ...c, cle: Date.now() })), []);

  useEffect(() => {
    if (!fete) return;
    const t = setTimeout(() => setFete(null), 2600);
    return () => clearTimeout(t);
  }, [fete]);

  if (!fete) return null;
  const a = APPARENCE[fete.type];
  const couleur = fete.couleur ?? a.couleur;
  const Icone = a.icone;
  const morceaux = Array.from({ length: 46 }, (_, i) => {
    const angle = (i / 46) * Math.PI * 2 + (i % 3) * 0.3;
    const distance = 140 + ((i * 37) % 120);
    return {
      i,
      dx: `${Math.cos(angle) * distance}px`,
      dy: `${Math.sin(angle) * distance - 40}px`,
      rot: `${(i * 97) % 540}deg`,
      couleur: COULEURS_CONFETTI[i % COULEURS_CONFETTI.length],
      forme: i % 3 === 0 ? "9999px" : "2px",
      taille: 6 + (i % 4) * 2,
      delai: `${(i % 6) * 25}ms`,
    };
  });

  return (
    <div key={fete.cle} role="status" aria-live="polite" onClick={() => setFete(null)}
      className="fixed inset-0 z-[70] grid place-items-center bg-nuit/25 backdrop-blur-[2px] [animation:apparition_200ms_both]">
      <div className="relative">
        {!mouvementReduit() && morceaux.map((m) => (
          <span key={m.i} aria-hidden className="absolute top-1/2 left-1/2"
            style={{
              width: m.taille, height: m.taille * (m.forme === "2px" ? 1.6 : 1), background: m.couleur, borderRadius: m.forme,
              ["--dx" as string]: m.dx, ["--dy" as string]: m.dy, ["--rot" as string]: m.rot,
              animation: `confetti 1100ms cubic-bezier(0.16, 1, 0.3, 1) ${m.delai} both`,
            }} />
        ))}
        <div className="relative flex w-[min(86vw,340px)] flex-col items-center rounded-[26px] bg-surface px-6 pt-8 pb-6 text-center shadow-flottante [animation:pose-tampon_520ms_cubic-bezier(0.22,1,0.36,1)_both]" style={{ rotate: "4deg" }}>
          <span className="relative grid size-20 place-items-center">
            <span aria-hidden className="absolute inset-0 rounded-full [animation:anneau_1200ms_ease-out_infinite]" style={{ background: couleur }} />
            <span className="relative grid size-20 place-items-center rounded-full text-white shadow-lg" style={{ background: couleur }}>
              <Icone size={40} weight="fill" aria-hidden />
            </span>
          </span>
          <p className="mt-5 text-[20px] leading-tight font-extrabold text-encre">{fete.titre}</p>
          {fete.detail && <p className="mt-1.5 text-[14px] text-encre-3">{fete.detail}</p>}
        </div>
      </div>
    </div>
  );
}
