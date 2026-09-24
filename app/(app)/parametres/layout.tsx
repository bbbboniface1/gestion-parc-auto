"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useOrg } from "@/lib/session";
import { cn } from "@/lib/cn";
import { sectionsPour } from "@/components/parametres/commun";

export default function ParametresLayout({ children }: { children: React.ReactNode }) {
  const org = useOrg();
  const chemin = usePathname();
  const sections = sectionsPour(org.role);
  const accueil = chemin === "/parametres" || chemin === "/parametres/";

  return (
    <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-10">
      <nav aria-label="Sections des paramètres" className="hidden lg:block">
        <p className="etiquette mb-2 text-[12px] text-encre-3">Paramètres</p>
        <ul className="sticky top-8 flex flex-col gap-0.5">
          <li>
            <Link href="/parametres/" aria-current={accueil ? "page" : undefined}
              className={cn("flex h-9 items-center rounded-controle px-3 text-sm", accueil ? "bg-surface font-medium text-encre shadow-[inset_3px_0_0_var(--laterite)]" : "text-encre-2 hover:bg-surface/60")}>
              Vue d&apos;ensemble
            </Link>
          </li>
          {sections.map((s) => {
            const actif = chemin.startsWith(`/parametres/${s.cle}`);
            return (
              <li key={s.cle}>
                <Link href={`/parametres/${s.cle}/`} aria-current={actif ? "page" : undefined}
                  className={cn("flex h-9 items-center gap-2.5 rounded-controle px-3 text-sm", actif ? "bg-surface font-medium text-encre shadow-[inset_3px_0_0_var(--laterite)]" : "text-encre-2 hover:bg-surface/60")}>
                  <s.icone className="size-4 text-encre-3" aria-hidden />
                  {s.libelle}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="min-w-0">
        {!accueil && (
          <Link href="/parametres/" className="mb-2 inline-flex h-10 items-center gap-1.5 text-[14px] text-encre-2 hover:text-encre lg:hidden">
            <ArrowLeft className="size-4" aria-hidden /> Paramètres
          </Link>
        )}
        {children}
      </div>
    </div>
  );
}
