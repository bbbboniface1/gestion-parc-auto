"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle, CircleNotch, Scan, Warning } from "@phosphor-icons/react";
import { nouvelId, useEcriture } from "@/lib/api/requetes";
import { tauxPour, useParametres } from "@/lib/api/parametres";
import type { Vehicule } from "@/lib/api/types";
import { useOrg } from "@/lib/session";
import { CARBURANTS, ETAPES, SOURCES, TITRES, TRANSMISSIONS, type Etape } from "@/lib/domaine";
import { aujourdhui, formatFCFA, formatNombre, type Devise } from "@/lib/format";
import { lireMontant } from "@/lib/montant";
import { decoderVin, normaliserVin, verifierVin } from "@/lib/vin";
import { cn } from "@/lib/cn";
import { Bouton } from "@/components/ui/bouton";
import { Champ, Selection, ZoneTexte } from "@/components/ui/champ";
import { ChampMontant } from "@/components/ui/champ-montant";
import { Choix } from "@/components/ui/choix";
import { celebrer } from "@/lib/celebration";

type Brouillon = {
  vin: string; marque: string; modele: string; finition: string; annee: string; couleur: string;
  carburant: string | null; transmission: string | null; kilometrage: string; moteur: string;
  source: string | null; lot_numero: string; date_achat: string; lieu_achat: string; titre: string | null;
  dommage_principal: string; cles: "oui" | "non" | null; demarre: "oui" | "non" | null;
  prix_achat: number | null; devise_achat: Devise; taux_achat: number | null;
  prix_affiche_xof: number | null; prix_plancher_xof: number | null;
  immatriculation: string; carte_grise: string; notes: string; etape: Etape;
};

function depuisVehicule(v?: Vehicule): Brouillon {
  return {
    vin: v?.vin ?? "", marque: v?.marque ?? "", modele: v?.modele ?? "", finition: v?.finition ?? "",
    annee: v?.annee ? String(v.annee) : "", couleur: v?.couleur ?? "", carburant: v?.carburant ?? null,
    transmission: v?.transmission ?? null, kilometrage: v?.kilometrage_km ? String(v.kilometrage_km) : "", moteur: v?.moteur ?? "",
    source: v?.source ?? "copart", lot_numero: v?.lot_numero ?? "", date_achat: v?.date_achat ?? aujourdhui(), lieu_achat: v?.lieu_achat ?? "",
    titre: v?.titre ?? null, dommage_principal: v?.dommage_principal ?? "",
    cles: v?.cles === undefined || v?.cles === null ? null : v.cles ? "oui" : "non",
    demarre: v?.demarre === undefined || v?.demarre === null ? null : v.demarre ? "oui" : "non",
    prix_achat: v?.prix_achat ?? null, devise_achat: (v?.devise_achat as Devise) ?? "USD", taux_achat: v?.taux_achat ?? null,
    prix_affiche_xof: v?.prix_affiche_xof ?? null, prix_plancher_xof: v?.prix_plancher_xof ?? null,
    immatriculation: v?.immatriculation ?? "", carte_grise: v?.carte_grise ?? "a_faire", notes: v?.notes ?? "", etape: v?.etape ?? "achete",
  };
}

function Section({ titre, description, children }: { titre: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="carte p-4 lg:grid lg:grid-cols-[220px_1fr] lg:gap-8 lg:p-6">
      <div className="mb-4 lg:mb-0">
        <h2 className="text-[17px] font-semibold tracking-tight">{titre}</h2>
        {description && <p className="mt-1 text-[13px] text-encre-3">{description}</p>}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

/**
 * Fiche de saisie d'un véhicule. Le VIN d'abord : s'il est valide, marque, modèle, année,
 * moteur et carburant sont proposés automatiquement (base publique NHTSA).
 */
export function FormulaireVehicule({ vehicule }: { vehicule?: Vehicule }) {
  const org = useOrg();
  const router = useRouter();
  const { data: reglages } = useParametres();
  const p = reglages?.parametres;
  const [b, setB] = useState<Brouillon>(() => depuisVehicule(vehicule));
  const [id] = useState(() => vehicule?.id ?? nouvelId());
  const [unite, setUnite] = useState<"km" | "mi">("km");
  const [decodage, setDecodage] = useState<"inactif" | "en_cours" | "trouve" | "introuvable">("inactif");
  const dernierDecode = useRef<string>(vehicule?.vin ?? "");
  // Les champs obligatoires ne se plaignent qu'après avoir été quittés, ou après une tentative d'envoi.
  const [tentative, setTentative] = useState(false);
  const [vus, setVus] = useState<ReadonlySet<string>>(new Set());
  const vu = (k: string) => () => setVus((x) => (x.has(k) ? x : new Set(x).add(k)));
  const maj = <K extends keyof Brouillon>(k: K, v: Brouillon[K]) => setB((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    if (p?.unite_compteur) setUnite(p.unite_compteur);
  }, [p?.unite_compteur]);
  useEffect(() => {
    if (b.taux_achat === null && p) setB((x) => ({ ...x, taux_achat: tauxPour(x.devise_achat, p) }));
  }, [p, b.taux_achat]);

  const verif = verifierVin(b.vin);
  const vin = normaliserVin(b.vin);

  // Décodage automatique dès qu'un VIN complet et valide est saisi (une fois par VIN).
  useEffect(() => {
    if (verif.etat !== "valide" && verif.etat !== "cle_incorrecte") return;
    if (dernierDecode.current === vin) return;
    dernierDecode.current = vin;
    const controle = new AbortController();
    setDecodage("en_cours");
    decoderVin(vin, controle.signal)
      .then((d) => {
        if (!d) { setDecodage("introuvable"); return; }
        setDecodage("trouve");
        setB((x) => ({
          ...x,
          marque: x.marque || d.marque || "",
          modele: x.modele || d.modele || "",
          finition: x.finition || d.finition || "",
          annee: x.annee || (d.annee ? String(d.annee) : ""),
          carburant: x.carburant ?? d.carburant,
          transmission: x.transmission ?? d.transmission,
          moteur: x.moteur || d.moteur || "",
        }));
      })
      .catch(() => { if (!controle.signal.aborted) setDecodage("introuvable"); });
    return () => controle.abort();
  }, [vin, verif.etat]);

  const enregistrer = useEcriture<{ id: string }>("vehicule_enregistrer", {
    onSuccess: (r) => {
      if (vehicule) toast.success("Modifications enregistrées");
      else celebrer({ type: "vehicule", titre: "Véhicule ajouté au parc", detail: [b.marque, b.modele, b.annee].filter(Boolean).join(" ") });
      router.push(`/parc/vehicule/?id=${r?.id ?? id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const annee = Number(b.annee);
  const kilometrageSaisi = lireMontant(b.kilometrage);
  const erreurs = {
    marque: !b.marque.trim() ? "Indiquez la marque." : null,
    modele: !b.modele.trim() ? "Indiquez le modèle." : null,
    annee: b.annee && (!Number.isInteger(annee) || annee < 1980 || annee > new Date().getFullYear() + 1) ? "Année invalide." : null,
    vin: verif.etat === "invalide" ? verif.message : null,
    plancher: b.prix_plancher_xof && b.prix_affiche_xof && b.prix_plancher_xof > b.prix_affiche_xof ? "Le plancher dépasse le prix affiché." : null,
  };
  const valide = !Object.values(erreurs).some(Boolean);
  const affichee = (k: "marque" | "modele") => (tentative || vus.has(k) ? erreurs[k] : null);

  function envoyer() {
    if (!valide) { setTentative(true); toast.error("Vérifiez les champs signalés."); return; }
    const km = kilometrageSaisi === null ? null : Math.round(unite === "mi" ? kilometrageSaisi * 1.609344 : kilometrageSaisi);
    enregistrer.executer({
      p_org: org.id,
      p_data: {
        id,
        vin: vin || null,
        marque: b.marque.trim(), modele: b.modele.trim(), finition: b.finition.trim() || null,
        annee: b.annee ? annee : null, couleur: b.couleur.trim() || null,
        carburant: b.carburant, transmission: b.transmission, kilometrage_km: km, moteur: b.moteur.trim() || null,
        source: b.source, lot_numero: b.lot_numero.trim() || null, date_achat: b.date_achat || null, lieu_achat: b.lieu_achat.trim() || null,
        titre: b.titre, dommage_principal: b.dommage_principal.trim() || null,
        cles: b.cles === null ? null : b.cles === "oui", demarre: b.demarre === null ? null : b.demarre === "oui",
        prix_achat: b.prix_achat, devise_achat: b.prix_achat ? b.devise_achat : null,
        taux_achat: b.prix_achat ? (b.devise_achat === "XOF" ? 1 : b.taux_achat) : null,
        prix_affiche_xof: b.prix_affiche_xof, prix_plancher_xof: b.prix_plancher_xof,
        immatriculation: b.immatriculation.trim() || null, carte_grise: b.carte_grise || null, notes: b.notes.trim() || null,
        ...(vehicule ? {} : { etape: b.etape }),
      },
    });
  }

  const encheres = b.source === "copart" || b.source === "iaai" || b.source === "manheim";

  return (
    <form onSubmit={(e) => { e.preventDefault(); envoyer(); }} className="flex flex-col gap-4 pb-28 lg:gap-5 lg:pb-8" noValidate>
      <Section titre="Identification" description="Saisissez le VIN : la marque, le modèle et l'année se remplissent seuls.">
        <div>
          <Champ
            libelle="VIN (numéro de châssis)"
            mono
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={24}
            placeholder="2T3RFREV0JW812345"
            value={b.vin}
            onChange={(e) => maj("vin", e.target.value.toUpperCase())}
            erreur={erreurs.vin}
            className="text-[16px] tracking-[0.12em] uppercase"
            suffixe={<span className={cn("chiffres pr-2 font-mono text-[12px]", vin.length === 17 ? "text-encre-2" : "text-encre-3")}>{vin.length}/17</span>}
          />
          <div className="mt-1.5 min-h-5 text-[13px]" aria-live="polite">
            {verif.etat === "cle_incorrecte" && (
              <p className="flex items-center gap-1.5 text-ocre-texte"><Warning className="size-4" aria-hidden /> Clé de contrôle incorrecte (attendu « {verif.attendue} » en 9e position) : vérifiez la saisie. Les VIN hors Amérique du Nord peuvent ne pas en avoir.</p>
            )}
            {verif.etat === "valide" && decodage === "en_cours" && <p className="flex items-center gap-1.5 text-encre-3"><CircleNotch className="size-4 animate-spin" aria-hidden /> Recherche du véhicule…</p>}
            {verif.etat === "valide" && decodage === "trouve" && <p className="flex items-center gap-1.5 text-gain-texte"><CheckCircle className="size-4" aria-hidden /> VIN valide · informations remplies depuis la base NHTSA, vérifiez-les.</p>}
            {verif.etat === "valide" && decodage === "introuvable" && <p className="flex items-center gap-1.5 text-encre-3"><Scan className="size-4" aria-hidden /> VIN valide, mais inconnu de la base américaine : complétez à la main.</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Champ libelle="Marque" value={b.marque} onChange={(e) => maj("marque", e.target.value)} onBlur={vu("marque")} erreur={affichee("marque")} placeholder="Toyota" />
          <Champ libelle="Modèle" value={b.modele} onChange={(e) => maj("modele", e.target.value)} onBlur={vu("modele")} erreur={affichee("modele")} placeholder="RAV4" />
          <Champ libelle="Finition" facultatif value={b.finition} onChange={(e) => maj("finition", e.target.value)} placeholder="XLE" />
          <Champ libelle="Année" inputMode="numeric" maxLength={4} value={b.annee} onChange={(e) => maj("annee", e.target.value.replace(/\D/g, ""))} erreur={erreurs.annee} placeholder="2018" />
          <Champ libelle="Couleur" facultatif value={b.couleur} onChange={(e) => maj("couleur", e.target.value)} placeholder="Gris magnétique" />
          <Champ libelle="Moteur" facultatif value={b.moteur} onChange={(e) => maj("moteur", e.target.value)} placeholder="2.5 L 4 cyl." />
        </div>
        <Choix libelle="Carburant" facultatif valeur={b.carburant} onChange={(v) => maj("carburant", v)}
          options={["essence", "diesel", "hybride", "electrique"].map((c) => ({ valeur: c, libelle: CARBURANTS[c] }))} />
        <Choix libelle="Boîte" facultatif colonnes={2} valeur={b.transmission} onChange={(v) => maj("transmission", v)}
          options={Object.entries(TRANSMISSIONS).map(([valeur, libelle]) => ({ valeur, libelle }))} />
        <Champ
          libelle="Compteur"
          facultatif
          inputMode="numeric"
          value={b.kilometrage}
          onChange={(e) => maj("kilometrage", e.target.value.replace(/[^\d\s]/g, ""))}
          aide={unite === "mi" && kilometrageSaisi ? `Soit ${formatNombre(Math.round(kilometrageSaisi * 1.609344))} km.` : "Les compteurs américains sont en miles : choisissez l'unité lue sur le tableau de bord."}
          suffixe={
            <div className="flex rounded-[4px] border border-trait p-0.5" role="group" aria-label="Unité du compteur">
              {(["km", "mi"] as const).map((u) => (
                <button key={u} type="button" aria-pressed={unite === u} onClick={() => setUnite(u)}
                  className={cn("h-8 rounded-[3px] px-2 font-mono text-[12px]", unite === u ? "bg-encre text-surface" : "text-encre-3")}>{u}</button>
              ))}
            </div>
          }
        />
      </Section>

      <Section titre="Achat" description="Où et comment le véhicule a été acheté.">
        <Choix libelle="Provenance" valeur={b.source} onChange={(v) => maj("source", v)} colonnes={3}
          options={Object.entries(SOURCES).map(([valeur, libelle]) => ({ valeur, libelle }))} />
        <div className="grid grid-cols-2 gap-3">
          {encheres && <Champ libelle="N° de lot" mono inputMode="numeric" value={b.lot_numero} onChange={(e) => maj("lot_numero", e.target.value)} placeholder="48213377" />}
          <Champ libelle="Date d'achat" type="date" value={b.date_achat} onChange={(e) => maj("date_achat", e.target.value)} />
          <Champ libelle={encheres ? "Parc d'enchères" : "Lieu"} facultatif value={b.lieu_achat} onChange={(e) => maj("lieu_achat", e.target.value)} placeholder="Houston TX" classeConteneur={encheres ? "col-span-2" : undefined} />
        </div>
        <ChampMontant
          libelle="Prix d'achat"
          valeur={b.prix_achat}
          onChange={(v) => maj("prix_achat", v)}
          devise={b.devise_achat}
          devises={["USD", "EUR", "XOF"]}
          onDevise={(d) => setB((x) => ({ ...x, devise_achat: d, taux_achat: tauxPour(d, p) }))}
          taux={b.devise_achat === "XOF" ? null : b.taux_achat}
          aide={encheres ? "L'enchère gagnée, sans les frais (saisis à part comme « Frais d'enchère »)." : undefined}
        />
        {b.devise_achat !== "XOF" && b.prix_achat ? (
          <ChampMontant libelle={`Taux du jour de l'achat (FCFA pour 1 ${b.devise_achat === "USD" ? "$" : "€"})`} valeur={b.taux_achat} onChange={(v) => maj("taux_achat", v)} />
        ) : null}
        {encheres && (
          <>
            <Choix libelle="Titre" facultatif valeur={b.titre} onChange={(v) => maj("titre", v)} colonnes={3}
              options={["clean", "salvage", "rebuilt"].map((t) => ({ valeur: t, libelle: TITRES[t]!.libelle }))} />
            <Champ libelle="Dommage principal" facultatif value={b.dommage_principal} onChange={(e) => maj("dommage_principal", e.target.value)} placeholder="Avant, carrosserie" />
            <div className="grid grid-cols-2 gap-3">
              <Choix libelle="Clés" facultatif colonnes={2} valeur={b.cles} onChange={(v) => maj("cles", v)} options={[{ valeur: "oui", libelle: "Oui" }, { valeur: "non", libelle: "Non" }]} />
              <Choix libelle="Démarre" facultatif colonnes={2} valeur={b.demarre} onChange={(v) => maj("demarre", v)} options={[{ valeur: "oui", libelle: "Oui" }, { valeur: "non", libelle: "Non" }]} />
            </div>
          </>
        )}
      </Section>

      <Section titre="Prix de vente" description="Le plancher reste invisible pour les vendeurs, sauf réglage contraire.">
        <div className="grid gap-3 sm:grid-cols-2">
          <ChampMontant libelle="Prix affiché" facultatif valeur={b.prix_affiche_xof} onChange={(v) => maj("prix_affiche_xof", v)} />
          <ChampMontant libelle="Prix plancher" facultatif valeur={b.prix_plancher_xof} onChange={(v) => maj("prix_plancher_xof", v)} erreur={erreurs.plancher} />
        </div>
        {b.prix_achat && b.prix_affiche_xof && b.taux_achat ? (
          <p className="text-[13px] text-encre-3">
            Achat seul : {formatFCFA(b.prix_achat * (b.devise_achat === "XOF" ? 1 : b.taux_achat))}. Le coût de revient complet se calcule avec les frais, sur la fiche.
          </p>
        ) : null}
      </Section>

      {!vehicule && (
        <Section titre="Où est-il aujourd'hui ?" description="Un véhicule acheté sur place peut aller directement « Au parc ».">
          <Selection libelle="Étape actuelle" value={b.etape} onChange={(e) => maj("etape", e.target.value as Etape)}
            options={ETAPES.map((e) => ({ valeur: e.code, libelle: e.libelle }))} />
        </Section>
      )}

      <Section titre="Administratif">
        <div className="grid grid-cols-2 gap-3">
          <Champ libelle="Immatriculation" facultatif mono value={b.immatriculation} onChange={(e) => maj("immatriculation", e.target.value.toUpperCase())} placeholder="AB-1234-MD" />
          <Selection libelle="Carte grise" value={b.carte_grise} onChange={(e) => maj("carte_grise", e.target.value)}
            options={[{ valeur: "a_faire", libelle: "À faire" }, { valeur: "en_cours", libelle: "En cours" }, { valeur: "obtenue", libelle: "Obtenue" }]} />
        </div>
        <ZoneTexte libelle="Notes" facultatif value={b.notes} onChange={(e) => maj("notes", e.target.value)} placeholder="Pare-brise à changer, deuxième clé chez le transitaire…" />
      </Section>

      <div className="zone-sure-bas fixed inset-x-0 bottom-16 z-30 flex gap-2 border-t border-trait bg-surface/95 px-4 py-3 backdrop-blur lg:static lg:justify-end lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <Bouton variante="secondaire" className="flex-1 lg:flex-none" onClick={() => router.back()}>Annuler</Bouton>
        <Bouton type="submit" variante="primaire" className="flex-[2] lg:flex-none" chargement={enregistrer.isPending}>
          {vehicule ? "Enregistrer" : "Ajouter au parc"}
        </Bouton>
      </div>
    </form>
  );
}
