"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Columns3, List, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useEcriture, useLecture } from "@/lib/api/requetes";
import type { Vehicule } from "@/lib/api/types";
import { useOrg } from "@/lib/session";
import { useOrdinateur } from "@/lib/ecran";
import { cn } from "@/lib/cn";
import { ETAPES, etape as defEtape, etapeSuivante, peut, type Etape } from "@/lib/domaine";
import { aujourdhui, formatCourt } from "@/lib/format";
import { EnTetePage } from "@/components/coque/coque";
import { CarteKanban, LigneVehicule } from "@/components/metier/carte-vehicule";
import { Onglets } from "@/components/ui/onglets";
import { Bouton } from "@/components/ui/bouton";
import { EtatErreur, EtatVide, SqueletteListe } from "@/components/ui/etats";
import { EtiquetteEtape, Montant } from "@/components/ui/signature";

type FiltreStatut = "tous" | "disponible" | "reserve" | "vendu";
type Vue = "kanban" | "liste";

function Parc() {
  const org = useOrg();
  const params = useSearchParams();
  const router = useRouter();
  const chemin = usePathname();
  const ordinateur = useOrdinateur();

  const etapeParam = params.get("etape") as Etape | null;
  const [etapeActive, setEtapeActive] = useState<Etape | "toutes">(etapeParam && ETAPES.some((e) => e.code === etapeParam) ? etapeParam : "toutes");
  const [statut, setStatut] = useState<FiltreStatut>(params.get("vue") === "en_vente" ? "disponible" : "tous");
  const [vue, setVue] = useState<Vue>(() => (typeof window !== "undefined" && localStorage.getItem("parc-auto:vue-parc") === "liste" ? "liste" : "kanban"));
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

  const statuts: { valeur: FiltreStatut; libelle: string }[] = [
    { valeur: "tous", libelle: "Tous" },
    { valeur: "disponible", libelle: "Disponibles" },
    { valeur: "reserve", libelle: "Réservés" },
    { valeur: "vendu", libelle: "Vendus" },
  ];

  return (
    <>
      <EnTetePage
        titre="Parc"
        sousTitre={data ? `${filtres.length} véhicule${filtres.length > 1 ? "s" : ""}${statut !== "tous" ? ` · ${statuts.find((s) => s.valeur === statut)?.libelle.toLowerCase()}` : ""}` : undefined}
        actions={
          <>
            {ordinateur && (
              <div className="flex rounded-controle border border-trait-fort bg-surface p-0.5" role="group" aria-label="Affichage">
                {([["kanban", "Tableau", Columns3], ["liste", "Liste", List]] as const).map(([valeur, libelle, Icone]) => (
                  <button key={valeur} type="button" aria-pressed={vue === valeur}
                    onClick={() => { setVue(valeur); localStorage.setItem("parc-auto:vue-parc", valeur); }}
                    className={cn("inline-flex h-9 items-center gap-1.5 rounded-[5px] px-3 text-sm", vue === valeur ? "bg-surface-2 font-medium text-encre" : "text-encre-3 hover:text-encre")}>
                    <Icone className="size-4" aria-hidden /> {libelle}
                  </button>
                ))}
              </div>
            )}
            {peutModifier && (
              <Link href="/parc/nouveau/" className="inline-flex h-11 items-center gap-2 rounded-controle bg-laterite px-4 text-[15px] font-medium text-sur-laterite hover:bg-laterite-fonce lg:h-10 lg:text-sm">
                <Plus className="size-4" aria-hidden /> Ajouter un véhicule
              </Link>
            )}
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative flex-1 lg:max-w-sm">
          <span className="sr-only">Rechercher dans le parc</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-encre-3" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Modèle, VIN, lot, conteneur, client…"
            className="h-11 w-full rounded-controle border border-trait-fort bg-surface pr-9 pl-9 text-[15px] placeholder:text-encre-3 focus:border-laterite focus:outline-none lg:h-10 lg:text-sm" />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Effacer la recherche" className="absolute top-1/2 right-1 inline-flex size-9 -translate-y-1/2 items-center justify-center text-encre-3">
              <X className="size-4" />
            </button>
          )}
        </label>
        <div className="sans-barre -mx-4 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:px-0" role="group" aria-label="Statut commercial">
          {statuts.map((s) => (
            <button key={s.valeur} type="button" aria-pressed={statut === s.valeur} onClick={() => setStatut(s.valeur)}
              className={cn("h-9 shrink-0 rounded-controle border px-3 text-[14px]", statut === s.valeur ? "border-encre bg-encre text-surface" : "border-trait-fort bg-surface text-encre-2 hover:text-encre")}>
              {s.libelle}
            </button>
          ))}
        </div>
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
      ) : ordinateur && vue === "kanban" ? (
        <div className="-mx-8 overflow-x-auto px-8 pb-4">
          <div className="grid min-w-[1400px] grid-cols-8 gap-3">
            {ETAPES.map((e) => {
              const liste = parEtape.get(e.code) ?? [];
              const capital = liste.reduce((s, v) => s + (v.prix_revient_xof ?? 0), 0);
              const suivante = etapeSuivante(e.code);
              return (
                <section key={e.code} aria-label={`${e.libelle} : ${liste.length}`} className="flex min-h-[60vh] flex-col rounded-carte bg-surface-2/70 p-2">
                  <header className="mb-2 px-1 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="etiquette text-[13px]" style={{ color: e.couleur }}>{e.etiquette}</span>
                      <span className="chiffres text-[13px] font-semibold text-encre-2">{liste.length}</span>
                    </div>
                    <div className="mt-1 h-[3px] rounded-full" style={{ background: e.couleur }} />
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
      ) : ordinateur ? (
        <TableauVehicules vehicules={filtres} selection={selection} basculer={basculer} />
      ) : (
        <>
          <Onglets
            libelle="Étapes"
            valeur={etapeActive}
            onChange={choisirEtape}
            className="mb-3"
            onglets={[
              { valeur: "toutes" as const, libelle: "Tous", compteur: filtres.length },
              ...ETAPES.map((e) => ({ valeur: e.code, libelle: e.libelle, compteur: parEtape.get(e.code)?.length ?? 0, couleur: e.couleur })),
            ]}
          />
          {visibles.length === 0 ? (
            <EtatVide titre={etapeActive === "toutes" ? "Aucun véhicule ne correspond" : `Aucun véhicule ${defEtape(etapeActive).libelle.toLowerCase()}`} texte={q ? "Essayez une autre recherche." : undefined} />
          ) : (
            <div className="overflow-hidden rounded-carte border border-trait">
              {visibles.map((v) => (
                <LigneVehicule key={v.id} v={v} selection={peutModifier && selection.size > 0 ? { cochee: selection.has(v.id), basculer: () => basculer(v.id) } : undefined} />
              ))}
            </div>
          )}
        </>
      )}

      {selection.size > 0 && peutModifier && (
        <div className="zone-sure-bas fixed inset-x-0 bottom-16 z-40 border-t border-trait bg-nuit px-4 py-3 text-sur-nuit lg:bottom-0 lg:left-60">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-3">
            <span className="text-[14px] font-medium">{selection.size} sélectionné{selection.size > 1 ? "s" : ""}</span>
            <label className="flex items-center gap-2 text-[14px]">
              <span className="text-sur-nuit-2">Passer à</span>
              <select defaultValue="" onChange={(e) => e.target.value && deplacer([...selection], e.target.value as Etape)}
                className="h-9 rounded-controle border border-white/15 bg-nuit-2 px-2 text-[14px] text-sur-nuit">
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
    <div className="overflow-x-auto rounded-carte border border-trait bg-surface">
      <table className="w-full min-w-[960px] text-sm">
        <thead>
          <tr className="border-b border-trait bg-surface-2/60 text-left">
            <th className="w-10 px-3 py-2"><span className="sr-only">Sélection</span></th>
            {["Véhicule", "Étape", "Jours", ...(voitCouts ? ["Prix de revient", "Marge"] : []), "Prix affiché", "Client"].map((t, i) => (
              <th key={t} scope="col" className={cn("etiquette px-3 py-2 text-[12px] font-semibold text-encre-3", i >= 2 && "text-right", t === "Client" && "text-left")}>{t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {vehicules.map((v) => (
            <tr key={v.id} className="border-b border-trait last:border-b-0 hover:bg-surface-2/50">
              <td className="px-3 py-2"><input type="checkbox" checked={selection.has(v.id)} onChange={() => basculer(v.id)} aria-label={`Sélectionner ${v.libelle}`} className="size-4 accent-[var(--laterite)]" /></td>
              <td className="px-3 py-2">
                <Link href={`/parc/vehicule/?id=${v.id}`} className="font-semibold hover:underline">{v.libelle}</Link>
                <p className="font-mono text-[12px] text-encre-3">{v.reference}{v.vin ? ` · ${v.vin}` : ""}</p>
              </td>
              <td className="px-3 py-2 text-right"><EtiquetteEtape etape={v.etape} compacte /></td>
              <td className={cn("chiffres px-3 py-2 text-right", v.jours_etape > 30 && "font-medium text-ocre")}>{v.jours_etape}</td>
              {voitCouts && <td className="px-3 py-2 text-right"><Montant valeur={v.prix_revient_xof} devise={null} /></td>}
              {voitCouts && (
                <td className={cn("px-3 py-2 text-right", (v.marge_xof ?? 0) < 0 && "text-perte")}>
                  <Montant valeur={v.marge_xof} devise={null} className={v.marge_type === "previsionnelle" ? "font-normal text-encre-2" : undefined} />
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
    <Suspense fallback={<SqueletteListe />}>
      <Parc />
    </Suspense>
  );
}
