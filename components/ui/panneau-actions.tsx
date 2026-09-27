"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, CircleNotch, type Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { Picto } from "./picto";

export interface ActionVisible {
  cle: string;
  titre: string;
  /** Ce que fait l'action, concrètement (« PDF de la facture FAC-2026-0011 »). */
  detail?: string;
  icone: Icon;
  couleur: string;
  onClick?: () => unknown | Promise<unknown>;
  href?: string;
  masque?: boolean;
  danger?: boolean;
  /** L'action attendue : tuile pleine, en couleur. */
  principale?: boolean;
}

/** Une tuile d'action : pictogramme, titre, détail ; tourne pendant l'action, puis coche verte. */
function Tuile({ a, index }: { a: ActionVisible; index: number }) {
  const [etat, setEtat] = useState<"repos" | "cours" | "fait">("repos");
  async function lancer() {
    if (!a.onClick || etat === "cours") return;
    const r = a.onClick();
    if (r instanceof Promise) {
      setEtat("cours");
      try {
        await r;
        setEtat("fait");
        setTimeout(() => setEtat("repos"), 1600);
      } catch {
        setEtat("repos");
      }
    }
  }
  const couleur = a.danger ? "var(--perte)" : a.couleur;
  const classe = cn(
    "onde apparition group relative flex min-h-18 w-full items-center gap-3 overflow-hidden rounded-carte p-4 text-left transition-all duration-200",
    a.principale
      ? "bg-primaire-plein text-sur-primaire shadow-bouton hover:bg-primaire-plein-survol"
      : "carte carte-lien",
    a.danger && "hover:bg-perte-voile",
  );
  const contenu = (
    <>
      {etat === "cours" ? (
        <span className="grid size-9 shrink-0 place-items-center"><CircleNotch size={20} className="animate-spin" aria-hidden /></span>
      ) : etat === "fait" ? (
        <span className="grid size-9 shrink-0 place-items-center text-gain-texte [animation:apparition_300ms_both]"><CheckCircle size={24} weight="fill" aria-hidden /></span>
      ) : a.principale ? (
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/15"><a.icone size={20} weight="fill" aria-hidden /></span>
      ) : (
        <Picto icone={a.icone} couleur={couleur} taille="sm" className="group-hover:scale-[1.03]" />
      )}
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[14px] leading-tight font-bold", a.danger && !a.principale && "text-perte-texte")}>{a.titre}</span>
        {a.detail && <span className={cn("mt-1 line-clamp-2 text-[12px] leading-snug", a.principale ? "text-white/90" : "text-encre-3")}>{a.detail}</span>}
      </span>
    </>
  );
  const style = { animationDelay: `${index * 40}ms` };
  if (a.href) {
    return <Link href={a.href} className={classe} style={style}>{contenu}</Link>;
  }
  return <button type="button" onClick={() => void lancer()} className={classe} style={style} aria-busy={etat === "cours" || undefined}>{contenu}</button>;
}

/**
 * Panneau d'actions : toutes les actions possibles, visibles et nommées — pas de menu caché derrière
 * trois points. Chaque tuile dit ce qu'elle fait.
 */
export function PanneauActions({ titre, actions, className }: { titre?: string; actions: ActionVisible[]; className?: string }) {
  const visibles = actions.filter((a) => !a.masque);
  if (visibles.length === 0) return null;
  return (
    <section aria-label={titre ?? "Actions"} className={cn("@container", className)}>
      {titre && <h2 className="mb-3 text-[18px] font-bold">{titre}</h2>}
      {/* Entre cartes : 16 px, 24 px quand le panneau est assez large pour trois colonnes. */}
      <div className="grid grid-cols-1 gap-4 @md:grid-cols-2 @3xl:grid-cols-3 @3xl:gap-6">
        {visibles.map((a, i) => <Tuile key={a.cle} a={a} index={i} />)}
      </div>
    </section>
  );
}
