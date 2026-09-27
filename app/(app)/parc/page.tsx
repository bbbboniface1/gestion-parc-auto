"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Archive, CaretDown, Kanban, MagnifyingGlass, Plus, Rows, SquaresFour, Warning, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useEcriture, useLecture } from "@/lib/api/requetes";
import type { Vehicule } from "@/lib/api/types";
import { useOrg } from "@/lib/session";
import { useOrdinateur } from "@/lib/ecran";
import { cn } from "@/lib/cn";
import { ETAPES, etape as defEtape, etapeSuivante, peut, type Etape } from "@/lib/domaine";
import { aujourdhui, formatCourt } from "@/lib/format";
import { aVerifier, incoherence } from "@/lib/workflow";
import { EnTetePage } from "@/components/coque/coque";
import { CarteGalerie, CarteKanban } from "@/components/metier/carte-vehicule";
import { PhotoVehicule } from "@/components/metier/photo-vehicule";
import { PastillesConteneur } from "@/components/metier/pastille-conteneur";
import { Bouton, classesBouton } from "@/components/ui/bouton";
import { EtatErreur, EtatVide, Squelette } from "@/components/ui/etats";
import { Feuille } from "@/components/ui/feuille";
import { EtiquetteEtape, Montant, teintesEtape } from "@/components/ui/signature";

type FiltreStatut = "tous" | "disponible" | "reserve" | "vendu" | "a_verifier" | "archives";
type Vue = "galerie" | "colonnes" | "liste";

const STATUTS: { valeur: FiltreStatut; libelle: string }[] = [
  { valeur: "tous", libelle: "Tous" },
  { valeur: "disponible", libelle: "Disponibles" },
  { valeur: "reserve", libelle: "Réservés" },
  { valeur: "vendu", libelle: "Vendus" },
];

function lireVue(): Vue {
  if (typeof window === "undefined") return "galerie";
  const v = localStorage.getItem("parc-auto:vue-parc");
  return v === "colonnes" || v === "liste" ? v : "galerie";
}

function SqueletteGalerie() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4" role="status" aria-label="Chargement">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="carte overflow-hidden">
          <Squelette className="aspect-[4/3] rounded-none" />
          <div className="flex flex-col gap-2 p-4"><Squelette className="h-4 w-2/3" /><Squelette className="h-3 w-1/2" /><Squelette className="h-1.5" /></div>
        </div>
      ))}
    </div>
  );
}

function Parc() {
  const org = useOrg();
  const params = useSearchParams();
  const router = useRouter();
  const chemin = usePathname();
  const ordinateur = useOrdinateur();

  const etapeParam = params.get("etape") as Etape | null;
  const [etapeActive, setEtapeActive] = useState<Etape | "toutes">(etapeParam && ETAPES.some((e) => e.code === etapeParam) ? etapeParam : "toutes");
  const filtreParam = params.get("filtre");
  const [statut, setStatut] = useState<FiltreStatut>(
    params.get("vue") === "en_vente" ? "disponible" : filtreParam === "a_verifier" || filtreParam === "archives" ? filtreParam : "tous",
  );
  const [vue, setVue] = useState<Vue>(lireVue);
  const [q, setQ] = useState("");
  const [selection, setSelection] = useState<Set<string>>(new Set());
  // Téléphone : les huit étapes vivent dans une feuille, pour que la liste commence dans le premier écran.
  const [feuilleEtapes, setFeuilleEtapes] = useState(false);

  const { data, error, isPending, refetch } = useLecture<Vehicule[]>("vehicules_lister", { p_org: org.id, p_filtres: {} });
  // Les véhicules archivés ne sont plus au parc : on les retrouve ici, dans un filtre à part, pour les remettre au parc.
  const archives = useLecture<Vehicule[]>("vehicules_lister", { p_org: org.id, p_filtres: { archives_seulement: true } });
  const changerLot = useEcriture("vehicules_changer_etape_lot", {
    onSuccess: () => {
      toast.success("Étape mise à jour");
      setSelection(new Set());
    },
    onError: (e) => toast.error(e.message),
  });
  const peutModifier = peut(org.role, "modifierVehicule");

  const filtres = useMemo(() => {
    const motif = q.trim().toLowerCase();
    return (statut === "archives" ? archives.data ?? [] : data ?? []).filter((v) => {
      if (statut === "a_verifier") {
        if (!incoherence({ etape: v.etape, archive: v.archive, statut_commercial: v.statut_commercial, expedition: v.expedition })) return false;
      } else if (statut !== "tous" && statut !== "archives" && v.statut_commercial !== statut) return false;
      if (!motif) return true;
      return [v.libelle, v.reference, v.vin, v.lot_numero, v.immatriculation, v.reserve_client_nom, v.vente?.client_nom, v.expedition?.numero_conteneur]
        .some((x) => x?.toLowerCase().includes(motif));
    });
  }, [data, archives.data, statut, q]);

  const parEtape = useMemo(() => {
    const m = new Map<Etape, Vehicule[]>(ETAPES.map((e) => [e.code, []]));
    for (const v of filtres) m.get(v.etape)?.push(v);
    return m;
  }, [filtres]);

  const visibles = etapeActive === "toutes" ? filtres : parEtape.get(etapeActive) ?? [];
  const etapeChoisie = etapeActive === "toutes" ? null : defEtape(etapeActive);
  const vueEffective: Vue = ordinateur ? vue : "galerie";
  const nbVerifier = useMemo(() => aVerifier(data ?? []).length, [data]);
  const nbArchives = archives.data?.length ?? 0;
  const nbDispo = (data ?? []).filter((v) => v.statut_commercial === "disponible").length;
  const valeurStock = (data ?? []).filter((v) => v.statut_commercial !== "vendu").reduce((s, v) => s + (v.prix_affiche_xof ?? 0), 0);

  function choisirEtape(e: Etape | "toutes") {
    setEtapeActive(e);
    const p = new URLSearchParams(params);
    if (e === "toutes") p.delete("etape");
    else p.set("etape", e);
    router.replace(`${chemin}${p.size ? `?${p}` : ""}`, { scroll: false });
  }

  /** Les puces d'étape (toutes + les huit étapes). Dans la feuille du téléphone, un choix referme la feuille. */
  function pucesEtapes(dansFeuille: boolean) {
    const choisir = (e: Etape | "toutes") => {
      choisirEtape(e);
      if (dansFeuille) setFeuilleEtapes(false);
    };
    return (
      <>
        <button type="button" role="tab" aria-selected={etapeActive === "toutes"} onClick={() => choisir("toutes")}
          className={cn("flex h-11 min-w-0 shrink-0 items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition-all lg:h-10",
            etapeActive === "toutes" ? "bg-puce-active text-sur-puce-active shadow-puce" : "bg-surface text-encre-2 shadow-champ ring-1 ring-trait/70 hover:text-encre")}>
          <span className="truncate"><span className="sm:hidden">Toutes</span><span className="hidden sm:inline">Toutes les étapes</span></span>
          <span className={cn("chiffres rounded-full px-2 text-[12px]", etapeActive === "toutes" ? "bg-sur-puce-active/15" : "bg-surface-2 text-encre-3")}>{filtres.length}</span>
        </button>
        {ETAPES.map((e) => {
          const n = parEtape.get(e.code)?.length ?? 0;
          const actif = etapeActive === e.code;
          const t = teintesEtape(e.couleur);
          return (
            <button key={e.code} type="button" role="tab" aria-selected={actif} onClick={() => choisir(e.code)}
              className={cn("flex h-11 min-w-0 shrink-0 items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition-all lg:h-10",
                !actif && n > 0 && "bg-surface text-encre-2 shadow-champ ring-1 ring-trait/70 hover:text-encre",
                // Étape vide : onglet actif mais calme. Pointillés et encre-3 (AA), jamais d'opacité qui ferait tomber le contraste.
                !actif && n === 0 && "border border-dashed border-trait-fort bg-surface text-encre-3 hover:text-encre")}
              style={actif ? { background: t.fond, color: t.texte, boxShadow: `inset 0 0 0 2px ${e.couleur}` } : undefined}>
              <span className="size-2 shrink-0 rounded-full" style={{ background: e.couleur }} />
              <span className="truncate">{e.libelle}</span>
              <span className="chiffres text-[12px] font-bold">{n}</span>
            </button>
          );
        })}
      </>
    );
  }

  function basculer(id: string) {
    setSelection((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function deplacer(ids: string[], vers: Etape) {
    changerLot.executer({ p_org: org.id, p_ids: ids, p_etape: vers, p_date: aujourdhui() });
  }

  return (
    <>
      <EnTetePage
        titre="Parc"
        sousTitre={data ? `${data.length} véhicules · ${nbDispo} disponibles · ${formatCourt(valeurStock)} FCFA en vitrine` : undefined}
        actions={
          <>
            {ordinateur && (
              <div className="flex rounded-full bg-surface shadow-champ ring-1 ring-trait/70" role="group" aria-label="Affichage">
                {([["galerie", "Galerie", SquaresFour], ["colonnes", "Colonnes", Kanban], ["liste", "Liste", Rows]] as const).map(([valeur, libelle, Icone]) => (
                  <button key={valeur} type="button" aria-pressed={vue === valeur}
                    onClick={() => { setVue(valeur); localStorage.setItem("parc-auto:vue-parc", valeur); }}
                    className={cn("inline-flex h-10 items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition-all",
                      vue === valeur ? "bg-puce-active text-sur-puce-active shadow-puce" : "text-encre-3 hover:text-encre")}>
                    <Icone className="size-4" aria-hidden /> {libelle}
                  </button>
                ))}
              </div>
            )}
            {peutModifier && (
              <Link href="/parc/nouveau/" className={classesBouton("primaire")}>
                <Plus className="size-4" aria-hidden /> Ajouter un véhicule
              </Link>
            )}
          </>
        }
      />

      {/* Filtres : recherche et statut, puis étapes du voyage. Serrés entre eux (16 px), détachés de la liste (24/32 px). */}
      <div className="mb-6 flex flex-col gap-4 lg:mb-8">
        <div className="apparition flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center" style={{ animationDelay: "60ms" }}>
          <label className="relative flex-1 lg:max-w-md lg:min-w-80">
            <span className="sr-only">Rechercher dans le parc</span>
            <MagnifyingGlass className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-encre-3" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Modèle, VIN, lot, conteneur, client…"
              className="h-12 w-full rounded-full border border-trait bg-surface pr-12 pl-11 text-[16px] shadow-champ transition-all placeholder:text-encre-3/70 focus:border-primaire focus:shadow-[0_0_0_4px_var(--primaire-voile)] focus:outline-none lg:h-10 lg:text-[14px]" />
            {q && (
              <button type="button" onClick={() => setQ("")} aria-label="Effacer la recherche" className="absolute top-1/2 right-0.5 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-encre-3 hover:bg-surface-2 lg:right-0 lg:size-10">
                <X className="size-4" />
              </button>
            )}
          </label>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Statut commercial">
            {STATUTS.map((s) => (
              <button key={s.valeur} type="button" aria-pressed={statut === s.valeur} onClick={() => setStatut(s.valeur)}
                className={cn("h-11 shrink-0 rounded-full px-4 text-[14px] font-semibold transition-all lg:h-10",
                  statut === s.valeur ? "bg-puce-active text-sur-puce-active shadow-puce" : "bg-surface text-encre-2 shadow-champ ring-1 ring-trait/70 hover:text-encre")}>
                {s.libelle}
              </button>
            ))}
            {(nbVerifier > 0 || statut === "a_verifier") && (
              <button type="button" aria-pressed={statut === "a_verifier"} onClick={() => setStatut(statut === "a_verifier" ? "tous" : "a_verifier")}
                className={cn("inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition-all lg:h-10",
                  statut === "a_verifier" ? "bg-ocre text-nuit" : "bg-ocre-voile text-ocre-texte ring-1 ring-ocre/30 hover:ring-ocre/60")}>
                <Warning size={16} weight="fill" aria-hidden /> À vérifier <span className="chiffres text-[12px] font-bold">{nbVerifier}</span>
              </button>
            )}
            {(nbArchives > 0 || statut === "archives") && (
              <button type="button" aria-pressed={statut === "archives"} onClick={() => setStatut(statut === "archives" ? "tous" : "archives")}
                className={cn("inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition-all lg:h-10",
                  statut === "archives" ? "bg-puce-active text-sur-puce-active shadow-puce" : "bg-surface text-encre-3 shadow-champ ring-1 ring-trait/70 hover:text-encre")}>
                <Archive size={16} weight="duotone" aria-hidden /> Archivés <span className="chiffres text-[12px] font-bold">{nbArchives}</span>
              </button>
            )}
          </div>
        </div>

        {/* Étapes du voyage : filtre coloré (la palette des étapes parle ici de son vrai sujet).
            Ordinateur : puces qui passent à la ligne. Téléphone : une seule puce qui ouvre la feuille des étapes. */}
        {data && data.length > 0 && vueEffective !== "colonnes" && (ordinateur ? (
          <div className="apparition flex flex-wrap gap-2" role="tablist" aria-label="Étapes" style={{ animationDelay: "120ms" }}>
            {pucesEtapes(false)}
          </div>
        ) : (
          <div className="apparition flex" style={{ animationDelay: "120ms" }}>
            <button type="button" aria-haspopup="dialog" aria-expanded={feuilleEtapes} onClick={() => setFeuilleEtapes(true)}
              className={cn("flex h-11 min-w-0 items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition-all",
                !etapeChoisie && "bg-surface text-encre-2 shadow-champ ring-1 ring-trait/70")}
              style={etapeChoisie ? { background: teintesEtape(etapeChoisie.couleur).fond, color: teintesEtape(etapeChoisie.couleur).texte, boxShadow: `inset 0 0 0 2px ${etapeChoisie.couleur}` } : undefined}>
              {etapeChoisie && <span className="size-2 shrink-0 rounded-full" style={{ background: etapeChoisie.couleur }} />}
              <span className="truncate">Étape : {etapeChoisie ? etapeChoisie.libelle : "Toutes"}</span>
              <span className="chiffres text-[12px] font-bold">{visibles.length}</span>
              <CaretDown size={16} weight="bold" aria-hidden className="shrink-0" />
            </button>
            <Feuille ouverte={feuilleEtapes} onFermer={() => setFeuilleEtapes(false)} titre="Étape du voyage">
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Étapes">
                {pucesEtapes(true)}
              </div>
            </Feuille>
          </div>
        ))}
      </div>

      {error && !data ? (
        <EtatErreur erreur={error} onReessayer={() => void refetch()} />
      ) : isPending || !data || (statut === "archives" && archives.isPending) ? (
        <SqueletteGalerie />
      ) : data.length === 0 ? (
        <EtatVide
          titre="Aucun véhicule pour l'instant"
          texte="Ajoutez votre premier véhicule : saisissez son VIN, la marque, le modèle et l'année se remplissent seuls."
          action={peutModifier ? <Link href="/parc/nouveau/" className={classesBouton("primaire")}><Plus className="size-4" aria-hidden /> Ajouter un véhicule</Link> : undefined}
        />
      ) : vueEffective === "colonnes" ? (
        <div data-defilement="horizontal" className="-mx-8 overflow-x-auto px-8 pb-4">
          <div className="grid min-w-[1500px] grid-cols-8 gap-4">
            {ETAPES.map((e) => {
              const liste = parEtape.get(e.code) ?? [];
              const capital = liste.reduce((s, v) => s + (v.prix_revient_xof ?? 0), 0);
              const suivante = etapeSuivante(e.code);
              const t = teintesEtape(e.couleur);
              return (
                <section key={e.code} aria-label={`${e.libelle} : ${liste.length}`} className="flex min-h-[60vh] flex-col rounded-carte p-2" style={{ background: `color-mix(in srgb, ${e.couleur} 7%, var(--papier))` }}>
                  <header className="mb-2 rounded-xl bg-surface px-3 py-2 shadow-carte">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-[14px] font-bold" style={{ color: t.texte }}>
                        <span className="size-2 rounded-full" style={{ background: e.couleur }} />{e.libelle}
                      </span>
                      <span className="chiffres rounded-full px-2 text-[12px] font-bold" style={{ background: t.fond, color: t.texte }}>{liste.length}</span>
                    </div>
                    {liste.some((v) => v.prix_revient_xof !== null) && <p className="mt-1 text-[12px] text-encre-3">{formatCourt(capital)} FCFA</p>}
                  </header>
                  <div className="flex flex-col gap-2">
                    {liste.map((v) => (
                      <CarteKanban key={v.id} v={v} cochee={selection.has(v.id)} basculer={() => basculer(v.id)}
                        avancer={peutModifier && suivante ? () => deplacer([v.id], suivante) : undefined} />
                    ))}
                    {liste.length === 0 && <p className="px-1 py-6 text-center text-[12px] text-encre-3">Aucun véhicule</p>}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : visibles.length === 0 ? (
        <EtatVide
          titre={statut === "archives" ? "Aucun véhicule archivé" : statut === "a_verifier" ? "Tout concorde" : etapeActive === "toutes" ? "Aucun véhicule ne correspond" : `Aucun véhicule : ${defEtape(etapeActive).libelle.toLowerCase()}`}
          texte={q ? "Essayez une autre recherche." : statut === "a_verifier" ? "Chaque véhicule est cohérent avec son conteneur." : statut === "archives" ? "Un véhicule archivé quitte le parc sans rien perdre : il apparaît ici." : undefined} />
      ) : vueEffective === "liste" ? (
        <TableauVehicules vehicules={visibles} selection={selection} basculer={basculer} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
          {visibles.map((v, i) => (
            <CarteGalerie key={v.id} v={v} index={i} cochee={selection.has(v.id)} basculer={ordinateur && peutModifier ? () => basculer(v.id) : undefined} />
          ))}
        </div>
      )}

      {selection.size > 0 && peutModifier && (
        <div className="zone-sure-bas fixed inset-x-4 bottom-20 z-40 rounded-carte bg-heros px-4 py-3 text-sur-nuit shadow-flottante lg:bottom-6 lg:left-[calc(5rem+2rem)] rail:left-[calc(16rem+2rem)] lg:right-8">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-3">
            <span className="text-[14px] font-semibold">{selection.size} sélectionné{selection.size > 1 ? "s" : ""}</span>
            <label className="flex items-center gap-2 text-[14px]">
              <span className="text-sur-nuit-2">Passer à</span>
              <select defaultValue="" onChange={(e) => e.target.value && deplacer([...selection], e.target.value as Etape)}
                className="h-11 rounded-controle border border-white/15 bg-nuit-2 px-3 text-[14px] text-sur-nuit lg:h-10">
                <option value="" disabled>Choisir une étape</option>
                {ETAPES.map((e) => <option key={e.code} value={e.code}>{e.libelle}</option>)}
              </select>
            </label>
            <Bouton variante="sur-nuit" taille="sm" onClick={() => setSelection(new Set())}>Annuler</Bouton>
          </div>
        </div>
      )}
    </>
  );
}

function TableauVehicules({ vehicules, selection, basculer }: { vehicules: Vehicule[]; selection: Set<string>; basculer: (id: string) => void }) {
  const voitCouts = vehicules.some((v) => v.prix_revient_xof !== null);
  return (
    <div data-defilement="horizontal" className="carte apparition overflow-x-auto">
      <table className="w-full min-w-[960px] text-[14px]">
        <thead>
          <tr className="border-b border-trait bg-surface-2 text-left">
            <th className="w-12 px-1 py-3"><span className="sr-only">Sélection</span></th>
            {["Véhicule", "Étape", "Jours", ...(voitCouts ? ["Prix de revient", "Marge"] : []), "Prix affiché", "Client"].map((t, i) => (
              <th key={t} scope="col" className={cn("etiquette px-3 py-3 text-[12px] whitespace-nowrap text-encre-3", i >= 2 && "text-right", t === "Client" && "text-left", t === "Étape" && "min-w-40")}>{t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {vehicules.map((v) => (
            <tr key={v.id} className="border-b border-trait/70 transition-colors last:border-b-0 hover:bg-primaire-voile/40">
              <td className="px-1 py-2">
                <label className="grid size-10 cursor-pointer place-items-center">
                  <input type="checkbox" checked={selection.has(v.id)} onChange={() => basculer(v.id)} aria-label={`Sélectionner ${v.libelle}`} className="size-4 accent-[var(--primaire)]" />
                </label>
              </td>
              <td className="px-3 py-2">
                <Link href={`/parc/vehicule/?id=${v.id}`} className="flex items-center gap-3">
                  <PhotoVehicule path={v.photo_principale_path} alt="" className="h-11 w-16 shrink-0 rounded-lg" />
                  <span className="min-w-0">
                    <span className="block font-bold hover:text-primaire">{v.libelle}</span>
                    <span className="block font-mono text-[12px] whitespace-nowrap text-encre-3">{v.reference}{v.vin ? ` · ${v.vin}` : ""}</span>
                  </span>
                </Link>
              </td>
              <td className="px-3 py-2 text-right">
                <EtiquetteEtape etape={v.etape} compacte />
                <PastillesConteneur v={v} className="mt-1 justify-end" />
              </td>
              <td className={cn("chiffres px-3 py-2 text-right", v.jours_etape > 30 && "font-bold text-ocre-texte")}>{v.jours_etape}</td>
              {voitCouts && <td className="px-3 py-2 text-right"><Montant valeur={v.prix_revient_xof} devise={null} /></td>}
              {voitCouts && (
                <td className={cn("px-3 py-2 text-right", (v.marge_xof ?? 0) < 0 ? "text-perte-texte" : "text-gain-texte")}>
                  <Montant valeur={v.marge_xof} devise={null} className={v.marge_type === "previsionnelle" ? "font-medium" : undefined} />
                </td>
              )}
              <td className="px-3 py-2 text-right"><Montant valeur={v.prix_affiche_xof} devise={null} /></td>
              <td className="px-3 py-2 text-encre-2">{v.vente?.client_nom ?? v.reserve_client_nom ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PageParc() {
  return (
    <Suspense fallback={<SqueletteGalerie />}>
      <Parc />
    </Suspense>
  );
}
