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
import { CarteEmbarquement } from "@/components/metier/carte-embarquement";
import { Trajet } from "@/components/metier/trajet";
import { CoutRevient } from "@/components/metier/cout-revient";
import { PhotoVehicule } from "@/components/metier/photo-vehicule";
import { FeuilleFrais } from "@/components/metier/feuille-frais";
import { FeuilleEtape, FeuilleReservation } from "@/components/metier/feuilles-vehicule";
import { Bouton, BoutonIcone } from "@/components/ui/bouton";
import { EtatErreur, Squelette } from "@/components/ui/etats";
import { EtiquetteEtape, Montant, Surtitre } from "@/components/ui/signature";
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

function Bloc({ titre, action, children, className }: { titre: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("carte", className)}>
      <header className="flex items-center justify-between gap-2 border-b border-trait px-4 py-2.5 lg:px-5">
        <h2 className="etiquette text-[12px] text-encre-3">{titre}</h2>
        {action}
      </header>
      <div className="px-4 py-3 lg:px-5">{children}</div>
    </section>
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
        <Squelette className="h-56 rounded-carte" />
        <Squelette className="h-28 rounded-carte" />
        <Squelette className="h-72 rounded-carte" />
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

  const blocPrix = (
    <section className="carte p-4 lg:p-5">
      {v.vente ? (
        <>
          <Surtitre>Vendu à</Surtitre>
          <p className="mt-1 text-[17px] font-semibold">{v.vente.client_nom}</p>
          <Montant valeur={v.vente.montant_ttc} taille="lg" className="mt-1 block" />
          <p className="mt-1 text-[13px] text-encre-2">
            {formatDate(v.vente.date_vente)} · {v.vente.livree ? `livré le ${formatDate(v.vente.date_livraison)}` : <span className="font-medium text-ocre-texte">à livrer</span>}
          </p>
          <Link href={`/ventes/fiche/?id=${v.vente.id}`} className="mt-3 inline-flex items-center gap-1 font-mono text-[13px] font-medium text-primaire hover:underline">
            {v.vente.numero} <ArrowRight className="size-3.5" />
          </Link>
        </>
      ) : (
        <>
          <Surtitre>Prix affiché</Surtitre>
          {v.prix_affiche_xof !== null ? <Montant valeur={v.prix_affiche_xof} taille="xl" className="mt-1 block" /> : <p className="mt-1 text-encre-3">Pas encore fixé</p>}
          {v.prix_plancher_xof !== null && <p className="mt-1 text-[13px] text-encre-2">Plancher <span className="chiffres font-medium text-encre">{formatNombre(v.prix_plancher_xof)}</span> FCFA</p>}
          {v.statut_commercial === "reserve" && (
            <p className={cn("mt-3 rounded-controle px-3 py-2 text-[14px]", v.reservation_echue ? "bg-ocre-voile text-ocre-texte" : "bg-surface-2 text-encre-2")}>
              Réservé pour <strong className="text-encre">{v.reserve_client_nom}</strong>{v.reserve_jusqu_au ? ` jusqu'au ${formatDate(v.reserve_jusqu_au)}` : ""}{v.reservation_echue ? " — échue" : ""}
            </p>
          )}
        </>
      )}
    </section>
  );

  return (
    <div className="pb-24 lg:pb-0">
      <div className="mb-3 flex items-center justify-between">
        <Link href="/parc/" className="inline-flex h-10 items-center gap-1.5 text-[14px] text-encre-2 hover:text-encre">
          <ArrowLeft className="size-4" aria-hidden /> Parc
        </Link>
        <div className="flex items-center gap-2">
          {vendre && (
            <Link href={`/ventes/nouvelle/?vehicule=${v.id}`} className="hidden h-10 items-center gap-2 rounded-controle bg-primaire px-4 text-sm font-medium text-sur-primaire hover:bg-primaire-fonce lg:inline-flex">
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

      <CarteEmbarquement v={v} uniteCompteur={p?.unite_compteur} photo={v.photo_principale_path} />

      <div className="mt-4 grid gap-4 lg:mt-5 lg:grid-cols-12 lg:gap-5">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-8 lg:gap-5">
          <Trajet
            etape={v.etape}
            historique={v.etapes.map((e) => ({ etape: e.etape, date: e.date }))}
            depart={v.expedition?.port_depart ?? v.lieu_achat}
            port={v.expedition?.port_arrivee}
            arrivee="Bamako"
            eta={v.expedition?.date_arrivee_reelle ? null : v.expedition?.date_arrivee_prevue}
          />
          <div className="lg:hidden">{blocPrix}</div>
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
            <Bloc titre={`Frais · ${v.frais?.length ?? 0}`}
              action={saisirFrais ? <Bouton variante="fantome" taille="sm" icone={<Plus className="size-4" />} onClick={() => setFeuille("frais")}>Ajouter</Bouton> : undefined}>
              {v.frais && v.frais.length > 0 ? (
                <ul className="-my-1">
                  {v.frais.map((f) => (
                    <li key={`${f.id}-${f.part_xof}`} className="flex items-start gap-3 border-b border-trait py-2.5 last:border-b-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-medium lg:text-sm">
                          {libelleCategorie(f.categorie)}
                          {f.statut === "a_payer" && <span className="etiquette ml-2 text-[11px] text-ocre-texte">à payer</span>}
                          {f.portee === "expedition" && <span className="etiquette ml-2 text-[11px] text-acier">part {f.expedition_reference}</span>}
                        </p>
                        <p className="truncate text-[13px] text-encre-3">
                          {formatDate(f.date)}{f.libelle ? ` · ${f.libelle}` : ""}{f.fournisseur ? ` · ${f.fournisseur}` : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <Montant valeur={f.part_xof ?? f.montant_xof} devise={null} />
                        {f.devise !== "XOF" && (
                          <p className="text-[12px] text-encre-3">{formatDevise(f.montant, f.devise)} × {formatNombre(f.taux, f.taux % 1 ? 3 : 0)}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-2 text-encre-3">Aucun frais saisi. Enchère, remorquage, fret, douane : chaque dépense compte dans le prix de revient.</p>
              )}
            </Bloc>
          )}

          <Bloc titre={`Documents · ${v.documents.length}`}
            action={modifier ? <Bouton variante="fantome" taille="sm" icone={<Plus className="size-4" />} onClick={() => setFeuille("document")}>Ajouter</Bouton> : undefined}>
            {v.documents.length > 0 ? (
              <ul className="-my-1">
                {v.documents.map((d) => (
                  <li key={d.id}>
                    <button type="button" onClick={async () => { const u = await urlFichier(d.path); if (u) window.open(u, "_blank", "noopener"); }}
                      className="flex w-full items-center gap-3 border-b border-trait py-2.5 text-left last:border-b-0 hover:bg-surface-2/50">
                      <FileText className="size-5 shrink-0 text-encre-3" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium lg:text-sm">{d.nom}</span>
                        <span className="block text-[13px] text-encre-3">{TYPES_DOCUMENT.find((t) => t.valeur === d.type)?.libelle ?? d.type} · {formatDate(d.created_at)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-2 text-encre-3">Connaissement, titre, facture Copart, déclaration en douane : gardez-les ici, consultables même au port.</p>
            )}
          </Bloc>
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:col-span-4 lg:gap-5">
          <div className="hidden lg:block">{blocPrix}</div>

          <Bloc titre={`Photos · ${v.photos.length}`}
            action={modifier ? <Bouton variante="fantome" taille="sm" icone={<Camera className="size-4" />} chargement={envoiPhotos > 0} onClick={() => champPhoto.current?.click()}>Ajouter</Bouton> : undefined}>
            {v.photos.length > 0 ? (
              <div className="sans-barre -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
                {v.photos.map((ph) => (
                  <PhotoVehicule key={ph.id} path={ph.path} alt={v.libelle} className="aspect-[4/3] w-44 shrink-0 snap-start" />
                ))}
              </div>
            ) : (
              <button type="button" disabled={!modifier} onClick={() => champPhoto.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-controle border border-dashed border-trait-fort py-6 text-encre-3 hover:bg-surface-2/50">
                <Camera className="size-6" aria-hidden />
                <span className="text-[14px]">{modifier ? "Prendre ou choisir des photos" : "Aucune photo"}</span>
              </button>
            )}
            <input ref={champPhoto} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => void envoyerPhotos(e.target.files)} />
          </Bloc>

          <Bloc titre="Informations">
            <dl className="-my-1 text-[14px]">
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
                <div key={t} className="flex justify-between gap-4 border-b border-trait py-2 last:border-b-0">
                  <dt className="text-encre-3">{t}</dt>
                  <dd className="text-right font-medium">{val}</dd>
                </div>
              ))}
            </dl>
            {v.notes && <p className="mt-3 rounded-controle bg-surface-2 px-3 py-2 text-[14px] whitespace-pre-line text-encre-2">{v.notes}</p>}
          </Bloc>

          <Bloc titre="Historique">
            <ol className="-my-1">
              {v.etapes.map((e) => (
                <li key={e.id} className="flex items-start gap-3 border-b border-trait py-2.5 last:border-b-0">
                  <span className="chiffres w-20 shrink-0 text-[13px] text-encre-3">{formatDate(e.date)}</span>
                  <div className="min-w-0 flex-1">
                    <EtiquetteEtape etape={e.etape} compacte />
                    {e.note && <p className="mt-1 text-[13px] text-encre-2">{e.note}</p>}
                    {e.user_nom && <p className="mt-0.5 text-[12px] text-encre-3">par {e.user_nom}</p>}
                  </div>
                </li>
              ))}
            </ol>
            {v.historique_ventes.filter((h) => h.statut === "annulee").length > 0 && (
              <p className="mt-2 text-[13px] text-encre-3">{pluriel(v.historique_ventes.filter((h) => h.statut === "annulee").length, "vente annulée", "ventes annulées")} sur ce véhicule.</p>
            )}
          </Bloc>
        </div>
      </div>

      {/* Barre d'action mobile, au pouce */}
      {(vendre || (modifier && suivante) || v.vente) && (
        <div className="zone-sure-bas fixed inset-x-0 bottom-16 z-30 flex gap-2 border-t border-trait bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
          {modifier && suivante && (
            <Bouton className="flex-1" icone={<ArrowRight className="size-4" />} onClick={() => { setEtapeProposee(suivante); setFeuille("etape"); }}>
              {defEtape(suivante).libelle}
            </Bouton>
          )}
          {vendre ? (
            <Link href={`/ventes/nouvelle/?vehicule=${v.id}`} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-controle bg-primaire text-[15px] font-medium text-sur-primaire active:bg-primaire-fonce">
              <Receipt className="size-4" aria-hidden /> Vendre
            </Link>
          ) : v.vente ? (
            <Link href={`/ventes/fiche/?id=${v.vente.id}`} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-controle border border-trait-fort bg-surface text-[15px] font-medium">
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
        <p className="mt-3 text-[13px] text-encre-3">PDF ou photo. Les photos sont réduites avant l&apos;envoi pour économiser vos données.</p>
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
