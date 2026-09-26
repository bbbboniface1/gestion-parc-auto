"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Anchor, Boat, Buildings, CaretRight, CheckCircle, Clock, Gavel, Paperclip, Receipt, Stamp, Tag, Trash, Truck, Wrench, type Icon,
} from "@phosphor-icons/react";
import { useEcriture } from "@/lib/api/requetes";
import { useOrg } from "@/lib/session";
import type { Frais } from "@/lib/api/types";
import { libelleCategorie } from "@/lib/domaine";
import { lienDepense } from "@/lib/depenses";
import { formatDate, formatDevise, formatNombre, pluriel } from "@/lib/format";
import { urlFichier } from "@/lib/stockage";
import { cn } from "@/lib/cn";
import { PhotoVehicule } from "@/components/metier/photo-vehicule";
import { STATUTS_EXPEDITION } from "@/components/expeditions/route-maritime";
import { Feuille } from "@/components/ui/feuille";
import { Bouton } from "@/components/ui/bouton";
import { Montant } from "@/components/ui/signature";

/** Séparateur « · » en fin d'élément : quand la ligne passe à la suivante, aucune ligne ne commence par un point. */
const SEP = "after:ml-2 after:content-['·'] last:after:hidden";

const ICONES: Record<string, Icon> = {
  frais_enchere: Gavel, remorquage: Truck, fret: Boat, assurance: Stamp, port: Anchor, convoi: Truck, douane: Stamp,
  transitaire: Stamp, atelier: Wrench, pieces: Wrench, carte_grise: Receipt, commission: Tag, loyer: Buildings, salaires: Buildings,
};

/**
 * Une dépense, lisible d'un coup d'œil : la voiture (photo, nom, référence) ou le conteneur concerné, la catégorie, le
 * fournisseur, le compte, la devise d'origine. Toute la ligne est cliquable et mène à la voiture ; les dépenses
 * générales (loyer, salaires) ouvrent leur détail. Marquer payé / supprimer restent des boutons à part.
 */
export function LigneDepense({ f, couleur, enEvidence, peutModifier, contexte = "liste" }: {
  f: Frais;
  couleur: string;
  enEvidence?: boolean;
  peutModifier: boolean;
  contexte?: "liste" | "vehicule";
}) {
  const org = useOrg();
  const [detail, setDetail] = useState(false);
  const ligne = useRef<HTMLLIElement>(null);
  useEffect(() => { if (enEvidence) ligne.current?.scrollIntoView({ block: "center", behavior: "smooth" }); }, [enEvidence]);
  const marquerPaye = useEcriture("frais_enregistrer", { onSuccess: () => toast.success("Marqué payé"), onError: (e) => toast.error(e.message) });
  const supprimer = useEcriture("frais_supprimer", { onSuccess: () => { toast.success("Dépense supprimée"); setDetail(false); }, onError: (e) => toast.error(e.message) });

  const lien = lienDepense(f, contexte);
  const Ico = ICONES[f.categorie] ?? Receipt;
  const montant = f.part_xof ?? f.montant_xof;
  const estPart = f.part_xof !== undefined && f.part_xof !== f.montant_xof;
  const vehicule = f.portee === "vehicule" && contexte === "liste";
  const conteneur = f.portee === "expedition";
  const st = f.expedition_statut ? STATUTS_EXPEDITION[f.expedition_statut] : null;

  const contenu = (
    <>
      {vehicule ? (
        <span className="relative shrink-0">
          <PhotoVehicule path={f.vehicule_photo} alt="" className="h-12 w-16 rounded-xl" />
          <span className="absolute -right-2 -bottom-2 grid size-6 place-items-center rounded-full text-white ring-2 ring-surface" style={{ background: `color-mix(in srgb, ${couleur} 80%, var(--nuit))` }}><Ico size={12} weight="fill" aria-hidden /></span>
        </span>
      ) : (
        <span className="grid size-12 shrink-0 place-items-center rounded-xl text-white" style={{ background: `color-mix(in srgb, ${conteneur && st ? st.couleur : couleur} 80%, var(--nuit))` }}>
          {conteneur ? <Boat size={24} weight="fill" aria-hidden /> : <Ico size={24} weight="fill" aria-hidden />}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-[16px] font-bold group-hover:text-primaire">
            {vehicule ? (f.vehicule_libelle ?? "Véhicule") : conteneur ? (f.expedition_reference ?? "Conteneur") : libelleCategorie(f.categorie)}
          </span>
          {vehicule && f.vehicule_reference && <span className="font-mono text-[12px] text-encre-3">{f.vehicule_reference}</span>}
          {conteneur && st && <span className="text-[12px] font-bold" style={{ color: `color-mix(in srgb, ${st.couleur} 62%, var(--pole-texte))` }}>{st.libelle}</span>}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-encre-2">
          {(vehicule || conteneur) && (
            <span className="inline-flex h-6 items-center gap-1 rounded-full px-2 text-[12px] font-bold" style={{ background: `color-mix(in srgb, ${couleur} 13%, var(--surface))`, color: `color-mix(in srgb, ${couleur} 50%, var(--pole-texte))` }}>
              {libelleCategorie(f.categorie)}
            </span>
          )}
          {f.libelle && <span className="truncate">{f.libelle}</span>}
          {conteneur && f.expedition_nb_vehicules ? <span className="text-encre-3">réparti sur {pluriel(f.expedition_nb_vehicules, "véhicule")}</span> : null}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-encre-3">
          <span className={SEP}>{formatDate(f.date)}</span>
          {f.fournisseur && <span className={SEP}>{f.fournisseur}</span>}
          {f.statut === "paye" && f.compte_nom && <span className={SEP}>{f.compte_nom}</span>}
          {f.piece_path && <span className={cn("inline-flex items-center gap-1", SEP)}><Paperclip size={12} aria-hidden />justificatif</span>}
          {f.statut === "a_payer" && <span className="inline-flex h-6 items-center gap-1 rounded-full bg-ocre-voile px-2 text-[12px] font-bold text-ocre-texte"><Clock size={12} weight="fill" aria-hidden />à payer</span>}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <Montant valeur={montant} devise={null} className="text-[16px]" />
        {estPart && <span className="block text-[12px] text-encre-3">part de {formatNombre(f.montant_xof)}</span>}
        {f.devise !== "XOF" && <span className="block text-[12px] text-encre-3">{formatDevise(f.montant, f.devise)} × {formatNombre(f.taux, f.taux % 1 ? 3 : 0)}</span>}
      </span>
      <CaretRight size={16} weight="bold" className="hidden shrink-0 text-encre-3 transition-transform group-hover:translate-x-px group-hover:text-primaire @sm:block" aria-hidden />
    </>
  );

  const classes = "group flex min-w-0 flex-1 basis-full items-center @md:basis-60 gap-3 rounded-xl px-2 py-2 text-left";

  return (
    <li ref={ligne} className={cn("@container flex flex-wrap items-center gap-x-1 gap-y-1 px-2 py-2 transition-colors hover:bg-surface-2/70", enEvidence && "bg-primaire-voile")}>
      {lien ? (
        <Link href={lien} className={classes} aria-label={`${libelleCategorie(f.categorie)}, ${vehicule ? f.vehicule_libelle : conteneur ? f.expedition_reference : "dépense générale"} : ouvrir`}>{contenu}</Link>
      ) : (
        <button type="button" onClick={() => setDetail(true)} className={classes}>{contenu}</button>
      )}
      {peutModifier && (
        <div className="ml-auto flex shrink-0 items-center gap-2 pr-1">
          {f.statut === "a_payer" && (
            <Bouton taille="sm" variante="secondaire" className="h-11 gap-2 px-4 text-[14px] lg:h-10" icone={<CheckCircle size={16} weight="duotone" className="text-gain-texte" />} chargement={marquerPaye.isPending}
              onClick={() => marquerPaye.executer({ p_org: org.id, p_data: { id: f.id, statut: "paye" } })}>Marquer payé</Bouton>
          )}
          <button type="button" aria-label="Supprimer cette dépense" title="Supprimer"
            onClick={() => { if (window.confirm("Supprimer cette dépense ?")) supprimer.executer({ p_org: org.id, p_id: f.id }); }}
            className="onde inline-grid size-11 place-items-center rounded-full text-encre-3 hover:bg-perte-voile hover:text-perte-texte lg:size-10">
            <Trash size={16} weight="duotone" aria-hidden />
          </button>
        </div>
      )}

      {!lien && (
        <Feuille ouverte={detail} onFermer={() => setDetail(false)} titre={libelleCategorie(f.categorie)} description={`${f.portee === "generale" ? "Dépense générale" : "Dépense du véhicule"} · ${formatDate(f.date)}`}
          pied={<>
            {peutModifier && <Bouton variante="danger" icone={<Trash size={16} weight="duotone" />} chargement={supprimer.isPending} onClick={() => { if (window.confirm("Supprimer cette dépense ?")) supprimer.executer({ p_org: org.id, p_id: f.id }); }}>Supprimer</Bouton>}
            {peutModifier && f.statut === "a_payer" && (
              <Bouton variante="primaire" icone={<CheckCircle size={16} weight="fill" />} chargement={marquerPaye.isPending}
                onClick={() => marquerPaye.executer({ p_org: org.id, p_data: { id: f.id, statut: "paye" } })}>Marquer payé</Bouton>
            )}
            <Bouton variante="secondaire" onClick={() => setDetail(false)}>Fermer</Bouton>
          </>}>
          <p className="chiffres text-[32px] leading-tight font-extrabold tracking-tight">{formatNombre(f.montant_xof)} <span className="text-[14px] font-semibold text-encre-3">FCFA</span></p>
          <dl className="mt-4 text-[14px]">
            {([
              ["Description", f.libelle],
              ["Fournisseur", f.fournisseur],
              ["Statut", f.statut === "paye" ? "Payée" : "À payer"],
              ["Compte", f.statut === "paye" ? f.compte_nom : null],
              ["Montant d'origine", f.devise !== "XOF" ? `${formatDevise(f.montant, f.devise)} × ${formatNombre(f.taux, f.taux % 1 ? 3 : 0)}` : null],
            ] as [string, string | null][]).filter(([, v]) => v).map(([t, v]) => (
              <div key={t} className="flex justify-between gap-4 border-b border-trait py-3 last:border-b-0"><dt className="text-encre-3">{t}</dt><dd className="text-right font-medium">{v}</dd></div>
            ))}
          </dl>
          {f.piece_path && (
            <Bouton className="mt-4" variante="secondaire" icone={<Paperclip size={16} weight="bold" />} onClick={async () => { const u = await urlFichier(f.piece_path!); if (u) window.open(u, "_blank", "noopener"); }}>Voir le justificatif</Bouton>
          )}
        </Feuille>
      )}
    </li>
  );
}
