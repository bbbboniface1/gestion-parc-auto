import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

const BASE =
  "w-full rounded-t-controle border-0 border-b-2 bg-surface-2 text-encre placeholder:text-encre-3 transition-colors " +
  "focus:border-encre focus:bg-surface focus:outline-none focus:shadow-none " +
  "disabled:bg-surface-2 disabled:text-encre-3 disabled:opacity-70";

export function classesChamp(erreur?: boolean) {
  return cn(BASE, erreur ? "border-perte" : "border-trait-fort");
}

interface Enveloppe {
  libelle?: ReactNode;
  aide?: ReactNode;
  erreur?: string | null;
  facultatif?: boolean;
  className?: string;
  children: (props: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => ReactNode;
}

/** Libellé au-dessus, aide ou erreur en dessous — reliés au champ pour les lecteurs d'écran. */
export function Enveloppe({ libelle, aide, erreur, facultatif, className, children }: Enveloppe) {
  const id = useId();
  const idAide = `${id}-aide`;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {libelle && (
        <label htmlFor={id} className="text-petit font-medium text-encre-2">
          {libelle}
          {facultatif && <span className="ml-1 font-normal text-encre-3">facultatif</span>}
        </label>
      )}
      {children({ id, "aria-invalid": erreur ? true : undefined, "aria-describedby": aide || erreur ? idAide : undefined })}
      {(erreur || aide) && (
        <p id={idAide} className={cn("text-petit", erreur ? "text-perte" : "text-encre-3")} role={erreur ? "alert" : undefined}>
          {erreur || aide}
        </p>
      )}
    </div>
  );
}

type ProprietesChamp = InputHTMLAttributes<HTMLInputElement> & {
  libelle?: ReactNode;
  aide?: ReactNode;
  erreur?: string | null;
  facultatif?: boolean;
  suffixe?: ReactNode;
  mono?: boolean;
  classeConteneur?: string;
};

export const Champ = forwardRef<HTMLInputElement, ProprietesChamp>(function Champ(
  { libelle, aide, erreur, facultatif, suffixe, mono, classeConteneur, className, ...reste },
  ref,
) {
  return (
    <Enveloppe libelle={libelle} aide={aide} erreur={erreur} facultatif={facultatif} className={classeConteneur}>
      {(a11y) => (
        <div className="relative">
          <input
            ref={ref}
            {...a11y}
            {...reste}
            className={cn(classesChamp(!!erreur), "h-11 px-3 text-corps lg:h-10 lg:text-corps", mono && "font-mono tracking-wide", suffixe ? "pr-16" : undefined, className)}
          />
          {suffixe && <div className="absolute inset-y-0 right-0 flex items-center pr-1">{suffixe}</div>}
        </div>
      )}
    </Enveloppe>
  );
});

type ProprietesZone = TextareaHTMLAttributes<HTMLTextAreaElement> & { libelle?: ReactNode; aide?: ReactNode; erreur?: string | null; facultatif?: boolean };

export const ZoneTexte = forwardRef<HTMLTextAreaElement, ProprietesZone>(function ZoneTexte(
  { libelle, aide, erreur, facultatif, className, rows = 3, ...reste },
  ref,
) {
  return (
    <Enveloppe libelle={libelle} aide={aide} erreur={erreur} facultatif={facultatif}>
      {(a11y) => (
        <textarea ref={ref} rows={rows} {...a11y} {...reste} className={cn(classesChamp(!!erreur), "px-3 py-2.5 text-corps", className)} />
      )}
    </Enveloppe>
  );
});

type ProprietesSelection = SelectHTMLAttributes<HTMLSelectElement> & {
  libelle?: ReactNode;
  aide?: ReactNode;
  erreur?: string | null;
  facultatif?: boolean;
  options: { valeur: string; libelle: string }[];
  vide?: string;
};

/** Liste native : sur téléphone, c'est le sélecteur du système, plus rapide qu'un menu dessiné. */
export const Selection = forwardRef<HTMLSelectElement, ProprietesSelection>(function Selection(
  { libelle, aide, erreur, facultatif, options, vide, className, ...reste },
  ref,
) {
  return (
    <Enveloppe libelle={libelle} aide={aide} erreur={erreur} facultatif={facultatif}>
      {(a11y) => (
        <div className="relative">
          <select ref={ref} {...a11y} {...reste} className={cn(classesChamp(!!erreur), "h-11 appearance-none pr-10 pl-3 text-corps lg:h-10 lg:text-corps", className)}>
            {vide !== undefined && <option value="">{vide}</option>}
            {options.map((o) => (
              <option key={o.valeur} value={o.valeur}>{o.libelle}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-encre-3" aria-hidden />
        </div>
      )}
    </Enveloppe>
  );
});

export function Interrupteur({
  actif, onChange, libelle, description, disabled,
}: { actif: boolean; onChange: (v: boolean) => void; libelle: ReactNode; description?: ReactNode; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-corps font-medium text-encre lg:text-corps">{libelle}</label>
        {description && <p className="mt-0.5 text-petit text-encre-3">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={actif}
        disabled={disabled}
        onClick={() => onChange(!actif)}
        className={cn(
          "relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50",
          actif ? "bg-encre" : "bg-trait-fort",
        )}
      >
        <span className={cn("absolute top-[3px] size-[22px] rounded-full bg-surface transition-transform", actif ? "translate-x-[23px]" : "translate-x-[3px]")} />
      </button>
    </div>
  );
}

/** Nombre simple avec unité (%, jours, chiffres) : clavier numérique, bornes appliquées à la sortie du champ. */
export function ChampNombre({ libelle, aide, erreur, valeur, onChange, unite, min, max, decimales = 0, className }: {
  libelle: ReactNode; aide?: ReactNode; erreur?: string | null; valeur: number | null;
  onChange: (v: number | null) => void; unite?: string; min?: number; max?: number; decimales?: number; className?: string;
}) {
  const borner = (v: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v));
  return (
    <Enveloppe libelle={libelle} aide={aide} erreur={erreur} className={className}>
      {(a11y) => (
        <div className="relative">
          <input
            {...a11y}
            type="text"
            inputMode={decimales ? "decimal" : "numeric"}
            value={valeur === null ? "" : String(valeur).replace(".", ",")}
            onChange={(e) => {
              const brut = e.target.value.replace(",", ".").replace(/[^\d.]/g, "");
              onChange(brut === "" ? null : Number(decimales ? brut : brut.split(".")[0]));
            }}
            onBlur={() => { if (valeur !== null) onChange(borner(Number(valeur.toFixed(decimales)))); }}
            className={cn(classesChamp(!!erreur), "chiffres h-11 px-3 text-corps lg:h-10 lg:text-corps", unite ? "pr-16" : undefined)}
          />
          {unite && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-petit text-encre-3">{unite}</span>}
        </div>
      )}
    </Enveloppe>
  );
}
