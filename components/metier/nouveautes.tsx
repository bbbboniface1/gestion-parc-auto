"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Boat, CalendarCheck, Camera, Gavel, GearSix, Receipt, Sparkle, X, type Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

/** Change à chaque lot de nouveautés : la carte réapparaît une fois, puis se range quand on la ferme. */
const VERSION = "2026-09-26";
const CLE = `parc-auto:nouveautes:${VERSION}`;

const NOUVEAUTES: { titre: string; detail: string; href: string; icone: Icon; couleur: string }[] = [
  { titre: "Véhicule et conteneur d'accord", detail: "Parc › « À vérifier » : les incohérences se corrigent en un bouton", href: "/parc/?filtre=a_verifier", icone: Boat, couleur: "var(--etape-en-mer)" },
  { titre: "Chaque dépense mène à sa voiture", detail: "Finances › Dépenses : photo, fournisseur, compte, filtres", href: "/finances/?onglet=depenses", icone: Receipt, couleur: "var(--accent)" },
  { titre: "Vente en trois étapes", detail: "Véhicule, client, prix : le récapitulatif se remplit au fil de l'eau", href: "/ventes/nouvelle/", icone: CalendarCheck, couleur: "var(--gain)" },
  { titre: "Simulateur d'enchère refait", detail: "Jusqu'où enchérir, et où va chaque franc du prix de vente", href: "/outils/simulateur/", icone: Gavel, couleur: "var(--ocre)" },
  { titre: "Photos et comptes", detail: "Choisir la vitrine, supprimer une photo ; créer vos comptes (Wave, banque…)", href: "/finances/", icone: Camera, couleur: "var(--etape-au-port)" },
  { titre: "Paramètres en cartes", detail: "L'engrenage en haut à droite (ou « Menu ») ouvre Entreprise, documents, équipe…", href: "/parametres/", icone: GearSix, couleur: "var(--primaire)" },
];

function dejaVue(): boolean {
  try { return localStorage.getItem(CLE) === "1"; } catch { return false; }
}

/** « Quoi de neuf » : les nouveautés, chacune un lien vers l'écran concerné. Se ferme une fois pour toutes. */
export function CarteNouveautes({ className }: { className?: string }) {
  const [fermee, setFermee] = useState(dejaVue);
  if (fermee) return null;
  return (
    <section aria-labelledby="titre-nouveautes" className={cn("carte apparition relative overflow-hidden p-4 lg:p-5", className)}>
      <span aria-hidden className="pointer-events-none absolute -top-10 -right-8 size-40 rounded-full bg-accent/20 blur-3xl" />
      <div className="relative flex items-start justify-between gap-3">
        <h2 id="titre-nouveautes" className="flex items-center gap-2 text-[17px] font-bold">
          <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-[#ff9a3d] to-[#f2541b] text-white shadow-[0_8px_16px_-8px_#f2541b]"><Sparkle size={18} weight="fill" aria-hidden /></span>
          Quoi de neuf
        </h2>
        <button type="button" aria-label="Fermer les nouveautés" title="Fermer"
          onClick={() => { try { localStorage.setItem(CLE, "1"); } catch { /* stockage indisponible : la carte reviendra */ } setFermee(true); }}
          className="onde inline-grid size-9 shrink-0 place-items-center rounded-full text-encre-3 hover:bg-surface-2 hover:text-encre"><X size={16} weight="bold" aria-hidden /></button>
      </div>
      <ul className="relative mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {NOUVEAUTES.map((n) => (
          <li key={n.href}>
            <Link href={n.href} className="onde group flex h-full items-start gap-3 rounded-2xl bg-surface-2/60 p-3 transition-colors hover:bg-primaire-voile">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl text-white" style={{ background: n.couleur }}><n.icone size={19} weight="fill" aria-hidden /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] leading-tight font-bold group-hover:text-primaire">{n.titre}</span>
                <span className="mt-0.5 block text-[12px] leading-snug text-encre-3">{n.detail}</span>
              </span>
              <ArrowRight size={14} weight="bold" className="mt-1 shrink-0 text-encre-3 transition-transform group-hover:translate-x-0.5 group-hover:text-primaire" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
