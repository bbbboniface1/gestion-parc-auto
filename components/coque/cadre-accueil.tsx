import type { ReactNode } from "react";
import Link from "next/link";

const JALONS = [
  { lieu: "Houston", detail: "Enchère Copart", jour: "J0" },
  { lieu: "Atlantique", detail: "MSC Ariane", jour: "J+9" },
  { lieu: "Cotonou", detail: "Débarquement", jour: "J+38" },
  { lieu: "Bamako", detail: "Douane, atelier, vente", jour: "J+47" },
];

/**
 * Cadre des pages d'entrée (connexion, inscription, création d'entreprise).
 * Ordinateur : à gauche une fiche de lot (photo réelle, référence, piste du voyage) sur fond d'encre ;
 * à droite le formulaire. Téléphone : bandeau d'encre compact au-dessus du formulaire.
 */
export function CadreAccueil({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-papier lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="bg-nuit text-sur-nuit">
        <div className="zone-sure-haut px-4 pt-6 pb-7 lg:flex lg:h-full lg:flex-col lg:px-12 lg:py-12">
          <div className="flex items-center gap-3">
            <span aria-hidden className="size-3 bg-signal" />
            <span className="etiquette text-corps tracking-[0.08em]">Parc Auto</span>
          </div>
          <p className="mt-6 max-w-md text-titre font-semibold lg:mt-auto">
            De l&apos;enchère à Houston à la clé remise à Bamako.
          </p>
          <p className="mt-2 max-w-md text-sur-nuit-2">
            Chaque véhicule suivi à chaque étape, chaque franc dépensé compté, chaque facture numérotée.
          </p>

          <figure className="mt-8 hidden max-w-md lg:block">
            {/* eslint-disable-next-line @next/next/no-img-element -- export statique, image locale */}
            <img src="/demo/vehicules/v13.jpg" alt="" width={960} height={720} className="aspect-[16/9] w-full object-cover" />
            <figcaption className="mt-2 flex items-baseline justify-between gap-3 font-mono text-petit text-sur-nuit-2">
              <span>V-0013 · HONDA ACCORD SPORT 2018</span>
              <span>LOT 44905233</span>
            </figcaption>
            <ol className="mt-4 grid grid-cols-4 gap-[3px]" aria-label="Exemple de trajet">
              {JALONS.map((j, i) => (
                <li key={j.lieu}>
                  <span
                    aria-hidden
                    className={i === 1 ? "block h-[12px] bg-signal outline-[1.5px] outline-sur-nuit" : "block h-[5px]"}
                    style={i === 1 ? undefined : { background: i < 1 ? "var(--sur-nuit)" : "rgb(255 255 255 / 0.2)" }}
                  />
                  <span className={`etiquette mt-1.5 block text-petit ${i === 1 ? "text-sur-nuit" : "text-sur-nuit-2"}`}>{j.lieu}</span>
                  <span className="chiffres block text-petit text-sur-nuit-2">{j.jour}</span>
                </li>
              ))}
            </ol>
          </figure>

          <p className="mt-8 hidden text-petit text-sur-nuit-2 lg:block">
            Fonctionne sur téléphone, même avec un réseau faible. <Link href="/credits/" className="underline underline-offset-4">Crédits photos</Link>
          </p>
        </div>
      </aside>
      <main className="flex items-start justify-center px-4 py-8 lg:items-center lg:px-12">
        <div className="w-full max-w-[420px]">{children}</div>
      </main>
    </div>
  );
}
