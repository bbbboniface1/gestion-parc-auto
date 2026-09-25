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
    "onde apparition group relative flex min-h-[68px] w-full items-center gap-3 overflow-hidden rounded-2xl p-3 text-left transition-all duration-200",
    a.principale
      ? "bg-gradient-to-br from-[#3a6cf0] to-primaire text-white shadow-bouton hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-10px_rgb(36_87_229/0.7)]"
      : "carte carte-lien",
    a.danger && "hover:bg-perte-voile",
  );
  const contenu = (
    <>
      {etat === "cours" ? (
        <span className="grid size-9 shrink-0 place-items-center"><CircleNotch size={22} className="animate-spin" aria-hidden /></span>
      ) : etat === "fait" ? (
        <span className="grid size-9 shrink-0 place-items-center text-gain [animation:apparition_300ms_both]"><CheckCircle size={26} weight="fill" aria-hidden /></span>
      ) : a.principale ? (
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/15"><a.icone size={22} weight="fill" aria-hidden /></span>
      ) : (
        <Picto icone={a.icone} couleur={couleur} taille="sm" className="group-hover:scale-105" />
      )}
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[14px] leading-tight font-bold", a.danger && !a.principale && "text-perte-texte")}>{a.titre}</span>
        {a.detail && <span className={cn("mt-0.5 block truncate text-[12px]", a.principale ? "text-white/80" : "text-encre-3")}>{a.detail}</span>}
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
      {titre && <h2 className="mb-3 text-[17px] font-bold">{titre}</h2>}
      <div className="grid grid-cols-1 gap-2.5 @md:grid-cols-2 @3xl:grid-cols-3">
        {visibles.map((a, i) => <Tuile key={a.cle} a={a} index={i} />)}
      </div>
    </section>
  );
}
