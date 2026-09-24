"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useEcriture, useLecture } from "@/lib/api/requetes";
import type { Vehicule } from "@/lib/api/types";
import { useOrg } from "@/lib/session";
import { useOrdinateur } from "@/lib/ecran";
import { cn } from "@/lib/cn";
import { ETAPES, etape as defEtape, etapeSuivante, peut, type Etape } from "@/lib/domaine";
import { aujourdhui, formatCourt } from "@/lib/format";
import { finDeVin } from "@/lib/vin";
import { EnTetePage } from "@/components/coque/coque";
import { CarteColonne, LigneVehicule, StatutCommercial } from "@/components/metier/carte-vehicule";
import { FiltreRoute } from "@/components/metier/filtre-route";
import { PhotoVehicule } from "@/components/metier/photo-vehicule";
import { Bouton } from "@/components/ui/bouton";
import { ChampRecherche, FiltresTexte } from "@/components/ui/recherche";
import { EtatErreur, EtatVide, SqueletteListe } from "@/components/ui/etats";
import { Montant, Piste } from "@/components/ui/signature";

type FiltreStatut = "tous" | "disponible" | "reserve" | "vendu";
type Vue = "tableau" | "colonnes";

const STATUTS: { valeur: FiltreStatut; libelle: string }[] = [
  { valeur: "tous", libelle: "Tous" },
  { valeur: "disponible", libelle: "Disponibles" },
  { valeur: "reserve", libelle: "Réservés" },
  { valeur: "vendu", libelle: "Vendus" },
];

function Parc() {
  const org = useOrg();
  const params = useSearchParams();
  const router = useRouter();
  const chemin = usePathname();
  const ordinateur = useOrdinateur();

  const etapeParam = params.get("etape") as Etape | null;
  const [etapeActive, setEtapeActive] = useState<Etape | "toutes">(etapeParam && ETAPES.some((e) => e.code === etapeParam) ? etapeParam : "toutes");
  const [statut, setStatut] = useState<FiltreStatut>(params.get("vue") === "en_vente" ? "disponible" : "tous");
  const [vue, setVue] = useState<Vue>(() => (typeof window !== "undefined" && localStorage.getItem("parc-auto:vue-parc") === "colonnes" ? "colonnes" : "tableau"));
  const [q, setQ] = useState("");
  const [selection, setSelection] = useState<Set<string>>(new Set());

  const { data, error, isPending, refetch } = useLecture<Vehicule[]>("vehicules_lister", { p_org: org.id, p_filtres: {} });
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
    return (data ?? []).filter((v) => {
      if (statut !== "tous" && v.statut_commercial !== statut) return false;
      if (!motif) return true;
      return [v.libelle, v.reference, v.vin, v.lot_numero, v.immatriculation, v.reserve_client_nom, v.vente?.client_nom, v.expedition?.numero_conteneur]
        .some((x) => x?.toLowerCase().includes(motif));
    });
  }, [data, statut, q]);

  const parEtape = useMemo(() => {
    const m = new Map<Etape, Vehicule[]>(ETAPES.map((e) => [e.code, []]));
    for (const v of filtres) m.get(v.etape)?.push(v);
    return m;
  }, [filtres]);

  const visibles = etapeActive === "toutes" ? filtres : parEtape.get(etapeActive) ?? [];

  function choisirEtape(e: Etape | "toutes") {
    setEtapeActive(e);
    const p = new URLSearchParams(params);
    if (e === "toutes") p.delete("etape");
    else p.set("etape", e);
    router.replace(`${chemin}${p.size ? `?${p}` : ""}`, { scroll: false });
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

  const nbDisponibles = (data ?? []).filter((v) => v.statut_commercial === "disponible").length;

  return (
    <>
      <EnTetePage
        titre="Parc"
        sousTitre={data ? `${data.length} véhicule${data.length > 1 ? "s" : ""} · ${nbDisponibles} à vendre` : undefined}
        actions={
          <>
            {ordinateur && data && data.length > 0 && (
              <div className="flex items-center gap-4 pr-2" role="group" aria-label="Affichage">
                {([["tableau", "Tableau"], ["colonnes", "Colonnes"]] as const).map(([valeur, libelle]) => (
                  <button key={valeur} type="button" aria-pressed={vue === valeur}
                    onClick={() => { setVue(valeur); localStorage.setItem("parc-auto:vue-parc", valeur); }}
                    className={cn("h-10 border-b-2 text-corps", vue === valeur ? "border-encre font-semibold text-encre" : "border-transparent text-encre-3 hover:text-encre")}>
                    {libelle}
                  </button>
                ))}
              </div>
            )}
            {peutModifier && ordinateur && (
              <Link href="/parc/nouveau/" className="inline-flex h-10 items-center gap-2 rounded-controle bg-signal px-4 text-corps font-semibold text-sur-signal hover:bg-signal-fonce">
                <Plus className="size-4" aria-hidden /> Ajouter un véhicule
              </Link>
            )}
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-8">
        <ChampRecherche valeur={q} onChange={setQ} libelle="Rechercher dans le parc" placeholder="Modèle, VIN, lot, conteneur, client" />
        <FiltresTexte valeur={statut} onChange={setStatut} libelle="Statut commercial" options={STATUTS.map((x) => [x.valeur, x.libelle] as const)} />
      </div>

      {error && !data ? (
        <EtatErreur erreur={error} onReessayer={() => void refetch()} />
      ) : isPending || !data ? (
        <SqueletteListe lignes={6} />
      ) : data.length === 0 ? (
        <EtatVide
          titre="Aucun véhicule pour l'instant"
          texte="Ajoutez votre premier véhicule : saisissez son VIN, la marque, le modèle et l'année se remplissent seuls."
          action={peutModifier ? <Link href="/parc/nouveau/"><Bouton variante="primaire" icone={<Plus className="size-4" />}>Ajouter un véhicule</Bouton></Link> : undefined}
        />
      ) : (
        <>
          <FiltreRoute valeur={etapeActive} onChange={choisirEtape} compte={(e) => parEtape.get(e)?.length ?? 0} total={filtres.length} />

          {visibles.length === 0 ? (
            <EtatVide titre={etapeActive === "toutes" ? "Aucun véhicule ne correspond" : `Aucun véhicule : ${defEtape(etapeActive).libelle.toLowerCase()}`} texte={q ? "Essayez une autre recherche." : undefined} />
          ) : ordinateur && vue === "colonnes" ? (
            <div className="-mx-8 overflow-x-auto px-8 pt-4 pb-4">
              <div className="grid min-w-[1400px] grid-cols-8 gap-x-5">
                {ETAPES.filter((e) => etapeActive === "toutes" || e.code === etapeActive).map((e) => {
                  const liste = parEtape.get(e.code) ?? [];
                  const capital = liste.reduce((s, v) => s + (v.prix_revient_xof ?? 0), 0);
                  const suivante = etapeSuivante(e.code);
                  return (
                    <section key={e.code} aria-label={`${e.libelle} : ${liste.length}`} className="min-h-[50vh]">
                      <header className="mb-3 border-b-[3px] pb-2" style={{ borderColor: e.couleur }}>
                        <div className="flex items-baseline justify-between">
                          <span className="etiquette text-petit text-encre">{e.etiquette}</span>
                          <span className="figure text-titre">{liste.length}</span>
                        </div>
                        {liste.some((v) => v.prix_revient_xof !== null) && <p className="chiffres text-petit text-encre-3">{formatCourt(capital)} FCFA</p>}
                      </header>
                      <div className="flex flex-col">
                        {liste.map((v) => (
                          <CarteColonne key={v.id} v={v} cochee={selection.has(v.id)} basculer={() => basculer(v.id)}
                            avancer={peutModifier && suivante ? () => deplacer([v.id], suivante) : undefined} />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          ) : ordinateur ? (
            <TableauVehicules vehicules={visibles} selection={selection} basculer={basculer} />
          ) : (
            <ul>
              {visibles.map((v) => (
                <LigneVehicule key={v.id} v={v} selection={peutModifier && selection.size > 0 ? { cochee: selection.has(v.id), basculer: () => basculer(v.id) } : undefined} />
              ))}
            </ul>
          )}
        </>
      )}

      {selection.size > 0 && peutModifier && (
        <div className="zone-sure-bas fixed inset-x-0 bottom-16 z-40 bg-nuit px-4 py-3 text-sur-nuit lg:bottom-0 lg:left-60">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-3">
            <span className="font-semibold">{selection.size} sélectionné{selection.size > 1 ? "s" : ""}</span>
            <label className="flex items-center gap-2">
              <span className="text-sur-nuit-2">Passer à</span>
              <select defaultValue="" onChange={(e) => e.target.value && deplacer([...selection], e.target.value as Etape)}
                className="h-9 rounded-controle bg-nuit-2 px-2 text-sur-nuit">
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

/** Tableau dense (ordinateur) : la photo ouvre chaque ligne, la piste dit où en est le véhicule. */
function TableauVehicules({ vehicules, selection, basculer }: { vehicules: Vehicule[]; selection: Set<string>; basculer: (id: string) => void }) {
  const voitCouts = vehicules.some((v) => v.prix_revient_xof !== null);
  const colonnes = ["Véhicule", "Où il en est", "Jours", ...(voitCouts ? ["Prix de revient", "Marge"] : []), "Prix affiché", "Client"];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px]">
        <thead>
          <tr className="border-b border-trait-fort text-left">
            <th className="w-8 py-2"><span className="sr-only">Sélection</span></th>
            {colonnes.map((t, i) => (
              <th key={t} scope="col" className={cn("etiquette py-2 pr-4 text-petit font-semibold text-encre-3", i >= 2 && i < colonnes.length - 1 && "text-right", t === "Client" && "hidden xl:table-cell")}>{t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {vehicules.map((v) => (
            <tr key={v.id} className="border-b border-trait hover:bg-surface-2">
              <td className="py-2 pr-2"><input type="checkbox" checked={selection.has(v.id)} onChange={() => basculer(v.id)} aria-label={`Sélectionner ${v.libelle}`} className="size-4 accent-[var(--encre)]" /></td>
              <td className="py-2 pr-4">
                <Link href={`/parc/vehicule/?id=${v.id}`} className="flex items-center gap-3">
                  <PhotoVehicule path={v.photo_principale_path} alt="" className="aspect-[4/3] w-[72px] shrink-0" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold hover:underline">{v.libelle}</span>
                    <span className="block truncate font-mono text-petit text-encre-3">{v.reference}{v.vin ? ` · ${finDeVin(v.vin)}` : ""}</span>
                  </span>
                </Link>
              </td>
              <td className="w-56 py-2 pr-4">
                <Piste etape={v.etape} />
                <span className="etiquette mt-1 flex items-baseline gap-2 text-petit text-encre-2">
                  {defEtape(v.etape).libelle}
                  <StatutCommercial v={v} />
                </span>
              </td>
              <td className={cn("chiffres py-2 pr-4 text-right", v.jours_etape > 30 && "font-semibold text-ocre")}>{v.jours_etape}</td>
              {voitCouts && <td className="py-2 pr-4 text-right"><Montant valeur={v.prix_revient_xof} devise={null} /></td>}
              {voitCouts && (
                <td className={cn("py-2 pr-4 text-right", (v.marge_xof ?? 0) < 0 && "text-perte")}>
                  <Montant valeur={v.marge_xof} devise={null} className={v.marge_type === "previsionnelle" ? "font-normal text-encre-2" : undefined} />
                </td>
              )}
              <td className="py-2 pr-4 text-right"><Montant valeur={v.prix_affiche_xof} devise={null} /></td>
              <td className="hidden py-2 text-encre-2 xl:table-cell">{v.vente?.client_nom ?? v.reserve_client_nom ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PageParc() {
  return (
    <Suspense fallback={<SqueletteListe />}>
      <Parc />
    </Suspense>
  );
}
