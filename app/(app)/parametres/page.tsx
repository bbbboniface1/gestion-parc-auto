"use client";

import Link from "next/link";
import { CheckCircle2, ChevronRight, Circle } from "lucide-react";
import { useParametres } from "@/lib/api/parametres";
import { useOrg } from "@/lib/session";
import { joursDepuis } from "@/lib/format";
import { cn } from "@/lib/cn";
import { EnTetePage } from "@/components/coque/coque";
import { sectionsPour } from "@/components/parametres/commun";
import { Squelette } from "@/components/ui/etats";

/**
 * Vue d'ensemble : ce qui manque pour émettre des factures complètes et crédibles
 * (identité légale, cachet, signature, mentions), puis l'accès à chaque section.
 */
export default function PageParametres() {
  const org = useOrg();
  const { data } = useParametres();
  const p = data?.parametres;
  const sections = sectionsPour(org.role);
  const configurer = org.role === "proprietaire" || org.role === "gerant";

  const controles = p ? [
    { ok: !!p.adresse && !!p.ville, libelle: "Adresse de l'entreprise", section: "entreprise" },
    { ok: p.telephones.length > 0, libelle: "Au moins un téléphone", section: "entreprise" },
    { ok: !!p.nif, libelle: "NIF (numéro d'identification fiscale)", section: "entreprise" },
    { ok: !!p.rccm, libelle: "RCCM (registre du commerce)", section: "entreprise" },
    { ok: !!p.logo_path, libelle: "Logo", section: "entreprise" },
    { ok: !!p.cachet_path, libelle: "Cachet de l'entreprise", section: "entreprise" },
    { ok: !!p.signature_path, libelle: "Signature", section: "entreprise" },
    { ok: p.tva_active || !!p.mention_tva, libelle: "TVA : taux ou mention « non applicable »", section: "documents" },
    { ok: !!p.conditions_vente, libelle: "Conditions de vente sur les factures", section: "documents" },
    { ok: (joursDepuis(p.taux_maj_le) ?? 99) <= 30, libelle: "Taux du dollar mis à jour depuis moins de 30 jours", section: "devises" },
  ] : [];
  const faits = controles.filter((c) => c.ok).length;

  return (
    <>
      <EnTetePage titre="Paramètres" sousTitre={data?.organisation.nom} />

      {configurer && (
        <section aria-labelledby="titre-preparation" className="mb-6 carte p-4 lg:p-5">
          {!p ? (
            <Squelette className="h-24" />
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="titre-preparation" className="text-[17px] font-semibold tracking-tight">Vos factures sont prêtes à</h2>
                <span className="chiffres text-[28px] font-semibold">{Math.round((faits / controles.length) * 100)} %</span>
              </div>
              <div className="mt-3 flex h-2 gap-1" aria-hidden>
                {controles.map((c, i) => <span key={i} className={cn("flex-1 rounded-sm", c.ok ? "bg-gain" : "bg-surface-2")} />)}
              </div>
              {faits < controles.length ? (
                <ul className="mt-4 grid gap-x-6 sm:grid-cols-2">
                  {controles.map((c) => (
                    <li key={c.libelle}>
                      <Link href={`/parametres/${c.section}/`} className="flex items-center gap-2.5 border-b border-trait py-2 text-[14px] hover:bg-surface-2/50">
                        {c.ok ? <CheckCircle2 className="size-4 shrink-0 text-gain-texte" aria-hidden /> : <Circle className="size-4 shrink-0 text-encre-3" aria-hidden />}
                        <span className={cn("flex-1", c.ok ? "text-encre-3" : "text-encre")}>{c.libelle}</span>
                        <span className="sr-only">{c.ok ? "fait" : "à compléter"}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-[14px] text-encre-2">Identité légale, cachet, signature et mentions : tout y est.</p>
              )}
            </>
          )}
        </section>
      )}

      <ul className="overflow-hidden carte lg:hidden">
        {sections.map((s) => (
          <li key={s.cle} className="border-b border-trait last:border-b-0">
            <Link href={`/parametres/${s.cle}/`} className="flex items-center gap-3 px-4 py-3.5 active:bg-surface-2">
              <s.icone className="size-5 shrink-0 text-encre-3" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-medium">{s.libelle}</span>
                <span className="block truncate text-[13px] text-encre-3">{s.description}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-encre-3" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      <div className="hidden gap-3 lg:grid lg:grid-cols-2 xl:grid-cols-3">
        {sections.map((s) => (
          <Link key={s.cle} href={`/parametres/${s.cle}/`} className="flex gap-3 carte p-4 hover:border-trait-fort">
            <s.icone className="mt-0.5 size-5 shrink-0 text-primaire" aria-hidden />
            <span>
              <span className="block font-semibold">{s.libelle}</span>
              <span className="mt-0.5 block text-[13px] text-encre-3">{s.description}</span>
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
