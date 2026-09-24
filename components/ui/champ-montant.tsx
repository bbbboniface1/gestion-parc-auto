"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatFCFA, formatNombre, SYMBOLE_DEVISE, type Devise } from "@/lib/format";
import { formaterPendantSaisie, lireMontant } from "@/lib/montant";
import { classesChamp, Enveloppe } from "./champ";

interface ProprietesChampMontant {
  libelle?: ReactNode;
  aide?: ReactNode;
  erreur?: string | null;
  facultatif?: boolean;
  valeur: number | null;
  onChange: (valeur: number | null) => void;
  devise?: Devise;
  /** Devises proposées au toucher du suffixe ; une seule = suffixe fixe */
  devises?: Devise[];
  onDevise?: (devise: Devise) => void;
  /** Taux vers le FCFA pour afficher la conversion sous le champ */
  taux?: number | null;
  placeholder?: string;
  autoFocus?: boolean;
  name?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Champ montant : clavier numérique, milliers groupés pendant la frappe, « 8,5M » et « 850k »
 * acceptés, devise au toucher du suffixe, conversion en FCFA en dessous.
 */
export function ChampMontant({
  libelle, aide, erreur, facultatif, valeur, onChange, devise = "XOF", devises, onDevise, taux,
  placeholder = "0", autoFocus, name, disabled, className,
}: ProprietesChampMontant) {
  const [texte, setTexte] = useState(() => (valeur === null ? "" : formatNombre(valeur, Number.isInteger(valeur) ? 0 : 2)));
  const [focus, setFocus] = useState(false);

  // Valeur modifiée de l'extérieur (réinitialisation, préremplissage) : on resynchronise.
  useEffect(() => {
    if (focus) return;
    setTexte(valeur === null ? "" : formatNombre(valeur, Number.isInteger(valeur) ? 0 : 2));
  }, [valeur, focus]);

  const conversion =
    devise !== "XOF" && taux && valeur ? `≈ ${formatFCFA(valeur * taux)} au taux de ${formatNombre(taux, taux % 1 ? 3 : 0)}` : null;
  const suivante = devises && devises.length > 1 ? devises[(devises.indexOf(devise) + 1) % devises.length]! : null;

  return (
    <Enveloppe libelle={libelle} aide={conversion ?? aide} erreur={erreur} facultatif={facultatif} className={className}>
      {(a11y) => (
        <div className="relative">
          <input
            {...a11y}
            name={name}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="next"
            autoFocus={autoFocus}
            disabled={disabled}
            placeholder={placeholder}
            value={texte}
            onFocus={() => setFocus(true)}
            onChange={(e) => {
              const brut = e.target.value;
              setTexte(formaterPendantSaisie(brut));
              onChange(lireMontant(brut));
            }}
            onBlur={() => {
              setFocus(false);
              const v = lireMontant(texte);
              setTexte(v === null ? "" : formatNombre(v, Number.isInteger(v) ? 0 : 2));
            }}
            className={cn(classesChamp(!!erreur), "chiffres h-12 pr-20 pl-3 text-lg font-semibold tracking-tight lg:h-11 lg:text-base")}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-1.5">
            {suivante && onDevise ? (
              <button
                type="button"
                onClick={() => onDevise(suivante)}
                className="etiquette h-9 min-w-14 rounded-[4px] border border-trait px-2 text-[13px] text-encre-2 hover:bg-surface-2"
                aria-label={`Devise : ${SYMBOLE_DEVISE[devise]}. Passer en ${SYMBOLE_DEVISE[suivante]}`}
              >
                {SYMBOLE_DEVISE[devise]}
              </button>
            ) : (
              <span className="etiquette px-2 text-[13px] text-encre-3">{SYMBOLE_DEVISE[devise]}</span>
            )}
          </div>
        </div>
      )}
    </Enveloppe>
  );
}
