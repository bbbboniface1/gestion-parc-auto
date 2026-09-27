"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, ShieldSlash } from "@phosphor-icons/react";
import { rpc } from "@/lib/api/client";
import { formatDateLongue } from "@/lib/format";
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
    <div className="min-h-dvh bg-papier px-4 py-10">
      <div className="mx-auto max-w-md">
        <p className="etiquette text-[12px] text-encre-3">Vérification de document</p>
        {etat === "chargement" && <p className="mt-6 text-encre-2" role="status">Vérification en cours…</p>}
        {etat === "erreur" && <p className="mt-6 text-encre-2">Vérification impossible pour le moment. Réessayez dans quelques instants.</p>}
        {etat === "introuvable" && (
          <div className="mt-6 rounded-carte border border-perte/40 bg-surface p-6">
            <ShieldSlash className="size-9 text-perte-texte" aria-hidden />
            <h1 className="mt-3 text-[22px] font-semibold">Document inconnu</h1>
            <p className="mt-1 text-encre-2">Aucun document ne correspond à ce code. Ce document n&apos;a pas été émis par ce système : méfiez-vous.</p>
          </div>
        )}
        {typeof etat === "object" && (
          <div className="mt-6 carte p-6">
            <div className="flex items-start justify-between gap-3">
              <ShieldCheck className="size-9 text-gain-texte" aria-hidden />
              {etat.statut === "annulee" && <Tampon type="annule" grand />}
            </div>
            <h1 className="mt-3 text-[22px] font-semibold">
              {etat.statut === "annulee" ? "Document authentique, mais annulé" : "Document authentique"}
            </h1>
            <dl className="mt-4 divide-y divide-trait border-y border-trait">
              {[
                ["Émis par", etat.entreprise],
                ["Numéro", <Code key="n">{etat.numero}</Code>],
                ["Date", formatDateLongue(etat.date)],
                ["Montant", <Montant key="m" valeur={etat.montant_ttc ?? etat.montant ?? null} />],
              ].map(([t, v]) => (
                <div key={String(t)} className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-encre-3">{t}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[13px] text-encre-3">Comparez ces informations avec le document papier qu&apos;on vous présente.</p>
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
