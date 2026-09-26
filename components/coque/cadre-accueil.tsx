import type { ReactNode } from "react";
import Link from "next/link";
import { Boat, CheckCircle } from "@phosphor-icons/react";
import { ETAPES } from "@/lib/domaine";
import { Logo } from "./logo";

/**
 * Cadre des pages d'entrée (connexion, inscription, création d'entreprise).
 * Ordinateur : à gauche un aperçu vivant du produit (un véhicule en mer, le capital, une vente qui tombe)
 * sur fond bleu nuit ; à droite le formulaire. Téléphone : bandeau compact au-dessus du formulaire.
 */
export function CadreAccueil({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-papier lg:grid lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
      <aside className="relative overflow-hidden bg-nuit text-white">
        <div className="zone-sure-haut relative px-5 pt-6 pb-8 lg:flex lg:h-full lg:flex-col lg:px-12 lg:py-12">
          <div className="flex items-center gap-3">
            <Logo className="size-10" />
            <span className="text-[20px] font-extrabold tracking-tight">Parc Auto</span>
          </div>
          <h2 className="mt-6 max-w-lg text-[26px] leading-tight font-extrabold tracking-tight lg:mt-12 lg:text-[40px]">
            De l&apos;enchère à Houston à la clé remise à Bamako.
          </h2>
          <p className="mt-3 max-w-md text-white/75 lg:text-[16px]">
            Chaque véhicule suivi à chaque étape, chaque franc compté, chaque facture envoyée sur WhatsApp.
          </p>

          {/* Aperçu du produit */}
          <div aria-hidden className="relative mt-10 hidden h-[340px] max-w-xl lg:block">
            <div className="absolute top-0 left-0 w-[300px] -rotate-3 overflow-hidden rounded-carte bg-surface text-encre shadow-flottante [animation:apparition_700ms_200ms_both]">
              <div className="relative aspect-[16/10]">
                {/* eslint-disable-next-line @next/next/no-img-element -- export statique, image locale */}
                <img src="/demo/vehicules/v13.jpg" alt="" className="absolute inset-0 size-full object-cover" />
                <span className="voile-photo absolute inset-x-0 bottom-0 h-1/2" />
                <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[12px] font-bold text-nuit">
                  <span className="size-2 rounded-full bg-[var(--etape-en-mer)]" /> En mer
                </span>
                <span className="absolute bottom-3 left-3 text-[20px] font-extrabold text-white">9,2 M <span className="text-[12px] font-semibold opacity-80">FCFA</span></span>
              </div>
              <div className="p-4">
                <p className="font-bold">Honda Accord Sport 2018</p>
                <p className="text-[12px] text-encre-3">Bleu · 62 400 km · V-0013</p>
                <span className="mt-3 flex h-1.5 gap-0.5">
                  {ETAPES.map((e, k) => <span key={e.code} className="flex-1 rounded-full" style={{ background: k <= 2 ? e.couleur : "var(--trait)" }} />)}
                </span>
              </div>
            </div>

            <div className="absolute top-6 right-0 w-[230px] rotate-2 rounded-carte bg-white/10 p-4 ring-1 ring-white/20 [animation:apparition_700ms_500ms_both]">
              <p className="text-[12px] font-semibold text-white/70">Où est votre argent ?</p>
              <p className="mt-1 text-[30px] leading-none font-extrabold">124 M <span className="text-[13px] font-semibold text-white/70">FCFA</span></p>
              <span className="mt-3 flex h-2 gap-[2px] overflow-hidden rounded-full">
                {ETAPES.map((e, k) => <span key={e.code} className="h-full" style={{ background: e.couleur, flex: [14, 3, 14, 12, 10, 14, 19, 36][k] }} />)}
              </span>
              <p className="mt-2 text-[11px] text-white/60">15 véhicules, de l&apos;enchère au parc</p>
            </div>

            <div className="absolute right-10 bottom-4 flex items-center gap-3 rounded-2xl bg-surface p-3 pr-5 text-encre shadow-flottante [animation:apparition_700ms_900ms_both]">
              <span className="grid size-10 place-items-center rounded-full bg-gain-plein text-white"><CheckCircle size={22} weight="fill" /></span>
              <span>
                <span className="block text-[14px] font-extrabold">Vente enregistrée</span>
                <span className="block text-[12px] text-encre-3">FAC-2026-0011 · envoyée sur WhatsApp</span>
              </span>
            </div>

            <div className="absolute bottom-24 left-6 flex items-center gap-2 rounded-full bg-[var(--etape-en-mer)] px-3 py-1.5 text-[12px] font-bold text-nuit shadow-flottante [animation:apparition_700ms_1200ms_both]">
              <Boat size={16} weight="fill" /> Cotonou dans 5 jours
            </div>
          </div>

          <p className="mt-auto hidden pt-8 text-[12px] text-white/60 lg:block">
            Fonctionne sur téléphone, même avec un réseau faible. <Link href="/credits/" className="underline underline-offset-4">Crédits photos</Link>
          </p>
        </div>
      </aside>
      <main className="flex items-start justify-center px-4 py-8 lg:items-center lg:px-12">
        <div className="w-full max-w-[420px] [animation:apparition_500ms_both]">{children}</div>
      </main>
    </div>
  );
}
