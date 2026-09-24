"use client";

import { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Archive, ArrowLeft, ArrowRight, Bookmark, BookmarkX, Camera, Ellipsis, FilePlus2, FileText, Pencil, Plus, Receipt, Route,
} from "lucide-react";
import { nouvelId, useEcriture, useLecture } from "@/lib/api/requetes";
import { useParametres } from "@/lib/api/parametres";
import type { VehiculeDetail } from "@/lib/api/types";
import { useOrg } from "@/lib/session";
import { etape as defEtape, etapeSuivante, libelleCategorie, peut, TITRES } from "@/lib/domaine";
import { coutsAvecEstimation } from "@/lib/estimation";
import { formatDate, formatDevise, formatNombre, pluriel } from "@/lib/format";
import { televerser, urlFichier } from "@/lib/stockage";
import { cn } from "@/lib/cn";
import { IdentiteVehicule } from "@/components/metier/identite-vehicule";
import { Trajet } from "@/components/metier/trajet";
import { CoutRevient } from "@/components/metier/cout-revient";
import { PhotoVehicule } from "@/components/metier/photo-vehicule";
import { FeuilleFrais } from "@/components/metier/feuille-frais";
import { FeuilleEtape, FeuilleReservation } from "@/components/metier/feuilles-vehicule";
import { Bouton, BoutonIcone } from "@/components/ui/bouton";
import { EtatErreur, Squelette } from "@/components/ui/etats";
import { LigneRegistre, Section } from "@/components/ui/section";
import { EtiquetteEtape, Montant } from "@/components/ui/signature";
import { MenuActions } from "@/components/ui/menu";
import { Feuille } from "@/components/ui/feuille";
import { Selection } from "@/components/ui/champ";

const TYPES_DOCUMENT = [
  { valeur: "bl", libelle: "Connaissement (BL)" },
  { valeur: "titre", libelle: "Titre de propriété" },
  { valeur: "facture_achat", libelle: "Facture d'achat" },
  { valeur: "declaration_douane", libelle: "Déclaration en douane" },
  { valeur: "carte_grise", libelle: "Carte grise" },
  { valeur: "autre", libelle: "Autre" },
];

/** La photo occupe l'écran : pleine largeur sur téléphone, colonne de gauche sur ordinateur. */
function Galerie({ chemins, alt, actif, onChoisir, peutAjouter, envoi, onAjouter }: {
  chemins: string[];
  alt: string;
  actif: number;
  onChoisir: (i: number) => void;
  peutAjouter: boolean;
  envoi: number;
  onAjouter: () => void;
}) {
  if (chemins.length === 0) {
    return (
      <button type="button" disabled={!peutAjouter} onClick={onAjouter}
        className="-mx-4 flex aspect-[4/3] w-[calc(100%+2rem)] flex-col items-center justify-center gap-2 bg-surface-2 text-encre-2 lg:mx-0 lg:w-full">
        <Camera className="size-7" aria-hidden />
        <span className="etiquette text-petit">{peutAjouter ? "Prendre ou choisir des photos" : "Pas de photo"}</span>
      </button>
    );
  }
  return (
    <div>
      <PhotoVehicule path={chemins[actif]} alt={alt} arrondi={false} className="-mx-4 aspect-[4/3] w-[calc(100%+2rem)] lg:mx-0 lg:w-full" />
      {(chemins.length > 1 || peutAjouter) && (
        <div className="sans-barre mt-2 flex gap-2 overflow-x-auto">
          {chemins.map((c, i) => (
            <button key={c} type="button" onClick={() => onChoisir(i)} aria-label={`Photo ${i + 1} sur ${chemins.length}`} aria-current={i === actif}
              className={cn("shrink-0", i === actif ? "outline-2 outline-offset-1 outline-encre" : "opacity-80 hover:opacity-100")}>
              <PhotoVehicule path={c} alt="" arrondi={false} className="aspect-[4/3] w-[72px]" />
            </button>
          ))}
          {peutAjouter && (
            <button type="button" onClick={onAjouter} aria-label="Ajouter des photos"
              className="grid aspect-[4/3] w-[72px] shrink-0 place-items-center bg-surface-2 text-encre-2 hover:bg-trait">
              {envoi > 0 ? <span className="chiffres text-petit">{envoi}…</span> : <Camera className="size-5" aria-hidden />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Fiche() {
  const id = useSearchParams().get("id") ?? "";
  const org = useOrg();
  const router = useRouter();
  const { data: reglages } = useParametres();
  const { data: v, error, isPending, refetch } = useLecture<VehiculeDetail>("vehicule_obtenir", { p_org: org.id, p_id: id }, { enabled: !!id });

  const [feuille, setFeuille] = useState<null | "frais" | "etape" | "reserver" | "document">(null);
  const [etapeProposee, setEtapeProposee] = useState<ReturnType<typeof etapeSuivante>>(null);
  const [envoiPhotos, setEnvoiPhotos] = useState(0);
  const [photoActive, setPhotoActive] = useState(0);
  const [typeDocument, setTypeDocument] = useState("bl");
  const champPhoto = useRef<HTMLInputElement>(null);
  const champDocument = useRef<HTMLInputElement>(null);

  const ajouterPhoto = useEcriture("vehicule_photo_ajouter");
  const ajouterDocument = useEcriture("document_ajouter", { onSuccess: () => { toast.success("Document ajouté"); setFeuille(null); } });
  const liberer = useEcriture("vehicule_liberer", { onSuccess: () => toast.success("Réservation levée"), onError: (e) => toast.error(e.message) });
  const archiver = useEcriture("vehicule_archiver", {
    onSuccess: () => { toast.success("Véhicule archivé"); router.push("/parc/"); },
    onError: (e) => toast.error(e.message),
  });

  if (!id) return <EtatErreur erreur={new Error("Aucun véhicule indiqué.")} />;
  if (error && !v) return <EtatErreur erreur={error} onReessayer={() => void refetch()} />;
  if (isPending || !v) {
    return (
      <div className="flex flex-col gap-4" role="status" aria-label="Chargement">
        <Squelette className="-mx-4 aspect-[4/3] w-[calc(100%+2rem)] lg:mx-0 lg:w-full" />
        <Squelette className="h-10 w-2/3" />
        <Squelette className="h-24" />
      </div>
    );
  }

  const p = reglages?.parametres;
  const modifier = peut(org.role, "modifierVehicule");
  const saisirFrais = peut(org.role, "saisirFrais");
  const vendre = peut(org.role, "vendre") && v.statut_commercial !== "vendu" && !v.archive;
  const suivante = etapeSuivante(v.etape);
  const voitCouts = v.couts_par_categorie !== null;
  const lignesCout = voitCouts ? coutsAvecEstimation(v.etape, v.couts_par_categorie ?? [], p?.bareme_douane) : [];
  const chemins = [...new Set([v.photo_principale_path, ...v.photos.map((ph) => ph.path)].filter((c): c is string => !!c))];

  async function envoyerPhotos(fichiers: FileList | null) {
    if (!fichiers?.length || !v) return;
    setEnvoiPhotos(fichiers.length);
    try {
      for (const f of Array.from(fichiers)) {
        const { path } = await televerser(org.id, `vehicules/${v.id}`, f);
        await ajouterPhoto.executerAsync({ p_org: org.id, p_vehicule_id: v.id, p_path: path });
        setEnvoiPhotos((n) => n - 1);
      }
      toast.success(fichiers.length > 1 ? `${fichiers.length} photos ajoutées` : "Photo ajoutée");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Envoi impossible");
    } finally {
      setEnvoiPhotos(0);
      if (champPhoto.current) champPhoto.current.value = "";
    }
  }

  async function envoyerDocument(fichier: File | undefined) {
    if (!fichier || !v) return;
    try {
      const { path, taille } = await televerser(org.id, `vehicules/${v.id}/documents`, fichier);
      ajouterDocument.executer({ p_org: org.id, p_data: { id: nouvelId(), vehicule_id: v.id, type: typeDocument, nom: fichier.name, path, taille } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Envoi impossible");
    }
  }

  const actionsMenu = [
    { libelle: "Modifier la fiche", icone: <Pencil className="size-4" />, onSelect: () => router.push(`/parc/modifier/?id=${v.id}`), masque: !modifier },
    { libelle: "Changer d'étape", icone: <Route className="size-4" />, onSelect: () => { setEtapeProposee(null); setFeuille("etape"); }, masque: !modifier },
    { libelle: "Ajouter un frais", icone: <Receipt className="size-4" />, onSelect: () => setFeuille("frais"), masque: !saisirFrais },
    { libelle: "Ajouter des photos", icone: <Camera className="size-4" />, onSelect: () => champPhoto.current?.click(), masque: !modifier },
    { libelle: "Ajouter un document", icone: <FilePlus2 className="size-4" />, onSelect: () => setFeuille("document"), masque: !modifier },
    { libelle: "Réserver pour un client", icone: <Bookmark className="size-4" />, onSelect: () => setFeuille("reserver"), masque: !vendre || v.statut_commercial !== "disponible" },
    { libelle: "Lever la réservation", icone: <BookmarkX className="size-4" />, onSelect: () => liberer.executer({ p_org: org.id, p_id: v.id }), masque: !vendre || v.statut_commercial !== "reserve" },
    { libelle: v.archive ? "Désarchiver" : "Archiver", icone: <Archive className="size-4" />, danger: !v.archive, onSelect: () => archiver.executer({ p_org: org.id, p_id: v.id, p_archive: !v.archive }), masque: !modifier || v.statut_commercial === "vendu" },
  ];

  /** Le prix : le chiffre qui compte, posé sans cadre. */
  const blocPrix = (
    <div className="border-t-2 border-encre pt-2">
      {v.vente ? (
        <>
          <p className="etiquette text-petit text-encre-3">Vendu à</p>
          <p className="text-titre font-semibold">{v.vente.client_nom}</p>
          <Montant valeur={v.vente.montant_ttc} taille="xl" className="mt-1 block" />
          <p className="mt-1 text-encre-2">
            {formatDate(v.vente.date_vente)} · {v.vente.livree ? `livré le ${formatDate(v.vente.date_livraison)}` : <span className="font-semibold text-ocre">à livrer</span>}
          </p>
          <Link href={`/ventes/fiche/?id=${v.vente.id}`} className="mt-2 inline-flex items-center gap-1 font-mono text-petit font-medium text-lien underline underline-offset-4">
            {v.vente.numero} <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </>
      ) : (
        <>
          <p className="etiquette text-petit text-encre-3">Prix affiché</p>
          {v.prix_affiche_xof !== null ? <Montant valeur={v.prix_affiche_xof} taille="xl" className="block" /> : <p className="text-encre-3">Pas encore fixé</p>}
          {v.prix_plancher_xof !== null && <p className="mt-1 text-encre-2">Plancher <span className="chiffres font-semibold text-encre">{formatNombre(v.prix_plancher_xof)}</span> FCFA</p>}
          {v.statut_commercial === "reserve" && (
            <p className={cn("mt-3 px-3 py-2", v.reservation_echue ? "bg-ocre-voile text-ocre" : "bg-surface-2 text-encre-2")}>
              Réservé pour <strong className="text-encre">{v.reserve_client_nom}</strong>{v.reserve_jusqu_au ? ` jusqu'au ${formatDate(v.reserve_jusqu_au)}` : ""}{v.reservation_echue ? " — échue" : ""}
            </p>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="pb-24 lg:pb-0">
      <div className="mb-3 flex items-center justify-between">
        <Link href="/parc/" className="etiquette inline-flex h-10 items-center gap-1.5 text-petit text-encre-2 hover:text-encre">
          <ArrowLeft className="size-4" aria-hidden /> Parc
        </Link>
        <div className="flex items-center gap-2">
          {vendre && (
            <Link href={`/ventes/nouvelle/?vehicule=${v.id}`} className="hidden h-10 items-center gap-2 rounded-controle bg-signal px-4 font-semibold text-sur-signal hover:bg-signal-fonce lg:inline-flex">
              <Receipt className="size-4" aria-hidden /> Vendre
            </Link>
          )}
          {modifier && suivante && (
            <Bouton className="hidden lg:inline-flex" icone={<ArrowRight className="size-4" />} onClick={() => { setEtapeProposee(suivante); setFeuille("etape"); }}>
              {defEtape(suivante).libelle}
            </Bouton>
          )}
          <MenuActions entrees={actionsMenu} declencheur={<BoutonIcone libelle="Plus d'actions"><Ellipsis className="size-5" /></BoutonIcone>} />
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-12 lg:gap-x-10">
        <div className="lg:col-span-7">
          <Galerie chemins={chemins} alt={v.libelle} actif={Math.min(photoActive, Math.max(chemins.length - 1, 0))} onChoisir={setPhotoActive}
            peutAjouter={modifier} envoi={envoiPhotos} onAjouter={() => champPhoto.current?.click()} />
          <input ref={champPhoto} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => void envoyerPhotos(e.target.files)} />
        </div>
        <div className="mt-6 flex flex-col gap-6 lg:col-span-5 lg:mt-0">
          <IdentiteVehicule v={v} uniteCompteur={p?.unite_compteur} />
          {blocPrix}
        </div>
      </div>

      <Section titre="Le trajet" className="mt-8">
        <div className="pt-2">
          <Trajet
            etape={v.etape}
            historique={v.etapes.map((e) => ({ etape: e.etape, date: e.date }))}
            depart={v.expedition?.port_depart ?? v.lieu_achat}
            port={v.expedition?.port_arrivee}
            arrivee="Bamako"
            eta={v.expedition?.date_arrivee_reelle ? null : v.expedition?.date_arrivee_prevue}
          />
        </div>
      </Section>

      <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:gap-x-10">
        <div className="flex min-w-0 flex-col gap-8 lg:col-span-7">
          {voitCouts && (
            <CoutRevient
              lignes={lignesCout}
              prixAffiche={v.prix_affiche_xof}
              prixPlancher={v.prix_plancher_xof}
              prixVente={v.vente?.montant_ttc ?? null}
              margeReelle={v.marge_type === "reelle" ? v.marge_xof : null}
            />
          )}

          {voitCouts && (
            <Section titre="Frais" compteur={v.frais?.length ?? 0}
              action={saisirFrais ? <Bouton variante="fantome" taille="sm" icone={<Plus className="size-4" />} onClick={() => setFeuille("frais")}>Ajouter</Bouton> : undefined}>
              {v.frais && v.frais.length > 0 ? (
                <ul>
                  {v.frais.map((f) => (
                    <li key={`${f.id}-${f.part_xof}`} className="flex items-start gap-3 border-b border-trait py-2.5 last:border-b-0">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {libelleCategorie(f.categorie)}
                          {f.statut === "a_payer" && <span className="etiquette ml-2 text-petit text-ocre">à payer</span>}
                          {f.portee === "expedition" && <span className="etiquette ml-2 text-petit text-acier">part {f.expedition_reference}</span>}
                        </p>
                        <p className="truncate text-petit text-encre-3">
                          {formatDate(f.date)}{f.libelle ? ` · ${f.libelle}` : ""}{f.fournisseur ? ` · ${f.fournisseur}` : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <Montant valeur={f.part_xof ?? f.montant_xof} devise={null} />
                        {f.devise !== "XOF" && (
                          <p className="text-petit text-encre-3">{formatDevise(f.montant, f.devise)} × {formatNombre(f.taux, f.taux % 1 ? 3 : 0)}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-2 text-encre-3">Aucun frais saisi. Enchère, remorquage, fret, douane : chaque dépense compte dans le prix de revient.</p>
              )}
            </Section>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-8 lg:col-span-5">
          <Section titre="Informations">
            <dl>
              {[
                ["Date d'achat", formatDate(v.date_achat)],
                ["Titre", v.titre ? `${TITRES[v.titre]?.libelle ?? v.titre}${TITRES[v.titre]?.aide ? ` — ${TITRES[v.titre]!.aide.toLowerCase()}` : ""}` : null],
                ["Dommage principal", v.dommage_principal],
                ["Clés", v.cles === null ? null : v.cles ? "Oui" : "Non"],
                ["Démarre", v.demarre === null ? null : v.demarre ? "Oui" : "Non"],
                ["Moteur", v.moteur],
                ["Immatriculation", v.immatriculation],
                ["Carte grise", v.carte_grise ? { a_faire: "À faire", en_cours: "En cours", obtenue: "Obtenue" }[v.carte_grise] : null],
              ].filter(([, val]) => val && val !== "—").map(([t, val]) => (
                <LigneRegistre key={t} libelle={t}>{val}</LigneRegistre>
              ))}
            </dl>
            {v.notes && <p className="mt-3 bg-surface-2 px-3 py-2 whitespace-pre-line text-encre-2">{v.notes}</p>}
          </Section>

          <Section titre="Documents" compteur={v.documents.length}
            action={modifier ? <Bouton variante="fantome" taille="sm" icone={<Plus className="size-4" />} onClick={() => setFeuille("document")}>Ajouter</Bouton> : undefined}>
            {v.documents.length > 0 ? (
              <ul>
                {v.documents.map((d) => (
                  <li key={d.id}>
                    <button type="button" onClick={async () => { const u = await urlFichier(d.path); if (u) window.open(u, "_blank", "noopener"); }}
                      className="flex w-full items-center gap-3 border-b border-trait py-2.5 text-left last:border-b-0 hover:bg-surface-2">
                      <FileText className="size-5 shrink-0 text-encre-3" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{d.nom}</span>
                        <span className="block text-petit text-encre-3">{TYPES_DOCUMENT.find((t) => t.valeur === d.type)?.libelle ?? d.type} · {formatDate(d.created_at)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-2 text-encre-3">Connaissement, titre, facture Copart, déclaration en douane : gardez-les ici, consultables même au port.</p>
            )}
          </Section>

          <Section titre="Historique">
            <ol>
              {v.etapes.map((e) => (
                <li key={e.id} className="flex items-start gap-3 border-b border-trait py-2.5 last:border-b-0">
                  <span className="chiffres w-20 shrink-0 text-petit text-encre-3">{formatDate(e.date)}</span>
                  <div className="min-w-0 flex-1">
                    <EtiquetteEtape etape={e.etape} />
                    {e.note && <p className="mt-1 text-encre-2">{e.note}</p>}
                    {e.user_nom && <p className="text-petit text-encre-3">par {e.user_nom}</p>}
                  </div>
                </li>
              ))}
            </ol>
            {v.historique_ventes.filter((h) => h.statut === "annulee").length > 0 && (
              <p className="mt-2 text-petit text-encre-3">{pluriel(v.historique_ventes.filter((h) => h.statut === "annulee").length, "vente annulée", "ventes annulées")} sur ce véhicule.</p>
            )}
          </Section>
        </div>
      </div>

      {/* Barre d'action mobile, au pouce */}
      {(vendre || (modifier && suivante) || v.vente) && (
        <div className="zone-sure-bas fixed inset-x-0 bottom-16 z-30 flex gap-2 border-t border-trait bg-surface px-4 py-3 lg:hidden">
          {modifier && suivante && (
            <Bouton className="flex-1" icone={<ArrowRight className="size-4" />} onClick={() => { setEtapeProposee(suivante); setFeuille("etape"); }}>
              {defEtape(suivante).libelle}
            </Bouton>
          )}
          {vendre ? (
            <Link href={`/ventes/nouvelle/?vehicule=${v.id}`} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-controle bg-signal font-semibold text-sur-signal active:bg-signal-fonce">
              <Receipt className="size-4" aria-hidden /> Vendre
            </Link>
          ) : v.vente ? (
            <Link href={`/ventes/fiche/?id=${v.vente.id}`} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-controle bg-surface-2 font-medium">
              Voir la vente {v.vente.numero}
            </Link>
          ) : null}
        </div>
      )}

      <FeuilleFrais ouverte={feuille === "frais"} onFermer={() => setFeuille(null)} vehiculeId={v.id} />
      <FeuilleEtape ouverte={feuille === "etape"} onFermer={() => setFeuille(null)} vehiculeId={v.id} actuelle={v.etape} proposee={etapeProposee} />
      <FeuilleReservation ouverte={feuille === "reserver"} onFermer={() => setFeuille(null)} vehiculeId={v.id} />
      <Feuille ouverte={feuille === "document"} onFermer={() => setFeuille(null)} titre="Ajouter un document"
        pied={<>
          <Bouton variante="secondaire" onClick={() => setFeuille(null)}>Annuler</Bouton>
          <Bouton variante="primaire" chargement={ajouterDocument.isPending} onClick={() => champDocument.current?.click()}>Choisir le fichier</Bouton>
        </>}>
        <Selection libelle="Type de document" value={typeDocument} onChange={(e) => setTypeDocument(e.target.value)} options={TYPES_DOCUMENT} />
        <p className="mt-3 text-petit text-encre-3">PDF ou photo. Les photos sont réduites avant l&apos;envoi pour économiser vos données.</p>
        <input ref={champDocument} type="file" accept="application/pdf,image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => void envoyerDocument(e.target.files?.[0])} />
      </Feuille>
    </div>
  );
}

export default function PageVehicule() {
  return (
    <Suspense>
      <Fiche />
    </Suspense>
  );
}
