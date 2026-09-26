import type { ReactNode } from "react";
import Link from "next/link";
import { Boat, CheckCircle } from "@phosphor-icons/react";
import { ETAPES } from "@/lib/domaine";
import { Logo } from "./logo";

/**
 * Cadre des pages d'entrée (connexion, inscription, création d'entreprise).
 * Ordinateur : à gauche un aperçu du produit (un véhicule en mer, le capital, une vente qui tombe)
 * sur fond bleu nuit ; à droite le formulaire. Téléphone : bandeau compact au-dessus du formulaire.
 *
 * Hiérarchie (docs/CONVENTIONS_FRONT.md) : le titre et le formulaire passent devant ; l'aperçu reste un décor
 * calme — inclinaisons légères, apparition courte (360 ms sur 4 px), décalage de 60 ms entre les cartes,
 * toujours après le formulaire.
 */
export function CadreAccueil({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-papier lg:grid lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
      <aside className="relative overflow-hidden bg-nuit text-white">
        <div className="zone-sure-haut relative px-4 pt-6 pb-6 lg:flex lg:h-full lg:flex-col lg:px-12 lg:py-12">
          <div className="flex items-center gap-3">
            <Logo className="size-10" />
            <span className="text-[18px] font-extrabold tracking-tight">Parc Auto</span>
          </div>
          <h2 className="mt-4 max-w-lg text-[18px] leading-tight font-extrabold tracking-tight lg:mt-12 lg:text-[32px]">
            De l&apos;enchère à Houston à la clé remise à Bamako.
          </h2>
          <p className="mt-2 max-w-md text-[14px] text-white/75 lg:mt-4 lg:text-[16px]">
            Chaque véhicule suivi à chaque étape, chaque franc compté, chaque facture envoyée sur WhatsApp.
          </p>

          {/* Aperçu du produit : décor, en retrait du formulaire */}
          <div aria-hidden className="relative mt-8 hidden h-[336px] max-w-xl lg:block">
            <div className="apparition absolute top-0 left-0 w-76 -rotate-2 overflow-hidden rounded-carte bg-surface text-encre shadow-flottante" style={{ animationDelay: "120ms" }}>
              <div className="relative aspect-[16/10]">
                {/* eslint-disable-next-line @next/next/no-img-element -- export statique, image locale */}
                <img src="/demo/vehicules/v13.jpg" alt="" className="absolute inset-0 size-full object-cover" />
                <span className="voile-photo absolute inset-x-0 bottom-0 h-1/2" />
                <span className="absolute top-3 left-3 inline-flex h-7 items-center gap-2 rounded-full bg-white/95 px-3 text-[12px] font-bold text-nuit">
                  <span className="size-2 rounded-full bg-[var(--etape-en-mer)]" /> En mer
                </span>
                <span className="chiffres absolute bottom-3 left-3 text-[18px] font-extrabold text-white">9,2 M <span className="text-[12px] font-semibold opacity-80">FCFA</span></span>
              </div>
              <div className="p-4">
                <p className="font-bold">Honda Accord Sport 2018</p>
                <p className="text-[12px] text-encre-3">Bleu · 62 400 km · V-0013</p>
                <span className="mt-3 flex h-2 gap-0.5">
                  {ETAPES.map((e, k) => <span key={e.code} className="flex-1 rounded-full" style={{ background: k <= 2 ? e.couleur : "var(--trait)" }} />)}
                </span>
              </div>
            </div>

            <div className="apparition absolute top-6 right-0 w-56 rotate-1 rounded-carte bg-white/10 p-4 ring-1 ring-white/20" style={{ animationDelay: "180ms" }}>
              <p className="text-[12px] font-semibold text-white/70">Où est votre argent ?</p>
              <p className="chiffres mt-1 text-[24px] leading-none font-extrabold">124 M <span className="text-[12px] font-semibold text-white/70">FCFA</span></p>
              <span className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full">
                {ETAPES.map((e, k) => <span key={e.code} className="h-full" style={{ background: e.couleur, flex: [14, 3, 14, 12, 10, 14, 19, 36][k] }} />)}
              </span>
              <p className="mt-2 text-[12px] text-white/60">15 véhicules, de l&apos;enchère au parc</p>
            </div>

            <div className="apparition absolute right-10 bottom-4 flex items-center gap-3 rounded-carte bg-surface p-3 pr-4 text-encre shadow-flottante" style={{ animationDelay: "240ms" }}>
              <span className="grid size-10 place-items-center rounded-full bg-gain-plein text-white"><CheckCircle size={24} weight="fill" /></span>
              <span>
                <span className="block text-[14px] font-extrabold">Vente enregistrée</span>
                <span className="block text-[12px] text-encre-3">FAC-2026-0011 · envoyée sur WhatsApp</span>
              </span>
            </div>

            <div className="apparition absolute bottom-24 left-6 flex h-8 items-center gap-2 rounded-full bg-[var(--etape-en-mer)] px-3 text-[12px] font-bold text-nuit shadow-flottante" style={{ animationDelay: "300ms" }}>
              <Boat size={16} weight="fill" /> Cotonou dans 5 jours
            </div>
          </div>

          <p className="mt-auto hidden pt-8 text-[12px] text-white/60 lg:block">
            Fonctionne sur téléphone, même avec un réseau faible. <Link href="/credits/" className="underline underline-offset-4">Crédits photos</Link>
          </p>
        </div>
      </aside>
      <main className="flex items-start justify-center px-4 py-8 lg:items-center lg:px-12">
        <div className="apparition w-full max-w-[416px]">{children}</div>
      </main>
    </div>
  );
}
