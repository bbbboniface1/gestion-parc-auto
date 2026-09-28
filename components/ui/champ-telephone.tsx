"use client";

import { useState, type ReactNode } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { useAuChangement } from "@/lib/reinitialiser";
import { AUTRE, MALI, PAYS, composer, decomposer, erreurTelephone } from "@/lib/telephone";
import { Enveloppe, classesChamp } from "./champ";

/**
 * Téléphone : le Mali par défaut, on tape seulement les 8 chiffres. Pour un numéro étranger, on choisit le pays
 * dans la pastille à gauche (drapeau + indicatif) ; « Autre pays » laisse saisir l'indicatif à la main.
 * La valeur rendue est au format international : « +223 76 45 12 89 ».
 */
export function ChampTelephone({ libelle, valeur, onChange, facultatif, aide, autoFocus, className }: {
  libelle?: ReactNode;
  valeur: string;
  onChange: (valeur: string) => void;
  facultatif?: boolean;
  aide?: ReactNode;
  autoFocus?: boolean;
  className?: string;
}) {
  const initial = decomposer(valeur);
  const [pays, setPays] = useState(valeur ? initial.pays : MALI.code);
  const [indicatifLibre, setIndicatifLibre] = useState(initial.pays === AUTRE ? initial.indicatif : "");
  const [touche, setTouche] = useState(false);

  // Indicatif saisi à la main (1 à 3 chiffres) : c'est lui qui sépare l'indicatif du numéro, pas une supposition.
  const brut = decomposer(valeur);
  const chiffres = valeur.replace(/\D/g, "");
  const lu = pays === AUTRE && brut.pays === AUTRE && indicatifLibre && chiffres.startsWith(indicatifLibre)
    ? { pays: AUTRE, indicatif: indicatifLibre, national: chiffres.slice(indicatifLibre.length) }
    : brut;

  // Valeur changée de l'extérieur (formulaire rouvert sur un autre client) : on relit le pays.
  // Même indicatif (États-Unis / Canada) : le choix de l'utilisateur est gardé.
  useAuChangement([valeur], () => {
    if (!valeur) return;
    const actuel = PAYS.find((p) => p.code === pays);
    if (lu.pays === AUTRE) { setPays(AUTRE); setIndicatifLibre(lu.indicatif); }
    else if (actuel?.indicatif !== lu.indicatif) setPays(lu.pays);
  });

  const choisi = PAYS.find((p) => p.code === pays);
  const indicatif = choisi ? choisi.indicatif : indicatifLibre;
  const etranger = pays !== MALI.code;
  const erreur = touche ? erreurTelephone({ pays, indicatif, national: lu.national }) : null;

  const emettre = (ind: string, national: string) => onChange(composer(ind, national));

  return (
    <Enveloppe libelle={libelle} facultatif={facultatif} erreur={erreur} className={className}
      aide={aide ?? (etranger ? "Numéro sans le 0 initial." : "8 chiffres, sans indicatif.")}>
      {(a11y) => (
        <div className={cn(classesChamp(!!erreur), "flex h-11 items-stretch overflow-hidden focus-within:border-primaire focus-within:shadow-[0_0_0_4px_var(--primaire-voile)] lg:h-10")}>
          <span className="relative flex shrink-0 items-center gap-1.5 border-r border-trait bg-surface-2 pr-2 pl-3 text-[14px] font-semibold text-encre-2">
            <span aria-hidden className="text-[17px] leading-none">{choisi?.drapeau ?? "🌍"}</span>
            {choisi && <span className="chiffres">+{choisi.indicatif}</span>}
            <CaretDown aria-hidden className="size-3.5 text-encre-3" />
            <select aria-label="Pays du numéro" value={pays}
              onChange={(e) => {
                const code = e.target.value;
                setPays(code);
                const p = PAYS.find((x) => x.code === code);
                emettre(p ? p.indicatif : indicatifLibre, lu.national);
              }}
              className="absolute inset-0 cursor-pointer opacity-0">
              {PAYS.map((p) => <option key={p.code} value={p.code}>{p.drapeau} {p.nom} (+{p.indicatif})</option>)}
              <option value={AUTRE}>🌍 Autre pays</option>
            </select>
          </span>
          {pays === AUTRE && (
            <span className="flex shrink-0 items-center border-r border-trait pl-2 text-[14px] text-encre-3">
              +<input aria-label="Indicatif du pays" inputMode="numeric" placeholder="000" maxLength={3} value={indicatifLibre}
                onChange={(e) => { const i = e.target.value.replace(/\D/g, ""); setIndicatifLibre(i); emettre(i, lu.national); }}
                className="chiffres w-10 bg-transparent px-1 text-encre outline-none" />
            </span>
          )}
          <input {...a11y} type="tel" inputMode="tel" autoComplete="tel-national" autoFocus={autoFocus}
            placeholder={etranger ? "Numéro" : "76 45 12 89"}
            value={lu.national ? composer(indicatif, lu.national).replace(/^\+\d+ /, "") : ""}
            onChange={(e) => {
              let chiffres = e.target.value.replace(/\D/g, "");
              // Numéro collé avec son indicatif : on ne le garde pas deux fois.
              if (indicatif && chiffres.length > (etranger ? 13 : 8) && chiffres.startsWith(indicatif)) chiffres = chiffres.slice(indicatif.length);
              emettre(indicatif, chiffres.slice(0, 15 - indicatif.length));
            }}
            onBlur={() => setTouche(true)}
            className="chiffres min-w-0 flex-1 bg-transparent px-3 text-[15px] text-encre outline-none placeholder:text-encre-3/70 lg:text-sm" />
        </div>
      )}
    </Enveloppe>
  );
}
