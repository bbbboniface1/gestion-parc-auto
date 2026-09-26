"use client";

import { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Anchor, Archive, ArrowFatLineRight, ArrowRight, BookmarkSimple, Boat, Camera, Car, CurrencyCircleDollar, FileText, FolderSimplePlus, Invoice, Path, PencilSimple, Plus, Trash, XCircle } from "@phosphor-icons/react";
import { nouvelId, useEcriture, useLecture } from "@/lib/api/requetes";
import { useParametres } from "@/lib/api/parametres";
import type { VehiculeDetail } from "@/lib/api/types";
import { useOrg } from "@/lib/session";
import { etape as defEtape, type Etape, peut, TITRES } from "@/lib/domaine";
import { incoherence, prochaineAction } from "@/lib/workflow";
import { celebrer } from "@/lib/celebration";
import { coutsAvecEstimation } from "@/lib/estimation";
import { aujourdhui, formatDate, formatNombre, pluriel } from "@/lib/format";
import { televerser, urlFichier } from "@/lib/stockage";
import { cn } from "@/lib/cn";
import { CarteEmbarquement } from "@/components/metier/carte-embarquement";
import { Trajet } from "@/components/metier/trajet";
import { CoutRevient } from "@/components/metier/cout-revient";
import { PhotoVehicule } from "@/components/metier/photo-vehicule";
import { FeuilleFrais } from "@/components/metier/feuille-frais";
import { FeuilleEtape, FeuilleReservation } from "@/components/metier/feuilles-vehicule";
import { FeuilleConteneur } from "@/components/metier/feuille-conteneur";
import { VisionneusePhotos } from "@/components/metier/visionneuse-photos";
import { LigneDepense } from "@/components/finances/ligne-depense";
import { couleurCategorie } from "@/lib/depenses";
import { BandeauCoherence } from "@/components/metier/bandeau-coherence";
import { RouteMaritime, STATUTS_EXPEDITION } from "@/components/expeditions/route-maritime";
import { Bouton, classesBouton } from "@/components/ui/bouton";
import { EtatErreur, Squelette } from "@/components/ui/etats";
import { EtiquetteEtape, Montant, Surtitre } from "@/components/ui/signature";
import { FilAriane } from "@/components/ui/fil-ariane";
import { PanneauActions, type ActionVisible } from "@/components/ui/panneau-actions";
import { useCompteursNavigation } from "@/lib/compteurs";
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

/** Bloc de second plan : titre en petites capitales, contenu calme. En-tête de 56 px, qu'il porte une action ou non. */
function Bloc({ titre, action, children, className }: { titre: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("carte", className)}>
      <header className="flex min-h-14 items-center justify-between gap-2 border-b border-trait px-4 py-2 lg:px-6">
        <h2 className="etiquette text-[12px] text-encre-3">{titre}</h2>
        {action}
      </header>
      <div className="p-4 lg:px-6">{children}</div>
    </section>
  );
}

function Fiche() {
  const id = useSearchParams().get("id") ?? "";
  const org = useOrg();
  const router = useRouter();
  const { data: reglages } = useParametres();
  const { data: v, error, isPending, refetch } = useLecture<VehiculeDetail>("vehicule_obtenir", { p_org: org.id, p_id: id }, { enabled: !!id });
  const compteurs = useCompteursNavigation();

  const [feuille, setFeuille] = useState<null | "frais" | "etape" | "reserver" | "document" | "conteneur">(null);
  const [etapeProposee, setEtapeProposee] = useState<Etape | null>(null);
  const [envoiPhotos, setEnvoiPhotos] = useState(0);
  const [photoOuverte, setPhotoOuverte] = useState<number | null>(null);
  const [typeDocument, setTypeDocument] = useState("bl");
  const champPhoto = useRef<HTMLInputElement>(null);
  const champDocument = useRef<HTMLInputElement>(null);

  const ajouterPhoto = useEcriture("vehicule_photo_ajouter");
  const ajouterDocument = useEcriture("document_ajouter", { onSuccess: () => { toast.success("Document ajouté"); setFeuille(null); } });
  const supprimerDocument = useEcriture("document_supprimer", { onSuccess: () => toast.success("Document supprimé"), onError: (e) => toast.error(e.message) });
  const liberer = useEcriture("vehicule_liberer", { onSuccess: () => toast.success("Réservation levée"), onError: (e) => toast.error(e.message) });
  // Le conteneur pilote la traversée : un seul geste met à jour le conteneur ET tous ses véhicules.
  const changerStatut = useEcriture<{ vehicules_mis_a_jour: number }>("expedition_changer_statut", {
    onSuccess: (r, p) => {
      const statut = (p as { p_statut?: string }).p_statut;
      const n = r?.vehicules_mis_a_jour ?? 0;
      const autres = n > 1 ? ` ${pluriel(n - 1, "autre véhicule passe", "autres véhicules passent")} avec lui.` : "";
      if (statut === "en_mer") celebrer({ type: "etape", titre: "Le conteneur a embarqué", detail: `Ce véhicule passe « En mer ».${autres}`, couleur: "var(--etape-en-mer)" });
      else celebrer({ type: "etape", titre: "Arrivé au port !", detail: `Ce véhicule passe « Au port ».${autres}`, couleur: "var(--etape-au-port)" });
    },
    onError: (e) => toast.error(e.message),
  });
  const aligner = useEcriture("vehicule_changer_etape", {
    onSuccess: (_r, p) => { const d = defEtape((p as { p_etape: Etape }).p_etape); celebrer({ type: "etape", titre: `${d.libelle} : c'est aligné`, detail: "Le véhicule et son conteneur concordent.", couleur: d.couleur }); },
    onError: (e) => toast.error(e.message),
  });
  const sortirDuConteneur = useEcriture("vehicule_expedition_affecter", { onSuccess: () => toast.success("Sorti du conteneur"), onError: (e) => toast.error(e.message) });
  const archiver = useEcriture("vehicule_archiver", {
    onSuccess: (_r, p) => {
      if ((p as { p_archive?: boolean }).p_archive === false) { celebrer({ type: "etape", titre: "Remis au parc", detail: "Le véhicule réapparaît dans le parc.", couleur: "var(--etape-parc)" }); return; }
      toast.success("Véhicule archivé : retrouvez-le dans Parc › Archivés");
      router.push("/parc/");
    },
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
  const workflow = { etape: v.etape, archive: v.archive, statut_commercial: v.statut_commercial, expedition: v.expedition };
  const suivante = prochaineAction(workflow);
  const souci = incoherence(workflow);
  const conteneurUtile = !v.archive && v.statut_commercial !== "vendu" && (!!v.expedition || ["achete", "transport_usa", "en_mer", "au_port"].includes(v.etape));
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

  const jouerProchaine = () => {
    if (!suivante) return;
    if (suivante.genre === "etape") { setEtapeProposee(suivante.vers); setFeuille("etape"); }
    else if (suivante.genre === "choisir_conteneur") setFeuille("conteneur");
    else changerStatut.executer({ p_org: org.id, p_id: suivante.expeditionId, p_statut: suivante.statut, p_date: aujourdhui() });
  };
  const corriger = () => {
    if (!souci) return;
    const c = souci.correction;
    if (c.genre === "aligner") aligner.executer({ p_org: org.id, p_id: v.id, p_etape: c.vers, p_date: aujourdhui(), p_note: "Aligné sur l'état de son conteneur" });
    else if (c.genre === "choisir_conteneur") setFeuille("conteneur");
    else if (c.genre === "quitter_conteneur") sortirDuConteneur.executer({ p_org: org.id, p_vehicule_id: v.id, p_expedition_id: null });
    else if (v.expedition) changerStatut.executer({ p_org: org.id, p_id: v.expedition.id, p_statut: "en_mer", p_date: aujourdhui() });
  };
  const couleurProchaine = !suivante ? "var(--primaire)" : suivante.genre === "etape" ? defEtape(suivante.vers).couleur : suivante.genre === "choisir_conteneur" ? "var(--etape-en-mer)" : suivante.statut === "en_mer" ? "var(--etape-en-mer)" : "var(--etape-au-port)";
  const iconeProchaine = !suivante || suivante.genre === "etape" ? ArrowFatLineRight : suivante.genre === "choisir_conteneur" ? Boat : Anchor;

  const actions: ActionVisible[] = [
    { cle: "vendre", titre: "Vendre ce véhicule", detail: v.prix_affiche_xof ? `Facture au prix affiché ${formatNombre(v.prix_affiche_xof)} FCFA` : "Facture, acompte ou paiement échelonné", icone: Invoice, couleur: "var(--gain)", principale: true, href: `/ventes/nouvelle/?vehicule=${v.id}`, masque: !vendre },
    { cle: "suivante", titre: suivante?.titre ?? "Étape suivante", detail: suivante ? `${suivante.detail}` : undefined, icone: iconeProchaine, couleur: couleurProchaine, onClick: jouerProchaine, masque: !modifier || !suivante },
    { cle: "frais", titre: "Ajouter un frais", detail: "Fret, douane, atelier : compté dans le coût", icone: CurrencyCircleDollar, couleur: "var(--accent)", onClick: () => setFeuille("frais"), masque: !saisirFrais },
    // Photos et documents ne sont pas des étapes du voyage : pictogramme neutre, pas la palette des étapes.
    { cle: "photos", titre: "Ajouter des photos", detail: `${pluriel(v.photos.length, "photo")} · appareil ou galerie`, icone: Camera, couleur: "var(--encre-3)", onClick: () => champPhoto.current?.click(), masque: !modifier },
    { cle: "document", titre: "Ajouter un document", detail: `${pluriel(v.documents.length, "document")} · BL, titre, douane`, icone: FolderSimplePlus, couleur: "var(--encre-3)", onClick: () => setFeuille("document"), masque: !modifier },
    { cle: "reserver", titre: "Réserver pour un client", detail: "Bloque la vente jusqu'à une date", icone: BookmarkSimple, couleur: "var(--reserve)", onClick: () => setFeuille("reserver"), masque: !vendre || v.statut_commercial !== "disponible" },
    { cle: "liberer", titre: "Lever la réservation", detail: v.reserve_client_nom ? `Réservé pour ${v.reserve_client_nom}` : undefined, icone: XCircle, couleur: "var(--reserve)", onClick: () => liberer.executerAsync({ p_org: org.id, p_id: v.id }), masque: !vendre || v.statut_commercial !== "reserve" },
    { cle: "modifier", titre: "Modifier la fiche", detail: "VIN, prix, kilométrage, notes", icone: PencilSimple, couleur: "var(--primaire)", href: `/parc/modifier/?id=${v.id}`, masque: !modifier },
    { cle: "etape", titre: "Choisir une autre étape", detail: "Revenir en arrière ou sauter une étape", icone: Path, couleur: "var(--encre-3)", onClick: () => { setEtapeProposee(null); setFeuille("etape"); }, masque: !modifier },
    { cle: "archiver", titre: v.archive ? "Remettre au parc" : "Archiver", detail: v.archive ? "Le véhicule réapparaît dans le parc" : "Le retire du parc, sans rien effacer", icone: Archive, couleur: "var(--encre-3)", danger: !v.archive, onClick: () => archiver.executerAsync({ p_org: org.id, p_id: v.id, p_archive: !v.archive }), masque: !modifier || v.statut_commercial === "vendu" },
  ];

  // Premier plan : le prix (32 px), juste sous l'identité du véhicule.
  const blocPrix = (
    <section className="carte p-4 lg:p-6">
      {v.vente ? (
        <>
          <Surtitre>Vendu à</Surtitre>
          <p className="mt-1 text-[18px] font-semibold">{v.vente.client_nom}</p>
          <Montant valeur={v.vente.montant_ttc} taille="lg" className="mt-1 block" />
          <p className="mt-1 text-[14px] text-encre-2">
            {formatDate(v.vente.date_vente)} · {v.vente.livree ? `livré le ${formatDate(v.vente.date_livraison)}` : <span className="font-medium text-ocre-texte">à livrer</span>}
          </p>
          <Link href={`/ventes/fiche/?id=${v.vente.id}`} className="mt-2 inline-flex min-h-11 items-center gap-1 font-mono text-[14px] font-medium text-primaire hover:underline lg:min-h-10">
            {v.vente.numero} <ArrowRight className="size-4" />
          </Link>
        </>
      ) : (
        <>
          <Surtitre>Prix affiché</Surtitre>
          {v.prix_affiche_xof !== null ? <Montant valeur={v.prix_affiche_xof} taille="xl" className="mt-1 block" /> : <p className="mt-1 text-encre-3">Pas encore fixé</p>}
          {v.prix_plancher_xof !== null && <p className="mt-1 text-[14px] text-encre-2">Plancher <span className="chiffres font-medium text-encre">{formatNombre(v.prix_plancher_xof)}</span> FCFA</p>}
          {v.statut_commercial === "reserve" && (
            <p className={cn("mt-3 rounded-controle px-3 py-2 text-[14px]", v.reservation_echue ? "bg-ocre-voile text-ocre-texte" : "bg-surface-2 text-encre-2")}>
              Réservé pour <strong className="text-encre">{v.reserve_client_nom}</strong>{v.reserve_jusqu_au ? ` jusqu'au ${formatDate(v.reserve_jusqu_au)}` : ""}{v.reservation_echue ? " — échue" : ""}
            </p>
          )}
        </>
      )}
    </section>
  );

  // Deux niveaux (docs/CONVENTIONS_FRONT.md, « Hiérarchie ») :
  //  1. premier plan — l'identité du véhicule et son étape (carte héro), son prix (sous la carte héro sur téléphone,
  //     en tête de colonne sur ordinateur), puis le trajet et le coût de revient avec la marge ;
  //  2. second plan, plus calme — conteneur, actions, frais, documents, photos, informations, historique.
  return (
    <div className="pb-24 lg:pb-0">
      <FilAriane
        retour={{ href: "/parc/", libelle: "Parc", icone: Car, couleur: "var(--etape-achete)", detail: compteurs.parc?.sens }}
        etapes={[defEtape(v.etape).libelle, v.libelle]}
      />

      <div className="flex flex-col gap-6 lg:gap-8">
        <CarteEmbarquement v={v} uniteCompteur={p?.unite_compteur} photo={v.photo_principale_path} />

        {(v.archive || souci) && (
          <div className="flex flex-col gap-4">
            {v.archive && (
              <div role="status" className="apparition flex flex-wrap items-center gap-3 rounded-carte bg-surface-2 p-3 ring-1 ring-trait">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-nuit text-white"><Archive size={24} weight="duotone" aria-hidden /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold">Ce véhicule est archivé</p>
                  <p className="text-[14px] leading-snug text-encre-2">Il n&apos;apparaît plus dans le parc, mais rien n&apos;est effacé : ses frais et son historique restent comptés.</p>
                </div>
                {modifier && <Bouton taille="sm" variante="primaire" chargement={archiver.isPending} onClick={() => archiver.executer({ p_org: org.id, p_id: v.id, p_archive: false })}>Remettre au parc</Bouton>}
              </div>
            )}
            {souci && (
              <BandeauCoherence souci={souci} onCorriger={modifier ? corriger : undefined} chargement={aligner.isPending || changerStatut.isPending || sortirDuConteneur.isPending} />
            )}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
          <div className="flex min-w-0 flex-col gap-4 lg:col-span-8 lg:gap-6">
            <div className="lg:hidden">{blocPrix}</div>
            <Trajet
              etape={v.etape}
              historique={v.etapes.map((e) => ({ etape: e.etape, date: e.date }))}
              depart={v.expedition?.port_depart ?? v.lieu_achat}
              port={v.expedition?.port_arrivee}
              arrivee="Bamako"
              eta={v.expedition?.date_arrivee_reelle ? null : v.expedition?.date_arrivee_prevue}
            />
            {voitCouts && (
              <CoutRevient
                lignes={lignesCout}
                prixAffiche={v.prix_affiche_xof}
                prixPlancher={v.prix_plancher_xof}
                prixVente={v.vente?.montant_ttc ?? null}
                margeReelle={v.marge_type === "reelle" ? v.marge_xof : null}
              />
            )}

            {/* Second plan */}
            <PanneauActions titre="Que voulez-vous faire ?" actions={actions} className="lg:hidden" />
            {conteneurUtile && (
              <section className="carte p-4 lg:p-6" aria-label="Conteneur">
                {v.expedition ? (
                  <>
                    <Link href={`/expeditions/fiche/?id=${v.expedition.id}`} className="onde group -m-1 flex items-center justify-between gap-3 rounded-controle p-1">
                      <span className="flex min-w-0 items-center gap-3">
                        {/* Tuile teintée de la couleur de l'état du conteneur (en préparation, en mer, arrivé) : calme, second plan. */}
                        <span className="grid size-11 shrink-0 place-items-center rounded-xl"
                          style={{ background: `color-mix(in srgb, ${STATUTS_EXPEDITION[v.expedition.statut].couleur} 14%, var(--surface))`, color: `color-mix(in srgb, ${STATUTS_EXPEDITION[v.expedition.statut].couleur} 85%, var(--pole-texte))` }}>
                          <Boat size={24} weight="fill" aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="etiquette block text-[12px] text-encre-3">Voyage dans le conteneur</span>
                          <span className="flex flex-wrap items-center gap-x-2">
                            <span className="text-[18px] font-extrabold group-hover:text-primaire">{v.expedition.reference}</span>
                            <span className="text-[14px] font-bold" style={{ color: `color-mix(in srgb, ${STATUTS_EXPEDITION[v.expedition.statut].couleur} 62%, var(--pole-texte))` }}>{STATUTS_EXPEDITION[v.expedition.statut].libelle}</span>
                          </span>
                          <span className="block truncate text-[14px] text-encre-3">{[v.expedition.compagnie, v.expedition.navire, v.expedition.numero_conteneur].filter(Boolean).join(" · ") || "Compagnie à préciser"}</span>
                        </span>
                      </span>
                      <ArrowRight size={18} weight="bold" className="shrink-0 text-encre-3 transition-transform group-hover:translate-x-px group-hover:text-primaire" aria-hidden />
                    </Link>
                    <div className="mt-4"><RouteMaritime v={v.expedition} /></div>
                    {modifier && v.expedition.statut !== "cloturee" && (
                      <Bouton className="mt-3" variante="fantome" taille="sm" onClick={() => setFeuille("conteneur")}>Changer de conteneur</Bouton>
                    )}
                  </>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-encre-3"><Boat size={24} weight="duotone" aria-hidden /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[16px] font-bold">Pas encore de conteneur</p>
                      <p className="text-[14px] text-encre-3">Dès qu&apos;il est dans un conteneur, ses dates de mer et son arrivée se suivent toutes seules.</p>
                    </div>
                    {modifier && !souci && suivante?.genre !== "choisir_conteneur" && <Bouton variante="secondaire" taille="sm" icone={<Boat size={16} weight="duotone" />} onClick={() => setFeuille("conteneur")}>Choisir</Bouton>}
                  </div>
                )}
              </section>
            )}

            {voitCouts && (
              <Bloc titre={`Frais · ${v.frais?.length ?? 0}`}
                action={saisirFrais ? <Bouton variante="fantome" taille="sm" icone={<Plus className="size-4" />} onClick={() => setFeuille("frais")}>Ajouter</Bouton> : undefined}>
                {v.frais && v.frais.length > 0 ? (
                  <ul className="-mx-2 -my-1 divide-y divide-trait/70">
                    {v.frais.map((f) => <LigneDepense key={`${f.id}-${f.part_xof}`} f={f} contexte="vehicule" couleur={couleurCategorie(f.categorie)} peutModifier={saisirFrais} />)}
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
                    <li key={d.id} className="flex items-center gap-1 border-b border-trait last:border-b-0">
                      <button type="button" onClick={async () => { const u = await urlFichier(d.path); if (u) window.open(u, "_blank", "noopener"); }}
                        className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-controle py-3 text-left hover:bg-surface-2/50">
                        <FileText className="size-5 shrink-0 text-encre-3" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{d.nom}</span>
                          <span className="block text-[12px] text-encre-3">{TYPES_DOCUMENT.find((t) => t.valeur === d.type)?.libelle ?? d.type} · {formatDate(d.created_at)}</span>
                        </span>
                      </button>
                      {modifier && (
                        <button type="button" aria-label={`Supprimer ${d.nom}`} title="Supprimer"
                          onClick={() => { if (window.confirm(`Supprimer « ${d.nom} » ?`)) supprimerDocument.executer({ p_org: org.id, p_id: d.id }); }}
                          className="onde inline-grid size-11 shrink-0 place-items-center rounded-full text-encre-3 hover:bg-perte-voile hover:text-perte-texte lg:size-10"><Trash size={16} weight="duotone" aria-hidden /></button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-2 text-encre-3">Connaissement, titre, facture Copart, déclaration en douane : gardez-les ici, consultables même au port.</p>
              )}
            </Bloc>
          </div>

          <div className="flex min-w-0 flex-col gap-4 lg:col-span-4 lg:gap-6">
            <div className="hidden lg:block">{blocPrix}</div>
            <PanneauActions titre="Que voulez-vous faire ?" actions={actions} className="hidden lg:block" />

            <Bloc titre={`Photos · ${v.photos.length}`}
              action={modifier ? <Bouton variante="fantome" taille="sm" icone={<Camera className="size-4" />} chargement={envoiPhotos > 0} onClick={() => champPhoto.current?.click()}>Ajouter</Bouton> : undefined}>
              {v.photos.length > 0 ? (
                <div data-defilement="horizontal" className="sans-barre -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
                  {v.photos.map((ph, k) => (
                    <button key={ph.id} type="button" onClick={() => setPhotoOuverte(k)} aria-label={`Agrandir la photo ${k + 1} sur ${v.photos.length}`}
                      className="group relative shrink-0 snap-start overflow-hidden rounded-controle">
                      <PhotoVehicule path={ph.path} alt={v.libelle} className="aspect-[4/3] w-44 transition-transform duration-300 group-hover:scale-[1.03]" />
                      {k === 0 && <span className="absolute top-2 left-2 inline-flex h-6 items-center rounded-full bg-accent-plein px-2 text-[12px] font-bold text-white">Vitrine</span>}
                    </button>
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
                  <li key={e.id} className="flex items-start gap-3 border-b border-trait py-3 last:border-b-0">
                    <span className="chiffres w-20 shrink-0 text-[12px] leading-6 text-encre-3">{formatDate(e.date)}</span>
                    <div className="min-w-0 flex-1">
                      <EtiquetteEtape etape={e.etape} compacte />
                      {e.note && <p className="mt-1 text-[14px] text-encre-2">{e.note}</p>}
                      {e.user_nom && <p className="mt-1 text-[12px] text-encre-3">par {e.user_nom}</p>}
                    </div>
                  </li>
                ))}
              </ol>
              {v.historique_ventes.filter((h) => h.statut === "annulee").length > 0 && (
                <p className="mt-2 text-[14px] text-encre-3">{pluriel(v.historique_ventes.filter((h) => h.statut === "annulee").length, "vente annulée", "ventes annulées")} sur ce véhicule.</p>
              )}
            </Bloc>
          </div>
        </div>
      </div>

      {/* Barre d'action mobile, au pouce */}
      {(vendre || (modifier && suivante) || v.vente) && (
        <div className="zone-sure-bas fixed inset-x-0 bottom-16 z-30 flex gap-2 border-t border-trait/70 bg-surface/90 px-4 py-3 shadow-barre-bas backdrop-blur-xl lg:hidden">
          {modifier && suivante && (
            <Bouton className="h-auto min-h-11 flex-[1.5] py-2 text-center text-[14px] leading-tight whitespace-normal" icone={<ArrowFatLineRight size={18} weight="duotone" />} chargement={changerStatut.isPending} onClick={jouerProchaine}>
              {suivante.genre === "etape" ? `Passer à « ${defEtape(suivante.vers).libelle} »` : suivante.titre}
            </Bouton>
          )}
          {vendre ? (
            <Link href={`/ventes/nouvelle/?vehicule=${v.id}`} className={classesBouton("primaire", "md", "flex-1")}>
              <Invoice size={18} weight="fill" aria-hidden /> Vendre
            </Link>
          ) : v.vente ? (
            <Link href={`/ventes/fiche/?id=${v.vente.id}`} className={classesBouton("secondaire", "md", "flex-1")}>
              Voir la vente {v.vente.numero}
            </Link>
          ) : null}
        </div>
      )}

      <FeuilleFrais ouverte={feuille === "frais"} onFermer={() => setFeuille(null)} vehiculeId={v.id} />
      <FeuilleEtape ouverte={feuille === "etape"} onFermer={() => setFeuille(null)} vehiculeId={v.id} actuelle={v.etape} proposee={etapeProposee} />
      <VisionneusePhotos ouverte={photoOuverte !== null} onFermer={() => setPhotoOuverte(null)} photos={v.photos} index={photoOuverte ?? 0} onIndex={setPhotoOuverte}
        vehiculeId={v.id} libelle={v.libelle} peutModifier={modifier} />
      <FeuilleConteneur ouverte={feuille === "conteneur"} onFermer={() => setFeuille(null)} vehiculeId={v.id} vehiculeLibelle={v.libelle} actuel={v.expedition?.id ?? null} />
      <FeuilleReservation ouverte={feuille === "reserver"} onFermer={() => setFeuille(null)} vehiculeId={v.id} />
      <Feuille ouverte={feuille === "document"} onFermer={() => setFeuille(null)} titre="Ajouter un document"
        pied={<>
          <Bouton variante="secondaire" onClick={() => setFeuille(null)}>Annuler</Bouton>
          <Bouton variante="primaire" chargement={ajouterDocument.isPending} onClick={() => champDocument.current?.click()}>Choisir le fichier</Bouton>
        </>}>
        <Selection libelle="Type de document" value={typeDocument} onChange={(e) => setTypeDocument(e.target.value)} options={TYPES_DOCUMENT} />
        <p className="mt-3 text-[14px] text-encre-3">PDF ou photo. Les photos sont réduites avant l&apos;envoi pour économiser vos données.</p>
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
