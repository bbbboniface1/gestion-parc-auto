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

  return (
    <div className="flex flex-col gap-5">
      <section className="carte apparition p-4 lg:p-5" aria-labelledby="titre-repartition">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="titre-repartition" className="text-[17px] font-bold">Où part l&apos;argent</h2>
            <p className="chiffres mt-1 text-[30px] leading-tight font-extrabold tracking-tight">{formatCourt(total)} <span className="text-[14px] font-semibold text-encre-3">FCFA</span></p>
          </div>
          {aPayer > 0 && <span className="rounded-full bg-ocre-voile px-3 py-1 text-[13px] font-bold text-ocre-texte">dont {formatCourt(aPayer)} encore à payer</span>}
        </div>
        <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-surface-2" role="img" aria-label="Répartition des dépenses par catégorie">
          {parCategorie.map(([cat, m]) => (
            <span key={cat} className={cn("h-full origin-left border-r-2 border-surface transition-opacity last:border-r-0 [animation:remplit_900ms_both]", categorie && categorie !== cat && "opacity-25")} style={{ width: `${(m / total) * 100}%`, background: couleurDe(cat) }} />
          ))}
        </div>
        <ul className="mt-3 grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
          {parCategorie.map(([cat, m]) => {
            const actif = categorie === cat;
            return (
              <li key={cat}>
                <button type="button" aria-pressed={actif} onClick={() => setCategorie(actif ? null : cat)}
                  className={cn("flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[14px] transition-colors hover:bg-surface-2", actif && "bg-surface-2 ring-1 ring-trait-fort")}>
                  <span className="size-3 shrink-0 rounded-[4px]" style={{ background: couleurDe(cat) }} />
                  <span className="min-w-0 flex-1 truncate">{libelleCategorie(cat)}</span>
                  <span className="chiffres font-bold">{formatCourt(m)}</span>
                  <span className="chiffres w-10 text-right text-[12px] text-encre-3">{Math.round((m / total) * 100)} %</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="apparition flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center" style={{ animationDelay: "60ms" }}>
        <label className="relative flex-1 lg:max-w-md lg:min-w-[260px]">
          <span className="sr-only">Rechercher une dépense</span>
          <MagnifyingGlass className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-encre-3" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Voiture, conteneur, fournisseur…"
            className="h-12 w-full rounded-full border border-trait bg-surface pr-10 pl-11 text-[15px] shadow-carte transition-all placeholder:text-encre-3/70 focus:border-primaire focus:shadow-[0_0_0_4px_var(--primaire-voile)] focus:outline-none lg:h-11 lg:text-sm" />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Effacer la recherche" className="absolute top-1/2 right-2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-encre-3 hover:bg-surface-2"><X className="size-4" /></button>
          )}
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Type de dépense">
          {PORTEES.map((p) => (
            <button key={p.valeur} type="button" aria-pressed={portee === p.valeur} onClick={() => setPortee(p.valeur)}
              className={cn("inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold transition-all",
                portee === p.valeur ? "bg-primaire-plein text-white shadow-bouton" : "bg-surface text-encre-2 shadow-champ ring-1 ring-trait/70 hover:text-encre")}>
              {p.valeur !== "toutes" && <p.icone size={16} weight="duotone" aria-hidden />}{p.libelle}
            </button>
          ))}
          {nbAPayer > 0 && (
            <button type="button" aria-pressed={aPayerSeul} onClick={() => setAPayerSeul((v) => !v)}
              className={cn("inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold transition-all",
                aPayerSeul ? "bg-ocre text-white shadow-[0_6px_14px_-6px_var(--ocre)]" : "bg-ocre-voile text-ocre-texte ring-1 ring-ocre/30 hover:ring-ocre/60")}>
              <Clock size={16} weight="fill" aria-hidden />À payer <span className="chiffres text-[12px] font-bold">{nbAPayer}</span>
            </button>
          )}
        </div>
      </div>

      {filtre && (
        <p className="-mt-2 flex flex-wrap items-center gap-x-3 text-[13px] text-encre-3" role="status">
          <span><strong className="text-encre">{pluriel(visibles.length, "dépense")}</strong> · <span className="chiffres font-semibold text-encre">{formatCourt(totalVisible)}</span> FCFA</span>
          {categorie && <button type="button" onClick={() => setCategorie(null)} className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-0.5 font-semibold text-encre-2 hover:bg-trait">{libelleCategorie(categorie)} <X size={12} weight="bold" aria-label="Retirer" /></button>}
          <button type="button" onClick={() => { setQ(""); setPortee("toutes"); setAPayerSeul(false); setCategorie(null); }} className="font-semibold text-primaire hover:underline">Tout afficher</button>
        </p>
      )}

      {visibles.length === 0 ? (
        <EtatVide titre="Aucune dépense ne correspond" texte="Essayez une autre recherche ou retirez un filtre." />
      ) : (
        <div className="flex flex-col gap-4">
          {jours.map(([jour, lignes], i) => (
            <section key={jour} className="apparition" style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }} aria-label={libelleJour(jour)}>
              <h3 className="mb-1.5 flex items-baseline justify-between gap-2 px-2 text-[13px] font-bold text-encre-2">
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
  );
}
