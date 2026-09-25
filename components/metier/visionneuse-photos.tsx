"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { CaretLeft, CaretRight, Star, Trash } from "@phosphor-icons/react";
import { useEcriture } from "@/lib/api/requetes";
import { useOrg } from "@/lib/session";
import { cn } from "@/lib/cn";
import { Feuille } from "@/components/ui/feuille";
import { Bouton } from "@/components/ui/bouton";
import { PhotoVehicule } from "./photo-vehicule";

export interface PhotoFiche { id: string; path: string; ordre: number }

/**
 * Les photos du véhicule en grand : on feuillette (boutons ou flèches du clavier), on choisit celle qui sert de
 * vitrine (la première) ou on retire celle qui est ratée.
 */
export function VisionneusePhotos({ ouverte, onFermer, photos, index, onIndex, vehiculeId, libelle, peutModifier }: {
  ouverte: boolean;
  onFermer: () => void;
  photos: PhotoFiche[];
  index: number;
  onIndex: (i: number) => void;
  vehiculeId: string;
  libelle: string;
  peutModifier: boolean;
}) {
  const org = useOrg();
  const total = photos.length;
  const i = Math.min(Math.max(index, 0), Math.max(total - 1, 0));
  const photo = photos[i];

  const vitrine = useEcriture("vehicule_photo_ordonner", {
    onSuccess: () => { toast.success("Cette photo est maintenant la vitrine du véhicule"); onIndex(0); },
    onError: (e) => toast.error(e.message),
  });
  const supprimer = useEcriture("vehicule_photo_supprimer", {
    onSuccess: () => { toast.success("Photo supprimée"); if (total <= 1) onFermer(); else onIndex(Math.min(i, total - 2)); },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (!ouverte || total < 2) return;
    const touche = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") onIndex((i - 1 + total) % total);
      else if (e.key === "ArrowRight") onIndex((i + 1) % total);
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [ouverte, total, i, onIndex]);

  if (!photo) return null;

  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre={libelle} description={i === 0 ? "Photo de vitrine" : `Photo ${i + 1} sur ${total}`} largeur="lg"
      pied={peutModifier ? (
        <>
          <Bouton variante="danger" icone={<Trash size={16} weight="duotone" />} chargement={supprimer.isPending}
            onClick={() => { if (window.confirm("Supprimer cette photo ?")) supprimer.executer({ p_org: org.id, p_id: photo.id }); }}>Supprimer</Bouton>
          {i > 0 && (
            <Bouton variante="primaire" icone={<Star size={16} weight="fill" />} chargement={vitrine.isPending}
              onClick={() => vitrine.executer({ p_org: org.id, p_vehicule_id: vehiculeId, p_ids: [photo.id, ...photos.filter((p) => p.id !== photo.id).map((p) => p.id)] })}>
              En faire la vitrine
            </Bouton>
          )}
        </>
      ) : undefined}>
      <div className="relative">
        <PhotoVehicule path={photo.path} alt={`${libelle}, photo ${i + 1}`} className="aspect-[4/3] w-full rounded-2xl" />
        {i === 0 && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[12px] font-bold text-white shadow-sm"><Star size={13} weight="fill" aria-hidden />Vitrine</span>
        )}
        {total > 1 && (
          <>
            <button type="button" onClick={() => onIndex((i - 1 + total) % total)} aria-label="Photo précédente"
              className="onde absolute top-1/2 left-2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#0b1633] shadow-lg backdrop-blur transition-transform hover:scale-105"><CaretLeft size={20} weight="bold" aria-hidden /></button>
            <button type="button" onClick={() => onIndex((i + 1) % total)} aria-label="Photo suivante"
              className="onde absolute top-1/2 right-2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#0b1633] shadow-lg backdrop-blur transition-transform hover:scale-105"><CaretRight size={20} weight="bold" aria-hidden /></button>
          </>
        )}
      </div>
      {total > 1 && (
        <ul className="sans-barre mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Toutes les photos">
          {photos.map((p, k) => (
            <li key={p.id} className="shrink-0">
              <button type="button" onClick={() => onIndex(k)} aria-label={`Voir la photo ${k + 1}`} aria-current={k === i}
                className={cn("block overflow-hidden rounded-xl transition-all", k === i ? "ring-2 ring-primaire ring-offset-2 ring-offset-surface" : "opacity-70 hover:opacity-100")}>
                <PhotoVehicule path={p.path} alt="" className="h-14 w-[74px] rounded-xl" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Feuille>
  );
}
