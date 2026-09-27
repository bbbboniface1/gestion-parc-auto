import type { Metadata } from "next";
import credits from "@/lib/demo/credits-photos.json";

export const metadata: Metadata = { title: "Crédits photos" };

interface Credit { fichier: string; titre: string; auteur: string; licence: string; page: string }

/**
 * Les photos de la démonstration proviennent de Wikimedia Commons, sous licences libres (CC0, CC BY,
 * CC BY-SA) qui exigent de nommer l'auteur. Cette page en est la mention légale.
 */
export default function PageCredits() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="etiquette text-[12px] text-encre-3">Mentions</p>
      <h1 className="mt-1 text-[28px] font-semibold tracking-tight">Crédits photos</h1>
      <p className="mt-2 text-encre-2">
        Les véhicules de la démonstration sont illustrés par des photographies publiées sur{" "}
        <a className="underline underline-offset-4" href="https://commons.wikimedia.org">Wikimedia Commons</a> sous licence libre.
        Merci à leurs auteurs. Ces photos n&apos;apparaissent que dans la démonstration.
      </p>
      <ul className="mt-6 divide-y divide-trait border-y border-trait">
        {(credits as Credit[]).map((c) => (
          <li key={c.fichier} className="flex items-center gap-4 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- export statique */}
            <img src={`/demo/vehicules/${c.fichier}`} alt="" width={96} height={64} loading="lazy" className="h-16 w-24 shrink-0 rounded-[4px] object-cover" />
            <div className="min-w-0 flex-1 text-[14px]">
              <a href={c.page} className="block truncate font-medium underline-offset-4 hover:underline">{c.titre}</a>
              <p className="text-encre-3">{c.auteur || "Auteur indiqué sur la page du fichier"} · {c.licence}</p>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
