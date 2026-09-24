"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeftRight, Download, MessageCircle, Plus, Trash2 } from "lucide-react";
import { useEcriture, useLecture } from "@/lib/api/requetes";
import { useOrg } from "@/lib/session";
import type { Compte, LigneMarge, RapportMarges, Tresorerie } from "@/lib/api/types-metier";
import type { Frais } from "@/lib/api/types";
import { libelleCategorie, peut } from "@/lib/domaine";
import { formatCourt, formatDate, formatPourcent, pluriel } from "@/lib/format";
import { lienWhatsApp } from "@/lib/whatsapp";
import { genererCSV, telechargerCSV } from "@/lib/csv";
import { cn } from "@/lib/cn";
import { EnTetePage } from "@/components/coque/coque";
import { Onglets } from "@/components/ui/onglets";
import { Montant } from "@/components/ui/signature";
import { Section } from "@/components/ui/section";
import { Bouton, BoutonIcone } from "@/components/ui/bouton";
import { EtatErreur, EtatVide, SqueletteListe } from "@/components/ui/etats";
import { FeuilleFrais } from "@/components/metier/feuille-frais";
import { FeuilleTransfert } from "@/components/finances/feuille-transfert";
import { periodePour, SelecteurPeriode, type CodePeriode } from "@/components/finances/periode";

type Onglet = "tresorerie" | "depenses" | "creances" | "rentabilite";

function Finances() {
  const org = useOrg();
  const router = useRouter();
  const params = useSearchParams();
  const peutVoir = peut(org.role, "voirTresorerie");
  const peutModifier = peut(org.role, "saisirFrais");

  const [onglet, setOnglet] = useState<Onglet>((params.get("onglet") as Onglet) ?? "tresorerie");
  const [periode, setPeriode] = useState<CodePeriode>("mois");
  const [nouvelleDepense, setNouvelleDepense] = useState(params.get("depense") === "1");
  const [transfert, setTransfert] = useState(false);
  const p = periodePour(periode);

  const tresorerie = useLecture<Tresorerie>("tresorerie", { p_org: org.id, p_du: p.du, p_au: p.au }, { enabled: peutVoir && (onglet === "tresorerie" || onglet === "creances") });
  const depenses = useLecture<Frais[]>("frais_lister", { p_org: org.id, p_filtres: { du: p.du, au: p.au } }, { enabled: peutVoir && onglet === "depenses" });
  const marges = useLecture<RapportMarges>("rapport_marges", { p_org: org.id, p_du: p.du, p_au: p.au }, { enabled: peutVoir && onglet === "rentabilite" });
  const comptes = useLecture<Compte[]>("comptes_lister", { p_org: org.id }, { enabled: peutVoir && transfert });

  if (!peutVoir) return <EtatVide titre="Accès réservé" texte="Seuls le propriétaire, le gérant et le comptable consultent les finances." />;

  return (
    <>
      <EnTetePage titre="Finances"
        actions={
          <>
            {onglet === "tresorerie" && <Bouton icone={<ArrowLeftRight className="size-4" />} onClick={() => setTransfert(true)}>Transfert</Bouton>}
            {onglet === "depenses" && peutModifier && <Bouton variante="primaire" icone={<Plus className="size-4" />} onClick={() => setNouvelleDepense(true)}>Ajouter une dépense</Bouton>}
          </>
        } />

      <Onglets libelle="Section" className="mb-4" valeur={onglet} onChange={(v) => { setOnglet(v); router.replace(`/finances/?onglet=${v}`, { scroll: false }); }}
        onglets={[{ valeur: "tresorerie", libelle: "Trésorerie" }, { valeur: "depenses", libelle: "Dépenses" }, { valeur: "creances", libelle: "Créances" }, { valeur: "rentabilite", libelle: "Rentabilité" }]} />

      {onglet !== "creances" && <div className="mb-4"><SelecteurPeriode valeur={periode} onChange={setPeriode} /></div>}

      {onglet === "tresorerie" && (
        tresorerie.error && !tresorerie.data ? <EtatErreur erreur={tresorerie.error} onReessayer={() => void tresorerie.refetch()} /> : tresorerie.isPending || !tresorerie.data ? <SqueletteListe /> : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {tresorerie.data.comptes.map((c) => (
                <div key={c.id} className="border-t-2 border-encre pt-3">
                  <p className="etiquette text-petit text-encre-3">{c.nom}</p>
                  <Montant valeur={c.solde_xof} taille="lg" className="mt-1 block" />
                  <p className="mt-1 text-petit text-encre-3">+{formatCourt(c.entrees_periode)} · −{formatCourt(c.sorties_periode)}</p>
                </div>
              ))}
            </div>
            <Section titre="Mouvements">
              {tresorerie.data.mouvements.length === 0 ? <p className="py-4 text-encre-3">Aucun mouvement sur cette période.</p> : (
                <ul>
                  {tresorerie.data.mouvements.slice(0, 50).map((m, i) => (
                    <li key={i} className="flex items-center gap-3 border-b border-trait py-2.5 last:border-b-0">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-corps">{m.libelle}</p>
                        <p className="text-petit text-encre-3">{formatDate(m.date)}{m.compte_nom ? ` · ${m.compte_nom}` : ""}</p>
                      </div>
                      <Montant valeur={m.montant_xof} devise={null} className={m.montant_xof < 0 ? "text-perte" : "text-gain"} />
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        )
      )}

      {onglet === "depenses" && (
        depenses.error && !depenses.data ? <EtatErreur erreur={depenses.error} onReessayer={() => void depenses.refetch()} /> : depenses.isPending ? <SqueletteListe /> : !depenses.data?.length ? (
          <EtatVide titre="Aucune dépense sur cette période" />
        ) : (
          <>
            <p className="mb-3 text-corps text-encre-2">Total : <Montant valeur={depenses.data.reduce((s, f) => s + f.montant_xof, 0)} devise={null} /></p>
            <ul className="border-t-2 border-encre">
              {depenses.data.map((f) => <LigneDepense key={f.id} f={f} enEvidence={f.id === params.get("frais")} peutModifier={peutModifier} />)}
            </ul>
          </>
        )
      )}

      {onglet === "creances" && (
        tresorerie.error && !tresorerie.data ? <EtatErreur erreur={tresorerie.error} onReessayer={() => void tresorerie.refetch()} /> : tresorerie.isPending || !tresorerie.data ? <SqueletteListe /> : !tresorerie.data.creances.length ? (
          <EtatVide titre="Aucune créance" texte="Tous les clients sont à jour." />
        ) : (
          <>
            <p className="mb-3 text-corps text-encre-2">Total dû : <Montant valeur={tresorerie.data.creances.reduce((s, c) => s + c.reste_xof, 0)} devise={null} className="text-ocre" /></p>
            <ul className="border-t-2 border-encre">
              {tresorerie.data.creances.map((c) => (
                <li key={c.vente_id} className="border-b border-trait py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/ventes/fiche/?id=${c.vente_id}`} className="font-semibold hover:underline">{c.client_nom}</Link>
                      <p className="truncate text-petit text-encre-3">{c.numero} · {c.vehicule_libelle}</p>
                      {c.jours_retard !== null && <p className="mt-0.5 text-petit font-medium text-perte">{pluriel(c.jours_retard, "jour")} de retard</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <Montant valeur={c.reste_xof} devise={null} className="text-ocre" />
                      {c.client_telephone && (
                        <a href={lienWhatsApp(c.client_telephone, `Bonjour ${c.client_nom}, un rappel amical concernant votre facture ${c.numero} : il reste ${c.reste_xof.toLocaleString("fr-FR")} FCFA à régler. Merci.`)}
                          target="_blank" rel="noopener" className="inline-flex h-11 items-center gap-1.5 rounded-controle bg-surface-2 px-3 hover:bg-trait lg:h-9">
                          <MessageCircle className="size-3.5" aria-hidden /> Relancer
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )
      )}

      {onglet === "rentabilite" && (
        marges.error && !marges.data ? <EtatErreur erreur={marges.error} onReessayer={() => void marges.refetch()} /> : marges.isPending || !marges.data ? <SqueletteListe /> : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                ["Ventes", pluriel(marges.data.totaux.nb, "vente")],
                ["Chiffre d'affaires", formatCourt(marges.data.totaux.ca)],
                ["Marge", formatCourt(marges.data.totaux.marge)],
                ["Taux de marge", marges.data.totaux.marge_pct !== null ? formatPourcent(marges.data.totaux.marge_pct, 1) : "—"],
              ].map(([l, v]) => (
                <div key={l} className="border-t-2 border-encre pt-3"><p className="etiquette text-petit text-encre-3">{l}</p><p className="chiffres mt-1 text-titre font-semibold">{v}</p></div>
              ))}
            </div>
            <div className="flex justify-end">
              <Bouton variante="secondaire" icone={<Download className="size-4" />} onClick={() => {
                const csv = genererCSV(
                  [
                    { titre: "Facture", valeur: (l: LigneMarge) => l.numero },
                    { titre: "Date", valeur: (l) => new Date(l.date_vente) },
                    { titre: "Véhicule", valeur: (l) => l.vehicule_libelle },
                    { titre: "Client", valeur: (l) => l.client_nom },
                    { titre: "Prix HT", valeur: (l) => l.montant_ht, decimales: 0 },
                    { titre: "Coût de revient", valeur: (l) => l.prix_revient_xof, decimales: 0 },
                    { titre: "Marge", valeur: (l) => l.marge_xof, decimales: 0 },
                    { titre: "Marge %", valeur: (l) => l.marge_pct, decimales: 1 },
                    { titre: "Jours en stock", valeur: (l) => l.jours_stock },
                  ],
                  marges.data!.ventes,
                );
                telechargerCSV(`rentabilite-${p.du}-${p.au}`, csv);
              }}>Exporter en CSV</Bouton>
            </div>
            <section className="overflow-x-auto border-t-2 border-encre">
              <table className="w-full min-w-[720px] text-corps">
                <thead><tr className="etiquette border-b border-trait-fort text-left text-petit text-encre-3"><th className="py-2 pr-3">Véhicule</th><th className="px-3 py-2">Client</th><th className="px-3 py-2 text-right">Prix HT</th><th className="px-3 py-2 text-right">Revient</th><th className="px-3 py-2 text-right">Marge</th><th className="py-2 pl-3 text-right">Jours</th></tr></thead>
                <tbody>
                  {marges.data.ventes.map((l) => (
                    <tr key={l.vente_id} className="border-b border-trait last:border-b-0">
                      <td className="py-2 pr-3"><Link href={`/ventes/fiche/?id=${l.vente_id}`} className="hover:underline">{l.vehicule_libelle}</Link></td>
                      <td className="px-3 py-2 text-encre-2">{l.client_nom}</td>
                      <td className="chiffres px-3 py-2 text-right">{l.montant_ht.toLocaleString("fr-FR")}</td>
                      <td className="chiffres px-3 py-2 text-right">{l.prix_revient_xof.toLocaleString("fr-FR")}</td>
                      <td className={cn("chiffres px-3 py-2 text-right font-medium", l.marge_xof < 0 && "text-perte")}>{l.marge_xof.toLocaleString("fr-FR")}</td>
                      <td className="chiffres py-2 pl-3 text-right text-encre-3">{l.jours_stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {marges.data.ventes.length === 0 && <p className="py-6 text-center text-encre-3">Aucune vente sur cette période.</p>}
            </section>
          </div>
        )
      )}

      <FeuilleFrais ouverte={nouvelleDepense} onFermer={() => setNouvelleDepense(false)} portee="generale" titre="Ajouter une dépense" />
      <FeuilleTransfert ouverte={transfert} onFermer={() => setTransfert(false)} comptes={comptes.data ?? []} />
    </>
  );
}

function LigneDepense({ f, enEvidence, peutModifier }: { f: Frais; enEvidence: boolean; peutModifier: boolean }) {
  const org = useOrg();
  const marquerPaye = useEcriture("frais_enregistrer", { onSuccess: () => toast.success("Marqué payé"), onError: (e) => toast.error(e.message) });
  const supprimer = useEcriture("frais_supprimer", { onSuccess: () => toast.success("Dépense supprimée"), onError: (e) => toast.error(e.message) });
  return (
    <li className={cn("flex items-center gap-3 border-b border-trait py-3 last:border-b-0", enEvidence && "bg-signal-voile")}>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{libelleCategorie(f.categorie)}{f.statut === "a_payer" && <span className="etiquette ml-2 text-petit text-ocre">à payer</span>}</p>
        <p className="truncate text-petit text-encre-3">{formatDate(f.date)}{f.libelle ? ` · ${f.libelle}` : ""}{f.fournisseur ? ` · ${f.fournisseur}` : ""}{f.vehicule_libelle ? ` · ${f.vehicule_libelle}` : ""}{f.expedition_reference ? ` · ${f.expedition_reference}` : ""}</p>
      </div>
      <Montant valeur={f.montant_xof} devise={null} />
      {peutModifier && (
        <>
          {f.statut === "a_payer" && <Bouton taille="sm" onClick={() => marquerPaye.executer({ p_org: org.id, p_data: { id: f.id, statut: "paye" } })}>Marquer payé</Bouton>}
          <BoutonIcone libelle="Supprimer" onClick={() => { if (window.confirm("Supprimer cette dépense ?")) supprimer.executer({ p_org: org.id, p_id: f.id }); }}><Trash2 className="size-4" /></BoutonIcone>
        </>
      )}
    </li>
  );
}

export default function PageFinances() {
  return (
    <Suspense>
      <Finances />
    </Suspense>
  );
}
