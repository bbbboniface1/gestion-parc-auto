import type { ReactNode } from "react";

/**
 * Cadre des pages d'entrée (connexion, inscription, création d'entreprise).
 * Ordinateur : à gauche le panneau nuit qui raconte le voyage du véhicule ; à droite le formulaire.
 * Téléphone : bandeau nuit compact au-dessus du formulaire.
 */
export function CadreAccueil({ children }: { children: ReactNode }) {
  const trajet = [
    { lieu: "Houston", detail: "Enchère Copart", jours: "J0", couleur: "var(--etape-transport-usa)" },
    { lieu: "Atlantique", detail: "MSC Ariane", jours: "J+9", couleur: "var(--etape-en-mer)" },
    { lieu: "Cotonou", detail: "Débarquement", jours: "J+38", couleur: "var(--etape-au-port)" },
    { lieu: "Bamako", detail: "Douane, atelier, vente", jours: "J+47", couleur: "var(--etape-parc)" },
  ];
  return (
    <div className="min-h-dvh bg-papier lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative overflow-hidden bg-nuit text-sur-nuit">
        <div className="zone-sure-haut px-5 pt-6 pb-7 lg:flex lg:h-full lg:flex-col lg:px-12 lg:py-12">
          <div className="flex items-center gap-3">
            <img src="/icones/icone.svg" alt="" width={36} height={36} className="rounded-lg" />
            <span className="text-[17px] font-semibold tracking-tight">Parc Auto</span>
          </div>
          <p className="mt-6 max-w-md text-[22px] leading-tight font-semibold tracking-tight lg:mt-auto lg:text-[34px]">
            De l&apos;enchère à Houston à la clé remise à Bamako.
          </p>
          <p className="mt-2 max-w-md text-sur-nuit-2 lg:mt-4 lg:text-[15px]">
            Chaque véhicule suivi à chaque étape, chaque franc dépensé compté, chaque facture numérotée.
          </p>
          <ol className="mt-10 hidden max-w-md lg:block" aria-label="Exemple de trajet">
            {trajet.map((t, i) => (
              <li key={t.lieu} className="relative flex gap-4 pb-6 last:pb-0">
                {i < trajet.length - 1 && <span aria-hidden className="absolute top-4 left-[7px] h-full w-px border-l border-dashed border-white/25" />}
                <span aria-hidden className="relative mt-1 size-[15px] shrink-0 rounded-full border-[3px]" style={{ borderColor: t.couleur, background: i === trajet.length - 1 ? t.couleur : "transparent" }} />
                <div className="flex flex-1 items-baseline justify-between gap-3">
                  <div>
                    <p className="etiquette text-[14px] tracking-[0.06em]">{t.lieu}</p>
                    <p className="text-[13px] text-sur-nuit-2">{t.detail}</p>
                  </div>
                  <span className="font-mono text-[12px] text-sur-nuit-2">{t.jours}</span>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-10 hidden text-[12px] text-sur-nuit-2/70 lg:block">Fonctionne sur téléphone, même avec un réseau faible.</p>
        </div>
      </aside>
      <main className="flex items-start justify-center px-4 py-8 lg:items-center lg:px-12">
        <div className="w-full max-w-[420px]">{children}</div>
      </main>
    </div>
  );
}
