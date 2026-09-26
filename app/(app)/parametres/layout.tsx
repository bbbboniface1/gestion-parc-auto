"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GearSix, SquaresFour } from "@phosphor-icons/react";
import { useOrg } from "@/lib/session";
import { cn } from "@/lib/cn";
import { sectionsPour } from "@/components/parametres/commun";
import { FilAriane } from "@/components/ui/fil-ariane";

/** Lien du menu latéral : seul l'élément courant prend la couleur primaire ; les pictogrammes restent neutres. */
const classesLien = (actif: boolean) =>
  cn("onde flex h-10 items-center gap-3 rounded-controle px-2 text-[14px] font-medium transition-colors", actif ? "bg-primaire-voile font-bold text-primaire" : "text-encre-2 hover:bg-surface-2");
const classesTuile = (actif: boolean) =>
  cn("grid size-7 shrink-0 place-items-center rounded-lg", actif ? "bg-surface text-primaire" : "bg-surface-2 text-encre-2");

export default function ParametresLayout({ children }: { children: React.ReactNode }) {
  const org = useOrg();
  const chemin = usePathname();
  const sections = sectionsPour(org.role);
  const accueil = chemin === "/parametres" || chemin === "/parametres/";

  return (
    <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-8">
      <nav aria-label="Sections des paramètres" className="hidden lg:block">
        <p className="etiquette mb-2 px-2 text-[12px] text-encre-3">Paramètres</p>
        <ul className="carte sticky top-8 flex flex-col gap-1 p-2">
          <li>
            <Link href="/parametres/" aria-current={accueil ? "page" : undefined} className={classesLien(accueil)}>
              <span className={classesTuile(accueil)}><SquaresFour size={16} weight={accueil ? "fill" : "duotone"} aria-hidden /></span>
              Vue d&apos;ensemble
            </Link>
          </li>
          {sections.map((s) => {
            const actif = chemin.startsWith(`/parametres/${s.cle}`);
            return (
              <li key={s.cle}>
                <Link href={`/parametres/${s.cle}/`} aria-current={actif ? "page" : undefined} className={classesLien(actif)}>
                  <span className={classesTuile(actif)}>
                    <s.icone size={16} weight={actif ? "fill" : "duotone"} aria-hidden />
                  </span>
                  {s.libelle}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="min-w-0">
        {!accueil && (
          <div className="lg:hidden">
            <FilAriane retour={{ href: "/parametres/", libelle: "Paramètres", icone: GearSix, couleur: "var(--encre-3)", detail: "Toutes les sections" }} />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
