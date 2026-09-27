"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Shield, ShieldCheck, ShieldSlash } from "@phosphor-icons/react";
import { rpc } from "@/lib/api/client";
import { formatDateLongue } from "@/lib/format";
import { Logo } from "@/components/coque/logo";
import { Montant, Tampon, Code } from "@/components/ui/signature";

interface Verification {
  entreprise: string;
  type?: string;
  numero: string;
  date: string;
  montant_ttc?: number;
  montant?: number;
  statut: string;
}

/**
 * Page publique ouverte par le QR code imprimé sur chaque facture. Elle ne révèle que
 * l'essentiel (émetteur, numéro, date, montant, statut) — jamais le client ni le véhicule.
 */
function Verifier() {
  const params = useSearchParams();
  const jeton = params.get("t") ?? "";
  const jetonValide = /^[A-Za-z0-9_-]{16,128}$/.test(jeton);
  const [reponse, setReponse] = useState<null | "introuvable" | "erreur" | Verification>(null);
  const etat: "chargement" | "introuvable" | "erreur" | Verification = !jetonValide ? "introuvable" : (reponse ?? "chargement");

  useEffect(() => {
    if (!jetonValide) return;
    rpc<Verification | null>("verifier_document", { p_token: jeton })
      .then((r) => setReponse(r && r.numero ? r : "introuvable"))
      .catch(() => setReponse("erreur"));
  }, [jeton, jetonValide]);

  return (
    // Page de confiance : une seule carte, sobre ; le verdict (pictogramme, titre) d'abord, les faits ensuite.
    // La marque en tête dit qui certifie ; chargement et erreur occupent la même carte que le verdict, qui la remplace sans saut.
    <div className="min-h-dvh bg-papier px-4 py-8 lg:py-12">
      <div className="mx-auto max-w-md">
        <div className="mb-4 flex items-center gap-2">
          <Logo className="size-8" />
          <span className="text-[16px] font-bold tracking-tight">Parc Auto</span>
        </div>
        <p className="etiquette text-[12px] text-encre-3">Vérification de document</p>
        {etat === "chargement" && (
          <div className="mt-4 carte p-4 lg:p-6" role="status">
            <span className="grid size-12 place-items-center rounded-xl bg-surface-2 text-encre-3">
              <Shield className="size-6" aria-hidden />
            </span>
            <h1 className="mt-4 text-[24px] leading-tight font-semibold">Vérification en cours…</h1>
          </div>
        )}
        {etat === "erreur" && (
          <div className="mt-4 carte p-4 lg:p-6">
            <span className="grid size-12 place-items-center rounded-xl bg-surface-2 text-encre-3">
              <Shield className="size-6" aria-hidden />
            </span>
            <h1 className="mt-4 text-[24px] leading-tight font-semibold">Vérification impossible</h1>
            <p className="mt-2 text-encre-2">Vérification impossible pour le moment. Réessayez dans quelques instants.</p>
          </div>
        )}
        {etat === "introuvable" && (
          <div className="mt-4 rounded-carte border border-perte/40 bg-surface p-4 shadow-carte lg:p-6">
            <span className="grid size-12 place-items-center rounded-xl bg-perte-voile text-perte-texte">
              <ShieldSlash className="size-6" aria-hidden />
            </span>
            <h1 className="mt-4 text-[24px] leading-tight font-semibold">Document inconnu</h1>
            <p className="mt-2 text-encre-2">Aucun document ne correspond à ce code. Ce document n&apos;a pas été émis par ce système : méfiez-vous.</p>
          </div>
        )}
        {typeof etat === "object" && (
          <div className="mt-4 carte p-4 lg:p-6">
            <div className="flex items-start justify-between gap-3">
              <span className="grid size-12 place-items-center rounded-xl bg-gain-voile text-gain-texte">
                <ShieldCheck className="size-6" aria-hidden />
              </span>
              {etat.statut === "annulee" && <Tampon type="annule" grand />}
            </div>
            <h1 className="mt-4 text-[24px] leading-tight font-semibold">
              {etat.statut === "annulee" ? "Document authentique, mais annulé" : "Document authentique"}
            </h1>
            <dl className="mt-4 divide-y divide-trait border-y border-trait">
              {[
                ["Émis par", etat.entreprise],
                ["Numéro", <Code key="n">{etat.numero}</Code>],
                ["Date", formatDateLongue(etat.date)],
                ["Montant", <Montant key="m" valeur={etat.montant_ttc ?? etat.montant ?? null} />],
              ].map(([t, v]) => (
                <div key={String(t)} className="flex min-h-12 items-center justify-between gap-4 py-3">
                  <dt className="text-[14px] text-encre-3">{t}</dt>
                  <dd className="min-w-0 text-right font-medium break-words">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[14px] text-encre-3">Comparez ces informations avec le document papier qu&apos;on vous présente.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PageVerifier() {
  return (
    <Suspense>
      <Verifier />
    </Suspense>
  );
}
