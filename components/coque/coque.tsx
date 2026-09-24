"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useIsMutating } from "@tanstack/react-query";
import { Banknote, Car, CloudOff, Ellipsis, Home, LogOut, Plus, Receipt, Search, Wallet, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { useEnLigne } from "@/lib/ecran";
import { useSession } from "@/lib/session";
import { ROLES } from "@/lib/domaine";
import { Feuille } from "@/components/ui/feuille";
import { NAVIGATION_PRINCIPALE, NAVIGATION_SECONDAIRE, estActif } from "./navigation";
import { PaletteRecherche } from "./palette-recherche";

function initiales(nom: string) {
  return nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]!.toUpperCase()).join("");
}

/** Pastille réseau : hors ligne, ou opérations en attente d'envoi. */
function EtatReseau({ surNuit }: { surNuit?: boolean }) {
  const enLigne = useEnLigne();
  const enAttente = useIsMutating({ predicate: (m) => m.state.isPaused });
  if (enLigne && !enAttente) return null;
  return (
    <span
      role="status"
      className={cn(
        "etiquette inline-flex h-7 items-center gap-1.5 rounded-[4px] border px-2 text-[12px]",
        surNuit ? "border-white/15 text-[#e7b25a]" : "border-trait bg-ocre-voile text-ocre",
      )}
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
      <div className="grid grid-cols-2 gap-2 pb-2">
        {actions.map((a) => (
          <Link key={a.href} href={a.href} onClick={onFermer} className="flex min-h-28 flex-col justify-between rounded-carte border border-trait bg-surface p-3 active:bg-surface-2">
            <a.icone className="size-6 text-laterite" aria-hidden />
            <span>
              <span className="block font-semibold text-encre">{a.titre}</span>
              <span className="block text-[13px] leading-snug text-encre-3">{a.texte}</span>
            </span>
          </Link>
        ))}
      </div>
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
            className="flex h-13 items-center gap-3 border-b border-trait px-1 text-[16px] text-encre aria-[current=page]:font-semibold">
            <e.icone className="size-5 text-encre-3" aria-hidden />
            {e.libelle}
          </Link>
        ))}
      </nav>
      {etat.organisations.length > 1 && (
        <div className="mt-5">
          <p className="etiquette mb-2 text-[12px] text-encre-3">Entreprise</p>
          {etat.organisations.map((o) => (
            <button key={o.id} type="button" onClick={() => { choisirOrganisation(o.id); onFermer(); }}
              className="flex h-12 w-full items-center justify-between rounded-controle px-1 text-left text-encre">
              <span>{o.nom} <span className="text-encre-3">· {ROLES[o.role]?.libelle}</span></span>
              {o.id === etat.org?.id && <Check className="size-5 text-laterite" aria-hidden />}
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
        className={cn("flex flex-1 flex-col items-center justify-center gap-0.5 pt-1.5 text-[11px] font-medium", actif ? "text-encre" : "text-encre-3")}>
        <Icone className={cn("size-[22px]", actif && "text-laterite")} strokeWidth={actif ? 2.1 : 1.75} aria-hidden />
        {libelle}
      </Link>
    );
  };
  return (
    <nav aria-label="Navigation principale" className="zone-sure-bas fixed inset-x-0 bottom-0 z-40 border-t border-trait bg-surface/95 backdrop-blur lg:hidden">
      <div className="flex h-16 items-stretch">
        {lien("/accueil/", "Aujourd'hui", Home, "/accueil")}
        {lien("/parc/", "Parc", Car, "/parc")}
        <div className="flex flex-1 items-center justify-center">
          <button type="button" onClick={onAjouter} aria-label="Ajouter"
            className="flex size-13 items-center justify-center rounded-[14px] bg-laterite text-sur-laterite shadow-[0_4px_12px_rgb(181_70_30/0.35)] active:bg-laterite-fonce">
            <Plus className="size-7" strokeWidth={2.2} aria-hidden />
          </button>
        </div>
        {lien("/ventes/", "Ventes", Banknote, "/ventes")}
        <button type="button" onClick={onPlus} className="flex flex-1 flex-col items-center justify-center gap-0.5 pt-1.5 text-[11px] font-medium text-encre-3">
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
        className={cn("relative flex h-10 items-center gap-3 rounded-controle px-3 text-[14px] transition-colors",
          actif ? "bg-white/[0.07] font-medium text-sur-nuit" : "text-sur-nuit-2 hover:bg-white/[0.04] hover:text-sur-nuit")}>
        {actif && <span aria-hidden className="absolute top-2 bottom-2 -left-3 w-[3px] rounded-r-sm bg-laterite" />}
        <e.icone className="size-[18px]" aria-hidden />
        {e.libelle}
      </Link>
    );
  };
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-nuit px-3 py-4 text-sur-nuit lg:flex">
      <div className="relative">
        <button type="button" onClick={() => setMenuOrg((v) => !v)} aria-expanded={menuOrg}
          className="flex w-full items-center gap-3 rounded-controle p-2 text-left hover:bg-white/[0.04]">
          <span className="grid size-9 shrink-0 place-items-center rounded-controle bg-laterite text-[13px] font-bold text-white">{initiales(org.nom)}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-semibold">{org.nom}</span>
            <span className="block truncate text-[12px] text-sur-nuit-2">{ROLES[org.role]?.libelle}{etat.mode === "demo" ? " · démonstration" : ""}</span>
          </span>
          <ChevronsUpDown className="size-4 text-sur-nuit-2" aria-hidden />
        </button>
        {menuOrg && (
          <div className="absolute top-full right-0 left-0 z-10 mt-1 rounded-carte border border-white/10 bg-nuit-2 p-1 shadow-flottante">
            {etat.organisations.map((o) => (
              <button key={o.id} type="button" onClick={() => { choisirOrganisation(o.id); setMenuOrg(false); }}
                className="flex h-9 w-full items-center justify-between rounded-controle px-2 text-left text-[13px] hover:bg-white/[0.06]">
                <span className="truncate">{o.nom}</span>
                {o.id === org.id && <Check className="size-4 text-laterite" aria-hidden />}
              </button>
            ))}
            <button type="button" onClick={() => void deconnecter()} className="mt-1 flex h-9 w-full items-center gap-2 rounded-controle border-t border-white/10 px-2 text-[13px] text-[#ef8b82] hover:bg-white/[0.06]">
              <LogOut className="size-4" aria-hidden /> {etat.mode === "demo" ? "Quitter la démonstration" : "Se déconnecter"}
            </button>
          </div>
        )}
      </div>

      <button type="button" onClick={onRecherche}
        className="mt-4 flex h-10 items-center gap-2 rounded-controle border border-white/10 px-3 text-left text-[13px] text-sur-nuit-2 hover:border-white/20">
        <Search className="size-4" aria-hidden />
        <span className="flex-1">Rechercher…</span>
        <kbd className="font-mono text-[11px] text-sur-nuit-2/80">Ctrl K</kbd>
      </button>

      <nav aria-label="Navigation principale" className="mt-5 flex flex-col gap-0.5 pl-3">
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
    <header className="zone-sure-haut sticky top-0 z-30 bg-papier/95 backdrop-blur lg:hidden">
      <div className="flex h-14 items-center gap-2 px-4">
        <span className="grid size-8 shrink-0 place-items-center rounded-controle bg-laterite text-[12px] font-bold text-white" aria-hidden>
          {initiales(etat.org.nom)}
        </span>
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{etat.org.nom}</span>
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
        {surtitre && <p className="etiquette mb-1 text-[12px] text-encre-3">{surtitre}</p>}
        <h1 className="text-[26px] leading-tight font-semibold tracking-tight text-encre lg:text-[28px]">{titre}</h1>
        {sousTitre && <p className="mt-1 text-encre-2">{sousTitre}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
