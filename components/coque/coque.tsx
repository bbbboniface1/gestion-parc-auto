"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useIsMutating } from "@tanstack/react-query";
import { CaretUpDown, Car, Check, CloudSlash, GearSix, HandCoins, Invoice, MagnifyingGlass, Plus, SignOut, SquaresFour, Wallet } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { useEnLigne } from "@/lib/ecran";
import { useSession } from "@/lib/session";
import { ROLES } from "@/lib/domaine";
import { Feuille } from "@/components/ui/feuille";
import { Picto } from "@/components/ui/picto";
import { useCompteursNavigation, type Compteur } from "@/lib/compteurs";
import { EffetsGlobaux } from "./effets";
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
        "inline-flex h-7 items-center gap-2 rounded-full px-3 text-[12px] font-semibold",
        surNuit ? "bg-white/10 text-nuit-ocre" : "bg-ocre-voile text-ocre-texte",
      )}
    >
      <CloudSlash size={14} weight="bold" aria-hidden />
      {enLigne ? `${enAttente} en attente` : enAttente ? `Hors ligne · ${enAttente} en attente` : "Hors ligne"}
    </span>
  );
}

const ACTIONS_RAPIDES = [
  // La palette --etape-* ne parle que des étapes du voyage : le véhicule prend la couleur de la section Parc.
  { href: "/parc/nouveau/", titre: "Véhicule", texte: "Acheté aux enchères ou localement", icone: Car, couleur: "var(--etape-achete)" },
  { href: "/ventes/nouvelle/", titre: "Vente", texte: "Facture, acompte, échéancier", icone: Invoice, couleur: "var(--gain)" },
  { href: "/ventes/?encaisser=1", titre: "Encaissement", texte: "Versement d'un client", icone: HandCoins, couleur: "var(--primaire)" },
  { href: "/finances/?depense=1", titre: "Dépense", texte: "Frais d'un véhicule ou charge", icone: Wallet, couleur: "var(--accent)" },
];

function ActionsRapides({ ouverte, onFermer }: { ouverte: boolean; onFermer: () => void }) {
  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre="Ajouter">
      <div className="grid grid-cols-2 gap-3 pb-2">
        {ACTIONS_RAPIDES.map((a) => (
          <Link key={a.href} href={a.href} onClick={onFermer} className="carte carte-lien onde flex min-h-32 flex-col justify-between p-4">
            <Picto icone={a.icone} couleur={a.couleur} taille="md" />
            <span>
              <span className="block text-[16px] leading-tight font-bold text-encre">{a.titre}</span>
              <span className="mt-1 block text-[14px] leading-snug text-encre-3">{a.texte}</span>
            </span>
          </Link>
        ))}
      </div>
    </Feuille>
  );
}

/**
 * Deux significations, deux apparences, jamais mélangées :
 *  - action en attente : pastille pleine (bleue, rouge si urgente) ;
 *  - statut à connaître : contour seul, couleur du texte secondaire.
 */
function classesBadge(c: Compteur, fond: "surface" | "nuit") {
  if (c.genre === "statut") return fond === "nuit" ? "text-sur-nuit-2 ring-1 ring-inset ring-white/30" : "bg-surface text-encre-3 ring-1 ring-inset ring-trait-fort";
  return c.alerte ? "bg-perte text-white" : "bg-primaire-plein text-white";
}

function Badge({ c, surNuit }: { c?: Compteur; surNuit?: boolean }) {
  if (!c) return null;
  return (
    <span title={c.sens} aria-label={c.sens}
      className={cn("chiffres ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[12px] font-bold", classesBadge(c, surNuit ? "nuit" : "surface"))}>
      {c.valeur}
    </span>
  );
}

function MenuPlus({ ouverte, onFermer }: { ouverte: boolean; onFermer: () => void }) {
  const { etat, choisirOrganisation, deconnecter } = useSession();
  const chemin = usePathname();
  const compteurs = useCompteursNavigation();
  const entrees = [...NAVIGATION_PRINCIPALE, ...NAVIGATION_SECONDAIRE];
  if (etat.statut !== "connecte") return null;
  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre="Menu">
      <nav className="grid grid-cols-2 gap-3" aria-label="Toutes les sections">
        {entrees.map((e, i) => {
          const c = e.compteur ? compteurs[e.compteur] : undefined;
          return (
            <Link key={e.href} href={e.href} onClick={onFermer} aria-current={estActif(chemin, e) ? "page" : undefined}
              className="carte carte-lien onde apparition flex flex-col gap-2 p-4 aria-[current=page]:ring-2 aria-[current=page]:ring-primaire" style={{ animationDelay: `${i * 30}ms` }}>
              <span className="flex items-start">
                <Picto icone={e.icone} couleur={e.couleur} taille="sm" />
                <Badge c={c} />
              </span>
              <span>
                <span className="block text-[14px] leading-tight font-bold text-encre">{e.libelle}</span>
                <span className="mt-1 block text-[12px] leading-snug text-encre-3">{c ? c.sens : e.description}</span>
              </span>
            </Link>
          );
        })}
      </nav>
      {etat.organisations.length > 1 && (
        <div className="mt-6">
          <p className="etiquette mb-2 text-[12px] text-encre-3">Entreprise</p>
          {etat.organisations.map((o) => (
            <button key={o.id} type="button" onClick={() => { choisirOrganisation(o.id); onFermer(); }}
              className="flex h-12 w-full items-center justify-between rounded-xl px-2 text-left text-encre hover:bg-surface-2">
              <span>{o.nom} <span className="text-encre-3">· {ROLES[o.role]?.libelle}</span></span>
              {o.id === etat.org?.id && <Check size={20} weight="bold" className="text-primaire" aria-hidden />}
            </button>
          ))}
        </div>
      )}
      <button type="button" onClick={() => void deconnecter()} className="onde mt-4 flex h-12 w-full items-center gap-3 rounded-xl px-2 font-semibold text-perte-texte hover:bg-perte-voile">
        <SignOut size={20} weight="duotone" aria-hidden /> {etat.mode === "demo" ? "Quitter la démonstration" : "Se déconnecter"}
      </button>
    </Feuille>
  );
}

function BarreMobile({ onAjouter, onPlus }: { onAjouter: () => void; onPlus: () => void }) {
  const chemin = usePathname();
  const compteurs = useCompteursNavigation();
  const [accueil, parc, ventes] = [NAVIGATION_PRINCIPALE[0]!, NAVIGATION_PRINCIPALE[1]!, NAVIGATION_PRINCIPALE[2]!];
  const lien = (e: typeof accueil, libelle: string) => {
    const actif = estActif(chemin, e);
    const c = e.compteur ? compteurs[e.compteur] : undefined;
    return (
      <Link href={e.href} aria-current={actif ? "page" : undefined}
        className={cn("onde relative flex flex-1 flex-col items-center justify-center gap-1 text-[12px] font-semibold transition-colors", actif ? "text-encre" : "text-encre-3")}>
        <span className={cn("relative grid h-8 w-12 place-items-center rounded-full transition-all", actif && "scale-[1.03]")}
          style={actif ? { background: `color-mix(in srgb, ${e.couleur} 16%, var(--surface))`, color: `color-mix(in srgb, ${e.couleur} 85%, var(--pole-texte))` } : undefined}>
          <e.icone size={22} weight={actif ? "fill" : "duotone"} aria-hidden />
          {c && (
            <span aria-label={c.sens} className={cn("chiffres absolute -top-1 right-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold outline-2 outline-surface", classesBadge(c, "surface"))}>{c.valeur}</span>
          )}
        </span>
        {libelle}
      </Link>
    );
  };
  return (
    <nav aria-label="Navigation principale" className="zone-sure-bas fixed inset-x-0 bottom-0 z-40 border-t border-trait/70 bg-surface/90 shadow-barre-bas backdrop-blur-xl lg:hidden">
      <div className="flex h-16 items-stretch">
        {lien(accueil, "Accueil")}
        {lien(parc, "Parc")}
        <div className="flex flex-1 items-center justify-center">
          <button type="button" onClick={onAjouter} aria-label="Ajouter : véhicule, vente, encaissement, dépense"
            className="onde -mt-6 flex size-14 items-center justify-center rounded-full bg-accent-plein text-white shadow-flottante ring-4 ring-papier transition-transform active:scale-95">
            <Plus size={28} weight="bold" aria-hidden />
          </button>
        </div>
        {lien(ventes, "Ventes")}
        <button type="button" onClick={onPlus} className="onde flex flex-1 flex-col items-center justify-center gap-1 text-[12px] font-semibold text-encre-3">
          <span className="grid h-8 w-12 place-items-center"><SquaresFour size={22} weight="duotone" aria-hidden /></span>
          Menu
        </button>
      </div>
    </nav>
  );
}

function RailOrdinateur({ onRecherche }: { onRecherche: () => void }) {
  const { etat, choisirOrganisation, deconnecter } = useSession();
  const chemin = usePathname();
  const compteurs = useCompteursNavigation();
  const [menuOrg, setMenuOrg] = useState(false);
  if (etat.statut !== "connecte" || !etat.org) return null;
  const org = etat.org;
  const lien = (e: (typeof NAVIGATION_PRINCIPALE)[number]) => {
    const actif = estActif(chemin, e);
    const c = e.compteur ? compteurs[e.compteur] : undefined;
    return (
      <Link key={e.href} href={e.href} aria-current={actif ? "page" : undefined} title={e.description} aria-label={e.libelle}
        className={cn("group onde relative flex h-12 items-center gap-3 rounded-xl px-2 text-[14px] font-medium transition-all max-rail:justify-center max-rail:px-0",
          actif ? "bg-white/[0.11] text-white ring-1 ring-inset ring-white/12" : "text-sur-nuit-2 hover:bg-white/[0.06] hover:text-white")}>
        <span className="grid size-8 shrink-0 place-items-center rounded-lg transition-transform group-hover:scale-[1.03]"
          style={{ background: actif ? e.couleur : `color-mix(in srgb, ${e.couleur} 22%, transparent)`, color: actif ? "white" : `color-mix(in srgb, ${e.couleur} 55%, white)` }}>
          <e.icone size={18} weight={actif ? "fill" : "duotone"} aria-hidden />
        </span>
        <span className="truncate max-rail:hidden">{e.libelle}</span>
        <span className="contents max-rail:hidden"><Badge c={c} surNuit /></span>
        {c && (
          <span aria-hidden className={cn("chiffres absolute top-0.5 right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-nuit px-1 text-[10px] font-bold outline-2 outline-nuit rail:hidden", classesBadge(c, "nuit"))}>{c.valeur}</span>
        )}
      </Link>
    );
  };
  return (
    <aside className="sans-barre fixed inset-y-0 left-0 z-30 hidden w-20 flex-col overflow-y-auto bg-nuit px-2 py-6 text-sur-nuit lg:flex rail:w-64 rail:px-4">
      <div className="mb-6 flex shrink-0 items-center justify-center gap-3 px-1 rail:justify-start [@media(max-height:700px)]:mb-3">
        <Logo className="size-9" />
        <span className="text-[18px] font-extrabold tracking-tight max-rail:hidden">Parc Auto</span>
      </div>

      <div className="relative">
        <button type="button" onClick={() => setMenuOrg((v) => !v)} aria-expanded={menuOrg} title={org.nom} aria-label={org.nom}
          className="onde flex w-full items-center gap-3 rounded-xl bg-white/[0.06] p-2 text-left ring-1 ring-white/10 transition-colors hover:bg-white/[0.1] max-rail:justify-center max-rail:p-1">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primaire-plein text-[14px] font-bold text-white">{initiales(org.nom)}</span>
          <span className="min-w-0 flex-1 max-rail:hidden">
            <span className="block truncate text-[14px] font-semibold">{org.nom}</span>
            <span className="block truncate text-[12px] text-sur-nuit-2">{ROLES[org.role]?.libelle}{etat.mode === "demo" ? " · démonstration" : ""}</span>
          </span>
          <CaretUpDown size={16} className="text-sur-nuit-2 max-rail:hidden" aria-hidden />
        </button>
        {menuOrg && (
          <div className="absolute top-full left-0 z-10 mt-2 min-w-56 rounded-carte bg-nuit-2 p-1 shadow-flottante ring-1 ring-white/10 [animation:apparition_180ms_both] rail:right-0">
            {etat.organisations.map((o) => (
              <button key={o.id} type="button" onClick={() => { choisirOrganisation(o.id); setMenuOrg(false); }}
                className="flex h-10 w-full items-center justify-between gap-2 rounded-lg px-3 text-left text-[14px] hover:bg-white/[0.08]">
                <span className="truncate">{o.nom}</span>
                {o.id === org.id && <Check size={16} weight="bold" className="text-nuit-primaire" aria-hidden />}
              </button>
            ))}
            <button type="button" onClick={() => void deconnecter()} className="mt-1 flex h-10 w-full items-center gap-2 rounded-lg px-3 text-[14px] text-nuit-perte hover:bg-white/[0.08]">
              <SignOut size={16} aria-hidden /> {etat.mode === "demo" ? "Quitter la démonstration" : "Se déconnecter"}
            </button>
          </div>
        )}
      </div>

      <button type="button" onClick={onRecherche} aria-label="Rechercher" title="Rechercher (Ctrl K)"
        className="onde mt-4 flex h-10 items-center gap-2 rounded-xl bg-white/[0.04] px-3 text-left text-[14px] text-sur-nuit-2 ring-1 ring-white/10 transition-colors hover:bg-white/[0.08] max-rail:justify-center max-rail:px-0">
        <MagnifyingGlass size={16} weight="bold" aria-hidden />
        <span className="flex-1 truncate max-rail:hidden">Rechercher…</span>
        <kbd className="inline-flex h-6 items-center rounded-md bg-white/10 px-2 font-mono text-[12px] text-sur-nuit-2 max-rail:hidden">Ctrl K</kbd>
      </button>

      <p className="etiquette mt-8 mb-2 px-2 text-[12px] text-sur-nuit-2/70 max-rail:hidden">Gestion</p>
      <nav aria-label="Navigation principale" className="flex flex-col gap-1 max-rail:mt-6">
        {NAVIGATION_PRINCIPALE.map(lien)}
      </nav>
      <div className="mt-auto flex shrink-0 flex-col gap-1 pt-4">
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
      <div className="flex h-14 items-center gap-2 px-4">
        <Logo className="size-8" />
        <span className="min-w-0 flex-1 truncate text-[16px] font-bold">{etat.org.nom}</span>
        <EtatReseau />
        <Link href="/parametres/" aria-label="Paramètres" title="Paramètres"
          className="onde grid size-11 shrink-0 place-items-center rounded-full bg-surface text-encre-2 shadow-carte ring-1 ring-trait/70">
          <GearSix size={20} weight="duotone" aria-hidden />
        </Link>
        <button type="button" onClick={onRecherche} className="onde inline-flex h-11 items-center gap-2 rounded-full bg-surface px-4 text-[14px] font-semibold text-encre-2 shadow-carte ring-1 ring-trait/70">
          <MagnifyingGlass size={17} weight="bold" aria-hidden /> Chercher
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
      <main id="contenu" className="pb-28 lg:pb-12 lg:pl-20 rail:pl-64">
        <div className="mx-auto w-full max-w-[1320px] px-4 pt-2 lg:px-8 lg:pt-8">{children}</div>
      </main>
      <BarreMobile onAjouter={() => setAjouter(true)} onPlus={() => setPlus(true)} />
      <ActionsRapides ouverte={ajouter} onFermer={() => setAjouter(false)} />
      <MenuPlus ouverte={plus} onFermer={() => setPlus(false)} />
      <EffetsGlobaux />
      <PaletteRecherche ouverte={recherche} onFermer={() => setRecherche(false)} onAller={(href) => { setRecherche(false); router.push(href); }} />
    </div>
  );
}

/** En-tête de page : titre, sous-titre facultatif, actions à droite (en dessous sur téléphone). */
export function EnTetePage({ titre, surtitre, sousTitre, actions, className }: {
  titre: ReactNode; surtitre?: ReactNode; sousTitre?: ReactNode; actions?: ReactNode; className?: string;
}) {
  return (
    <div className={cn("apparition mb-6 flex flex-col gap-4 lg:mb-8 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="min-w-0">
        {surtitre && <p className="etiquette mb-1 text-[12px] text-primaire">{surtitre}</p>}
        <h1 className="text-[24px] leading-tight font-extrabold tracking-tight text-encre lg:text-[32px]">{titre}</h1>
        {sousTitre && <p className="mt-1 text-[14px] text-encre-3 lg:text-[16px]">{sousTitre}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 lg:shrink-0 lg:flex-nowrap">{actions}</div>}
    </div>
  );
}
