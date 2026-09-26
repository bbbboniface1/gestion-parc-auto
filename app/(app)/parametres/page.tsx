"use client";

import Link from "next/link";
import { CaretRight, CheckCircle, Circle } from "@phosphor-icons/react";
import { useParametres } from "@/lib/api/parametres";
import { useOrg } from "@/lib/session";
import { joursDepuis } from "@/lib/format";
import { cn } from "@/lib/cn";
import { decalage } from "@/lib/animation";
import { EnTetePage } from "@/components/coque/coque";
import { sectionsPour } from "@/components/parametres/commun";
import { AnneauPaiement } from "@/components/ventes/paiement-visuel";
import { Picto } from "@/components/ui/picto";
import { Squelette } from "@/components/ui/etats";

/**
 * Vue d'ensemble : ce qui manque pour émettre des factures complètes et crédibles
 * (identité légale, cachet, signature, mentions), puis l'accès à chaque section.
 * Premier plan : la préparation des factures (anneau, pourcentage en 24 px, éléments à compléter).
 * Second plan : les sections, en teinte neutre ; celles qui ont encore un élément manquant prennent l'accent primaire.
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
  const restants = controles.filter((c) => !c.ok);
  // Seul accent de l'écran : les sections où il reste un élément de la liste ci-dessus. Les autres restent neutres.
  const aCompleter = new Set(configurer ? restants.map((c) => c.section) : []);

  return (
    <>
      <EnTetePage titre="Paramètres" sousTitre={data?.organisation.nom ? `${data.organisation.nom} · réglages de l'entreprise et de vos factures` : undefined} />

      {configurer && (
        <section aria-labelledby="titre-preparation" className="carte apparition mb-6 p-4 lg:mb-8 lg:p-6">
          {!p ? (
            <Squelette className="h-28" />
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <AnneauPaiement encaisse={faits} total={controles.length} taille={120} />
              <div className="min-w-0 flex-1">
                <h2 id="titre-preparation" className="text-[24px] leading-tight font-extrabold tracking-tight">
                  {restants.length === 0 ? "Vos factures sont complètes" : `Vos factures sont prêtes à ${Math.round((faits / controles.length) * 100)} %`}
                </h2>
                <p className="mt-1 text-[14px] text-encre-3">
                  {restants.length === 0 ? "Identité légale, cachet, signature et mentions : tout y est." : `Il reste ${restants.length} élément${restants.length > 1 ? "s" : ""} pour des factures crédibles devant un client ou la banque.`}
                </p>
                {restants.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {controles.map((c) => (
                      <li key={c.libelle}>
                        <Link href={`/parametres/${c.section}/`}
                          className={cn("onde inline-flex h-11 items-center gap-2 rounded-full px-3 text-[14px] font-semibold transition-colors lg:h-10",
                            c.ok ? "bg-gain-voile text-gain-texte" : "bg-surface-2 text-encre-2 ring-1 ring-trait-fort hover:bg-primaire-voile hover:text-primaire")}>
                          {c.ok ? <CheckCircle size={16} weight="fill" aria-hidden /> : <Circle size={16} weight="bold" aria-hidden />}
                          {c.libelle}
                          <span className="sr-only">{c.ok ? " : fait" : " : à compléter"}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:gap-6 xl:grid-cols-3">
        {sections.map((s, i) => (
          <Link key={s.cle} href={`/parametres/${s.cle}/`} className="carte carte-lien onde apparition group flex items-center gap-4 p-4 lg:p-6" style={decalage(i, 40)}>
            <Picto icone={s.icone} couleur={aCompleter.has(s.cle) ? "var(--primaire)" : s.couleur} taille="md" className="group-hover:scale-[1.03]" />
            <span className="min-w-0 flex-1">
              <span className="block font-bold group-hover:text-primaire">{s.libelle}</span>
              <span className="mt-1 block text-[14px] leading-snug text-encre-3">{s.description}</span>
            </span>
            <CaretRight size={16} weight="bold" className="shrink-0 text-encre-3 transition-transform group-hover:translate-x-px" aria-hidden />
          </Link>
        ))}
      </div>
    </>
  );
}
