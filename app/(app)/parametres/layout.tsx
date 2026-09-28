"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GearSix, SquaresFour } from "@phosphor-icons/react";
import { useOrg } from "@/lib/session";
import { cn } from "@/lib/cn";
import { sectionsPour } from "@/components/parametres/commun";
import { FilAriane } from "@/components/ui/fil-ariane";
import { EtatVide } from "@/components/ui/etats";

export default function ParametresLayout({ children }: { children: React.ReactNode }) {
  const org = useOrg();
  const chemin = usePathname();
  const sections = sectionsPour(org.role);
  const accueil = chemin === "/parametres" || chemin === "/parametres/";
  const courante = sections.find((s) => chemin.startsWith(`/parametres/${s.cle}`));
  // Section ouverte par son adresse sans en avoir le droit : on ne montre pas un formulaire que le serveur refusera.
  const interdite = !accueil && !courante;

  return (
    <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-10">
      <nav aria-label="Sections des paramètres" className="hidden lg:block">
        <p className="etiquette mb-2 px-2 text-[11px] text-encre-3">Paramètres</p>
        <ul className="carte sticky top-8 flex flex-col gap-0.5 p-2">
          <li>
            <Link href="/parametres/" aria-current={accueil ? "page" : undefined}
              className={cn("onde flex h-10 items-center gap-2.5 rounded-xl px-2 text-sm font-medium transition-colors", accueil ? "bg-primaire-voile font-bold text-primaire" : "text-encre-2 hover:bg-surface-2")}>
              <span className="grid size-7 place-items-center rounded-lg bg-surface-2 text-encre-2"><SquaresFour size={16} weight="duotone" aria-hidden /></span>
              Vue d&apos;ensemble
            </Link>
          </li>
          {sections.map((s) => {
            const actif = chemin.startsWith(`/parametres/${s.cle}`);
            return (
              <li key={s.cle}>
                <Link href={`/parametres/${s.cle}/`} aria-current={actif ? "page" : undefined}
                  className={cn("onde flex h-10 items-center gap-2.5 rounded-xl px-2 text-sm font-medium transition-colors", actif ? "bg-primaire-voile font-bold text-primaire" : "text-encre-2 hover:bg-surface-2")}>
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg" style={{ background: `color-mix(in srgb, ${s.couleur} 14%, var(--surface))`, color: `color-mix(in srgb, ${s.couleur} 85%, var(--pole-texte))` }}>
                    <s.icone size={16} weight={actif ? "fill" : "duotone"} aria-hidden />
                  </span>
                  {s.libelle}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="min-w-0" style={courante ? ({ "--section": courante.couleur } as React.CSSProperties) : undefined}>
        {!accueil && (
          <div className="lg:hidden">
            <FilAriane retour={{ href: "/parametres/", libelle: "Paramètres", icone: GearSix, couleur: "var(--encre-3)", detail: "Toutes les sections" }} />
          </div>
        )}
        {interdite ? <EtatVide titre="Accès réservé" texte="Votre rôle ne permet pas de consulter cette section des paramètres." /> : children}
      </div>
    </div>
  );
}
