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

  // Ligne « catégorie · référence » (voiture ou conteneur) et description : présentes ou non selon la dépense.
  const aCategorie = vehicule || conteneur;
  const aDetails = aCategorie || Boolean(f.libelle);
  const aPayer = f.statut === "a_payer";

  /*
   * Une grille, deux dispositions selon la largeur de la liste (requêtes de conteneur sur la ligne) :
   *  - étroite (téléphone) : vignette, titre sur deux lignes au plus et montant sur la première rangée ; catégorie,
   *    référence et description dessous, sur la largeur du texte et du montant ; la méta (date · fournisseur…) en
   *    pied, sur toute la largeur, avec à droite la place des actions (posées par-dessus, hors du lien) ;
   *  - large (@2xl, 672 px) : vignette, trois lignes de texte, montant, chevron, puis les actions dans la même rangée.
 *    Le seuil compte la place des actions posées à côté du lien (« Marquer payé » + corbeille, environ 200 px) :
 *    plus bas, la colonne du texte tombait à quelques dizaines de pixels (fiche véhicule à 1100 px).
   */
  const contenu = (
    <>
      {vehicule ? (
        <span className={cn("relative col-start-1 row-start-1 self-start @2xl:self-center", aDetails ? "row-span-2 @2xl:row-span-3" : "@2xl:row-span-2")}>
          <PhotoVehicule path={f.vehicule_photo} alt="" className="h-12 w-16 rounded-xl" />
          <span className="absolute -right-2 -bottom-2 grid size-6 place-items-center rounded-full text-white ring-2 ring-surface" style={{ background: `color-mix(in srgb, ${couleur} 80%, var(--nuit))` }}><Ico size={12} weight="fill" aria-hidden /></span>
        </span>
      ) : (
        <span className={cn("col-start-1 row-start-1 grid size-12 place-items-center self-start rounded-xl text-white @2xl:self-center", aDetails ? "row-span-2 @2xl:row-span-3" : "@2xl:row-span-2")}
          style={{ background: `color-mix(in srgb, ${conteneur && st ? st.couleur : couleur} 80%, var(--nuit))` }}>
          {conteneur ? <Boat size={24} weight="fill" aria-hidden /> : <Ico size={24} weight="fill" aria-hidden />}
        </span>
      )}
      <span className="col-start-2 row-start-1 line-clamp-2 text-[16px] font-bold break-words group-hover:text-primaire">
        {vehicule ? (f.vehicule_libelle ?? "Véhicule") : conteneur ? (f.expedition_reference ?? "Conteneur") : libelleCategorie(f.categorie)}
      </span>
      {aDetails && (
        <span className="col-span-2 col-start-2 row-start-2 flex min-w-0 flex-col gap-1 text-[14px] text-encre-2 @2xl:col-span-1 @2xl:col-start-2">
          {aCategorie && (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="inline-flex h-6 items-center gap-1 rounded-full px-2 text-[12px] font-bold" style={{ background: `color-mix(in srgb, ${couleur} 13%, var(--surface))`, color: `color-mix(in srgb, ${couleur} 50%, var(--pole-texte))` }}>
                {libelleCategorie(f.categorie)}
              </span>
              {vehicule && f.vehicule_reference && <span className="font-mono text-[12px] text-encre-3">{f.vehicule_reference}</span>}
              {conteneur && st && <span className="text-[12px] font-bold" style={{ color: `color-mix(in srgb, ${st.couleur} 62%, var(--pole-texte))` }}>{st.libelle}</span>}
              {conteneur && f.expedition_nb_vehicules ? <span className="text-encre-3">réparti sur {pluriel(f.expedition_nb_vehicules, "véhicule")}</span> : null}
            </span>
          )}
          {f.libelle && <span className="line-clamp-2 break-words">{f.libelle}</span>}
        </span>
      )}
      <span className={cn(
        "col-span-3 col-start-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-encre-3 @2xl:col-span-1 @2xl:col-start-2 @2xl:min-h-0 @2xl:pr-0",
        aDetails ? "row-start-3" : "row-start-2",
        // Place réservée aux actions posées par-dessus : « Marquer payé » et corbeille (208 px), ou corbeille seule (48 px).
        peutModifier && (aPayer ? "min-h-11 pr-52" : "min-h-11 pr-12"),
      )}>
        <span className={cn("whitespace-nowrap", SEP)}>{formatDate(f.date)}</span>
        {f.fournisseur && <span className={SEP}>{f.fournisseur}</span>}
        {f.statut === "paye" && f.compte_nom && <span className={SEP}>{f.compte_nom}</span>}
        {f.piece_path && <span className={cn("inline-flex items-center gap-1", SEP)}><Paperclip size={12} aria-hidden />justificatif</span>}
        {aPayer && <span className="inline-flex h-6 items-center gap-1 rounded-full bg-ocre-voile px-2 text-[12px] font-bold text-ocre-texte"><Clock size={12} weight="fill" aria-hidden />à payer</span>}
      </span>
      <span className={cn("col-start-3 row-start-1 text-right @2xl:self-center", aDetails ? "@2xl:row-span-3" : "@2xl:row-span-2")}>
        <Montant valeur={montant} devise={null} className="text-[16px]" />
        {estPart && <span className="block text-[12px] text-encre-3">part de {formatNombre(f.montant_xof)}</span>}
        {f.devise !== "XOF" && <span className="block text-[12px] whitespace-nowrap text-encre-3">{formatDevise(f.montant, f.devise)} × {formatNombre(f.taux, f.taux % 1 ? 3 : 0)}</span>}
      </span>
      <CaretRight size={16} weight="bold" className={cn("col-start-4 row-start-1 hidden self-center text-encre-3 transition-transform group-hover:translate-x-px group-hover:text-primaire @2xl:block", aDetails ? "@2xl:row-span-3" : "@2xl:row-span-2")} aria-hidden />
    </>
  );

  const classes = "group grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 rounded-xl px-2 py-2 text-left @2xl:grid-cols-[auto_minmax(0,1fr)_auto_auto] @2xl:items-center";

  return (
    <li ref={ligne} className={cn("@container relative flex items-center gap-x-1 px-2 py-1 transition-colors hover:bg-surface-2/70", enEvidence && "bg-primaire-voile")}>
      {lien ? (
        <Link href={lien} className={classes} aria-label={`${libelleCategorie(f.categorie)}, ${vehicule ? f.vehicule_libelle : conteneur ? f.expedition_reference : "dépense générale"} : ouvrir`}>{contenu}</Link>
      ) : (
        <button type="button" onClick={() => setDetail(true)} className={classes}>{contenu}</button>
      )}
      {peutModifier && (
        // Étroit : posées en bas à droite, dans la place réservée au bout de la méta (bord de la ligne + rembourrage du lien).
        // Large : à la suite du lien, dans la même rangée.
        <div className="absolute right-4 bottom-3 flex items-center gap-2 @2xl:static @2xl:shrink-0 @2xl:pr-1">
          {aPayer && (
            <Bouton taille="sm" variante="secondaire" icone={<CheckCircle size={16} weight="duotone" className="shrink-0 text-gain-texte" />} chargement={marquerPaye.isPending}
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
