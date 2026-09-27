"use client";

import { Plus, X } from "@phosphor-icons/react";
import { EnTeteSection } from "@/components/parametres/en-tete-section";
import { BarreEnregistrement, Groupe, useBrouillon } from "@/components/parametres/commun";
import { ChampImage } from "@/components/parametres/champs-image";
import { Bouton } from "@/components/ui/bouton";
import { Champ } from "@/components/ui/champ";
import { EtatErreur, SqueletteListe } from "@/components/ui/etats";

export default function PageEntreprise() {
  const { brouillon: p, maj, sale, enregistrement, enregistrer, annuler, erreur, recharger } = useBrouillon();
  if (erreur && !p) return <EtatErreur erreur={erreur} onReessayer={() => void recharger()} />;
  if (!p) return <SqueletteListe lignes={4} />;
  const texte = (cle: keyof typeof p) => ({
    value: (p[cle] as string | null) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => maj(cle, (e.target.value || null) as never),
  });

  return (
    <>
      <EnTeteSection cle="entreprise" titre="Entreprise" sousTitre="Ces informations figurent sur chaque facture, reçu et proforma." />
      <div className="flex flex-col gap-4 lg:gap-6">
        <Groupe titre="Identité" description="Le nom commercial s'affiche en grand ; la raison sociale apparaît dessous si elle diffère.">
          <Champ libelle="Nom commercial" value={p.nom_commercial} onChange={(e) => maj("nom_commercial", e.target.value)} erreur={!p.nom_commercial.trim() ? "Obligatoire." : null} />
          <Champ libelle="Raison sociale" facultatif placeholder="Sahel Auto Import SARL" {...texte("raison_sociale")} />
          <Champ libelle="Slogan" facultatif placeholder="Véhicules importés des États-Unis" {...texte("slogan")} />
        </Groupe>

        <Groupe titre="Mentions légales" description="Le NIF et le RCCM rendent la facture recevable par un client professionnel et par l'administration.">
          <div className="grid grid-cols-2 gap-3">
            <Champ libelle="NIF" mono placeholder="084123456K" {...texte("nif")} />
            <Champ libelle="RCCM" mono placeholder="MA.BKO.2021.B.4521" {...texte("rccm")} />
          </div>
          <Champ libelle="Compte bancaire" facultatif mono placeholder="BDM-SA · ML016 01201 …" aide="Imprimé en pied de facture pour les règlements par virement." {...texte("compte_bancaire")} />
        </Groupe>

        <Groupe titre="Coordonnées">
          <Champ libelle="Adresse" placeholder="Avenue de l'OUA, Faladié" {...texte("adresse")} />
          <div className="grid grid-cols-2 gap-3">
            <Champ libelle="Ville" {...texte("ville")} />
            <Champ libelle="Pays" value={p.pays} onChange={(e) => maj("pays", e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[14px] font-medium text-encre-2">Téléphones</p>
            {p.telephones.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <Champ aria-label={`Téléphone ${i + 1}`} type="tel" inputMode="tel" value={t} classeConteneur="flex-1"
                  onChange={(e) => maj("telephones", p.telephones.map((x, j) => (j === i ? e.target.value : x)))} />
                <button type="button" aria-label={`Retirer le téléphone ${i + 1}`} onClick={() => maj("telephones", p.telephones.filter((_, j) => j !== i))}
                  className="inline-flex size-11 items-center justify-center rounded-controle text-encre-3 hover:bg-surface-2 lg:size-10">
                  <X className="size-4" />
                </button>
              </div>
            ))}
            {p.telephones.length < 4 && (
              <Bouton variante="fantome" taille="sm" className="self-start" icone={<Plus className="size-4" />} onClick={() => maj("telephones", [...p.telephones, ""])}>
                Ajouter un numéro
              </Bouton>
            )}
          </div>
          <Champ libelle="WhatsApp" type="tel" inputMode="tel" facultatif placeholder="+223 70 12 34 56" {...texte("whatsapp")} />
          {/* Pleine largeur : une adresse e-mail complète ne tient pas dans une demi-colonne. */}
          <Champ libelle="E-mail" type="email" facultatif {...texte("email")} />
          <Champ libelle="Site web" facultatif placeholder="sahelauto.ml" {...texte("site_web")} />
        </Groupe>

        <Groupe titre="Logo, cachet et signature" description="Photographiez votre cachet sur une feuille blanche : le fond est retiré automatiquement.">
          <ChampImage libelle="Logo" path={p.logo_path} onChange={(v) => maj("logo_path", v)} aide="Carré de préférence, fond clair ou transparent." />
          <ChampImage libelle="Cachet" path={p.cachet_path} onChange={(v) => maj("cachet_path", v)} detourage />
          <ChampImage libelle="Signature" path={p.signature_path} onChange={(v) => maj("signature_path", v)} detourage signature />
        </Groupe>
      </div>
      <BarreEnregistrement sale={sale} enregistrement={enregistrement} onEnregistrer={enregistrer} onAnnuler={annuler} />
    </>
  );
}
