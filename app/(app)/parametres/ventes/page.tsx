"use client";

import { MODES_PAIEMENT, type ModePaiement } from "@/lib/domaine";
import { EnTetePage } from "@/components/coque/coque";
import { BarreEnregistrement, Groupe, useBrouillon } from "@/components/parametres/commun";
import { ChampNombre, Interrupteur } from "@/components/ui/champ";
import { Choix } from "@/components/ui/choix";
import { EtatErreur, SqueletteListe } from "@/components/ui/etats";

export default function PageVentesAlertes() {
  const { brouillon: p, maj, sale, enregistrement, enregistrer, annuler, erreur, recharger } = useBrouillon();
  if (erreur && !p) return <EtatErreur erreur={erreur} onReessayer={() => void recharger()} />;
  if (!p) return <SqueletteListe lignes={4} />;
  const modes = Object.keys(MODES_PAIEMENT) as ModePaiement[];

  return (
    <>
      <EnTetePage titre="Ventes et alertes" />
      <div className="carte px-4 py-6 lg:px-8">
        <Groupe titre="Modes de paiement" description="Seuls les modes cochés sont proposés à l'encaissement.">
          {modes.map((m) => (
            <Interrupteur key={m} libelle={MODES_PAIEMENT[m].libelle}
              description={MODES_PAIEMENT[m].avecReference ? "La référence de transaction est demandée." : undefined}
              actif={p.modes_paiement.includes(m)}
              onChange={(v) => maj("modes_paiement", v ? [...p.modes_paiement, m] : p.modes_paiement.filter((x) => x !== m))} />
          ))}
        </Groupe>

        <Groupe titre="Confidentialité des coûts" description="Comme chez les éditeurs européens de logiciels pour négociants : le vendeur négocie sans connaître votre marge.">
          <Interrupteur libelle="Masquer les coûts aux vendeurs" description="Prix d'achat, frais, prix de revient et marges invisibles pour le rôle Vendeur."
            actif={p.masquer_couts_vendeurs} onChange={(v) => maj("masquer_couts_vendeurs", v)} />
          <Interrupteur libelle="Le vendeur voit le prix plancher" description="Utile si vos vendeurs négocient seuls."
            actif={p.vendeur_voit_plancher} onChange={(v) => maj("vendeur_voit_plancher", v)} />
          <ChampNombre libelle="Commission des vendeurs" valeur={Number(p.commission_vendeur_pct)} onChange={(v) => maj("commission_vendeur_pct", v ?? 0)} min={0} max={100} decimales={2} unite="%"
            aide="Taux de référence interne : les commissions ne sont pas encore calculées automatiquement." />
        </Groupe>

        <Groupe titre="Alertes" description="Elles apparaissent dans « À faire » sur l'écran Aujourd'hui.">
          <ChampNombre libelle="Magasinage : alerter après" valeur={p.alerte_port_jours} onChange={(v) => maj("alerte_port_jours", v ?? 10)} min={1} max={365} unite="jours au port"
            aide="Au-delà de la franchise, le port facture chaque jour de stockage." />
          <ChampNombre libelle="Stock dormant : alerter après" valeur={p.alerte_stock_jours} onChange={(v) => maj("alerte_stock_jours", v ?? 60)} min={1} max={3650} unite="jours au parc" />
        </Groupe>

        <Groupe titre="Compteurs" description="Unité d'affichage des kilométrages pour toute l'entreprise. Les compteurs américains sont en miles.">
          <Choix libelle="Unité" colonnes={2} valeur={p.unite_compteur} onChange={(v) => v && maj("unite_compteur", v)}
            options={[{ valeur: "km", libelle: "Kilomètres" }, { valeur: "mi", libelle: "Miles" }]} />
        </Groupe>
      </div>
      <BarreEnregistrement sale={sale} enregistrement={enregistrement} onEnregistrer={enregistrer} onAnnuler={annuler} />
    </>
  );
}
