import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

const BASE =
  "w-full rounded-controle border bg-surface text-encre placeholder:text-encre-3 transition-colors " +
  "focus:outline-none focus:border-laterite focus:shadow-[0_0_0_3px_var(--laterite-voile)] " +
  "disabled:bg-surface-2 disabled:text-encre-3";

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
        <label htmlFor={id} className="text-[13px] font-medium text-encre-2">
          {libelle}
          {facultatif && <span className="ml-1 font-normal text-encre-3">facultatif</span>}
        </label>
      )}
      {children({ id, "aria-invalid": erreur ? true : undefined, "aria-describedby": aide || erreur ? idAide : undefined })}
      {(erreur || aide) && (
        <p id={idAide} className={cn("text-[13px]", erreur ? "text-perte" : "text-encre-3")} role={erreur ? "alert" : undefined}>
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
            className={cn(classesChamp(!!erreur), "h-11 px-3 text-[15px] lg:h-10 lg:text-sm", mono && "font-mono tracking-wide", suffixe ? "pr-16" : undefined, className)}
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
        <textarea ref={ref} rows={rows} {...a11y} {...reste} className={cn(classesChamp(!!erreur), "px-3 py-2.5 text-[15px] lg:text-sm", className)} />
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
          <select ref={ref} {...a11y} {...reste} className={cn(classesChamp(!!erreur), "h-11 appearance-none pr-10 pl-3 text-[15px] lg:h-10 lg:text-sm", className)}>
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
        <label htmlFor={id} className="block text-[15px] font-medium text-encre lg:text-sm">{libelle}</label>
        {description && <p className="mt-0.5 text-[13px] text-encre-3">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={actif}
        disabled={disabled}
        onClick={() => onChange(!actif)}
        className={cn(
          "relative mt-0.5 h-7 w-12 shrink-0 rounded-full border transition-colors disabled:opacity-50",
          actif ? "border-laterite bg-laterite" : "border-trait-fort bg-surface-2",
        )}
      >
        <span className={cn("absolute top-0.5 size-[22px] rounded-full bg-surface shadow-sm transition-transform", actif ? "translate-x-[22px]" : "translate-x-0.5")} />
      </button>
    </div>
  );
}
