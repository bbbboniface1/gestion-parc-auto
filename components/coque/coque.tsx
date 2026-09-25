"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useIsMutating } from "@tanstack/react-query";
import { Banknote, Car, ChevronRight, CloudOff, Ellipsis, Home, LogOut, Plus, Receipt, Search, Wallet, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { useEnLigne } from "@/lib/ecran";
import { useSession } from "@/lib/session";
import { ROLES } from "@/lib/domaine";
import { Feuille } from "@/components/ui/feuille";
import { Logo } from "./logo";
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
        "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold",
        surNuit ? "bg-white/10 text-[#ffc27a]" : "bg-ocre-voile text-ocre-texte",
      )}
    >
      <CloudOff className="size-3.5" aria-hidden />
      {enLigne ? `${enAttente} en attente` : enAttente ? `Hors ligne · ${enAttente} en attente` : "Hors ligne"}
    </span>
  );
}

const ACTIONS_RAPIDES = [
  { href: "/parc/nouveau/", titre: "Véhicule", texte: "Acheté aux enchères ou localement", icone: Car, couleur: "var(--etape-achete)" },
  { href: "/ventes/nouvelle/", titre: "Vente", texte: "Facture, acompte, échéancier", icone: Receipt, couleur: "var(--primaire)" },
  { href: "/ventes/?encaisser=1", titre: "Encaissement", texte: "Versement d'un client", icone: Banknote, couleur: "var(--gain)" },
  { href: "/finances/?depense=1", titre: "Dépense", texte: "Frais d'un véhicule ou charge", icone: Wallet, couleur: "var(--accent)" },
];

function ActionsRapides({ ouverte, onFermer }: { ouverte: boolean; onFermer: () => void }) {
  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre="Ajouter">
      <div className="grid grid-cols-2 gap-3 pb-2">
        {ACTIONS_RAPIDES.map((a) => (
          <Link key={a.href} href={a.href} onClick={onFermer} className="carte carte-lien flex min-h-32 flex-col justify-between p-4">
            <span className="grid size-11 place-items-center rounded-2xl" style={{ background: `color-mix(in srgb, ${a.couleur} 14%, var(--surface))`, color: a.couleur }}>
              <a.icone className="size-6" aria-hidden />
            </span>
            <span>
              <span className="block font-bold text-encre">{a.titre}</span>
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
      <nav className="flex flex-col gap-1" aria-label="Autres sections">
        {entrees.map((e) => (
          <Link key={e.href} href={e.href} onClick={onFermer} aria-current={estActif(chemin, e) ? "page" : undefined}
            className="flex h-14 items-center gap-3 rounded-2xl px-2 text-[16px] font-medium text-encre active:bg-surface-2 aria-[current=page]:bg-primaire-voile aria-[current=page]:text-primaire">
            <span className="grid size-10 place-items-center rounded-xl bg-surface-2 text-encre-2"><e.icone className="size-5" aria-hidden /></span>
            <span className="flex-1">{e.libelle}</span>
            <ChevronRight className="size-4 text-encre-3" aria-hidden />
          </Link>
        ))}
      </nav>
      {etat.organisations.length > 1 && (
        <div className="mt-5">
          <p className="etiquette mb-2 text-[11px] text-encre-3">Entreprise</p>
          {etat.organisations.map((o) => (
            <button key={o.id} type="button" onClick={() => { choisirOrganisation(o.id); onFermer(); }}
              className="flex h-12 w-full items-center justify-between rounded-xl px-2 text-left text-encre hover:bg-surface-2">
              <span>{o.nom} <span className="text-encre-3">· {ROLES[o.role]?.libelle}</span></span>
              {o.id === etat.org?.id && <Check className="size-5 text-primaire" aria-hidden />}
            </button>
          ))}
        </div>
      )}
      <button type="button" onClick={() => void deconnecter()} className="mt-4 flex h-12 w-full items-center gap-3 rounded-xl px-2 font-medium text-perte hover:bg-perte-voile">
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
        className={cn("flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors", actif ? "text-primaire" : "text-encre-3")}>
        <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", actif && "bg-primaire-voile")}>
          <Icone className="size-[20px]" strokeWidth={actif ? 2.3 : 1.8} aria-hidden />
        </span>
        {libelle}
      </Link>
    );
  };
  return (
    <nav aria-label="Navigation principale" className="zone-sure-bas fixed inset-x-0 bottom-0 z-40 border-t border-trait/70 bg-surface/90 shadow-[0_-8px_24px_-12px_rgb(15_23_42/0.18)] backdrop-blur-xl lg:hidden">
      <div className="flex h-16 items-stretch">
        {lien("/accueil/", "Aujourd'hui", Home, "/accueil")}
        {lien("/parc/", "Parc", Car, "/parc")}
        <div className="flex flex-1 items-center justify-center">
          <button type="button" onClick={onAjouter} aria-label="Ajouter"
            className="-mt-6 flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-[#ff9a3d] to-[#f2541b] text-white shadow-[0_10px_24px_-6px_rgb(242_84_27/0.6)] ring-4 ring-papier transition-transform active:scale-95">
            <Plus className="size-7" strokeWidth={2.4} aria-hidden />
          </button>
        </div>
        {lien("/ventes/", "Ventes", Banknote, "/ventes")}
        <button type="button" onClick={onPlus} className="flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-encre-3">
          <span className="grid h-7 w-12 place-items-center"><Ellipsis className="size-[20px]" aria-hidden /></span>
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
        className={cn("group flex h-11 items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition-all",
          actif
            ? "bg-gradient-to-r from-primaire to-[#3a6cf0] text-white shadow-[0_8px_20px_-8px_rgb(36_87_229/0.9)]"
            : "text-sur-nuit-2 hover:bg-white/[0.06] hover:text-white")}>
        <e.icone className={cn("size-[18px] transition-transform group-hover:scale-110", actif ? "text-white" : "text-sur-nuit-2")} aria-hidden />
        {e.libelle}
      </Link>
    );
  };
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-gradient-to-b from-nuit to-nuit-2 px-4 py-5 text-sur-nuit lg:flex">
      <div className="mb-6 flex items-center gap-3 px-1">
        <Logo className="size-9" />
        <span className="text-[17px] font-extrabold tracking-tight">Parc Auto</span>
      </div>

      <div className="relative">
        <button type="button" onClick={() => setMenuOrg((v) => !v)} aria-expanded={menuOrg}
          className="flex w-full items-center gap-3 rounded-xl bg-white/[0.06] p-2.5 text-left ring-1 ring-white/10 transition-colors hover:bg-white/[0.1]">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#5b84ff] to-primaire text-[13px] font-bold text-white">{initiales(org.nom)}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-semibold">{org.nom}</span>
            <span className="block truncate text-[12px] text-sur-nuit-2">{ROLES[org.role]?.libelle}{etat.mode === "demo" ? " · démonstration" : ""}</span>
          </span>
          <ChevronsUpDown className="size-4 text-sur-nuit-2" aria-hidden />
        </button>
        {menuOrg && (
          <div className="absolute top-full right-0 left-0 z-10 mt-2 rounded-2xl bg-nuit-2 p-1.5 shadow-flottante ring-1 ring-white/10">
            {etat.organisations.map((o) => (
              <button key={o.id} type="button" onClick={() => { choisirOrganisation(o.id); setMenuOrg(false); }}
                className="flex h-10 w-full items-center justify-between rounded-lg px-2.5 text-left text-[13px] hover:bg-white/[0.08]">
                <span className="truncate">{o.nom}</span>
                {o.id === org.id && <Check className="size-4 text-[#7c9dff]" aria-hidden />}
              </button>
            ))}
            <button type="button" onClick={() => void deconnecter()} className="mt-1 flex h-10 w-full items-center gap-2 rounded-lg px-2.5 text-[13px] text-[#ff9b93] hover:bg-white/[0.08]">
              <LogOut className="size-4" aria-hidden /> {etat.mode === "demo" ? "Quitter la démonstration" : "Se déconnecter"}
            </button>
          </div>
        )}
      </div>

      <button type="button" onClick={onRecherche}
        className="mt-4 flex h-10 items-center gap-2 rounded-xl bg-white/[0.04] px-3 text-left text-[13px] text-sur-nuit-2 ring-1 ring-white/10 transition-colors hover:bg-white/[0.08]">
        <Search className="size-4" aria-hidden />
        <span className="flex-1">Rechercher…</span>
        <kbd className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[11px] text-sur-nuit-2">Ctrl K</kbd>
      </button>

      <p className="etiquette mt-7 mb-2 px-3 text-[10px] text-sur-nuit-2/70">Gestion</p>
      <nav aria-label="Navigation principale" className="flex flex-col gap-1">
        {NAVIGATION_PRINCIPALE.map(lien)}
      </nav>
      <div className="mt-auto flex flex-col gap-1">
        <div className="mb-2 px-1"><EtatReseau surNuit /></div>
        {NAVIGATION_SECONDAIRE.map(lien)}
      </div>
    </aside>
  );
}

function EnTeteMobile({ onRecherche }: { onRecherche: () => void }) {
  const { etat } = useSession();
  if (etat.statut !== "connecte" || !etat.org) return null;
  return (
    <header className="zone-sure-haut sticky top-0 z-30 bg-papier/85 backdrop-blur-xl lg:hidden">
      <div className="flex h-14 items-center gap-2.5 px-4">
        <Logo className="size-8" />
        <span className="min-w-0 flex-1 truncate text-[15px] font-bold">{etat.org.nom}</span>
        <EtatReseau />
        <button type="button" onClick={onRecherche} aria-label="Rechercher" className="inline-flex size-11 items-center justify-center rounded-full bg-surface text-encre-2 shadow-carte">
          <Search className="size-[20px]" aria-hidden />
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
      <main id="contenu" className="pb-28 lg:pb-12 lg:pl-64">
        <div className="mx-auto w-full max-w-[1320px] px-4 pt-2 lg:px-8 lg:pt-8">{children}</div>
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
    <div className={cn("apparition mb-5 flex flex-col gap-3 lg:mb-7 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="min-w-0">
        {surtitre && <p className="etiquette mb-1 text-[11px] text-primaire">{surtitre}</p>}
        <h1 className="text-[26px] leading-tight font-extrabold tracking-tight text-encre lg:text-[30px]">{titre}</h1>
        {sousTitre && <p className="mt-1 text-encre-3">{sousTitre}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
