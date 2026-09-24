"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatNombre, joursDepuis } from "@/lib/format";
import { EnTetePage } from "@/components/coque/coque";
import { BarreEnregistrement, Groupe, useBrouillon } from "@/components/parametres/commun";
import { Bouton } from "@/components/ui/bouton";
import { ChampNombre } from "@/components/ui/champ";
import { EtatErreur, SqueletteListe } from "@/components/ui/etats";

/** Taux du marché (service gratuit, sans clé). Le taux enregistré reste celui que l'utilisateur valide. */
async function tauxDuMarche(): Promise<{ usd: number; date: string }> {
  const r = await fetch("https://open.er-api.com/v6/latest/USD");
  if (!r.ok) throw new Error("Service indisponible");
  const d = (await r.json()) as { result: string; rates: Record<string, number>; time_last_update_utc: string };
  if (d.result !== "success" || !d.rates.XOF) throw new Error("Taux indisponible");
  return { usd: Math.round(d.rates.XOF * 100) / 100, date: d.time_last_update_utc };
}

export default function PageDevises() {
  const { brouillon: p, donnees, maj, sale, enregistrement, enregistrer, annuler, erreur, recharger } = useBrouillon();
  const [marche, setMarche] = useState<{ usd: number; date: string } | null>(null);
  const [chargement, setChargement] = useState(false);
  if (erreur && !p) return <EtatErreur erreur={erreur} onReessayer={() => void recharger()} />;
  if (!p) return <SqueletteListe lignes={3} />;
  const age = joursDepuis(donnees?.parametres.taux_maj_le);

  return (
    <>
      <EnTetePage titre="Devises et taux" sousTitre="Chaque achat et chaque frais garde le taux du jour où il a été saisi." />
      <div className="rounded-carte border border-trait bg-surface px-4 py-6 lg:px-8">
        <Groupe titre="Dollar américain" description="Proposé par défaut pour les enchères, le remorquage et le fret. Modifier ce taux ne change pas les frais déjà saisis.">
          <ChampNombre libelle="1 $ US =" valeur={Number(p.taux_usd)} onChange={(v) => maj("taux_usd", v ?? 0)} min={1} max={10000} decimales={2} unite="FCFA"
            aide={age !== null ? `Mis à jour le ${formatDate(donnees?.parametres.taux_maj_le)}${age > 30 ? " — il y a plus d'un mois" : ""}.` : undefined} />
          <div className="flex flex-wrap items-center gap-3">
            <Bouton taille="sm" icone={<RefreshCw className="size-4" />} chargement={chargement} onClick={async () => {
              setChargement(true);
              try { setMarche(await tauxDuMarche()); } catch { toast.error("Impossible de joindre le service de taux. Réessayez plus tard."); } finally { setChargement(false); }
            }}>Consulter le taux du marché</Bouton>
            {marche && (
              <p className="text-[14px] text-encre-2">
                Marché : <strong className="chiffres text-encre">{formatNombre(marche.usd, 2)}</strong> FCFA
                <Bouton variante="fantome" taille="sm" className="ml-1" onClick={() => maj("taux_usd", marche.usd)}>Utiliser</Bouton>
              </p>
            )}
          </div>
          {marche && <p className="text-[12px] text-encre-3">Taux de référence du {new Date(marche.date).toLocaleDateString("fr-FR")}, fournis par ExchangeRate-API. Le taux réel de votre banque ou de votre changeur peut différer.</p>}
        </Groupe>
        <Groupe titre="Euro" description="Le franc CFA est arrimé à l'euro par une parité fixe : ce taux ne varie pas.">
          <ChampNombre libelle="1 € =" valeur={Number(p.taux_eur)} onChange={(v) => maj("taux_eur", v ?? 655.957)} decimales={3} unite="FCFA"
            aide={Number(p.taux_eur) !== 655.957 ? "Attention : la parité officielle est 655,957." : "Parité officielle."} />
        </Groupe>
      </div>
      <BarreEnregistrement sale={sale} enregistrement={enregistrement} onEnregistrer={enregistrer} onAnnuler={annuler} />
    </>
  );
}
