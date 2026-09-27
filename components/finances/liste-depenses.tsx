"use client";

import { useState } from "react";
import { Boat, Buildings, CarProfile, Clock, MagnifyingGlass, X } from "@phosphor-icons/react";
import type { Frais } from "@/lib/api/types";
import { libelleCategorie } from "@/lib/domaine";
import { formatCourt, formatJour, lireDate, pluriel } from "@/lib/format";
import { cn } from "@/lib/cn";
import { couleurCategorie, filtrerDepenses, montantLigne, regrouperParJour, repartitionParCategorie, type PorteeDepense } from "@/lib/depenses";
import { LigneDepense } from "./ligne-depense";
import { EtatVide } from "@/components/ui/etats";

const PORTEES: { valeur: PorteeDepense; libelle: string; icone: typeof Boat }[] = [
  { valeur: "toutes", libelle: "Toutes", icone: CarProfile },
  { valeur: "vehicule", libelle: "Voitures", icone: CarProfile },
  { valeur: "expedition", libelle: "Conteneurs", icone: Boat },
  { valeur: "generale", libelle: "Générales", icone: Buildings },
];

function libelleJour(iso: string): string {
  const d = lireDate(iso);
  if (!d) return iso;
  const auj = new Date();
  const jour = (x: Date) => Math.floor(new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime() / 86_400_000);
  const ecart = jour(auj) - jour(d);
  if (ecart === 0) return "Aujourd'hui";
  if (ecart === 1) return "Hier";
  return formatJour(iso);
}

/**
 * L'onglet Dépenses : où part l'argent (répartition par catégorie, cliquable pour filtrer), puis chaque dépense
 * rattachée à sa voiture ou à son conteneur, regroupée par jour, avec recherche et filtres.
 */
export function ListeDepenses({ liste, enEvidence, peutModifier }: { liste: Frais[]; enEvidence: string | null; peutModifier: boolean }) {
  const [q, setQ] = useState("");
  const [portee, setPortee] = useState<PorteeDepense>("toutes");
  const [aPayerSeul, setAPayerSeul] = useState(false);
  const [categorie, setCategorie] = useState<string | null>(null);

  const total = liste.reduce((s, f) => s + f.montant_xof, 0);
  const aPayer = liste.filter((f) => f.statut === "a_payer").reduce((s, f) => s + f.montant_xof, 0);
  const nbAPayer = liste.filter((f) => f.statut === "a_payer").length;
  const parCategorie = repartitionParCategorie(liste);
  const couleurDe = couleurCategorie;

  const visibles = filtrerDepenses(liste, { q, portee, aPayerSeul, categorie });
  const jours = regrouperParJour(visibles);
  const totalVisible = visibles.reduce((s, f) => s + montantLigne(f), 0);
  const filtre = q.trim() !== "" || portee !== "toutes" || aPayerSeul || categorie !== null;

  // Premier plan : le total dépensé et ce qui reste à payer ; second plan : la répartition, les filtres, les lignes.
  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <section className="carte apparition p-4 lg:p-6" aria-labelledby="titre-repartition">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="titre-repartition" className="text-[18px] font-bold">Où part l&apos;argent</h2>
            <p className="chiffres mt-1 text-[32px] leading-tight font-extrabold tracking-tight">{formatCourt(total)} <span className="text-[14px] font-semibold text-encre-3">FCFA</span></p>
          </div>
          {aPayer > 0 && <span className="inline-flex h-8 items-center rounded-full bg-ocre-voile px-3 text-[14px] font-bold text-ocre-texte">dont {formatCourt(aPayer)} encore à payer</span>}
        </div>
        <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-surface-2" role="img" aria-label="Répartition des dépenses par catégorie">
          {parCategorie.map(([cat, m]) => (
            <span key={cat} className={cn("h-full origin-left border-r-2 border-surface transition-opacity last:border-r-0 [animation:remplit_900ms_both]", categorie && categorie !== cat && "opacity-25")} style={{ width: `${(m / total) * 100}%`, background: couleurDe(cat) }} />
          ))}
        </div>
        {/* Téléphone : deux colonnes compactes (libellé, puis montant et part dessous) au lieu d'une rangée par catégorie :
            avec 14 catégories, la liste des dépenses commençait près de deux écrans plus bas. Au-delà, une rangée par
            catégorie (le conteneur des valeurs s'efface avec `contents` et ses deux chiffres prennent leurs colonnes). */}
        <ul className="mt-4 grid grid-cols-2 gap-x-2 gap-y-1 sm:gap-x-4">
          {parCategorie.map(([cat, m]) => {
            const actif = categorie === cat;
            return (
              <li key={cat} className="min-w-0">
                <button type="button" aria-pressed={actif} onClick={() => setCategorie(actif ? null : cat)}
                  className={cn("grid min-h-11 w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 rounded-lg px-2 py-1 text-left text-[14px] transition-colors hover:bg-surface-2 sm:grid-cols-[auto_minmax(0,1fr)_auto_2.5rem] sm:py-2 lg:min-h-10", actif && "bg-surface-2 ring-1 ring-trait-fort")}>
                  <span className="size-3 rounded-sm" style={{ background: couleurDe(cat) }} />
                  <span className="truncate">{libelleCategorie(cat)}</span>
                  <span className="col-start-2 flex items-baseline gap-2 sm:contents">
                    <span className="chiffres font-bold">{formatCourt(m)}</span>
                    <span className="chiffres text-right text-[12px] text-encre-3">{Math.round((m / total) * 100)} %</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Recherche, filtres et lignes forment un seul bloc : écart de 16 px entre eux, 24 / 32 px avec la répartition. */}
      <div className="flex flex-col gap-4">
        <div className="apparition flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center" style={{ animationDelay: "60ms" }}>
          <label className="relative flex-1 lg:max-w-md lg:min-w-64">
            <span className="sr-only">Rechercher une dépense</span>
            <MagnifyingGlass className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-encre-3" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Voiture, conteneur, fournisseur…"
              className="h-12 w-full rounded-full border border-trait bg-surface pr-12 pl-12 shadow-carte transition-all placeholder:text-encre-3/70 focus:border-primaire focus:ring-4 focus:ring-primaire-voile focus:outline-none lg:h-11" />
            {q && (
              <button type="button" onClick={() => setQ("")} aria-label="Effacer la recherche" className="absolute top-1/2 right-1 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-encre-3 hover:bg-surface-2 lg:right-0 lg:size-10"><X className="size-4" /></button>
            )}
          </label>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Type de dépense">
            {PORTEES.map((p) => (
              <button key={p.valeur} type="button" aria-pressed={portee === p.valeur} onClick={() => setPortee(p.valeur)}
                className={cn("onde inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition-all lg:h-10",
                  portee === p.valeur ? "bg-puce-active text-sur-puce-active shadow-puce" : "bg-surface text-encre-2 shadow-champ ring-1 ring-trait/70 hover:text-encre")}>
                {p.valeur !== "toutes" && <p.icone size={16} weight="duotone" aria-hidden />}{p.libelle}
              </button>
            ))}
            {nbAPayer > 0 && (
              <button type="button" aria-pressed={aPayerSeul} onClick={() => setAPayerSeul((v) => !v)}
                className={cn("onde inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition-all lg:h-10",
                  aPayerSeul ? "bg-puce-active text-sur-puce-active shadow-puce" : "bg-ocre-voile text-ocre-texte ring-1 ring-ocre/30 hover:ring-ocre/60")}>
                <Clock size={16} weight="fill" className={aPayerSeul ? "text-nuit-ocre" : undefined} aria-hidden />À payer <span className="chiffres text-[12px] font-bold">{nbAPayer}</span>
              </button>
            )}
          </div>
        </div>

        {filtre && (
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-encre-3" role="status">
            <span><strong className="text-encre">{pluriel(visibles.length, "dépense")}</strong> · <span className="chiffres font-semibold text-encre">{formatCourt(totalVisible)}</span> FCFA</span>
            {categorie && <button type="button" onClick={() => setCategorie(null)} className="inline-flex h-11 items-center gap-1 rounded-full bg-surface-2 px-3 font-semibold text-encre-2 hover:bg-trait lg:h-10">{libelleCategorie(categorie)} <X size={12} weight="bold" aria-label="Retirer" /></button>}
            <button type="button" onClick={() => { setQ(""); setPortee("toutes"); setAPayerSeul(false); setCategorie(null); }} className="inline-flex min-h-11 items-center font-semibold text-primaire hover:underline lg:min-h-10">Tout afficher</button>
          </p>
        )}

        {visibles.length === 0 ? (
          <EtatVide titre="Aucune dépense ne correspond" texte="Essayez une autre recherche ou retirez un filtre." />
        ) : (
          <div className="flex flex-col gap-4">
            {jours.map(([jour, lignes], i) => (
              <section key={jour} className="apparition" style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }} aria-label={libelleJour(jour)}>
                <h3 className="mb-2 flex items-baseline justify-between gap-2 px-2 text-[14px] font-bold text-encre-2">
                  <span>{libelleJour(jour)}</span>
                  <span className="chiffres text-[12px] font-semibold text-encre-3">−{formatCourt(lignes.reduce((s, f) => s + montantLigne(f), 0))} FCFA</span>
                </h3>
                <ul className="carte divide-y divide-trait/70 overflow-hidden">
                  {lignes.map((f) => <LigneDepense key={f.id} f={f} couleur={couleurDe(f.categorie)} enEvidence={f.id === enEvidence} peutModifier={peutModifier} />)}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
