import type { ReactNode } from "react";
import Link from "next/link";
import { Anchor, Boat, Car, CheckCircle, Gavel, Key, Stamp, WhatsappLogo } from "@phosphor-icons/react";
import { Logo } from "./logo";

/** Couleurs du drapeau malien : vert, or, rouge. */
const VERT = "#14B53A";
const OR = "#FCD116";
const ROUGE = "#CE1126";

/** Le voyage d'un véhicule, tel que l'application le suit (sans aucun montant). */
const VOYAGE = [
  { icone: Gavel, titre: "Enchère gagnée", detail: "Copart, IAAI, Manheim", fait: true },
  { icone: Boat, titre: "En mer", detail: "Conteneur suivi jusqu'au port", fait: true },
  { icone: Anchor, titre: "Cotonou, Dakar, Lomé", detail: "Déchargement et convoi", fait: false, courant: true },
  { icone: Stamp, titre: "Douane", detail: "Dédouanement au Mali", fait: false },
  { icone: Key, titre: "Clé remise à Bamako", detail: "Facture envoyée sur WhatsApp", fait: false },
];

/**
 * Cadre des pages d'entrée (connexion, inscription, création d'entreprise).
 * Ordinateur : à gauche le voyage d'un véhicule jusqu'à Bamako, aux couleurs du Mali ; à droite le formulaire.
 * Téléphone : bandeau compact au-dessus du formulaire. Aucun chiffre financier n'y figure.
 */
export function CadreAccueil({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-papier lg:grid lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
      <aside className="relative overflow-hidden bg-[linear-gradient(160deg,#0f5132_0%,#0b3b25_55%,#082a1b_100%)] text-white">
        {/* Bande tricolore verticale du drapeau, en tête de panneau */}
        <div aria-hidden className="absolute inset-x-0 top-0 flex h-1.5">
          <span className="flex-1" style={{ background: VERT }} />
          <span className="flex-1" style={{ background: OR }} />
          <span className="flex-1" style={{ background: ROUGE }} />
        </div>
        {/* Motif discret inspiré du bogolan */}
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "repeating-linear-gradient(45deg, #fff 0 2px, transparent 2px 22px), repeating-linear-gradient(-45deg, #fff 0 2px, transparent 2px 22px)" }} />
        <div aria-hidden className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full blur-3xl" style={{ background: `${OR}26` }} />

        <div className="zone-sure-haut relative px-5 pt-7 pb-8 lg:flex lg:h-full lg:flex-col lg:px-12 lg:py-12">
          <div className="flex items-center gap-3">
            <Logo className="size-10" />
            <span className="text-[20px] font-extrabold tracking-tight">Parc Auto</span>
            <span className="ml-1 rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide text-[#082a1b]" style={{ background: OR }}>MALI</span>
          </div>
          <h2 className="mt-6 max-w-lg text-[26px] leading-tight font-extrabold tracking-tight text-balance lg:mt-12 lg:text-[40px]">
            De l&apos;enchère à l&apos;étranger à la clé remise à <span style={{ color: OR }}>Bamako</span>.
          </h2>
          <p className="mt-3 max-w-md text-white/80 lg:text-[16px]">
            Chaque véhicule suivi à chaque étape, du port de départ au parc, avec ses documents et sa facture.
          </p>

          {/* Le voyage d'un véhicule */}
          <div aria-hidden className="relative mt-10 hidden max-w-xl gap-5 lg:flex">
            <div className="w-[260px] shrink-0 -rotate-2 overflow-hidden rounded-[20px] bg-white text-[#0f172a] shadow-[0_30px_60px_-20px_rgb(0_0_0/0.6)] [animation:apparition_700ms_200ms_both]">
              <div className="relative aspect-[16/10]">
                {/* eslint-disable-next-line @next/next/no-img-element -- export statique, image locale */}
                <img src="/demo/vehicules/v13.jpg" alt="" className="absolute inset-0 size-full object-cover" />
                <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[12px] font-bold">
                  <span className="size-2 rounded-full" style={{ background: OR }} /> Au port de Cotonou
                </span>
              </div>
              <div className="p-4">
                <p className="font-bold">Honda Accord Sport 2018</p>
                <p className="text-[12px] text-[#5b6679]">Bleu · 62 400 km · V-0013</p>
                <p className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: "#0f7a33" }}>
                  <Car size={14} weight="fill" /> Convoi vers Bamako prévu
                </p>
              </div>
            </div>

            <ol className="flex flex-1 flex-col gap-0 rounded-[20px] bg-white/[0.07] p-4 ring-1 ring-white/15 backdrop-blur-sm [animation:apparition_700ms_500ms_both]">
              {VOYAGE.map((e, i) => (
                <li key={e.titre} className="relative flex gap-3 pb-3 last:pb-0">
                  {i < VOYAGE.length - 1 && (
                    <span className="absolute top-8 bottom-0 left-[15px] w-0.5" style={{ background: e.fait ? VERT : "rgb(255 255 255 / 0.18)" }} />
                  )}
                  <span className="relative grid size-8 shrink-0 place-items-center rounded-full"
                    style={e.fait ? { background: VERT } : e.courant ? { background: OR, color: "#082a1b" } : { background: "rgb(255 255 255 / 0.1)" }}>
                    {e.fait ? <CheckCircle size={18} weight="fill" /> : <e.icone size={16} weight="fill" />}
                  </span>
                  <span className="min-w-0 pt-0.5">
                    <span className={e.courant ? "block text-[14px] font-extrabold" : "block text-[14px] font-semibold text-white/90"}>{e.titre}</span>
                    <span className="block text-[12px] text-white/60">{e.detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <p className="mt-6 hidden items-center gap-2 text-[13px] text-white/75 lg:flex [animation:apparition_700ms_900ms_both]">
            <WhatsappLogo size={18} weight="fill" style={{ color: "#25d366" }} /> Factures et relances envoyées sur WhatsApp, Orange Money, Moov Money et Wave acceptés.
          </p>

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
