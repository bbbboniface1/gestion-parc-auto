"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useIsMutating } from "@tanstack/react-query";
import { Banknote, Car, CloudOff, Ellipsis, Home, LogOut, Plus, Receipt, Search, Wallet, ChevronsUpDown, Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { useEnLigne } from "@/lib/ecran";
import { useSession } from "@/lib/session";
import { ROLES } from "@/lib/domaine";
import { Feuille } from "@/components/ui/feuille";
import { NAVIGATION_PRINCIPALE, NAVIGATION_SECONDAIRE, estActif } from "./navigation";
import { PaletteRecherche } from "./palette-recherche";

/** Pastille réseau : hors ligne, ou opérations en attente d'envoi. */
function EtatReseau({ surNuit }: { surNuit?: boolean }) {
  const enLigne = useEnLigne();
  const enAttente = useIsMutating({ predicate: (m) => m.state.isPaused });
  if (enLigne && !enAttente) return null;
  return (
    <span
      role="status"
      className={cn("etiquette inline-flex h-7 items-center gap-1.5 text-petit", surNuit ? "text-[#f0a04b]" : "text-ocre")}
    >
      <CloudOff className="size-3.5" aria-hidden />
      {enLigne ? `${enAttente} en attente` : enAttente ? `Hors ligne · ${enAttente} en attente` : "Hors ligne"}
    </span>
  );
}

function ActionsRapides({ ouverte, onFermer }: { ouverte: boolean; onFermer: () => void }) {
  const actions = [
    { href: "/parc/nouveau/", titre: "Véhicule", texte: "Acheté aux enchères ou localement", icone: Car },
    { href: "/ventes/nouvelle/", titre: "Vente", texte: "Facture, acompte, échéancier", icone: Receipt },
    { href: "/ventes/?encaisser=1", titre: "Encaissement", texte: "Versement d'un client", icone: Banknote },
    { href: "/finances/?depense=1", titre: "Dépense", texte: "Frais d'un véhicule ou charge", icone: Wallet },
  ];
  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre="Ajouter">
      <nav aria-label="Ajouter" className="flex flex-col pb-2">
        {actions.map((a) => (
          <Link key={a.href} href={a.href} onClick={onFermer} className="flex min-h-16 items-center gap-4 border-b border-trait py-3 last:border-b-0 active:bg-surface-2">
            <a.icone className="size-6 shrink-0 text-encre" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-encre">{a.titre}</span>
              <span className="block text-petit text-encre-3">{a.texte}</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-encre-3" aria-hidden />
          </Link>
        ))}
      </nav>
    </Feuille>
  );
}

function MenuPlus({ ouverte, onFermer }: { ouverte: boolean; onFermer: () => void }) {
  const { etat, choisirOrganisation, deconnecter } = useSession();
  const chemin = usePathname();
  const entrees = [...NAVIGATION_PRINCIPALE.slice(3), ...NAVIGATION_SECONDAIRE];
  if (etat.statut !== "connecte") return null;
  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre="Plus">
      <nav className="flex flex-col" aria-label="Autres sections">
        {entrees.map((e) => (
          <Link key={e.href} href={e.href} onClick={onFermer} aria-current={estActif(chemin, e) ? "page" : undefined}
            className="flex h-13 items-center gap-3 border-b border-trait px-1 text-corps text-encre aria-[current=page]:font-semibold">
            <e.icone className="size-5 text-encre-3" aria-hidden />
            {e.libelle}
          </Link>
        ))}
      </nav>
      {etat.organisations.length > 1 && (
        <div className="mt-5">
          <p className="etiquette mb-2 text-petit text-encre-3">Entreprise</p>
          {etat.organisations.map((o) => (
            <button key={o.id} type="button" onClick={() => { choisirOrganisation(o.id); onFermer(); }}
              className="flex h-12 w-full items-center justify-between rounded-controle px-1 text-left text-encre">
              <span>{o.nom} <span className="text-encre-3">· {ROLES[o.role]?.libelle}</span></span>
              {o.id === etat.org?.id && <Check className="size-5 text-lien" aria-hidden />}
            </button>
          ))}
        </div>
      )}
      <button type="button" onClick={() => void deconnecter()} className="mt-4 flex h-12 w-full items-center gap-3 px-1 text-perte">
        <LogOut className="size-5" aria-hidden /> {etat.mode === "demo" ? "Quitter la démonstration" : "Se déconnecter"}
      </button>
    </Feuille>
  );
}

function BarreMobile({ onAjouter, onPlus }: { onAjouter: () => void; onPlus: () => void }) {
  const chemin = usePathname();
  const lien = (href: string, libelle: string, Icone: typeof Home, prefixe: string) => {
    const actif = chemin.startsWith(prefixe);
    return (
      <Link href={href} aria-current={actif ? "page" : undefined}
        className={cn("relative flex flex-1 flex-col items-center justify-center gap-0.5 pt-1 text-petit", actif ? "font-semibold text-encre" : "text-encre-3")}>
        {actif && <span aria-hidden className="absolute inset-x-3 top-0 h-[3px] bg-signal" />}
        <Icone className="size-[22px]" strokeWidth={actif ? 2.2 : 1.75} aria-hidden />
        {libelle}
      </Link>
    );
  };
  return (
    <nav aria-label="Navigation principale" className="zone-sure-bas fixed inset-x-0 bottom-0 z-40 border-t border-trait bg-surface lg:hidden">
      <div className="flex h-16 items-stretch">
        {lien("/accueil/", "Aujourd'hui", Home, "/accueil")}
        {lien("/parc/", "Parc", Car, "/parc")}
        <div className="flex flex-1 items-center justify-center">
          <button type="button" onClick={onAjouter} aria-label="Ajouter"
            className="flex size-12 items-center justify-center rounded-controle bg-signal text-sur-signal active:bg-signal-fonce">
            <Plus className="size-7" strokeWidth={2.4} aria-hidden />
          </button>
        </div>
        {lien("/ventes/", "Ventes", Banknote, "/ventes")}
        <button type="button" onClick={onPlus} className="flex flex-1 flex-col items-center justify-center gap-0.5 pt-1 text-petit text-encre-3">
          <Ellipsis className="size-[22px]" aria-hidden />
          Plus
        </button>
      </div>
    </nav>
  );
}

function RailOrdinateur({ onRecherche }: { onRecherche: () => void }) {
  const { etat, choisirOrganisation, deconnecter } = useSession();
  const chemin = usePathname();
  const [menuOrg, setMenuOrg] = useState(false);
  if (etat.statut !== "connecte" || !etat.org) return null;
  const org = etat.org;
  const lien = (e: (typeof NAVIGATION_PRINCIPALE)[number]) => {
    const actif = estActif(chemin, e);
    return (
      <Link key={e.href} href={e.href} aria-current={actif ? "page" : undefined}
        className={cn("relative flex h-10 items-center gap-3 px-3 text-corps transition-colors",
          actif ? "font-semibold text-sur-nuit" : "text-sur-nuit-2 hover:text-sur-nuit")}>
        {actif && <span aria-hidden className="absolute inset-y-1.5 -left-3 w-[4px] bg-signal" />}
        <e.icone className="size-[18px]" aria-hidden />
        {e.libelle}
      </Link>
    );
  };
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-nuit px-3 py-4 text-sur-nuit lg:flex">
      <div className="relative">
        <button type="button" onClick={() => setMenuOrg((v) => !v)} aria-expanded={menuOrg}
          className="flex w-full items-center gap-3 p-2 text-left hover:bg-white/[0.04]">
          <span aria-hidden className="size-3 shrink-0 bg-signal" />
          <span className="min-w-0 flex-1">
            <span className="etiquette block truncate text-corps text-sur-nuit">{org.nom}</span>
            <span className="block truncate text-petit text-sur-nuit-2">{ROLES[org.role]?.libelle}{etat.mode === "demo" ? " · démonstration" : ""}</span>
          </span>
          <ChevronsUpDown className="size-4 text-sur-nuit-2" aria-hidden />
        </button>
        {menuOrg && (
          <div className="absolute top-full right-0 left-0 z-10 mt-1 rounded-carte border border-white/10 bg-nuit-2 p-1 shadow-flottante">
            {etat.organisations.map((o) => (
              <button key={o.id} type="button" onClick={() => { choisirOrganisation(o.id); setMenuOrg(false); }}
                className="flex h-9 w-full items-center justify-between rounded-controle px-2 text-left text-petit hover:bg-white/[0.06]">
                <span className="truncate">{o.nom}</span>
                {o.id === org.id && <Check className="size-4 text-lien" aria-hidden />}
              </button>
            ))}
            <button type="button" onClick={() => void deconnecter()} className="mt-1 flex h-9 w-full items-center gap-2 rounded-controle border-t border-white/10 px-2 text-petit text-[#ef8b82] hover:bg-white/[0.06]">
              <LogOut className="size-4" aria-hidden /> {etat.mode === "demo" ? "Quitter la démonstration" : "Se déconnecter"}
            </button>
          </div>
        )}
      </div>

      <button type="button" onClick={onRecherche}
        className="mt-4 flex h-10 items-center gap-2 border-b border-white/20 px-2 text-left text-petit text-sur-nuit-2 hover:border-white/50">
        <Search className="size-4" aria-hidden />
        <span className="flex-1">Rechercher…</span>
        <kbd className="font-mono text-petit text-sur-nuit-2/80">Ctrl K</kbd>
      </button>

      <nav aria-label="Navigation principale" className="mt-6 flex flex-col gap-0.5 pl-3">
        {NAVIGATION_PRINCIPALE.map(lien)}
      </nav>
      <div className="mt-auto flex flex-col gap-0.5 pl-3">
        <div className="mb-2 pl-0"><EtatReseau surNuit /></div>
        {NAVIGATION_SECONDAIRE.map(lien)}
      </div>
    </aside>
  );
}

function EnTeteMobile({ onRecherche }: { onRecherche: () => void }) {
  const { etat } = useSession();
  if (etat.statut !== "connecte" || !etat.org) return null;
  return (
    <header className="zone-sure-haut sticky top-0 z-30 bg-papier lg:hidden">
      <div className="flex h-14 items-center gap-2 px-4">
        <span aria-hidden className="size-3 shrink-0 bg-signal" />
        <span className="etiquette min-w-0 flex-1 truncate text-corps">{etat.org.nom}</span>
        <EtatReseau />
        <button type="button" onClick={onRecherche} aria-label="Rechercher" className="inline-flex size-11 items-center justify-center rounded-controle text-encre-2">
          <Search className="size-[22px]" aria-hidden />
        </button>
      </div>
    </header>
  );
}

export function Coque({ children }: { children: ReactNode }) {
  const [recherche, setRecherche] = useState(false);
  const [ajouter, setAjouter] = useState(false);
  const [plus, setPlus] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setRecherche((v) => !v);
      }
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, []);

  return (
    <div className="min-h-dvh">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-controle focus:bg-surface focus:px-3 focus:py-2">
        Aller au contenu
      </a>
      <RailOrdinateur onRecherche={() => setRecherche(true)} />
      <EnTeteMobile onRecherche={() => setRecherche(true)} />
      <main id="contenu" className="pb-28 lg:pb-12 lg:pl-60">
        <div className="mx-auto w-full max-w-[1280px] px-4 pt-2 lg:px-8 lg:pt-8">{children}</div>
      </main>
      <BarreMobile onAjouter={() => setAjouter(true)} onPlus={() => setPlus(true)} />
      <ActionsRapides ouverte={ajouter} onFermer={() => setAjouter(false)} />
      <MenuPlus ouverte={plus} onFermer={() => setPlus(false)} />
      <PaletteRecherche ouverte={recherche} onFermer={() => setRecherche(false)} onAller={(href) => { setRecherche(false); router.push(href); }} />
    </div>
  );
}

/** En-tête de page : titre, sous-titre facultatif, actions à droite (en dessous sur téléphone). */
export function EnTetePage({ titre, surtitre, sousTitre, actions, className }: {
  titre: ReactNode; surtitre?: ReactNode; sousTitre?: ReactNode; actions?: ReactNode; className?: string;
}) {
  return (
    <div className={cn("mb-5 flex flex-col gap-3 lg:mb-7 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="min-w-0">
        {surtitre && <p className="etiquette mb-1 text-petit text-encre-3">{surtitre}</p>}
        <h1 className="text-titre font-semibold text-encre">{titre}</h1>
        {sousTitre && <p className="mt-1 text-encre-2">{sousTitre}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
